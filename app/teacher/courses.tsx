// app/teacher/courses.tsx — teacher course catalogue with marketplace-style cards.
import { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle, Segmented } from '@/components/ui';
import { StatGrid, StatTile, EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherCourses, type TeacherCourse } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const TYPE_LABEL: Record<string, string> = { trial: 'Trial', live: 'Live', recorded: 'Recorded', program: 'Program' };

export default function TeacherCourses() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [tab, setTab] = useState('All');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setCourses(await fetchTeacherCourses(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => ({
    trial: courses.filter((c) => c.product_type === 'trial').length,
    live: courses.filter((c) => c.product_type === 'live').length,
    recorded: courses.filter((c) => c.product_type === 'recorded').length,
    enrolments: courses.reduce((s, c) => s + c.enrolments, 0),
  }), [courses]);

  const filtered = tab === 'All' ? courses : courses.filter((c) => (c.product_type ?? '') === tab.toLowerCase());

  if (loading) return <Screen scroll={false}><Loading label="Loading courses…" /></Screen>;

  return (
    <Screen>
      <PageTitle title="Courses" subtitle="Manage your catalogue" />
      <StatGrid>
        <StatTile icon="ellipse-outline" value={counts.trial} label="Trial Classes" tone="gold" />
        <StatTile icon="videocam-outline" value={counts.live} label="Live Courses" tone="indigo" />
        <StatTile icon="cloud-upload-outline" value={counts.recorded} label="Recorded" tone="green" />
        <StatTile icon="people-outline" value={counts.enrolments} label="Enrolments" tone="cream" />
      </StatGrid>

      <View style={{ height: SPACE.md }} />
      <Segmented options={['All', 'Trial', 'Live', 'Recorded']} value={tab} onChange={setTab} />

      {filtered.length === 0 ? (
        <EmptyCard icon="library-outline" title="No courses here" body="Create courses on the website's Course Studio — they'll appear here." />
      ) : (
        filtered.map((c) => <CourseCard key={c.id} c={c} />)
      )}
    </Screen>
  );
}

function CourseCard({ c }: { c: TeacherCourse }) {
  return (
    <View style={styles.card}>
      <View style={styles.thumbWrap}>
        {c.thumbnail_url ? (
          <Image source={{ uri: c.thumbnail_url }} style={styles.thumb} />
        ) : (
          <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumb}>
            <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
        )}
        <View style={styles.typeBadge}><Text style={styles.typeText}>{TYPE_LABEL[c.product_type ?? ''] ?? 'Course'}</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
        {c.category ? <Text style={styles.category}>{c.category}</Text> : null}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Ionicons name="people-outline" size={14} color={C.muted} />
            <Text style={styles.metaText}>{c.enrolments} enrolled</Text>
          </View>
          <Text style={styles.price}>{c.is_free ? 'Free' : `$${c.price_usd ?? 0}`}</Text>
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: c.is_active ? C.success : C.faint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, marginBottom: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  thumbWrap: { height: 120 },
  thumb: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(17,17,17,0.7)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { color: C.white, fontFamily: FONT.bodySemi, fontSize: 11 },
  body: { padding: SPACE.md },
  title: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  category: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACE.md },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  price: { fontFamily: FONT.displayBold, fontSize: 17, color: C.forest },
  statusDot: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.white },
});
