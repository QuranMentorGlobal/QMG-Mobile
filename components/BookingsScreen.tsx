// components/BookingsScreen.tsx
// Shared bookings list for student & teacher views. Shows status, lesson progress.

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Screen, StatusBadge, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchStudentBookings, fetchTeacherBookings, type Booking } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export function BookingsScreen({ as }: { as: 'student' | 'teacher' }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const data = as === 'student' ? await fetchStudentBookings(session.user.id) : await fetchTeacherBookings(session.user.id);
    setBookings(data);
    setLoading(false);
  }, [session?.user?.id, as]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading bookings…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.pageTitle}>{as === 'teacher' ? 'Your students' : 'Your bookings'}</Text>
      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body={as === 'teacher' ? 'New student bookings will appear here.' : 'Book a teacher to get started.'}
        />
      ) : (
        bookings.map((b) => {
          const total = b.total_lessons ?? 0;
          const done = b.lessons_completed ?? 0;
          const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
          return (
            <Card key={b.id}>
              <View style={styles.row}>
                <Text style={styles.title}>Booking #{b.id.slice(0, 6)}</Text>
                <StatusBadge status={b.status} />
              </View>
              <Text style={styles.meta}>
                {done} of {total} lessons completed
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink, marginTop: 4, marginBottom: SPACE.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.borderSoft, marginTop: 8, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.forest },
});
