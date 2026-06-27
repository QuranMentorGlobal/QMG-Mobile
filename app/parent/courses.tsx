// app/parent/courses.tsx — Parent Courses. Every course the children are enrolled
// in, across Trial / Recorded / Live / Long / Completed, scoped by the shared
// ChildSwitcher (All-Children or one child). Each card carries a child badge.
// Mirrors the web parent courses page (2/2 + full-width Completed tabs, sub-filters).
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, FilterChips } from '@/components/ui';
import { EmptyCard } from '@/components/dashboard';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { useAuth } from '@/lib/auth';
import { useParentChild } from '@/lib/parentChild';
import { fetchParentCourses, type ParentCourse, type ParentCourseBucket } from '@/lib/parentActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const TAB_META: Record<ParentCourseBucket, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  trial: { label: 'Trial Classes', icon: 'reader-outline' },
  recorded: { label: 'Recorded Courses', icon: 'book-outline' },
  live: { label: 'Live Classes', icon: 'videocam-outline' },
  long: { label: 'Long Courses', icon: 'shield-outline' },
  completed: { label: 'Completed', icon: 'ribbon-outline' },
};
const COMPLETED_FILTERS = [
  ['all', 'All'], ['trial', 'Trial'], ['recorded', 'Recorded'], ['live', 'Live'], ['long', 'Long'],
] as const;

export default function ParentCourses() {
  const { session } = useAuth();
  const router = useRouter();
  const { children, effectiveChildIds, isAll } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ParentCourse[]>([]);
  const [tab, setTab] = useState<ParentCourseBucket>('trial');
  const [cFilter, setCFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setRows(await fetchParentCourses(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const scoped = useMemo(
    () => (isAll ? rows : rows.filter((r) => effectiveChildIds.includes(r.childId))),
    [rows, effectiveChildIds, isAll]
  );
  const countFor = (t: ParentCourseBucket) => scoped.filter((r) => r.bucket === t).length;
  const inTab = scoped.filter((r) => r.bucket === tab);
  const shown = tab === 'completed'
    ? (cFilter === 'all' ? inTab : inTab.filter((r) => (cFilter === 'long' ? r.ctype === 'program' : r.ctype === cFilter)))
    : inTab;

  if (loading) return <Screen scroll={false}><Loading label="Loading courses…" /></Screen>;

  const buckets: ParentCourseBucket[] = ['trial', 'recorded', 'live', 'long'];

  return (
    <Screen>
      <ChildSwitcher />
      <Text style={styles.h1}>Courses</Text>
      <Text style={styles.sub}>Every course your children are enrolled in. Select a child to focus.</Text>

      <View style={styles.tabGrid}>
        {buckets.map((k) => (
          <TabTile key={k} active={tab === k} label={TAB_META[k].label} icon={TAB_META[k].icon} count={countFor(k)} onPress={() => setTab(k)} />
        ))}
      </View>
      <TabTile wide active={tab === 'completed'} label="Completed" icon={TAB_META.completed.icon} count={countFor('completed')} onPress={() => setTab('completed')} />

      {tab === 'completed' ? (
        <View style={{ marginTop: SPACE.md }}>
          <FilterChips
            align="center"
            value={cFilter}
            onChange={setCFilter}
            options={COMPLETED_FILTERS.map(([k, lbl]) => ({
              key: k,
              label: lbl,
              count: k === 'all' ? inTab.length : inTab.filter((r) => (k === 'long' ? r.ctype === 'program' : r.ctype === k)).length,
            }))}
          />
        </View>
      ) : null}

      <View style={{ marginTop: SPACE.md }}>
        {children.length === 0 ? (
          <EmptyCard icon="people-outline" title="No children yet" body="Add a child to see their courses here." ctaLabel="+ Add Child" onCta={() => router.push('/parent/children')} />
        ) : shown.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={30} color={C.gold} />
            <Text style={styles.emptyText}>No courses match this filter yet.</Text>
          </View>
        ) : (
          shown.map((c) => <CourseCard key={`${c.id}-${c.childId}`} c={c} />)
        )}
      </View>
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function CourseCard({ c }: { c: ParentCourse }) {
  const isSession = c.bucket === 'trial' || c.bucket === 'live';
  return (
    <View style={styles.card}>
      <View style={styles.banner}>
        {c.thumbnail ? (
          <Image source={{ uri: c.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#111111', '#166534']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        {!c.thumbnail ? <Ionicons name="book-outline" size={36} color="rgba(255,255,255,0.6)" /> : null}
        <View style={styles.childBadge}><Text style={styles.childBadgeText}>{c.childName}</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{c.title}</Text>
        {c.category ? <Text style={styles.cat}>{c.category}</Text> : null}
        {!isSession ? (
          <View style={{ marginTop: SPACE.sm, marginBottom: 2 }}>
            <View style={styles.progRow}>
              <Text style={styles.progText}>Progress</Text>
              <Text style={[styles.progPct, { color: c.progress === 100 ? C.success : C.forest }]}>{c.progress}%</Text>
            </View>
            <View style={styles.progTrack}><View style={[styles.progFill, { width: `${c.progress}%`, backgroundColor: c.progress === 100 ? C.success : C.forest }]} /></View>
          </View>
        ) : null}
        <View style={styles.viewBtn}><Text style={styles.viewText}>View →</Text></View>
      </View>
    </View>
  );
}

function TabTile({ active, label, icon, count, onPress, wide }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; count: number; onPress: () => void; wide?: boolean }) {
  const inner = (
    <>
      <Ionicons name={icon} size={16} color={active ? C.white : C.accent2} />
      <Text style={[styles.tabLabel, active && { color: C.white }]} numberOfLines={2}>{label}</Text>
      <View style={[styles.tabCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <Text style={[styles.tabCountText, active && { color: C.white }]}>{count}</Text>
      </View>
    </>
  );
  if (active) {
    return (
      <Pressable onPress={onPress} style={[styles.tabTile, wide && styles.tabWide]}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabFill}>{inner}</LinearGradient>
      </Pressable>
    );
  }
  return <Pressable onPress={onPress} style={[styles.tabTile, styles.tabIdle, wide && styles.tabWide]}>{inner}</Pressable>;
}

const styles = StyleSheet.create({
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4, marginBottom: SPACE.md },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACE.sm },
  tabTile: { width: '48.5%', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACE.sm },
  tabWide: { width: '100%' },
  tabIdle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, paddingVertical: 14, paddingHorizontal: 10 },
  tabFill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, paddingHorizontal: 10 },
  tabLabel: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2, flexShrink: 1, textAlign: 'center' },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.accent2 },
  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: SPACE.lg },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden', marginBottom: SPACE.md, ...SHADOW.card },
  banner: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: C.forestDeep },
  childBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(22,101,52,0.85)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  childBadgeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.white },
  body: { padding: SPACE.md },
  title: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  cat: { fontFamily: FONT.bodySemi, fontSize: 12, color: 'rgba(22,101,52,0.6)', marginTop: 3 },
  progRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progText: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  progPct: { fontFamily: FONT.bodyBold, fontSize: 12 },
  progTrack: { height: 7, borderRadius: 4, backgroundColor: '#EFEAD9', overflow: 'hidden' },
  progFill: { height: 7, borderRadius: 4 },
  viewBtn: { marginTop: SPACE.md, backgroundColor: C.forest, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  viewText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
});
