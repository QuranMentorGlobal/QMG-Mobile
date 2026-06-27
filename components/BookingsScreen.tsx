// components/BookingsScreen.tsx
// Shared bookings list for teacher & student. Mirrors the web bookings page:
// status tabs with counts, rich cards (person, course, date/time, price, trial
// badge, status, lesson progress), and the real workflow actions —
//   Teacher: Accept (confirm), Decline (refund), Mark Complete
//   Student: Cancel (refund)
// All money/refund logic goes through lib/bookingActions (centralized cancel API).

import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Screen, StatusBadge, EmptyState, Loading, Avatar, FilterChips } from '@/components/ui';
import { StatGrid, StatTile } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import {
  fetchRichBookings,
  acceptBooking,
  declineBooking,
  cancelBookingAsStudent,
  completeBooking,
  type RichBooking,
  type BookingRole,
} from '@/lib/bookingActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';
import { Price } from '@/components/Price';

type TabKey = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
const TABS: TabKey[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
const NON_COMPLETED = ['pending', 'confirmed', 'cancelled'];

export function BookingsScreen({ as }: { as: BookingRole }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<RichBooking[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setBookings(await fetchRichBookings(session.user.id, as));
    setLoading(false);
  }, [session?.user?.id, as]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const countFor = (t: TabKey) =>
    t === 'all'
      ? bookings.filter((b) => NON_COMPLETED.includes(b.status ?? '')).length
      : bookings.filter((b) => b.status === t).length;

  const filtered =
    tab === 'all'
      ? bookings.filter((b) => NON_COMPLETED.includes(b.status ?? ''))
      : bookings.filter((b) => b.status === tab);

  async function run(id: string, fn: () => Promise<{ ok: boolean; error?: string; refunded?: boolean; refundAmount?: number }>, okMsg: (r: any) => string) {
    setBusy(id);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      Alert.alert('Something went wrong', r.error || 'Please try again.');
      return;
    }
    Alert.alert('Done', okMsg(r));
    load();
  }

  function onAccept(b: RichBooking) {
    run(b.id, () => acceptBooking(b.id), () => 'Booking confirmed.');
  }

  function onDecline(b: RichBooking) {
    Alert.alert(
      'Decline booking?',
      'If the student already paid, they will be refunded automatically.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () =>
            run(
              b.id,
              () => declineBooking(b.id, session!.user.id),
              (r) => (r.refunded ? `Declined — student refunded $${r.refundAmount}.` : 'Booking declined.')
            ),
        },
      ]
    );
  }

  function onCancel(b: RichBooking) {
    Alert.alert(
      'Cancel booking?',
      'Refunds follow the cancellation policy (full if more than 24h before the start).',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () =>
            run(
              b.id,
              () => cancelBookingAsStudent(b.id, session!.user.id),
              (r) => (r.refunded ? `Cancelled — refunded $${r.refundAmount}.` : 'Booking cancelled.')
            ),
        },
      ]
    );
  }

  function onComplete(b: RichBooking) {
    run(b.id, () => completeBooking(b.id), () => 'Marked complete.');
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading bookings…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>{as === 'teacher' ? 'TEACHER PORTAL' : 'STUDENT PORTAL'}</Text>
      <Text style={styles.pageTitle}>{as === 'teacher' ? 'Bookings' : 'Your bookings'}</Text>
      <Text style={styles.sub}>
        {as === 'teacher'
          ? 'Manage bookings, assign homework, give feedback and track student attendance.'
          : 'Track your trials, classes and lessons in one place.'}
      </Text>

      <StatGrid>
        <StatTile icon="albums-outline" tone="cream" value={bookings.length} label="Total" />
        <StatTile icon="time-outline" tone="gold" value={countFor('pending')} label="Pending" />
        <StatTile icon="checkmark-circle-outline" tone="green" value={countFor('confirmed')} label="Confirmed" />
        <StatTile icon="ribbon-outline" tone="indigo" value={countFor('completed')} label="Completed" />
      </StatGrid>

      {/* All filters on one screen — wrapped + centered, never a swipe row */}
      <FilterChips
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        options={TABS.map((t) => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1), count: countFor(t) }))}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body={as === 'teacher' ? 'Booking requests and confirmed lessons will appear here.' : 'Book a teacher to get started.'}
        />
      ) : (
        filtered.map((b) => (
          <BookingCard
            key={b.id}
            b={b}
            as={as}
            busy={busy === b.id}
            onAccept={() => onAccept(b)}
            onDecline={() => onDecline(b)}
            onCancel={() => onCancel(b)}
            onComplete={() => onComplete(b)}
          />
        ))
      )}
    </Screen>
  );
}

function BookingCard({
  b, as, busy, onAccept, onDecline, onCancel, onComplete,
}: {
  b: RichBooking;
  as: BookingRole;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const total = b.total_lessons ?? 0;
  const done = b.lessons_completed ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const isTeacher = as === 'teacher';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar uri={b.personAvatar} name={b.personName} size={44} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{b.personName}</Text>
            {b.is_trial ? (
              <View style={styles.trialPill}><Text style={styles.trialText}>TRIAL</Text></View>
            ) : null}
          </View>
          <Text style={styles.course} numberOfLines={1}>{b.courseTitle || 'Course'}</Text>
          <Text style={styles.meta}>{fmtWhen(b.start_date, b.session_time)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={b.status} />
          {b.price_usd != null ? <Price usd={b.price_usd} approx={false} style={styles.price} /> : null}
        </View>
      </View>

      {total > 0 ? (
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>{done} of {total} lessons completed</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
        </View>
      ) : null}

      {/* Actions */}
      {isTeacher && b.status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable onPress={onAccept} disabled={busy} style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}>
            <Ionicons name="checkmark" size={15} color={C.white} />
            <Text style={styles.btnPrimaryText}>{busy ? 'Working…' : 'Accept'}</Text>
          </Pressable>
          <Pressable onPress={onDecline} disabled={busy} style={[styles.btn, styles.btnDanger, busy && styles.btnDisabled]}>
            <Text style={styles.btnDangerText}>Decline</Text>
          </Pressable>
        </View>
      ) : null}

      {isTeacher && b.status === 'confirmed' ? (
        <View style={styles.actions}>
          <Pressable onPress={onComplete} disabled={busy} style={[styles.btn, styles.btnOutline, busy && styles.btnDisabled]}>
            <Ionicons name="checkmark-done" size={15} color={C.forest} />
            <Text style={styles.btnOutlineText}>{busy ? 'Working…' : 'Mark complete'}</Text>
          </Pressable>
        </View>
      ) : null}

      {!isTeacher && (b.status === 'pending' || b.status === 'confirmed') ? (
        <View style={styles.actions}>
          <Pressable onPress={onCancel} disabled={busy} style={[styles.btn, styles.btnDanger, busy && styles.btnDisabled]}>
            <Text style={styles.btnDangerText}>{busy ? 'Working…' : 'Cancel booking'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function fmtWhen(date: string | null, time: string | null): string {
  if (!date) return 'Date pending';
  let out = '';
  try {
    out = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    out = date;
  }
  if (time) out += ` \u00B7 ${String(time).slice(0, 5)}`;
  return out;
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2, marginTop: SPACE.sm, textAlign: 'center' },
  pageTitle: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink, marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: FONT.body, fontSize: 14, color: C.muted, marginTop: 4, marginBottom: SPACE.md, textAlign: 'center' },
  tabsRow: { marginBottom: SPACE.md, flexGrow: 0 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.cream, borderWidth: 1, borderColor: C.borderSoft },
  tabActive: { backgroundColor: C.forest, borderColor: C.forest },
  tabText: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.muted },
  tabTextActive: { color: C.white },

  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, flexShrink: 1 },
  course: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 2 },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 3 },
  price: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.gold },
  trialPill: { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  trialText: { fontFamily: FONT.bodyBold, fontSize: 9, color: C.indigo },

  progressWrap: { marginTop: SPACE.md },
  progressText: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginBottom: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.forest },

  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md, flex: 1 },
  btnDisabled: { opacity: 0.5 },
  btnPrimary: { backgroundColor: C.forest },
  btnPrimaryText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.white },
  btnDanger: { borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.4)' },
  btnDangerText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.red },
  btnOutline: { borderWidth: 1.5, borderColor: C.forest },
  btnOutlineText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
});
