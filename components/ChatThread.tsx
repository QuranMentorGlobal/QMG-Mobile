// components/ChatThread.tsx — shared chat thread for any role.
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchMessages, sendMessage, markRead, type ChatMessage } from '@/lib/db';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

export function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const m = await fetchMessages(id);
    setMessages(m);
    setLoading(false);
    markRead(id, uid);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }, [id, uid]);
  useEffect(() => { load(); }, [load]);

  async function onSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const optimistic: ChatMessage = { id: `tmp-${Date.now()}`, sender_id: uid, body, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    const ok = await sendMessage(id!, uid, body);
    setSending(false);
    if (ok) load();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
              <Ionicons name="chevron-back" size={24} color={C.white} />
            </Pressable>
            <Text style={styles.headerTitle}>Conversation</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <Loading label="Loading…" />
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={28} color={C.gold} /></View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyBody}>Say salaam to start the conversation.</Text>
              </View>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === uid;
                return (
                  <View key={m.id} style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}>
                    <View style={[styles.bubble, mine ? styles.mine : styles.their]}>
                      <Text style={[styles.bubbleText, mine && { color: C.white }]}>{m.body}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={C.faint}
            style={styles.input}
            multiline
          />
          <Pressable onPress={onSend} disabled={!text.trim()}>
            <LinearGradient colors={G.primary} style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]}>
              <Ionicons name="send" size={18} color={C.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.sm, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 16 },
  scroll: { padding: SPACE.md, paddingBottom: SPACE.lg, flexGrow: 1 },
  bubbleRow: { marginBottom: SPACE.sm, flexDirection: 'row' },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: C.forest, borderBottomRightRadius: 6 },
  their: { backgroundColor: C.white, borderBottomLeftRadius: 6, ...{ shadowColor: '#0B1F14', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 } },
  bubbleText: { fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 21 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.section * 2 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  emptyTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: SPACE.sm, paddingHorizontal: SPACE.md, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.borderSoft },
  input: { flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONT.body, fontSize: 15, color: C.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
