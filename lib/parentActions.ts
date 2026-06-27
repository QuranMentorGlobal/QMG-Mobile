// lib/parentActions.ts
// Parent-side data aggregations across ALL linked children (parent supervises;
// each child is the student of record). Mirrors the web parent pages exactly:
//   • fetchParentBookings  → web src/app/platform/parent/bookings/page.tsx
//   • fetchParentSchedule  → web LessonsCalendar (role="parent")
//   • fetchParentCourses   → web src/app/platform/parent/courses/page.tsx
// Children come from parent_children (parent_id → child_id). Attendance is NOT
// here: it reuses fetchStudentAttendance(childId) directly (queries by student_id).

import { supabase } from '@/lib/supabase';
import { fetchChildren } from '@/lib/db';

/* ── shared: resolve the parent's children (id → name) ───────────────────────── */
export interface ParentChildLite { id: string; name: string }

async function loadChildren(uid: string): Promise<{ ids: string[]; nameById: Record<string, string> }> {
  const kids = await fetchChildren(uid);
  const ids: string[] = [];
  const nameById: Record<string, string> = {};
  kids.forEach((c) => {
    if (!c.id) return;
    ids.push(c.id);
    nameById[c.id] = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Child';
  });
  return { ids, nameById };
}

/* ── Bookings ────────────────────────────────────────────────────────────────── */
export interface ParentBooking {
  id: string;
  status: string;
  start_date: string | null;
  session_time: string | null;
  price_usd: number | null;
  is_trial: boolean;
  refund_status: string | null;
  studentId: string;
  childName: string;
  teacherName: string;
  teacherAvatar: string | null;
  courseTitle: string;
}

export async function fetchParentBookings(uid: string): Promise<ParentBooking[]> {
  const sb = supabase as any;
  try {
    const { ids, nameById } = await loadChildren(uid);
    if (!ids.length) return [];
    const { data: rows } = await sb
      .from('bookings')
      .select(
        `id, status, start_date, session_time, price_usd, is_trial, refund_status, student_id,
         courses ( title ),
         profiles!bookings_teacher_id_fkey ( first_name, last_name, avatar_url )`
      )
      .in('student_id', ids)
      .order('start_date', { ascending: false })
      .limit(2000);
    return ((rows as any[]) || []).map((b) => ({
      id: b.id,
      status: b.status,
      start_date: b.start_date ?? null,
      session_time: b.session_time ?? null,
      price_usd: b.price_usd ?? null,
      is_trial: !!b.is_trial,
      refund_status: b.refund_status ?? null,
      studentId: b.student_id,
      childName: nameById[b.student_id] || 'Child',
      teacherName: b.profiles ? `${b.profiles.first_name || ''} ${b.profiles.last_name || ''}`.trim() || 'Teacher' : 'Teacher',
      teacherAvatar: b.profiles?.avatar_url ?? null,
      courseTitle: b.courses?.title || 'Lesson',
    }));
  } catch {
    return [];
  }
}

/* ── Schedule (Lessons) ──────────────────────────────────────────────────────── */
export interface ParentSession {
  key: string;
  dateISO: string;
  title: string;
  teacher: string;
  teacherAvatar: string | null;
  durationMins: number;
  joinUrl: string | null;
  isTrial: boolean;
  childId: string;
  childName: string;
  bookingId: string;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function fetchParentSchedule(uid: string): Promise<ParentSession[]> {
  const sb = supabase as any;
  try {
    const { ids, nameById } = await loadChildren(uid);
    if (!ids.length) return [];

    const sel =
      'id, status, start_date, session_time, duration_mins, recurrence, is_trial, course_id, teacher_id, student_id, courses ( title )';
    const { data: bks } = await sb.from('bookings').select(sel).in('student_id', ids).eq('status', 'confirmed');
    const bookings: any[] = bks ?? [];
    if (!bookings.length) return [];

    // Resolve teachers (the "other party" for the parent view).
    const teacherIds = Array.from(new Set(bookings.map((b) => b.teacher_id).filter(Boolean)));
    const teacherById: Record<string, { name: string; avatar: string | null }> = {};
    if (teacherIds.length) {
      const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, avatar_url').in('id', teacherIds);
      (profs ?? []).forEach((p: any) => {
        teacherById[p.id] = { name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Teacher', avatar: p.avatar_url ?? null };
      });
    }

    // Join links from concrete lesson rooms.
    const bookingIds = bookings.map((b) => b.id);
    const joinByBooking: Record<string, string> = {};
    if (bookingIds.length) {
      const { data: lsn } = await sb.from('lessons').select('booking_id, daily_room_url').in('booking_id', bookingIds);
      (lsn ?? []).forEach((l: any) => { if (l.daily_room_url) joinByBooking[l.booking_id] = l.daily_room_url; });
    }

    const today = startOfDay(new Date());
    const horizon = addDays(today, 60);
    const out: ParentSession[] = [];

    bookings.forEach((b) => {
      if (!b.start_date) return;
      const time = b.session_time || '00:00:00';
      const base = new Date(`${b.start_date}T${time}`);
      if (isNaN(base.getTime())) return;
      const rec = String(b.recurrence || '').toLowerCase();
      const recurring = rec !== '' && !['one_time', 'once', 'none', 'single'].includes(rec);
      const t = teacherById[b.teacher_id] || { name: 'Teacher', avatar: null };
      const mk = (d: Date) =>
        out.push({
          key: `${b.id}-${ymd(d)}`,
          dateISO: d.toISOString(),
          title: b.courses?.title || (b.is_trial ? 'Trial Lesson' : 'Quran Lesson'),
          teacher: t.name,
          teacherAvatar: t.avatar,
          durationMins: b.duration_mins || 30,
          joinUrl: joinByBooking[b.id] || null,
          isTrial: !!b.is_trial,
          childId: b.student_id,
          childName: nameById[b.student_id] || 'Child',
          bookingId: b.id,
        });
      if (!recurring) {
        if (base >= today) mk(base);
      } else {
        let d = new Date(base);
        while (d < today) d = addDays(d, 7);
        while (d <= horizon) { mk(new Date(d)); d = addDays(d, 7); }
      }
    });

    out.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
    return out;
  } catch {
    return [];
  }
}

/* ── Courses ─────────────────────────────────────────────────────────────────── */
export type ParentCourseBucket = 'trial' | 'recorded' | 'live' | 'long' | 'completed';

export interface ParentCourse {
  id: string;
  enrollmentId: string;
  title: string;
  category: string;
  thumbnail: string | null;
  bucket: ParentCourseBucket;
  ctype: 'trial' | 'recorded' | 'live' | 'program';
  lessons: number;
  progress: number;
  childId: string;
  childName: string;
}

function pct(progress: any, total: number) {
  const done = Array.isArray(progress?.completed) ? progress.completed.length : 0;
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}
const normType = (t: string): 'trial' | 'recorded' | 'live' | 'program' =>
  t === 'long' ? 'program' : (['trial', 'recorded', 'live', 'program'].includes(t) ? t : 'recorded') as any;

export async function fetchParentCourses(uid: string): Promise<ParentCourse[]> {
  const sb = supabase as any;
  try {
    const { ids, nameById } = await loadChildren(uid);
    if (!ids.length) return [];

    const { data: enr } = await sb.from('enrollments').select('*').in('student_id', ids);
    const enrolments: any[] = enr ?? [];
    if (!enrolments.length) return [];

    const courseIds = Array.from(new Set(enrolments.map((e) => e.course_id).filter(Boolean)));
    const courseMap: Record<string, any> = {};
    const lessonCount: Record<string, number> = {};
    if (courseIds.length) {
      const { data: cs } = await sb
        .from('courses')
        .select('id, title, category, course_type, thumbnail_url, product_type')
        .in('id', courseIds);
      (cs ?? []).forEach((c: any) => { courseMap[c.id] = c; });
      const { data: ls } = await sb.from('course_lessons').select('course_id').in('course_id', courseIds);
      (ls ?? []).forEach((l: any) => { lessonCount[l.course_id] = (lessonCount[l.course_id] || 0) + 1; });
    }

    return enrolments
      .map((e) => {
        const c = courseMap[e.course_id];
        if (!c) return null;
        const lessons = lessonCount[c.id] || 0;
        const ctype = normType(c.product_type || e.product_type || 'recorded');
        const progress = pct(e.progress, lessons);
        const isDone = e.status === 'completed' || (progress === 100 && lessons > 0);
        const bucket: ParentCourseBucket = isDone
          ? 'completed'
          : ctype === 'recorded'
          ? 'recorded'
          : ctype === 'live'
          ? 'live'
          : ctype === 'program'
          ? 'long'
          : 'trial';
        return {
          id: c.id,
          enrollmentId: e.id,
          title: c.title || 'Course',
          category: c.category || c.course_type || '',
          thumbnail: c.thumbnail_url ?? null,
          bucket,
          ctype,
          lessons,
          progress,
          childId: e.student_id,
          childName: nameById[e.student_id] || 'Child',
        } as ParentCourse;
      })
      .filter(Boolean) as ParentCourse[];
  } catch {
    return [];
  }
}

/* ── Progress ────────────────────────────────────────────────────────────────── */
export interface ParentProgressChild {
  id: string;
  name: string;
  avatar: string | null;
  completedThisMonth: number;
  totalCompleted: number;
  totalCancelled: number;
  upcomingCount: number;
  streak: number;
  hifzLevel: number;
  tajweedLevel: number;
  attendance: number;
}
export interface ParentProgress {
  children: ParentProgressChild[];
  totals: { thisMonth: number; completed: number; upcoming: number };
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const daySet = new Set(dates.map((d) => new Date(d).toDateString()));
  let s = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(d.toDateString())) s++;
    else if (i > 0) break;
  }
  return s;
}

export async function fetchParentProgress(uid: string): Promise<ParentProgress> {
  const sb = supabase as any;
  const empty: ParentProgress = { children: [], totals: { thisMonth: 0, completed: 0, upcoming: 0 } };
  try {
    const { ids, nameById } = await loadChildren(uid);
    if (!ids.length) return empty;

    const { data: profs } = await sb.from('profiles').select('id, avatar_url, hifz_level, tajweed_level').in('id', ids);
    const profMap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const children: ParentProgressChild[] = await Promise.all(
      ids.map(async (id) => {
        const base: ParentProgressChild = {
          id, name: nameById[id] || 'Child', avatar: profMap[id]?.avatar_url ?? null,
          completedThisMonth: 0, totalCompleted: 0, totalCancelled: 0, upcomingCount: 0,
          streak: 0, hifzLevel: profMap[id]?.hifz_level ?? 0, tajweedLevel: profMap[id]?.tajweed_level ?? 0, attendance: 0,
        };
        try {
          const { data: bks } = await sb.from('bookings').select('id').eq('student_id', id);
          const bookingIds = (bks ?? []).map((b: any) => b.id);
          if (!bookingIds.length) return base;

          const [completedRes, cancelledRes, upcomingRes] = await Promise.all([
            sb.from('lessons').select('scheduled_at').in('booking_id', bookingIds).eq('status', 'completed'),
            sb.from('lessons').select('id', { count: 'exact', head: true }).in('booking_id', bookingIds).eq('status', 'cancelled'),
            sb.from('lessons').select('id', { count: 'exact', head: true }).in('booking_id', bookingIds).eq('status', 'scheduled').gte('scheduled_at', now.toISOString()),
          ]);
          const completedList = (completedRes.data ?? []) as any[];
          const totalCompleted = completedList.length;
          const totalCancelled = cancelledRes.count ?? 0;
          const attendance = totalCompleted + totalCancelled > 0 ? Math.round((totalCompleted / (totalCompleted + totalCancelled)) * 100) : 0;
          return {
            ...base,
            completedThisMonth: completedList.filter((l) => l.scheduled_at && new Date(l.scheduled_at) >= monthStart).length,
            totalCompleted,
            totalCancelled,
            upcomingCount: upcomingRes.count ?? 0,
            streak: calcStreak(completedList.map((l) => l.scheduled_at).filter(Boolean)),
            attendance,
          };
        } catch {
          return base;
        }
      })
    );

    const totals = children.reduce(
      (acc, s) => ({ completed: acc.completed + s.totalCompleted, thisMonth: acc.thisMonth + s.completedThisMonth, upcoming: acc.upcoming + s.upcomingCount }),
      { completed: 0, thisMonth: 0, upcoming: 0 }
    );
    return { children, totals };
  } catch {
    return empty;
  }
}
