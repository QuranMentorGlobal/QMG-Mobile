// app/teacher/lessons.tsx — unified teaching schedule (mirrors web).
// Eyebrow + title + 3 stat cards (Today / This Week / Upcoming), grouped
// sections, lesson cards (course + TRIAL badge, "for {student}", date·time·
// duration, Join/Scheduled), and a month calendar with per-day dots.
import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchSchedule, type Session } from '@/lib/lessonsActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function TeacherLessons() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setSessions(await fetchSchedule(session.user.id, 'teacher'));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);
  const groups = useMemo(() => {
    const todays: Session[] = []; const week: Session[] = []; const up: Session[] = [];
    sessions.forEach((s) => {
      const d = new Date(s.dateISO);
      if (sameDay(d, today)) todays.push(s);
      else if (d < weekEnd && d >= today) week.push(s);
      else if (d >= weekEnd) up.push(s);
    });
    return { todays, week, up };
  }, [sessions]);
  const countByDay = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.forEach((s) => { const k = ymd(new Date(s.dateISO)); m[k] = (m[k] || 0) + 1; });
    return m;
  }, [sessions]);
  const selectedList = useMemo(() => (selected ? sessions.filter((s) => ymd(new Date(s.dateISO)) === selected) : []), [selected, sessions]);

  if (loading) return <Screen scroll={false}><Loading label="Loading lessons…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
      <Text style={styles.h1}>Lessons</Text>
      <Text style={styles.sub}>Your unified schedule across every active class. Join live sessions here.</Text>

      <View style={styles.statRow}>
        <Stat3 tone="cream" value={groups.todays.length} label="Today" />
        <Stat3 tone="green" value={groups.week.length} label="This Week" />
        <Stat3 tone="indigo" value={groups.up.length} label="Upcoming" />
      </View>

      <Section icon="calendar-outline" title="Today's Lessons" list={groups.todays} empty="No lessons today." />
      <Section icon="reader-outline" title="This Week" list={groups.week} empty="Nothing else this week." />
      <Section icon="time-outline" title="Upcoming" list={groups.up} empty="No upcoming lessons beyond this week." />

      <Calendar monthCursor={monthCursor} setMonthCursor={setMonthCursor} countByDay={countByDay} selected={selected} onSelect={setSelected} />
      {selected && selectedList.length > 0 ? (
        <View style={{ marginTop: SPACE.md }}>
          <Text style={styles.secTitle}>{new Date(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          {selectedList.map((s) => <LessonCard key={s.key} s={s} />)}
        </View>
      ) : null}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function Section({ icon, title, list, empty }: { icon: keyof typeof Ionicons.glyphMap; title: string; list: Session[]; empty: string }) {
  return (
    <View style={{ marginTop: SPACE.md }}>
      <View style={styles.secHead}><Ionicons name={icon} size={16} color={C.gold} /><Text style={styles.secTitle}>{title}</Text></View>
      {list.length === 0 ? (
        <View style={styles.emptyRow}><Text style={styles.emptyText}>{empty}</Text></View>
      ) : list.map((s) => <LessonCard key={s.key} s={s} />)}
    </View>
  );
}

function LessonCard({ s }: { s: Session }) {
  const t = new Date(s.dateISO).getTime();
  const now = Date.now();
  const canJoin = !!s.joinUrl && now >= t - 15 * 60 * 1000 && now <= t + s.durationMins * 60 * 1000;
  return (
    <View style={styles.card}>
      {s.partyAvatar ? <Image source={{ uri: s.partyAvatar }} style={styles.avatar} /> : <Initials name={s.party} size={46} />}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={styles.title} numberOfLines={1}>{s.title}</Text>
          {s.isTrial ? <View style={styles.trialBadge}><Text style={styles.trialText}>TRIAL</Text></View> : null}
        </View>
        <Text style={styles.for}>for {s.party}</Text>
        <Text style={styles.when}>{fmtDay(s.dateISO)} · {fmtTime(s.dateISO)} · {s.durationMins} min</Text>
      </View>
      {canJoin ? (
        <Pressable onPress={() => Linking.openURL(s.joinUrl!)}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinBtn}>
            <Text style={styles.joinText}>Join</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <View style={styles.scheduled}><Text style={styles.scheduledText}>Scheduled</Text></View>
      )}
    </View>
  );
}

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
function Calendar({ monthCursor, setMonthCursor, countByDay, selected, onSelect }: {
  monthCursor: Date; setMonthCursor: (d: Date) => void; countByDay: Record<string, number>; selected: string | null; onSelect: (k: string | null) => void;
}) {
  const year = monthCursor.getFullYear(); const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = ymd(new Date());
  const monthLabel = monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return (
    <View style={styles.calCard}>
      <View style={styles.calHead}>
        <Pressable onPress={() => setMonthCursor(new Date(year, month - 1, 1))} hitSlop={8} style={styles.calNav}><Ionicons name="chevron-back" size={18} color={C.ink} /></Pressable>
        <Text style={styles.calMonth}>{monthLabel}</Text>
        <Pressable onPress={() => setMonthCursor(new Date(year, month + 1, 1))} hitSlop={8} style={styles.calNav}><Ionicons name="chevron-forward" size={18} color={C.ink} /></Pressable>
      </View>
      <View style={styles.calWeek}>{WD.map((w, i) => <Text key={i} style={styles.calWd}>{w}</Text>)}</View>
      <View style={styles.calGrid}>
        {cells.map((day, i) => {
          if (day == null) return <View key={i} style={styles.calCell} />;
          const key = ymd(new Date(year, month, day));
          const has = (countByDay[key] || 0) > 0;
          const isToday = key === todayKey;
          const isSel = key === selected;
          return (
            <Pressable key={i} style={styles.calCell} onPress={() => onSelect(isSel ? null : key)}>
              <View style={[styles.calDay, isToday && styles.calToday, isSel && styles.calSel]}>
                <Text style={[styles.calNum, isToday && { color: C.accent2 }, isSel && { color: C.white }]}>{day}</Text>
              </View>
              {has ? <View style={[styles.calDot, isSel && { backgroundColor: C.white }]} /> : <View style={{ height: 5 }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
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
  stat: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, alignItems: 'center', ...SHADOW.card },
  statValue: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink },
  statLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },

  secHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: SPACE.sm },
  secTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  emptyRow: { backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, alignItems: 'center' },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  title: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, flexShrink: 1 },
  trialBadge: { backgroundColor: C.tintGold, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  trialText: { fontFamily: FONT.bodyBold, fontSize: 9, color: C.accent2, letterSpacing: 0.4 },
  for: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  when: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.forest, marginTop: 3 },
  joinBtn: { borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 10 },
  joinText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
  scheduled: { backgroundColor: C.cream, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  scheduledText: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.muted },

  calCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginTop: SPACE.lg, ...SHADOW.card },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm },
  calNav: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  calMonth: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink },
  calWeek: { flexDirection: 'row' },
  calWd: { flex: 1, textAlign: 'center', fontFamily: FONT.bodyBold, fontSize: 11, color: C.faint, paddingVertical: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  calDay: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  calToday: { backgroundColor: C.tintGold },
  calSel: { backgroundColor: C.forest },
  calNum: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.forest, marginTop: 2 },
});
