// components/dashboard.tsx
// Reusable dashboard building blocks shared across role dashboards.

import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

// Signature gradient hero card (image-free, on-brand).
export function HeroCard({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <LinearGradient
      colors={G.signature}
      locations={G.signatureLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

type KpiTone = 'green' | 'gold' | 'indigo' | 'plain';
const TONES: Record<KpiTone, { bg: string; value: string }> = {
  green: { bg: 'rgba(22,101,52,0.10)', value: C.forest },
  gold: { bg: 'rgba(201,162,39,0.12)', value: C.accent2 },
  indigo: { bg: 'rgba(99,102,241,0.10)', value: '#4F46E5' },
  plain: { bg: C.card, value: C.ink },
};

// 2-up colored KPI tile (matches the web dashboard tiles).
export function ColorKpi({ label, value, tone = 'plain', icon }: { label: string; value: string | number; tone?: KpiTone; icon?: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <View style={[styles.kpi, { backgroundColor: t.bg }]}>
      {icon ? <View style={styles.kpiIcon}>{icon}</View> : null}
      <Text style={[styles.kpiValue, { color: t.value }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

// Completion indicator: a clean ring track with the % in the centre.
export function CompletionRing({ percent, note }: { percent: number; note?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View style={styles.ringCard}>
      <View style={styles.ring}>
        <Text style={styles.ringPct}>{p}%</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ringTitle}>Profile Completion</Text>
        {note ? <Text style={styles.ringNote}>{note}</Text> : null}
        <View style={styles.ringTrack}>
          <View style={[styles.ringFill, { width: `${p}%` }]} />
        </View>
      </View>
    </View>
  );
}

export function MetricBar({ label, percent }: { label: string; percent: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${p}%` }]} />
      </View>
      <Text style={styles.metricPct}>{p}%</Text>
    </View>
  );
}

// Simple vertical-bar chart (no native deps). data = [{label, value}].
export function MiniBars({ data, unit = '$' }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.barsWrap}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * 110);
        return (
          <View key={i} style={styles.barCol}>
            {d.value > 0 ? <Text style={styles.barVal}>{unit}{d.value}</Text> : <View style={{ height: 14 }} />}
            <LinearGradient colors={G.primary} style={[styles.bar, { height: h }]} />
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md },
  heroEyebrow: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 11, letterSpacing: 1 },
  heroTitle: { color: C.white, fontFamily: FONT.displayBold, fontSize: 24, marginTop: 6 },
  heroSub: { color: C.textLo, fontFamily: FONT.body, fontSize: 13, marginTop: 6, lineHeight: 19 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginBottom: SPACE.sm },
  kpi: { width: '47.8%', flexGrow: 1, borderRadius: RADIUS.lg, padding: SPACE.md, borderWidth: 1, borderColor: C.borderSoft },
  kpiIcon: { marginBottom: 8 },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 26 },
  kpiLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  ringCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, borderWidth: 1, borderColor: C.borderSoft, marginBottom: SPACE.sm },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, borderColor: C.goldPale, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: FONT.displayBold, fontSize: 18, color: C.gold },
  ringTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  ringNote: { fontFamily: FONT.bodyMed, fontSize: 12, color: C.red, marginTop: 2 },
  ringTrack: { height: 7, borderRadius: 4, backgroundColor: C.borderSoft, marginTop: 10, overflow: 'hidden' },
  ringFill: { height: 7, borderRadius: 4, backgroundColor: C.gold },

  metricRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: 12 },
  metricLabel: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.text, width: 120 },
  metricTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' },
  metricFill: { height: 7, borderRadius: 4, backgroundColor: C.gold },
  metricPct: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.muted, width: 38, textAlign: 'right' },

  barsWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: SPACE.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: 18, borderRadius: 5 },
  barVal: { fontFamily: FONT.bodySemi, fontSize: 10, color: C.accent2 },
  barLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
});
