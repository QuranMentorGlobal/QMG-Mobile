// lib/pricing/eligibility.ts
// Local-pricing eligibility + anti-fraud — pure, no I/O. RN port of the web
// lib/pricing/eligibility.ts (kept identical so mobile's display hint agrees with
// the server's checkout resolver). STRICT policy: a viewer gets the local price
// ONLY if a STRONG signal (billing / card / device GPS / phone) matches the
// teacher's country AND no known signal contradicts it. Weak signals (IP/profile)
// alone fall back to International. The actual charge is still re-resolved
// server-side at checkout — this is display only.

import { normalizeToIso2 } from './currency';

export type PricingMode = 'local' | 'international';

export interface EligibilityInput {
  billingCountry?: string | null;
  paymentMethodCountry?: string | null;
  deviceCountry?: string | null;
  phoneCountry?: string | null;   // ISO2 or a raw phone number (we parse)
  ipCountry?: string | null;
  profileCountry?: string | null;
}

export interface EligibilityResult {
  mode: PricingMode;
  target: string | null;
  matched: string[];
  conflicts: string[];
  normalized: Record<string, string | null>;
  reason: string;
}

const STRONG: (keyof EligibilityInput)[] = ['billingCountry', 'paymentMethodCountry', 'deviceCountry', 'phoneCountry'];

const DIAL_TO_ISO2: Array<[string, string]> = [
  ['880', 'BD'], ['971', 'AE'], ['966', 'SA'], ['974', 'QA'], ['965', 'KW'], ['973', 'BH'], ['968', 'OM'],
  ['234', 'NG'], ['254', 'KE'], ['233', 'GH'], ['255', 'TZ'], ['256', 'UG'], ['251', 'ET'], ['212', 'MA'], ['216', 'TN'], ['213', 'DZ'],
  ['60', 'MY'], ['62', 'ID'], ['65', 'SG'], ['66', 'TH'], ['63', 'PH'], ['84', 'VN'],
  ['92', 'PK'], ['91', 'IN'], ['94', 'LK'], ['977', 'NP'], ['93', 'AF'], ['98', 'IR'],
  ['90', 'TR'], ['20', 'EG'], ['27', 'ZA'], ['86', 'CN'], ['81', 'JP'], ['82', 'KR'], ['852', 'HK'],
  ['44', 'GB'], ['1', 'US'], ['61', 'AU'], ['64', 'NZ'], ['353', 'IE'],
  ['49', 'DE'], ['33', 'FR'], ['39', 'IT'], ['34', 'ES'], ['31', 'NL'], ['7', 'RU'],
  ['55', 'BR'], ['52', 'MX'],
];

/** Best-effort ISO2 from a phone number (E.164-ish). Returns null if unknown. */
export function phoneToIso2(phone?: string | null): string | null {
  if (!phone) return null;
  let s = String(phone).trim().replace(/[^\d+]/g, '');
  if (!s.startsWith('+')) {
    if (s.startsWith('00')) s = '+' + s.slice(2);
    else return null;
  }
  const digits = s.replace(/^\+/, '');
  const sorted = [...DIAL_TO_ISO2].sort((a, b) => b[0].length - a[0].length);
  for (const [code, iso2] of sorted) {
    if (digits.startsWith(code)) return iso2;
  }
  return null;
}

export function resolveEligibility(input: EligibilityInput, target?: string | null): EligibilityResult {
  const targetIso = normalizeToIso2(target);
  const normalized: Record<string, string | null> = {
    billingCountry: normalizeToIso2(input.billingCountry),
    paymentMethodCountry: normalizeToIso2(input.paymentMethodCountry),
    deviceCountry: normalizeToIso2(input.deviceCountry),
    phoneCountry: normalizeToIso2(input.phoneCountry) || phoneToIso2(input.phoneCountry),
    ipCountry: normalizeToIso2(input.ipCountry),
    profileCountry: normalizeToIso2(input.profileCountry),
  };
  if (!targetIso) {
    return { mode: 'international', target: null, matched: [], conflicts: [], normalized, reason: 'No local-pricing country configured.' };
  }
  const known = Object.entries(normalized).filter(([, v]) => !!v) as [keyof EligibilityInput, string][];
  const matched = known.filter(([, v]) => v === targetIso).map(([k]) => k);
  const conflicts = known.filter(([, v]) => v !== targetIso).map(([k]) => k);
  const hasStrongMatch = STRONG.some((k) => normalized[k] === targetIso);
  if (known.length === 0) {
    return { mode: 'international', target: targetIso, matched, conflicts, normalized, reason: 'No location signals available.' };
  }
  if (conflicts.length > 0) {
    return { mode: 'international', target: targetIso, matched, conflicts, normalized, reason: `Signal mismatch (${conflicts.join(', ')} != ${targetIso}).` };
  }
  if (!hasStrongMatch) {
    return { mode: 'international', target: targetIso, matched, conflicts, normalized, reason: 'Only weak signals (IP/profile) matched; need billing, card, or phone.' };
  }
  return { mode: 'local', target: targetIso, matched, conflicts, normalized, reason: `Strong signal match (${matched.join(', ')}) with no conflicts.` };
}
