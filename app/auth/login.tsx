// app/auth/login.tsx — premium auth: signature-gradient hero with glowing logo
// emblem + brand wordmark, an overlapping white card with role tabs, icon inputs
// (show/hide password), and a gradient sign-in button. Signs in via Supabase;
// the auth gate routes by role.
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { AuthField } from '@/components/AuthField';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

const EMBLEM = require('@/assets/splash-icon.png');
const ROLES = [
  { r: 'student', label: 'Student' },
  { r: 'parent', label: 'Parent' },
  { r: 'teacher', label: 'Teacher' },
] as const;

export default function Login() {
  const router = useRouter();
  const { signIn, refreshProfile } = useAuth();
  const [role, setRole] = useState<(typeof ROLES)[number]['r']>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    const res = await signIn(email, password);
    if (res.error) { setError(res.error); setLoading(false); return; }
    await refreshProfile();
    setLoading(false);
    router.replace('/' as any);
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
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSub}>Sign in to continue your learning journey.</Text>
            </SafeAreaView>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.roleTabs}>
              {ROLES.map((t) => {
                const active = role === t.r;
                return (
                  <Pressable key={t.r} onPress={() => setRole(t.r)} style={[styles.roleTab, active && styles.roleTabActive]}>
                    <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <AuthField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <AuthField label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} placeholder="••••••••" autoCapitalize="none" />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={onSubmit} disabled={loading} style={{ marginTop: 4 }}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                {loading ? <ActivityIndicator color={C.white} /> : (
                  <Text style={styles.ctaText}>{role === 'teacher' ? 'Sign in as Teacher' : role === 'parent' ? 'Sign in as Parent' : 'Sign in as Student'}</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.muted}>New to Muddarris? </Text>
              <Link href="/auth/signup" style={styles.link}>Create an account</Link>
            </View>
          </View>

          <Text style={styles.tagline}>Learn the Quran with certified teachers, anywhere.</Text>
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
  roleTabs: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(17,17,17,0.05)', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACE.lg },
  roleTab: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  roleTabActive: { backgroundColor: C.white, borderWidth: 1, borderColor: C.gold, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  roleTabText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.muted },
  roleTabTextActive: { color: C.forest },
  error: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm },
  cta: { borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.white },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACE.lg },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  link: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  tagline: { textAlign: 'center', fontFamily: FONT.body, fontSize: 12, color: C.faint, marginTop: SPACE.lg, marginBottom: SPACE.md, paddingHorizontal: SPACE.lg },
});
