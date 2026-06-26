// lib/billingActions.ts — student Billing (mirrors web): subscriptions, course
// access, invoices, payment history, refunds, and the derived KPIs + monthly spend.
import { supabase } from '@/lib/supabase';

export interface Sub { id: string; course_title?: string; status: string; teacher_name?: string; created_at: string; monthly_amount_usd?: number; }
export interface CourseAccess { id: string; course_title: string; teacher_name?: string; access_type?: string; expires_at?: string | null; created_at: string; }
export interface Invoice { id: string; invoice_number: string; status: string; total_usd: number; description?: string; course_title?: string; paid_at?: string | null; created_at: string; }
export interface Payment { id: string; gross_amount_usd: number; status: string; provider: string; payment_type: string; description?: string; created_at: string; teacher_name?: string; }
export interface Refund { id: string; amount_usd: number; reason?: string; created_at: string; }
export interface BillingData {
  totalSpent: number; thisMonth: number; activeSubCount: number; coursesOwned: number; totalRefunded: number;
  monthly: { label: string; value: number }[];
  subs: Sub[]; courseAccess: CourseAccess[]; invoices: Invoice[]; payments: Payment[]; refunds: Refund[];
}

const safe = async (p: Promise<any>) => { try { return await p; } catch { return { data: null }; } };
const nameOf = (pr: any) => (pr ? `${pr.first_name || ''} ${pr.last_name || ''}`.trim() : undefined);

export async function fetchStudentBilling(uid: string): Promise<BillingData> {
  const sb = supabase as any;
  const empty: BillingData = { totalSpent: 0, thisMonth: 0, activeSubCount: 0, coursesOwned: 0, totalRefunded: 0, monthly: [], subs: [], courseAccess: [], invoices: [], payments: [], refunds: [] };
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMoAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [subsRes, accessRes, invRes, payRes, refRes] = await Promise.all([
      safe(sb.from('subscriptions').select('*, courses(title), profiles!subscriptions_teacher_id_fkey(first_name, last_name)').eq('student_id', uid).order('created_at', { ascending: false })),
      safe(sb.from('course_access').select('*, courses(title, teacher_id, profiles!courses_teacher_id_fkey(first_name, last_name))').eq('student_id', uid).eq('is_active', true).order('created_at', { ascending: false })),
      safe(sb.from('invoices').select('*, courses(title), profiles!invoices_teacher_id_fkey(first_name, last_name)').or(`student_id.eq.${uid},payer_id.eq.${uid}`).order('created_at', { ascending: false }).limit(30)),
      safe(sb.from('payments').select('*, profiles!payments_teacher_id_fkey(first_name, last_name)').or(`student_id.eq.${uid},payer_id.eq.${uid}`).eq('status', 'succeeded').order('created_at', { ascending: false }).limit(100000)),
      safe(sb.from('booking_refunds').select('id, amount_usd, reason, created_at, booking_id').eq('student_id', uid).order('created_at', { ascending: false }).limit(50)),
    ]);

    const subs: Sub[] = (subsRes.data ?? []).map((s: any) => ({ id: s.id, status: s.status, created_at: s.created_at, monthly_amount_usd: Number(s.monthly_amount_usd) || 0, teacher_name: nameOf(s.profiles), course_title: s.courses?.title }));
    const courseAccess: CourseAccess[] = (accessRes.data ?? []).map((a: any) => ({ id: a.id, course_title: a.courses?.title ?? 'Course', access_type: a.access_type, expires_at: a.expires_at, created_at: a.created_at, teacher_name: nameOf(a.courses?.profiles) }));
    const invoices: Invoice[] = (invRes.data ?? []).map((inv: any) => ({ id: inv.id, invoice_number: inv.invoice_number, status: inv.status, total_usd: Number(inv.total_usd) || 0, description: inv.description, course_title: inv.courses?.title, paid_at: inv.paid_at, created_at: inv.created_at }));
    const payments: Payment[] = (payRes.data ?? []).map((p: any) => ({ id: p.id, gross_amount_usd: Number(p.gross_amount_usd) || 0, status: p.status, provider: p.provider ?? 'mock', payment_type: p.payment_type ?? 'one_time', description: p.description, created_at: p.created_at, teacher_name: nameOf(p.profiles) }));
    const refunds: Refund[] = (refRes.data ?? []).map((r: any) => ({ id: r.id, amount_usd: Number(r.amount_usd) || 0, reason: r.reason, created_at: r.created_at }));

    const totalSpent = payments.reduce((s, p) => s + p.gross_amount_usd, 0);
    const thisMonth = payments.filter((p) => new Date(p.created_at) >= monthStart).reduce((s, p) => s + p.gross_amount_usd, 0);
    const totalRefunded = refunds.reduce((s, r) => s + r.amount_usd, 0);
    const activeSubCount = subs.filter((s) => s.status === 'active' || s.status === 'trial').length;
    const coursesOwned = courseAccess.length;

    const arr = Array(6).fill(0);
    payments.filter((p) => new Date(p.created_at) >= sixMoAgo).forEach((p) => {
      const d = new Date(p.created_at);
      const idx = 5 - (now.getFullYear() * 12 + now.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
      if (idx >= 0 && idx <= 5) arr[idx] += Math.round(p.gross_amount_usd);
    });
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return { label: d.toLocaleString('en-GB', { month: 'short' }), value: arr[i] };
    });

    return { totalSpent, thisMonth, activeSubCount, coursesOwned, totalRefunded, monthly, subs, courseAccess, invoices, payments, refunds };
  } catch { return empty; }
}
