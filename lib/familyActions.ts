// lib/familyActions.ts — student "Family" consent surface. A parent can request
// to link to a student; the student approves/declines here. Reads pending
// parent_children links and updates their status.
import { supabase } from '@/lib/supabase';

export interface LinkRequest { id: string; parentName: string; parentEmail?: string | null; }

export async function fetchPendingLinks(uid: string): Promise<LinkRequest[]> {
  const sb = supabase as any;
  try {
    const { data: rows } = await sb.from('parent_children').select('id, parent_id, status').eq('child_id', uid).eq('status', 'pending');
    const list: any[] = rows ?? [];
    if (!list.length) return [];
    const parentIds = Array.from(new Set(list.map((r) => r.parent_id).filter(Boolean)));
    const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, email').in('id', parentIds);
    const byId: Record<string, any> = {}; (profs ?? []).forEach((p: any) => { byId[p.id] = p; });
    return list.map((r) => {
      const p = byId[r.parent_id] || {};
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'A parent';
      return { id: r.id, parentName: name, parentEmail: p.email ?? null };
    });
  } catch { return []; }
}

export async function respondToLink(id: string, accept: boolean): Promise<boolean> {
  try {
    const { error } = await (supabase as any).from('parent_children').update({ status: accept ? 'active' : 'declined' }).eq('id', id);
    return !error;
  } catch { return false; }
}
