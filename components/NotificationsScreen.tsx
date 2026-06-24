// components/NotificationsScreen.tsx — shared notifications inbox for any role.
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, PageTitle } from '@/components/ui';
import { EmptyCard } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type AppNotification } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  booking_confirmed: 'calendar', payment: 'card', lesson: 'book', message: 'chatbubble', refund: 'refresh', default: 'notifications',
};

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export function NotificationsScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setItems(await fetchNotifications(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function readAll() {
    if (!session?.user) return;
    setItems((arr) => arr.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(session.user.id);
  }
  async function tap(n: AppNotification) {
    if (n.is_read) return;
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    await markNotificationRead(n.id);
  }

  if (loading) return <Screen scroll={false}><Loading label="Loading notifications…" /></Screen>;
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <Screen>
      <View style={styles.head}>
        <PageTitle title="Notifications" subtitle={unread > 0 ? `${unread} unread` : 'All caught up'} />
        {unread > 0 ? <Pressable onPress={readAll} hitSlop={8}><Text style={styles.readAll}>Mark all read</Text></Pressable> : null}
      </View>
      {items.length === 0 ? (
        <EmptyCard icon="notifications-outline" title="No notifications" body="Updates about bookings, lessons and payments will appear here." />
      ) : (
        items.map((n) => (
          <Pressable key={n.id} onPress={() => tap(n)} style={[styles.row, !n.is_read && styles.rowUnread]}>
            <View style={[styles.icon, !n.is_read && { backgroundColor: C.tintGold }]}>
              <Ionicons name={ICON[n.type ?? 'default'] ?? ICON.default} size={18} color={n.is_read ? C.muted : C.accent2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !n.is_read && { fontFamily: FONT.bodyBold }]} numberOfLines={1}>{n.title ?? 'Notification'}</Text>
              {n.body ? <Text style={styles.body} numberOfLines={2}>{n.body}</Text> : null}
              <Text style={styles.time}>{ago(n.created_at)}</Text>
            </View>
            {!n.is_read ? <View style={styles.dot} /> : null}
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  readAll: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.gold, marginTop: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  rowUnread: { borderWidth: 1, borderColor: 'rgba(201,162,39,0.3)' },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  body: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  time: { fontFamily: FONT.body, fontSize: 11, color: C.faint, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.gold },
});
