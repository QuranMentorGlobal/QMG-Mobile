// app/teacher/payout-settings.tsx — choose payout method + enter banking/wallet
// details, saved to teacher_payout_settings (mirrors web). Reached from Earnings.
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchPayoutSettings, savePayoutSettings, PAYOUT_PROVIDERS, type PayoutMethod, type PayoutSettings } from '@/lib/payoutActions';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function PayoutSettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState<PayoutSettings>({ method: 'bank_account', holderName: '', currency: 'usd', verified: false, fields: {} });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setS(await fetchPayoutSettings(uid)); setLoading(false);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const provider = PAYOUT_PROVIDERS.find((p) => p.key === s.method)!;
  const setField = (name: string, val: string) => setS((prev) => ({ ...prev, fields: { ...prev.fields, [name]: val } }));

  function flash(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); }

  async function onSave() {
    if (!s.holderName.trim()) { flash('Enter the account holder name.', false); return; }
    for (const f of provider.fields) { if (f.required && !s.fields[f.name]?.trim()) { flash(`Please fill in ${f.label}.`, false); return; } }
    setSaving(true);
    const res = await savePayoutSettings(uid, s);
    setSaving(false);
    flash(res.ok ? 'Payout settings saved.' : (res.error || 'Could not save.'), res.ok);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={C.white} /></Pressable>
            <Text style={styles.headerTitle}>Payout Settings</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? <Loading label="Loading…" /> : (
        <View style={{ padding: SPACE.md }}>
          <Text style={styles.sub}>Choose how you want to receive your earnings.</Text>

          {s.verified ? (
            <View style={styles.verified}><Ionicons name="checkmark-circle" size={18} color={C.success} /><Text style={styles.verifiedText}>Your payout method is verified and ready.</Text></View>
          ) : null}

          <Text style={styles.secLabel}>PAYOUT METHOD</Text>
          {PAYOUT_PROVIDERS.map((p) => {
            const on = s.method === p.key;
            return (
              <Pressable key={p.key} onPress={() => setS((prev) => ({ ...prev, method: p.key as PayoutMethod }))} style={[styles.method, on && styles.methodOn]}>
                <View style={[styles.methodIcon, on && { backgroundColor: C.forest }]}><Ionicons name={p.key === 'bank_account' ? 'business-outline' : 'wallet-outline'} size={18} color={on ? C.white : C.accent2} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{p.label}</Text>
                  <Text style={styles.methodDesc}>{p.desc}</Text>
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              </Pressable>
            );
          })}

          <View style={styles.formCard}>
            <Text style={styles.label}>ACCOUNT HOLDER NAME</Text>
            <TextInput value={s.holderName} onChangeText={(t) => setS((prev) => ({ ...prev, holderName: t }))} placeholder="Full legal name on the account" placeholderTextColor={C.faint} style={styles.input} />
            {provider.fields.map((f) => (
              <View key={f.name}>
                <Text style={styles.label}>{f.label.toUpperCase()}{f.required ? ' *' : ''}</Text>
                <TextInput value={s.fields[f.name] || ''} onChangeText={(t) => setField(f.name, t)} placeholder={f.placeholder} placeholderTextColor={C.faint} style={styles.input} autoCapitalize="none" />
              </View>
            ))}
          </View>

          {toast ? <Text style={[styles.toast, { color: toast.ok ? C.forest : C.red }]}>{toast.msg}</Text> : null}

          <Pressable onPress={onSave} disabled={saving}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
              {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveText}>Save payout settings</Text>}
            </LinearGradient>
          </Pressable>
          <Text style={styles.note}>Payouts are processed once your balance reaches the minimum. We'll notify you when a payout is on the way.</Text>
          <View style={{ height: SPACE.section }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.sm, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 17 },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginBottom: SPACE.md },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(22,163,74,0.06)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.15)', borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.md },
  verifiedText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.success },
  secLabel: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.5, marginBottom: SPACE.sm },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: C.borderSoft, backgroundColor: C.white, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.sm },
  methodOn: { borderColor: C.gold, backgroundColor: C.tintGold },
  methodIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  methodDesc: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.gold },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.gold },
  formCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginTop: SPACE.sm, ...SHADOW.card },
  label: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.muted, letterSpacing: 0.5, marginTop: SPACE.sm, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, fontFamily: FONT.body, fontSize: 14, color: C.ink },
  toast: { fontFamily: FONT.bodySemi, fontSize: 13, textAlign: 'center', marginTop: SPACE.md },
  saveBtn: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', marginTop: SPACE.md },
  saveText: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.white },
  note: { fontFamily: FONT.body, fontSize: 12, color: C.faint, textAlign: 'center', marginTop: SPACE.md },
});
