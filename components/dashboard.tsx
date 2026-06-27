// components/dashboard.tsx
// Premium mobile dashboard kit. All widgets consume theme tokens (8px spacing,
// radii 20/16, soft shadows) so every screen feels intentionally designed.

import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

const EMBLEM = require('@/assets/splash-icon.png');

/* ── Section header ─────────────────────────────────────────────── */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Gradient welcome hero ──────────────────────────────────────── */
export function WelcomeHero({ eyebrow, title, subtitle, dots = 3, active = 0 }: { eyebrow?: string; title: string; subtitle?: string; dots?: number; active?: number }) {
  return (
    <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Image source={EMBLEM} style={styles.heroWatermark} resizeMode="contain" />
      <View style={styles.heroInner}>
        {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
        <View style={styles.dots}>
          {Array.from({ length: dots }).map((_, i) => (
            <View key={i} style={[styles.dot, i === active ? styles.dotActive : null]} />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

/* ── Stat tiles (centered, colored) ─────────────────────────────── */
type Tone = 'green' | 'gold' | 'mint' | 'indigo' | 'cream';
// Exact web KpiCard gradients (135deg) + icon tints — do not drift.
const TONE: Record<Tone, { from: string; to: string; icon: string; iconBg: string }> = {
  green:  { from: '#F7F1E2', to: '#D4EDDA', icon: '#C9A227', iconBg: 'rgba(201,162,39,0.12)' },
  gold:   { from: '#FFF8E8', to: '#FDEFC9', icon: '#C9A227', iconBg: 'rgba(201,162,39,0.12)' },
  mint:   { from: '#F0FFF4', to: '#DCFCE7', icon: '#16A34A', iconBg: 'rgba(22,163,74,0.12)' },
  indigo: { from: '#EEF2FF', to: '#E0E7FF', icon: '#4F46E5', iconBg: 'rgba(79,70,229,0.12)' },
  cream:  { from: '#FFFFFF', to: '#F8F5EE', icon: '#C9A227', iconBg: 'rgba(201,162,39,0.10)' },
};

/* ── Dashboard banner slider (3 photos, auto-rotate — mirrors web) ── */
type BannerRole = 'teacher' | 'parent' | 'student';
interface Slide { img: any; headline: string; sub: string }

// Banner photos are bundled INTO the app (assets/banners/*.jpg, ~50KB each), so
// they always render — independent of the web server, host, or network. They are
// delivered with OTA updates like any other asset.
const SLIDES: Record<BannerRole, Slide[]> = {
  teacher: [
    { img: require('@/assets/banners/teacher-1.jpg'), headline: 'Welcome Back, Teacher', sub: 'Your students are waiting for your guidance.' },
    { img: require('@/assets/banners/teacher-2.jpg'), headline: 'Share Your Knowledge', sub: 'Earn while teaching the words of Allah.' },
    { img: require('@/assets/banners/teacher-3.jpg'), headline: 'Grow Your Students', sub: 'Complete verification to go live on the platform.' },
  ],
  student: [
    { img: require('@/assets/banners/student-1.jpg'), headline: 'Continue Your Journey', sub: 'Every lesson brings you closer to Allah.' },
    { img: require('@/assets/banners/student-2.jpg'), headline: 'Deepen Your Understanding', sub: 'Tajweed, Hifz, Tafseer — learn at your pace.' },
    { img: require('@/assets/banners/student-3.jpg'), headline: 'Your Teacher is Ready', sub: 'Book your next lesson in seconds.' },
  ],
  parent: [
    { img: require('@/assets/banners/parent-1.jpg'), headline: 'Nurture Their Journey', sub: "Track your child's progress every step of the way." },
    { img: require('@/assets/banners/parent-2.jpg'), headline: 'Learning, Supervised', sub: 'Safe, certified teachers for your children.' },
    { img: require('@/assets/banners/parent-3.jpg'), headline: 'A Gift for Life', sub: 'Give your child the Quran — the greatest inheritance.' },
  ],
};

export function BannerSlider({ role }: { role: BannerRole }) {
  const list = SLIDES[role] ?? SLIDES.student;
  const [current, setCurrent] = useState(0);
  const [imgError, setImgError] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setCurrent((c) => (c + 1) % list.length), 4500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [list.length]);
  // Reset the error flag whenever the slide changes so each photo gets a fresh try.
  useEffect(() => { setImgError(false); }, [current]);

  const slide = list[current];
  const [aspect, setAspect] = useState(1080 / 420); // sensible hero ratio until measured
  // Prefer the full web image (identical to the website); fall back to the bundled
  // photo only if the network image fails to load.
  const webUrl = `https://www.muddarris.com/banners/${role}-${current + 1}.png`;
  // Size the banner to the image's real shape so it shows fully (no crop, no bands).
  useEffect(() => {
    let alive = true;
    Image.getSize(webUrl, (w, h) => { if (alive && w && h) setAspect(w / h); }, () => {});
    return () => { alive = false; };
  }, [webUrl]);
  return (
    <View style={[styles.banner, { aspectRatio: aspect }]}>
      {/* charcoal -> forest -> gold fallback shows if the image is slow/unavailable */}
      <LinearGradient colors={G.signature} locations={G.signatureLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image
        source={imgError ? slide.img : { uri: webUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
      {/* very light left wash — only enough to keep the text readable */}
      <LinearGradient
        colors={['rgba(17,17,17,0.55)', 'rgba(17,17,17,0.18)', 'rgba(17,17,17,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bannerText}>
        <Text style={styles.bannerEyebrow}>MUDDARRIS</Text>
        <Text style={styles.bannerHeadline}>{slide.headline}</Text>
        <Text style={styles.bannerSub} numberOfLines={2}>{slide.sub}</Text>
      </View>
      <View style={styles.bannerDots}>
        {list.map((_, i) => (
          <Pressable key={i} onPress={() => setCurrent(i)} style={[styles.bannerDot, i === current ? styles.bannerDotActive : null]} />
        ))}
      </View>
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function StatTile({ icon, value, label, tone = 'cream' }: { icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: t.iconBg }]}>
        <Ionicons name={icon} size={20} color={t.icon} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </LinearGradient>
  );
}

/* ── Quick actions ──────────────────────────────────────────────── */
export function QuickActionGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.qa, pressed && { opacity: 0.85 }]}>
      <View style={styles.qaIcon}>
        <Ionicons name={icon} size={20} color={C.forest} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </Pressable>
  );
}

/* ── Card shell ─────────────────────────────────────────────────── */
export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function PanelHeader({ icon, title, subtitle }: { icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.panelHead}>
      {icon ? <Ionicons name={icon} size={18} color={C.gold} style={{ marginTop: 1 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.panelTitle}>{title}</Text>
        {subtitle ? <Text style={styles.panelSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/* ── Radial percentage (no native deps) ─────────────────────────── */
export function RadialMini({ percent, size = 60, color = C.gold }: { percent: number; size?: number; color?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: C.goldPale, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONT.displayBold, fontSize: size * 0.26, color }}>{p}%</Text>
    </View>
  );
}

export function LevelRow({ label, level, max, pct, color }: { label: string; level: number; max: number; pct: number; color: string }) {
  return (
    <View style={styles.levelRow}>
      <RadialMini percent={pct} size={56} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={styles.levelTitle}>{label}</Text>
        <Text style={styles.levelSub}>Level {level} of {max}</Text>
        <Text style={styles.levelUpdate}>Update →</Text>
      </View>
    </View>
  );
}

/* ── Metric / goal bars ─────────────────────────────────────────── */
export function MetricBar({ label, percent, icon }: { label: string; percent: number; icon?: keyof typeof Ionicons.glyphMap }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={15} color={C.forest} /> : null}
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        <Text style={styles.metricPct}>{p}%</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${p}%` }]} /></View>
    </View>
  );
}

export function GoalRow({ label, done, total, unit, complete }: { label: string; done: number; total: number; unit: string; complete?: boolean }) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={complete ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={complete ? C.success : C.faint} />
          <Text style={[styles.metricLabel, complete && { color: C.forest, fontFamily: FONT.bodySemi }]}>{label}</Text>
        </View>
        <Text style={styles.metricPct}>{done}/{total} {unit}</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: complete ? C.success : C.gold }]} /></View>
    </View>
  );
}

/* ── Bar chart ──────────────────────────────────────────────────── */
export function BarsChart({ data, unit = '' }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return <Text style={styles.noData}>No data yet</Text>;
  return (
    <View style={styles.barsWrap}>
      {data.map((d, i) => (
        <View key={i} style={styles.barCol}>
          {d.value > 0 ? <Text style={styles.barVal}>{unit}{d.value}</Text> : <View style={{ height: 14 }} />}
          <LinearGradient colors={G.primary} style={[styles.bar, { height: Math.max(4, (d.value / max) * 100) }]} />
          <Text style={styles.barLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── Empty state card ───────────────────────────────────────────── */
export function EmptyCard({ icon = 'calendar-outline', title, body, ctaLabel, onCta }: { icon?: keyof typeof Ionicons.glyphMap; title: string; body?: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <Panel style={{ alignItems: 'center', paddingVertical: SPACE.section }}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={C.gold} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {ctaLabel ? (
        <Pressable onPress={onCta} style={{ marginTop: SPACE.md }}>
          <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </Panel>
  );
}

/* ── Quote card (Reflection / Ayah / Hadith) ────────────────────── */
export function QuoteCard({ icon, eyebrow, arabic, quote, source, dots = 3, active = 0 }: { icon: keyof typeof Ionicons.glyphMap; eyebrow: string; arabic?: string; quote: string; source: string; dots?: number; active?: number }) {
  return (
    <LinearGradient colors={G.drawer} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quote}>
      <View style={styles.quoteHead}>
        <Ionicons name={icon} size={16} color={C.goldLight} />
        <Text style={styles.quoteEyebrow}>{eyebrow}</Text>
      </View>
      {arabic ? <Text style={styles.quoteArabic}>{arabic}</Text> : null}
      <Text style={styles.quoteText}>“{quote}”</Text>
      <Text style={styles.quoteSource}>— {source}</Text>
      <View style={[styles.dots, { marginTop: SPACE.md }]}>
        {Array.from({ length: dots }).map((_, i) => (
          <View key={i} style={[styles.dot, i === active ? styles.dotActive : null]} />
        ))}
      </View>
    </LinearGradient>
  );
}

/* ── Badge strip ────────────────────────────────────────────────── */
export function BadgeStrip({ earned, body }: { earned: number; body: string }) {
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <View style={styles.badgeTop}>
        <Text style={styles.badgeEarned}>{earned} earned</Text>
        <View style={styles.badgePill}>
          <Ionicons name="information-circle-outline" size={14} color={C.accent2} />
          <Text style={styles.badgePillText}>How badges are earned</Text>
        </View>
      </View>
      <Text style={styles.badgeBody}>{body}</Text>
    </View>
  );
}

/* ── Avatar with initials ───────────────────────────────────────── */
export function Initials({ name, size = 44 }: { name: string; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.white, fontFamily: FONT.bodyBold, fontSize: size * 0.34 }}>{ini}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACE.lg, backgroundColor: C.forestDeep, ...SHADOW.lg },
  bannerText: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: SPACE.lg },
  bannerEyebrow: { color: '#E3C04A', fontFamily: FONT.bodySemi, fontSize: 10, letterSpacing: 1.3, marginBottom: 3, textAlign: 'left' },
  bannerHeadline: { color: '#FFFFFF', fontFamily: FONT.displayBold, fontSize: 19, lineHeight: 23, textAlign: 'left' },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontFamily: FONT.body, fontSize: 12, marginTop: 4, maxWidth: '72%', textAlign: 'left' },
  bannerDots: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', gap: 6 },
  bannerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  bannerDotActive: { width: 22, backgroundColor: '#E3C04A' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACE.lg, marginBottom: SPACE.md },
  sectionTitle: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  sectionAction: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.gold },

  hero: { borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.lg, overflow: 'hidden', ...SHADOW.lg },
  heroWatermark: { position: 'absolute', right: -24, top: -20, width: 150, height: 150, opacity: 0.10 },
  heroInner: {},
  heroEyebrow: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 11, letterSpacing: 1.2 },
  heroTitle: { color: C.white, fontFamily: FONT.displayBold, fontSize: 24, marginTop: 8 },
  heroSub: { color: C.textLo, fontFamily: FONT.body, fontSize: 13, marginTop: 8, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 6, marginTop: SPACE.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 18, backgroundColor: C.gold },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  tile: { width: '47.5%', flexGrow: 1, borderRadius: RADIUS.lg, padding: SPACE.md, alignItems: 'center', overflow: 'hidden', ...SHADOW.card },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileValue: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink },
  tileLabel: { fontFamily: FONT.bodyMed, fontSize: 12, color: C.muted, marginTop: 3, textAlign: 'center' },

  qa: { width: '47.5%', flexGrow: 1, backgroundColor: C.card, borderRadius: RADIUS.lg, paddingVertical: SPACE.lg, alignItems: 'center', ...SHADOW.card },
  qaIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(22,101,52,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  qaLabel: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },

  panel: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, ...SHADOW.card },
  panelHead: { flexDirection: 'row', gap: 10, marginBottom: SPACE.md },
  panelTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  panelSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.sm },
  levelTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  levelSub: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  levelUpdate: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.gold, marginTop: 4 },

  metricRow: { marginBottom: SPACE.md },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metricLabel: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.text },
  metricPct: { fontFamily: FONT.bodyBold, fontSize: 13, color: C.muted },
  track: { height: 7, borderRadius: 4, backgroundColor: C.borderSoft, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: C.gold },

  barsWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingTop: SPACE.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: 16, borderRadius: 5 },
  barVal: { fontFamily: FONT.bodySemi, fontSize: 10, color: C.accent2 },
  barLabel: { fontFamily: FONT.body, fontSize: 11, color: C.muted },
  noData: { fontFamily: FONT.body, fontSize: 14, color: C.faint, textAlign: 'center', paddingVertical: SPACE.section },

  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.tintGold, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  emptyTitle: { fontFamily: FONT.bodyBold, fontSize: 16, color: C.ink },
  emptyBody: { fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 19 },
  emptyCta: { borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg, paddingVertical: 12 },
  emptyCtaText: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 14 },

  quote: { borderRadius: RADIUS.lg, padding: SPACE.lg, marginBottom: SPACE.md, ...SHADOW.card },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  quoteEyebrow: { color: C.goldLight, fontFamily: FONT.bodyBold, fontSize: 11, letterSpacing: 1 },
  quoteArabic: { color: C.white, fontFamily: FONT.body, fontSize: 18, textAlign: 'right', marginBottom: 12, lineHeight: 30 },
  quoteText: { color: C.white, fontFamily: FONT.bodyMed, fontSize: 15, lineHeight: 23, fontStyle: 'italic' },
  quoteSource: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 12, marginTop: 10 },

  badgeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  badgeEarned: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.muted },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.gold, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgePillText: { fontFamily: FONT.bodySemi, fontSize: 12, color: C.accent2 },
  badgeBody: { fontFamily: FONT.body, fontSize: 12, color: C.faint, lineHeight: 18 },
});
