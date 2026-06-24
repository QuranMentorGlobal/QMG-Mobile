// components/BookingScreen.tsx — book a trial / view courses (shared student/parent).
// Custom JS date & time picker (no native module → OTA-safe). Booking = direct
// Supabase insert (status 'pending'); free → bookings, paid → checkout.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherDetail, fetchBookingCourses, fetchChildren, createBooking, type TeacherDetail, type BookingCourse, type Child } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

type Tab = 'trial' | 'recorded' | 'live' | 'program';
const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'trial', label: 'Trial Classes', icon: 'radio-button-on-outline' },
  { key: 'recorded', label: 'Recorded Courses', icon: 'cloud-download-outline' },
  { key: 'live', label: 'Live Classes', icon: 'videocam-outline' },
  { key: 'program', label: 'Long Courses', icon: 'add-circle-outline' },
];

function nextDays(n: number) {
  const out: Date[] = [];
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); out.push(d); }
  return out;
}
function timeSlots() {
  const out: string[] = [];
  for (let h = 7; h <= 21; h++) { out.push(`${String(h).padStart(2, '0')}:00`); out.push(`${String(h).padStart(2, '0')}:30`); }
  return out;
}

export function BookingScreen({ basePath, checkoutPath, bookingsPath }: { basePath: string; checkoutPath: string; bookingsPath: string }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [courses, setCourses] = useState<{ trial: BookingCourse[]; recorded: BookingCourse[]; live: BookingCourse[]; program: BookingCourse[] }>({ trial: [], recorded: [], live: [], program: [] });
  const [tab, setTab] = useState<Tab>('trial');
  const [children, setChildren] = useState<Child[]>([]);
  const [child, setChild] = useState<string>('');

  const [selected, setSelected] = useState<string>('');
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [d, cs] = await Promise.all([fetchTeacherDetail(id), fetchBookingCourses(id)]);
    setTeacher(d); setCourses(cs);
    if (cs.trial[0]) setSelected(cs.trial[0].id);
    if (role === 'parent' && session?.user) {
      const kids = await fetchChildren(session.user.id);
      setChildren(kids); if (kids[0]) setChild(kids[0].id);
    }
    setLoading(false);
  }, [id, role, session?.user?.id]);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => nextDays(21), []);
  const slots = useMemo(() => timeSlots(), []);
  const trialCourse = courses.trial.find((c) => c.id === selected) ?? courses.trial[0];

  if (loading) return <Screen scroll={false}><Loading label="Loading booking…" /></Screen>;
  if (!teacher) return <Screen><EmptyCard icon="person-outline" title="Teacher not found" body="Go back and pick another teacher." /></Screen>;

  const counts = { trial: courses.trial.length, recorded: courses.recorded.length, live: courses.live.length, program: courses.program.length };

  async function bookTrial() {
    setErr(null);
    if (!trialCourse) { setErr('No trial class available.'); return; }
    if (!date || !time) { setErr('Please pick a date and time.'); return; }
    const studentId = role === 'parent' ? child : session?.user?.id;
    if (!studentId) { setErr(role === 'parent' ? 'Please select a child.' : 'Please sign in again.'); return; }
    if (studentId === teacher!.id) { setErr('You cannot book your own class.'); return; }
    setBusy(true);
    const startDate = date.toISOString().slice(0, 10);
    const res = await createBooking({
      studentId, teacherId: teacher!.id, courseId: trialCourse.id, startDate, sessionTime: time,
      durationMins: trialCourse.duration_mins, priceUsd: trialCourse.price_usd, notes,
    });
    setBusy(false);
    if (!res.ok || !res.bookingId) { setErr(res.error ?? 'Could not book.'); return; }
    if (trialCourse.price_usd === 0) {
      router.replace(`${bookingsPath}?tab=pending` as any);
    } else {
      const params = new URLSearchParams({ bookingId: res.bookingId, amount: String(trialCourse.price_usd), course: trialCourse.title, teacher: teacher!.name });
      router.push(`${checkoutPath}?${params.toString()}` as any);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={C.ink} /><Text style={styles.backText}>Back to Profile</Text>
      </Pressable>

      {/* teacher mini hero */}
      <LinearGradient colors={['#15402A', '#3F5A1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        {teacher.avatar_url ? <Image source={{ uri: teacher.avatar_url }} style={styles.heroAvatar} /> : <Initials name={teacher.name} size={56} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName}>{teacher.name}</Text>
          <Text style={styles.heroMeta}>{teacher.country ?? 'Worldwide'}</Text>
          {teacher.available_days.length > 0 ? <Text style={styles.heroDays}>Available: {teacher.available_days.join(', ')}</Text> : null}
        </View>
      </LinearGradient>

      {/* product tabs */}
      <View style={styles.tabGrid}>
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <Pressable key={tb.key} onPress={() => setTab(tb.key)} style={{ width: '47.5%', flexGrow: 1 }}>
              {active ? (
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tab}>
                  <Ionicons name={tb.icon} size={18} color={C.white} />
                  <Text style={[styles.tabLabel, { color: C.white }]}>{tb.label}</Text>
                  <View style={styles.tabCountOn}><Text style={styles.tabCountOnText}>{counts[tb.key]}</Text></View>
                </LinearGradient>
              ) : (
                <View style={[styles.tab, styles.tabIdle]}>
                  <Ionicons name={tb.icon} size={18} color={C.muted} />
                  <Text style={styles.tabLabel}>{tb.label}</Text>
                  <View style={styles.tabCount}><Text style={styles.tabCountText}>{counts[tb.key]}</Text></View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {tab === 'trial' ? (
        courses.trial.length === 0 ? (
          <EmptyCard icon="radio-button-on-outline" title="No trial classes" body="This teacher hasn't published a trial class yet." />
        ) : (
          <>
            {role === 'parent' && children.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.stepLabel}>Booking for</Text>
                <View style={styles.childRow}>
                  {children.map((k) => {
                    const nm = [k.first_name, k.last_name].filter(Boolean).join(' ') || 'Child';
                    const on = child === k.id;
                    return <Pressable key={k.id} onPress={() => setChild(k.id)} style={[styles.childChip, on && styles.childChipOn]}><Text style={[styles.childChipText, on && { color: C.white }]}>{nm}</Text></Pressable>;
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Step n={1} label="Choose a Trial Class" />
              {courses.trial.map((c) => {
                const on = selected === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setSelected(c.id)} style={[styles.classRow, on && styles.classRowOn]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.className}>{c.title}</Text>
                      <Text style={styles.classMeta}>{c.category ?? 'Trial'} · {c.duration_mins} min</Text>
                    </View>
                    <Text style={styles.classPrice}>{c.price_usd === 0 ? 'Free' : `$${c.price_usd}`}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.card}>
              <Step n={2} label="Pick a Date & Time" />
              <Text style={styles.fieldLabel}>DATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {days.map((d) => {
                  const on = date && d.toDateString() === date.toDateString();
                  return (
                    <Pressable key={d.toISOString()} onPress={() => setDate(d)} style={[styles.dateChip, on && styles.dateChipOn]}>
                      <Text style={[styles.dateWk, on && { color: C.white }]}>{d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</Text>
                      <Text style={[styles.dateDay, on && { color: C.white }]}>{d.getDate()}</Text>
                      <Text style={[styles.dateMon, on && { color: 'rgba(255,255,255,0.85)' }]}>{d.toLocaleDateString(undefined, { month: 'short' })}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={[styles.fieldLabel, { marginTop: SPACE.md }]}>TIME</Text>
              <View style={styles.slotWrap}>
                {slots.map((s) => {
                  const on = time === s;
                  return <Pressable key={s} onPress={() => setTime(s)} style={[styles.slot, on && styles.slotOn]}><Text style={[styles.slotText, on && { color: C.white }]}>{s}</Text></Pressable>;
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Step n={3} label="Message to Teacher" />
              <TextInput value={notes} onChangeText={setNotes} placeholder="Your level, learning goals, questions…" placeholderTextColor={C.faint} multiline style={styles.notes} />
            </View>

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Pressable onPress={bookTrial} disabled={busy}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.bookBtn, busy && { opacity: 0.7 }]}>
                <Text style={styles.bookText}>{busy ? 'Booking…' : `Book Trial — ${trialCourse && trialCourse.price_usd === 0 ? 'Free' : `$${trialCourse?.price_usd ?? 0}`}`}</Text>
              </LinearGradient>
            </Pressable>

            {trialCourse ? (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Trial Summary</Text>
                <Row k="Class" v={trialCourse.title} />
                <Row k="Duration" v={`${trialCourse.duration_mins} min`} />
                <Row k="When" v={date && time ? `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${time}` : '—'} />
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}><Text style={styles.totalK}>Total</Text><Text style={styles.totalV}>{trialCourse.price_usd === 0 ? 'Free' : `$${trialCourse.price_usd}`}</Text></View>
              </View>
            ) : null}
          </>
        )
      ) : (
        <CourseList list={tab === 'recorded' ? courses.recorded : tab === 'live' ? courses.live : courses.program} kind={tab} />
      )}
    </Screen>
  );
}

function CourseList({ list, kind }: { list: BookingCourse[]; kind: Tab }) {
  if (list.length === 0) return <EmptyCard icon="library-outline" title="Nothing here yet" body="This teacher hasn't published courses of this type." />;
  return (
    <>
      {list.map((c) => (
        <View key={c.id} style={styles.courseCard}>
          <LinearGradient colors={['#15402A', '#3F5A1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.courseThumb}>
            <View style={styles.courseBadge}><Text style={styles.courseBadgeText}>{kind.toUpperCase()}</Text></View>
            <Ionicons name="book-outline" size={30} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
          <View style={{ padding: SPACE.md }}>
            <Text style={styles.courseTitle}>{c.title}</Text>
            {c.description ? <Text style={styles.courseDesc} numberOfLines={2}>{c.description}</Text> : null}
            <Text style={styles.courseMeta}>All levels · {c.lessons} lesson{c.lessons === 1 ? '' : 's'}</Text>
            <View style={styles.courseFooter}>
              <Text style={styles.coursePrice}>{c.is_free ? 'Free' : `$${c.price_usd}`}</Text>
              <View style={styles.purchaseBtn}><Text style={styles.purchaseText}>Purchase</Text></View>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
      <Text style={styles.stepText}>{label}</Text>
    </View>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <View style={styles.summaryRow}><Text style={styles.rowK}>{k}</Text><Text style={styles.rowV}>{v}</Text></View>;
}

const styles = StyleSheet.create({
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACE.xs, marginBottom: SPACE.md, alignSelf: 'flex-start' },
  backText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  heroAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  heroName: { fontFamily: FONT.displayBold, fontSize: 20, color: C.white },
  heroMeta: { fontFamily: FONT.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroDays: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginBottom: SPACE.md },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: 16, ...SHADOW.card },
  tabIdle: { backgroundColor: C.card },
  tabLabel: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink, flex: 1 },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.accent2 },
  tabCountOn: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountOnText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.white },
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACE.md },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
  stepText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  stepLabel: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.muted, marginBottom: SPACE.sm },
  childRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childChip: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8 },
  childChipOn: { backgroundColor: C.forest, borderColor: C.forest },
  childChipText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.text },
  classRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.sm },
  classRowOn: { borderColor: C.gold, backgroundColor: C.tintGold },
  className: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  classMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  classPrice: { fontFamily: FONT.displayBold, fontSize: 18, color: C.gold },
  fieldLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.5, marginBottom: 8 },
  dateChip: { width: 56, borderRadius: 14, backgroundColor: C.cream, alignItems: 'center', paddingVertical: 10 },
  dateChipOn: { backgroundColor: C.forest },
  dateWk: { fontFamily: FONT.bodySemi, fontSize: 10, color: C.muted },
  dateDay: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  dateMon: { fontFamily: FONT.body, fontSize: 10, color: C.muted },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8 },
  slotOn: { backgroundColor: C.forest, borderColor: C.forest },
  slotText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.text },
  notes: { minHeight: 90, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, padding: 12, fontFamily: FONT.body, fontSize: 14, color: C.ink, textAlignVertical: 'top' },
  err: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm, textAlign: 'center' },
  bookBtn: { borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', marginBottom: SPACE.md },
  bookText: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.white },
  summary: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  summaryTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, marginBottom: SPACE.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowK: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  rowV: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  summaryDivider: { height: 1, backgroundColor: C.borderSoft, marginVertical: 6 },
  totalK: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  totalV: { fontFamily: FONT.displayBold, fontSize: 18, color: C.gold },
  courseCard: { backgroundColor: C.card, borderRadius: RADIUS.lg, marginBottom: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  courseThumb: { height: 110, alignItems: 'center', justifyContent: 'center' },
  courseBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  courseBadgeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.accent2 },
  courseTitle: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink },
  courseDesc: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 18 },
  courseMeta: { fontFamily: FONT.body, fontSize: 12, color: C.faint, marginTop: 6 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACE.md },
  coursePrice: { fontFamily: FONT.displayBold, fontSize: 22, color: C.gold },
  purchaseBtn: { backgroundColor: C.forest, borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg, paddingVertical: 11 },
  purchaseText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
});
