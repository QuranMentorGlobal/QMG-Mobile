// components/ui.tsx
// Shared QMG mobile UI kit. All visuals derive from lib/theme tokens so the app
// matches the web platform's Green + Gold identity.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONT, G, RADIUS, SHADOW, SPACE, STATUS_COLORS } from '@/lib/theme';

export function Screen({
  children,
  scroll = true,
  edges = [],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? styles.scrollPad : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

// Signature charcoal -> forest -> gold banner (the web app's hero/dashboard signature).
export function GradientHeader({
  greeting,
  name,
  subtitle,
  right,
}: {
  greeting?: string;
  name?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={G.signature}
      locations={G.signatureLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={{ flex: 1 }}>
        {greeting ? <Text style={styles.headerGreeting}>{greeting}</Text> : null}
        {name ? <Text style={styles.headerName}>{name}</Text> : null}
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: pressed || disabled ? 0.85 : 1, borderRadius: RADIUS.md }]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={G.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.btnTextPrimary}>{title}</Text>
          )}
        </LinearGradient>
      ) : (
        <View style={[styles.btn, styles.btnGhost]}>
          {loading ? (
            <ActivityIndicator color={C.forest} />
          ) : (
            <Text style={styles.btnTextGhost}>{title}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: SPACE.md }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.faint}
        style={[styles.field, style]}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? '').toLowerCase();
  const s = STATUS_COLORS[key] ?? { bg: C.borderSoft, fg: C.muted, label: status ?? '—' };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.fg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function KpiTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card style={styles.kpi}>
      <Text style={[styles.kpiValue, accent && { color: C.gold }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Card>
  );
}

export function Avatar({ uri, name, size = 44 }: { uri?: string | null; name?: string; size?: number }) {
  const initials = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (uri) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Image } = require('react-native');
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <LinearGradient
      colors={G.primary}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: C.white, fontFamily: FONT.bodyBold, fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={C.forest} size="large" />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: SPACE.xl }}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={[styles.muted, { textAlign: 'center', marginTop: 6 }]}>{body}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  scrollPad: { padding: SPACE.md, paddingBottom: SPACE.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl, gap: 10 },
  header: {
    borderRadius: RADIUS.xl,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerGreeting: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 13, letterSpacing: 0.3 },
  headerName: { color: C.white, fontFamily: FONT.displayBold, fontSize: 22, marginTop: 2 },
  headerSub: { color: C.textLo, fontFamily: FONT.body, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.04)',
    marginBottom: SPACE.md,
    ...SHADOW.card,
  },
  btn: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.lg },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.forest },
  btnTextPrimary: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 16 },
  btnTextGhost: { color: C.forest, fontFamily: FONT.bodyBold, fontSize: 16 },
  fieldLabel: { color: C.text, fontFamily: FONT.bodySemi, fontSize: 13, marginBottom: 7 },
  field: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: FONT.body,
    fontSize: 15,
    color: C.ink,
  },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: FONT.bodySemi, fontSize: 11 },
  kpi: { flex: 1, alignItems: 'flex-start', marginBottom: 0 },
  kpiValue: { fontFamily: FONT.displayBold, fontSize: 26, color: C.ink },
  kpiLabel: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
  section: { fontFamily: FONT.displayBold, fontSize: 17, color: C.ink, marginBottom: SPACE.sm, marginTop: SPACE.sm },
  muted: { fontFamily: FONT.body, fontSize: 13, color: C.muted },
  emptyTitle: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.text },
});

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: SPACE.xs, marginBottom: SPACE.md, alignItems: 'center' }}>
      <Text style={{ fontFamily: FONT.displayBold, fontSize: 24, color: C.ink, textAlign: 'center' }}>{title}</Text>
      {subtitle ? <Text style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted, marginTop: 2, textAlign: 'center' }}>{subtitle}</Text> : null}
    </View>
  );
}

export function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={segStyles.wrap}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[segStyles.seg, active && segStyles.segActive]}>
            <Text style={[segStyles.segText, active && segStyles.segTextActive]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: 'rgba(17,17,17,0.05)', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACE.md },
  seg: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: 'center' },
  segActive: { backgroundColor: C.white, ...SHADOW.card },
  segText: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.muted },
  segTextActive: { color: C.forest },
});

// ── FilterChips ─────────────────────────────────────────────────────────────────
// All filters visible at once — wraps to multiple rows, centered, never a
// horizontal swipe row. Active chip uses the forest→gold gradient. Optional
// counts render as a soft pill. Used by Bookings, Course Studio, Earnings, etc.
export function FilterChips({
  options, value, onChange, align = 'center',
}: {
  options: { key: string; label: string; count?: number }[];
  value: string;
  onChange: (key: string) => void;
  align?: 'center' | 'flex-start';
}) {
  return (
    <View style={[fcStyles.wrap, { justifyContent: align }]}>
      {options.map((o) => {
        const on = o.key === value;
        if (on) {
          return (
            <Pressable key={o.key} onPress={() => onChange(o.key)}>
              <LinearGradient colors={['#166534', '#C9A227']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fcStyles.chip}>
                <Text style={[fcStyles.txt, { color: C.white }]}>{o.label}</Text>
                {o.count != null ? <View style={fcStyles.countOn}><Text style={fcStyles.countOnTxt}>{o.count}</Text></View> : null}
              </LinearGradient>
            </Pressable>
          );
        }
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[fcStyles.chip, fcStyles.chipOff]}>
            <Text style={fcStyles.txt}>{o.label}</Text>
            {o.count != null ? <View style={fcStyles.countOff}><Text style={fcStyles.countOffTxt}>{o.count}</Text></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const fcStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACE.sm, marginBottom: SPACE.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  chipOff: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft },
  txt: { fontFamily: FONT.bodySemi, fontSize: 13, color: C.ink },
  countOn: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countOnTxt: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.white },
  countOff: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countOffTxt: { fontFamily: FONT.bodyBold, fontSize: 11, color: C.accent2 },
});

/* ── TabGrid ──────────────────────────────────────────────────────────────────
   The billing-style segmented tabs: a soft cream container holding tabs in a
   centered 2-per-row grid; the active tab is a white card with gold icon+label
   and a soft shadow; an odd final tab spans the full width. Shared by Billing
   and teacher Earnings so the sub-tab style never drifts. */
export function TabGrid({
  options, value, onChange,
}: {
  options: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const lastFull = options.length % 2 === 1;
  return (
    <View style={tg.wrap}>
      {options.map((o, i) => {
        const on = value === o.key;
        const full = lastFull && i === options.length - 1;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[tg.tab, full && tg.tabFull, on && tg.tabOn]}>
            <Ionicons name={o.icon} size={15} color={on ? C.gold : C.muted} />
            <Text style={[tg.label, on && tg.labelOn]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tg = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(201,162,39,0.06)', borderRadius: RADIUS.lg, padding: 6, marginBottom: SPACE.md },
  tab: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, paddingHorizontal: 8, borderRadius: RADIUS.md },
  tabFull: { width: '100%' },
  tabOn: { backgroundColor: C.white, ...SHADOW.card },
  label: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.muted },
  labelOn: { color: C.gold, fontFamily: FONT.bodyBold },
});
