// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Screen, Input, Button } from '@/components';
import { colors, fonts, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import type { AuthScreenProps } from '@/navigation/types';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // RootNavigator swaps to the app stack automatically on session change.
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Please check your credentials and try again.');
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
            <Text style={styles.kicker}>Welcome back</Text>
            <Text style={styles.title}>Sign in to{'\n'}Quran Mentor Global</Text>
            <Text style={styles.sub}>Continue your lessons and connect with your teacher.</Text>
          </View>

          <Input label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

          <Button label="Sign In" onPress={onSubmit} loading={loading} style={{ marginTop: 6 }} />

          <Pressable onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              New to QMG? <Text style={styles.footerStrong}>Create an account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  header: { marginBottom: spacing.xl },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.gold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, lineHeight: 36 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 10 },
  footerLink: { marginTop: 22, alignItems: 'center' },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  footerStrong: { fontFamily: fonts.bodySemi, color: colors.gold },
});
