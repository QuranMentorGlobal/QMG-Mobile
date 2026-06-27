// components/NotificationPrefs.tsx
// Self-contained email-notification preferences — RN port of the web
// NotificationPrefs, for the student/parent shared profile (teachers have their
// own copy inside TeacherProfileScreen). Resolves its own user, loads the four
// notify_* flags from profiles, and saves via saveNotifyPrefs. Renders the three
// learner-relevant toggles (payouts is teacher-only) and preserves the payouts
// value untouched on save.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { saveNotifyPrefs } from '@/lib/db';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

interface Prefs { notify_bookings: boolean; notify_messages: boolean; notify_payouts: boolean; notify_marketing: boolean }

export function NotificationPrefs() {
  const { profile } = useAuth();
  const uid = profile?.id;
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      if (!uid) return;
      try {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('notify_bookings, notify_messages, notify_payouts, notify_marketing')
          .eq('id', uid)
          .single();
        if (on) setPrefs({
          notify_bookings: data?.notify_bookings !== false,
          notify_messages: data?.notify_messages !== false,
          notify_payouts: data?.notify_payouts !== false,
          notify_marketing: data?.notify_marketing !== false,
        });
      } catch {
        if (on) setPrefs({ notify_bookings: true, notify_messages: true, notify_payouts: true, notify_marketing: true });
      }
    })();
    return () => { on = false; };
  }, [uid]);

  if (!prefs) return null;

  const rows: [keyof Prefs, string][] = [
    ['notify_bookings', 'Booking & lesson reminders'],
    ['notify_messages', 'New messages'],
    ['notify_marketing', 'Tips & product updates'],
  ];

  async function save() {
    if (!uid || !prefs) return;
    setBusy(true);
    const ok = await saveNotifyPrefs(uid, prefs);
    setBusy(false);
    Alert.alert(ok ? 'Preferences saved.' : 'Saved locally.');
  }

  return (
    <View>
      {rows.map(([k, l]) => (
        <View key={k} style={styles.row}>
          <Text style={styles.label}>{l}</Text>
          <Switch
            value={prefs[k]}
            onValueChange={(v) => setPrefs((p) => (p ? { ...p, [k]: v } : p))}
            trackColor={{ true: C.forest, false: '#D8D2C4' }}
            thumbColor="#fff"
          />
        </View>
      ))}
      <Pressable onPress={save} disabled={busy} style={{ marginTop: SPACE.sm }}>
        <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.saveBtn, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator size="small" color={C.ink} /> : <Ionicons name="save-outline" size={15} color={C.ink} />}
          <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save preferences'}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  label: { fontFamily: FONT.bodyMed, fontSize: 14, color: C.text, flex: 1, paddingRight: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 12 },
  saveText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
});
