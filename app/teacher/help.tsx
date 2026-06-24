// app/teacher/help.tsx — teacher Help Center (FAQ + quick links).
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PageTitle } from '@/components/ui';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const FAQS = [
  { q: 'How do I get verified?', a: 'Complete your profile, then submit your identity and Ijazah documents from the Verification section on the website. Our team reviews within 1–2 business days.' },
  { q: 'When do I get paid?', a: 'Earnings move through pending → available → payout. Once a payout is processed it appears as "paid" in your Earnings ledger. Set up your payout method in Payout Settings on the website.' },
  { q: 'How are trial conversions counted?', a: 'A trial converts when a student who took a free or paid trial with you books a paid lesson or course afterwards.' },
  { q: 'How do I create a course?', a: 'Use Course Studio on the website to publish trial, live, or recorded courses. They appear instantly in your mobile Courses tab.' },
  { q: 'A student didn\'t show up — what now?', a: 'Mark attendance from your Attendance Center. No-shows are tracked and protected by our money-back policy for students.' },
];

const LINKS = [
  { icon: 'person-circle-outline' as const, label: 'My Profile', route: '/teacher/profile' },
  { icon: 'cash-outline' as const, label: 'Earnings', route: '/teacher/earnings' },
  { icon: 'help-buoy-outline' as const, label: 'Contact Support', route: '/teacher/support' },
];

export default function TeacherHelp() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen>
      <PageTitle title="Help Center" subtitle="Answers for teachers" />

      <View style={styles.linkRow}>
        {LINKS.map((l) => (
          <Pressable key={l.label} onPress={() => router.push(l.route as any)} style={styles.linkCard}>
            <View style={styles.linkIcon}><Ionicons name={l.icon} size={20} color={C.forest} /></View>
            <Text style={styles.linkLabel}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Frequently asked</Text>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <Pressable key={i} onPress={() => setOpen(isOpen ? null : i)} style={styles.faq}>
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
            </View>
            {isOpen ? <Text style={styles.faqA}>{f.a}</Text> : null}
          </Pressable>
        );
      })}

      <Pressable onPress={() => Linking.openURL('https://www.quranmentorglobal.com/platform/help')} style={styles.webLink}>
        <Ionicons name="globe-outline" size={16} color={C.accent2} />
        <Text style={styles.webLinkText}>Visit the full Help Center on the web</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.lg },
  linkCard: { flex: 1, backgroundColor: C.card, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, alignItems: 'center', gap: 8, ...SHADOW.card },
  linkIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.ink, textAlign: 'center' },
  section: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginBottom: SPACE.md },
  faq: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQ: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink, flex: 1 },
  faqA: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 20 },
  webLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACE.md, paddingVertical: SPACE.md },
  webLinkText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.accent2 },
});
