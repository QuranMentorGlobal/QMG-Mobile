// app/parent/dashboard.tsx — premium parent dashboard (mobile-designed).
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { LocationGateBanner } from '@/components/LocationGateBanner';
import {
  BannerSlider, StatGrid, StatTile, Panel, PanelHeader, BarsChart, RadialMini,
  SectionHeader, QuickActionGrid, QuickAction, EmptyCard, QuoteCard, BadgeStrip, Initials,
} from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchParentDash, type ParentDash, type Child } from '@/lib/db';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function ParentDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<ParentDash | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setD(await fetchParentDash(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !d) return <Screen scroll={false}><Loading label="Loading your dashboard…" /></Screen>;

  const months = lastSix();

  const totalUpcoming = Object.values(d.childStats).reduce((s, x) => s + (x?.upcoming ?? 0), 0);
  const attVals = d.children.map((c) => d.childStats[c.id]?.attendance ?? 0);
  const overallAtt = attVals.length ? Math.round(attVals.reduce((a, b) => a + b, 0) / attVals.length) : 0;
  const hasAtt = attVals.some((v) => v > 0);
  return (
    <Screen>
      <LocationGateBanner profileHref="/parent/profile" />
      <BannerSlider role="parent" />

      <StatGrid>
        <StatTile icon="people-outline" value={d.children.length} label="Children Enrolled" tone="green" />
        <StatTile icon="book-outline" value={d.lessonsThisMonth} label="Lessons This Month" tone="gold" />
        <StatTile icon="card-outline" value={`$${d.spentThisMonth.toFixed(2)}`} label="Spent This Month" tone="green" />
        <StatTile icon="time-outline" value="—" label="Next Lesson In" tone="indigo" />
      </StatGrid>

      <SectionHeader title="Quick Actions" />
      <QuickActionGrid>
        <QuickAction icon="people-outline" label="My Children" onPress={() => router.push('/parent/children')} />
        <QuickAction icon="search-outline" label="Browse Teachers" onPress={() => router.push('/parent/teachers')} />
        <QuickAction icon="card-outline" label="Billing" onPress={() => router.push('/parent/billing')} />
        <QuickAction icon="help-buoy-outline" label="Support" onPress={() => router.push('/parent/support')} />
      </QuickActionGrid>

      <SectionHeader title="Your Badges" />
      <BadgeStrip earned={0} body="Earn badges as your children attend lessons and progress in their learning." />

      <Panel>
        <PanelHeader icon="bar-chart-outline" title="Monthly Lessons" subtitle="Lessons completed by all children · last 6 months" />
        <BarsChart data={months.map((m) => ({ label: m, value: 0 }))} />
      </Panel>

      {d.children.length > 0 && (
        <Panel>
          <PanelHeader icon="checkbox-outline" title="Attendance by Child" subtitle="Overall attendance rates" />
          <View style={styles.attByChildRow}>
            <View style={styles.donut}>
              <Text style={styles.donutVal}>{hasAtt ? `${overallAtt}%` : '—'}</Text>
              <Text style={styles.donutLabel}>overall</Text>
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              {d.children.map((c) => {
                const a = d.childStats[c.id]?.attendance ?? 0;
                return (
                  <View key={c.id}>
                    <View style={styles.attTop}>
                      <Text style={styles.attName} numberOfLines={1}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Child'}</Text>
                      <Text style={[styles.attPct, { color: a >= 50 ? C.success : '#DC2626' }]}>{a}%</Text>
                    </View>
                    <View style={styles.attTrack}><View style={[styles.attFill, { width: `${a}%`, backgroundColor: a >= 50 ? C.success : '#DC2626' }]} /></View>
                  </View>
                );
              })}
            </View>
          </View>
        </Panel>
      )}

      <View style={styles.kpiGrid}>
        <DashKpi icon="cloud-upload-outline" value={String(d.recorded)} label="Recorded Courses" tint="rgba(79,70,229,0.08)" ic={C.indigo} />
        <DashKpi icon="videocam-outline" value={String(d.live)} label="Live Courses" tint="rgba(79,70,229,0.08)" ic={C.indigo} />
        <DashKpi icon="calendar-outline" value={String(totalUpcoming)} label="Upcoming Lessons" tint="rgba(22,163,74,0.08)" ic={C.success} />
        <DashKpi icon="card-outline" value={`$${d.spentThisMonth.toFixed(2)}`} label="Spend This Month" tint="rgba(201,162,39,0.10)" ic={C.gold} />
      </View>

      <SectionHeader title="Children's Progress" actionLabel="Manage" onAction={() => router.push('/parent/children')} />
      {d.children.length === 0 ? (
        <EmptyCard icon="people-outline" title="No children linked yet" body="Link a child's account to track their progress." ctaLabel="Browse Teachers" onCta={() => router.push('/parent/teachers')} />
      ) : (
        d.children.map((c) => <ChildProgressCard key={c.id} child={c} stats={d.childStats[c.id]} onReport={() => router.push('/parent/children')} />)
      )}

      <SectionHeader title="Upcoming Lessons" />
      <EmptyCard icon="calendar-outline" title="No upcoming lessons" body="Book a teacher for your child to get started." ctaLabel="Browse Teachers" onCta={() => router.push('/parent/teachers')} />

      <QuoteCard icon="happy-outline" eyebrow="HADITH" arabic="كُلُّ مَوْلُودٍ يُولَدُ عَلَى الْفِطْرَةِ" quote="Every child is born upon the fitrah (natural disposition). It is the parents who shape them." source="Sahih Al-Bukhari & Muslim" active={1} />
    </Screen>
  );
}

function DashKpi({ icon, value, label, tint, ic }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; tint: string; ic: string }) {
  return (
    <View style={[styles.kpi, { backgroundColor: tint }]}>
      <View style={styles.kpiIcon}><Ionicons name={icon} size={18} color={ic} /></View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ChildProgressCard({ child, stats, onReport }: { child: Child; stats?: { done: number; upcoming: number; attendance: number }; onReport: () => void }) {
  const name = [child.first_name, child.last_name].filter(Boolean).join(' ') || 'Child';
  const att = stats?.attendance ?? 0;
  const attColor = att >= 80 ? C.success : att >= 60 ? C.gold : C.red;
  return (
    <Panel>
      <View style={styles.childTop}>
        <Initials name={name} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{name}</Text>
          <Text style={styles.childEmail} numberOfLines={1}>Student account</Text>
        </View>
      </View>
      <View style={styles.childStats}>
        <ChildStat label="This Month" value={String(stats?.done ?? 0)} icon="calendar-outline" />
        <ChildStat label="Total Done" value={String(stats?.done ?? 0)} icon="checkmark-outline" />
        <ChildStat label="Upcoming" value={String(stats?.upcoming ?? 0)} icon="time-outline" />
      </View>
      <View style={styles.attRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkbox-outline" size={15} color={C.muted} />
          <Text style={styles.attLabel}>Attendance Rate</Text>
        </View>
        <Text style={[styles.attPct, { color: attColor }]}>{att}%</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${att}%`, backgroundColor: attColor }]} /></View>
    </Panel>
  );
}

function ChildStat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.cStat}>
      <Ionicons name={icon} size={15} color={C.gold} />
      <Text style={styles.cStatValue}>{value}</Text>
      <Text style={styles.cStatLabel}>{label}</Text>
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
  attByChildRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donut: { width: 96, height: 96, borderRadius: 48, borderWidth: 10, borderColor: '#EFEAD9', alignItems: 'center', justifyContent: 'center' },
  donutVal: { fontFamily: FONT.displayBold, fontSize: 20, color: C.ink },
  donutLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  attTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  attName: { fontFamily: FONT.bodySemi, fontSize: 13.5, color: C.ink, flex: 1 },
  attPct: { fontFamily: FONT.bodyBold, fontSize: 13.5 },
  attTrack: { height: 6, borderRadius: 3, backgroundColor: '#EFEAD9', overflow: 'hidden' },
  attFill: { height: 6, borderRadius: 3 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: SPACE.md },
  kpi: { width: '48.5%', borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, gap: 6 },
  kpiIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 24, color: C.ink, marginTop: 4 },
  kpiLabel: { fontFamily: FONT.body, fontSize: 12.5, color: C.muted },
  childTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  childName: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  childEmail: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  childStats: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md },
  cStat: { flex: 1, backgroundColor: C.cream, borderRadius: 14, paddingVertical: SPACE.md, alignItems: 'center', gap: 4 },
  cStatValue: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  cStatLabel: { fontFamily: FONT.body, fontSize: 10, color: C.muted },
  attRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  attLabel: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.text },
  attPct: { fontFamily: FONT.bodyBold, fontSize: 13 },
  track: { height: 7, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: C.gold },
});
