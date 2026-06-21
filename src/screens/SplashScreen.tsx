// src/screens/SplashScreen.tsx
// Branded bootstrapping screen — shown while fonts load and the stored session is
// restored. Charcoal background, gold wordmark, white tagline.
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '@/theme';

export function SplashScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.mark}>
        <Text style={styles.arabic}>ﷲ</Text>
      </View>
      <Text style={styles.brand}>Quran Mentor Global</Text>
      <Text style={styles.tag}>Learn the Quran with verified teachers worldwide</Text>
      <ActivityIndicator color={colors.gold} style={{ marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  mark: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: 'rgba(200,162,74,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  arabic: { fontSize: 44, color: colors.gold },
  brand: { fontFamily: fonts.display, fontSize: 26, color: colors.text, textAlign: 'center' },
  tag: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 280 },
});
