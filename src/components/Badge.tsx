// src/components/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fonts } from '@/theme';

export function Badge({ label, tone = 'gold' }: { label: string; tone?: 'gold' | 'soft' | 'cream' }) {
  return (
    <View style={[styles.base, tone === 'gold' && styles.gold, tone === 'soft' && styles.soft, tone === 'cream' && styles.cream]}>
      <Text style={[styles.txt, tone === 'gold' ? styles.txtDark : tone === 'cream' ? styles.txtCream : styles.txtGold]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  gold: { backgroundColor: colors.gold },
  soft: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: 'rgba(200,162,74,0.3)' },
  cream: { backgroundColor: colors.creamAlt },
  txt: { fontFamily: fonts.bodySemi, fontSize: 10.5, letterSpacing: 0.3 },
  txtDark: { color: colors.goldOnDark },
  txtGold: { color: colors.gold },
  txtCream: { color: colors.textOnCreamMuted },
});
