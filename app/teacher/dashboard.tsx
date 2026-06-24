// app/teacher/dashboard.tsx
// Teacher home — matches the web design: hero, colored KPI grid, profile-completion
// ring, performance metrics, and an earnings trend chart. Data from real Supabase.

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Loading } from '@/components/ui';
import { HeroCard, KpiGrid, ColorKpi, CompletionRing, MetricBar, MiniBars } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import {
  fetchTeacherBookings,
  fetchUpcomingLessons,
  countCompletedLessons,
  countTodayLessons,
  fetchTeacherEarnings,
  type Booking,
} from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export default function TeacherDashboard() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [today, setToday] = useState(0);
  const [taught, setTaught] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [upcoming, setUpcoming] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const bk = await fetchTeacherBookings(session.user.id);
    const ids = bk.map((b) => b.id);
    const [t, done, up, money] = await Promise.all([
      countTodayLessons(ids),
      countCompletedLessons(ids),
      fetchUpcomingLessons(ids),
      fetchTeacherEarnings(session.user.id),
    ]);
    setBookings(bk);
    setToday(t);
    setTaught(done);
    setUpcoming(up.length);
    setEarnings(money);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your dashboard…" />
      </Screen>
    );
  }

  const activeStudents = new Set(
    bookings.filter((b) => ['confirmed', 'active'].includes((b.status ?? '').toLowerCase())).map((b) => b.student_id)
  ).size;
  const pending = bookings.filter((b) => (b.status ?? '').toLowerCase() === 'pending').length;
  const trialToPaid = bookings.length ? Math.round((activeStudents / bookings.length) * 100) : 0;
  const totalPlanned = bookings.reduce((s, b) => s + (b.total_lessons ?? 0), 0);
  const completion = totalPlanned ? Math.round((taught / totalPlanned) * 100) : 0;

  const months = lastSixMonthLabels();
  const trend = months.map((m, i) => ({ label: m, value: i === months.length - 1 ? Math.round(earnings) : 0 }));

  return (
    <Screen>
      <HeroCard eyebrow="QURANMENTOR GLOBAL" title="Share Your Knowledge" subtitle="Earn while teaching the words of Allah." />

      <KpiGrid>
        <ColorKpi label="Total Students" value={activeStudents} tone="green" icon={<Ionicons name="people-outline" size={18} color={C.forest} />} />
        <ColorKpi label="Today's Lessons" value={today} tone="gold" icon={<Ionicons name="book-outline" size={18} color={C.accent2} />} />
        <ColorKpi label="This Month" value={`$${earnings.toFixed(2)}`} tone="green" icon={<Ionicons name="cash-outline" size={18} color={C.forest} />} />
        <ColorKpi label="Pending Requests" value={pending} tone="indigo" icon={<Ionicons name="time-outline" size={18} color="#4F46E5" />} />
      </KpiGrid>

      <CompletionRing percent={0} note="Needs attention" />

      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>This Month</Text>
          </View>
        </View>
        <MetricBar label="Lesson Completion" percent={completion} />
        <MetricBar label="Trial → Paid" percent={trialToPaid} />
        <MetricBar label="Profile Score" percent={0} />
        <View style={styles.statsRow}>
          <MiniStat label="Lessons Taught" value={String(taught)} />
          <MiniStat label="Upcoming" value={String(upcoming)} />
          <MiniStat label="Pending Payout" value={`$${earnings.toFixed(2)}`} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Earnings Trend</Text>
        <Text style={styles.cardSub}>Net payout · last 6 months</Text>
        <MiniBars data={trend} unit="$" />
      </Card>
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function lastSixMonthLabels(): string[] {
  const out: string[] = [];
  const now = new Date().getMonth();
  for (let i = 5; i >= 0; i--) out.push(MONTHS[(now - i + 12) % 12]);
  return out;
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
  cardSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2, marginBottom: SPACE.sm },
  pill: { backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.accent2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.sm, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.borderSoft },
  miniStat: { flex: 1 },
  miniStatValue: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink },
  miniStatLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
});
