// app/teacher/students.tsx — teacher's students (mirrors web).
// Eyebrow + title + 3 stat cards (Total / With Active Bookings / Trials Taken),
// a search box, and rich rows: avatar, name, active · courses · trials · last
// date, plus a Message shortcut. Data via lib/studentsActions.
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchStudents, type StudentsData } from '@/lib/studentsActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function TeacherStudents() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentsData | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchStudents(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const list = data?.students ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  }, [data, query]);

  if (loading || !data) return <Screen scroll={false}><Loading label="Loading students…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
      <Text style={styles.h1}>Students</Text>
      <Text style={styles.sub}>Everyone you teach, across trials, live classes and courses.</Text>

      <View style={styles.statRow}>
        <Stat3 tone="cream" value={data.totals.total} label="Total Students" />
        <Stat3 tone="green" value={data.totals.withActive} label="With Active Bookings" />
        <Stat3 tone="indigo" value={data.totals.trialsTaken} label="Trials Taken" />
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={C.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search students…" placeholderTextColor={C.muted} style={styles.searchInput} />
      </View>

      {filtered.length === 0 ? (
        <EmptyCard icon="people-outline" title={query ? 'No matches' : 'No students yet'} body={query ? 'Try a different name.' : 'Students who book you will appear here.'} />
      ) : (
        filtered.map((s) => (
          <View key={s.id} style={styles.card}>
            {s.avatar ? <Image source={{ uri: s.avatar }} style={styles.avatar} /> : <Initials name={s.name} size={48} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>
                {s.active} active · {s.courses} course{s.courses !== 1 ? 's' : ''}{s.trials > 0 ? ` · ${s.trials} trial${s.trials !== 1 ? 's' : ''}` : ''}
              </Text>
              <Text style={styles.last}>last: {fmt(s.lastDate)}</Text>
            </View>
            <Pressable onPress={() => router.push('/teacher/messages')}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.msgBtn}>
                <Text style={styles.msgText}>Message</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ))
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

const TONE: Record<string, string> = { cream: '#F1ECE0', green: 'rgba(22,101,52,0.08)', indigo: 'rgba(79,70,229,0.08)' };
function Stat3({ tone, value, label }: { tone: keyof typeof TONE; value: number; label: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: TONE[tone] }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },

  statRow: { flexDirection: 'row', gap: SPACE.sm },
  stat: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, paddingHorizontal: 8, alignItems: 'center', ...SHADOW.card },
  statValue: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink },
  statLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 3, textAlign: 'center' },

  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, paddingHorizontal: 14, paddingVertical: 11, marginTop: SPACE.md, marginBottom: SPACE.sm },
  searchInput: { flex: 1, fontFamily: FONT.body, fontSize: 14, color: C.ink, padding: 0 },

  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginTop: SPACE.sm, ...SHADOW.card },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  last: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 1 },
  msgBtn: { borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10 },
  msgText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
});
