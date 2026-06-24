// components/ConversationsScreen.tsx — shared conversations list. `basePath` controls
// where a tapped conversation navigates (e.g. /student/messages or /teacher/messages).
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
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

export function ConversationsScreen({ basePath }: { basePath: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setConvos(await fetchConversations(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading messages…" /></Screen>;

  return (
    <Screen>
      <PageTitle title="Messages" subtitle="Your conversations" />
      {convos.length === 0 ? (
        <EmptyCard icon="chatbubbles-outline" title="No messages yet" body="Your conversations will appear here." />
      ) : (
        convos.map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`${basePath}/${c.id}` as any)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
            {c.otherAvatar ? <Image source={{ uri: c.otherAvatar }} style={styles.avatar} /> : <Initials name={c.otherName} size={50} />}
            <View style={{ flex: 1 }}>
              <View style={styles.topRow}>
                <Text style={styles.name} numberOfLines={1}>{c.otherName}</Text>
                <Text style={styles.time}>{ago(c.last_message_at)}</Text>
              </View>
              <Text style={[styles.preview, c.unread > 0 && { color: C.ink, fontFamily: FONT.bodySemi }]} numberOfLines={1}>
                {c.last_message || 'Start the conversation'}
              </Text>
            </View>
            {c.unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{c.unread}</Text></View> : null}
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, flex: 1 },
  time: { fontFamily: FONT.body, fontSize: 11, color: C.faint },
  preview: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 3 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: C.ink, fontFamily: FONT.bodyBold, fontSize: 11 },
});
