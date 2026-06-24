// app/teacher/analytics.tsx — teaching analytics (lessons trend, earnings, metrics).
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { Panel, PanelHeader, BarsChart, StatGrid, StatTile, MetricBar } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherDash, fetchTeacherLessonTrend, fetchEarningsLedger, type MonthCount, type TeacherDash } from '@/lib/db';
import { SPACE } from '@/lib/theme';

export default function TeacherAnalytics() {
  const { session } = useAuth();
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
      <PageTitle title="Analytics" subtitle="Your teaching performance" />

      <StatGrid>
        <StatTile icon="people-outline" value={dash.totalStudents} label="Active Students" tone="green" />
        <StatTile icon="checkmark-done-outline" value={dash.taught} label="Lessons Taught" tone="gold" />
        <StatTile icon="library-outline" value={dash.courses.trial + dash.courses.live + dash.courses.recorded} label="Courses" tone="indigo" />
        <StatTile icon="cash-outline" value={`$${dash.earnings.toFixed(0)}`} label="Net Earnings" tone="green" />
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

