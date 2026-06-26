// lib/studentsActions.ts
// Teacher's students — mirrors the web students page. Aggregates the teacher's
// bookings (active = confirmed, trials, last date) and joins enrollments in the
// teacher's courses to count distinct courses per student. RLS-scoped reads.

import { supabase } from '@/lib/supabase';

export interface RichStudent {
  id: string; name: string; avatar: string | null;
  bookings: number; active: number; trials: number; courses: number; lastDate: string | null;
}
export interface StudentTotals { total: number; withActive: number; trialsTaken: number }
export interface StudentsData { students: RichStudent[]; totals: StudentTotals }

export async function fetchStudents(uid: string): Promise<StudentsData> {
  const sb = supabase as any;
  try {
    const { data: bks } = await sb.from('bookings')
      .select('id, status, start_date, is_trial, student_id, course_id')
      .eq('teacher_id', uid);
    const bookings: any[] = bks ?? [];
    const studentIds = Array.from(new Set(bookings.map((b) => b.student_id).filter(Boolean)));

    const pById: Record<string, any> = {};
    if (studentIds.length) {
      const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, avatar_url').in('id', studentIds);
      (profs ?? []).forEach((p: any) => { pById[p.id] = p; });
    }

    // distinct courses per student = enrollments in this teacher's courses
    const courseCountByStudent: Record<string, Set<string>> = {};
    try {
      const { data: myCourses } = await sb.from('courses').select('id').eq('teacher_id', uid);
      const myCourseIds = (myCourses ?? []).map((c: any) => c.id);
      if (myCourseIds.length) {
        const { data: enr } = await sb.from('enrollments').select('student_id, course_id').in('course_id', myCourseIds);
        (enr ?? []).forEach((e: any) => {
          if (!e.student_id) return;
          if (!courseCountByStudent[e.student_id]) courseCountByStudent[e.student_id] = new Set();
          courseCountByStudent[e.student_id].add(e.course_id);
        });
      }
    } catch {}

    const map: Record<string, RichStudent> = {};
    bookings.forEach((b) => {
      if (!b.student_id) return;
      const p = pById[b.student_id];
      const name = p ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student') : 'Student';
      if (!map[b.student_id]) {
        map[b.student_id] = {
          id: b.student_id, name, avatar: p?.avatar_url ?? null,
          bookings: 0, active: 0, trials: 0, courses: courseCountByStudent[b.student_id]?.size || 0, lastDate: null,
        };
      }
      const s = map[b.student_id];
      s.bookings++;
      if (b.status === 'confirmed') s.active++;
      if (b.is_trial) s.trials++;
      if (b.start_date && (!s.lastDate || b.start_date > s.lastDate)) s.lastDate = b.start_date;
    });

    const students = Object.values(map).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
    const totals: StudentTotals = {
      total: students.length,
      withActive: students.filter((s) => s.active > 0).length,
      trialsTaken: students.reduce((n, s) => n + s.trials, 0),
    };
    return { students, totals };
  } catch {
    return { students: [], totals: { total: 0, withActive: 0, trialsTaken: 0 } };
  }
}
