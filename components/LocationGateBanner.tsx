// components/LocationGateBanner.tsx
// Shown when the signed-in user has no country set yet — which is also what the
// currency system needs to localize prices. Renders nothing once a country exists
// (it reads the same resolved country as <Price>). RN port of the web
// LocationGateBanner. The web uses device GPS; this build has no expo-location, so
// we offer an OTA-safe IP auto-detect (no permission prompt) plus an "Open profile"
// fallback where the country picker lives. On success it saves profiles.country and
// refreshes the display currency so prices re-localize immediately.

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import * as Location from 'expo-location';
import { useDisplayCurrency, resetDisplayCurrency } from '@/lib/pricing/useDisplayCurrency';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

export function LocationGateBanner({ profileHref }: { profileHref: string }) {
  const { country, ready } = useDisplayCurrency();
  const { session } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [msg, setMsg] = useState('');

  // Only show once we know there's no country on file.
  if (!ready || country || hidden) return null;

  async function detect() {
    if (!session?.user) { router.push(profileHref as any); return; }
    setBusy(true); setMsg('');
    let name: string | null = null;
    // 1) Device GPS (asks permission) → reverse-geocode to country.
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        name = geo?.[0]?.country || null;
      }
    } catch { /* fall through to IP */ }
    // 2) Fallback: IP geolocation (no permission needed).
    if (!name) {
      try { const r = await fetch('https://ipapi.co/json/'); const j: any = await r.json(); name = j?.country_name || null; } catch { /* ignore */ }
    }
    if (name && session?.user) {
      const { error } = await (supabase as any).from('profiles').update({ country: name }).eq('id', session.user.id);
      if (!error) { resetDisplayCurrency(); setHidden(true); setBusy(false); return; }
    }
    setBusy(false);
    setMsg('Couldn’t detect — please set it in your profile.');
  }

  return (
    <View style={styles.wrap}>
      <Ionicons name="location-outline" size={20} color={C.accent2} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Set your location</Text>
        <Text style={styles.body}>We use it to show prices in your local currency.{msg ? ` ${msg}` : ''}</Text>
        <View style={styles.actions}>
          <Pressable onPress={detect} disabled={busy}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.detectBtn, busy && { opacity: 0.6 }]}>
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="navigate-outline" size={14} color="#fff" />}
              <Text style={styles.detectText}>{busy ? 'Detecting…' : 'Detect automatically'}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.push(profileHref as any)} hitSlop={6}>
            <Text style={styles.openLink}>Open profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#E7CF86', borderRadius: RADIUS.md, padding: 14, marginBottom: SPACE.md },
  title: { fontFamily: FONT.bodyBold, fontSize: 14, color: '#7A5B0F' },
  body: { fontFamily: FONT.body, fontSize: 12.5, color: C.accent2, marginTop: 2, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  detectText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: '#fff' },
  openLink: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: '#7A5B0F', textDecorationLine: 'underline' },
});
