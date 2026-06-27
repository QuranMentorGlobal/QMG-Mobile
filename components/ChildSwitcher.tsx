// components/ChildSwitcher.tsx
// The "VIEWING" row at the top of every parent screen — a horizontal scroll of
// pills: [All Children] + one pill per linked child (avatar/initials + name).
// Reads/sets the shared selection from lib/parentChild. Renders nothing until
// children load or when the parent has none. Mirrors the web parent selector.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui';
import { useParentChild } from '@/lib/parentChild';
import { C, FONT, RADIUS, SPACE } from '@/lib/theme';

export function ChildSwitcher({ allowAll = true }: { allowAll?: boolean }) {
  const { children, selectedChildId, setSelectedChildId, loading } = useParentChild();
  if (loading || children.length === 0) return null;

  // When "All" is not allowed (e.g. attendance needs exactly one child) and the
  // current selection is 'all', the screen owns its own active child — we still
  // render the per-child pills so the user can switch.
  const options: { id: string; name: string; avatar: string | null }[] = [
    ...(allowAll ? [{ id: 'all', name: 'All Children', avatar: null }] : []),
    ...children.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar })),
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <Ionicons name="people-outline" size={13} color={C.gold} />
        <Text style={styles.eyebrow}>VIEWING</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => {
          const on = selectedChildId === o.id || (!allowAll && selectedChildId === 'all' && o.id === options[0]?.id);
          const inner = (
            <>
              {o.id === 'all' ? (
                <Ionicons name="people" size={15} color={on ? C.white : C.forest} />
              ) : (
                <Avatar uri={o.avatar} name={o.name} size={22} />
              )}
              <Text style={[styles.pillText, on && { color: C.white }]} numberOfLines={1}>{o.name}</Text>
            </>
          );
          if (on) {
            return (
              <Pressable key={o.id} onPress={() => setSelectedChildId(o.id)}>
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
                  {inner}
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable key={o.id} onPress={() => setSelectedChildId(o.id)} style={[styles.pill, styles.pillOff]}>
              {inner}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: SPACE.xs, marginBottom: SPACE.md },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2 },
  row: { flexDirection: 'row', gap: 8, paddingRight: SPACE.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200 },
  pillOff: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  pillText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink, flexShrink: 1 },
});
