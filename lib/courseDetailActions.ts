// lib/courseDetailActions.ts — student course detail (mirrors web). Loads the
// course, the student's enrollment, the teacher, lessons, resources,
// announcements and the latest booking, and derives progress + join link.
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/db';

export type CType = 'trial' | 'recorded' | 'live' | 'program';
export interface CourseDetail {
  course: any; enrollment: any; teacher: any;
  lessons: any[]; resources: any[]; announcements: any[]; booking: any;
  type: CType; teacherName: string;
  completed: string[]; progressPct: number; isDone: boolean; joinUrl: string | null;
}

const safe = async (p: Promise<any>) => { try { return await p; } catch { return { data: null }; } };
const norm = (t: string): CType => (t === 'long' ? 'program' : (['trial', 'recorded', 'live', 'program'].includes(t) ? t : 'recorded')) as CType;

export async function fetchCourseDetail(courseId: string, uid: string): Promise<CourseDetail | null> {
  const sb = supabase as any;
  try {
    const { data: course } = await sb.from('courses').select('*').eq('id', courseId).single();
    if (!course) return null;
    const [enrRes, teacherRes, lessonsRes, resRes, annRes, bookingRes] = await Promise.all([
      safe(sb.from('enrollments').select('*').eq('student_id', uid).eq('course_id', courseId).maybeSingle()),
      course.teacher_id ? safe(sb.from('profiles').select('id, first_name, last_name, avatar_url, country, bio').eq('id', course.teacher_id).maybeSingle()) : Promise.resolve({ data: null }),
      safe(sb.from('course_lessons').select('*').eq('course_id', courseId).order('sort_order')),
      safe(sb.from('course_resources').select('*').eq('course_id', courseId)),
      safe(sb.from('course_announcements').select('*').eq('course_id', courseId).order('created_at', { ascending: false })),
      safe(sb.from('bookings').select('id, start_date, session_time, student_notes, status, lessons(daily_room_url, scheduled_at)').eq('course_id', courseId).eq('student_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle()),
    ]);
    const enrollment = enrRes.data;
    const teacher = teacherRes.data;
    const lessons = (lessonsRes.data as any[]) || [];
    const type = norm(enrollment?.product_type || course.product_type || 'recorded');
    const completed: string[] = Array.isArray(enrollment?.progress?.completed) ? enrollment.progress.completed : [];
    const progressPct = lessons.length ? Math.min(100, Math.round((completed.length / lessons.length) * 100)) : (enrollment?.status === 'completed' ? 100 : 0);
    const isDone = enrollment?.status === 'completed' || progressPct === 100;
    const booking = bookingRes.data;
    const joinUrl = booking?.lessons?.daily_room_url || null;
    const teacherName = teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Your teacher' : 'Your teacher';
    return {
      course, enrollment, teacher, lessons,
      resources: (resRes.data as any[]) || [], announcements: (annRes.data as any[]) || [], booking,
      type, teacherName, completed, progressPct, isDone, joinUrl,
    };
  } catch { return null; }
}

export async function markLessonProgress(enrollmentId: string, lessonId: string, completed: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/enrollments/progress`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, lessonId, completed }),
    });
    return res.ok;
  } catch { return false; }
}
