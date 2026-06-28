// app/parent/billing.tsx — Family billing across all children. Mirrors the web
// parent billing: FAMILY ACCOUNT header + Overview / By Child / Invoices / History
// tabs, KPI cards, refunds, a monthly-spend bar chart, per-child plans, and a
// chronological transaction list.
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchParentBilling, type ParentBillingData } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const money = (n: number) => `$${(n ?? 0).toFixed(2)}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

type Tab = 'overview' | 'bychild' | 'invoices' | 'history';
const TABS: { k: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { k: 'overview', label: 'Overview', icon: 'grid-outline' },
  { k: 'bychild', label: 'By Child', icon: 'people-outline' },
  { k: 'invoices', label: 'Invoices', icon: 'receipt-outline' },
  { k: 'history', label: 'History', icon: 'calendar-outline' },
];

export default function ParentBilling() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ParentBillingData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchParentBilling(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) return <Screen scroll={false}><Loading label="Loading billing…" /></Screen>;

  return (
    <Screen>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>FAMILY ACCOUNT</Text>
        <Text style={styles.h1}>Billing</Text>
        <Text style={styles.sub}>Manage payments for all your children in one place.</Text>
      </View>

      <View style={styles.tabWrap}>
        {TABS.map((t) => {
          const on = tab === t.k;
          return (
            <Pressable key={t.k} onPress={() => setTab(t.k)} style={[styles.tab, on && styles.tabOn]}>
              <Ionicons name={t.icon} size={15} color={on ? C.gold : C.muted} />
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'overview' && <Overview d={data} onHistory={() => setTab('history')} />}
      {tab === 'bychild' && <ByChild d={data} onBrowse={() => router.push('/parent/teachers' as any)} />}
      {tab === 'invoices' && <TxnList rows={data.payments.map((p) => ({ id: p.id, label: p.payment_type || 'Payment', child: p.childName, date: p.created_at, amount: p.gross_amount_usd, neg: false }))} emptyIcon="receipt-outline" emptyText="No invoices yet. Payments for your children's lessons appear here." />}
      {tab === 'history' && <History d={data} />}
      <View style={{ height: SPACE.lg }} />
    </Screen>
  );
}

function Kpi({ value, label, icon, tint, ic }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; ic: string }) {
  return (
    <View style={[styles.kpi, { backgroundColor: tint }]}>
      <View style={styles.kpiIcon}><Ionicons name={icon} size={18} color={ic} /></View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Overview({ d, onHistory }: { d: ParentBillingData; onHistory: () => void }) {
  const maxBar = Math.max(1, ...d.monthlySeries.map((m) => m.amount));
  return (
    <View>
      <View style={styles.kpiGrid}>
        <Kpi value={money(d.total)} label="Total Spent" icon="cash-outline" tint="rgba(22,163,74,0.10)" ic={C.success} />
        <Kpi value={money(d.thisMonth)} label="This Month" icon="calendar-outline" tint="rgba(201,162,39,0.12)" ic={C.gold} />
        <Kpi value={String(d.activePlans)} label="Active Plans" icon="sync-outline" tint="rgba(79,70,229,0.10)" ic={C.indigo} />
        <Kpi value={money(d.monthlyTotal)} label="Monthly Total" icon="card-outline" tint="rgba(22,163,74,0.10)" ic={C.success} />
      </View>

      <View style={styles.refundCard}>
        <View style={styles.refundIcon}><Ionicons name="refresh-outline" size={18} color={C.success} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refundTitle}>Refunds</Text>
          <Text style={styles.refundSub}>{d.refunds.length === 0 ? 'No refunds yet' : `${d.refunds.length} refund${d.refunds.length === 1 ? '' : 's'}`}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.refundAmt}>{money(d.refunded)}</Text>
          <Pressable onPress={onHistory}><Text style={styles.refundLink}>View in history →</Text></Pressable>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHead}>
          <Ionicons name="stats-chart-outline" size={16} color={C.gold} />
          <View>
            <Text style={styles.chartTitle}>Monthly Spend</Text>
            <Text style={styles.chartSub}>All children combined · last 6 months</Text>
          </View>
        </View>
        <View style={styles.bars}>
          {d.monthlySeries.map((m, i) => (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${Math.round((m.amount / maxBar) * 100)}%` }]} />
              </View>
              <Text style={styles.barLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ByChild({ d, onBrowse }: { d: ParentBillingData; onBrowse: () => void }) {
  if (d.byChild.length === 0) return <Empty icon="people-outline" text="No children linked yet. Link a child from the Children page to manage their billing." />;
  return (
    <View>
      {d.byChild.map((c) => (
        <View key={c.id} style={styles.childCard}>
          <View style={styles.childTop}>
            <Initials name={c.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{c.name}</Text>
              <Text style={styles.childMeta}>{c.activePlans} active plan{c.activePlans === 1 ? '' : 's'} · Total spent: {money(c.totalSpent)}</Text>
            </View>
          </View>
          {c.activePlans === 0 && (
            <View style={styles.childEmpty}>
              <Text style={styles.childEmptyText}>No plans yet for {c.name.split(' ')[0]}.</Text>
              <Pressable onPress={onBrowse}><Text style={styles.browse}>Browse teachers →</Text></Pressable>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function History({ d }: { d: ParentBillingData }) {
  const rows = useMemo(() => {
    const pays = d.payments.map((p) => ({ id: 'p' + p.id, label: p.payment_type || 'Payment', child: p.childName, date: p.created_at, amount: p.gross_amount_usd, neg: false }));
    const refs = d.refunds.map((r) => ({ id: 'r' + r.id, label: 'Refund', child: r.childName, date: r.created_at, amount: r.amount_usd, neg: true }));
    return [...pays, ...refs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [d]);
  return <TxnList rows={rows} emptyIcon="time-outline" emptyText="No transactions yet." />;
}

function TxnList({ rows, emptyIcon, emptyText }: { rows: { id: string; label: string; child: string; date: string; amount: number; neg: boolean }[]; emptyIcon: keyof typeof Ionicons.glyphMap; emptyText: string }) {
  if (rows.length === 0) return <Empty icon={emptyIcon} text={emptyText} />;
  return (
    <View>
      {rows.map((r) => (
        <View key={r.id} style={styles.txn}>
          <View style={styles.txnIcon}><Ionicons name="cash-outline" size={16} color={C.gold} /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.txnTopRow}>
              <Text style={styles.txnLabel} numberOfLines={1}>{r.label}</Text>
              <View style={styles.childPill}><Text style={styles.childPillText}>{r.child.split(' ')[0]}</Text></View>
            </View>
            <Text style={styles.txnDate}>{fmtDate(r.date)}</Text>
          </View>
          <Text style={[styles.txnAmt, r.neg && { color: C.success }]}>{r.neg ? '-' : ''}{money(r.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={22} color={C.gold} /></View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: SPACE.md },
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2 },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2 },
  sub: { fontFamily: FONT.body, fontSize: 13.5, color: C.muted, marginTop: 4, textAlign: 'center' },
  tabWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', backgroundColor: 'rgba(201,162,39,0.07)', borderRadius: RADIUS.md, padding: 6, marginBottom: SPACE.md },
  tab: { width: '48.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: RADIUS.sm, marginVertical: 3 },
  tabOn: { backgroundColor: C.white, ...SHADOW.card },
  tabText: { fontFamily: FONT.bodySemi, fontSize: 13.5, color: C.muted },
  tabTextOn: { color: C.gold, fontFamily: FONT.bodyBold },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpi: { width: '48.5%', borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, gap: 6 },
  kpiIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink, marginTop: 4 },
  kpiLabel: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted },
  refundCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(22,163,74,0.08)', borderRadius: RADIUS.lg, padding: SPACE.md, marginTop: SPACE.xs, marginBottom: SPACE.md },
  refundIcon: { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  refundTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  refundSub: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted, marginTop: 1 },
  refundAmt: { fontFamily: FONT.displayBold, fontSize: 18, color: C.success },
  refundLink: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.gold, marginTop: 2 },
  chartCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SPACE.md, ...SHADOW.card },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACE.md },
  chartTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  chartSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: '100%', height: 100, backgroundColor: C.cream, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: C.gold, borderRadius: 6, minHeight: 3 },
  barLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  childCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  childTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childName: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  childMeta: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted, marginTop: 2 },
  childEmpty: { alignItems: 'center', gap: 6, paddingTop: SPACE.md, marginTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.borderSoft },
  childEmptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  browse: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.gold },
  txn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  txnIcon: { width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center' },
  txnTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txnLabel: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink, textTransform: 'capitalize', flexShrink: 1 },
  childPill: { backgroundColor: C.tintGold, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  childPillText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.accent2 },
  txnDate: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  txnAmt: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
  empty: { alignItems: 'center', gap: 12, paddingVertical: SPACE.xl, backgroundColor: C.white, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, ...SHADOW.card },
  emptyIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FONT.body, fontSize: 13.5, color: C.muted, textAlign: 'center', lineHeight: 20 },
});
