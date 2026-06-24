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
