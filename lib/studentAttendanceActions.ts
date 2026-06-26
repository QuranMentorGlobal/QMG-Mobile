// lib/studentAttendanceActions.ts — the student's own attendance (mirrors web
// /api/attendance/me + AttendanceViews): reads lesson_attendance, enriches with
// the lesson date/course from bookings, and derives streak / trend / rate.
import { supabase } from '@/lib/supabase';
import type { AttendanceStatus } from '@/lib/attendanceActions';

export interface AttRecord {
  bookingId: string; status: AttendanceStatus; notes: string | null;
  date: string | null; sessionTime: string | null; courseTitle: string;
}

export async function fetchStudentAttendance(uid: string): Promise<AttRecord[]> {
  const sb = supabase as any;
  try {
    const { data: rows } = await sb.from('lesson_attendance').select('booking_id, status, notes, marked_at').eq('student_id', uid);
    const list = ((rows as any[]) || []).filter((r) => r.status);
    if (!list.length) return [];
    const ids = Array.from(new Set(list.map((r) => r.booking_id)));
    const { data: bks } = await sb.from('bookings').select('id, start_date, session_time, courses ( title )').in('id', ids);
    const byId: Record<string, any> = {}; (bks ?? []).forEach((b: any) => { byId[b.id] = b; });
    return list.map((r) => {
      const b = byId[r.booking_id] || {};
      return {
        bookingId: r.booking_id, status: r.status, notes: r.notes ?? null,
        date: b.start_date || (r.marked_at ? String(r.marked_at).slice(0, 10) : null),
        sessionTime: b.session_time ?? null, courseTitle: b.courses?.title || 'Lesson',
      } as AttRecord;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch { return []; }
}

export interface Insights { streak: number; rate: number; trend: 'improving' | 'declining' | 'steady'; atRisk: boolean; denom: number; present: number; late: number; absent: number; excused: number; }

export function computeInsights(records: AttRecord[]): Insights {
  let streak = 0;
  for (const r of records) {
    if (r.status === 'present' || r.status === 'late') streak++;
    else if (r.status === 'excused' || r.status === 'cancelled' || r.status === 'rescheduled') continue;
    else break;
  }
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const excused = records.filter((r) => r.status === 'excused').length;
  const denom = present + late + absent;
  const rate = denom > 0 ? Math.round(((present + late) / denom) * 100) : 0;
  const relevant = records.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'absent');
  const rateOf = (arr: AttRecord[]) => (arr.length ? Math.round((arr.filter((r) => r.status !== 'absent').length / arr.length) * 100) : 0);
  let trend: 'improving' | 'declining' | 'steady' = 'steady';
  if (relevant.length >= 4) {
    const half = Math.floor(relevant.length / 2);
    const rr = rateOf(relevant.slice(0, half));
    const or = rateOf(relevant.slice(half));
    trend = rr > or + 5 ? 'improving' : rr < or - 5 ? 'declining' : 'steady';
  }
  const atRisk = denom >= 3 && (rate < 60 || absent >= 3);
  return { streak, rate, trend, atRisk, denom, present, late, absent, excused };
}

// Attendance rate per month (last 6), for the bar chart.
export function monthlyRates(records: AttRecord[]): { label: string; value: number }[] {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const by: Record<string, { p: number; l: number; a: number }> = {};
  records.forEach((r) => {
    if (!r.date) return;
    const k = r.date.slice(0, 7);
    const m = (by[k] = by[k] || { p: 0, l: 0, a: 0 });
    if (r.status === 'present') m.p++; else if (r.status === 'late') m.l++; else if (r.status === 'absent') m.a++;
  });
  return Object.keys(by).sort().slice(-6).map((k) => {
    const m = by[k]; const denom = m.p + m.l + m.a;
    const rate = denom > 0 ? Math.round(((m.p + m.l) / denom) * 100) : 0;
    return { label: M[Number(k.split('-')[1]) - 1], value: rate };
  });
}
