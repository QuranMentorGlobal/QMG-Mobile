// lib/parentProfileActions.ts — parent Profile data (mirrors the web parent profile):
// identity, contact/location, "about your family", combined child stats, and the
// email-notification prefs. Reuses the proven fetchChildren helper for stats.
import { supabase } from '@/lib/supabase';
import { fetchChildren } from '@/lib/db';

export interface ParentProfileData {
  firstName: string; lastName: string; email: string; phone: string;
  country: string; timezone: string; familyBio: string; memberSince: string;
  stats: { children: number; lessons: number; bookings: number };
  notify: { notify_bookings: boolean; notify_messages: boolean; notify_payouts: boolean; notify_marketing: boolean };
}

const safe = async (p: Promise<any>) => { try { return await p; } catch { return { data: null, count: 0 }; } };

export async function fetchParentProfile(uid: string): Promise<ParentProfileData> {
  const sb = supabase as any;
  const empty: ParentProfileData = {
    firstName: '', lastName: '', email: '', phone: '', country: '', timezone: 'Asia/Karachi', familyBio: '', memberSince: '',
    stats: { children: 0, lessons: 0, bookings: 0 },
    notify: { notify_bookings: true, notify_messages: true, notify_payouts: true, notify_marketing: false },
  };
  try {
    const { data: p } = await safe(sb.from('profiles').select('*').eq('id', uid).single());
    const out = { ...empty } as ParentProfileData;
    if (p) {
      out.firstName = p.first_name ?? ''; out.lastName = p.last_name ?? ''; out.email = p.email ?? '';
      out.phone = p.phone ?? ''; out.country = p.country ?? ''; out.timezone = p.timezone ?? 'Asia/Karachi';
      out.familyBio = p.bio ?? '';
      out.notify = {
        notify_bookings: p.notify_bookings ?? true, notify_messages: p.notify_messages ?? true,
        notify_payouts: p.notify_payouts ?? true, notify_marketing: p.notify_marketing ?? false,
      };
      if (p.created_at) { try { out.memberSince = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch {} }
    }
    const kids = await fetchChildren(uid);
    const ids = kids.map((k) => k.id);
    let lessons = 0, bookings = 0;
    if (ids.length) {
      const { count: bk } = await safe(sb.from('bookings').select('id', { count: 'exact', head: true }).in('student_id', ids));
      bookings = bk ?? 0;
      const { count: ls } = await safe(sb.from('lessons').select('id', { count: 'exact', head: true }).in('student_id', ids).eq('status', 'completed'));
      lessons = ls ?? 0;
    }
    out.stats = { children: ids.length, lessons, bookings };
    return out;
  } catch { return empty; }
}

export async function saveParentProfile(uid: string, d: Partial<ParentProfileData>): Promise<boolean> {
  try {
    const { error } = await (supabase as any).from('profiles').update({
      first_name: d.firstName?.trim(), last_name: d.lastName?.trim(),
      phone: d.phone?.trim() || null, country: d.country || null, timezone: d.timezone,
      bio: d.familyBio?.trim() || null,
    }).eq('id', uid);
    return !error;
  } catch { return false; }
}
