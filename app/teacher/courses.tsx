// app/teacher/courses.tsx — teacher Course Studio: stats, type tabs, course cards.
// Create/edit/videos open the web wizard for now (detail tables + thumbnail upload).
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { StatGrid, StatTile, EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchCourseStudio, setCourseActive, deleteCourse, type CourseStudio, type StudioCourse } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const WEB = 'https://www.quranmentorglobal.com/platform/teacher/course-studio';

type TabKey = 'trial' | 'recorded' | 'live' | 'program' | 'completed';
const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: 'trial', label: 'Trial Classes', icon: 'radio-button-on-outline', desc: 'Short intro sessions for new students' },
  { key: 'recorded', label: 'Recorded Courses', icon: 'book-outline', desc: 'Self-paced video lesson libraries' },
  { key: 'live', label: 'Live Classes', icon: 'videocam-outline', desc: 'Scheduled live sessions' },
  { key: 'program', label: 'Long Courses', icon: 'trending-up-outline', desc: 'Structured multi-month programs' },
  { key: 'completed', label: 'Completed', icon: 'ribbon-outline', desc: 'Courses with students who have completed' },
];

export default function TeacherCourses() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CourseStudio | null>(null);
  const [tab, setTab] = useState<TabKey>('trial');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchCourseStudio(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const lists = useMemo(() => {
    const cs = data?.courses ?? [];
    return {
      trial: cs.filter((c) => c.product_type === 'trial'),
      recorded: cs.filter((c) => c.product_type === 'recorded'),
      live: cs.filter((c) => c.product_type === 'live'),
      program: cs.filter((c) => c.product_type === 'program'),
      completed: cs.filter((c) => c.completedStudents > 0),
    };
  }, [data]);

  async function toggle(c: StudioCourse) {
    setBusy(c.id);
    const ok = await setCourseActive(c.id, !c.is_active);
    setBusy(null);
    if (ok) setData((d) => (d ? { ...d, courses: d.courses.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)) } : d));
    else Alert.alert('Could not update the course.');
  }
  function confirmDelete(c: StudioCourse) {
    Alert.alert('Delete course?', `"${c.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusy(c.id);
        const ok = await deleteCourse(c.id);
        setBusy(null);
        if (ok) setData((d) => (d ? { ...d, courses: d.courses.filter((x) => x.id !== c.id) } : d));
        else Alert.alert('Could not delete the course.');
      } },
    ]);
  }

  if (loading || !data) return <Screen scroll={false}><Loading label="Loading courses…" /></Screen>;

  const active = TABS.find((t) => t.key === tab)!;
  const list = lists[tab];

  return (
    <Screen>
      <Text style={styles.eyebrow}>COURSE STUDIO</Text>
      <View style={styles.titleRow}>
        <Text style={styles.h1}>Courses</Text>
        <Pressable onPress={() => Linking.openURL(`${WEB}/new`)}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
            <Ionicons name="add" size={18} color={C.ink} /><Text style={styles.newText}>New Course</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <Text style={styles.sub}>Manage your trial, recorded, live and long courses.</Text>

      <StatGrid>
        <StatTile icon="book-outline" tone="gold" value={data.stats.total} label="Total Courses" />
        <StatTile icon="checkmark-circle-outline" tone="green" value={data.stats.active} label="Active Courses" />
        <StatTile icon="people-outline" tone="cream" value={data.stats.totalEnrollments} label="Total Students" />
        <StatTile icon="videocam-outline" tone="indigo" value={data.stats.totalLessons} label="Total Lessons" />
      </StatGrid>

      {/* Type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACE.md }} contentContainerStyle={{ gap: 8, paddingRight: SPACE.md }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          const count = lists[t.key].length;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)}>
              {on ? (
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tab}>
                  <Ionicons name={t.icon} size={14} color="#fff" /><Text style={styles.tabOnText}>{t.label}</Text>
                  <View style={styles.tabCountOn}><Text style={styles.tabCountOnText}>{count}</Text></View>
                </LinearGradient>
              ) : (
                <View style={[styles.tab, styles.tabOff]}>
                  <Ionicons name={t.icon} size={14} color={C.muted} /><Text style={styles.tabOffText}>{t.label}</Text>
                  <View style={styles.tabCountOff}><Text style={styles.tabCountOffText}>{count}</Text></View>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.descRow}><Ionicons name={active.icon} size={14} color={C.gold} /><Text style={styles.descText}>{active.desc}</Text></View>

      {list.length === 0 ? (
        <EmptyCard icon={active.icon} title={`No ${active.label.toLowerCase()} yet`} body="Create a course to start teaching." ctaLabel="New Course" onCta={() => Linking.openURL(`${WEB}/new`)} />
      ) : (
        list.map((c) => <CourseCard key={c.id} c={c} busy={busy === c.id} onToggle={() => toggle(c)} onDelete={() => confirmDelete(c)} />)
      )}
    </Screen>
  );
}

function CourseCard({ c, busy, onToggle, onDelete }: { c: StudioCourse; busy: boolean; onToggle: () => void; onDelete: () => void }) {
  const icon: keyof typeof Ionicons.glyphMap = c.product_type === 'trial' ? 'radio-button-on-outline'
    : c.product_type === 'recorded' ? 'book-outline' : c.product_type === 'live' ? 'videocam-outline' : 'trending-up-outline';
  const isVideoType = c.product_type === 'recorded' || c.product_type === 'live';
  return (
    <View style={[styles.card, !c.is_active && { opacity: 0.7 }]}>
      <LinearGradient colors={['#0F3D27', '#3F5A1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardHead}>
        <View style={[styles.statusPill, { backgroundColor: c.is_active ? 'rgba(22,163,74,0.9)' : 'rgba(0,0,0,0.45)' }]}>
          <Text style={styles.statusText}>{c.is_active ? '● Live' : '○ Inactive'}</Text>
        </View>
        {c.is_free ? <View style={styles.freePill}><Text style={styles.freeText}>FREE</Text></View> : null}
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.9)" />
      </LinearGradient>

      <View style={{ padding: SPACE.md }}>
        <Text style={styles.cardTitle}>{c.title}</Text>
        <Text style={styles.cardMeta}>{[c.category || 'Course', 'All levels', `${c.duration_mins ?? 0} min`].join(' · ')}</Text>
        <Text style={styles.cardPrice}>{c.is_free ? 'Free' : `$${c.price_usd ?? 0}`}</Text>

        <View style={styles.miniRow}>
          <View style={styles.miniStat}><Text style={styles.miniNum}>{c.enrollments}</Text><Text style={styles.miniLbl}>Students</Text></View>
          <View style={styles.miniStat}><Text style={styles.miniNum}>{c.lessonCount}</Text><Text style={styles.miniLbl}>Lessons</Text></View>
          <View style={styles.miniStat}>
            <Text style={styles.miniNum}>{isVideoType ? `${c.avgProgress}%` : c.completedStudents}</Text>
            <Text style={styles.miniLbl}>{isVideoType ? 'Progress' : 'Done'}</Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <Pressable style={[styles.actBtn, styles.editBtn]} onPress={() => Linking.openURL(`${WEB}/${c.id}/edit`)}><Text style={styles.editText}>Edit</Text></Pressable>
          {isVideoType ? (
            <Pressable style={[styles.actBtn, styles.videosBtn]} onPress={() => Linking.openURL(`${WEB}/${c.id}/recordings`)}>
              <Text style={styles.videosText}>{c.product_type === 'live' ? 'Recordings' : 'Videos'}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.btnRow}>
          <Pressable style={[styles.actBtn, c.is_active ? styles.deactBtn : styles.actvBtn]} disabled={busy} onPress={onToggle}>
            <Text style={c.is_active ? styles.deactText : styles.actvText}>{busy ? '…' : c.is_active ? 'Deactivate' : '✓ Activate'}</Text>
          </Pressable>
          <Pressable style={[styles.actBtn, styles.delBtn]} disabled={busy} onPress={onDelete}><Text style={styles.delText}>Delete</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  h1: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 11 },
  newText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  tabOff: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  tabOnText: { fontFamily: FONT.bodyBold, fontSize: 13, color: '#fff' },
  tabOffText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },
  tabCountOn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
  tabCountOnText: { fontFamily: FONT.bodyBold, fontSize: 11, color: '#fff' },
  tabCountOff: { backgroundColor: C.cream, borderRadius: 999, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
  tabCountOffText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted },
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: SPACE.md, marginBottom: SPACE.sm },
  descText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.gold },

  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, marginBottom: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  cardHead: { height: 90, alignItems: 'center', justifyContent: 'center' },
  statusPill: { position: 'absolute', top: 10, left: 10, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontFamily: FONT.bodyBold, fontSize: 10, color: '#fff' },
  freePill: { position: 'absolute', top: 10, right: 10, backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  freeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.ink },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink },
  cardMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  cardPrice: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.gold, marginTop: 8 },
  miniRow: { flexDirection: 'row', gap: 8, marginTop: SPACE.md },
  miniStat: { flex: 1, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  miniNum: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  miniLbl: { fontFamily: FONT.body, fontSize: 10, color: C.muted, marginTop: 1 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: SPACE.sm },
  actBtn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center', borderWidth: 1 },
  editBtn: { backgroundColor: C.white, borderColor: C.gold },
  editText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2 },
  videosBtn: { backgroundColor: 'rgba(79,70,229,0.06)', borderColor: 'rgba(79,70,229,0.2)' },
  videosText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.indigo },
  deactBtn: { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.06)' },
  deactText: { fontFamily: FONT.bodySemi, fontSize: 13, color: '#6B7280' },
  actvBtn: { backgroundColor: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)' },
  actvText: { fontFamily: FONT.bodyBold, fontSize: 13, color: '#16A34A' },
  delBtn: { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)' },
  delText: { fontFamily: FONT.bodyBold, fontSize: 13, color: '#EF4444' },
});
