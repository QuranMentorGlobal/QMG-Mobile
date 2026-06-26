// lib/studentCoursesActions.ts — student "Courses" data (mirrors web). Aggregates
// the student's enrollments, joins course + lesson counts, computes watch progress,
// and buckets by type (trial / recorded / live / long) + completed.
import { supabase } from '@/lib/supabase';

export type CourseType = 'trial' | 'recorded' | 'live' | 'program';
export interface StudentCourse {
  id: string; enrollmentId: string; title: string; category: string; level: string;
  type: CourseType; thumbnail: string | null; teacherId: string | null;
  lessons: number; done: number; progress: number; isDone: boolean;
}
export interface StudentCoursesData {
  trial: StudentCourse[]; recorded: StudentCourse[]; live: StudentCourse[]; program: StudentCourse[];
  completed: StudentCourse[]; enrolled: number; inProgress: number;
}

function pct(progress: any, total: number) {
  const done = Array.isArray(progress?.completed) ? progress.completed.length : 0;
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}
function doneCount(progress: any) { return Array.isArray(progress?.completed) ? progress.completed.length : 0; }
const norm = (t: string): CourseType => (t === 'long' ? 'program' : (['trial', 'recorded', 'live', 'program'].includes(t) ? t : 'recorded')) as CourseType;

export async function fetchStudentCourses(uid: string): Promise<StudentCoursesData> {
  const sb = supabase as any;
  const empty: StudentCoursesData = { trial: [], recorded: [], live: [], program: [], completed: [], enrolled: 0, inProgress: 0 };
  try {
    const { data: enr } = await sb.from('enrollments').select('*').eq('student_id', uid);
    const enrollments: any[] = enr ?? [];
    if (!enrollments.length) return empty;
    const courseIds = Array.from(new Set(enrollments.map((e) => e.course_id).filter(Boolean)));
    const { data: cs } = await sb.from('courses').select('id, title, category, course_type, level, thumbnail_url, product_type, teacher_id').in('id', courseIds);
    const byId: Record<string, any> = {}; (cs ?? []).forEach((c: any) => { byId[c.id] = c; });
    const { data: ls } = await sb.from('course_lessons').select('course_id').in('course_id', courseIds);
    const lessonCount: Record<string, number> = {}; (ls ?? []).forEach((l: any) => { lessonCount[l.course_id] = (lessonCount[l.course_id] || 0) + 1; });

    const out = { ...empty } as StudentCoursesData;
    out.trial = []; out.recorded = []; out.live = []; out.program = []; out.completed = [];
    enrollments.forEach((e) => {
      const c = byId[e.course_id]; if (!c) return;
      const lessons = lessonCount[c.id] || 0;
      const progress = pct(e.progress, lessons);
      const type = norm(c.product_type || e.product_type || 'recorded');
      const isDone = e.status === 'completed' || (progress === 100 && lessons > 0);
      const row: StudentCourse = {
        id: c.id, enrollmentId: e.id, title: c.title || 'Course', category: c.category || '', level: c.level || 'All levels',
        type, thumbnail: c.thumbnail_url ?? null, teacherId: c.teacher_id ?? null,
        lessons, done: doneCount(e.progress), progress, isDone,
      };
      if (isDone) out.completed.push(row);
      else out[type].push(row);
    });
    out.enrolled = out.trial.length + out.recorded.length + out.live.length + out.program.length + out.completed.length;
    out.inProgress = [...out.recorded, ...out.live, ...out.program].filter((c) => c.progress > 0).length + out.trial.length;
    return out;
  } catch { return empty; }
}
