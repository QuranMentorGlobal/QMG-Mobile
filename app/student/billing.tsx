// app/student/billing.tsx — student billing: spend summary, payments, refunds.
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { SectionHeader, EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchPayments, fetchRefunds, type Payment, type RefundRow } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const money = (n: number) => `$${(n ?? 0).toFixed(2)}`;
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function StudentBilling() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const [p, r] = await Promise.all([fetchPayments(session.user.id), fetchRefunds(session.user.id)]);
    setPayments(p); setRefunds(r); setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading billing…" /></Screen>;

  const totalPaid = payments.reduce((s, p) => s + Number(p.gross_amount_usd ?? 0), 0);
  const totalRefund = refunds.reduce((s, r) => s + Number(r.amount_usd ?? 0), 0);

  return (
    <Screen>
      <PageTitle title="Billing" subtitle="Your payments and refunds" />

      <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
        <Text style={styles.sumLabel}>Total Paid</Text>
        <Text style={styles.sumValue}>{money(totalPaid)}</Text>
        <View style={styles.sumRow}>
          <View style={styles.sumPill}><Text style={styles.sumPillText}>{payments.length} payments</Text></View>
          {totalRefund > 0 ? <View style={styles.sumPill}><Text style={styles.sumPillText}>{money(totalRefund)} refunded</Text></View> : null}
        </View>
      </LinearGradient>

      <SectionHeader title="Payments" />
      {payments.length === 0 ? (
        <EmptyCard icon="card-outline" title="No payments yet" body="Your completed payments will appear here." />
      ) : (
        payments.map((p) => (
          <View key={p.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: C.tintGreen }]}><Ionicons name="arrow-up" size={16} color={C.forest} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.description || (p.payment_type ?? 'Payment')}</Text>
              <Text style={styles.rowMeta}>{date(p.created_at)}</Text>
            </View>
            <Text style={styles.amount}>{money(Number(p.gross_amount_usd))}</Text>
          </View>
        ))
      )}

      <SectionHeader title="Refunds" />
      {refunds.length === 0 ? (
        <EmptyCard icon="refresh-outline" title="No refunds" body="Any refunds issued to you will appear here." />
      ) : (
        refunds.map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(178,58,42,0.10)' }]}><Ionicons name="arrow-down" size={16} color={C.redMuted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r.reason || 'Refund'}</Text>
              <Text style={styles.rowMeta}>{date(r.created_at)}</Text>
            </View>
            <Text style={[styles.amount, { color: C.redMuted }]}>-{money(Number(r.amount_usd))}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md, ...SHADOW.lg },
  sumLabel: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 12, letterSpacing: 0.5 },
  sumValue: { color: C.white, fontFamily: FONT.displayBold, fontSize: 34, marginTop: 6 },
  sumRow: { flexDirection: 'row', gap: 8, marginTop: SPACE.md },
  sumPill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  sumPillText: { color: C.white, fontFamily: FONT.bodySemi, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  rowMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  amount: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
});
