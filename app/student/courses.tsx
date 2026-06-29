// app/student/courses.tsx — student Courses (same design as teacher Courses, but a
// learner view): Enrolled/In-Progress/Completed stats, 2×2 type tabs + Completed,
// and watch-progress cards. Mirrors the web student courses page.
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, FilterChips } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchStudentCourses, type StudentCourse, type CourseType, type StudentCoursesData } from '@/lib/studentCoursesActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

type Tab = CourseType | 'completed';
const TYPE_META: Record<CourseType, { label: string; icon: keyof typeof Ionicons.glyphMap; banner: keyof typeof Ionicons.glyphMap; badge: string | null; cta: string }> = {
  trial: { label: 'Trial Classes', icon: 'reader-outline', banner: 'book-outline', badge: 'TRIAL', cta: 'Open Trial' },
  recorded: { label: 'Recorded Courses', icon: 'book-outline', banner: 'book-outline', badge: null, cta: 'Start' },
  live: { label: 'Live Classes', icon: 'videocam-outline', banner: 'videocam-outline', badge: 'LIVE CLASS', cta: 'Open Class' },
  program: { label: 'Long Courses', icon: 'shield-outline', banner: 'book-outline', badge: null, cta: 'Continue' },
};
const COMPLETED_FILTERS = [['all', 'All'], ['trial', 'Trial'], ['recorded', 'Recorded'], ['live', 'Live'], ['program', 'Long']] as const;

export default function StudentCourses() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentCoursesData>({ trial: [], recorded: [], live: [], program: [], completed: [], enrolled: 0, inProgress: 0 });
  const [tab, setTab] = useState<Tab>('trial');
  const [cFilter, setCFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchStudentCourses(session.user.id)); setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completedShown = useMemo(() => (cFilter === 'all' ? data.completed : data.completed.filter((c) => c.type === cFilter)), [data.completed, cFilter]);
  if (loading) return <Screen scroll={false}><Loading label="Loading courses…" /></Screen>;

  const open = (c: StudentCourse) => router.push(`/student/course/${c.id}` as any);
  const list = tab === 'completed' ? completedShown : data[tab];

  return (
    <Screen>
      <Text style={styles.eyebrow}>STUDENT PORTAL</Text>
      <Text style={styles.h1}>Courses</Text>
      <Text style={styles.sub}>Watch, track and complete your Quran learning courses.</Text>

      <View style={styles.statRow}>
        <Stat3 tone="gold" value={data.enrolled} label="Enrolled" icon="book-outline" />
        <Stat3 tone="indigo" value={data.inProgress} label="In Progress" icon="play-outline" />
        <Stat3 tone="green" value={data.completed.length} label="Completed" icon="trophy-outline" />
      </View>

      <View style={styles.tabGrid}>
        {(Object.keys(TYPE_META) as CourseType[]).map((k) => (
          <TabTile key={k} active={tab === k} label={TYPE_META[k].label} icon={TYPE_META[k].icon} count={data[k].length} onPress={() => setTab(k)} />
        ))}
      </View>
      <TabTile wide active={tab === 'completed'} label="Completed" icon="ribbon-outline" count={data.completed.length} onPress={() => setTab('completed')} />

      {tab === 'completed' ? (
        <View style={{ marginTop: SPACE.md }}>
          <FilterChips align="center" value={cFilter} onChange={setCFilter}
            options={COMPLETED_FILTERS.map(([k, lbl]) => ({ key: k, label: lbl, count: k === 'all' ? data.completed.length : data.completed.filter((c) => c.type === k).length }))} />
        </View>
      ) : null}

      <View style={{ marginTop: SPACE.md }}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={30} color={C.gold} />
            <Text style={styles.emptyText}>
              {tab === 'completed' ? 'No completed courses yet.' : tab === 'trial' ? "You haven't booked any trials yet." : tab === 'recorded' ? "You're not enrolled in any recorded courses yet." : tab === 'live' ? "You're not enrolled in any live classes yet." : "You're not enrolled in any long programs yet."}
            </Text>
          </View>
        ) : list.map((c) => <CourseCard key={c.enrollmentId} c={c} onOpen={() => open(c)} completed={tab === 'completed'} />)}
      </View>
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function CourseCard({ c, onOpen, completed }: { c: StudentCourse; onOpen: () => void; completed: boolean }) {
  const meta = TYPE_META[c.type];
  const showProgress = c.type === 'recorded' || c.type === 'program';
  return (
    <View style={styles.card}>
      <View style={styles.banner}>
        {c.thumbnail ? <Image source={{ uri: c.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
          <LinearGradient colors={['#16291E', '#166534']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        {!c.thumbnail ? <Ionicons name={meta.banner} size={40} color="rgba(255,255,255,0.5)" /> : null}
        {meta.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{meta.badge}</Text></View> : null}
        {completed ? <View style={[styles.badge, { backgroundColor: 'rgba(22,163,74,0.9)' }]}><Text style={[styles.badgeText, { color: C.white }]}>COMPLETED</Text></View> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{c.title}</Text>
        <Text style={styles.meta}>{[c.category, showProgress ? `${c.lessons} videos` : null, c.level].filter(Boolean).join(' · ')}</Text>
        {showProgress ? (
          <>
            <View style={styles.progRow}>
              <Text style={styles.progText}>{c.done} of {c.lessons} watched</Text>
              <Text style={styles.progPct}>{c.progress}%</Text>
            </View>
            <View style={styles.progTrack}><View style={[styles.progFill, { width: `${c.progress}%` }]} /></View>
          </>
        ) : null}
        <Pressable onPress={onOpen} style={{ marginTop: SPACE.md }}>
          {completed ? (
            <View style={styles.openOutline}><Text style={styles.openOutlineText}>View Certificate</Text></View>
          ) : c.type === 'recorded' || c.type === 'program' ? (
            <View style={styles.openSolid}><Text style={styles.openSolidText}>{meta.cta} →</Text></View>
          ) : (
            <View style={styles.openSolid}><Text style={styles.openSolidText}>{meta.cta} →</Text></View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const TONE: Record<string, { bg: string; ic: string }> = {
  gold: { bg: 'rgba(201,162,39,0.08)', ic: C.gold }, indigo: { bg: 'rgba(79,70,229,0.08)', ic: C.indigo }, green: { bg: 'rgba(22,163,74,0.08)', ic: C.success },
};
function Stat3({ tone, value, label, icon }: { tone: keyof typeof TONE; value: number; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const t = TONE[tone];
  return (
    <View style={[styles.stat, { backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={18} color={t.ic} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabTile({ active, label, icon, count, onPress, wide }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; count: number; onPress: () => void; wide?: boolean }) {
  const inner = (
    <>
      <Ionicons name={icon} size={16} color={active ? C.white : C.accent2} />
      <Text style={[styles.tabLabel, active && { color: C.white }]} numberOfLines={2}>{label}</Text>
      <View style={[styles.tabCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}><Text style={[styles.tabCountText, active && { color: C.white }]}>{count}</Text></View>
    </>
  );
  if (active) {
    return (
      <Pressable onPress={onPress} style={[styles.tabTile, wide && styles.tabWide]}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabContent}>{inner}</LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={[styles.tabTile, styles.tabIdle, wide && styles.tabWide]}>
      <View style={styles.tabContent}>{inner}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md },
  stat: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink },
  statLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tabTile: { width: '48.5%', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACE.sm, borderWidth: 1, borderColor: 'transparent' },
  tabWide: { width: '100%' },
  tabIdle: { backgroundColor: C.white, borderColor: C.borderSoft },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 12, minHeight: 64 },
  tabLabel: { flex: 1, fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2, textAlign: 'center' },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.accent2 },
  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: SPACE.lg },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden', marginBottom: SPACE.md, ...SHADOW.card },
  banner: { height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: C.forestDeep },
  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(201,162,39,0.9)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: '#3a2c05', letterSpacing: 0.5 },
  body: { padding: SPACE.md },
  title: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink },
  meta: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.gold, marginTop: 4 },
  progRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.md },
  progText: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  progPct: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold },
  progTrack: { height: 6, borderRadius: 3, backgroundColor: C.cream, marginTop: 6, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 3, backgroundColor: C.forest },
  openSolid: { backgroundColor: C.forest, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  openSolidText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  openOutline: { borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  openOutlineText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.accent2 },
});
