// src/components/Button.tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, fonts } from '@/theme';

type Variant = 'gold' | 'outline' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'gold',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isGold = variant === 'gold';
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isGold && styles.gold,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGold ? colors.goldOnDark : colors.gold} />
      ) : (
        <Text style={[styles.label, isGold ? styles.labelGold : styles.labelLight]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  gold: { backgroundColor: colors.gold },
  outline: { borderWidth: 1.5, borderColor: colors.surfaceLine, backgroundColor: 'transparent' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15.5 },
  labelGold: { color: colors.goldOnDark }, // dark text on gold — required for contrast
  labelLight: { color: colors.text },
});
