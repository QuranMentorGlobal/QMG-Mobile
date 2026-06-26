// app/auth/signup.tsx
// Registration. Mirrors the web signup: choose role (locked after signup), create the
// auth user with metadata, then upsert the profiles row (and teacher_profiles for teachers).
// If email confirmation is enabled in Supabase, we tell the user to confirm via the email link.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/supabase';
import { Button, Field } from '@/components/ui';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

const ROLE_OPTS: { r: Role; label: string; sub: string }[] = [
  { r: 'student', label: 'Student', sub: 'Learn 1-on-1' },
  { r: 'parent', label: 'Parent', sub: 'Manage children' },
  { r: 'teacher', label: 'Teacher', sub: 'Teach & earn' },
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
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in your name, email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const res = await signUp({ email, password, firstName, lastName, role, country });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.needsConfirm) {
      setDone(true);
      return;
    }
    router.replace('/' as any);
  }

  if (done) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.confirmWrap}>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to {email}. Open it to verify your account, then come back and sign in.
          </Text>
          <Button title="Back to sign in" onPress={() => router.replace('/auth/login' as any)} />
        </View>
      </SafeAreaView>
    );
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
            <Text style={styles.heroTitle}>Create your account</Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.label}>I am joining as</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTS.map((o) => {
                const active = role === o.r;
                return (
                  <Pressable key={o.r} onPress={() => setRole(o.r)} style={[styles.roleCard, active && styles.roleCardActive]}>
                    <Text style={[styles.roleLabel, active && { color: C.forest }]}>{o.label}</Text>
                    <Text style={styles.roleSub}>{o.sub}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.warn}>Choose carefully — your role can’t be changed after signup.</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First" autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last" autoCapitalize="words" />
              </View>
            </View>
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            <Field label="Country (optional)" value={country} onChangeText={setCountry} placeholder="e.g. Pakistan" autoCapitalize="words" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title="Create account" onPress={onSubmit} loading={loading} />

            <View style={styles.footer}>
              <Text style={styles.muted}>Already have an account? </Text>
              <Link href="/auth/login" style={styles.link}>
                Sign in
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
  hero: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xl, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  brand: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 13, letterSpacing: 0.5 },
  heroTitle: { color: C.white, fontFamily: FONT.displayBold, fontSize: 26, marginTop: 8 },
  form: { padding: SPACE.lg },
  label: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.text, marginBottom: 10 },
  roleGrid: { flexDirection: 'row', gap: 10 },
  roleCard: { flex: 1, borderWidth: 2, borderColor: C.border, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', backgroundColor: C.white },
  roleCardActive: { borderColor: C.gold, backgroundColor: 'rgba(201,162,39,0.10)' },
  roleLabel: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.text },
  roleSub: { fontFamily: FONT.body, fontSize: 10, color: C.muted, marginTop: 3, textAlign: 'center' },
  warn: { fontFamily: FONT.body, fontSize: 11, color: C.accent2, marginTop: 10, marginBottom: SPACE.md },
  row: { flexDirection: 'row', gap: 10 },
  error: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACE.lg },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  link: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  confirmWrap: { flex: 1, justifyContent: 'center', padding: SPACE.xl, gap: SPACE.md },
  confirmTitle: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink },
  confirmBody: { fontFamily: FONT.body, fontSize: 15, color: C.text, lineHeight: 22, marginBottom: SPACE.sm },
});
