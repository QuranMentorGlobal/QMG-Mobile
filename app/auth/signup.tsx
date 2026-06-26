// app/auth/signup.tsx — premium registration: signature-gradient hero with glowing
// logo emblem, an overlapping card with role cards (locked after signup), icon
// inputs (show/hide password) and a gradient button. Mirrors the web signup flow.
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/supabase';
import { AuthField } from '@/components/AuthField';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

const EMBLEM = require('@/assets/splash-icon.png');
const ROLE_OPTS: { r: Role; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { r: 'student', label: 'Student', sub: 'Learn 1-on-1', icon: 'school-outline' },
  { r: 'parent', label: 'Parent', sub: 'Manage children', icon: 'people-outline' },
  { r: 'teacher', label: 'Teacher', sub: 'Teach & earn', icon: 'book-outline' },
];

export default function Signup() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!firstName || !lastName || !email || !password) { setError('Please fill in your name, email and password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const res = await signUp({ email, password, firstName, lastName, role, country });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.needsConfirm) { setDone(true); return; }
    router.replace('/' as any);
  }

  if (done) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.confirmWrap}>
          <View style={styles.confirmIcon}><Ionicons name="mail-unread-outline" size={34} color={C.forest} /></View>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmBody}>We sent a confirmation link to {email}. Open it to verify your account, then come back and sign in.</Text>
          <Pressable onPress={() => router.replace('/auth/login' as any)}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Text style={styles.ctaText}>Back to sign in</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <SafeAreaView edges={['top']} style={{ alignItems: 'center' }}>
              <View style={styles.emblemRing}>
                <View style={styles.emblemRing2}>
                  <Image source={EMBLEM} style={styles.emblem} resizeMode="contain" />
                </View>
              </View>
              <Text style={styles.brand}>Muddarris</Text>
              <Text style={styles.heroTitle}>Create your account</Text>
              <Text style={styles.heroSub}>Begin your Quran journey today.</Text>
            </SafeAreaView>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.label}>I am joining as</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTS.map((o) => {
                const active = role === o.r;
                return (
                  <Pressable key={o.r} onPress={() => setRole(o.r)} style={[styles.roleCard, active && styles.roleCardActive]}>
                    <View style={[styles.roleIcon, active && { backgroundColor: C.forest }]}><Ionicons name={o.icon} size={18} color={active ? C.white : C.accent2} /></View>
                    <Text style={[styles.roleLabel, active && { color: C.forest }]}>{o.label}</Text>
                    <Text style={styles.roleSub}>{o.sub}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.warn}>Choose carefully — your role can’t be changed after signup.</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}><AuthField label="First name" icon="person-outline" value={firstName} onChangeText={setFirstName} placeholder="First" autoCapitalize="words" /></View>
              <View style={{ flex: 1 }}><AuthField label="Last name" icon="person-outline" value={lastName} onChangeText={setLastName} placeholder="Last" autoCapitalize="words" /></View>
            </View>
            <AuthField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <AuthField label="Country (optional)" icon="globe-outline" value={country} onChangeText={setCountry} placeholder="e.g. Pakistan" autoCapitalize="words" />
            <AuthField label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} placeholder="At least 6 characters" autoCapitalize="none" />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={onSubmit} disabled={loading} style={{ marginTop: 4 }}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                {loading ? <ActivityIndicator color={C.white} /> : <Text style={styles.ctaText}>Create account</Text>}
              </LinearGradient>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.muted}>Already have an account? </Text>
              <Link href="/auth/login" style={styles.link}>Sign in</Link>
            </View>
          </View>
          <View style={{ height: SPACE.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  hero: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: SPACE.section + SPACE.lg, alignItems: 'center' },
  emblemRing: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(201,162,39,0.18)', alignItems: 'center', justifyContent: 'center' },
  emblemRing2: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(227,192,74,0.55)', alignItems: 'center', justifyContent: 'center' },
  emblem: { width: 50, height: 50 },
  brand: { color: C.white, fontFamily: FONT.displayBold, fontSize: 26, marginTop: 12, letterSpacing: 0.3 },
  heroTitle: { color: C.goldLight, fontFamily: FONT.bodyBold, fontSize: 15, marginTop: 8 },
  heroSub: { color: C.textLo, fontFamily: FONT.body, fontSize: 13, marginTop: 4, textAlign: 'center' },

  card: { backgroundColor: C.cream, marginHorizontal: SPACE.md, marginTop: -SPACE.section, borderRadius: RADIUS.xl, padding: SPACE.lg, borderWidth: 1, borderColor: C.borderSoft, shadowColor: '#0B1F14', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  label: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink, marginBottom: 10 },
  roleGrid: { flexDirection: 'row', gap: 8 },
  roleCard: { flex: 1, borderWidth: 1.5, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', backgroundColor: C.white },
  roleCardActive: { borderColor: C.gold, backgroundColor: C.tintGold },
  roleIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  roleLabel: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.ink },
  roleSub: { fontFamily: FONT.body, fontSize: 10, color: C.muted, marginTop: 2, textAlign: 'center' },
  warn: { fontFamily: FONT.body, fontSize: 11, color: C.accent2, marginTop: 10, marginBottom: SPACE.md },
  row: { flexDirection: 'row', gap: 10 },
  error: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm },
  cta: { borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.white },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACE.lg },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  link: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  confirmWrap: { flex: 1, justifyContent: 'center', padding: SPACE.xl, gap: SPACE.md, alignItems: 'center' },
  confirmIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.sm },
  confirmTitle: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink, textAlign: 'center' },
  confirmBody: { fontFamily: FONT.body, fontSize: 15, color: C.text, lineHeight: 22, marginBottom: SPACE.sm, textAlign: 'center' },
});
