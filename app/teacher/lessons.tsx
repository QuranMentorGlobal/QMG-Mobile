// app/teacher/lessons.tsx — teacher lessons (Upcoming / Past) with student + Join.
import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Loading, PageTitle, Segmented, StatusBadge } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherLessons, type TeacherLesson } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function TeacherLessons() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [tab, setTab] = useState('Upcoming');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLessons(await fetchTeacherLessons(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: TeacherLesson[] = []; const pa: TeacherLesson[] = [];
    for (const l of lessons) {
      const isFuture = l.scheduled_at ? new Date(l.scheduled_at).getTime() >= now : false;
      if (isFuture && ['scheduled', 'live'].includes((l.status ?? '').toLowerCase())) up.push(l); else pa.push(l);
    }
    up.sort((a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime());
    return { upcoming: up, past: pa };
  }, [lessons]);

  if (loading) return <Screen scroll={false}><Loading label="Loading lessons…" /></Screen>;
  const list = tab === 'Upcoming' ? upcoming : past;

  return (
    <Screen>
      <PageTitle title="Lessons" subtitle="Your teaching schedule" />
      <Segmented options={['Upcoming', 'Past']} value={tab} onChange={setTab} />
      {list.length === 0 ? (
        <EmptyCard icon="book-outline" title={tab === 'Upcoming' ? 'No upcoming lessons' : 'No past lessons'} body={tab === 'Upcoming' ? 'Confirmed bookings generate lessons here.' : 'Completed lessons will appear here.'} />
      ) : (
        list.map((l) => <Row key={l.id} l={l} joinable={tab === 'Upcoming'} />)
      )}
    </Screen>
  );
}

function Row({ l, joinable }: { l: TeacherLesson; joinable: boolean }) {
  const d = l.scheduled_at ? new Date(l.scheduled_at) : null;
  const wk = d ? d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase() : '—';
  const day = d ? d.getDate() : '–';
  const mon = d ? d.toLocaleDateString(undefined, { month: 'short' }) : '';
  const time = d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  const canJoin = joinable && !!l.daily_room_url;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.chip}>
          <Text style={styles.chipWk}>{wk}</Text><Text style={styles.chipDay}>{day}</Text><Text style={styles.chipMon}>{mon}</Text>
        </View>
        {l.studentAvatar ? <Image source={{ uri: l.studentAvatar }} style={styles.avatar} /> : <Initials name={l.studentName} size={44} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{l.studentName}</Text>
          <Text style={styles.meta}>{time} · {l.duration_mins ?? 30} min</Text>
        </View>
        <StatusBadge status={l.status} />
      </View>
      {canJoin ? (
        <Pressable onPress={() => Linking.openURL(l.daily_room_url!)} style={{ marginTop: SPACE.md }}>
          <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.join}>
            <Text style={styles.joinText}>Start Lesson</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  chip: { width: 54, borderRadius: 14, backgroundColor: C.tintGreen, alignItems: 'center', paddingVertical: 8 },
  chipWk: { fontFamily: FONT.bodySemi, fontSize: 10, color: C.forest },
  chipDay: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  chipMon: { fontFamily: FONT.body, fontSize: 10, color: C.muted },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  title: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  join: { borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  joinText: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 14 },
});
