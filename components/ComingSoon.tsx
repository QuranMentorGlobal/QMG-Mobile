// components/ComingSoon.tsx — branded placeholder for sidebar pages that are
// listed but not yet built. Keeps navigation complete (no dead routes) until the
// real screen ships.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export function ComingSoon({ eyebrow, title, note }: { eyebrow?: string; title: string; note?: string }) {
  return (
    <Screen>
      <Text style={styles.eyebrow}>{eyebrow ?? 'COMING SOON'}</Text>
      <Text style={styles.h1}>{title}</Text>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="construct-outline" size={30} color={C.gold} /></View>
        <Text style={styles.cardTitle}>We're building this page</Text>
        <Text style={styles.cardBody}>{note ?? `Your ${title} page is on the way and will appear here in an upcoming update.`}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2, marginBottom: SPACE.lg, textAlign: 'center' },
  card: { backgroundColor: C.white, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.section, alignItems: 'center', ...SHADOW.card },
  icon: { width: 70, height: 70, borderRadius: 22, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  cardTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  cardBody: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 8, textAlign: 'center', lineHeight: 21 },
});
