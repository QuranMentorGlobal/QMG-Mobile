// app/teacher/earnings.tsx — earnings summary + ledger from teacher_earnings.
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { SectionHeader, EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchEarningsLedger, type Earning } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const money = (n: number) => `$${(n ?? 0).toFixed(2)}`;
const date = (s: string) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const EARN_COLORS: Record<string, { bg: string; fg: string }> = {
  paid: { bg: 'rgba(22,101,52,0.10)', fg: C.forest },
  available: { bg: 'rgba(22,101,52,0.10)', fg: C.forest },
  pending: { bg: 'rgba(201,162,39,0.12)', fg: C.accent2 },
  payout_pending: { bg: 'rgba(79,70,229,0.10)', fg: C.indigo },
  refunded: { bg: 'rgba(178,58,42,0.10)', fg: C.redMuted },
};

export default function TeacherEarnings() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Earning[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setRows(await fetchEarningsLedger(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading earnings…" /></Screen>;

  const totalNet = rows.reduce((s, r) => s + Number(r.net_amount_usd ?? 0), 0);
  const paid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.net_amount_usd ?? 0), 0);
  const pending = rows.filter((r) => ['pending', 'available', 'payout_pending'].includes(r.status)).reduce((s, r) => s + Number(r.net_amount_usd ?? 0), 0);
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= start).reduce((s, r) => s + Number(r.net_amount_usd ?? 0), 0);

  return (
    <Screen>
      <PageTitle title="Earnings" subtitle="Your payout ledger" />

      <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
        <Text style={styles.sumLabel}>Total Net Earnings</Text>
        <Text style={styles.sumValue}>{money(totalNet)}</Text>
        <View style={styles.sumRow}>
          <Mini label="This Month" value={money(thisMonth)} />
          <Mini label="Paid Out" value={money(paid)} />
          <Mini label="Pending" value={money(pending)} />
        </View>
      </LinearGradient>

      <SectionHeader title="Ledger" />
      {rows.length === 0 ? (
        <EmptyCard icon="cash-outline" title="No earnings yet" body="Completed paid lessons will show here." />
      ) : (
        rows.map((r) => {
          const c = EARN_COLORS[r.status] ?? { bg: C.borderSoft, fg: C.muted };
          return (
            <View key={r.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{(r.payment_type ?? 'Lesson').replace(/_/g, ' ')}</Text>
                <Text style={styles.rowMeta}>{date(r.created_at)} · {money(Number(r.gross_amount_usd))} gross</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.amount}>{money(Number(r.net_amount_usd))}</Text>
                <View style={[styles.badge, { backgroundColor: c.bg }]}><Text style={[styles.badgeText, { color: c.fg }]}>{r.status.replace(/_/g, ' ')}</Text></View>
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md, ...SHADOW.lg },
  sumLabel: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 12, letterSpacing: 0.5 },
  sumValue: { color: C.white, fontFamily: FONT.displayBold, fontSize: 34, marginTop: 6 },
  sumRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  mini: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  miniValue: { color: C.white, fontFamily: FONT.displayBold, fontSize: 15 },
  miniLabel: { color: C.textLo, fontFamily: FONT.body, fontSize: 10, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  rowTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink, textTransform: 'capitalize' },
  rowMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  amount: { fontFamily: FONT.displayBold, fontSize: 16, color: C.forest },
  badge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: FONT.bodySemi, fontSize: 10, textTransform: 'capitalize' },
});
