// app/teacher/courses.tsx — teacher Course Studio overview.
// Stat cards · 2×2 course-type tabs + full-width Completed · all filters on
// screen (wrapped, centered — no swipe) · rich course cards with the full
// lifecycle (Edit, Videos, Activate/Deactivate, Delete, Mark complete/Reopen).
// Create & Edit open in-app (CourseWizard / CourseEditor). Videos opens the web
// recordings page for now — native video management lands in the next batch.
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { formatMoneySync as money, useDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, FilterChips } from '@/components/ui';
import { StatGrid, StatTile } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import {
  fetchStudio, setCourseActive, deleteCourse, markCourseComplete,
  type CourseStudio, type StudioCourse,
} from '@/lib/coursesActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const WEB = 'https://www.muddarris.com/platform/teacher/course-studio';

type TabKey = 'trial' | 'recorded' | 'live' | 'program' | 'completed';
type CompletedFilter = 'all' | 'trial' | 'recorded' | 'live' | 'long';

const TYPE_TABS: { key: Exclude<TabKey, 'completed'>; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: 'trial', label: 'Trial Classes', icon: 'radio-button-on-outline', desc: 'Short intro sessions for new students' },
  { key: 'recorded', label: 'Recorded Courses', icon: 'book-outline', desc: 'Self-paced video lesson libraries' },
  { key: 'live', label: 'Live Classes', icon: 'videocam-outline', desc: 'Scheduled live sessions' },
  { key: 'program', label: 'Long Courses', icon: 'shield-checkmark-outline', desc: 'Structured multi-month programs' },
];

export default function TeacherCourses() {
  const { session } = useAuth();
  useDisplayCurrency(); // subscribe so prices re-render once the viewer's currency resolves
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CourseStudio | null>(null);
  const [tab, setTab] = useState<TabKey>('trial');
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchStudio(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isClosed = (c: StudioCourse) => c.status === 'completed';
  const lists = useMemo(() => {
    const cs = data?.courses ?? [];
    const open = (pt: string) => cs.filter((c) => c.product_type === pt && !isClosed(c));
    return {
      trial: open('trial'), recorded: open('recorded'), live: open('live'), program: open('program'),
      completed: cs.filter(isClosed),
    };
  }, [data]);

  const counts = {
    trial: lists.trial.length, recorded: lists.recorded.length, live: lists.live.length,
    program: lists.program.length, completed: lists.completed.length,
  };

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
  function confirmComplete(c: StudioCourse) {
    const closing = !isClosed(c);
    Alert.alert(
      closing ? 'Mark complete?' : 'Reopen course?',
      closing ? `"${c.title}" will move to the Completed tab.` : `"${c.title}" will move back to its type tab.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: closing ? 'Mark complete' : 'Reopen', onPress: async () => {
          setBusy(c.id);
          const ok = await markCourseComplete(c.id, closing);
          setBusy(null);
          if (ok) setData((d) => (d ? { ...d, courses: d.courses.map((x) => (x.id === c.id ? { ...x, status: closing ? 'completed' : 'active' } : x)) } : d));
          else Alert.alert('Could not update the course.');
        } },
      ]
    );
  }

  if (loading || !data) return <Screen scroll={false}><Loading label="Loading courses…" /></Screen>;

  const isCompleted = tab === 'completed';
  const completedList = completedFilter === 'all'
    ? lists.completed
    : lists.completed.filter((c) => (completedFilter === 'long' ? c.product_type === 'program' : c.product_type === completedFilter));
  const list: StudioCourse[] = isCompleted ? completedList : lists[tab];
  const activeDesc = TYPE_TABS.find((t) => t.key === tab)?.desc ?? 'Courses you have closed / marked complete';

  return (
    <Screen>
      <Text style={styles.eyebrow}>COURSE STUDIO</Text>
      <Text style={styles.h1}>Courses</Text>
      <Text style={styles.sub}>Manage your trial, recorded, live and long courses.</Text>

      <Pressable onPress={() => router.push('/teacher/course-new' as any)}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
          <Ionicons name="add" size={20} color={C.white} /><Text style={styles.newText}>New Course</Text>
        </LinearGradient>
      </Pressable>

      <StatGrid>
        <StatTile icon="book-outline" tone="gold" value={data.stats.total} label="Total Courses" />
        <StatTile icon="checkmark-circle-outline" tone="green" value={data.stats.active} label="Active Courses" />
        <StatTile icon="people-outline" tone="indigo" value={data.stats.totalEnrollments} label="Total Students" />
        <StatTile icon="videocam-outline" tone="indigo" value={data.stats.totalLessons} label="Total Lessons" />
      </StatGrid>

      {/* Type tabs: 2×2 grid + full-width Completed (all on screen, centered) */}
      <View style={styles.tabGrid}>
        {TYPE_TABS.map((t) => (
          <TypeTab key={t.key} label={t.label} icon={t.icon} count={counts[t.key]} on={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>
      <CompletedTab count={counts.completed} on={isCompleted} onPress={() => setTab('completed')} />

      <View style={styles.descRow}>
        <Ionicons name={isCompleted ? 'tv-outline' : (TYPE_TABS.find((t) => t.key === tab)!.icon)} size={14} color={C.gold} />
        <Text style={styles.descText}>{activeDesc}</Text>
      </View>

      {isCompleted && (
        <>
          <Text style={styles.helper}>Courses you have closed / marked complete.</Text>
          <FilterChips
            value={completedFilter}
            onChange={(k) => setCompletedFilter(k as CompletedFilter)}
            options={[
              { key: 'all', label: 'All', count: lists.completed.length },
              { key: 'trial', label: 'Trial', count: lists.completed.filter((c) => c.product_type === 'trial').length },
              { key: 'recorded', label: 'Recorded', count: lists.completed.filter((c) => c.product_type === 'recorded').length },
              { key: 'live', label: 'Live', count: lists.completed.filter((c) => c.product_type === 'live').length },
              { key: 'long', label: 'Long', count: lists.completed.filter((c) => c.product_type === 'program').length },
            ]}
          />
        </>
      )}

      {list.length === 0 ? (
        isCompleted ? (
          <View style={styles.empty}>
            <Ionicons name="tv-outline" size={30} color={C.gold} />
            <Text style={styles.emptyTitle}>No completed courses yet</Text>
            <Text style={styles.emptyBody}>Courses appear here once a student finishes them, or when you mark a course complete.</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name={TYPE_TABS.find((t) => t.key === tab)!.icon} size={30} color={C.gold} />
            <Text style={styles.emptyTitle}>No {TYPE_TABS.find((t) => t.key === tab)!.label.toLowerCase()} yet</Text>
            <Text style={styles.emptyBody}>Create your first one to start receiving students.</Text>
            <Pressable onPress={() => router.push(`/teacher/course-new?type=${tab}` as any)} style={{ marginTop: SPACE.md, alignSelf: 'stretch' }}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
                <Ionicons name="add" size={18} color={C.white} /><Text style={styles.newText}>Create {TYPE_TABS.find((t) => t.key === tab)!.label.replace(/ies$/, 'y').replace(/s$/, '')}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )
      ) : (
        list.map((c) => (
          <CourseCard
            key={c.id} c={c} busy={busy === c.id} closed={isClosed(c)}
            onEdit={() => router.push(`/teacher/course-edit/${c.id}` as any)}
            onVideos={() => router.push(`/teacher/course-recordings/${c.id}` as any)}
            onToggle={() => toggle(c)} onDelete={() => confirmDelete(c)} onComplete={() => confirmComplete(c)}
          />
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
      <Text style={[styles.tabLabel, { color: on ? C.white : C.accent2 }]}>{label}</Text>
      <View style={on ? styles.tabCountOn : styles.tabCountOff}><Text style={on ? styles.tabCountOnText : styles.tabCountOffText}>{count}</Text></View>
    </>
  );
  return (
    <Pressable onPress={onPress} style={styles.tabCell}>
      {on ? (
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tab}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.tab, styles.tabIdle]}>{inner}</View>
      )}
    </Pressable>
  );
}

function CompletedTab({ count, on, onPress }: { count: number; on: boolean; onPress: () => void }) {
  const inner = (
    <>
      <Ionicons name="tv-outline" size={18} color={on ? C.white : C.gold} />
      <Text style={[styles.tabLabel, { flex: 0, color: on ? C.white : C.accent2 }]}>Completed</Text>
      <View style={on ? styles.tabCountOn : styles.tabCountOff}><Text style={on ? styles.tabCountOnText : styles.tabCountOffText}>{count}</Text></View>
    </>
  );
  return (
    <Pressable onPress={onPress} style={{ marginTop: SPACE.md }}>
      {on ? (
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.tab, styles.tabFull]}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.tab, styles.tabIdle, styles.tabFull]}>{inner}</View>
      )}
    </Pressable>
  );
}

function CourseCard({ c, busy, closed, onEdit, onVideos, onToggle, onDelete, onComplete }: {
  c: StudioCourse; busy: boolean; closed: boolean;
  onEdit: () => void; onVideos: () => void; onToggle: () => void; onDelete: () => void; onComplete: () => void;
}) {
  const icon: keyof typeof Ionicons.glyphMap = c.product_type === 'trial' ? 'radio-button-on-outline'
    : c.product_type === 'recorded' ? 'book-outline' : c.product_type === 'live' ? 'videocam-outline' : 'shield-checkmark-outline';
  const isVideoType = c.product_type === 'recorded' || c.product_type === 'live';
  return (
    <View style={[styles.card, !c.is_active && { opacity: 0.7 }]}>
      <LinearGradient colors={['#111111', '#166534', '#C9A227']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardHead}>
        <View style={[styles.statusPill, { backgroundColor: c.is_active ? 'rgba(22,163,74,0.92)' : 'rgba(0,0,0,0.45)' }]}>
          <Text style={styles.statusText}>{c.is_active ? '● Live' : '○ Inactive'}</Text>
        </View>
        {c.is_free ? <View style={styles.freePill}><Text style={styles.freeText}>FREE</Text></View> : null}
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.92)" />
      </LinearGradient>

      <View style={{ padding: SPACE.md }}>
        <Text style={styles.cardTitle}>{c.title}</Text>
        <Text style={styles.cardMeta}>{[c.category || 'Course', 'All levels', `${c.duration_mins ?? 0} min`].join(' · ')}</Text>
        <Text style={styles.cardPrice}>{c.is_free ? 'Free' : money(c.price_usd ?? 0)}</Text>

        <View style={styles.miniRow}>
          <View style={styles.miniStat}><Text style={styles.miniNum}>{c.enrollments}</Text><Text style={styles.miniLbl}>Students</Text></View>
          <View style={styles.miniStat}><Text style={styles.miniNum}>{c.lessonCount}</Text><Text style={styles.miniLbl}>Lessons</Text></View>
          <View style={styles.miniStat}>
            <Text style={styles.miniNum}>{isVideoType && c.enrollments > 0 ? `${c.avgProgress}%` : c.completedStudents}</Text>
            <Text style={styles.miniLbl}>{isVideoType && c.enrollments > 0 ? 'Progress' : 'Done'}</Text>
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
        <Pressable style={[styles.actBtn, styles.lifeBtn, closed ? styles.reopenBtn : styles.completeBtn]} disabled={busy} onPress={onComplete}>
          <Text style={closed ? styles.reopenText : styles.completeText}>{closed ? '↩ Reopen course' : '✓ Mark complete'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 15, marginBottom: SPACE.md },
  newText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.white },

  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACE.md, marginTop: SPACE.sm },
  tabCell: { width: '48%' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 15, minHeight: 58, ...SHADOW.card },
  tabFull: { justifyContent: 'center' },
  tabIdle: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  tabLabel: { fontFamily: FONT.bodyBold, fontSize: 14, flex: 1 },
  tabCountOn: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountOnText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.white },
  tabCountOff: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountOffText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.accent2 },

  descRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: SPACE.md, marginBottom: SPACE.sm },
  descText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.gold },
  helper: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center' },

  empty: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.lg, alignItems: 'center', marginTop: SPACE.sm, ...SHADOW.card },
  emptyTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginTop: 10 },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },

  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, marginTop: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  cardHead: { height: 96, alignItems: 'center', justifyContent: 'center' },
  statusPill: { position: 'absolute', top: 10, left: 10, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.white },
  freePill: { position: 'absolute', top: 10, right: 10, backgroundColor: C.indigo, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  freeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.white },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink },
  cardMeta: { fontFamily: FONT.body, fontSize: 12, color: C.gold, marginTop: 3 },
  cardPrice: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.gold, marginTop: 8 },
  miniRow: { flexDirection: 'row', gap: 8, marginTop: SPACE.md },
  miniStat: { flex: 1, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  miniNum: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  miniLbl: { fontFamily: FONT.body, fontSize: 10, color: C.muted, marginTop: 1 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: SPACE.sm },
  actBtn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center', borderWidth: 1 },
  editBtn: { backgroundColor: C.cream, borderColor: C.border },
  editText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2 },
  videosBtn: { backgroundColor: 'rgba(79,70,229,0.06)', borderColor: 'rgba(79,70,229,0.2)' },
  videosText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.indigo },
  deactBtn: { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.06)' },
  deactText: { fontFamily: FONT.bodySemi, fontSize: 13, color: '#6B7280' },
  actvBtn: { backgroundColor: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)' },
  actvText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.success },
  delBtn: { backgroundColor: 'rgba(220,38,38,0.05)', borderColor: 'rgba(220,38,38,0.15)' },
  delText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.red },
  lifeBtn: { marginTop: SPACE.sm },
  completeBtn: { backgroundColor: 'rgba(22,101,52,0.08)', borderColor: 'rgba(22,101,52,0.18)' },
  completeText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  reopenBtn: { backgroundColor: 'rgba(201,162,39,0.10)', borderColor: 'rgba(201,162,39,0.25)' },
  reopenText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.accent2 },
});
