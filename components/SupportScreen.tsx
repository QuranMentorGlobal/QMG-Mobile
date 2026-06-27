// components/SupportScreen.tsx — shared support (tickets + create) for any role.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle, Field, Button, StatusBadge } from '@/components/ui';
import { EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTickets, createTicket, aiStatus, aiSupportAssistant, type Ticket } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const CATEGORIES = ['Technical', 'Billing', 'Booking', 'Account', 'Other'];
const PRIORITIES = ['low', 'normal', 'high'];

export function SupportScreen() {
  const { session, profile } = useAuth();
  const role = (profile?.role as string) || 'student';
  const [aiEnabled, setAiEnabled] = useState(false);
  const [prefill, setPrefill] = useState('');
  useEffect(() => { aiStatus().then(setAiEnabled); }, []);
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

      <SupportAssistant role={role} enabled={aiEnabled} onEscalate={(question) => { setPrefill(question); setOpen(true); }} />

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

      <NewTicketSheet open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); setPrefill(''); load(); }} uid={session?.user?.id ?? ''} initialMessage={prefill} />
    </Screen>
  );
}

function SupportAssistant({ role, enabled, onEscalate }: { role: string; enabled: boolean; onEscalate: (q: string) => void }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  if (!enabled) return null;
  async function ask() {
    if (!q.trim() || loading) return;
    setLoading(true); setAnswer(null); setAsked(true);
    const r = await aiSupportAssistant(q, role);
    setAnswer(r.answer);
    setLoading(false);
  }
  return (
    <View style={styles.asstCard}>
      <View style={styles.asstHead}>
        <View style={styles.asstIcon}><Ionicons name="sparkles" size={16} color={C.gold} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.asstTitle}>Get an instant answer</Text>
          <Text style={styles.asstSub}>Ask a question — we'll try to answer from the Help Center before you open a ticket.</Text>
        </View>
      </View>
      <View style={styles.asstRow}>
        <TextInput value={q} onChangeText={setQ} placeholder="e.g. How do I reschedule a lesson?" placeholderTextColor={C.faint} style={styles.asstInput} onSubmitEditing={ask} returnKeyType="search" />
        <Pressable onPress={ask} disabled={loading || !q.trim()}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.asstAsk, (loading || !q.trim()) && { opacity: 0.6 }]}>
            {loading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.asstAskText}>Ask</Text>}
          </LinearGradient>
        </Pressable>
      </View>
      {answer && (
        <View style={styles.asstAnswer}>
          <Text style={styles.asstAnswerText}>{answer}</Text>
          <View style={styles.asstActions}>
            <Pressable onPress={() => { setAnswer(null); setQ(''); setAsked(false); }} style={styles.solved}><Text style={styles.solvedText}>This solved it</Text></Pressable>
            <Pressable onPress={() => onEscalate(q)} style={styles.escalate}><Text style={styles.escalateText}>Still need help — create a ticket</Text></Pressable>
          </View>
        </View>
      )}
      {asked && !loading && !answer && (
        <View style={styles.asstAnswer}>
          <Text style={styles.asstNoText}>I couldn't find a clear answer for that — our team can help directly.</Text>
          <Pressable onPress={() => onEscalate(q)} style={{ marginTop: 10 }}>
            <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createTicket}><Text style={styles.asstAskText}>Create a ticket</Text></LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function NewTicketSheet({ open, onClose, onCreated, uid, initialMessage }: { open: boolean; onClose: () => void; onCreated: () => void; uid: string; initialMessage?: string }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  useEffect(() => { if (open && initialMessage) setMessage(initialMessage); }, [open, initialMessage]);
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
  asstCard: { backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(201,162,39,0.18)', borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  asstHead: { flexDirection: 'row', gap: 10, marginBottom: SPACE.md },
  asstIcon: { width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center' },
  asstTitle: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.ink },
  asstSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  asstRow: { flexDirection: 'row', gap: 8 },
  asstInput: { flex: 1, borderWidth: 1, borderColor: C.borderSoft, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONT.body, fontSize: 14, color: C.ink, backgroundColor: C.white },
  asstAsk: { borderRadius: RADIUS.md, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', minWidth: 64 },
  asstAskText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },
  asstAnswer: { marginTop: SPACE.md, padding: 12, borderRadius: RADIUS.md, backgroundColor: C.cream, borderWidth: 1, borderColor: C.borderSoft },
  asstAnswerText: { fontFamily: FONT.body, fontSize: 13.5, color: C.ink, lineHeight: 20 },
  asstActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  solved: { backgroundColor: C.success, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8 },
  solvedText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: C.white },
  escalate: { borderWidth: 1, borderColor: 'rgba(201,162,39,0.3)', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.white },
  escalateText: { fontFamily: FONT.bodyBold, fontSize: 12.5, color: C.accent2 },
  asstNoText: { fontFamily: FONT.body, fontSize: 13, color: C.muted, lineHeight: 19 },
  createTicket: { borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 9, alignSelf: 'flex-start' },
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
