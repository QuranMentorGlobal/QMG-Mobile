// app/student/dashboard.tsx
// Student home: greeting + KPI tiles (active bookings, completed lessons, upcoming)
// and the next upcoming lessons, all from the same Supabase the web app uses.

import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientHeader, Card, KpiTile, SectionTitle, Screen, StatusBadge, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchStudentBookings, fetchUpcomingLessons, countCompletedLessons, type Booking, type Lesson } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function StudentDashboard() {
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [completed, setCompleted] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const bk = await fetchStudentBookings(session.user.id);
    const ids = bk.map((b) => b.id);
    const [up, done] = await Promise.all([fetchUpcomingLessons(ids), countCompletedLessons(ids)]);
    setBookings(bk);
    setUpcoming(up);
    setCompleted(done);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const active = bookings.filter((b) => ['confirmed', 'active', 'pending'].includes((b.status ?? '').toLowerCase())).length;
  const name = profile?.first_name ?? 'there';

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your dashboard…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader greeting={greetingFor()} name={`Welcome back, ${name}`} subtitle="Here's your learning at a glance." />

      <View style={styles.kpiRow}>
        <KpiTile label="Active bookings" value={active} />
        <KpiTile label="Lessons done" value={completed} accent />
      </View>
      <View style={[styles.kpiRow, { marginTop: SPACE.sm }]}>
        <KpiTile label="Upcoming" value={upcoming.length} />
        <KpiTile label="Total bookings" value={bookings.length} />
      </View>

      <SectionTitle>Upcoming lessons</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming lessons" body="Book a teacher to schedule your next session." />
      ) : (
        upcoming.map((l) => (
          <Card key={l.id} style={styles.lessonRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTitle}>{formatWhen(l.scheduled_at)}</Text>
              <Text style={styles.lessonMeta}>{l.duration_mins ?? 30} min lesson</Text>
            </View>
            <StatusBadge status={l.status} />
          </Card>
        ))
      )}
    </Screen>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Scheduled';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: SPACE.sm },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  lessonTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  lessonMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
});
