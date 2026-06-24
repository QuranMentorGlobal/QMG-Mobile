// app/student/support.tsx — support tickets list + create ticket (bottom sheet).
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle, Field, Button, StatusBadge } from '@/components/ui';
import { EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTickets, createTicket, type Ticket } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const CATEGORIES = ['Technical', 'Billing', 'Booking', 'Account', 'Other'];
const PRIORITIES = ['low', 'normal', 'high'];

export default function StudentSupport() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setTickets(await fetchTickets(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading support…" /></Screen>;

  return (
    <Screen>
      <PageTitle title="Support" subtitle="Get help from our team" />

      <Pressable onPress={() => setOpen(true)}>
        <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
          <Ionicons name="add" size={20} color={C.white} />
          <Text style={styles.newBtnText}>New Support Ticket</Text>
        </LinearGradient>
      </Pressable>

      <View style={{ height: SPACE.md }} />

      {tickets.length === 0 ? (
        <EmptyCard icon="help-buoy-outline" title="No tickets yet" body="Open a ticket and our team will get back to you." />
      ) : (
        tickets.map((t) => (
          <View key={t.id} style={styles.ticket}>
            <View style={styles.ticketTop}>
              <Text style={styles.ticketSubject} numberOfLines={1}>{t.subject}</Text>
              <StatusBadge status={t.status} />
            </View>
            <Text style={styles.ticketMsg} numberOfLines={2}>{t.message}</Text>
            <View style={styles.ticketMeta}>
              <View style={styles.catPill}><Text style={styles.catText}>{t.category}</Text></View>
              <Text style={styles.ticketDate}>{new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
            </View>
          </View>
        ))
      )}

      <NewTicketSheet open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} uid={session?.user?.id ?? ''} />
    </Screen>
  );
}

function NewTicketSheet({ open, onClose, onCreated, uid }: { open: boolean; onClose: () => void; onCreated: () => void; uid: string }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!subject.trim() || !message.trim()) { setErr('Please add a subject and message.'); return; }
    setBusy(true);
    const ok = await createTicket(uid, { subject: subject.trim(), category, message: message.trim(), priority });
    setBusy(false);
    if (!ok) { setErr('Could not submit ticket. Please try again.'); return; }
    setSubject(''); setMessage(''); setCategory('Technical'); setPriority('normal');
    onCreated();
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>New Support Ticket</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Brief description of your issue" />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <Pressable key={p} onPress={() => setPriority(p)} style={[styles.chip, priority === p && styles.chipActive]}>
                  <Text style={[styles.chipText, priority === p && styles.chipTextActive, { textTransform: 'capitalize' }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: SPACE.md }} />
            <Field label="Message" value={message} onChangeText={setMessage} placeholder="Describe your issue in detail…" multiline style={{ height: 110, textAlignVertical: 'top', paddingTop: 12 }} />
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <Button title="Submit Ticket" onPress={submit} loading={busy} />
            <View style={{ height: SPACE.lg }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14, ...SHADOW.card },
  newBtnText: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 15 },
  ticket: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  ticketSubject: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, flex: 1 },
  ticketMsg: { fontFamily: FONT.body, fontSize: 13, color: C.muted, lineHeight: 19 },
  ticketMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  catPill: { backgroundColor: C.tintGold, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  catText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.accent2 },
  ticketDate: { fontFamily: FONT.body, fontSize: 12, color: C.faint },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.cream, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, padding: SPACE.lg, maxHeight: '88%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderSoft, alignSelf: 'center', marginBottom: SPACE.md },
  sheetTitle: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink, marginBottom: SPACE.md },
  label: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACE.md },
  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { borderColor: C.gold, backgroundColor: C.tintGold },
  chipText: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.muted },
  chipTextActive: { color: C.accent2, fontFamily: FONT.bodySemi },
  err: { color: C.red, fontFamily: FONT.bodyMed, fontSize: 13, marginBottom: SPACE.sm },
});
