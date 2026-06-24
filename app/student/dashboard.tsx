// app/student/dashboard.tsx
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, StatusBadge, EmptyState, Loading } from '@/components/ui';
import { HeroCard, KpiGrid, ColorKpi } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchStudentBookings, fetchUpcomingLessons, countCompletedLessons, type Booking, type Lesson } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export default function StudentDashboard() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading your dashboard…" /></Screen>;

  const active = bookings.filter((b) => ['confirmed', 'active', 'pending'].includes((b.status ?? '').toLowerCase())).length;

  return (
    <Screen>
      <HeroCard eyebrow="QURANMENTOR GLOBAL" title="Continue Learning" subtitle="Your journey through the words of Allah." />
      <KpiGrid>
        <ColorKpi label="Active Bookings" value={active} tone="green" icon={<Ionicons name="calendar-outline" size={18} color={C.forest} />} />
        <ColorKpi label="Lessons Done" value={completed} tone="gold" icon={<Ionicons name="checkmark-done-outline" size={18} color={C.accent2} />} />
        <ColorKpi label="Upcoming" value={upcoming.length} tone="indigo" icon={<Ionicons name="time-outline" size={18} color="#4F46E5" />} />
        <ColorKpi label="Total Bookings" value={bookings.length} tone="green" icon={<Ionicons name="book-outline" size={18} color={C.forest} />} />
      </KpiGrid>

      <Text style={styles.section}>Upcoming lessons</Text>
      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming lessons" body="Book a teacher to schedule your next session." />
      ) : (
        upcoming.map((l) => (
          <Card key={l.id} style={styles.row}>
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
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  section: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink, marginTop: SPACE.sm, marginBottom: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  lessonTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  lessonMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
});
