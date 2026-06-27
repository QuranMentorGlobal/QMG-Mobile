// components/TimezoneDetector.tsx
// Silent auto-detect + "new timezone detected" prompt — RN port of the web
// TimezoneDetector, mounted once in RoleShell. On the first render per app session
// it compares the device IANA zone to the saved one:
//   • none saved                         → save the detected zone silently.
//   • saved ≠ detected & auto-detect on  → ask to update.
// Self-contained; reads/writes profiles.timezone (+ auto_detect_timezone).

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

let _checked = false; // session-once (resets on cold start, like the web's sessionStorage)

function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}
function zoneLabel(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
}

export function TimezoneDetector() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(tz: string) {
    setBusy(true);
    try {
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (user) await (supabase as any).from('profiles').update({ timezone: tz }).eq('id', user.id);
    } catch { /* non-fatal */ }
    setBusy(false);
    setPrompt(null);
  }

  useEffect(() => {
    if (_checked) return;
    _checked = true;
    (async () => {
      const detected = detectTimezone();
      try {
        const { data: { user } } = await (supabase as any).auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any)
          .from('profiles')
          .select('timezone, auto_detect_timezone')
          .eq('id', user.id)
          .single();
        const saved = data?.timezone || null;
        const auto = data?.auto_detect_timezone !== false; // default true
        if (!saved) { await (supabase as any).from('profiles').update({ timezone: detected }).eq('id', user.id); return; }
        if (auto && saved !== detected) setPrompt(detected);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!prompt) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <Ionicons name="globe-outline" size={20} color={C.gold} style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>New timezone detected</Text>
          <Text style={styles.body}>
            You appear to be in <Text style={styles.zone}>{zoneLabel(prompt)}</Text>. Update your profile so lesson times show correctly?
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={() => save(prompt)} disabled={busy}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.update, busy && { opacity: 0.6 }]}>
                <Text style={styles.updateText}>{busy ? 'Updating…' : 'Update'}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setPrompt(null)} disabled={busy} style={styles.notNow}>
              <Text style={styles.notNowText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center', paddingHorizontal: 12 },
  card: { flexDirection: 'row', gap: 11, maxWidth: 440, width: '100%', backgroundColor: C.white, borderWidth: 1, borderColor: '#E8E4DA', borderRadius: RADIUS.md, padding: 14, ...SHADOW.lg },
  title: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  body: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 18 },
  zone: { color: C.forest, fontFamily: FONT.bodyBold },
  actions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  update: { borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 9 },
  updateText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: '#fff' },
  notNow: { borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: '#E8E4DA' },
  notNowText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: C.muted },
});
