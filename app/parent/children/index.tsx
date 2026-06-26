// app/parent/children/index.tsx — premium children management.
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle, Field, Button } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchParentDash, addChildByEmail, type ParentDash } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function Children() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<ParentDash | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setD(await fetchParentDash(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading children…" /></Screen>;

  return (
    <Screen>
      <PageTitle title="My Children" subtitle={`${d.children.length} linked account${d.children.length === 1 ? '' : 's'}`} />

      {d.children.length === 0 ? (
        <EmptyCard icon="people-outline" title="No children linked yet" body="Add your child's account to manage their learning." />
      ) : (
        d.children.map((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Child';
          const st = d.childStats[c.id] ?? { done: 0, upcoming: 0, attendance: 0 };
          return (
            <View key={c.id} style={styles.card}>
              <Pressable onPress={() => router.push(`/parent/children/${c.id}` as any)} style={styles.top}>
                <Initials name={name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.sub}>{st.done} lessons done · {st.upcoming} upcoming</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.faint} />
              </Pressable>
              <View style={styles.attRow}>
                <Text style={styles.attLabel}>Attendance</Text>
                <Text style={styles.attPct}>{st.attendance}%</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${st.attendance}%` }]} /></View>
              <Pressable onPress={() => router.push('/parent/teachers')} style={styles.bookBtn}>
                <Ionicons name="book-outline" size={16} color={C.accent2} />
                <Text style={styles.bookText}>Book a Lesson</Text>
              </Pressable>
            </View>
          );
        })
      )}

      <Pressable onPress={() => setAddOpen(true)} style={styles.addBtn}>
        <Ionicons name="add" size={20} color={C.forest} />
        <Text style={styles.addText}>Add Child</Text>
      </Pressable>

      <AddChildSheet open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} parentId={session?.user?.id ?? ''} />
    </Screen>
  );
}

function AddChildSheet({ open, onClose, onAdded, parentId }: { open: boolean; onClose: () => void; onAdded: () => void; parentId: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    if (!email.trim()) { setMsg('Enter your child\'s account email.'); return; }
    setBusy(true);
    const res = await addChildByEmail(parentId, email);
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? 'Could not add child.'); return; }
    setEmail(''); onAdded();
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Add Child</Text>
          <Text style={styles.sheetBody}>Link an existing student account by email. Your child must already have a Muddarris student account.</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Field label="Child's account email" value={email} onChangeText={setEmail} placeholder="child@example.com" keyboardType="email-address" />
            {msg ? <Text style={styles.err}>{msg}</Text> : null}
            <Button title="Link Child" onPress={submit} loading={busy} />
            <View style={{ height: SPACE.lg }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  name: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  attRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.md, marginBottom: 6 },
  attLabel: { fontFamily: FONT.bodyMed, fontSize: 12, color: C.muted },
  attPct: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold },
  track: { height: 7, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: C.gold },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACE.md, backgroundColor: C.tintGold, borderRadius: RADIUS.md, paddingVertical: 11 },
  bookText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.accent2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.gold, borderStyle: 'dashed', borderRadius: RADIUS.md, paddingVertical: 16, marginTop: SPACE.xs },
  addText: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.forest },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.cream, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, padding: SPACE.lg, maxHeight: '70%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderSoft, alignSelf: 'center', marginBottom: SPACE.md },
  sheetTitle: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  sheetBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 6, marginBottom: SPACE.md, lineHeight: 19 },
  err: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm },
});
