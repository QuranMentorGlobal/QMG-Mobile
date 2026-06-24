// lib/db.ts
// Query helpers that mirror the web app's exact tables/columns so the mobile app
// shows real data. Uses (supabase as any) like the web app (strict:false + generated
// types not always matching runtime schema).

import { supabase } from '@/lib/supabase';

export interface PublicTeacher {
  id: string;
  slug: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  years_experience: number | null;
  avg_rating: number | null;
  bio: string | null;
  specializations: string[] | null;
  teaching_languages: string[] | null;
  total_lessons: number | null;
  total_reviews: number | null;
  hourly_rate_usd: number | null;
  trial_rate_usd: number | null;
}

export interface Booking {
  id: string;
  status: string | null;
  total_lessons: number | null;
  lessons_completed: number | null;
  student_id: string | null;
  teacher_id: string | null;
  created_at: string | null;
}

export interface Lesson {
  id: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  status: string | null;
  daily_room_url: string | null;
  booking_id: string | null;
}

export async function fetchTeachers(): Promise<PublicTeacher[]> {
  const { data } = await (supabase as any)
    .from('public_teachers')
    .select('*')
    .order('avg_rating', { ascending: false })
    .limit(50);
  return (data as PublicTeacher[]) ?? [];
}

export async function fetchStudentBookings(studentId: string): Promise<Booking[]> {
  const { data } = await (supabase as any)
    .from('bookings')
    .select('id, status, total_lessons, lessons_completed, student_id, teacher_id, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  return (data as Booking[]) ?? [];
}

export async function fetchTeacherBookings(teacherId: string): Promise<Booking[]> {
  const { data } = await (supabase as any)
    .from('bookings')
    .select('id, status, total_lessons, lessons_completed, student_id, teacher_id, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  return (data as Booking[]) ?? [];
}

export async function fetchUpcomingLessons(bookingIds: string[]): Promise<Lesson[]> {
  if (bookingIds.length === 0) return [];
  const { data } = await (supabase as any)
    .from('lessons')
    .select('id, scheduled_at, duration_mins, status, daily_room_url, booking_id')
    .in('booking_id', bookingIds)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10);
  return (data as Lesson[]) ?? [];
}

export async function countCompletedLessons(bookingIds: string[]): Promise<number> {
  if (bookingIds.length === 0) return 0;
  const { count } = await (supabase as any)
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .in('booking_id', bookingIds)
    .eq('status', 'completed');
  return count ?? 0;
}

export interface Child {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

// Parent -> children via parent_children mapping -> profiles.
export async function fetchChildren(parentId: string): Promise<Child[]> {
  const { data: links } = await (supabase as any)
    .from('parent_children')
    .select('student_id')
    .eq('parent_id', parentId);
  const ids = (links ?? []).map((l: any) => l.student_id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', ids);
  return (data as Child[]) ?? [];
}

export function teacherName(t: PublicTeacher): string {
  return [t.first_name, t.last_name].filter(Boolean).join(' ') || 'Teacher';
}

// ── Dashboard extras (defensive: return 0 on any schema mismatch) ───────────────

export async function countTodayLessons(bookingIds: string[]): Promise<number> {
  if (bookingIds.length === 0) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  try {
    const { count } = await (supabase as any)
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .in('booking_id', bookingIds)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString());
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Tries the teacher_earnings ledger; returns 0 if the table/columns differ.
export async function fetchTeacherEarnings(teacherId: string): Promise<number> {
  try {
    const { data } = await (supabase as any)
      .from('teacher_earnings')
      .select('amount, net_amount')
      .eq('teacher_id', teacherId);
    if (!data) return 0;
    return (data as any[]).reduce((sum, r) => sum + Number(r.net_amount ?? r.amount ?? 0), 0);
  } catch {
    return 0;
  }
}

// ── Role dashboard aggregates ───────────────────────────────────────────────
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export interface NamedLesson {
  id: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  status: string | null;
  teacherName: string;
  teacherAvatar: string | null;
  title: string;
}

export interface MyTeacher {
  teacher_id: string;
  name: string;
  avatar_url: string | null;
  status: string | null;
  total: number;
  done: number;
}

export interface StudentDash {
  hifzLevel: number;
  tajweedLevel: number;
  coursesCompleted: number;
  activeBookings: number;
  upcoming: NamedLesson[];
  myTeachers: MyTeacher[];
}

async function resolveTeachers(ids: string[]): Promise<Record<string, { name: string; avatar: string | null }>> {
  const map: Record<string, { name: string; avatar: string | null }> = {};
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return map;
  const { data } = await (supabase as any).from('public_teachers').select('id, first_name, last_name, avatar_url').in('id', uniq);
  (data ?? []).forEach((t: any) => { map[t.id] = { name: [t.first_name, t.last_name].filter(Boolean).join(' ') || 'Teacher', avatar: t.avatar_url ?? null }; });
  return map;
}

export async function fetchStudentDash(uid: string): Promise<StudentDash> {
  const prof = await safe(async () => {
    const { data } = await (supabase as any).from('profiles').select('hifz_level, tajweed_level').eq('id', uid).single();
    return data as any;
  }, null);

  const bookings = await fetchStudentBookings(uid);
  const activeBookings = bookings.filter((b) => ['confirmed', 'active', 'pending'].includes((b.status ?? '').toLowerCase())).length;

  const coursesCompleted = await safe(async () => {
    const { count } = await (supabase as any).from('enrollments').select('id', { count: 'exact', head: true }).eq('student_id', uid).eq('status', 'completed');
    return count ?? 0;
  }, 0);

  const upcoming = await safe(async () => {
    const { data } = await (supabase as any).from('lessons')
      .select('id, scheduled_at, duration_mins, status, teacher_id')
      .eq('student_id', uid).in('status', ['scheduled', 'live']).gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true }).limit(5);
    const rows = (data as any[]) ?? [];
    const tmap = await resolveTeachers(rows.map((r) => r.teacher_id));
    return rows.map((r) => ({
      id: r.id, scheduled_at: r.scheduled_at, duration_mins: r.duration_mins, status: r.status,
      teacherName: tmap[r.teacher_id]?.name ?? 'Teacher', teacherAvatar: tmap[r.teacher_id]?.avatar ?? null, title: 'Quran Lesson',
    }));
  }, []);

  const myTeachers = await safe(async () => {
    const top = bookings.slice(0, 5);
    const tmap = await resolveTeachers(top.map((b) => b.teacher_id ?? ''));
    return top.map((b) => ({
      teacher_id: b.teacher_id ?? '', name: tmap[b.teacher_id ?? '']?.name ?? 'Teacher', avatar_url: tmap[b.teacher_id ?? '']?.avatar ?? null,
      status: b.status, total: b.total_lessons ?? 0, done: b.lessons_completed ?? 0,
    }));
  }, []);

  return {
    hifzLevel: prof?.hifz_level ?? 0,
    tajweedLevel: prof?.tajweed_level ?? 0,
    coursesCompleted, activeBookings, upcoming, myTeachers,
  };
}

export interface TeacherDash {
  totalStudents: number;
  todayLessons: number;
  earnings: number;
  pending: number;
  taught: number;
  upcoming: number;
  courses: { trial: number; live: number; recorded: number; enrolments: number };
}

export async function fetchTeacherDash(uid: string): Promise<TeacherDash> {
  const bookings = await fetchTeacherBookings(uid);
  const ids = bookings.map((b) => b.id);
  const [today, taught, up, earnings] = await Promise.all([
    countTodayLessons(ids), countCompletedLessons(ids), fetchUpcomingLessons(ids), fetchTeacherEarnings(uid),
  ]);
  const totalStudents = new Set(bookings.filter((b) => ['confirmed', 'active'].includes((b.status ?? '').toLowerCase())).map((b) => b.student_id)).size;
  const pending = bookings.filter((b) => (b.status ?? '').toLowerCase() === 'pending').length;

  const courses = await safe(async () => {
    const { data } = await (supabase as any).from('courses').select('id, product_type').eq('teacher_id', uid);
    const rows = (data as any[]) ?? [];
    const by = (t: string) => rows.filter((r) => (r.product_type ?? '') === t).length;
    let enrolments = 0;
    if (rows.length) {
      const { count } = await (supabase as any).from('enrollments').select('id', { count: 'exact', head: true }).in('course_id', rows.map((r) => r.id));
      enrolments = count ?? 0;
    }
    return { trial: by('trial'), live: by('live'), recorded: by('recorded'), enrolments };
  }, { trial: 0, live: 0, recorded: 0, enrolments: 0 });

  return { totalStudents, todayLessons: today, earnings, pending, taught, upcoming: up.length, courses };
}

export interface ParentDash {
  children: Child[];
  lessonsThisMonth: number;
  spentThisMonth: number;
  childStats: Record<string, { done: number; upcoming: number; attendance: number }>;
  recorded: number;
  live: number;
}

export async function fetchParentDash(uid: string): Promise<ParentDash> {
  const children = await fetchChildren(uid);
  const ids = children.map((c) => c.id);
  if (!ids.length) return { children, lessonsThisMonth: 0, spentThisMonth: 0, childStats: {}, recorded: 0, live: 0 };

  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);

  const lessonsThisMonth = await safe(async () => {
    const { count } = await (supabase as any).from('lessons').select('id', { count: 'exact', head: true })
      .in('student_id', ids).eq('status', 'completed').gte('scheduled_at', start.toISOString());
    return count ?? 0;
  }, 0);

  const childStats = await safe(async () => {
    const out: Record<string, { done: number; upcoming: number; attendance: number }> = {};
    for (const c of children) {
      const [{ count: done }, { count: up }] = await Promise.all([
        (supabase as any).from('lessons').select('id', { count: 'exact', head: true }).eq('student_id', c.id).eq('status', 'completed'),
        (supabase as any).from('lessons').select('id', { count: 'exact', head: true }).eq('student_id', c.id).in('status', ['scheduled', 'live']).gte('scheduled_at', new Date().toISOString()),
      ]);
      out[c.id] = { done: done ?? 0, upcoming: up ?? 0, attendance: 0 };
    }
    return out;
  }, {});

  return { children, lessonsThisMonth, spentThisMonth: 0, childStats, recorded: 0, live: 0 };
}

// ── Student inner pages ─────────────────────────────────────────────────────

export interface FullLesson {
  id: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  status: string | null;
  daily_room_url: string | null;
  teacherName: string;
  teacherAvatar: string | null;
}

export async function fetchStudentLessons(uid: string): Promise<FullLesson[]> {
  const { data } = await (supabase as any).from('lessons')
    .select('id, scheduled_at, duration_mins, status, daily_room_url, teacher_id')
    .eq('student_id', uid).order('scheduled_at', { ascending: false }).limit(100);
  const rows = (data as any[]) ?? [];
  const tmap = await resolveTeachers(rows.map((r) => r.teacher_id));
  return rows.map((r) => ({
    id: r.id, scheduled_at: r.scheduled_at, duration_mins: r.duration_mins, status: r.status, daily_room_url: r.daily_room_url,
    teacherName: tmap[r.teacher_id]?.name ?? 'Teacher', teacherAvatar: tmap[r.teacher_id]?.avatar ?? null,
  }));
}

export interface Payment { id: string; gross_amount_usd: number; status: string; payment_type: string | null; description: string | null; created_at: string; }
export interface RefundRow { id: string; amount_usd: number; reason: string | null; created_at: string; }

export async function fetchPayments(uid: string): Promise<Payment[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('payments')
      .select('id, gross_amount_usd, status, payment_type, description, created_at')
      .eq('student_id', uid).eq('status', 'succeeded').order('created_at', { ascending: false }).limit(50);
    return (data as Payment[]) ?? [];
  }, []);
}

export async function fetchRefunds(uid: string): Promise<RefundRow[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('booking_refunds')
      .select('id, amount_usd, reason, created_at').eq('student_id', uid).order('created_at', { ascending: false }).limit(50);
    return (data as RefundRow[]) ?? [];
  }, []);
}

export interface Conversation {
  id: string; otherName: string; otherAvatar: string | null; otherRole: string;
  last_message: string | null; last_message_at: string | null; unread: number;
}

export async function fetchConversations(uid: string): Promise<Conversation[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('conversations')
      .select('id, participant_1, participant_2, last_message, last_message_at')
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order('last_message_at', { ascending: false, nullsFirst: false }).limit(50);
    const rows = (data as any[]) ?? [];
    if (!rows.length) return [];
    const otherIds = rows.map((c) => (c.participant_1 === uid ? c.participant_2 : c.participant_1));
    const { data: profs } = await (supabase as any).from('profiles').select('id, first_name, last_name, role, avatar_url').in('id', otherIds);
    const pmap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { pmap[p.id] = p; });
    const { data: unreadRows } = await (supabase as any).from('messages')
      .select('conversation_id').in('conversation_id', rows.map((c) => c.id)).eq('is_read', false).neq('sender_id', uid);
    const unreadMap: Record<string, number> = {};
    (unreadRows ?? []).forEach((m: any) => { unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1; });
    return rows.map((c) => {
      const oid = c.participant_1 === uid ? c.participant_2 : c.participant_1;
      const p = pmap[oid] ?? {};
      return {
        id: c.id, otherName: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'User', otherAvatar: p.avatar_url ?? null,
        otherRole: p.role ?? '', last_message: c.last_message, last_message_at: c.last_message_at, unread: unreadMap[c.id] ?? 0,
      };
    });
  }, []);
}

export interface ChatMessage { id: string; sender_id: string; body: string; created_at: string; }

export async function fetchMessages(convId: string): Promise<ChatMessage[]> {
  const { data } = await (supabase as any).from('messages')
    .select('id, sender_id, body, created_at').eq('conversation_id', convId).order('created_at', { ascending: true }).limit(200);
  return (data as ChatMessage[]) ?? [];
}

export async function markRead(convId: string, uid: string): Promise<void> {
  await safe(async () => {
    await (supabase as any).from('messages').update({ is_read: true }).eq('conversation_id', convId).neq('sender_id', uid);
    return null;
  }, null);
}

export async function sendMessage(convId: string, uid: string, body: string): Promise<boolean> {
  return safe(async () => {
    const { error } = await (supabase as any).from('messages').insert({ conversation_id: convId, sender_id: uid, body });
    if (error) return false;
    await (supabase as any).from('conversations').update({ last_message: body, last_message_at: new Date().toISOString() }).eq('id', convId);
    return true;
  }, false);
}

export interface Ticket { id: string; subject: string; category: string; message: string; status: string; priority: string; created_at: string; }

export async function fetchTickets(uid: string): Promise<Ticket[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('support_tickets')
      .select('id, subject, category, message, status, priority, created_at')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
    return (data as Ticket[]) ?? [];
  }, []);
}

export async function createTicket(uid: string, t: { subject: string; category: string; message: string; priority: string }): Promise<boolean> {
  return safe(async () => {
    const { error } = await (supabase as any).from('support_tickets')
      .insert({ user_id: uid, subject: t.subject, category: t.category, message: t.message, priority: t.priority, status: 'open' });
    return !error;
  }, false);
}

// ── Teacher inner pages ─────────────────────────────────────────────────────

async function resolveStudentsMap(ids: string[]): Promise<Record<string, { name: string; avatar: string | null }>> {
  const map: Record<string, { name: string; avatar: string | null }> = {};
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return map;
  const { data } = await (supabase as any).from('profiles').select('id, first_name, last_name, avatar_url').in('id', uniq);
  (data ?? []).forEach((p: any) => { map[p.id] = { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Student', avatar: p.avatar_url ?? null }; });
  return map;
}

export interface TeacherCourse {
  id: string; title: string; product_type: string | null; price_usd: number | null; is_free: boolean | null;
  is_active: boolean | null; thumbnail_url: string | null; category: string | null; enrolments: number;
}

export async function fetchTeacherCourses(uid: string): Promise<TeacherCourse[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('courses').select('*').eq('teacher_id', uid).order('created_at', { ascending: false });
    const rows = (data as any[]) ?? [];
    const counts: Record<string, number> = {};
    if (rows.length) {
      const { data: enr } = await (supabase as any).from('enrollments').select('course_id').in('course_id', rows.map((r) => r.id));
      (enr ?? []).forEach((e: any) => { counts[e.course_id] = (counts[e.course_id] ?? 0) + 1; });
    }
    return rows.map((c) => ({
      id: c.id, title: c.title ?? 'Untitled course', product_type: c.product_type ?? null, price_usd: c.price_usd ?? null,
      is_free: c.is_free ?? null, is_active: c.is_active ?? null, thumbnail_url: c.thumbnail_url ?? null, category: c.category ?? null,
      enrolments: counts[c.id] ?? 0,
    }));
  }, []);
}

export interface TeacherLesson {
  id: string; scheduled_at: string | null; duration_mins: number | null; status: string | null; daily_room_url: string | null;
  studentName: string; studentAvatar: string | null;
}

export async function fetchTeacherLessons(uid: string): Promise<TeacherLesson[]> {
  const { data } = await (supabase as any).from('lessons')
    .select('id, scheduled_at, duration_mins, status, daily_room_url, student_id')
    .eq('teacher_id', uid).order('scheduled_at', { ascending: false }).limit(100);
  const rows = (data as any[]) ?? [];
  const smap = await resolveStudentsMap(rows.map((r) => r.student_id));
  return rows.map((r) => ({
    id: r.id, scheduled_at: r.scheduled_at, duration_mins: r.duration_mins, status: r.status, daily_room_url: r.daily_room_url,
    studentName: smap[r.student_id]?.name ?? 'Student', studentAvatar: smap[r.student_id]?.avatar ?? null,
  }));
}

export interface TeacherStudent {
  id: string; name: string; avatar: string | null; bookings: number; active: number; trials: number;
}

export async function fetchTeacherStudents(uid: string): Promise<TeacherStudent[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('bookings').select('id, status, is_trial, student_id').eq('teacher_id', uid);
    const rows = (data as any[]) ?? [];
    const smap = await resolveStudentsMap(rows.map((r) => r.student_id));
    const map: Record<string, TeacherStudent> = {};
    rows.forEach((b) => {
      if (!b.student_id) return;
      if (!map[b.student_id]) map[b.student_id] = { id: b.student_id, name: smap[b.student_id]?.name ?? 'Student', avatar: smap[b.student_id]?.avatar ?? null, bookings: 0, active: 0, trials: 0 };
      const s = map[b.student_id];
      s.bookings++;
      if (['confirmed', 'active'].includes((b.status ?? '').toLowerCase())) s.active++;
      if (b.is_trial) s.trials++;
    });
    return Object.values(map);
  }, []);
}

export interface Earning {
  id: string; gross_amount_usd: number; commission_usd: number; net_amount_usd: number; status: string;
  created_at: string; payment_type: string | null;
}

export async function fetchEarningsLedger(uid: string): Promise<Earning[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('teacher_earnings')
      .select('id, gross_amount_usd, commission_usd, net_amount_usd, status, created_at, payment_type')
      .eq('teacher_id', uid).order('created_at', { ascending: false }).limit(100);
    return (data as Earning[]) ?? [];
  }, []);
}

export interface MonthCount { label: string; value: number }

export async function fetchTeacherLessonTrend(uid: string): Promise<MonthCount[]> {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const buckets: MonthCount[] = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.push({ label: M[d.getMonth()], value: 0 }); }
  await safe(async () => {
    const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const { data } = await (supabase as any).from('lessons').select('scheduled_at, status').eq('teacher_id', uid).eq('status', 'completed').gte('scheduled_at', since.toISOString());
    (data ?? []).forEach((l: any) => {
      if (!l.scheduled_at) return;
      const d = new Date(l.scheduled_at);
      const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 5;
      if (idx >= 0 && idx < 6) buckets[idx].value++;
    });
    return null;
  }, null);
  return buckets;
}
