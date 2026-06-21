// src/screens/auth/RegisterScreen.tsx
// Registration reuses the existing QMG signup logic (auth user + profiles.role +
// teacher_profiles seed). Role selector is scalable — same four roles as the web.
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Screen, Input, Button } from '@/components';
import { colors, fonts, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/database';
import type { AuthScreenProps } from '@/navigation/types';

const ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'teacher', label: 'Teacher' },
];

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Missing details', 'Please fill in your name, email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp({ firstName, lastName, email, password, role, country });
      Alert.alert('Account created', 'Welcome to Quran Mentor Global!');
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Get started</Text>
            <Text style={styles.title}>Create your account</Text>
          </View>

          <Text style={styles.roleLabel}>I AM A</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <Pressable key={r.value} onPress={() => setRole(r.value)} style={[styles.role, active && styles.roleActive]}>
                  <Text style={[styles.roleTxt, active && styles.roleTxtActive]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Input label="FIRST NAME" value={firstName} onChangeText={setFirstName} placeholder="Ahmed" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="LAST NAME" value={lastName} onChangeText={setLastName} placeholder="Khan" />
            </View>
          </View>
          <Input label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="COUNTRY" value={country} onChangeText={setCountry} placeholder="United Kingdom" />
          <Input label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />

          <Button label="Create Account" onPress={onSubmit} loading={loading} style={{ marginTop: 6 }} />

          <Pressable onPress={() => navigation.goBack()} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerStrong}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  header: { marginBottom: spacing.lg },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.gold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  roleLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted, marginBottom: 7, letterSpacing: 0.3 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  role: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceLine, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  roleActive: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  roleTxt: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: colors.textMuted },
  roleTxtActive: { color: colors.gold },
  nameRow: { flexDirection: 'row', gap: 10 },
  footerLink: { marginTop: 22, alignItems: 'center' },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  footerStrong: { fontFamily: fonts.bodySemi, color: colors.gold },
});
