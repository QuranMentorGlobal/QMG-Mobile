// app/teacher/dashboard.tsx — premium teacher dashboard (mobile-designed).
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Loading } from '@/components/ui';
import {
  WelcomeHero, StatGrid, StatTile, Panel, PanelHeader, BarsChart, MetricBar,
  SectionHeader, QuickActionGrid, QuickAction, EmptyCard, QuoteCard, BadgeStrip, RadialMini,
} from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchTeacherDash, type TeacherDash } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export default function TeacherDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<TeacherDash | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setD(await fetchTeacherDash(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading your dashboard…" /></Screen>;

  const months = lastSix();
  const trend = months.map((m, i) => ({ label: m, value: i === months.length - 1 ? Math.round(d.earnings) : 0 }));

  return (
    <Screen>
      <WelcomeHero eyebrow="QURANMENTOR GLOBAL" title="Welcome Back, Teacher" subtitle="Your students are waiting for your guidance." active={1} />

      <StatGrid>
        <StatTile icon="people-outline" value={d.totalStudents} label="Total Students" tone="green" />
        <StatTile icon="book-outline" value={d.todayLessons} label="Today's Lessons" tone="gold" />
        <StatTile icon="cash-outline" value={`$${d.earnings.toFixed(2)}`} label="This Month" tone="green" />
        <StatTile icon="time-outline" value={d.pending} label="Pending Requests" tone="indigo" />
      </StatGrid>

      <Panel>
        <View style={styles.completionRow}>
          <RadialMini percent={0} size={64} color={C.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.completionTitle}>Profile Completion</Text>
            <Text style={styles.completionNote}>Needs attention</Text>
          </View>
        </View>
      </Panel>

      <Panel>
        <View style={styles.panelHeadRow}>
          <Text style={styles.panelTitle}>Performance Metrics</Text>
          <View style={styles.monthPill}><Text style={styles.monthPillText}>This Month</Text></View>
        </View>
        <MetricBar label="Lesson Completion" percent={0} icon="checkmark-circle-outline" />
        <MetricBar label="Trial → Paid" percent={0} icon="infinite-outline" />
        <MetricBar label="Profile Score" percent={0} icon="person-outline" />
        <View style={styles.miniStatsRow}>
          <MiniStat icon="time-outline" label="Teaching Hours" value="0h" />
          <MiniStat icon="infinite-outline" label="Trial Conversions" value="0/0" />
        </View>
        <View style={styles.miniStatsRow}>
          <MiniStat icon="card-outline" label="Pending Payout" value={`$${d.earnings.toFixed(2)}`} />
          <MiniStat icon="star-outline" label="Avg Rating" value="—" />
        </View>
      </Panel>

      <Panel>
        <PanelHeader icon="bar-chart-outline" title="Earnings Trend" subtitle="Net payout · last 6 months" />
        <BarsChart data={trend} unit="$" />
      </Panel>

      <SectionHeader title="Quick Actions" />
      <QuickActionGrid>
        <QuickAction icon="calendar-outline" label="Bookings" onPress={() => router.push('/teacher/bookings')} />
        <QuickAction icon="play-circle-outline" label="Course Studio" onPress={() => router.push('/teacher/courses')} />
        <QuickAction icon="cash-outline" label="Earnings" onPress={() => router.push('/teacher/earnings')} />
        <QuickAction icon="bar-chart-outline" label="Analytics" onPress={() => router.push('/teacher/analytics')} />
        <QuickAction icon="person-outline" label="Profile" onPress={() => router.push('/teacher/profile')} />
      </QuickActionGrid>

      <SectionHeader title="Your Courses" actionLabel="Manage" onAction={() => router.push('/teacher/courses')} />
      <StatGrid>
        <StatTile icon="ellipse-outline" value={d.courses.trial} label="Trial Classes" tone="gold" />
        <StatTile icon="videocam-outline" value={d.courses.live} label="Live Courses" tone="indigo" />
        <StatTile icon="cloud-upload-outline" value={d.courses.recorded} label="Recorded" tone="green" />
        <StatTile icon="people-outline" value={d.courses.enrolments} label="Enrolments" tone="cream" />
      </StatGrid>

      <SectionHeader title="Your Badges" />
      <BadgeStrip earned={0} body="Badges are awarded automatically as you get verified and build your track record." />

      <SectionHeader title="Pending Requests" />
      <EmptyCard icon="book-outline" title="No pending requests" body="New booking requests will appear here." />

      <SectionHeader title="Upcoming Lessons" />
      {d.upcoming === 0 ? (
        <EmptyCard icon="calendar-outline" title="No upcoming lessons" body="Confirmed bookings generate lessons here." />
      ) : (
        <Panel><Text style={styles.panelTitle}>{d.upcoming} upcoming lesson{d.upcoming > 1 ? 's' : ''}</Text></Panel>
      )}

      <QuoteCard icon="book-outline" eyebrow="QURANIC AYAH" arabic="وَعَلَّمَكَ مَا لَمْ تَكُن تَعْلَمُ ۚ وَكَانَ فَضْلُ اللَّهِ عَلَيْكَ عَظِيمًا" quote="And He taught you what you did not know. And the favour of Allah upon you is ever great." source="Surah An-Nisa 4:113" active={2} />
    </Screen>
  );
}

function MiniStat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={16} color={C.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.miniLabel}>{label}</Text>
        <Text style={styles.miniValue}>{value}</Text>
      </View>
    </View>
  );
}

function lastSix(): string[] {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date().getMonth(); const out: string[] = [];
  for (let i = 5; i >= 0; i--) out.push(M[(now - i + 12) % 12]);
  return out;
}

const styles = StyleSheet.create({
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  completionTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  completionNote: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.red, marginTop: 3 },
  panelHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  panelTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  monthPill: { backgroundColor: C.tintGold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  monthPillText: { fontFamily: FONT.bodySemi, fontSize: 11, color: C.accent2 },
  miniStatsRow: { flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xs },
  miniStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: C.borderSoft },
  miniLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  miniValue: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink, marginTop: 1 },
});
