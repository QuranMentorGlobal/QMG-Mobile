// app/teacher/analytics.tsx — teaching analytics (lessons trend, earnings, metrics).
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { formatMoneySync as money, useDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
import { Screen, Loading } from '@/components/ui';
import { Panel, PanelHeader, BarsChart, StatGrid, StatTile, MetricBar } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherDash, fetchTeacherLessonTrend, fetchEarningsLedger, type MonthCount, type TeacherDash } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export default function TeacherAnalytics() {
  const { session } = useAuth();
  useDisplayCurrency(); // subscribe so prices re-render once the viewer's currency resolves
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<TeacherDash | null>(null);
  const [trend, setTrend] = useState<MonthCount[]>([]);
  const [earnTrend, setEarnTrend] = useState<MonthCount[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    const [d, t, ledger] = await Promise.all([fetchTeacherDash(uid), fetchTeacherLessonTrend(uid), fetchEarningsLedger(uid)]);
    setDash(d); setTrend(t);
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const buckets: MonthCount[] = [];
    for (let i = 5; i >= 0; i--) { const dd = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.push({ label: M[dd.getMonth()], value: 0 }); }
    ledger.forEach((e) => {
      const dd = new Date(e.created_at);
      const idx = (dd.getFullYear() - now.getFullYear()) * 12 + (dd.getMonth() - now.getMonth()) + 5;
      if (idx >= 0 && idx < 6) buckets[idx].value += Math.round(Number(e.net_amount_usd ?? 0));
    });
    setEarnTrend(buckets);
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !dash) return <Screen scroll={false}><Loading label="Loading analytics…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
      <Text style={styles.h1}>Analytics</Text>
      <Text style={styles.sub}>Your teaching performance — students, lessons, earnings and conversion.</Text>

      <StatGrid>
        <StatTile icon="people-outline" value={dash.totalStudents} label="Active Students" tone="green" />
        <StatTile icon="checkmark-done-outline" value={dash.taught} label="Lessons Taught" tone="gold" />
        <StatTile icon="library-outline" value={dash.courses.trial + dash.courses.live + dash.courses.recorded} label="Courses" tone="indigo" />
        <StatTile icon="cash-outline" value={money(dash.earnings)} label="Net Earnings" tone="green" />
      </StatGrid>

      <View style={{ height: SPACE.md }} />
      <Panel>
        <PanelHeader icon="bar-chart-outline" title="Lessons Completed" subtitle="Last 6 months" />
        <BarsChart data={trend} />
      </Panel>

      <Panel>
        <PanelHeader icon="cash-outline" title="Earnings Trend" subtitle="Net payout · last 6 months" />
        <BarsChart data={earnTrend} unit="$" />
      </Panel>

      <Panel>
        <PanelHeader title="Conversion" />
        <MetricBar label="Trial → Paid" percent={dash.courses.enrolments > 0 ? Math.min(100, Math.round((dash.totalStudents / Math.max(1, dash.courses.enrolments)) * 100)) : 0} icon="infinite-outline" />
        <MetricBar label="Enrolment Fill" percent={dash.courses.enrolments > 0 ? 100 : 0} icon="people-outline" />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
});
