// app/auth/login.tsx
// Login: dark signature hero on top, light form below (mirrors the web auth layout:
// dark-left / light-form). Signs in via Supabase, then the auth gate routes by role.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, homeRouteForRole } from '@/lib/auth';
import { Button, Field } from '@/components/ui';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

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
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const res = await signIn(email, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    await refreshProfile();
    setLoading(false);
    router.replace('/' as any); // gate decides the role home
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={G.signature}
            locations={G.signatureLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.brand}>Muddarris</Text>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSub}>Sign in to continue your learning journey.</Text>
          </LinearGradient>

          <View style={styles.form}>
            <View style={styles.roleTabs}>
              {ROLES.map((t) => {
                const active = role === t.r;
                return (
                  <Pressable
                    key={t.r}
                    onPress={() => setRole(t.r)}
                    style={[styles.roleTab, active && styles.roleTabActive]}
                  >
                    <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={role === 'teacher' ? 'Sign in as Teacher' : role === 'parent' ? 'Sign in as Parent' : 'Sign in as Student'}
              onPress={onSubmit}
              loading={loading}
            />

            <View style={styles.footer}>
              <Text style={styles.muted}>New to Muddarris? </Text>
              <Link href="/auth/signup" style={styles.link}>
                Create an account
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  hero: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xl * 1.4, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  brand: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 13, letterSpacing: 0.5 },
  heroTitle: { color: C.white, fontFamily: FONT.displayBold, fontSize: 30, marginTop: 10 },
  heroSub: { color: C.textLo, fontFamily: FONT.body, fontSize: 14, marginTop: 6 },
  form: { padding: SPACE.lg },
  roleTabs: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(17,17,17,0.04)', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACE.lg },
  roleTab: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  roleTabActive: { backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  roleTabText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.muted },
  roleTabTextActive: { color: C.forest },
  error: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACE.lg },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  link: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
});
