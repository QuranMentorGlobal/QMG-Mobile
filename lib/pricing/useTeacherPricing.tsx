// lib/pricing/useTeacherPricing.tsx
// useTeacherPricing(teacherId) — resolves whether THIS viewer qualifies for a
// teacher's LOCAL price, for DISPLAY before booking. RN port of the web hook +
// /api/pricing/teacher-eligibility, computed client-side here because the web
// eligibility endpoint reads a server cookie session that mobile's token auth
// doesn't carry. It runs the SAME strict resolveEligibility (device GPS + phone
// strong; IP/profile weak) so a card never advertises a local price the
// server-side checkout won't actually charge. Display only — checkout re-resolves.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { resolveEligibility } from './eligibility';
import { currencyForCountry } from './currency';

export interface TeacherPricingCtx {
  mode: 'local' | 'international';
  localCurrency: string | null;
  rate: number | null;
}

const INTL: TeacherPricingCtx = { mode: 'international', localCurrency: null, rate: null };
const cache: Record<string, TeacherPricingCtx> = {};
const inflight: Record<string, Promise<TeacherPricingCtx>> = {};

// Session-cached IP country (weak signal; one network call, best-effort).
let _ipPromise: Promise<string | null> | null = null;
function ipCountry(): Promise<string | null> {
  if (!_ipPromise) {
    _ipPromise = fetch('https://ipapi.co/country/')
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => (t ? t.trim().toUpperCase() : null))
      .catch(() => null);
  }
  return _ipPromise;
}

async function resolve(teacherId: string): Promise<TeacherPricingCtx> {
  // Teacher country + local currency.
  const { data: tprof } = await (supabase as any).from('profiles').select('country').eq('id', teacherId).single();
  const { data: tp } = await (supabase as any).from('teacher_profiles').select('allow_local_pricing, local_currency').eq('user_id', teacherId).single();
  const teacherCountry = tprof?.country || null;
  if (!tp?.allow_local_pricing || !teacherCountry) return INTL;

  // Viewer signals.
  let stu: any = null;
  try {
    const { data: { user } } = await (supabase as any).auth.getUser();
    if (user) {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('location_country, location_method, phone, country')
        .eq('id', user.id).single();
      stu = data || null;
    }
  } catch { /* signed out → no strong signals */ }

  const ip = await ipCountry();
  const deviceCountry = stu?.location_method === 'device' ? stu?.location_country : null;
  const elig = resolveEligibility(
    {
      deviceCountry,
      phoneCountry: stu?.phone || null,
      ipCountry: (stu?.location_method === 'ip' ? stu?.location_country : null) || ip,
      profileCountry: stu?.country || stu?.location_country || null,
    },
    teacherCountry,
  );

  const localCurrency = (tp?.local_currency || currencyForCountry(teacherCountry) || null);
  return { mode: elig.mode, localCurrency: localCurrency || null, rate: null };
}

export function useTeacherPricing(teacherId?: string | null) {
  const [ctx, setCtx] = useState<TeacherPricingCtx | null>(
    teacherId && cache[teacherId] ? cache[teacherId] : null,
  );
  const [ready, setReady] = useState<boolean>(!!(teacherId && cache[teacherId]));

  useEffect(() => {
    if (!teacherId) { setCtx(INTL); setReady(true); return; }
    if (cache[teacherId]) { setCtx(cache[teacherId]); setReady(true); return; }
    let alive = true;
    (inflight[teacherId] ||= resolve(teacherId))
      .then((next) => {
        cache[teacherId] = next;
        delete inflight[teacherId];
        if (alive) { setCtx(next); setReady(true); }
      })
      .catch(() => { delete inflight[teacherId]; if (alive) { setCtx(INTL); setReady(true); } });
    return () => { alive = false; };
  }, [teacherId]);

  return { ctx, ready };
}

// Returns the local amount to show for a given USD amount, else null (caller
// falls back to the international/display price). Ported verbatim from web.
//  • recorded / one-time program → flat local_price (usdAmount ignored)
//  • live → local_price is the local MONTHLY base; scale by (usdAmount ÷ USD
//    monthly base) so any tier (monthly/quarterly/annual) localises correctly.
export function localizedAmountFor(
  course: any,
  ctx: TeacherPricingCtx | null,
  usdAmount: number,
): { currency: string; amount: number } | null {
  if (!ctx || ctx.mode !== 'local') return null;
  if (!course?.allow_local_pricing) return null;
  const lp = Number(course.local_price);
  if (!Number.isFinite(lp) || lp <= 0) return null;
  const currency = String(course.local_currency || ctx.localCurrency || '').toLowerCase();
  if (!currency) return null;
  const usd = Number(usdAmount) || 0;
  if (course.product_type === 'live' && Number(course.monthly_price_usd) > 0) {
    const ratio = usd > 0 ? usd / Number(course.monthly_price_usd) : 1;
    return { currency, amount: Math.round(lp * ratio) };
  }
  return { currency, amount: lp };
}

export function resetTeacherPricing() {
  for (const k of Object.keys(cache)) delete cache[k];
}
