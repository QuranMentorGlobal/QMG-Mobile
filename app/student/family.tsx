// app/student/family.tsx — student "Family Links": parents/guardians can request
// to follow the student's learning; the student approves or declines here.
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchPendingLinks, respondToLink, type LinkRequest } from '@/lib/familyActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function StudentFamily() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setRequests(await fetchPendingLinks(session.user.id)); setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string, accept: boolean) {
    setBusy(id);
    const ok = await respondToLink(id, accept);
    setBusy(null);
    if (ok) setRequests((r) => r.filter((x) => x.id !== id));
  }

  if (loading) return <Screen scroll={false}><Loading label="Loading family links…" /></Screen>;

  return (
    <Screen>
      <Text style={styles.eyebrow}>FAMILY</Text>
      <Text style={styles.h1}>Family Links</Text>
      <Text style={styles.sub}>A parent or guardian can request to follow your learning. You decide whether to approve it.</Text>

      {requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="people" size={26} color={C.ink} /></View>
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptyBody}>When a parent requests to link your account, it will appear here for your approval.</Text>
        </View>
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.reqCard}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={styles.reqIcon}><Ionicons name="people-outline" size={20} color={C.gold} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqName}>{r.parentName}</Text>
                {r.parentEmail ? <Text style={styles.reqEmail}>{r.parentEmail}</Text> : null}
                <Text style={styles.reqBody}>wants to link your account as a family member. If you approve, they'll be able to see your bookings, attendance and progress, and book lessons on your behalf.</Text>
              </View>
            </View>
            <View style={styles.reqActions}>
              <Pressable onPress={() => respond(r.id, true)} disabled={busy === r.id} style={{ flex: 1 }}>
                <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.approveBtn}>
                  {busy === r.id ? <ActivityIndicator color={C.white} size="small" /> : <Text style={styles.approveText}>Approve</Text>}
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => respond(r.id, false)} disabled={busy === r.id} style={[styles.declineBtn, { flex: 1 }]}><Text style={styles.declineText}>Decline</Text></Pressable>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 4 },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 8, marginBottom: SPACE.lg, lineHeight: 20 },
  emptyCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.borderSoft, borderStyle: 'dashed', padding: SPACE.section, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#E9E7E0', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink, marginTop: SPACE.md },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: SPACE.sm },
  reqCard: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  reqIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(201,162,39,0.10)', alignItems: 'center', justifyContent: 'center' },
  reqName: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  reqEmail: { fontFamily: FONT.body, fontSize: 12, color: C.faint, marginTop: 2 },
  reqBody: { fontFamily: FONT.body, fontSize: 13, color: C.text, marginTop: 8, lineHeight: 19 },
  reqActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  approveBtn: { borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  approveText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  declineBtn: { borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220,38,38,0.06)' },
  declineText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.red },
});
