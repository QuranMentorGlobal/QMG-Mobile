// app/student/dashboard.tsx — premium student dashboard (mobile-designed).
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Loading } from '@/components/ui';
import { LocationGateBanner } from '@/components/LocationGateBanner';
import {
  BannerSlider, StatGrid, StatTile, BadgeStrip, Panel, PanelHeader, BarsChart, LevelRow,
  SectionHeader, QuickActionGrid, QuickAction, GoalRow, EmptyCard, QuoteCard, Initials,
} from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchStudentDash, type StudentDash, type NamedLesson, type MyTeacher } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function StudentDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<StudentDash | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setD(await fetchStudentDash(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading your dashboard…" /></Screen>;

  const hifzPct = Math.min(100, Math.round((d.hifzLevel / 10) * 100));
  const tajweedPct = Math.min(100, Math.round((d.tajweedLevel / 8) * 100));
  const months = lastSix();

  return (
    <Screen>
      <LocationGateBanner profileHref="/student/profile" />
      <BannerSlider role="student" />

      <StatGrid>
        <StatTile icon="water-outline" value="0 days" label="Learning Streak" tone="cream" />
        <StatTile icon="school-outline" value={d.coursesCompleted} label="Courses Completed" tone="green" />
        <StatTile icon="calendar-outline" value={d.upcoming.length} label="Upcoming Lessons" tone="gold" />
        <StatTile icon="bookmark-outline" value={d.activeBookings} label="Active Bookings" tone="indigo" />
      </StatGrid>

      <SectionHeader title="Achievement Badges" />
      <BadgeStrip earned={0} body="Complete lessons, attend regularly, and finish courses to earn awards." />

      <Panel>
        <PanelHeader icon="bar-chart-outline" title="Learning Activity" subtitle="Lessons completed per month" />
        <BarsChart data={months.map((m) => ({ label: m, value: 0 }))} />
      </Panel>

      <Panel>
        <PanelHeader icon="ribbon-outline" title="Progress" />
        <LevelRow label="Hifz" level={d.hifzLevel} max={10} pct={hifzPct} color={C.forest} />
        <View style={{ height: 1, backgroundColor: C.borderSoft, marginVertical: SPACE.sm }} />
        <LevelRow label="Tajweed" level={d.tajweedLevel} max={8} pct={tajweedPct} color={C.gold} />
      </Panel>

      <SectionHeader title="Quick Actions" />
      <QuickActionGrid>
        <QuickAction icon="search-outline" label="Browse Teachers" onPress={() => router.push('/student/teachers')} />
        <QuickAction icon="play-circle-outline" label="My Courses" onPress={() => router.push('/student/lessons')} />
        <QuickAction icon="calendar-outline" label="My Bookings" onPress={() => router.push('/student/bookings')} />
        <QuickAction icon="book-outline" label="My Lessons" onPress={() => router.push('/student/lessons')} />
      </QuickActionGrid>

      <SectionHeader title="Upcoming Lessons" actionLabel="View all" onAction={() => router.push('/student/lessons')} />
      {d.upcoming.length === 0 ? (
        <EmptyCard icon="calendar-outline" title="No upcoming lessons" body="Book a teacher to schedule your next session." ctaLabel="Browse Teachers" onCta={() => router.push('/student/teachers')} />
      ) : (
        d.upcoming.map((l) => <LessonRow key={l.id} l={l} />)
      )}

      <Panel>
        <PanelHeader title="Monthly Goals" />
        <GoalRow label="Lessons this month" done={0} total={8} unit="lessons" />
        <GoalRow label="Maintain streak" done={0} total={7} unit="days" />
        <GoalRow label="Active bookings" done={d.activeBookings} total={2} unit="bookings" complete={d.activeBookings >= 2} />
      </Panel>

      <SectionHeader title="My Teachers" actionLabel="View all" onAction={() => router.push('/student/bookings')} />
      {d.myTeachers.length === 0 ? (
        <EmptyCard icon="people-outline" title="No teachers yet" body="Your booked teachers will appear here." />
      ) : (
        d.myTeachers.map((t, i) => <TeacherRow key={t.teacher_id + i} t={t} />)
      )}

      <QuoteCard icon="sparkles-outline" eyebrow="REFLECTION" quote="Every letter you recite carries ten rewards. Keep learning — Allah sees every effort." source="Words of Encouragement" active={2} />
    </Screen>
  );
}

function LessonRow({ l }: { l: NamedLesson }) {
  const d = l.scheduled_at ? new Date(l.scheduled_at) : null;
  const wk = d ? d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase() : '—';
  const day = d ? d.getDate() : '–';
  const mon = d ? d.toLocaleDateString(undefined, { month: 'short' }) : '';
  const time = d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <View style={styles.lessonRow}>
      <View style={styles.dateChip}>
        <Text style={styles.dateWk}>{wk}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMon}>{mon}</Text>
      </View>
      {l.teacherAvatar ? <Image source={{ uri: l.teacherAvatar }} style={styles.lessonAvatar} /> : <Initials name={l.teacherName} size={44} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.lessonTitle}>{l.title}</Text>
        <Text style={styles.lessonWith}>with {l.teacherName}</Text>
        <Text style={styles.lessonMeta}>{time} · {l.duration_mins ?? 30} min</Text>
      </View>
    </View>
  );
}

function TeacherRow({ t }: { t: MyTeacher }) {
  const pct = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
  return (
    <View style={styles.teacherRow}>
      <View style={styles.teacherTop}>
        {t.avatar_url ? <Image source={{ uri: t.avatar_url }} style={styles.lessonAvatar} /> : <Initials name={t.name} size={40} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.lessonTitle}>{t.name}</Text>
          <Text style={styles.lessonWith}>Quran Course</Text>
        </View>
        <View style={styles.confirmBadge}><Text style={styles.confirmText}>{(t.status ?? 'pending').replace('_', ' ')}</Text></View>
      </View>
      <View style={styles.teacherBottom}>
        <Text style={styles.lessonMeta}>{t.done}/{t.total} lessons</Text>
        <Text style={styles.teacherPct}>{pct}%</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
    </View>
  );
}

function lastSix(): string[] {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date().getMonth(); const out: string[] = [];
  for (let i = 5; i >= 0; i--) out.push(M[(now - i + 12) % 12]);
  return out;
}

const styles = StyleSheet.create({
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  dateChip: { width: 54, borderRadius: 14, backgroundColor: C.tintGreen, alignItems: 'center', paddingVertical: 8 },
  dateWk: { fontFamily: FONT.bodySemi, fontSize: 10, color: C.forest },
  dateDay: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  dateMon: { fontFamily: FONT.body, fontSize: 10, color: C.muted },
  lessonAvatar: { width: 44, height: 44, borderRadius: 22 },
  lessonTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  lessonWith: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  lessonMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  teacherRow: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  teacherTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  teacherBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.md, marginBottom: 6 },
  teacherPct: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.gold },
  confirmBadge: { borderWidth: 1.5, borderColor: C.forest, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 4 },
  confirmText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.forest, textTransform: 'capitalize' },
  track: { height: 7, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: C.gold },
});
