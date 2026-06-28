// lib/lessonsActions.ts
// Unified lessons schedule — mirrors the web LessonsCalendar. Aggregates the
// user's CONFIRMED bookings (trials + live + long), projects weekly recurrence
// over a 60-day horizon, resolves the other party, and attaches Join links from
// the lessons table. Used by the teacher (and later student/parent) schedule.

import { supabase } from '@/lib/supabase';

export type ScheduleRole = 'student' | 'teacher' | 'parent';
export interface Session {
  key: string; bookingId: string; dateISO: string; title: string; party: string; partyAvatar: string | null;
  durationMins: number; joinUrl: string | null; isTrial: boolean;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function fetchSchedule(uid: string, role: ScheduleRole = 'teacher'): Promise<Session[]> {
  const sb = supabase as any;
  try {
    const meCol = role === 'student' ? 'student_id' : 'teacher_id';
    const otherCol = role === 'teacher' ? 'student_id' : 'teacher_id';
    const sel = 'id, status, start_date, session_time, duration_mins, recurrence, is_trial, course_id, teacher_id, student_id, courses ( title )';
    const { data: bks } = await sb.from('bookings').select(sel).eq(meCol, uid).eq('status', 'confirmed');
    const bookings: any[] = bks ?? [];
    if (!bookings.length) return [];

    const otherIds = Array.from(new Set(bookings.map((b) => b[otherCol]).filter(Boolean)));
    const nameById: Record<string, { name: string; avatar: string | null }> = {};
    if (otherIds.length) {
      const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, avatar_url').in('id', otherIds);
      (profs ?? []).forEach((p: any) => {
        nameById[p.id] = { name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || (role === 'student' ? 'Teacher' : 'Student'), avatar: p.avatar_url ?? null };
      });
    }

    const bookingIds = bookings.map((b) => b.id);
    const joinByBooking: Record<string, string> = {};
    if (bookingIds.length) {
      const { data: lsn } = await sb.from('lessons').select('booking_id, daily_room_url').in('booking_id', bookingIds);
      (lsn ?? []).forEach((l: any) => { if (l.daily_room_url) joinByBooking[l.booking_id] = l.daily_room_url; });
    }

    const today = startOfDay(new Date());
    const horizon = addDays(today, 60);
    const out: Session[] = [];

    bookings.forEach((b) => {
      if (!b.start_date) return;
      const time = b.session_time || '00:00:00';
      const base = new Date(`${b.start_date}T${time}`);
      if (isNaN(base.getTime())) return;
      const rec = String(b.recurrence || '').toLowerCase();
      const recurring = rec !== '' && !['one_time', 'once', 'none', 'single'].includes(rec);
      const party = nameById[b[otherCol]] || { name: role === 'student' ? 'Teacher' : 'Student', avatar: null };
      const mk = (d: Date) => out.push({
        key: `${b.id}-${ymd(d)}`, bookingId: b.id, dateISO: d.toISOString(),
        title: b.courses?.title || (b.is_trial ? 'Trial Lesson' : 'Quran Lesson'),
        party: party.name, partyAvatar: party.avatar, durationMins: b.duration_mins || 30,
        joinUrl: joinByBooking[b.id] || null, isTrial: !!b.is_trial,
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

// When the teacher joins, mark the lesson live so the other party sees it (mirrors web,
// which sets lessons.status='live' on teacher join only). Best-effort, fire-and-forget.
export async function markLessonLive(bookingId: string): Promise<void> {
  try {
    const sb = supabase as any;
    await sb.from('lessons').update({ status: 'live' }).eq('booking_id', bookingId);
  } catch {}
}
