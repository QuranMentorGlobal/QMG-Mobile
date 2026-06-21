// src/components/Avatar.tsx
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

export function Avatar({
  uri,
  initials,
  size = 56,
  ring = true,
}: {
  uri?: string | null;
  initials: string;
  size?: number;
  ring?: boolean;
}) {
  const [err, setErr] = useState(false);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const border = ring ? { borderWidth: 2, borderColor: colors.gold } : null;
  if (uri && !err) {
    return <Image source={{ uri }} style={[dim, border]} onError={() => setErr(true)} />;
  }
  return (
    <View style={[dim, border, styles.fallback]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.display, color: colors.gold },
});
