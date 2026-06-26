// app/teacher/courses.tsx — teacher Course Studio.
// Stat cards → 4 course-type tabs (2×2) + a big full-width Completed tab →
// course cards with Edit · Videos · Deactivate/Activate · Delete · Mark complete.
// Create/edit open the in-app wizard; "Videos" opens recordings on the web for
// now (in-app recordings management ships in the next batch).
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { StatGrid, StatTile } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import {
  fetchStudio, setCourseActive, deleteCourse, markCourseComplete,
  type CourseStudio, type StudioCourse,
} from '@/lib/coursesActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const WEB_RECORDINGS = 'https://www.muddarris.com/platform/teacher/course-studio';

type TypeKey = 'trial' | 'recorded' | 'live' | 'program';
type TabKey = TypeKey | 'completed';
type CompletedFilter = 'all' | TypeKey;

const TYPE_TABS: { key: TypeKey; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: 'trial', label: 'Trial Classes', icon: 'radio-button-on-outline', desc: 'Short intro sessions for new students' },
  { key: 'recorded', label: 'Recorded Courses', icon: 'book-outline', desc: 'Self-paced video lesson libraries' },
  { key: 'live', label: 'Live Classes', icon: 'videocam-outline', desc: 'Scheduled live sessions with subscriptions' },
  { key: 'program', label: 'Long Courses', icon: 'shield-checkmark-outline', desc: 'Structured multi-month programs' },
];
const COMPLETED_FILTERS: { key: CompletedFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'trial', label: 'Trial' }, { key: 'recorded', label: 'Recorded' },
  { key: 'live', label: 'Live' }, { key: 'program', label: 'Long' },
];

export default function TeacherCourses() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CourseStudio | null>(null);
  const [tab, setTab] = useState<TabKey>('trial');
  const [cFilter, setCFilter] = useState<CompletedFilter>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchStudio(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isClosed = (c: StudioCourse) => c.status === 'completed';
  const open = useMemo(() => {
    const cs = data?.courses ?? [];
    return {
      trial: cs.filter((c) => c.product_type === 'trial' && !isClosed(c)),
      recorded: cs.filter((c) => c.product_type === 'recorded' && !isClosed(c)),
      live: cs.filter((c) => c.product_type === 'live' && !isClosed(c)),
      program: cs.filter((c) => c.product_type === 'program' && !isClosed(c)),
    };
  }, [data]);
  const completedList = useMemo(() => (data?.courses ?? []).filter(isClosed), [data]);
  const completedCount = (k: CompletedFilter) =>
    k === 'all' ? completedList.length : completedList.filter((c) => c.product_type === k).length;

  // mutations (optimistic)
  const patch = (id: string, fn: (c: StudioCourse) => StudioCourse) =>
    setData((d) => (d ? { ...d, courses: d.courses.map((x) => (x.id === id ? fn(x) : x)) } : d));

  async function toggle(c: StudioCourse) {
    setBusy(c.id);
    const ok = await setCourseActive(c.id, !c.is_active);
    setBusy(null);
    if (ok) patch(c.id, (x) => ({ ...x, is_active: !x.is_active }));
    else Alert.alert('Could not update the course.');
  }
  async function complete(c: StudioCourse) {
    const closing = c.status !== 'completed';
    setBusy(c.id);
    const ok = await markCourseComplete(c.id, closing);
    setBusy(null);
    if (ok) patch(c.id, (x) => ({ ...x, status: closing ? 'completed' : 'active' }));
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

  const newCourse = () => router.push(('/teacher/course-new' + (tab !== 'completed' ? `?type=${tab}` : '')) as any);
  const displayList = tab === 'completed'
    ? (cFilter === 'all' ? completedList : completedList.filter((c) => c.product_type === cFilter))
    : open[tab];
  const activeDesc = tab === 'completed' ? 'Courses you have closed / marked complete' : TYPE_TABS.find((t) => t.key === tab)!.desc;
  const activeIcon: keyof typeof Ionicons.glyphMap = tab === 'completed' ? 'ribbon-outline' : TYPE_TABS.find((t) => t.key === tab)!.icon;

  return (
    <Screen>
      <Text style={styles.eyebrow}>COURSE STUDIO</Text>
      <Text style={styles.h1}>Courses</Text>
      <Text style={styles.sub}>Manage your trial, recorded, live and long courses.</Text>

      <Pressable onPress={newCourse} style={{ marginBottom: SPACE.md }}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
          <Ionicons name="add" size={20} color={C.white} /><Text style={styles.newText}>New Course</Text>
        </LinearGradient>
      </Pressable>

      {/* Stat cards (kept) */}
      <StatGrid>
        <StatTile icon="book-outline" tone="gold" value={data.stats.total} label="Total Courses" />
        <StatTile icon="checkmark-circle-outline" tone="green" value={data.stats.active} label="Active Courses" />
        <StatTile icon="people-outline" tone="mint" value={data.stats.totalEnrollments} label="Total Students" />
        <StatTile icon="videocam-outline" tone="indigo" value={data.stats.totalLessons} label="Total Lessons" />
      </StatGrid>

      {/* 4 type tabs (2×2) */}
      <View style={styles.tabGrid}>
        {TYPE_TABS.map((t) => (
          <TypeTab key={t.key} label={t.label} icon={t.icon} count={open[t.key].length} on={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>
      {/* Big Completed tab */}
      <CompletedTab count={completedList.length} on={tab === 'completed'} onPress={() => setTab('completed')} />

      {/* Completed sub-filters */}
      {tab === 'completed' && (
        <View style={styles.filterRow}>
          {COMPLETED_FILTERS.map((ff) => {
            const on = cFilter === ff.key;
            return (
              <Pressable key={ff.key} onPress={() => setCFilter(ff.key)} style={[styles.filterPill, on && styles.filterPillOn]}>
                <Text style={[styles.filterText, on && { color: C.white }]}>{ff.label} ({completedCount(ff.key)})</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.descRow}><Ionicons name={activeIcon} size={14} color={C.gold} /><Text style={styles.descText}>{activeDesc}</Text></View>

      {displayList.length === 0 ? (
        tab === 'completed' ? (
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={34} color={C.goldPale} />
            <Text style={styles.emptyTitle}>No completed courses yet</Text>
            <Text style={styles.emptyBody}>Courses appear here once a student finishes them.</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name={activeIcon} size={34} color={C.goldPale} />
            <Text style={styles.emptyTitle}>No {TYPE_TABS.find((t) => t.key === tab)!.label.toLowerCase()} yet</Text>
            <Text style={styles.emptyBody}>{activeDesc}. Create your first one to start receiving students.</Text>
            <Pressable onPress={newCourse} style={{ marginTop: SPACE.md }}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyCta}>
                <Text style={styles.newText}>+ Create {TYPE_TABS.find((t) => t.key === tab)!.label.replace(/s$/, '')}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )
      ) : (
        displayList.map((c) => (
          <CourseCard key={c.id} c={c} busy={busy === c.id}
            onEdit={() => router.push(`/teacher/course-edit/${c.id}` as any)}
            onVideos={() => Linking.openURL(`${WEB_RECORDINGS}/${c.id}/recordings`)}
            onToggle={() => toggle(c)} onDelete={() => confirmDelete(c)} onComplete={() => complete(c)} />
        ))
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function TypeTab({ label, icon, count, on, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; count: number; on: boolean; onPress: () => void }) {
  const inner = (
    <>
      <Ionicons name={icon} size={18} color={on ? C.white : C.gold} />
      <Text style={[styles.tabLabel, { color: on ? C.white : C.accent2 }]} numberOfLines={2}>{label}</Text>
      <View style={[styles.tabCount, { backgroundColor: on ? 'rgba(255,255,255,0.25)' : C.cream }]}>
        <Text style={[styles.tabCountText, { color: on ? C.white : C.muted }]}>{count}</Text>
      </View>
    </>
  );
  return (
    <Pressable onPress={onPress} style={styles.tabCell}>
      {on ? (
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tab}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.tab, styles.tabOff]}>{inner}</View>
      )}
    </Pressable>
  );
}

function CompletedTab({ count, on, onPress }: { count: number; on: boolean; onPress: () => void }) {
  const inner = (
    <>
      <Ionicons name="ribbon-outline" size={18} color={on ? C.white : C.gold} />
      <Text style={[styles.completedLabel, { color: on ? C.white : C.accent2 }]}>Completed</Text>
      <View style={[styles.tabCount, { backgroundColor: on ? 'rgba(255,255,255,0.25)' : C.cream }]}>
        <Text style={[styles.tabCountText, { color: on ? C.white : C.muted }]}>{count}</Text>
      </View>
    </>
  );
  return (
    <Pressable onPress={onPress} style={{ marginTop: SPACE.sm }}>
      {on ? (
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.tab, styles.completedTab]}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.tab, styles.completedTab, styles.tabOff]}>{inner}</View>
      )}
    </Pressable>
  );
}

function CourseCard({ c, busy, onEdit, onVideos, onToggle, onDelete, onComplete }: {
  c: StudioCourse; busy: boolean; onEdit: () => void; onVideos: () => void; onToggle: () => void; onDelete: () => void; onComplete: () => void;
}) {
  const icon: keyof typeof Ionicons.glyphMap = c.product_type === 'trial' ? 'radio-button-on-outline'
    : c.product_type === 'recorded' ? 'book-outline' : c.product_type === 'live' ? 'videocam-outline' : 'shield-checkmark-outline';
  const isVideoType = c.product_type === 'recorded' || c.product_type === 'live';
  const closed = c.status === 'completed';
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
          <Pressable style={[styles.actBtn, styles.editBtn]} onPress={onEdit}><Text style={styles.editText}>Edit</Text></Pressable>
          {isVideoType ? (
            <Pressable style={[styles.actBtn, styles.videosBtn]} onPress={onVideos}>
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
        <Pressable style={[styles.actBtn, styles.completeBtn]} disabled={busy} onPress={onComplete}>
          <Text style={styles.completeText}>{closed ? '↩ Reopen course' : '✓ Mark complete'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, textAlign: 'center', marginTop: 2 },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 15 },
  newText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.white },

  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  tabCell: { width: '47.8%', flexGrow: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 16, minHeight: 58 },
  tabOff: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, ...SHADOW.card },
  tabLabel: { flex: 1, fontFamily: FONT.bodyBold, fontSize: 14 },
  completedTab: { justifyContent: 'center' },
  completedLabel: { fontFamily: FONT.bodyBold, fontSize: 15 },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tabCountText: { fontFamily: FONT.bodyBold, fontSize: 12 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  filterPillOn: { backgroundColor: C.forest, borderColor: C.forest },
  filterText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.accent2 },

  descRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: SPACE.md, marginBottom: SPACE.sm },
  descText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.gold },

  empty: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.section, alignItems: 'center', ...SHADOW.card },
  emptyTitle: { fontFamily: FONT.displayBold, fontSize: 19, color: C.ink, marginTop: SPACE.md },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' },
  emptyCta: { borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 13 },

  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, marginBottom: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  cardHead: { height: 90, alignItems: 'center', justifyContent: 'center' },
  statusPill: { position: 'absolute', top: 10, left: 10, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.white },
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
  completeBtn: { marginTop: SPACE.sm, backgroundColor: 'rgba(22,101,52,0.06)', borderColor: 'rgba(22,101,52,0.18)' },
  completeText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
});
