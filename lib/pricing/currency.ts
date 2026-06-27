// lib/pricing/currency.ts
// Currency mapping + formatting — the RN port of the web app's lib/pricing/currency.ts.
// Pure functions (no I/O, no UI). USD stays the accounting currency; this is purely
// for DISPLAY (showing a teacher/course price in the viewer's local currency).
// Resolves a country (full name as stored in profiles.country, an alias like "UAE",
// or an ISO-3166 alpha-2 code) to its ISO-4217 currency, and formats amounts.

// ── ISO-3166 alpha-2 → ISO-4217 (lowercase) ───────────────────────────────────
export const ISO2_CURRENCY: Record<string, string> = {
  AD: 'eur', AE: 'aed', AF: 'afn', AG: 'xcd', AI: 'xcd', AL: 'all',
  AM: 'amd', AO: 'aoa', AR: 'ars', AS: 'usd', AT: 'eur', AU: 'aud',
  AW: 'awg', AX: 'eur', AZ: 'azn', BA: 'bam', BB: 'bbd', BD: 'bdt',
  BE: 'eur', BF: 'xof', BG: 'bgn', BH: 'bhd', BI: 'bif', BJ: 'xof',
  BL: 'eur', BM: 'bmd', BN: 'bnd', BO: 'bob', BQ: 'usd', BR: 'brl',
  BS: 'bsd', BT: 'btn', BW: 'bwp', BY: 'byn', BZ: 'bzd', CA: 'cad',
  CD: 'cdf', CF: 'xaf', CG: 'xaf', CH: 'chf', CI: 'xof', CK: 'nzd',
  CL: 'clp', CM: 'xaf', CN: 'cny', CO: 'cop', CR: 'crc', CU: 'cup',
  CV: 'cve', CW: 'ang', CY: 'eur', CZ: 'czk', DE: 'eur', DJ: 'djf',
  DK: 'dkk', DM: 'xcd', DO: 'dop', DZ: 'dzd', EC: 'usd', EE: 'eur',
  EG: 'egp', ER: 'ern', ES: 'eur', ET: 'etb', FI: 'eur', FJ: 'fjd',
  FK: 'fkp', FM: 'usd', FO: 'dkk', FR: 'eur', GA: 'xaf', GB: 'gbp',
  GD: 'xcd', GE: 'gel', GF: 'eur', GG: 'gbp', GH: 'ghs', GI: 'gip',
  GL: 'dkk', GM: 'gmd', GN: 'gnf', GP: 'eur', GQ: 'xaf', GR: 'eur',
  GT: 'gtq', GU: 'usd', GW: 'xof', GY: 'gyd', HK: 'hkd', HN: 'hnl',
  HR: 'eur', HT: 'htg', HU: 'huf', ID: 'idr', IE: 'eur', IL: 'ils',
  IM: 'gbp', IN: 'inr', IQ: 'iqd', IR: 'irr', IS: 'isk', IT: 'eur',
  JE: 'gbp', JM: 'jmd', JO: 'jod', JP: 'jpy', KE: 'kes', KG: 'kgs',
  KH: 'khr', KI: 'aud', KM: 'kmf', KN: 'xcd', KP: 'kpw', KR: 'krw',
  KW: 'kwd', KY: 'kyd', KZ: 'kzt', LA: 'lak', LB: 'lbp', LC: 'xcd',
  LI: 'chf', LK: 'lkr', LR: 'lrd', LS: 'lsl', LT: 'eur', LU: 'eur',
  LV: 'eur', LY: 'lyd', MA: 'mad', MC: 'eur', MD: 'mdl', ME: 'eur',
  MF: 'eur', MG: 'mga', MH: 'usd', MK: 'mkd', ML: 'xof', MM: 'mmk',
  MN: 'mnt', MO: 'mop', MP: 'usd', MQ: 'eur', MR: 'mru', MS: 'xcd',
  MT: 'eur', MU: 'mur', MV: 'mvr', MW: 'mwk', MX: 'mxn', MY: 'myr',
  MZ: 'mzn', NA: 'nad', NC: 'xpf', NE: 'xof', NG: 'ngn', NI: 'nio',
  NL: 'eur', NO: 'nok', NP: 'npr', NR: 'aud', NU: 'nzd', NZ: 'nzd',
  OM: 'omr', PA: 'pab', PE: 'pen', PF: 'xpf', PG: 'pgk', PH: 'php',
  PK: 'pkr', PL: 'pln', PM: 'eur', PR: 'usd', PS: 'ils', PT: 'eur',
  PW: 'usd', PY: 'pyg', QA: 'qar', RE: 'eur', RO: 'ron', RS: 'rsd',
  RU: 'rub', RW: 'rwf', SA: 'sar', SB: 'sbd', SC: 'scr', SD: 'sdg',
  SE: 'sek', SG: 'sgd', SH: 'shp', SI: 'eur', SK: 'eur', SL: 'sll',
  SM: 'eur', SN: 'xof', SO: 'sos', SR: 'srd', SS: 'ssp', ST: 'stn',
  SV: 'usd', SX: 'ang', SY: 'syp', SZ: 'szl', TC: 'usd', TD: 'xaf',
  TG: 'xof', TH: 'thb', TJ: 'tjs', TL: 'usd', TM: 'tmt', TN: 'tnd',
  TO: 'top', TR: 'try', TT: 'ttd', TV: 'aud', TW: 'twd', TZ: 'tzs',
  UA: 'uah', UG: 'ugx', US: 'usd', UY: 'uyu', UZ: 'uzs', VA: 'eur',
  VC: 'xcd', VE: 'ves', VG: 'usd', VI: 'usd', VN: 'vnd', VU: 'vuv',
  WS: 'wst', XK: 'eur', YE: 'yer', YT: 'eur', ZA: 'zar', ZM: 'zmw',
  ZW: 'zwl',
};

// ── Country name / alias (lowercased) → ISO-3166 alpha-2 ──────────────────────
export const NAME_TO_ISO2: Record<string, string> = {
  'pakistan': 'PK', 'india': 'IN', 'bangladesh': 'BD', 'sri lanka': 'LK', 'nepal': 'NP', 'afghanistan': 'AF',
  'united states': 'US', 'united states of america': 'US', 'usa': 'US', 'u.s.a.': 'US', 'us': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'u.k.': 'GB', 'great britain': 'GB', 'england': 'GB', 'britain': 'GB',
  'canada': 'CA', 'australia': 'AU', 'new zealand': 'NZ', 'ireland': 'IE',
  'uae': 'AE', 'united arab emirates': 'AE', 'u.a.e.': 'AE', 'emirates': 'AE', 'dubai': 'AE',
  'saudi arabia': 'SA', 'ksa': 'SA', 'qatar': 'QA', 'kuwait': 'KW', 'bahrain': 'BH', 'oman': 'OM', 'jordan': 'JO', 'lebanon': 'LB',
  'egypt': 'EG', 'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN', 'libya': 'LY', 'sudan': 'SD',
  'nigeria': 'NG', 'kenya': 'KE', 'ghana': 'GH', 'south africa': 'ZA', 'tanzania': 'TZ', 'uganda': 'UG', 'ethiopia': 'ET',
  'malaysia': 'MY', 'indonesia': 'ID', 'singapore': 'SG', 'thailand': 'TH', 'philippines': 'PH', 'vietnam': 'VN', 'brunei': 'BN',
  'china': 'CN', 'japan': 'JP', 'south korea': 'KR', 'korea': 'KR', 'hong kong': 'HK', 'taiwan': 'TW',
  'turkey': 'TR', 'türkiye': 'TR', 'iran': 'IR', 'iraq': 'IQ', 'israel': 'IL', 'kazakhstan': 'KZ', 'uzbekistan': 'UZ', 'azerbaijan': 'AZ',
  'germany': 'DE', 'france': 'FR', 'italy': 'IT', 'spain': 'ES', 'portugal': 'PT', 'netherlands': 'NL', 'belgium': 'BE',
  'austria': 'AT', 'greece': 'GR', 'switzerland': 'CH', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
  'poland': 'PL', 'czech republic': 'CZ', 'czechia': 'CZ', 'hungary': 'HU', 'romania': 'RO', 'russia': 'RU', 'ukraine': 'UA',
  'brazil': 'BR', 'mexico': 'MX', 'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'peru': 'PE',
  'maldives': 'MV', 'bhutan': 'BT', 'mauritius': 'MU', 'fiji': 'FJ',
};

const ZERO_DECIMAL = new Set(['pkr', 'bdt', 'ngn', 'idr', 'jpy', 'krw', 'vnd', 'clp', 'lkr', 'npr', 'mmk', 'iqd', 'irr', 'pyg', 'ugx', 'tzs', 'huf', 'kes']);

export function normalizeToIso2(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const up = raw.toUpperCase();
    if (ISO2_CURRENCY[up]) return up;
  }
  const byName = NAME_TO_ISO2[raw.toLowerCase()];
  if (byName) return byName;
  return null;
}

export function currencyForCountry(input?: string | null): string {
  const iso2 = normalizeToIso2(input);
  if (iso2 && ISO2_CURRENCY[iso2]) return ISO2_CURRENCY[iso2];
  return 'usd';
}

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2;
}

/** Format an amount in a given currency, e.g. formatCurrency(1500,'pkr') → "PKR 1,500". */
export function formatCurrency(amount: number, currency: string): string {
  const cur = (currency || 'usd').toUpperCase();
  const digits = currencyDecimals(currency);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: cur,
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(Number(amount) || 0);
  } catch {
    return `${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${cur}`;
  }
}

export function formatApproxUsd(usd: number): string {
  return `≈ ${formatCurrency(Number(usd) || 0, 'usd')}`;
}
