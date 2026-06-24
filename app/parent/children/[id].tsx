// app/parent/children/[id].tsx — child detail / report.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading, StatusBadge } from '@/components/ui';
import { StatGrid, StatTile, Panel, PanelHeader, LevelRow, EmptyCard } from '@/components/dashboard';
import { fetchChildDetail, type ChildDetail } from '@/lib/db';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [c, setC] = useState<ChildDetail | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setC(await fetchChildDetail(id));
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const hifzPct = c ? Math.min(100, Math.round((c.hifzLevel / 10) * 100)) : 0;
  const tajweedPct = c ? Math.min(100, Math.round((c.tajweedLevel / 8) * 100)) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={C.white} /></Pressable>
            <Text style={styles.headerTitle}>{c?.name ?? 'Child'}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <Loading label="Loading report…" />
      ) : !c ? (
        <View style={{ flex: 1, padding: SPACE.md, justifyContent: 'center' }}>
          <EmptyCard icon="person-outline" title="Child not found" body="This account may have been unlinked." />
        </View>
      ) : (
        <View style={{ flex: 1, padding: SPACE.md }}>
          <StatGrid>
            <StatTile icon="checkmark-done-outline" value={c.done} label="Lessons Done" tone="green" />
            <StatTile icon="time-outline" value={c.upcoming} label="Upcoming" tone="gold" />
          </StatGrid>
          <View style={{ height: SPACE.md }} />
          <Panel>
            <PanelHeader icon="ribbon-outline" title="Progress" />
            <LevelRow label="Hifz" level={c.hifzLevel} max={10} pct={hifzPct} color={C.forest} />
            <View style={{ height: 1, backgroundColor: C.borderSoft, marginVertical: SPACE.sm }} />
            <LevelRow label="Tajweed" level={c.tajweedLevel} max={8} pct={tajweedPct} color={C.gold} />
          </Panel>
          <Panel>
            <PanelHeader icon="calendar-outline" title="Recent Lessons" />
            {c.recent.length === 0 ? (
              <Text style={styles.empty}>No lessons yet.</Text>
            ) : (
              c.recent.map((l) => (
                <View key={l.id} style={styles.lessonRow}>
                  <Text style={styles.lessonDate}>{l.scheduled_at ? new Date(l.scheduled_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</Text>
                  <StatusBadge status={l.status} />
                </View>
              ))
            )}
          </Panel>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.sm, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 16 },
  empty: { fontFamily: FONT.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: SPACE.md },
  lessonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  lessonDate: { fontFamily: FONT.bodyMed, fontSize: 14, color: C.ink },
});
