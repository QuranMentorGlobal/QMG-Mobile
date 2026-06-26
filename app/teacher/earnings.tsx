// app/teacher/earnings.tsx — teacher Earnings (mirrors web).
// Date range filters + 3 sub-tabs (Overview / Earnings / Payouts), all on screen
// (wrapped, centered — no swipe). Overview: KPI cards, revenue breakdown bars,
// monthly net + lessons charts, available-for-payout. Earnings: transaction
// ledger. Payouts: balance card + history / adjustments / refund deductions.
// Charts are pure Views (OTA-safe — no native chart lib). Payout setup opens the
// web settings page for now (native payout flow is a later batch).
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, FilterChips } from '@/components/ui';
import { Panel, PanelHeader, BarsChart, EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import {
  fetchEarnings, DATE_OPTS, EARN_STATUS, PAYOUT_STATUS,
  type DateOpt, type EarningsData,
} from '@/lib/earningsActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const PAYOUT_SETTINGS_URL = 'https://www.muddarris.com/platform/teacher/payout-settings';
const money = (n: number) => `$${(n ?? 0).toFixed(2)}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type SubTab = 'overview' | 'earnings' | 'payouts';
const SUBTABS: { key: SubTab; label: string }[] = [
  { key: 'overview', label: 'Overview' }, { key: 'earnings', label: 'Earnings' }, { key: 'payouts', label: 'Payouts' },
];

export default function TeacherEarnings() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EarningsData | null>(null);
  const [range, setRange] = useState<DateOpt>('all');
  const [tab, setTab] = useState<SubTab>('overview');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setData(await fetchEarnings(session.user.id, range));
    setLoading(false);
  }, [session?.user?.id, range]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
      <Text style={styles.h1}>Earnings</Text>
      <Text style={styles.sub}>Your complete earnings, commission breakdown and payout history.</Text>

      <FilterChips value={range} onChange={(k) => setRange(k as DateOpt)} options={DATE_OPTS.map((d) => ({ key: d.key, label: d.label }))} />
      <FilterChips value={tab} onChange={(k) => setTab(k as SubTab)} options={SUBTABS} />

      {loading || !data ? (
        <View style={{ paddingVertical: SPACE.section }}><Loading label="Loading earnings…" /></View>
      ) : tab === 'overview' ? (
        <Overview data={data} />
      ) : tab === 'earnings' ? (
        <EarningsList data={data} />
      ) : (
        <Payouts data={data} />
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────────── */
function Overview({ data }: { data: EarningsData }) {
  const s = data.summary;
  const gross = s.grossLifetime;
  const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
  const commissionPct = gross > 0 ? pctOf(s.commissionPaid, gross) : data.commissionPct;
  const netPct = gross > 0 ? pctOf(s.totalEarned, gross) : 100 - data.commissionPct;
  const paidPct = s.totalEarned > 0 ? pctOf(s.paidAmount, s.totalEarned) : 0;

  return (
    <View>
      <View style={styles.kpiGrid}>
        <Kpi tone="green" icon="card-outline" value={money(s.availableAmount)} label="Available Balance" sub="Ready to withdraw" />
        <Kpi tone="gold" icon="calendar-outline" value={money(s.pendingAmount)} label="Pending Earnings" sub="Maturing soon" />
        <Kpi tone="indigo" icon="card-outline" value={money(s.pendingWithdrawals)} label="Pending Withdrawals" sub="In payout pipeline" />
        <Kpi tone="green" icon="cash-outline" value={money(s.totalEarned)} label="Lifetime Earnings" sub="Net after commission" />
        <Kpi tone="green" icon="stats-chart-outline" value={money(s.paidAmount)} label="Paid Out" sub="Withdrawn to date" />
        <Kpi tone="red" icon="refresh-outline" value={`-${money(data.totalReversed)}`} label="Refunds / Adjustments" sub={data.totalReversed > 0 ? 'Reversed to students' : 'Nothing reversed'} />
      </View>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="bar-chart-outline" title="Revenue Breakdown" subtitle="How your earnings are calculated" />
        <Break label="Gross Revenue (student pays)" pct={100} amount={gross} color={C.indigo} />
        <Break label="Platform Commission" pct={commissionPct} amount={s.commissionPaid} color="#F59E0B" />
        <Break label={`Your Net Earnings (${netPct}%)`} pct={netPct} amount={s.totalEarned} color={C.gold} />
        <Break label="Paid Out" pct={paidPct} amount={s.paidAmount} color={C.success} />
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="trending-up-outline" title="Monthly Net Earnings" subtitle="Your take-home after commission — last 6 months" />
        <BarsChart unit="$" data={data.months.map((m, i) => ({ label: m, value: data.monthlyNet[i] }))} />
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="document-text-outline" title="Lessons Taught" subtitle="Completed paid lessons per month" />
        <BarsChart data={data.months.map((m, i) => ({ label: m, value: data.lessonCount[i] }))} />
      </Panel>

      <LinearGradient colors={['#F7F1E2', '#FDEFC9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.payoutCardLight}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="card-outline" size={18} color={C.accent2} />
          <Text style={styles.payoutLightTitle}>Available for Payout</Text>
        </View>
        <Text style={styles.payoutBig}>{money(s.availableAmount)}</Text>
        <Text style={styles.payoutNote}>Contact admin to request a payout via bank transfer or Wise.</Text>
        <View style={styles.payoutSplit}>
          <View><Text style={styles.payoutSplitLbl}>Lifetime earned</Text><Text style={styles.payoutSplitVal}>{money(s.totalEarned)}</Text></View>
          <View><Text style={styles.payoutSplitLbl}>Total paid out</Text><Text style={[styles.payoutSplitVal, { color: C.success }]}>{money(s.paidAmount)}</Text></View>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ── Earnings ledger ──────────────────────────────────────────────────────── */
function EarningsList({ data }: { data: EarningsData }) {
  if (data.earnings.length === 0) {
    return <EmptyCard icon="cash-outline" title="No earnings yet" body="Completed paid lessons will appear here." />;
  }
  return (
    <View style={{ marginTop: SPACE.sm }}>
      {data.earnings.map((e) => {
        const st = EARN_STATUS[e.status] ?? EARN_STATUS.pending;
        return (
          <View key={e.id} style={styles.txn}>
            <View style={styles.txnTop}>
              <View style={styles.coin}><Ionicons name="cash-outline" size={16} color={C.gold} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>Lesson payment</Text>
                <Text style={styles.txnMeta}>{fmtDate(e.created_at)} · {e.payment_type === 'trial' ? 'trial' : 'lesson'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.txnNet}>{money(e.net)}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text></View>
              </View>
            </View>
            <View style={styles.txnBreak}>
              <Text style={styles.txnSmall}>Gross: <Text style={styles.txnStrong}>{money(e.gross)}</Text></Text>
              <Text style={styles.txnSmall}>Commission: <Text style={[styles.txnStrong, { color: C.red }]}>-{money(e.commission)}</Text></Text>
              <Text style={styles.txnSmall}>Net: <Text style={[styles.txnStrong, { color: C.success }]}>{money(e.net)}</Text></Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ── Payouts ──────────────────────────────────────────────────────────────── */
function Payouts({ data }: { data: EarningsData }) {
  const s = data.summary;
  return (
    <View style={{ marginTop: SPACE.sm }}>
      <LinearGradient colors={['#0F3D27', '#166534', '#C9A227']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <Text style={styles.balLabel}>AVAILABLE BALANCE</Text>
        <Text style={styles.balValue}>{money(s.availableAmount)}</Text>
        <Text style={styles.balMeta}>Pending earnings: {money(s.pendingAmount)} · Pending withdrawals: {money(s.pendingWithdrawals)}</Text>
        <Text style={styles.balPaidLbl}>Total paid out</Text>
        <Text style={styles.balPaid}>{money(s.paidAmount)}</Text>
        <Pressable onPress={() => Linking.openURL(PAYOUT_SETTINGS_URL)} style={styles.setupBtn}>
          <Text style={styles.setupText}>{data.hasPayoutSettings ? 'Manage payout method →' : 'Set up payout method →'}</Text>
        </Pressable>
      </LinearGradient>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="card-outline" title="Payout History" />
        {data.payouts.length === 0 ? (
          <Text style={styles.emptyLine}>No payouts yet. Once you accumulate earnings, contact admin to request a payout.</Text>
        ) : data.payouts.map((p) => {
          const st = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.requested;
          return (
            <View key={p.id} style={styles.rowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{money(p.amount_usd)}</Text>
                <Text style={styles.rowMeta}>{p.payout_method || 'Bank transfer'} · {fmtDate(p.created_at)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text></View>
            </View>
          );
        })}
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="bar-chart-outline" title="Adjustments" />
        {data.adjustments.length === 0 ? (
          <Text style={styles.emptyLine}>No adjustments. Post-payout refund clawbacks would appear here.</Text>
        ) : data.adjustments.map((a) => (
          <View key={a.id} style={styles.rowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{money(a.amount_usd)}</Text>
              <Text style={styles.rowMeta}>{a.reason || a.description || 'Adjustment'} · {fmtDate(a.created_at)}</Text>
            </View>
          </View>
        ))}
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="refresh-outline" title="Refund Deductions" />
        {data.refunds.length === 0 ? (
          <Text style={styles.emptyLine}>No refund deductions.</Text>
        ) : data.refunds.map((r) => (
          <View key={r.id} style={styles.rowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>-{money(r.amount_usd)}</Text>
              <Text style={styles.rowMeta}>{r.student_name} · {r.course_title} · {fmtDate(r.created_at)}</Text>
            </View>
          </View>
        ))}
      </Panel>
    </View>
  );
}

/* ── small components ─────────────────────────────────────────────────────── */
const KPI_TONE: Record<string, { from: string; to: string; icon: string; iconBg: string }> = {
  green: { from: '#F0FFF4', to: '#DCFCE7', icon: C.success, iconBg: 'rgba(22,163,74,0.12)' },
  gold: { from: '#FFF8E8', to: '#FDEFC9', icon: C.accent2, iconBg: 'rgba(201,162,39,0.16)' },
  indigo: { from: '#EEF2FF', to: '#E0E7FF', icon: C.indigo, iconBg: 'rgba(79,70,229,0.12)' },
  red: { from: '#FFF5F3', to: '#FFE9E4', icon: C.redMuted, iconBg: 'rgba(178,58,42,0.10)' },
};
function Kpi({ tone, icon, value, label, sub }: { tone: keyof typeof KPI_TONE; icon: keyof typeof Ionicons.glyphMap; value: string; label: string; sub: string }) {
  const t = KPI_TONE[tone];
  return (
    <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: t.iconBg }]}><Ionicons name={icon} size={18} color={t.icon} /></View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </LinearGradient>
  );
}
function Break({ label, pct, amount, color }: { label: string; pct: number; amount: number; color: string }) {
  return (
    <View style={styles.breakRow}>
      <View style={styles.breakTop}>
        <Text style={styles.breakLabel}>{label}</Text>
        <Text style={styles.breakAmount}>{Math.round(amount)}</Text>
      </View>
      <View style={styles.breakTrack}><View style={[styles.breakFill, { width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color }]}><Text style={styles.breakPct}>{pct}%</Text></View></View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.sm, textAlign: 'center' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACE.md, marginTop: SPACE.sm },
  kpi: { width: '48%', borderRadius: RADIUS.lg, padding: SPACE.md, ...SHADOW.card },
  kpiIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink, marginTop: 8, textAlign: 'center' },
  kpiLabel: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink, marginTop: 2, textAlign: 'center' },
  kpiSub: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 1, textAlign: 'center' },

  breakRow: { marginTop: SPACE.md },
  breakTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  breakLabel: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink, flex: 1 },
  breakAmount: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  breakTrack: { height: 26, borderRadius: 13, backgroundColor: '#EFEBE2', overflow: 'hidden' },
  breakFill: { height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 12, minWidth: 44 },
  breakPct: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.white },

  payoutCardLight: { borderRadius: RADIUS.lg, padding: SPACE.lg, marginTop: SPACE.md, ...SHADOW.card },
  payoutLightTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  payoutBig: { fontFamily: FONT.displayBold, fontSize: 34, color: C.ink, marginTop: 10 },
  payoutNote: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 8 },
  payoutSplit: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.md },
  payoutSplitLbl: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  payoutSplitVal: { fontFamily: FONT.bodyBold, fontSize: 18, color: C.ink, marginTop: 2 },

  txn: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  txnTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coin: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  txnMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  txnNet: { fontFamily: FONT.bodyBold, fontSize: 17, color: C.ink },
  txnBreak: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderSoft },
  txnSmall: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  txnStrong: { fontFamily: FONT.bodyBold, color: C.ink },

  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: FONT.bodyBold, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },

  balanceCard: { borderRadius: RADIUS.lg, padding: SPACE.lg, ...SHADOW.card },
  balLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  balValue: { fontFamily: FONT.displayBold, fontSize: 40, color: C.white, marginTop: 6 },
  balMeta: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 10 },
  balPaidLbl: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: SPACE.md, textAlign: 'center' },
  balPaid: { fontFamily: FONT.displayBold, fontSize: 22, color: C.white, textAlign: 'center', marginTop: 2 },
  setupBtn: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginTop: SPACE.md },
  setupText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },

  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  rowTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  rowMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  emptyLine: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: SPACE.md },
});
