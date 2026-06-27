// app/parent/lessons.tsx — Parent Lessons. Unified schedule across every active
// class for all children (or one, via the ChildSwitcher): Today / This Week /
// Upcoming KPIs, session cards with a child badge + Join/Scheduled, and a month
// calendar with dots on lesson days. Mirrors the web LessonsCalendar (role="parent").
import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { useAuth } from '@/lib/auth';
import { useParentChild } from '@/lib/parentChild';
import { fetchParentSchedule, type ParentSession } from '@/lib/parentActions';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ParentLessons() {
  const { session } = useAuth();
  const { selectedChildId, isAll } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ParentSession[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setSessions(await fetchParentSchedule(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);

  const scoped = useMemo(
    () => (isAll ? sessions : sessions.filter((s) => s.childId === selectedChildId)),
    [sessions, isAll, selectedChildId]
  );
  const sessDate = (s: ParentSession) => new Date(s.dateISO);
  const todays = useMemo(() => scoped.filter((s) => sameDay(sessDate(s), today)), [scoped]);
  const thisWeek = useMemo(() => scoped.filter((s) => { const d = sessDate(s); return !sameDay(d, today) && d < weekEnd && d >= today; }), [scoped]);
  const upcoming = useMemo(() => scoped.filter((s) => sessDate(s) >= weekEnd), [scoped]);
  const countByDay = useMemo(() => {
    const m: Record<string, number> = {};
    scoped.forEach((s) => { const k = ymd(sessDate(s)); m[k] = (m[k] || 0) + 1; });
    return m;
  }, [scoped]);
  const selectedSessions = selectedDate ? scoped.filter((s) => sameDay(sessDate(s), selectedDate)) : [];

  if (loading) return <Screen scroll={false}><Loading label="Loading lessons…" /></Screen>;

  // Month grid cells
  const mFirst = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const leading = mFirst.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i + 1)),
  ];

  return (
    <Screen>
      <ChildSwitcher />
      <Text style={styles.h1}>Lessons</Text>
      <Text style={styles.sub}>Your unified schedule across every active class. Join live sessions here.</Text>

      <View style={styles.kpiRow}>
        <Kpi value={todays.length} label="Today" tone="gold" />
        <Kpi value={thisWeek.length} label="This Week" tone="green" />
        <Kpi value={upcoming.length} label="Upcoming" tone="indigo" />
      </View>

      <Section icon="calendar-outline" color={C.gold} title="Today's Lessons" />
      {todays.length ? todays.map((s) => <SessionRow key={s.key} s={s} />) : <EmptyRow text="No lessons scheduled for today." />}

      <Section icon="book-outline" color={C.forest} title="This Week" />
      {thisWeek.length ? thisWeek.map((s) => <SessionRow key={s.key} s={s} />) : <EmptyRow text="Nothing else this week." />}

      <Section icon="time-outline" color={C.indigo} title="Upcoming" />
      {upcoming.length ? upcoming.slice(0, 12).map((s) => <SessionRow key={s.key} s={s} />) : <EmptyRow text="No upcoming lessons beyond this week." />}

      {/* Calendar */}
      <View style={styles.calCard}>
        <View style={styles.calHead}>
          <Pressable onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} hitSlop={8} style={styles.calNav}>
            <Ionicons name="chevron-back" size={18} color={C.ink} />
          </Pressable>
          <Text style={styles.calMonth}>{monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
          <Pressable onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} hitSlop={8} style={styles.calNav}>
            <Ionicons name="chevron-forward" size={18} color={C.ink} />
          </Pressable>
        </View>
        <View style={styles.calWeek}>{WD.map((w, i) => <Text key={i} style={styles.calWd}>{w}</Text>)}</View>
        <View style={styles.calGrid}>
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={styles.calCell} />;
            const n = countByDay[ymd(d)] || 0;
            const isToday = sameDay(d, today);
            const isSel = selectedDate && sameDay(d, selectedDate);
            return (
              <View key={i} style={styles.calCell}>
                <Pressable onPress={() => setSelectedDate(d)} style={styles.calDayWrap}>
                  {isSel ? (
                    <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.calDay}>
                      <Text style={[styles.calNum, { color: C.white }]}>{d.getDate()}</Text>
                      {n > 0 ? <View style={[styles.calDot, { backgroundColor: C.white }]} /> : null}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.calDay, isToday && styles.calToday, n > 0 && !isToday && styles.calHas]}>
                      <Text style={styles.calNum}>{d.getDate()}</Text>
                      {n > 0 ? <View style={[styles.calDot, { backgroundColor: C.forest }]} /> : null}
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
        {selectedDate ? (
          <View style={styles.calDetail}>
            <Text style={styles.calDetailTitle}>{fmtDay(selectedDate)}</Text>
            {selectedSessions.length ? selectedSessions.map((s) => (
              <View key={s.key} style={styles.calDetailRow}>
                <Text style={styles.calDetailText} numberOfLines={1}>{fmtTime(sessDate(s))} · {s.title}</Text>
                {s.joinUrl ? <Text style={styles.calDetailJoin} onPress={() => Linking.openURL(s.joinUrl!)}>Join</Text> : null}
              </View>
            )) : <Text style={styles.calDetailEmpty}>No lessons.</Text>}
          </View>
        ) : null}
      </View>
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function Section({ icon, color, title }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <View style={styles.emptyRow}><Text style={styles.emptyRowText}>{text}</Text></View>;
}

function canJoin(s: ParentSession) {
  const start = new Date(s.dateISO).getTime();
  const open = start - 15 * 60000;
  const end = start + s.durationMins * 60000;
  return Date.now() >= open && Date.now() <= end;
}

function SessionRow({ s }: { s: ParentSession }) {
  const d = new Date(s.dateISO);
  const joinable = !!s.joinUrl && canJoin(s);
  return (
    <View style={styles.card}>
      {s.teacherAvatar ? <Image source={{ uri: s.teacherAvatar }} style={styles.avatar} /> : <Initials name={s.teacher} size={44} />}
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{s.title}</Text>
          <View style={styles.childPill}><Text style={styles.childPillText}>{s.childName}</Text></View>
          {s.isTrial ? <View style={styles.trialPill}><Text style={styles.trialText}>TRIAL</Text></View> : null}
        </View>
        <Text style={styles.meta}>with {s.teacher}</Text>
        <Text style={styles.when}>{fmtDay(d)} · {fmtTime(d)} · {s.durationMins} min</Text>
      </View>
      {s.joinUrl ? (
        <Pressable onPress={() => Linking.openURL(s.joinUrl!)} disabled={!joinable}>
          <LinearGradient colors={joinable ? G.primary : ['#B7B2A6', '#B7B2A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinBtn}>
            <Text style={styles.joinText}>{joinable ? 'Join' : 'Join'}</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <View style={styles.schedPill}><Text style={styles.schedText}>Scheduled</Text></View>
      )}
    </View>
  );
}

function Kpi({ value, label, tone }: { value: number; label: string; tone: 'gold' | 'green' | 'indigo' }) {
  const bg = tone === 'gold' ? 'rgba(201,162,39,0.1)' : tone === 'green' ? 'rgba(22,101,52,0.08)' : 'rgba(79,70,229,0.08)';
  return (
    <View style={[styles.kpi, { backgroundColor: bg }]}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4, marginBottom: SPACE.md },
  kpiRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md },
  kpi: { flex: 1, borderRadius: RADIUS.md, paddingVertical: SPACE.md, alignItems: 'center' },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink },
  kpiLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: SPACE.md, marginBottom: SPACE.sm },
  sectionTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  emptyRow: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.lg, marginBottom: SPACE.sm, borderWidth: 1, borderColor: C.borderSoft },
  emptyRowText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center' },
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, ...SHADOW.card },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink, flexShrink: 1 },
  childPill: { backgroundColor: 'rgba(22,101,52,0.1)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  childPillText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.forest },
  trialPill: { backgroundColor: 'rgba(201,162,39,0.15)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  trialText: { fontFamily: FONT.bodyBold, fontSize: 9, color: '#7A5C00' },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  when: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.forest, marginTop: 3 },
  joinBtn: { borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 9 },
  joinText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
  schedPill: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 9 },
  schedText: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.muted },
  calCard: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginTop: SPACE.md, borderWidth: 1, borderColor: C.borderSoft, ...SHADOW.card },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm },
  calNav: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  calMonth: { fontFamily: FONT.displayBold, fontSize: 15, color: C.ink },
  calWeek: { flexDirection: 'row' },
  calWd: { flex: 1, textAlign: 'center', fontFamily: FONT.bodyBold, fontSize: 10, color: C.faint, paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, padding: 2 },
  calDayWrap: { width: '100%' },
  calDay: { aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  calToday: { borderColor: C.gold, backgroundColor: 'rgba(201,162,39,0.12)' },
  calHas: { backgroundColor: 'rgba(22,101,52,0.06)' },
  calNum: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.ink },
  calDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  calDetail: { marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.borderSoft },
  calDetailTitle: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink, marginBottom: 6 },
  calDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  calDetailText: { fontFamily: FONT.body, fontSize: 12, color: C.muted, flex: 1 },
  calDetailJoin: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.forest, paddingLeft: 8 },
  calDetailEmpty: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
});
