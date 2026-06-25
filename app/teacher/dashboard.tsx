// app/teacher/dashboard.tsx — teacher dashboard, redesigned to mirror the web.
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Loading } from '@/components/ui';
import {
  WelcomeHero, StatGrid, StatTile, Panel, PanelHeader, BarsChart,
  SectionHeader, QuickActionGrid, QuickAction, EmptyCard, QuoteCard, BadgeStrip, RadialMini,
} from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherDashboardFull, type TeacherDashFull } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function TeacherDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<TeacherDashFull | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setD(await fetchTeacherDashboardFull(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading dashboard…" /></Screen>;

  const go = (r: string) => router.push(r as any);

  return (
    <Screen>
      <WelcomeHero eyebrow="QURANMENTORGLOBAL" title="Welcome Back, Teacher" subtitle="Your students are waiting for your guidance." />

      <StatGrid>
        <StatTile icon="people-outline" tone="green" value={d.totalStudents} label="Total Students" />
        <StatTile icon="book-outline" tone="gold" value={d.todayLessons} label="Today's Lessons" />
        <StatTile icon="cash-outline" tone="green" value={`$${d.monthlyEarnings.toFixed(2)}`} label="This Month" />
        <StatTile icon="calendar-outline" tone="indigo" value={d.pending} label="Pending Requests" />
      </StatGrid>

      <Panel style={{ marginTop: SPACE.md }}>
        <View style={styles.profRow}>
          <RadialMini percent={d.profileScore} size={68} color={d.profileScore >= 80 ? C.success : C.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profTitle}>Profile Completion</Text>
            <Text style={[styles.profStatus, { color: d.profileScore >= 80 ? C.success : '#B91C1C' }]}>
              {d.profileScore >= 80 ? 'Looking great' : 'Needs attention'}
            </Text>
          </View>
          <Pressable onPress={() => go('/teacher/profile')} style={styles.profBtn}><Text style={styles.profBtnText}>Complete</Text></Pressable>
        </View>
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <View style={styles.perfHead}>
          <Text style={styles.perfTitle}>Performance Metrics</Text>
          <View style={styles.monthPill}><Text style={styles.monthPillText}>This Month</Text></View>
        </View>
        <Metric icon="checkmark-circle-outline" label="Lesson Completion" pct={d.completionRate} color={C.forest} />
        <Metric icon="swap-horizontal-outline" label="Trial → Paid" pct={d.conversionRate} color={C.gold} />
        <Metric icon="person-outline" label="Profile Score" pct={d.profileScore} color={C.indigo} />
        <View style={styles.miniGrid}>
          <Mini icon="time-outline" label="Teaching Hours" value={`${d.teachingHours}h`} />
          <Mini icon="swap-horizontal-outline" label="Trial Conversions" value={`${d.convertedTrials}/${d.trialBookings}`} />
          <Mini icon="card-outline" label="Pending Payout" value={`$${d.pendingPayout.toFixed(2)}`} color={C.gold} />
          <Mini icon="star-outline" label="Avg Rating" value={d.avgRating > 0 ? d.avgRating.toFixed(1) : '—'} color="#F59E0B" />
        </View>
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="bar-chart-outline" title="Earnings Trend" subtitle="Net payout — last 6 months" />
        <BarsChart data={d.earningsHistory} unit="$" />
      </Panel>

      <Panel style={{ marginTop: SPACE.md }}>
        <PanelHeader icon="book-outline" title="Lessons Taught" subtitle="Completed lessons per month" />
        <BarsChart data={d.lessonHistory} />
      </Panel>

      <SectionHeader title="Quick Actions" />
      <QuickActionGrid>
        <QuickAction icon="calendar-outline" label="Bookings" onPress={() => go('/teacher/bookings')} />
        <QuickAction icon="videocam-outline" label="Course Studio" onPress={() => go('/teacher/courses')} />
        <QuickAction icon="cash-outline" label="Earnings" onPress={() => go('/teacher/earnings')} />
        <QuickAction icon="stats-chart-outline" label="Analytics" onPress={() => go('/teacher/analytics')} />
        <QuickAction icon="person-outline" label="Profile" onPress={() => go('/teacher/profile')} />
      </QuickActionGrid>

      <SectionHeader title="Your Courses" actionLabel="Manage" onAction={() => go('/teacher/courses')} />
      <StatGrid>
        <StatTile icon="radio-button-on-outline" tone="gold" value={d.courses.trial} label="Trial Classes" />
        <StatTile icon="videocam-outline" tone="indigo" value={d.courses.live} label="Live Courses" />
        <StatTile icon="cloud-upload-outline" tone="indigo" value={d.courses.recorded} label="Recorded" />
        <StatTile icon="people-outline" tone="green" value={d.courses.enrolments} label="Enrolments" />
      </StatGrid>

      <SectionHeader title="Your Badges" />
      <BadgeStrip earned={d.badgesEarned} body="Badges are awarded automatically as you get verified and build your track record." />

      <SectionHeader title="Pending Requests" actionLabel={d.pendingRequests.length ? 'View all' : undefined} onAction={() => go('/teacher/bookings')} />
      {d.pendingRequests.length === 0 ? (
        <EmptyCard icon="calendar-outline" title="No pending requests" body="New booking requests will appear here." />
      ) : (
        d.pendingRequests.slice(0, 3).map((b) => (
          <Pressable key={b.id} onPress={() => go('/teacher/bookings')} style={styles.reqRow}>
            <View style={styles.reqIcon}><Ionicons name="calendar-outline" size={18} color={C.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reqTitle}>New booking request</Text>
              <Text style={styles.reqSub}>{fmtDate(b.start_date)}{b.session_time ? ` \u00B7 ${b.session_time}` : ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        ))
      )}

      <SectionHeader title="Upcoming Lessons" />
      {d.upcoming.length === 0 ? (
        <EmptyCard icon="time-outline" title="No upcoming lessons" body="Confirmed lessons will show up here." />
      ) : (
        d.upcoming.map((l) => (
          <View key={l.id} style={styles.lessonRow}>
            <View style={styles.lessonIcon}><Ionicons name="calendar-outline" size={18} color={C.forest} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTitle}>Lesson</Text>
              <Text style={styles.lessonSub}>{fmtDateTime(l.scheduled_at)}{l.duration_mins ? ` \u00B7 ${l.duration_mins} min` : ''}</Text>
            </View>
            <View style={styles.confirmedPill}><Text style={styles.confirmedText}>Confirmed</Text></View>
          </View>
        ))
      )}

      <View style={{ marginTop: SPACE.lg }}>
        <QuoteCard
          icon="moon-outline" eyebrow="REFLECTION"
          quote="You carry the greatest inheritance \u2014 the words of Allah. Your students carry it forward through you."
          source="Reflection for Teachers" dots={3} active={2}
        />
      </View>
    </Screen>
  );
}

function Metric({ icon, label, pct, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; pct: number; color: string }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={icon} size={15} color={color} />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        <Text style={[styles.metricPct, { color }]}>{p}%</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${p}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

function Mini({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color?: string }) {
  return (
    <View style={styles.mini}>
      <View style={styles.miniIcon}><Ionicons name={icon} size={15} color={color ?? C.muted} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.miniLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.miniValue, color ? { color } : null]}>{value}</Text>
      </View>
    </View>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Pending date';
  try { return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch { return iso; }
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return 'Scheduled';
  try { const dt = new Date(iso); return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' \u00B7 ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

const styles = StyleSheet.create({
  profRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  profTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  profStatus: { fontFamily: FONT.bodySemi, fontSize: 13, marginTop: 3 },
  profBtn: { backgroundColor: C.cream, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  profBtnText: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.forest },
  perfHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  perfTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  monthPill: { backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  monthPillText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.gold },
  metricRow: { marginBottom: SPACE.md },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  metricLabel: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },
  metricPct: { fontFamily: FONT.bodyBold, fontSize: 13 },
  track: { height: 8, borderRadius: 999, backgroundColor: '#EFEAE0', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: 4 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%', backgroundColor: C.cream, borderRadius: RADIUS.md, padding: 10 },
  miniIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  miniLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  miniValue: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, marginTop: 1 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  reqIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center' },
  reqTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  reqSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, ...SHADOW.card },
  lessonIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center' },
  lessonTitle: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink },
  lessonSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  confirmedPill: { borderWidth: 1, borderColor: C.forest, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  confirmedText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.forest },
});
