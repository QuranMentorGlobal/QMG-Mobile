// app/teacher/students.tsx — teacher's students with quick stats + message shortcut.
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherStudents, type TeacherStudent } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function TeacherStudents() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<TeacherStudent[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setStudents(await fetchTeacherStudents(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading students…" /></Screen>;

  return (
    <Screen>
      <PageTitle title="Students" subtitle={`${students.length} student${students.length === 1 ? '' : 's'}`} />
      {students.length === 0 ? (
        <EmptyCard icon="people-outline" title="No students yet" body="Students who book you will appear here." />
      ) : (
        students.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.top}>
              {s.avatar ? <Image source={{ uri: s.avatar }} style={styles.avatar} /> : <Initials name={s.name} size={48} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.sub}>{s.active} active · {s.bookings} total</Text>
              </View>
              <Pressable onPress={() => router.push('/teacher/messages')} style={styles.msgBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={C.forest} />
              </Pressable>
            </View>
            <View style={styles.stats}>
              <Stat label="Bookings" value={s.bookings} />
              <Stat label="Active" value={s.active} />
              <Stat label="Trials" value={s.trials} />
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  msgBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  stat: { flex: 1, backgroundColor: C.cream, borderRadius: 14, paddingVertical: SPACE.md, alignItems: 'center' },
  statValue: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  statLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
});
