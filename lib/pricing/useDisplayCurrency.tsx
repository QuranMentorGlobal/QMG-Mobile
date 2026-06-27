// lib/pricing/useDisplayCurrency.tsx
// Viewer's display currency for the mobile app — the RN port of the web
// useDisplayCurrency. The web resolves currency via a geo API route; on mobile we
// resolve it from the signed-in user's profiles.country (which they set) and pull
// the usd→currency rate from the shared `exchange_rates` table (same one the web
// daily cron keeps fresh). Module-level cache so every <Price> shares one lookup.
//
// USD stays the accounting currency — this only changes what is DISPLAYED. If the
// rate is missing for the user's currency, we fall back to USD display (never show
// a local symbol against an unconverted USD number).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { currencyForCountry, formatCurrency } from '@/lib/pricing/currency';

interface Ctx { currency: string; rate: number; country: string | null }

let _cache: Ctx | null = null;
let _inflight: Promise<Ctx> | null = null;

async function resolve(): Promise<Ctx> {
  const sb = supabase as any;
  try {
    const { data: { user } } = await sb.auth.getUser();
    let country: string | null = null;
    if (user) {
      const { data } = await sb.from('profiles').select('country').eq('id', user.id).single();
      country = data?.country ?? null;
    }
    let currency = currencyForCountry(country);
    let rate = 1;
    if (currency !== 'usd') {
      try {
        const { data } = await sb
          .from('exchange_rates')
          .select('rate')
          .eq('base_currency', 'usd')
          .eq('quote_currency', currency)
          .single();
        const r = Number(data?.rate);
        if (Number.isFinite(r) && r > 0) rate = r;
        else currency = 'usd'; // no rate → display in USD
      } catch {
        currency = 'usd';
      }
    }
    return { currency, rate, country };
  } catch {
    return { currency: 'usd', rate: 1, country: null };
  }
}

function load(): Promise<Ctx> {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = resolve().then((c) => { _cache = c; return c; });
  }
  return _inflight;
}

/** Force a refresh (e.g. after the user changes their country in Profile). */
export function resetDisplayCurrency() { _cache = null; _inflight = null; }

// Synchronous formatter for string contexts in components that can't easily call a
// hook in every sub-component (billing/earnings rows). Reads the shared module
// cache: returns USD until the currency resolves, then the localized value. The
// screen's top-level component should call useDisplayCurrency() once so it
// re-renders (re-running its children) when the currency becomes ready.
export function formatMoneySync(usd: number | null | undefined): string {
  const n = Number(usd) || 0;
  const c = _cache;
  if (!c || c.currency === 'usd') return formatCurrency(n, 'usd');
  return formatCurrency(n * c.rate, c.currency);
}

export function useDisplayCurrency() {
  const [ctx, setCtx] = useState<Ctx | null>(_cache);
  useEffect(() => {
    let mounted = true;
    load().then((c) => { if (mounted) setCtx(c); });
    return () => { mounted = false; };
  }, []);
  const currency = ctx?.currency || 'usd';
  const rate = ctx?.rate || 1;
  const ready = !!ctx;
  function format(usd: number): string {
    const n = Number(usd) || 0;
    const local = currency === 'usd' ? n : n * rate;
    return formatCurrency(local, currency);
  }
  return { currency, rate, ready, country: ctx?.country || null, format };
}

// Convenience for string contexts (stat tiles, KPI values, billing rows) that
// can't render a <Price> component. Returns money(usd) → localized string. Shares
// the same module cache, so it re-renders the caller once the currency resolves.
export function useMoney(): (usd: number | null | undefined) => string {
  const { format } = useDisplayCurrency();
  return (usd) => format(Number(usd) || 0);
}
