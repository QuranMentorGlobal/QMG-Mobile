// lib/earningsActions.ts
// Rich teacher earnings — mirrors the web earnings page. Source of truth is the
// teacher_earnings ledger (lifecycle: pending → available → payout_pending →
// paid → refunded), plus teacher_payouts, teacher_adjustments and booking_refunds.
// Computes the same summary + last-6-month chart arrays the web page shows.
// All reads go straight through Supabase (RLS-scoped) — fully mobile-capable.

import { supabase } from '@/lib/supabase';

export type DateOpt = 'month' | 'last_month' | '3months' | 'year' | 'all';
export const DATE_OPTS: { key: DateOpt; label: string }[] = [
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: '3months', label: '3 Months' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

export interface EarningRow {
  id: string; gross: number; commission: number; net: number; status: string;
  created_at: string; payment_type: string; student_name?: string;
}
export interface PayoutRow {
  id: string; amount_usd: number; status: string; payout_method: string | null;
  initiated_at: string | null; completed_at: string | null; created_at: string;
}
export interface AdjustmentRow {
  id: string; amount_usd: number; reason: string | null; description: string | null;
  payout_id: string | null; created_at: string;
}
export interface RefundRow {
  id: string; amount_usd: number; created_at: string; student_name: string; course_title: string;
}
export interface EarningsSummary {
  totalEarned: number; pendingAmount: number; availableAmount: number; paidAmount: number;
  commissionPaid: number; thisMonth: number; lastMonth: number; pendingWithdrawals: number; grossLifetime: number;
}
export interface EarningsData {
  earnings: EarningRow[]; payouts: PayoutRow[]; adjustments: AdjustmentRow[]; refunds: RefundRow[];
  totalReversed: number; summary: EarningsSummary; commissionPct: number; hasPayoutSettings: boolean;
  months: string[]; monthlyNet: number[]; monthlyGross: number[]; lessonCount: number[];
}

const OPEN_PAYOUT = ['requested', 'pending', 'under_review', 'approved', 'processing'];

async function commissionPct(sb: any): Promise<number> {
  try {
    const { data } = await sb.from('platform_settings').select('commission_rate').single();
    const raw = Number(data?.commission_rate);
    if (Number.isFinite(raw) && raw >= 0 && raw <= 100) return raw;
  } catch {}
  return 20;
}

export async function fetchEarnings(uid: string, dateFilter: DateOpt): Promise<EarningsData> {
  const sb = supabase as any;
  const now = new Date();
  const empty: EarningsData = {
    earnings: [], payouts: [], adjustments: [], refunds: [], totalReversed: 0,
    summary: { totalEarned: 0, pendingAmount: 0, availableAmount: 0, paidAmount: 0, commissionPaid: 0, thisMonth: 0, lastMonth: 0, pendingWithdrawals: 0, grossLifetime: 0 },
    commissionPct: 20, hasPayoutSettings: false,
    months: lastSixMonthLabels(), monthlyNet: Array(6).fill(0), monthlyGross: Array(6).fill(0), lessonCount: Array(6).fill(0),
  };
  try {
    const pct = await commissionPct(sb);

    let fromDate: string | null = null;
    if (dateFilter === 'month') fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    else if (dateFilter === 'last_month') fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    else if (dateFilter === '3months') fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
    else if (dateFilter === 'year') fromDate = new Date(now.getFullYear(), 0, 1).toISOString();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sixMoAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    let q = sb.from('teacher_earnings').select('*').eq('teacher_id', uid).order('created_at', { ascending: false });
    if (fromDate) q = q.gte('created_at', fromDate);
    const { data: ledgerRaw } = await q.limit(100000);
    const ledger: any[] = ledgerRaw ?? [];

    // Resolve student names + trial flag via linked bookings.
    const bIds = Array.from(new Set(ledger.map((e) => e.booking_id).filter(Boolean)));
    const bookMap: Record<string, { student_id?: string; is_trial?: boolean }> = {};
    const nameById: Record<string, string> = {};
    if (bIds.length) {
      try {
        const { data: bk } = await sb.from('bookings').select('id, student_id, is_trial').in('id', bIds);
        (bk ?? []).forEach((b: any) => { bookMap[b.id] = { student_id: b.student_id, is_trial: b.is_trial }; });
        const sIds = Array.from(new Set((bk ?? []).map((b: any) => b.student_id).filter(Boolean)));
        if (sIds.length) {
          const { data: pr } = await sb.from('profiles').select('id, first_name, last_name').in('id', sIds);
          (pr ?? []).forEach((x: any) => { nameById[x.id] = `${x.first_name || ''} ${x.last_name || ''}`.trim(); });
        }
      } catch {}
    }

    const earnings: EarningRow[] = ledger.map((e) => {
      const net = Number(e.net_amount_usd) || 0;
      const commission = Number(e.commission_usd) || 0;
      const gross = Number(e.gross_amount_usd) || +(net + commission).toFixed(2);
      const bk = e.booking_id ? bookMap[e.booking_id] : undefined;
      return {
        id: e.id, gross, commission, net, status: e.status || 'pending', created_at: e.created_at,
        payment_type: bk?.is_trial ? 'trial' : 'single_lesson',
        student_name: bk?.student_id ? (nameById[bk.student_id] || 'Student') : undefined,
      };
    });

    // Payouts
    const { data: payoutsRaw } = await sb.from('teacher_payouts').select('*').eq('teacher_id', uid).order('created_at', { ascending: false }).limit(100000);
    const payouts: PayoutRow[] = payoutsRaw ?? [];
    const pendingWithdrawals = payouts.filter((p) => OPEN_PAYOUT.includes(String(p.status))).reduce((s, p) => s + (Number(p.amount_usd) || 0), 0);

    // Adjustments (table)
    let adjustments: AdjustmentRow[] = [];
    try {
      const { data } = await sb.from('teacher_adjustments').select('id, amount_usd, reason, description, payout_id, created_at').eq('teacher_id', uid).order('created_at', { ascending: false }).limit(200);
      adjustments = data ?? [];
    } catch {}

    // Refunds (booking_refunds) with student + course name
    let refunds: RefundRow[] = []; let totalReversed = 0;
    try {
      const { data: refRaw } = await sb.from('booking_refunds').select('id, amount_usd, created_at, student_id, booking_id').eq('teacher_id', uid).order('created_at', { ascending: false }).limit(50);
      const raw: any[] = refRaw ?? [];
      const sIds = Array.from(new Set(raw.map((r) => r.student_id).filter(Boolean)));
      const rbIds = Array.from(new Set(raw.map((r) => r.booking_id).filter(Boolean)));
      const nameMap: Record<string, string> = {}; const titleMap: Record<string, string> = {};
      if (sIds.length) { try { const { data: pr } = await sb.from('profiles').select('id, first_name, last_name').in('id', sIds); (pr ?? []).forEach((x: any) => { nameMap[x.id] = `${x.first_name || ''} ${x.last_name || ''}`.trim(); }); } catch {} }
      if (rbIds.length) { try { const { data: bk } = await sb.from('bookings').select('id, courses(title)').in('id', rbIds); (bk ?? []).forEach((b: any) => { if (b?.courses?.title) titleMap[b.id] = b.courses.title; }); } catch {} }
      refunds = raw.map((r) => ({
        id: r.id, amount_usd: Number(r.amount_usd) || 0, created_at: r.created_at,
        student_name: r.student_id ? (nameMap[r.student_id] || 'Student') : 'Student',
        course_title: r.booking_id ? (titleMap[r.booking_id] || 'Lesson') : 'Lesson',
      }));
      totalReversed = refunds.reduce((s, r) => s + (r.amount_usd || 0), 0);
    } catch {}

    // Payout settings present?
    let hasPayoutSettings = false;
    try { const { data: ps } = await sb.from('teacher_payout_settings').select('id').eq('teacher_id', uid).single(); hasPayoutSettings = !!ps; } catch {}

    // Summary (ledger lifecycle)
    const sumNet = (st: string[]) => earnings.filter((e) => st.includes(e.status)).reduce((s, e) => s + e.net, 0);
    const pendingAmount = sumNet(['pending']);
    const availableLedger = sumNet(['available']);
    const paidAmount = sumNet(['paid']);
    let netAdjustments = 0;
    try {
      const { data } = await sb.from('teacher_adjustments').select('amount_usd').eq('teacher_id', uid).is('payout_id', null);
      netAdjustments = (data ?? []).reduce((s: number, a: any) => s + (Number(a.amount_usd) || 0), 0);
    } catch {}
    const availableAmount = Math.max(0, +(availableLedger + netAdjustments).toFixed(2));
    const totalEarned = +sumNet(['pending', 'available', 'payout_pending', 'paid']).toFixed(2);
    const commissionPaid = earnings.filter((e) => e.status !== 'refunded').reduce((s, e) => s + e.commission, 0);
    const grossLifetime = earnings.filter((e) => e.status !== 'refunded').reduce((s, e) => s + e.gross, 0);
    const matured = (e: EarningRow) => ['available', 'payout_pending', 'paid'].includes(e.status);
    const thisMonth = earnings.filter((e) => matured(e) && new Date(e.created_at) >= monthStart).reduce((s, e) => s + e.net, 0);
    const lastMonth = earnings.filter((e) => { const d = new Date(e.created_at); return matured(e) && d >= prevMonthStart && d <= prevMonthEnd; }).reduce((s, e) => s + e.net, 0);

    const summary: EarningsSummary = { totalEarned, pendingAmount, availableAmount, paidAmount, commissionPaid, thisMonth, lastMonth, pendingWithdrawals, grossLifetime };

    // Charts — always last 6 months, excluding refunded.
    const { data: chartRaw } = await sb.from('teacher_earnings')
      .select('created_at, gross_amount_usd, net_amount_usd, status')
      .eq('teacher_id', uid).neq('status', 'refunded').gte('created_at', sixMoAgo).order('created_at', { ascending: true });
    const monthlyNet = Array(6).fill(0); const monthlyGross = Array(6).fill(0); const lessonCount = Array(6).fill(0);
    (chartRaw ?? []).forEach((p: any) => {
      const d = new Date(p.created_at); const n2 = new Date();
      const idx = 5 - (n2.getFullYear() * 12 + n2.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
      if (idx >= 0 && idx <= 5) {
        monthlyNet[idx] += Number(p.net_amount_usd) || 0;
        monthlyGross[idx] += Number(p.gross_amount_usd) || 0;
        lessonCount[idx] += 1;
      }
    });

    return {
      earnings, payouts, adjustments, refunds, totalReversed, summary, commissionPct: pct, hasPayoutSettings,
      months: lastSixMonthLabels(), monthlyNet: monthlyNet.map((v) => Math.round(v)), monthlyGross: monthlyGross.map((v) => Math.round(v)), lessonCount,
    };
  } catch {
    return empty;
  }
}

function lastSixMonthLabels(): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString('en-GB', { month: 'short' });
  });
}

export const EARN_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: 'rgba(201,162,39,0.12)', fg: '#8A6A16', label: 'Pending' },
  available: { bg: 'rgba(22,163,74,0.10)', fg: '#16A34A', label: 'Available' },
  payout_pending: { bg: 'rgba(79,70,229,0.10)', fg: '#4F46E5', label: 'Payout pending' },
  paid: { bg: 'rgba(79,70,229,0.10)', fg: '#4F46E5', label: 'Paid' },
  refunded: { bg: 'rgba(220,38,38,0.10)', fg: '#DC2626', label: 'Refunded' },
  held: { bg: 'rgba(234,88,12,0.10)', fg: '#C2410C', label: 'Held' },
};
export const PAYOUT_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  requested: { bg: 'rgba(201,162,39,0.12)', fg: '#8A6A16', label: 'Requested' },
  pending: { bg: 'rgba(201,162,39,0.12)', fg: '#8A6A16', label: 'Requested' },
  under_review: { bg: 'rgba(245,158,11,0.12)', fg: '#B45309', label: 'Under review' },
  approved: { bg: 'rgba(79,70,229,0.10)', fg: '#4F46E5', label: 'Approved' },
  processing: { bg: 'rgba(14,165,233,0.10)', fg: '#0284C7', label: 'Processing' },
  completed: { bg: 'rgba(22,163,74,0.10)', fg: '#16A34A', label: 'Completed' },
  failed: { bg: 'rgba(220,38,38,0.10)', fg: '#DC2626', label: 'Failed' },
  rejected: { bg: 'rgba(220,38,38,0.10)', fg: '#DC2626', label: 'Rejected' },
};
