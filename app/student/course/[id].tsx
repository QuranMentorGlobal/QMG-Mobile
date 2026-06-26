// app/student/course/[id].tsx — student course detail (mirrors web): type-aware
// tabs (Overview + Schedule/Lessons/Announcements/Resources/…), About + stats,
// Your Teacher with Message Teacher, Join links, and lesson progress.
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { getOrCreateConversation } from '@/lib/db';
import { fetchCourseDetail, markLessonProgress, saveStudentNote, submitHomework, type CourseDetail, type CType } from '@/lib/courseDetailActions';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const TYPE_LABEL: Record<CType, string> = { trial: 'Trial Class', recorded: 'Recorded Course', live: 'Live Class', program: 'Long Course' };
const TYPE_BADGE: Record<CType, string> = { trial: 'TRIAL', recorded: 'RECORDED', live: 'LIVE CLASS', program: 'LONG COURSE' };
function tabsFor(type: CType): { key: string; label: string }[] {
  const overview = { key: 'overview', label: 'Overview' };
  const resources = { key: 'resources', label: 'Resources' };
  if (type === 'trial') return [overview, { key: 'join', label: 'Join' }, { key: 'notes', label: 'Notes' }, resources];
  if (type === 'live') return [overview, { key: 'schedule', label: 'Schedule' }, { key: 'announcements', label: 'Announcements' }, resources];
  if (type === 'program') return [overview, { key: 'lessons', label: 'Curriculum' }, { key: 'homework', label: 'Homework' }, { key: 'assessments', label: 'Assessments' }, { key: 'reports', label: 'Teacher Reports' }, resources];
  return [overview, { key: 'lessons', label: 'Lessons' }, { key: 'progress', label: 'Progress' }, resources, { key: 'certificate', label: 'Certificate' }];
}
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch { return s; } };

export default function StudentCourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<CourseDetail | null>(null);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id || !uid) return;
    const detail = await fetchCourseDetail(id, uid);
    setD(detail); setCompleted(detail?.completed ?? []); setNote(detail?.booking?.student_notes ?? ''); setLoading(false);
  }, [id, uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tabs = useMemo(() => (d ? tabsFor(d.type) : []), [d]);
  const progressPct = d && d.lessons.length ? Math.min(100, Math.round((completed.length / d.lessons.length) * 100)) : (d?.progressPct ?? 0);

  async function messageTeacher() {
    if (!d?.course?.teacher_id) return;
    setBusy('msg');
    const convId = await getOrCreateConversation(uid, d.course.teacher_id);
    setBusy(null);
    if (convId) router.push(`/student/messages/${convId}` as any);
  }
  async function toggleLesson(lessonId: string) {
    if (!d?.enrollment) return;
    const isOn = completed.includes(lessonId);
    setBusy(lessonId);
    const ok = await markLessonProgress(d.enrollment.id, lessonId, !isOn);
    setBusy(null);
    if (ok) setCompleted((c) => (isOn ? c.filter((x) => x !== lessonId) : [...c, lessonId]));
  }
  async function saveNote() {
    if (!d?.booking) return;
    setBusy('note'); setNoteSaved(false);
    const ok = await saveStudentNote(d.booking.id, note);
    setBusy(null);
    if (ok) { setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2500); }
  }
  async function submitHw(hwId: string, text: string) {
    setBusy(hwId);
    const ok = await submitHomework(hwId, text);
    setBusy(null);
    if (ok) load();
  }

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Stack.Screen options={{ headerShown: false }} /><Loading label="Loading course…" /></SafeAreaView>;
  if (!d) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.notFound}><Ionicons name="book-outline" size={30} color={C.gold} /><Text style={styles.muted}>Course not found.</Text><Pressable onPress={() => router.back()}><Text style={styles.back}>← Go back</Text></Pressable></View>
    </SafeAreaView>
  );

  const showProgress = d.type === 'recorded' || d.type === 'program';
  const statusVal = d.type === 'program' ? (d.course.program_months ? `${d.course.program_months}` : '—') : (d.isDone ? 'Done' : 'Active');
  const statusLabel = d.type === 'program' ? 'Months' : 'Status';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.cream }}>
          <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={8}><Ionicons name="chevron-back" size={18} color={C.forest} /><Text style={styles.backText}>Courses</Text></Pressable>
        </SafeAreaView>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SPACE.md, paddingBottom: SPACE.section }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#16291E', '#166534']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{TYPE_BADGE[d.type]}</Text></View>
            <Text style={styles.heroTitle}>{d.course.title}</Text>
            <Text style={styles.heroMeta}>{[d.course.category, `with ${d.teacherName}`].filter(Boolean).join(' · ')}</Text>
            {showProgress && d.lessons.length > 0 ? (
              <View style={{ marginTop: SPACE.md }}>
                <View style={styles.heroProgRow}><Text style={styles.heroProgText}>{completed.length} of {d.lessons.length} done</Text><Text style={styles.heroProgPct}>{progressPct}%</Text></View>
                <View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${progressPct}%` }]} /></View>
              </View>
            ) : null}
          </LinearGradient>

          <View style={styles.tabBar}>
            {tabs.map((t) => {
              const on = tab === t.key;
              return on ? (
                <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabWrap}>
                  <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabOn}><Text style={styles.tabOnText}>{t.label}</Text></LinearGradient>
                </Pressable>
              ) : (
                <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabWrap, styles.tabIdle]}><Text style={styles.tabIdleText}>{t.label}</Text></Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: SPACE.md }}>
            {tab === 'overview' ? (
              <Overview d={d} statusVal={statusVal} statusLabel={statusLabel} onMessage={messageTeacher} busy={busy === 'msg'} />
            ) : tab === 'lessons' ? (
              <Lessons d={d} completed={completed} onToggle={toggleLesson} busy={busy} />
            ) : tab === 'progress' ? (
              <Progress completed={completed.length} total={d.lessons.length} pct={progressPct} done={d.isDone} />
            ) : tab === 'schedule' || tab === 'join' ? (
              <Schedule d={d} />
            ) : tab === 'announcements' ? (
              <Announcements list={d.announcements} />
            ) : tab === 'homework' ? (
              <Homework list={d.homework} onSubmit={submitHw} busy={busy} />
            ) : tab === 'assessments' ? (
              <Assessments list={d.assessments} />
            ) : tab === 'reports' ? (
              <Reports list={d.reports} />
            ) : tab === 'certificate' ? (
              <Certificate d={d} pct={progressPct} />
            ) : tab === 'notes' ? (
              <Notes value={note} onChange={setNote} onSave={saveNote} saving={busy === 'note'} saved={noteSaved} disabled={!d.booking} />
            ) : tab === 'resources' ? (
              <Resources list={d.resources} />
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) { return <View style={styles.card}>{children}</View>; }
function EmptyT({ text }: { text: string }) { return <View style={styles.empty}><Ionicons name="ellipse-outline" size={24} color={C.gold} /><Text style={styles.emptyText}>{text}</Text></View>; }

function Overview({ d, statusVal, statusLabel, onMessage, busy }: { d: CourseDetail; statusVal: string; statusLabel: string; onMessage: () => void; busy: boolean }) {
  return (
    <View>
      <Card>
        <Text style={styles.h3}>About this {TYPE_LABEL[d.type].toLowerCase()}</Text>
        {d.course.description ? <Text style={styles.body}>{d.course.description}</Text> : <Text style={styles.muted}>No description provided.</Text>}
        <View style={styles.statRow}>
          <Stat v={d.lessons.length} l="Lessons" />
          <Stat v={d.resources.length} l="Resources" />
          <Stat v={statusVal} l={statusLabel} />
        </View>
      </Card>
      <Card>
        <Text style={styles.h3}>Your Teacher</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {d.teacher?.avatar_url ? <Image source={{ uri: d.teacher.avatar_url }} style={styles.tAvatar} /> : <Initials name={d.teacherName} size={48} />}
          <View style={{ flex: 1 }}><Text style={styles.tName}>{d.teacherName}</Text>{d.teacher?.country ? <Text style={styles.muted}>{d.teacher.country}</Text> : null}</View>
        </View>
        {d.teacher?.bio ? <Text style={[styles.body, { marginTop: SPACE.sm }]}>{d.teacher.bio}</Text> : null}
        <Pressable onPress={onMessage} disabled={busy} style={{ marginTop: SPACE.md }}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            {busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.ctaText}>Message Teacher</Text>}
          </LinearGradient>
        </Pressable>
      </Card>
    </View>
  );
}

function Lessons({ d, completed, onToggle, busy }: { d: CourseDetail; completed: string[]; onToggle: (id: string) => void; busy: string | null }) {
  if (d.lessons.length === 0) return <EmptyT text="No lessons have been added to this course yet." />;
  return (
    <View>
      {d.lessons.map((l, i) => {
        const on = completed.includes(l.id);
        return (
          <View key={l.id} style={styles.lessonRow}>
            <Pressable onPress={() => onToggle(l.id)} disabled={busy === l.id || !d.enrollment} style={[styles.check, on && { backgroundColor: C.success, borderColor: C.success }]}>
              {busy === l.id ? <ActivityIndicator size="small" color={on ? C.white : C.forest} /> : on ? <Ionicons name="checkmark" size={16} color={C.white} /> : null}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTitle}>{i + 1}. {l.title}</Text>
              {l.duration_mins ? <Text style={styles.muted}>{l.duration_mins} min</Text> : null}
            </View>
            {l.video_url ? (
              <Pressable onPress={() => Linking.openURL(l.video_url)}>
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.watchBtn}><Text style={styles.watchText}>Watch</Text></LinearGradient>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Progress({ completed, total, pct, done }: { completed: number; total: number; pct: number; done: boolean }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACE.sm }}>
        <Text style={styles.h3}>Your Progress</Text>
        <Text style={[styles.progBig, { color: pct === 100 ? C.success : C.forest }]}>{pct}%</Text>
      </View>
      <View style={styles.bigTrack}><View style={[styles.bigFill, { width: `${pct}%`, backgroundColor: pct === 100 ? C.success : C.forest }]} /></View>
      <Text style={[styles.muted, { marginTop: SPACE.md }]}>{completed} of {total} lessons completed.{done ? ' 🎉 You have completed this course!' : ''}</Text>
    </Card>
  );
}

function Schedule({ d }: { d: CourseDetail }) {
  const b = d.booking;
  if (!b) return <EmptyT text="No session scheduled yet." />;
  return (
    <Card>
      <Text style={styles.h3}>Next Session</Text>
      <Text style={styles.body}>{b.start_date ? fmtDate(b.start_date) : 'Date TBC'}{b.session_time ? ` · ${b.session_time}` : ''}</Text>
      {d.joinUrl ? (
        <Pressable onPress={() => Linking.openURL(d.joinUrl!)} style={{ marginTop: SPACE.md }}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}><Text style={styles.ctaText}>Join Session</Text></LinearGradient>
        </Pressable>
      ) : <Text style={[styles.muted, { marginTop: SPACE.sm }]}>The join link appears here shortly before the lesson.</Text>}
    </Card>
  );
}

function Announcements({ list }: { list: any[] }) {
  if (!list.length) return <EmptyT text="No announcements yet." />;
  return (
    <View>
      {list.map((a) => (
        <Card key={a.id}>
          <Text style={styles.annTitle}>{a.title || 'Announcement'}</Text>
          {a.created_at ? <Text style={styles.annDate}>{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text> : null}
          <Text style={[styles.body, { marginTop: 6 }]}>{a.body || a.content || a.message || ''}</Text>
        </Card>
      ))}
    </View>
  );
}

function Notes({ value, onChange, onSave, saving, saved, disabled }: { value: string; onChange: (t: string) => void; onSave: () => void; saving: boolean; saved: boolean; disabled: boolean }) {
  return (
    <Card>
      <Text style={styles.h3}>My Notes</Text>
      <TextInput value={value} onChangeText={onChange} placeholder="Jot down what you want to focus on…" placeholderTextColor={C.faint} multiline style={styles.textArea} editable={!disabled} />
      {saved ? <Text style={styles.savedNote}>✓ Saved</Text> : null}
      <Pressable onPress={onSave} disabled={saving || disabled} style={{ marginTop: SPACE.sm, opacity: disabled ? 0.5 : 1 }}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}><Text style={styles.ctaText}>{saving ? 'Saving…' : 'Save Notes'}</Text></LinearGradient>
      </Pressable>
    </Card>
  );
}

function Homework({ list, onSubmit, busy }: { list: any[]; onSubmit: (id: string, text: string) => void; busy: string | null }) {
  if (!list.length) return <EmptyT text="No homework assigned yet." />;
  return <View>{list.map((h) => <HomeworkItem key={h.id} hw={h} busy={busy === h.id} onSubmit={onSubmit} />)}</View>;
}
function HomeworkItem({ hw, busy, onSubmit }: { hw: any; busy: boolean; onSubmit: (id: string, text: string) => void }) {
  const [text, setText] = useState(hw.submission_text || '');
  const submitted = hw.status === 'submitted' || hw.status === 'graded';
  return (
    <Card>
      <View style={styles.hwHead}>
        <Text style={styles.annTitle}>{hw.title}</Text>
        <View style={[styles.statusPill, { backgroundColor: submitted ? 'rgba(22,163,74,0.12)' : 'rgba(234,88,12,0.1)' }]}><Text style={[styles.statusPillText, { color: submitted ? C.success : C.orange }]}>{(hw.status || 'pending').toUpperCase()}</Text></View>
      </View>
      {hw.description ? <Text style={[styles.body, { marginTop: 4 }]}>{hw.description}</Text> : null}
      {hw.due_at ? <Text style={[styles.muted, { marginTop: 4 }]}>Due {new Date(hw.due_at).toLocaleDateString('en-GB')}</Text> : null}
      {hw.grade ? <Text style={styles.grade}>Grade: {hw.grade}{hw.feedback ? ` — ${hw.feedback}` : ''}</Text> : null}
      <TextInput value={text} onChangeText={setText} placeholder="Your submission…" placeholderTextColor={C.faint} multiline style={[styles.textArea, { marginTop: SPACE.sm }]} />
      <Pressable onPress={() => onSubmit(hw.id, text)} disabled={busy} style={{ marginTop: SPACE.sm }}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}><Text style={styles.ctaText}>{busy ? 'Saving…' : submitted ? 'Update Submission' : 'Submit Homework'}</Text></LinearGradient>
      </Pressable>
    </Card>
  );
}

function Assessments({ list }: { list: any[] }) {
  if (!list.length) return <EmptyT text="No assessments yet." />;
  return (
    <View>{list.map((a) => (
      <Card key={a.id}>
        <View style={styles.hwHead}>
          <View style={{ flex: 1 }}><Text style={styles.annTitle}>{a.title}</Text><Text style={styles.muted}>{(a.assessment_type || 'quiz').toUpperCase()} · {a.status}</Text></View>
          {a.score != null ? <Text style={styles.score}>{a.score}{a.max_score ? `/${a.max_score}` : ''}</Text> : null}
        </View>
        {a.notes ? <Text style={[styles.muted, { marginTop: 6 }]}>{a.notes}</Text> : null}
      </Card>
    ))}</View>
  );
}

function Reports({ list }: { list: any[] }) {
  if (!list.length) return <EmptyT text="No teacher reports yet." />;
  const fmt = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return s; } };
  return (
    <View>{list.map((r) => (
      <Card key={r.id}>
        <View style={styles.hwHead}>
          <Text style={styles.annTitle}>{r.period_start ? fmt(r.period_start) : ''} – {r.period_end ? fmt(r.period_end) : ''}</Text>
          {r.rating != null ? <Text style={styles.rating}>★ {r.rating}</Text> : null}
        </View>
        {r.summary ? <Text style={[styles.body, { marginTop: 4 }]}>{r.summary}</Text> : null}
        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
          {r.strengths ? <View style={[styles.repBox, { backgroundColor: 'rgba(22,163,74,0.06)' }]}><Text style={[styles.repLabel, { color: C.success }]}>STRENGTHS</Text><Text style={styles.repText}>{r.strengths}</Text></View> : null}
          {r.areas_to_improve ? <View style={[styles.repBox, { backgroundColor: 'rgba(201,162,39,0.06)' }]}><Text style={[styles.repLabel, { color: C.accent2 }]}>TO IMPROVE</Text><Text style={styles.repText}>{r.areas_to_improve}</Text></View> : null}
        </View>
        {(r.attendance_pct != null || r.lessons_total != null) ? <Text style={[styles.muted, { marginTop: SPACE.sm }]}>Attendance {r.attendance_pct ?? '—'}% · {r.lessons_attended ?? '—'}/{r.lessons_total ?? '—'} lessons</Text> : null}
      </Card>
    ))}</View>
  );
}

function Certificate({ d, pct }: { d: CourseDetail; pct: number }) {
  if (!d.isDone && pct < 100) return <EmptyT text="Complete all lessons to earn your certificate." />;
  const cert = d.certificate || {};
  const issued = cert.issued_at || d.enrollment?.completed_at;
  const issuedStr = issued ? new Date(issued).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const student = cert.student_name || d.studentName || 'Student';
  const courseName = cert.course_name || d.course.title;
  const teacher = cert.teacher_name || d.teacherName;
  return (
    <LinearGradient colors={['#C9A227', '#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.certBorder}>
      <View style={styles.certInner}>
        <Text style={styles.certBrand}>﷽</Text>
        <Text style={styles.certEyebrow}>MUDDARRIS · CERTIFICATE OF COMPLETION</Text>
        <View style={styles.certSeal}><Ionicons name="ribbon" size={30} color={C.gold} /></View>
        <Text style={styles.certCaption}>This certifies that</Text>
        <Text style={styles.certName}>{student}</Text>
        <View style={styles.certRule} />
        <Text style={styles.certCaption}>has successfully completed</Text>
        <Text style={styles.certCourse}>{courseName}</Text>
        {teacher ? <Text style={styles.certCaption}>under the guidance of {teacher}</Text> : null}
        {cert.certificate_type ? <View style={styles.certTypePill}><Text style={styles.certTypeText}>{String(cert.certificate_type).toUpperCase()}</Text></View> : null}
        <View style={styles.certMetaRow}>
          <View style={{ alignItems: 'center' }}><Text style={styles.certMetaLabel}>ISSUED</Text><Text style={styles.certMetaVal}>{issuedStr}</Text></View>
          {cert.certificate_number ? <View style={{ alignItems: 'center' }}><Text style={styles.certMetaLabel}>CERTIFICATE NO.</Text><Text style={styles.certMetaVal}>{cert.certificate_number}</Text></View> : null}
        </View>
        {cert.verify_code ? <Text style={styles.certVerify}>Verify code: {cert.verify_code}</Text> : null}
      </View>
    </LinearGradient>
  );
}

function Resources({ list }: { list: any[] }) {
  if (!list.length) return <EmptyT text="No resources shared yet." />;
  return (
    <View>
      {list.map((r) => (
        <Pressable key={r.id} onPress={() => r.url && Linking.openURL(r.url)} style={styles.resRow}>
          <Ionicons name="document-outline" size={18} color={C.gold} />
          <View style={{ flex: 1 }}><Text style={styles.resTitle}>{r.title}</Text><Text style={styles.muted}>{(r.resource_type || 'file').toUpperCase()}</Text></View>
          <Text style={styles.openText}>Open →</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) { return <View style={styles.statTile}><Text style={styles.statV}>{v}</Text><Text style={styles.statL}>{l}</Text></View>; }

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  back: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.forest, marginTop: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACE.md, paddingVertical: 8 },
  backText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.forest },
  hero: { borderRadius: RADIUS.lg, padding: SPACE.lg, ...SHADOW.card },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(201,162,39,0.9)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  typeBadgeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: '#3a2c05', letterSpacing: 0.5 },
  heroTitle: { fontFamily: FONT.displayBold, fontSize: 24, color: C.white, lineHeight: 30 },
  heroMeta: { fontFamily: FONT.body, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  heroProgRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  heroProgText: { fontFamily: FONT.body, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  heroProgPct: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.goldLight },
  heroTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  heroFill: { height: 6, borderRadius: 3, backgroundColor: C.goldLight },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACE.md },
  tabWrap: { borderRadius: RADIUS.md, overflow: 'hidden' },
  tabIdle: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, paddingHorizontal: 14, paddingVertical: 9 },
  tabIdleText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  tabOn: { paddingHorizontal: 14, paddingVertical: 9 },
  tabOnText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  h3: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink, marginBottom: 8 },
  body: { fontFamily: FONT.body, fontSize: 14, color: C.text, lineHeight: 21 },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  statRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  statTile: { flex: 1, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingVertical: SPACE.md, alignItems: 'center' },
  statV: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  statL: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 2 },
  tAvatar: { width: 48, height: 48, borderRadius: 24 },
  tName: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  cta: { borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  ctaText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm },
  check: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  lessonTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  watchBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8 },
  watchText: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.white },
  progBig: { fontFamily: FONT.displayBold, fontSize: 26 },
  bigTrack: { height: 12, borderRadius: 6, backgroundColor: '#EFEAD9', overflow: 'hidden' },
  bigFill: { height: 12, borderRadius: 6 },
  annTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  annDate: { fontFamily: FONT.body, fontSize: 11, color: C.faint, marginTop: 2 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm },
  resTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  openText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: SPACE.lg },

  textArea: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, padding: 12, fontFamily: FONT.body, fontSize: 14, color: C.ink, minHeight: 110, textAlignVertical: 'top', backgroundColor: C.white },
  savedNote: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.forest, marginTop: 8 },
  hwHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusPill: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillText: { fontFamily: FONT.bodyBold, fontSize: 10, letterSpacing: 0.4 },
  grade: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.success, marginTop: 6 },
  score: { fontFamily: FONT.displayBold, fontSize: 20, color: C.forest },
  rating: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.gold },
  repBox: { flex: 1, borderRadius: RADIUS.md, padding: SPACE.sm },
  repLabel: { fontFamily: FONT.bodyBold, fontSize: 10, marginBottom: 3, letterSpacing: 0.4 },
  repText: { fontFamily: FONT.body, fontSize: 12, color: C.text },

  certBorder: { borderRadius: RADIUS.xl, padding: 4, ...SHADOW.lg },
  certInner: { backgroundColor: '#FCFAF3', borderRadius: RADIUS.lg, paddingVertical: SPACE.section, paddingHorizontal: SPACE.lg, alignItems: 'center' },
  certBrand: { fontSize: 24, color: C.gold, marginBottom: 4 },
  certEyebrow: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.accent2, letterSpacing: 1.4, textAlign: 'center' },
  certSeal: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', marginVertical: SPACE.md },
  certCaption: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 6, textAlign: 'center' },
  certName: { fontFamily: FONT.displayBold, fontSize: 26, color: C.forest, marginTop: 4, textAlign: 'center' },
  certRule: { width: 160, height: 2, backgroundColor: C.gold, opacity: 0.5, marginTop: 6, marginBottom: 2 },
  certCourse: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginTop: 4, textAlign: 'center' },
  certTypePill: { backgroundColor: C.tintGold, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 4, marginTop: SPACE.md },
  certTypeText: { fontFamily: FONT.bodyBold, fontSize: 10, color: C.accent2, letterSpacing: 0.6 },
  certMetaRow: { flexDirection: 'row', gap: SPACE.section, marginTop: SPACE.lg },
  certMetaLabel: { fontFamily: FONT.bodyBold, fontSize: 9, color: C.faint, letterSpacing: 0.6 },
  certMetaVal: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.ink, marginTop: 2 },
  certVerify: { fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: SPACE.md },
});
