// lib/studentProfileActions.ts — student Profile data (mirrors web): profile
// fields, learning levels/goals, stats, streak, and notification email prefs.
import { supabase } from '@/lib/supabase';

export interface StudentProfileData {
  firstName: string; lastName: string; email: string; phone: string;
  country: string; timezone: string; bio: string; memberSince: string;
  hifzLevel: number; tajweedLevel: number; learningGoals: string[];
  streak: number; stats: { bookings: number; lessons: number; teachers: number };
  notify: { notify_bookings: boolean; notify_messages: boolean; notify_payouts: boolean; notify_marketing: boolean };
}

const safe = async (p: Promise<any>) => { try { return await p; } catch { return { data: null, count: 0 }; } };

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const daySet = new Set(dates.map((d) => new Date(d).toDateString()));
  let s = 0; const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (daySet.has(d.toDateString())) s++; else if (i > 0) break;
  }
  return s;
}

export async function fetchStudentProfile(uid: string): Promise<StudentProfileData> {
  const sb = supabase as any;
  const empty: StudentProfileData = {
    firstName: '', lastName: '', email: '', phone: '', country: '', timezone: 'Asia/Karachi', bio: '', memberSince: '',
    hifzLevel: 0, tajweedLevel: 0, learningGoals: [], streak: 0, stats: { bookings: 0, lessons: 0, teachers: 0 },
    notify: { notify_bookings: true, notify_messages: true, notify_payouts: true, notify_marketing: false },
  };
  try {
    const { data: p } = await safe(sb.from('profiles').select('*').eq('id', uid).single());
    const out = { ...empty } as StudentProfileData;
    if (p) {
      out.firstName = p.first_name ?? ''; out.lastName = p.last_name ?? ''; out.email = p.email ?? '';
      out.phone = p.phone ?? ''; out.country = p.country ?? ''; out.timezone = p.timezone ?? 'Asia/Karachi';
      out.bio = p.bio ?? ''; out.hifzLevel = p.hifz_level ?? 0; out.tajweedLevel = p.tajweed_level ?? 0;
      out.learningGoals = Array.isArray(p.learning_goals) ? p.learning_goals : [];
      out.notify = {
        notify_bookings: p.notify_bookings ?? true, notify_messages: p.notify_messages ?? true,
        notify_payouts: p.notify_payouts ?? true, notify_marketing: p.notify_marketing ?? false,
      };
      if (p.created_at) { try { out.memberSince = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch {} }
    }
    const { count: bookingsCount } = await safe(sb.from('bookings').select('id', { count: 'exact', head: true }).eq('student_id', uid));
    const { data: bookings } = await safe(sb.from('bookings').select('id').eq('student_id', uid));
    const bookingIds = (bookings ?? []).map((b: any) => b.id);
    let lessonsCount = 0;
    if (bookingIds.length) {
      const r = await safe(sb.from('lessons').select('id', { count: 'exact', head: true }).in('booking_id', bookingIds).eq('status', 'completed'));
      lessonsCount = r.count ?? 0;
      const { data: done } = await safe(sb.from('lessons').select('scheduled_at').in('booking_id', bookingIds).eq('status', 'completed'));
      out.streak = calcStreak((done ?? []).map((l: any) => l.scheduled_at).filter(Boolean));
    }
    const { count: teachersCount } = await safe(sb.from('bookings').select('teacher_id', { count: 'exact', head: true }).eq('student_id', uid).eq('status', 'confirmed'));
    out.stats = { bookings: bookingsCount ?? 0, lessons: lessonsCount, teachers: teachersCount ?? 0 };
    return out;
  } catch { return empty; }
}

export async function saveStudentProfile(uid: string, d: Partial<StudentProfileData>): Promise<boolean> {
  try {
    const { error } = await (supabase as any).from('profiles').update({
      first_name: d.firstName?.trim(), last_name: d.lastName?.trim(),
      phone: d.phone?.trim() || null, country: d.country || null, timezone: d.timezone,
      bio: d.bio?.trim() || null, hifz_level: d.hifzLevel, tajweed_level: d.tajweedLevel,
      learning_goals: d.learningGoals,
    }).eq('id', uid);
    return !error;
  } catch { return false; }
}

export async function saveNotifPrefs(uid: string, prefs: StudentProfileData['notify']): Promise<boolean> {
  try { const { error } = await (supabase as any).from('profiles').update(prefs).eq('id', uid); return !error; } catch { return false; }
}
