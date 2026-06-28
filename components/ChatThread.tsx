// components/ChatThread.tsx — shared chat thread (mirrors web): peer header with
// name + role badge, date dividers, incoming (white + avatar) and outgoing
// (forest→gold gradient + time + read ticks) bubbles, and an input bar with
// image attachments and voice notes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioPlayer, RecordingPresets, AudioModule } from 'expo-audio';
import { Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchMessages, sendMessage, sendAttachmentMessage, uploadToAttachments, markRead, fetchConversationPeer, type ChatMessage, type ConvPeer } from '@/lib/db';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

const ROLE_BADGE: Record<string, { fg: string; bg: string }> = {
  parent: { fg: '#166534', bg: 'rgba(255,255,255,0.16)' },
  student: { fg: '#C9CCF7', bg: 'rgba(255,255,255,0.16)' },
  admin: { fg: '#F0D98A', bg: 'rgba(255,255,255,0.16)' },
  teacher: { fg: '#FFFFFF', bg: 'rgba(255,255,255,0.16)' },
};
const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return ''; } };
function dayLabel(iso: string) {
  const d = new Date(iso); const now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, now)) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<ConvPeer>({ name: 'Conversation', role: '', avatar: null });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const load = useCallback(async () => {
    if (!id) return;
    const [msgs, p] = await Promise.all([fetchMessages(id), fetchConversationPeer(id, uid)]);
    setMessages(msgs); setPeer(p);
    setLoading(false);
    markRead(id, uid);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }, [id, uid]);
  useEffect(() => { load(); }, [load]);

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  async function onSendText() {
    const body = text.trim();
    if (!body || busy) return;
    setText('');
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, sender_id: uid, body, created_at: new Date().toISOString() }]);
    scrollDown();
    const ok = await sendMessage(id!, uid, body);
    if (ok) load();
  }
  async function onPickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true);
    const a = res.assets[0];
    const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase();
    const url = await uploadToAttachments(a.uri, `image/${ext === 'jpg' ? 'jpeg' : ext}`, ext);
    if (url) { await sendAttachmentMessage(id!, uid, { url, type: `image/${ext}`, name: a.fileName || 'Photo' }); load(); scrollDown(); }
    setBusy(false);
  }
  async function toggleRecord() {
    if (recording) {
      setRecording(false); setBusy(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          const url = await uploadToAttachments(uri, 'audio/m4a', 'm4a');
          if (url) { await sendAttachmentMessage(id!, uid, { url, type: 'audio/m4a', name: 'Voice note' }); load(); scrollDown(); }
        }
      } catch {}
      setBusy(false);
    } else {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      try { await recorder.prepareToRecordAsync(); recorder.record(); setRecording(true); } catch {}
    }
  }

  const rb = ROLE_BADGE[(peer.role || '').toLowerCase()] ?? ROLE_BADGE.student;
  let lastDay = '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={C.gold} /></Pressable>
            {peer.avatar ? <Image source={{ uri: peer.avatar }} style={styles.headAvatar} /> : <Initials name={peer.name} size={40} />}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={styles.headName} numberOfLines={1}>{peer.name}</Text>
                {peer.role ? <View style={[styles.roleBadge, { backgroundColor: rb.bg }]}><Text style={[styles.roleText, { color: rb.fg }]}>{peer.role.toUpperCase()}</Text></View> : null}
              </View>
              {peer.role ? <Text style={styles.headSub}>{peer.role.charAt(0).toUpperCase() + peer.role.slice(1)}</Text> : null}
            </View>
          </View>
        </View>
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
                const d = dayLabel(m.created_at);
                const showDay = d !== lastDay; lastDay = d;
                return (
                  <View key={m.id}>
                    {showDay ? <View style={styles.dayWrap}><Text style={styles.dayPill}>{d}</Text></View> : null}
                    <Bubble m={m} mine={m.sender_id === uid} peer={peer} />
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={styles.inputBar}>
          <Pressable onPress={onPickImage} disabled={busy} hitSlop={6} style={styles.iconBtn}><Ionicons name="attach" size={22} color={C.forest} /></Pressable>
          <TextInput value={text} onChangeText={setText} placeholder={recording ? 'Recording…' : `Message ${peer.name.split(' ')[0] || ''}…`} placeholderTextColor={C.faint} style={styles.input} multiline editable={!recording} />
          {text.trim() ? (
            <Pressable onPress={onSendText} disabled={busy}>
              <LinearGradient colors={G.primary} style={styles.sendBtn}><Ionicons name="send" size={18} color={C.white} /></LinearGradient>
            </Pressable>
          ) : (
            <Pressable onPress={toggleRecord} disabled={busy}>
              <View style={[styles.sendBtn, { backgroundColor: recording ? C.red : C.forest }]}>
                {busy ? <ActivityIndicator color={C.white} size="small" /> : <Ionicons name={recording ? 'stop' : 'mic'} size={20} color={C.white} />}
              </View>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ m, mine, peer }: { m: ChatMessage; mine: boolean; peer: ConvPeer }) {
  const isImg = m.attachment_type?.startsWith('image');
  const isAudio = m.attachment_type?.startsWith('audio');
  const pad = isImg || isAudio ? 6 : undefined;
  const content = (
    <>
      {isImg && m.attachment_url ? <Image source={{ uri: m.attachment_url }} style={styles.imgAtt} /> : null}
      {isAudio && m.attachment_url ? <AudioBubble uri={m.attachment_url} mine={mine} /> : null}
      {m.body ? <Text style={[styles.bubbleText, mine && { color: C.white }, (isImg || isAudio) && { paddingHorizontal: 8, paddingTop: 6 }]}>{m.body}</Text> : null}
    </>
  );
  return (
    <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}>
      {!mine ? (peer.avatar ? <Image source={{ uri: peer.avatar }} style={styles.smallAvatar} /> : <Initials name={peer.name} size={28} />) : null}
      <View style={{ maxWidth: '78%' }}>
        {mine ? (
          <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.bubble, styles.mine, pad ? { padding: pad } : null]}>{content}</LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.their, pad ? { padding: pad } : null]}>{content}</View>
        )}
        <View style={[styles.metaRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
          <Text style={styles.metaTime}>{fmtTime(m.created_at)}</Text>
          {mine ? <Ionicons name="checkmark-done" size={13} color={C.gold} style={{ marginLeft: 3 }} /> : null}
        </View>
      </View>
    </View>
  );
}

function AudioBubble({ uri, mine }: { uri: string; mine: boolean }) {
  const player = useAudioPlayer(uri);
  const [playing, setPlaying] = useState(false);
  function toggle() {
    if (playing) { player.pause(); setPlaying(false); }
    else { player.seekTo(0); player.play(); setPlaying(true); setTimeout(() => setPlaying(false), 60000); }
  }
  return (
    <Pressable onPress={toggle} style={styles.audioRow}>
      <View style={[styles.audioPlay, { backgroundColor: mine ? 'rgba(255,255,255,0.25)' : C.forest }]}>
        <Ionicons name={playing ? 'pause' : 'play'} size={16} color={C.white} />
      </View>
      <View style={styles.waveform}>
        {[6, 12, 8, 16, 10, 14, 7, 13, 9].map((h, i) => <View key={i} style={[styles.wave, { height: h, backgroundColor: mine ? 'rgba(255,255,255,0.6)' : C.gold }]} />)}
      </View>
      <Text style={[styles.audioLabel, mine && { color: 'rgba(255,255,255,0.85)' }]}>Voice note</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACE.sm, paddingVertical: 8 },
  back: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headAvatar: { width: 40, height: 40, borderRadius: 20 },
  headName: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 16, flexShrink: 1 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleText: { fontFamily: FONT.bodyBold, fontSize: 9, letterSpacing: 0.4 },
  headSub: { color: 'rgba(255,255,255,0.7)', fontFamily: FONT.body, fontSize: 12, marginTop: 1 },

  scroll: { padding: SPACE.md, paddingBottom: SPACE.lg, flexGrow: 1 },
  dayWrap: { alignItems: 'center', marginVertical: SPACE.sm },
  dayPill: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.muted, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden' },

  bubbleRow: { marginBottom: SPACE.sm, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  smallAvatar: { width: 28, height: 28, borderRadius: 14 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { borderBottomRightRadius: 6 },
  their: { backgroundColor: C.white, borderBottomLeftRadius: 6, shadowColor: '#0B1F14', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  bubbleText: { fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingHorizontal: 4 },
  metaTime: { fontFamily: FONT.body, fontSize: 10, color: C.faint },

  imgAtt: { width: 200, height: 200, borderRadius: 14 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 4, minWidth: 180 },
  audioPlay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  wave: { width: 3, borderRadius: 2 },
  audioLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.section * 2 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  emptyTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: SPACE.sm, paddingHorizontal: SPACE.md, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.borderSoft },
  iconBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONT.body, fontSize: 15, color: C.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
