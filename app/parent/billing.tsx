// app/parent/billing.tsx — family billing across all children.
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { SectionHeader, EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchParentBilling, type ParentPayment, type ParentRefund } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

import { formatMoneySync as money, useDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
const date = (s: string) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function ParentBilling() {
  const { session } = useAuth();
  useDisplayCurrency(); // subscribe so prices re-render once the viewer's currency resolves
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ payments: ParentPayment[]; refunds: ParentRefund[]; total: number; refunded: number } | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchParentBilling(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) return <Screen scroll={false}><Loading label="Loading billing…" /></Screen>;

  return (
    <Screen>
      <PageTitle title="Billing" subtitle="Family payments and refunds" />
      <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
        <Text style={styles.sumLabel}>Total Spent</Text>
        <Text style={styles.sumValue}>{money(data.total)}</Text>
        <View style={styles.sumRow}>
          <View style={styles.pill}><Text style={styles.pillText}>{data.payments.length} payments</Text></View>
          {data.refunded > 0 ? <View style={styles.pill}><Text style={styles.pillText}>{money(data.refunded)} refunded</Text></View> : null}
        </View>
      </LinearGradient>

      <SectionHeader title="Payments" />
      {data.payments.length === 0 ? (
        <EmptyCard icon="card-outline" title="No payments yet" body="Payments for your children's lessons appear here." />
      ) : (
        data.payments.map((p) => (
          <View key={p.id} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: C.tintGreen }]}><Ionicons name="arrow-up" size={16} color={C.forest} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.childName}</Text>
              <Text style={styles.rowMeta}>{(p.payment_type ?? 'Payment')} · {date(p.created_at)}</Text>
            </View>
            <Text style={styles.amount}>{money(p.gross_amount_usd)}</Text>
          </View>
        ))
      )}

      <SectionHeader title="Refunds" />
      {data.refunds.length === 0 ? (
        <EmptyCard icon="refresh-outline" title="No refunds" body="Any refunds appear here." />
      ) : (
        data.refunds.map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: 'rgba(178,58,42,0.10)' }]}><Ionicons name="arrow-down" size={16} color={C.redMuted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r.childName}</Text>
              <Text style={styles.rowMeta}>{r.reason || 'Refund'} · {date(r.created_at)}</Text>
            </View>
            <Text style={[styles.amount, { color: C.redMuted }]}>-{money(r.amount_usd)}</Text>
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
  pill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { color: C.white, fontFamily: FONT.bodySemi, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  rowMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  amount: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
});
