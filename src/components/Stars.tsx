// src/components/Stars.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: size, color: s <= full ? colors.gold : colors.surfaceLine }}>
          ★
        </Text>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 1 } });
