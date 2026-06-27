// components/ParentBookingsScreen.tsx
// Parent Bookings — supervisor view of ALL children's bookings. Mirrors the web
// parent bookings page: the teacher is the "person", each card shows which child
// is the student, status tabs are All/Pending/Confirmed/Cancelled (Completed
// surfaces under Courses, so it is excluded here), and Cancel routes through the
// centralized refund endpoint as cancelledBy:'parent'. Scoped by the shared
// ChildSwitcher selection (All-Children or a single child).

import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Loading, FilterChips, Avatar, StatusBadge } from '@/components/ui';
import { EmptyCard } from '@/components/dashboard';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { useAuth } from '@/lib/auth';
import { useParentChild } from '@/lib/parentChild';
import { fetchParentBookings, type ParentBooking } from '@/lib/parentActions';
import { cancelBookingAsParent } from '@/lib/bookingActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

type TabKey = 'all' | 'pending' | 'confirmed' | 'cancelled';
const TABS: TabKey[] = ['all', 'pending', 'confirmed', 'cancelled'];
const NON_COMPLETED = ['pending', 'confirmed', 'cancelled'];

export function ParentBookingsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { effectiveChildIds, isAll, children } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<ParentBooking[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setBookings(await fetchParentBookings(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Child scope first (All vs single child), then status.
  const scoped = useMemo(
    () => (isAll ? bookings : bookings.filter((b) => effectiveChildIds.includes(b.studentId))),
    [bookings, effectiveChildIds, isAll]
  );
  const countFor = (t: TabKey) =>
    t === 'all'
      ? scoped.filter((b) => NON_COMPLETED.includes(b.status)).length
      : scoped.filter((b) => b.status === t).length;
  const filtered = tab === 'all' ? scoped.filter((b) => NON_COMPLETED.includes(b.status)) : scoped.filter((b) => b.status === tab);

  function onCancel(b: ParentBooking) {
    Alert.alert(
      'Cancel booking?',
      `Cancel ${b.childName}'s ${b.courseTitle} with ${b.teacherName}? Any eligible refund follows the cancellation policy.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setBusy(b.id);
            const r = await cancelBookingAsParent(b.id, session!.user.id);
            setBusy(null);
            if (!r.ok) { Alert.alert('Something went wrong', r.error || 'Please try again.'); return; }
            Alert.alert('Done', r.refunded ? `Cancelled — $${Number(r.refundAmount).toFixed(2)} refunded.` : 'Booking cancelled.');
            load();
          },
        },
      ]
    );
  }

  if (loading) return <Screen scroll={false}><Loading label="Loading bookings…" /></Screen>;

  return (
    <Screen>
      <ChildSwitcher />
      <Text style={styles.h1}>Bookings</Text>
      <Text style={styles.sub}>Oversee every lesson booked for your children. You manage and pay; each child is the student.</Text>

      {children.length > 0 ? (
        <FilterChips
          align="flex-start"
          value={tab}
          onChange={(k) => setTab(k as TabKey)}
          options={TABS.map((t) => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1), count: countFor(t) }))}
        />
      ) : null}

      {children.length === 0 ? (
        <EmptyCard
          icon="people-outline"
          title="No children yet"
          body="Add a child to start booking and supervising lessons."
          ctaLabel="+ Add Child"
          onCta={() => router.push('/parent/children')}
        />
      ) : filtered.length === 0 ? (
        <EmptyCard
          icon="calendar-outline"
          title="No bookings here"
          body="Nothing matches this filter yet."
          ctaLabel="Browse Teachers"
          onCta={() => router.push('/parent/teachers')}
        />
      ) : (
        filtered.map((b) => <BookingCard key={b.id} b={b} busy={busy === b.id} onCancel={() => onCancel(b)} />)
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function initials(n: string) {
  return n.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}
function fmtWhen(date: string | null, time: string | null): string {
  if (!date) return 'Date pending';
  let out = '';
  try { out = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch { out = date; }
  if (time) out += ` \u00B7 ${String(time).slice(0, 5)}`;
  return out;
}

function BookingCard({ b, busy, onCancel }: { b: ParentBooking; busy: boolean; onCancel: () => void }) {
  const free = b.is_trial && (!b.price_usd || b.price_usd === 0);
  const canCancel = b.status === 'pending' || b.status === 'confirmed';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar uri={b.teacherAvatar} name={b.teacherName} size={48} />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{b.courseTitle}</Text>
            <StatusBadge status={b.status} />
            {b.refund_status === 'refunded' ? (
              <View style={styles.refundPill}><Text style={styles.refundText}>REFUNDED</Text></View>
            ) : null}
          </View>
          <Text style={styles.meta}>with {b.teacherName}</Text>
          <View style={styles.childRow}>
            <View style={styles.childChip}>
              <View style={styles.childDot}><Text style={styles.childDotText}>{initials(b.childName)}</Text></View>
              <Text style={styles.childName}>{b.childName}</Text>
            </View>
          </View>
          <Text style={styles.meta}>{fmtWhen(b.start_date, b.session_time)}</Text>
          <Text style={[styles.price, { color: free ? C.success : C.ink }]}>{free ? 'Free' : `$${Number(b.price_usd || 0).toFixed(2)}`}</Text>
        </View>
      </View>
      {canCancel ? (
        <Pressable onPress={onCancel} disabled={busy} style={[styles.cancelBtn, busy && { opacity: 0.5 }]}>
          <Text style={styles.cancelText}>{busy ? 'Cancelling…' : 'Cancel'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4, marginBottom: SPACE.sm },
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, flexShrink: 1 },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 4 },
  childRow: { flexDirection: 'row', marginTop: 8 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  childDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  childDotText: { fontFamily: FONT.bodyBold, fontSize: 9, color: C.white },
  childName: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.forest },
  price: { fontFamily: FONT.bodyBold, fontSize: 14, marginTop: 6 },
  refundPill: { backgroundColor: 'rgba(22,163,74,0.1)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  refundText: { fontFamily: FONT.bodyBold, fontSize: 9, color: C.success, letterSpacing: 0.3 },
  cancelBtn: { marginTop: SPACE.md, alignSelf: 'flex-start', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.35)', backgroundColor: 'rgba(220,38,38,0.06)', paddingHorizontal: 18, paddingVertical: 9 },
  cancelText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.red },
});
