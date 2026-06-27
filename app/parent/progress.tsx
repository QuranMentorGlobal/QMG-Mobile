// app/parent/progress.tsx — Parent Progress. One place to track every child's
// Quran learning: family totals (this month / completed / upcoming) and per-child
// cards with stats, a streak flame, Hifz (×10) + Tajweed (×8) level bars, and an
// attendance %. Scoped by the shared ChildSwitcher. Mirrors the web parent progress page.
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading } from '@/components/ui';
import { EmptyCard, Initials } from '@/components/dashboard';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { useAuth } from '@/lib/auth';
import { useParentChild } from '@/lib/parentChild';
import { fetchParentProgress, type ParentProgress, type ParentProgressChild } from '@/lib/parentActions';
import { C, FONT, RADIUS, SHADOW, SPACE } from '@/lib/theme';

export default function ParentProgress() {
  const { session } = useAuth();
  const router = useRouter();
  const { effectiveChildIds, isAll, children: kids } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ParentProgress>({ children: [], totals: { thisMonth: 0, completed: 0, upcoming: 0 } });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setData(await fetchParentProgress(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading progress…" /></Screen>;

  const shown = isAll ? data.children : data.children.filter((c) => effectiveChildIds.includes(c.id));

  return (
    <Screen>
      <ChildSwitcher />
      <Text style={styles.eyebrow}>FAMILY</Text>
      <Text style={styles.h1}>Progress</Text>
      <Text style={styles.sub}>Track every child's Quran learning progress in one place.</Text>

      {kids.length === 0 ? (
        <EmptyCard icon="people-outline" title="No children added yet" body="Add a child to start tracking their progress." ctaLabel="Add a Child" onCta={() => router.push('/parent/children')} />
      ) : (
        <>
          <View style={styles.totalsRow}>
            <Total value={data.totals.thisMonth} label="Lessons This Month" icon="calendar-outline" bg="rgba(201,162,39,0.08)" ic={C.gold} />
            <Total value={data.totals.completed} label="Total Completed" icon="checkmark-circle-outline" bg="rgba(22,163,74,0.08)" ic={C.success} />
            <Total value={data.totals.upcoming} label="Upcoming Lessons" icon="time-outline" bg="rgba(79,70,229,0.08)" ic={C.indigo} />
          </View>

          {shown.map((c) => <ChildCard key={c.id} c={c} onPress={() => router.push(`/parent/children/${c.id}` as any)} />)}
        </>
      )}
      <View style={{ height: SPACE.section }} />
    </Screen>
  );
}

function Total({ value, label, icon, bg, ic }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; ic: string }) {
  return (
    <View style={[styles.total, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={ic} />
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

function ChildCard({ c, onPress }: { c: ParentProgressChild; onPress: () => void }) {
  const attColor = c.attendance >= 80 ? C.success : c.attendance >= 60 ? C.gold : C.red;
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.childTop}>
        {c.avatar ? <Image source={{ uri: c.avatar }} style={styles.avatar} /> : <Initials name={c.name} size={44} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.childName} numberOfLines={1}>{c.name}</Text>
          <Text style={styles.childSub}>Student account</Text>
        </View>
        {c.streak >= 3 ? <View style={styles.streakPill}><Text style={styles.streakText}>🔥 {c.streak}d</Text></View> : null}
      </View>

      <View style={styles.statsRow}>
        <MiniStat value={c.completedThisMonth} label="This month" />
        <MiniStat value={c.totalCompleted} label="Total done" />
        <MiniStat value={c.upcomingCount} label="Upcoming" />
      </View>

      <LevelBar label="Hifz" val={c.hifzLevel} max={10} color={C.forest} />
      <LevelBar label="Tajweed" val={c.tajweedLevel} max={8} color={C.gold} />

      <View style={styles.footer}>
        <Text style={styles.footerAtt}>Attendance <Text style={{ color: attColor, fontFamily: FONT.bodyBold }}>{c.attendance}%</Text></Text>
        <View style={styles.footerView}>
          <Text style={styles.footerViewText}>View details</Text>
          <Ionicons name="chevron-forward" size={13} color={C.gold} />
        </View>
      </View>
    </Pressable>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function LevelBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((val / max) * 100));
  return (
    <View style={{ marginBottom: SPACE.sm }}>
      <View style={styles.levelTop}>
        <Text style={styles.levelLabel}>{label}</Text>
        <Text style={[styles.levelVal, { color }]}>Level {val}/{max}</Text>
      </View>
      <View style={styles.levelTrack}><View style={[styles.levelFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.gold, letterSpacing: 1.2 },
  h1: { fontFamily: FONT.displayBold, fontSize: 28, color: C.ink, marginTop: 2 },
  sub: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 4, marginBottom: SPACE.md },
  totalsRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md },
  total: { flex: 1, borderRadius: RADIUS.md, paddingVertical: SPACE.md, paddingHorizontal: 6, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(201,162,39,0.06)' },
  totalValue: { fontFamily: FONT.displayBold, fontSize: 22, color: C.ink },
  totalLabel: { fontFamily: FONT.body, fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 13 },
  card: { backgroundColor: C.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderSoft, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  childTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  childName: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  childSub: { fontFamily: FONT.body, fontSize: 12, color: C.faint, marginTop: 2 },
  streakPill: { backgroundColor: 'rgba(234,88,12,0.1)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  streakText: { fontFamily: FONT.bodyBold, fontSize: 11, color: '#C2410C' },
  statsRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md },
  miniStat: { flex: 1, backgroundColor: 'rgba(201,162,39,0.04)', borderRadius: 12, paddingVertical: SPACE.sm, alignItems: 'center' },
  miniValue: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  miniLabel: { fontFamily: FONT.body, fontSize: 10, color: C.faint, marginTop: 2 },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  levelLabel: { fontFamily: FONT.bodyMed, fontSize: 11, color: C.muted },
  levelVal: { fontFamily: FONT.bodyBold, fontSize: 11 },
  levelTrack: { height: 6, borderRadius: 3, backgroundColor: '#F0EDE6', overflow: 'hidden' },
  levelFill: { height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACE.sm, paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: 'rgba(201,162,39,0.08)' },
  footerAtt: { fontFamily: FONT.body, fontSize: 12, color: C.muted },
  footerView: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerViewText: { fontFamily: FONT.bodyBold, fontSize: 12, color: C.gold },
});
