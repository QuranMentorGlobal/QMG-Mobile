// app/student/billing.tsx — student Billing (mirrors web): 5 TabGrid tabs —
// Overview (KPIs + refunds + monthly spend + recent invoices), Subscriptions,
// Course Access, Invoices, and payment History.
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, TabGrid } from '@/components/ui';
import { BarsChart } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchStudentBilling, type BillingData } from '@/lib/billingActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

import { formatMoneySync as money, useDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
const fmt = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const TABS = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' as const },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'sync-outline' as const },
  { key: 'courses', label: 'Course Access', icon: 'cloud-upload-outline' as const },
  { key: 'invoices', label: 'Invoices', icon: 'receipt-outline' as const },
  { key: 'history', label: 'History', icon: 'calendar-outline' as const },
];

export default function StudentBilling() {
  const { session } = useAuth();
  useDisplayCurrency(); // subscribe so prices re-render once the viewer's currency resolves
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<BillingData | null>(null);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setD(await fetchStudentBilling(session.user.id)); setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading billing…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.eyebrow}>STUDENT PORTAL</Text>
      <Text style={styles.h1}>Billing</Text>
      <Text style={styles.sub}>Manage subscriptions, course access, invoices and payment history.</Text>

      <TabGrid options={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' ? <Overview d={d} go={setTab} /> :
        tab === 'subscriptions' ? <Subscriptions d={d} onBrowse={() => router.push('/student/teachers' as any)} /> :
        tab === 'courses' ? <CourseAccess d={d} onBrowse={() => router.push('/student/courses' as any)} /> :
        tab === 'invoices' ? <Invoices d={d} /> :
        <History d={d} />}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

const KTONE: Record<string, { bg: string; ic: string }> = {
  spent: { bg: 'rgba(22,163,74,0.10)', ic: C.success },
  month: { bg: 'rgba(201,162,39,0.12)', ic: C.gold },
  plans: { bg: 'rgba(79,70,229,0.10)', ic: C.indigo },
  owned: { bg: 'rgba(22,163,74,0.08)', ic: C.success },
};
function Kpi({ tone, value, label, icon }: { tone: keyof typeof KTONE; value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const t = KTONE[tone];
  return (
    <View style={[styles.kpi, { backgroundColor: t.bg }]}>
      <View style={styles.kpiIcon}><Ionicons name={icon} size={18} color={t.ic} /></View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Overview({ d, go }: { d: BillingData; go: (t: string) => void }) {
  return (
    <View>
      <View style={styles.kpiGrid}>
        <Kpi tone="spent" value={money(d.totalSpent)} label="Total Spent" icon="cash-outline" />
        <Kpi tone="month" value={money(d.thisMonth)} label="This Month" icon="calendar-outline" />
        <Kpi tone="plans" value={String(d.activeSubCount)} label="Active Plans" icon="sync-outline" />
        <Kpi tone="owned" value={String(d.coursesOwned)} label="Courses Owned" icon="cloud-upload-outline" />
      </View>

      <View style={styles.refundCard}>
        <View style={styles.refundIcon}><Ionicons name="cash-outline" size={18} color={C.success} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refundTitle}>Refunds</Text>
          <Text style={styles.refundSub}>{d.totalRefunded > 0 ? `${d.refunds.length} refund${d.refunds.length === 1 ? '' : 's'}` : 'No refunds yet'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.refundAmt}>{money(d.totalRefunded)}</Text>
          <Pressable onPress={() => go('history')}><Text style={styles.viewLink}>View in history →</Text></Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}><Ionicons name="bar-chart-outline" size={18} color={C.gold} /><View><Text style={styles.cardTitle}>Monthly Spend</Text><Text style={styles.cardHint}>Last 6 months</Text></View></View>
        <BarsChart data={d.monthly} unit="$" />
      </View>

      <View style={styles.card}>
        <View style={styles.recentHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="receipt-outline" size={18} color={C.gold} /><Text style={styles.cardTitle}>Recent Invoices</Text></View>
          <Pressable onPress={() => go('invoices')}><Text style={styles.viewLink}>View all →</Text></Pressable>
        </View>
        {d.invoices.length === 0 ? <Text style={styles.muted}>No invoices yet.</Text> : d.invoices.slice(0, 3).map((inv) => (
          <View key={inv.id} style={styles.invMini}>
            <View style={{ flex: 1 }}><Text style={styles.invNum}>{inv.invoice_number}</Text><Text style={styles.muted}>{(inv.description ?? inv.course_title ?? 'Quran Lesson')} · {fmt(inv.paid_at ?? inv.created_at)}</Text></View>
            <Text style={styles.amt}>{money(inv.total_usd)}</Text>
            <Badge label={(inv.status || 'paid').toUpperCase()} tone="green" />
          </View>
        ))}
      </View>
    </View>
  );
}

function Subscriptions({ d, onBrowse }: { d: BillingData; onBrowse: () => void }) {
  return (
    <View>
      {d.subs.length === 0 ? (
        <EmptyState icon="sync-outline" title="No subscriptions yet" body="Subscribe to a monthly live learning plan to see it here." />
      ) : d.subs.map((s) => (
        <View key={s.id} style={styles.listCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>{s.course_title ?? 'Live Plan'}</Text>
            <Text style={styles.muted}>with {s.teacher_name ?? 'Teacher'} · Started {fmt(s.created_at)}</Text>
          </View>
          <Text style={styles.amt}>{money(s.monthly_amount_usd ?? 0)}/mo</Text>
        </View>
      ))}
      <View style={styles.ctaCard}>
        <View style={styles.ctaIcon}><Ionicons name="cloud-upload-outline" size={20} color={C.gold} /></View>
        <Text style={styles.ctaTitle}>Ready to start learning?</Text>
        <Text style={styles.ctaSub}>Browse certified Quran teachers and subscribe to a monthly plan.</Text>
        <Pressable onPress={onBrowse}><LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}><Text style={styles.ctaBtnText}>Browse Teachers →</Text></LinearGradient></Pressable>
      </View>
    </View>
  );
}

function CourseAccess({ d, onBrowse }: { d: BillingData; onBrowse: () => void }) {
  if (d.courseAccess.length === 0) {
    return (
      <View style={styles.bigEmpty}>
        <View style={styles.ctaIcon}><Ionicons name="cloud-upload-outline" size={20} color={C.gold} /></View>
        <Text style={styles.emptyTitle}>No courses purchased</Text>
        <Text style={styles.ctaSub}>Purchase a recorded course to get instant lifetime access.</Text>
        <Pressable onPress={onBrowse}><LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}><Text style={styles.ctaBtnText}>Browse Courses</Text></LinearGradient></Pressable>
      </View>
    );
  }
  return <View>{d.courseAccess.map((a) => (
    <View key={a.id} style={styles.listCard}>
      <View style={{ flex: 1 }}><Text style={styles.listTitle}>{a.course_title}</Text>{a.teacher_name ? <Text style={styles.muted}>by {a.teacher_name}</Text> : null}<Text style={styles.muted}>Purchased {fmt(a.created_at)}</Text></View>
    </View>
  ))}</View>;
}

function Invoices({ d }: { d: BillingData }) {
  if (d.invoices.length === 0) return <EmptyState icon="receipt-outline" title="No invoices yet" body="Invoices will appear here after payments." />;
  return <View>{d.invoices.map((inv) => (
    <View key={inv.id} style={styles.payCard}>
      <View style={styles.payIcon}><Ionicons name="receipt-outline" size={16} color={C.gold} /></View>
      <View style={{ flex: 1 }}><Text style={styles.invNum}>{inv.invoice_number}</Text><Text style={styles.muted}>{(inv.description ?? inv.course_title ?? 'Quran Lesson')} · {fmt(inv.paid_at ?? inv.created_at)}</Text></View>
      <Text style={styles.amt}>{money(inv.total_usd)}</Text>
      <Badge label={(inv.status || 'paid').toUpperCase()} tone="green" />
    </View>
  ))}</View>;
}

function History({ d }: { d: BillingData }) {
  if (d.payments.length === 0) return <EmptyState icon="calendar-outline" title="No payments yet" body="Your payment history will appear here." />;
  return <View>{d.payments.map((p) => (
    <View key={p.id} style={styles.payCard}>
      <View style={styles.payIcon}><Ionicons name="cash-outline" size={16} color={C.gold} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{p.description ?? (p.teacher_name ? `Lesson with ${p.teacher_name}` : 'Payment')}</Text>
        <Text style={styles.muted}>{fmt(p.created_at)} · {p.payment_type.replace('_', ' ')} · {p.provider}</Text>
      </View>
      <Text style={styles.amt}>{money(p.gross_amount_usd)}</Text>
      <Badge label="Succeeded" tone="outline" />
    </View>
  ))}</View>;
}

function Badge({ label, tone }: { label: string; tone: 'green' | 'outline' }) {
  if (tone === 'outline') return <View style={styles.badgeOutline}><Text style={styles.badgeOutlineText}>{label}</Text></View>;
  return <View style={styles.badgeGreen}><Text style={styles.badgeGreenText}>{label}</Text></View>;
}
function EmptyState({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View style={styles.bigEmpty}><View style={styles.ctaIcon}><Ionicons name={icon} size={20} color={C.gold} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.ctaSub}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  muted: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  kpi: { width: '48.5%', borderRadius: RADIUS.lg, paddingVertical: SPACE.lg, alignItems: 'center', marginBottom: SPACE.sm },
  kpiIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink },
  kpiLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  refundCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(22,163,74,0.08)', borderRadius: RADIUS.lg, padding: SPACE.md, marginTop: SPACE.sm, marginBottom: SPACE.md },
  refundIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(22,163,74,0.14)', alignItems: 'center', justifyContent: 'center' },
  refundTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  refundSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  refundAmt: { fontFamily: FONT.displayBold, fontSize: 20, color: C.success },
  viewLink: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold, marginTop: 4 },

  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACE.md },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink },
  cardHint: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  invMini: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.borderSoft },
  invNum: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  amt: { fontFamily: FONT.displayBold, fontSize: 15, color: C.ink },

  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  listTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  payCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  payIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(201,162,39,0.10)', alignItems: 'center', justifyContent: 'center' },

  badgeGreen: { backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGreenText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.success, letterSpacing: 0.4 },
  badgeOutline: { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOutlineText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.muted },

  bigEmpty: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.section, alignItems: 'center', ...SHADOW.card },
  emptyTitle: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink, marginTop: SPACE.md },
  ctaCard: { backgroundColor: 'rgba(201,162,39,0.08)', borderRadius: RADIUS.lg, padding: SPACE.lg, alignItems: 'center', marginTop: SPACE.sm },
  ctaIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(201,162,39,0.14)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginTop: SPACE.md },
  ctaSub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: SPACE.sm },
  ctaBtn: { borderRadius: RADIUS.md, paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center', marginTop: SPACE.md },
  ctaBtnText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
});
