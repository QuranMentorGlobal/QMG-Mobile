// lib/payoutActions.ts — teacher payout settings (mirrors web). Reads/saves the
// teacher_payout_settings row (bank account or mobile wallet).
import { supabase } from '@/lib/supabase';

export type PayoutMethod = 'bank_account' | 'mobile_wallet';
export interface PayoutField { name: string; label: string; placeholder?: string; required?: boolean }
export interface PayoutProvider { key: PayoutMethod; label: string; desc: string; fields: PayoutField[] }

export const PAYOUT_PROVIDERS: PayoutProvider[] = [
  {
    key: 'bank_account', label: 'Bank Account', desc: 'Direct transfer to your bank',
    fields: [
      { name: 'bank_name', label: 'Bank Name', placeholder: 'e.g. HBL, Barclays', required: true },
      { name: 'bank_account_number', label: 'Account Number', placeholder: 'Account number', required: true },
      { name: 'bank_iban', label: 'IBAN', placeholder: 'IBAN (if applicable)' },
      { name: 'bank_swift', label: 'SWIFT / BIC', placeholder: 'For international transfers' },
      { name: 'bank_country', label: 'Bank Country', placeholder: 'e.g. Pakistan', required: true },
    ],
  },
  {
    key: 'mobile_wallet', label: 'Mobile Wallet', desc: 'JazzCash / Easypaisa',
    fields: [
      { name: 'wallet_provider', label: 'Wallet Provider', placeholder: 'JazzCash / Easypaisa', required: true },
      { name: 'wallet_number', label: 'Wallet Number', placeholder: 'Registered mobile number', required: true },
    ],
  },
];

export interface PayoutSettings { method: PayoutMethod; holderName: string; currency: string; verified: boolean; fields: Record<string, string>; }

export async function fetchPayoutSettings(uid: string): Promise<PayoutSettings> {
  const sb = supabase as any;
  const empty: PayoutSettings = { method: 'bank_account', holderName: '', currency: 'usd', verified: false, fields: {} };
  try {
    const { data } = await sb.from('teacher_payout_settings').select('*').eq('teacher_id', uid).single();
    if (!data) return empty;
    return {
      method: data.preferred_method || 'bank_account',
      holderName: data.account_holder_name || '',
      currency: data.currency || 'usd',
      verified: !!data.is_verified,
      fields: {
        bank_name: data.bank_name || '', bank_account_number: data.bank_account_number || '', bank_iban: data.bank_iban || '',
        bank_swift: data.bank_swift || '', bank_country: data.bank_country || '', wallet_provider: data.wallet_provider || '', wallet_number: data.wallet_number || '',
      },
    };
  } catch { return empty; }
}

export async function savePayoutSettings(uid: string, s: PayoutSettings): Promise<{ ok: boolean; error?: string }> {
  const sb = supabase as any;
  try {
    const f = s.fields;
    const { error } = await sb.from('teacher_payout_settings').upsert({
      teacher_id: uid, account_holder_name: s.holderName.trim(), preferred_method: s.method, currency: s.currency,
      bank_name: f.bank_name || null, bank_account_number: f.bank_account_number || null, bank_iban: f.bank_iban || null,
      bank_swift: f.bank_swift || null, bank_country: f.bank_country || null,
      wallet_provider: f.wallet_provider || null, wallet_number: f.wallet_number || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'teacher_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || 'Could not save.' }; }
}
