// components/NewConversation.tsx — "New Chat" contact picker. Lists people the
// user shares bookings with (teacher ↔ students); tapping opens or creates the
// 1:1 conversation and navigates into the thread. `basePath` is role-scoped.
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { Initials } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchMessageContacts, getOrCreateConversation, type MessageContact } from '@/lib/db';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const ROLE_BADGE: Record<string, { fg: string; bg: string }> = {
  parent: { fg: '#166534', bg: 'rgba(22,101,52,0.10)' },
  student: { fg: '#4F46E5', bg: 'rgba(79,70,229,0.10)' },
  admin: { fg: '#8A6A16', bg: 'rgba(201,162,39,0.14)' },
  teacher: { fg: '#166534', bg: 'rgba(22,101,52,0.10)' },
};

export function NewConversation({ basePath }: { basePath: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const uid = session?.user?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetchMessageContacts(uid).then((c) => { if (on) { setContacts(c); setLoading(false); } });
    return () => { on = false; };
  }, [uid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
  }, [contacts, query]);

  async function open(c: MessageContact) {
    if (busy) return;
    setBusy(c.id);
    const id = await getOrCreateConversation(uid, c.id);
    setBusy(null);
    if (id) router.replace(`${basePath}/${id}` as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={C.white} /></Pressable>
            <Text style={styles.headerTitle}>New Chat</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={17} color={C.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search people…" placeholderTextColor={C.muted} style={styles.searchInput} />
      </View>

      {loading ? (
        <Loading label="Loading contacts…" />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={28} color={C.gold} />
          <Text style={styles.emptyTitle}>{query ? 'No matches' : 'No contacts yet'}</Text>
          <Text style={styles.emptyBody}>People you teach or learn with appear here once you have a booking together.</Text>
        </View>
      ) : (
        <View style={{ padding: SPACE.md }}>
          {filtered.map((c) => {
            const rb = ROLE_BADGE[(c.role || '').toLowerCase()] ?? ROLE_BADGE.student;
            return (
              <Pressable key={c.id} onPress={() => open(c)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
                {c.avatar ? <Image source={{ uri: c.avatar }} style={styles.avatar} /> : <Initials name={c.name} size={46} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                  {c.role ? <View style={[styles.roleBadge, { backgroundColor: rb.bg }]}><Text style={[styles.roleText, { color: rb.fg }]}>{c.role.toUpperCase()}</Text></View> : null}
                </View>
                <Ionicons name={busy === c.id ? 'hourglass-outline' : 'chevron-forward'} size={18} color={C.gold} />
              </Pressable>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.sm, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 17 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderSoft, paddingHorizontal: 12, paddingVertical: 11, margin: SPACE.md, marginBottom: 0 },
  searchInput: { flex: 1, fontFamily: FONT.body, fontSize: 14, color: C.ink, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  roleText: { fontFamily: FONT.bodyBold, fontSize: 9, letterSpacing: 0.4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg, gap: 8 },
  emptyTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center' },
});
