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

export interface ChatMessage { id: string; sender_id: string; body: string; created_at: string; attachment_url?: string | null; attachment_type?: string | null; attachment_name?: string | null; }

export async function fetchMessages(convId: string): Promise<ChatMessage[]> {
  const { data } = await (supabase as any).from('messages')
    .select('id, sender_id, body, created_at, attachment_url, attachment_type, attachment_name').eq('conversation_id', convId).order('created_at', { ascending: true }).limit(200);
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

// ── Parent inner pages ──────────────────────────────────────────────────────

export interface ParentPayment { id: string; gross_amount_usd: number; created_at: string; childName: string; payment_type: string | null; }
export interface ParentRefund { id: string; amount_usd: number; reason: string | null; created_at: string; childName: string; }

export async function fetchParentBilling(parentId: string): Promise<{ payments: ParentPayment[]; refunds: ParentRefund[]; total: number; refunded: number }> {
  return safe(async () => {
    const kids = await fetchChildren(parentId);
    const ids = kids.map((k) => k.id);
    const nameOf = (id: string) => { const k = kids.find((c) => c.id === id); return k ? [k.first_name, k.last_name].filter(Boolean).join(' ') || 'Child' : 'Child'; };
    if (!ids.length) return { payments: [], refunds: [], total: 0, refunded: 0 };

    const [{ data: pays }, { data: refs }] = await Promise.all([
      (supabase as any).from('payments').select('id, gross_amount_usd, created_at, student_id, payment_type').in('student_id', ids).eq('status', 'succeeded').order('created_at', { ascending: false }).limit(60),
      (supabase as any).from('booking_refunds').select('id, amount_usd, reason, created_at, student_id').in('student_id', ids).order('created_at', { ascending: false }).limit(40),
    ]);
    const payments: ParentPayment[] = (pays ?? []).map((p: any) => ({ id: p.id, gross_amount_usd: Number(p.gross_amount_usd ?? 0), created_at: p.created_at, childName: nameOf(p.student_id), payment_type: p.payment_type ?? null }));
    const refunds: ParentRefund[] = (refs ?? []).map((r: any) => ({ id: r.id, amount_usd: Number(r.amount_usd ?? 0), reason: r.reason ?? null, created_at: r.created_at, childName: nameOf(r.student_id) }));
    return {
      payments, refunds,
      total: payments.reduce((s, p) => s + p.gross_amount_usd, 0),
      refunded: refunds.reduce((s, r) => s + r.amount_usd, 0),
    };
  }, { payments: [], refunds: [], total: 0, refunded: 0 });
}

export interface ChildDetail {
  id: string; name: string; email: string | null; hifzLevel: number; tajweedLevel: number;
  done: number; upcoming: number; recent: { id: string; scheduled_at: string | null; status: string | null }[];
}

export async function fetchChildDetail(childId: string): Promise<ChildDetail | null> {
  return safe(async () => {
    const { data: p } = await (supabase as any).from('profiles').select('id, first_name, last_name, email, hifz_level, tajweed_level').eq('id', childId).single();
    if (!p) return null;
    const [{ count: done }, { count: up }, { data: recent }] = await Promise.all([
      (supabase as any).from('lessons').select('id', { count: 'exact', head: true }).eq('student_id', childId).eq('status', 'completed'),
      (supabase as any).from('lessons').select('id', { count: 'exact', head: true }).eq('student_id', childId).in('status', ['scheduled', 'live']).gte('scheduled_at', new Date().toISOString()),
      (supabase as any).from('lessons').select('id, scheduled_at, status').eq('student_id', childId).order('scheduled_at', { ascending: false }).limit(6),
    ]);
    return {
      id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Child', email: p.email ?? null,
      hifzLevel: p.hifz_level ?? 0, tajweedLevel: p.tajweed_level ?? 0, done: done ?? 0, upcoming: up ?? 0,
      recent: (recent as any[]) ?? [],
    };
  }, null);
}

export async function addChildByEmail(parentId: string, email: string): Promise<{ ok: boolean; error?: string }> {
  return safe(async () => {
    const { data: prof } = await (supabase as any).from('profiles').select('id, role').eq('email', email.trim().toLowerCase()).maybeSingle();
    if (!prof) return { ok: false, error: 'No account found with that email.' };
    if (prof.role !== 'student') return { ok: false, error: 'That account is not a student account.' };
    const { error } = await (supabase as any).from('parent_children').insert({ parent_id: parentId, child_id: prof.id });
    if (error) return { ok: false, error: 'Could not link this child (they may already be linked).' };
    return { ok: true };
  }, { ok: false, error: 'Something went wrong. Please try again.' });
}

// ── Booking workflow (Teachers · Detail · Booking · Checkout) ────────────────

export const API_BASE = 'https://www.quranmentorglobal.com';

export interface TeacherDetail {
  id: string; name: string; firstName: string; avatar_url: string | null; country: string | null;
  years_experience: number | null; avg_rating: number | null; total_lessons: number; total_reviews: number;
  bio: string | null; specializations: string[]; teaching_languages: string[]; available_days: string[];
  hourly_rate_usd: number | null; trial_rate_usd: number | null; intro_video_url: string | null; badge_keys: string[];
  email_verified: boolean; phone_verified: boolean; identity_verified: boolean; quran_mentor_verified: boolean; ijazah_verified: boolean;
}

export async function fetchTeacherDetail(id: string): Promise<TeacherDetail | null> {
  return safe(async () => {
    const { data: pt } = await (supabase as any).from('public_teachers').select('*').eq('id', id).single();
    if (!pt) return null;
    return {
      id: pt.id, name: [pt.first_name, pt.last_name].filter(Boolean).join(' ') || 'Teacher', firstName: pt.first_name || 'this teacher',
      avatar_url: pt.avatar_url ?? null, country: pt.country ?? null, years_experience: pt.years_experience ?? null,
      avg_rating: pt.avg_rating ?? null, total_lessons: pt.total_lessons ?? 0, total_reviews: pt.total_reviews ?? 0,
      bio: pt.bio ?? null, specializations: pt.specializations ?? [], teaching_languages: pt.teaching_languages ?? [],
      available_days: pt.available_days ?? [], hourly_rate_usd: pt.hourly_rate_usd ?? null, trial_rate_usd: pt.trial_rate_usd ?? null,
      intro_video_url: pt.intro_video_url ?? null, badge_keys: pt.badge_keys ?? [],
      email_verified: !!pt.email_verified, phone_verified: !!pt.phone_verified, identity_verified: !!pt.identity_verified,
      quran_mentor_verified: !!pt.quran_mentor_verified, ijazah_verified: !!pt.ijazah_verified,
    };
  }, null);
}

export interface BookingCourse {
  id: string; title: string; category: string | null; description: string | null;
  price_usd: number; is_free: boolean; duration_mins: number; product_type: string; lessons: number;
}

export async function fetchBookingCourses(teacherId: string): Promise<{ trial: BookingCourse[]; recorded: BookingCourse[]; live: BookingCourse[]; program: BookingCourse[] }> {
  return safe(async () => {
    const { data } = await (supabase as any).from('courses')
      .select('id, title, category, description, price_usd, is_free, duration_mins, product_type')
      .eq('teacher_id', teacherId).eq('is_active', true);
    const rows = (data as any[]) ?? [];
    const ids = rows.map((r) => r.id);
    const dur: Record<string, number> = {};
    const lessons: Record<string, number> = {};
    if (ids.length) {
      const [{ data: td }, { data: cl }] = await Promise.all([
        (supabase as any).from('trial_course_details').select('course_id, duration_mins').in('course_id', ids),
        (supabase as any).from('course_lessons').select('course_id').in('course_id', ids),
      ]);
      (td ?? []).forEach((d: any) => { if (d.duration_mins) dur[d.course_id] = d.duration_mins; });
      (cl ?? []).forEach((l: any) => { lessons[l.course_id] = (lessons[l.course_id] ?? 0) + 1; });
    }
    const map = (r: any): BookingCourse => ({
      id: r.id, title: r.title ?? 'Course', category: r.category ?? null, description: r.description ?? null,
      price_usd: Number(r.price_usd ?? 0), is_free: !!r.is_free, duration_mins: dur[r.id] ?? r.duration_mins ?? 30,
      product_type: r.product_type ?? 'trial', lessons: lessons[r.id] ?? 0,
    });
    return {
      trial: rows.filter((r) => r.product_type === 'trial').map(map),
      recorded: rows.filter((r) => r.product_type === 'recorded').map(map),
      live: rows.filter((r) => r.product_type === 'live').map(map),
      program: rows.filter((r) => r.product_type === 'program').map(map),
    };
  }, { trial: [], recorded: [], live: [], program: [] });
}

export async function createBooking(args: {
  studentId: string; teacherId: string; courseId: string; startDate: string; sessionTime: string;
  durationMins: number; priceUsd: number; notes: string;
}): Promise<{ ok: boolean; bookingId?: string; error?: string }> {
  return safe(async () => {
    const { data, error } = await (supabase as any).from('bookings').insert({
      student_id: args.studentId, teacher_id: args.teacherId, course_id: args.courseId,
      status: 'pending', start_date: args.startDate, session_time: args.sessionTime,
      recurrence: 'once', duration_mins: args.durationMins, price_usd: args.priceUsd, is_trial: true,
      student_notes: args.notes.trim() || null,
    }).select('id').single();
    if (error || !data) return { ok: false, error: error?.message || 'Could not create booking.' };
    // best-effort teacher notification
    try {
      await (supabase as any).from('notifications').insert({
        user_id: args.teacherId, type: 'booking_confirmed', title: 'New Trial Request',
        body: `${args.priceUsd === 0 ? 'Free trial' : `$${args.priceUsd} trial`} booked for ${new Date(args.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${args.sessionTime}`,
        href: '/platform/teacher/bookings?tab=pending',
      });
    } catch {}
    return { ok: true, bookingId: data.id };
  }, { ok: false, error: 'Could not create booking.' });
}

export async function processCardPayment(args: {
  bookingId: string; amount: number; brand: string; last4: string; name: string;
}): Promise<{ ok: boolean; declined?: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/payments/process`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: args.bookingId, provider: 'stripe', methodType: 'card',
        amount: Math.round(args.amount * 100), currency: 'usd',
        cardMeta: { last4: args.last4, brand: args.brand, name: args.name },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'failed') return { ok: false, error: json.error || 'Payment could not be processed.' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error during payment.' };
  }
}

// ── Attachments · Notifications · Wallet · Free enrolment ────────────────────

export async function uploadToAttachments(uri: string, contentType: string, ext: string): Promise<string | null> {
  return safe(async () => {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const path = `mobile/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await (supabase as any).storage.from('attachments').upload(path, blob, { contentType, upsert: false });
    if (error) return null;
    const { data } = (supabase as any).storage.from('attachments').getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, null);
}

export async function sendAttachmentMessage(convId: string, uid: string, att: { url: string; type: string; name: string }, body = ''): Promise<boolean> {
  return safe(async () => {
    const { error } = await (supabase as any).from('messages').insert({
      conversation_id: convId, sender_id: uid, body,
      attachment_url: att.url, attachment_type: att.type, attachment_name: att.name,
    });
    if (error) return false;
    await (supabase as any).from('conversations').update({ last_message: att.type.startsWith('audio') ? '🎤 Voice note' : att.type.startsWith('image') ? '📷 Photo' : '📎 Attachment', last_message_at: new Date().toISOString() }).eq('id', convId);
    return true;
  }, false);
}

export interface AppNotification { id: string; type: string | null; title: string | null; body: string | null; href: string | null; is_read: boolean; created_at: string; }

export async function fetchNotifications(uid: string): Promise<AppNotification[]> {
  return safe(async () => {
    const { data } = await (supabase as any).from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60);
    return ((data as any[]) ?? []).map((n) => ({ id: n.id, type: n.type ?? null, title: n.title ?? null, body: n.body ?? null, href: n.href ?? null, is_read: !!n.is_read, created_at: n.created_at }));
  }, []);
}

export async function markNotificationRead(id: string): Promise<void> {
  await safe(async () => { await (supabase as any).from('notifications').update({ is_read: true }).eq('id', id); return null; }, null);
}
export async function markAllNotificationsRead(uid: string): Promise<void> {
  await safe(async () => { await (supabase as any).from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false); return null; }, null);
}
export async function countUnreadNotifications(uid: string): Promise<number> {
  return safe(async () => {
    const { count } = await (supabase as any).from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
    return count ?? 0;
  }, 0);
}

export async function walletInitiate(args: { bookingId: string; provider: 'jazzcash' | 'easypaisa'; amount: number; walletNumber: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/payments/wallet/initiate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: args.bookingId, provider: args.provider, amount: Math.round(args.amount * 100), walletNumber: args.walletNumber }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error || 'Could not initiate wallet payment.' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error.' };
  }
}

export async function enrollFreeCourse(args: { studentId: string; courseId: string; productType: string; }): Promise<{ ok: boolean; error?: string }> {
  return safe(async () => {
    const { error } = await (supabase as any).from('enrollments').insert({
      student_id: args.studentId, course_id: args.courseId,
      product_type: args.productType === 'program' ? 'live' : args.productType,
      price_paid_usd: 0, status: 'active',
    });
    if (error) return { ok: false, error: 'Could not enrol (you may already be enrolled).' };
    return { ok: true };
  }, { ok: false, error: 'Could not enrol.' });
}

// Paid recorded-course purchase: mirror web — enrollment (pending) + booking
// (is_trial:false) → checkout via /api/payments/process. Trigger confirms on pay.
export async function purchaseRecordedCourse(args: {
  studentId: string; teacherId: string; courseId: string; title: string; priceUsd: number;
}): Promise<{ ok: boolean; bookingId?: string; error?: string }> {
  return safe(async () => {
    await (supabase as any).from('enrollments').insert({
      course_id: args.courseId, student_id: args.studentId, product_type: 'recorded',
      price_paid_usd: args.priceUsd, status: 'pending',
    });
    try {
      await (supabase as any).from('notifications').insert({
        user_id: args.teacherId, type: 'booking_confirmed', title: 'New Course Purchase',
        body: `A student purchased your recorded course "${args.title}"`, href: '/platform/teacher/bookings?tab=confirmed',
      });
    } catch {}
    const { data, error } = await (supabase as any).from('bookings').insert({
      student_id: args.studentId, teacher_id: args.teacherId, course_id: args.courseId,
      status: 'pending', start_date: new Date().toISOString().split('T')[0], session_time: '00:00',
      recurrence: 'once', price_usd: args.priceUsd, is_trial: false,
    }).select('id').single();
    if (error || !data) return { ok: false, error: error?.message || 'Could not start purchase.' };
    return { ok: true, bookingId: data.id };
  }, { ok: false, error: 'Could not start purchase.' });
}
