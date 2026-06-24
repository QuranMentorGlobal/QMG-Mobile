// app/teacher/dashboard.tsx
// Teacher home: KPI tiles from the teacher's bookings + their upcoming lessons.

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientHeader, Card, KpiTile, SectionTitle, Screen, StatusBadge, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchTeacherBookings, fetchUpcomingLessons, countCompletedLessons, type Booking, type Lesson } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TeacherDashboard() {
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [taught, setTaught] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const bk = await fetchTeacherBookings(session.user.id);
    const ids = bk.map((b) => b.id);
    const [up, done] = await Promise.all([fetchUpcomingLessons(ids), countCompletedLessons(ids)]);
    setBookings(bk);
    setUpcoming(up);
    setTaught(done);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeStudents = new Set(
    bookings.filter((b) => ['confirmed', 'active'].includes((b.status ?? '').toLowerCase())).map((b) => b.student_id)
  ).size;
  const name = profile?.first_name ?? 'Teacher';

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your dashboard…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader greeting={greetingFor()} name={`Welcome back, ${name}`} subtitle="Your teaching at a glance." />

      <View style={styles.kpiRow}>
        <KpiTile label="Active students" value={activeStudents} />
        <KpiTile label="Lessons taught" value={taught} accent />
      </View>
      <View style={[styles.kpiRow, { marginTop: SPACE.sm }]}>
        <KpiTile label="Upcoming" value={upcoming.length} />
        <KpiTile label="Total bookings" value={bookings.length} />
      </View>

      <SectionTitle>Upcoming lessons</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming lessons" body="Scheduled sessions with your students will show here." />
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
  return (
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: SPACE.sm },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  lessonTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  lessonMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
});
