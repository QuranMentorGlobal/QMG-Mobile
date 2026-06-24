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
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONT, G, RADIUS, SPACE, STATUS_COLORS } from '@/lib/theme';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
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
    borderColor: C.borderSoft,
    marginBottom: SPACE.sm,
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
