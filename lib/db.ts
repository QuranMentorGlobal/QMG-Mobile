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
