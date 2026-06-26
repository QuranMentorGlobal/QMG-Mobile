// lib/attendanceActions.ts — teacher Attendance Center data + write path (mirrors web).
// Reads the teacher's bookings (+ course/student), the lesson_attendance table, and
// records attendance via a single upsert that also notifies the student + parents.
import { supabase } from '@/lib/supabase';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'cancelled' | 'rescheduled';

export const ATT_META: Record<AttendanceStatus, { label: string; color: string; bg: string; dot: string }> = {
  present: { label: 'Present', color: '#16A34A', bg: 'rgba(22,163,74,0.10)', dot: '#16A34A' },
  absent: { label: 'Absent', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', dot: '#DC2626' },
  late: { label: 'Late', color: '#C2410C', bg: 'rgba(234,88,12,0.12)', dot: '#EA580C' },
  excused: { label: 'Excused', color: '#2563EB', bg: 'rgba(37,99,235,0.10)', dot: '#2563EB' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', dot: '#6B7280' },
  rescheduled: { label: 'Rescheduled', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', dot: '#7C3AED' },
};
export const MARKABLE: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export interface AttRow {
  id: string; start_date: string; session_time: string | null; status: string;
  courseTitle: string; studentId: string | null; studentName: string; studentAvatar: string | null;
}
export interface AttendanceData { rows: AttRow[]; att: Record<string, AttendanceStatus>; notes: Record<string, string>; }

export async function fetchAttendance(uid: string): Promise<AttendanceData> {
  const sb = supabase as any;
  try {
    const { data } = await sb.from('bookings')
      .select('id, status, start_date, session_time, courses ( title ), profiles!bookings_student_id_fkey ( id, first_name, last_name, avatar_url )')
      .eq('teacher_id', uid).order('start_date', { ascending: false }).limit(500);
    const rows: AttRow[] = ((data as any[]) ?? []).map((b) => ({
      id: b.id, start_date: b.start_date, session_time: b.session_time, status: b.status,
      courseTitle: b.courses?.title || 'Lesson',
      studentId: b.profiles?.id ?? null,
      studentName: `${b.profiles?.first_name ?? ''} ${b.profiles?.last_name ?? ''}`.trim() || 'Student',
      studentAvatar: b.profiles?.avatar_url ?? null,
    }));
    const att: Record<string, AttendanceStatus> = {}; const notes: Record<string, string> = {};
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const { data: a } = await sb.from('lesson_attendance').select('booking_id, status, notes').in('booking_id', ids);
      (a ?? []).forEach((r: any) => { if (r.status) att[r.booking_id] = r.status; if (r.notes) notes[r.booking_id] = r.notes; });
    }
    return { rows, att, notes };
  } catch { return { rows: [], att: {}, notes: {} }; }
}

function studentBody(s: AttendanceStatus, when: string): { title: string; body: string } {
  if (s === 'present') return { title: 'Attendance: Present', body: `You were marked present for your lesson on ${when}.` };
  if (s === 'late') return { title: 'Attendance: Late', body: `You were marked late for your lesson on ${when}.` };
  if (s === 'absent') return { title: 'Attendance: Absent', body: `You were marked absent for your lesson on ${when}.` };
  return { title: 'Attendance: Excused', body: `Your absence on ${when} was recorded as excused.` };
}

export async function recordAttendance(opts: {
  bookingId: string; studentId: string; teacherId: string; status: AttendanceStatus; notes?: string;
  studentName?: string; dateLabel?: string;
}): Promise<boolean> {
  const sb = supabase as any;
  const { bookingId, studentId, teacherId, status } = opts;
  const when = opts.dateLabel || 'your recent lesson';
  try {
    let lessonId: string | null = null;
    try {
      const { data: l } = await sb.from('lessons').select('id').eq('booking_id', bookingId).maybeSingle();
      if (l) lessonId = l.id;
    } catch {}
    const now = new Date().toISOString();
    const { error } = await sb.from('lesson_attendance').upsert({
      booking_id: bookingId, student_id: studentId, teacher_id: teacherId || null, lesson_id: lessonId,
      status, notes: opts.notes?.trim() || null, marked_by: teacherId, marked_at: now, updated_at: now,
    }, { onConflict: 'booking_id' });
    if (error) return false;
    // Notify student + linked parents (best-effort).
    try {
      const c = studentBody(status, when);
      await sb.from('notifications').insert({ user_id: studentId, type: `attendance_${status}`, title: c.title, body: c.body, href: '/platform/student/attendance' });
    } catch {}
    try {
      const { data: links } = await sb.from('parent_children').select('parent_id').eq('child_id', studentId);
      const child = opts.studentName || 'Your child';
      for (const link of (links ?? [])) {
        try {
          await sb.from('notifications').insert({ user_id: link.parent_id, type: `attendance_${status}`, title: `${child}: ${ATT_META[status].label}`, body: `${child}'s lesson on ${when} was marked ${ATT_META[status].label.toLowerCase()}.`, href: '/platform/parent/attendance' });
        } catch {}
      }
    } catch {}
    return true;
  } catch { return false; }
}
