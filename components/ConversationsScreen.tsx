// components/ConversationsScreen.tsx — shared conversations inbox (mirrors web).
// INBOX eyebrow + New Chat, a CONVERSATIONS panel with "N new", search, rows
// (avatar, name + role badge, preview, time, green unread badge) and a New
// Conversation button. `basePath` controls navigation per role.
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchConversations, type Conversation } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

function ago(iso: string | null): string {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

const ROLE_BADGE: Record<string, { fg: string; bg: string }> = {
  parent: { fg: '#166534', bg: 'rgba(22,101,52,0.10)' },
  student: { fg: '#4F46E5', bg: 'rgba(79,70,229,0.10)' },
  admin: { fg: '#8A6A16', bg: 'rgba(201,162,39,0.14)' },
  teacher: { fg: '#166534', bg: 'rgba(22,101,52,0.10)' },
};

export function ConversationsScreen({ basePath }: { basePath: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setConvos(await fetchConversations(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? convos.filter((c) => c.otherName.toLowerCase().includes(q)) : convos;
  }, [convos, query]);
  const newCount = convos.filter((c) => c.unread > 0).length;

  if (loading) return <Screen scroll={false}><Loading label="Loading messages…" /></Screen>;

  return (
    <Screen>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>INBOX</Text>
          <Text style={styles.h1}>Messages</Text>
          <Text style={styles.sub}>Chat with students and parents.</Text>
        </View>
        <Pressable onPress={() => router.push(`${basePath}/new` as any)}>
          <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newChat}>
            <Ionicons name="add" size={18} color={C.white} /><Text style={styles.newChatText}>New Chat</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>CONVERSATIONS</Text>
          {newCount > 0 ? <View style={styles.newPill}><Text style={styles.newPillText}>{newCount} new</Text></View> : null}
        </View>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={17} color={C.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search conversations…" placeholderTextColor={C.muted} style={styles.searchInput} />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={26} color={C.gold} />
            <Text style={styles.emptyText}>{query ? 'No matches' : 'No conversations yet'}</Text>
          </View>
        ) : filtered.map((c) => {
          const rb = ROLE_BADGE[(c.otherRole || '').toLowerCase()] ?? ROLE_BADGE.student;
          return (
            <Pressable key={c.id} onPress={() => router.push(`${basePath}/${c.id}` as any)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
              {c.otherAvatar ? <Image source={{ uri: c.otherAvatar }} style={styles.avatar} /> : <Initials name={c.otherName} size={46} />}
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{c.otherName}</Text>
                  {c.otherRole ? <View style={[styles.roleBadge, { backgroundColor: rb.bg }]}><Text style={[styles.roleText, { color: rb.fg }]}>{c.otherRole.toUpperCase()}</Text></View> : null}
                  <Text style={styles.time}>{ago(c.last_message_at)}</Text>
                </View>
                <Text style={[styles.preview, c.unread > 0 && { color: C.ink, fontFamily: FONT.bodySemi }]} numberOfLines={1}>
                  {c.last_message || 'Start the conversation'}
                </Text>
              </View>
              {c.unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{c.unread}</Text></View> : null}
            </Pressable>
          );
        })}

        <Pressable onPress={() => router.push(`${basePath}/new` as any)} style={styles.newConvo}>
          <Ionicons name="add" size={18} color={C.accent2} /><Text style={styles.newConvoText}>New Conversation</Text>
        </Pressable>
      </View>
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, marginTop: SPACE.sm },
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2 },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2 },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 2 },
  newChat: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, marginTop: 4 },
  newChatText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.white },

  panel: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginTop: SPACE.md, ...SHADOW.card },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm },
  panelTitle: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.ink, letterSpacing: 1 },
  newPill: { backgroundColor: C.forest, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  newPillText: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.white },

  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.cream, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: SPACE.sm },
  searchInput: { flex: 1, fontFamily: FONT.body, fontSize: 14, color: C.ink, padding: 0 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, flexShrink: 1 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleText: { fontFamily: FONT.bodyBold, fontSize: 9, letterSpacing: 0.4 },
  time: { fontFamily: FONT.body, fontSize: 11, color: C.faint, marginLeft: 'auto' },
  preview: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 3 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 11 },

  empty: { alignItems: 'center', paddingVertical: SPACE.section, gap: 8 },
  emptyText: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.muted },

  newConvo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, paddingVertical: 13, marginTop: SPACE.sm },
  newConvoText: { fontFamily: FONT.bodyBold, fontSize: 14, color: C.accent2 },
});
