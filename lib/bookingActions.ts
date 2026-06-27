// lib/bookingActions.ts
// Booking list data + the cancel/accept/decline/complete workflow, shared by the
// teacher and student Bookings screens. Mirrors the web app exactly:
//   • Decline (teacher) and Cancel (student) both POST the centralized
//     /api/bookings/cancel route — the single place refunds + the booking_refunds
//     ledger + invoice voiding happen. That route runs on the service role and is
//     body-authenticated (actorId), so the mobile client can call it directly.
//   • Accept (teacher) flips bookings.status -> 'confirmed' via Supabase, which
//     fires the DB accept-trigger (held earning + enrollment/subscription activate).
//     NOTE: the web also calls /api/video/room here to provision the Daily room,
//     but that endpoint is cookie-authenticated and cannot be called from mobile.
//     The room is instead provisioned at lesson-join (which routes to web) until a
//     token-authed video endpoint exists. Accept still fully confirms the booking.

import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/db';

export type BookingRole = 'student' | 'teacher';

export interface RichBooking {
  id: string;
  status: string | null;
  start_date: string | null;
  session_time: string | null;
  price_usd: number | null;
  is_trial: boolean | null;
  created_at: string | null;
  total_lessons: number | null;
  lessons_completed: number | null;
  courseTitle: string | null;
  courseDuration: number | null;
  personName: string;        // the other party (student for teachers, teacher for students)
  personAvatar: string | null;
  personCountry: string | null;
}

interface ActionResult {
  ok: boolean;
  error?: string;
  refunded?: boolean;
  refundAmount?: number;
}

function fullName(first?: string | null, last?: string | null, fallback = 'Unknown'): string {
  return [first, last].filter(Boolean).join(' ').trim() || fallback;
}

// ── Fetch: rich bookings for either role ────────────────────────────────────────
export async function fetchRichBookings(uid: string, as: BookingRole): Promise<RichBooking[]> {
  if (as === 'teacher') {
    // Teacher view: embed the student profile via the known FK (matches web).
    const { data } = await (supabase as any)
      .from('bookings')
      .select(
        `id, status, start_date, session_time, price_usd, is_trial, created_at,
         total_lessons, lessons_completed,
         courses ( title, duration_mins ),
         profiles!bookings_student_id_fkey ( first_name, last_name, avatar_url, country )`
      )
      .eq('teacher_id', uid)
      .order('created_at', { ascending: false });

    return ((data as any[]) ?? []).map((b) => ({
      id: b.id,
      status: b.status ?? null,
      start_date: b.start_date ?? null,
      session_time: b.session_time ?? null,
      price_usd: b.price_usd ?? null,
      is_trial: b.is_trial ?? null,
      created_at: b.created_at ?? null,
      total_lessons: b.total_lessons ?? null,
      lessons_completed: b.lessons_completed ?? null,
      courseTitle: b.courses?.title ?? null,
      courseDuration: b.courses?.duration_mins ?? null,
      personName: fullName(b.profiles?.first_name, b.profiles?.last_name, 'Student'),
      personAvatar: b.profiles?.avatar_url ?? null,
      personCountry: b.profiles?.country ?? null,
    }));
  }

  // Student view: fetch bookings, then resolve teacher names from public_teachers
  // (robust against FK-hint differences; same pattern db.ts uses elsewhere).
  const { data } = await (supabase as any)
    .from('bookings')
    .select(
      `id, status, start_date, session_time, price_usd, is_trial, created_at,
       total_lessons, lessons_completed, teacher_id,
       courses ( title, duration_mins )`
    )
    .eq('student_id', uid)
    .order('created_at', { ascending: false });

  const rows = (data as any[]) ?? [];
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];
  const tmap: Record<string, { name: string; avatar: string | null; country: string | null }> = {};
  if (teacherIds.length) {
    const { data: ts } = await (supabase as any)
      .from('public_teachers')
      .select('id, first_name, last_name, avatar_url, country')
      .in('id', teacherIds);
    (ts ?? []).forEach((t: any) => {
      tmap[t.id] = {
        name: fullName(t.first_name, t.last_name, 'Teacher'),
        avatar: t.avatar_url ?? null,
        country: t.country ?? null,
      };
    });
  }

  return rows.map((b) => ({
    id: b.id,
    status: b.status ?? null,
    start_date: b.start_date ?? null,
    session_time: b.session_time ?? null,
    price_usd: b.price_usd ?? null,
    is_trial: b.is_trial ?? null,
    created_at: b.created_at ?? null,
    total_lessons: b.total_lessons ?? null,
    lessons_completed: b.lessons_completed ?? null,
    courseTitle: b.courses?.title ?? null,
    courseDuration: b.courses?.duration_mins ?? null,
    personName: tmap[b.teacher_id]?.name ?? 'Teacher',
    personAvatar: tmap[b.teacher_id]?.avatar ?? null,
    personCountry: tmap[b.teacher_id]?.country ?? null,
  }));
}

// ── Teacher: Accept a pending booking ───────────────────────────────────────────
// Flips status to confirmed; the DB trigger creates the held earning + activates
// the enrollment/subscription. (Video room is provisioned at join — see header.)
export async function acceptBooking(bookingId: string): Promise<ActionResult> {
  const { error } = await (supabase as any)
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Cancel/Decline (shared) — routes through the centralized refund endpoint ─────
async function cancelViaApi(
  bookingId: string,
  cancelledBy: BookingRole | 'parent',
  actorId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const res = await fetch(`${API_BASE}/api/bookings/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, cancelledBy, actorId, reason }),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) return { ok: false, error: json.error || `Failed (${res.status})` };
    return { ok: true, refunded: !!json.refunded, refundAmount: Number(json.refundAmount) || 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error.' };
  }
}

export function declineBooking(bookingId: string, actorId: string): Promise<ActionResult> {
  return cancelViaApi(bookingId, 'teacher', actorId, 'Declined by teacher');
}

export function cancelBookingAsStudent(bookingId: string, actorId: string): Promise<ActionResult> {
  return cancelViaApi(bookingId, 'student', actorId, 'Cancelled by student');
}

// Parent cancels a child's booking — supervisor path. Mirrors the web parent
// bookings page, which POSTs cancelledBy:'parent' to the centralized refund route.
export function cancelBookingAsParent(bookingId: string, actorId: string): Promise<ActionResult> {
  return cancelViaApi(bookingId, 'parent', actorId, 'Cancelled by parent');
}

// ── Teacher: Mark a confirmed booking complete ─────────────────────────────────
export async function completeBooking(bookingId: string): Promise<ActionResult> {
  const { error } = await (supabase as any)
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId);
  if (error) return { ok: false, error: error.message };
  await (supabase as any)
    .from('lessons')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('status', 'scheduled');
  return { ok: true };
}
