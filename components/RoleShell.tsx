// components/RoleShell.tsx
// Shared chrome for every role: gradient top bar + hamburger, and a polished
// right-sliding drawer (user profile card, grouped sections, gold active state,
// dark overlay, rounded inner edge, soft shadow). Guards auth/role.

import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, homeRouteForRole } from '@/lib/auth';
import { countUnreadNotifications } from '@/lib/db';
import type { Role } from '@/lib/supabase';
import { navForRole, PORTAL_LABEL } from '@/lib/nav';
import { Loading } from '@/components/ui';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_W = Math.min(330, SCREEN_W * 0.82);
const EMBLEM = require('@/assets/splash-icon.png');

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { loading, session, role: userRole, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let on = true;
    if (session?.user) countUnreadNotifications(session.user.id).then((n) => { if (on) setUnread(n); });
    return () => { on = false; };
  }, [session?.user?.id, open]);

  if (loading) return <View style={{ flex: 1, backgroundColor: C.cream }}><Loading /></View>;
  if (!session) return <Redirect href="/auth/login" />;
  const allowed = userRole === role || (role === 'student' && userRole === 'admin');
  if (!allowed) return <Redirect href={homeRouteForRole(userRole) as any} />;

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'there';

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topRow}>
            <View style={styles.sideSpacer} />
            <View style={styles.brandCenter}>
              <Image source={EMBLEM} style={styles.emblemSm} resizeMode="contain" />
              <Text style={styles.brandText}>Muddarris</Text>
            </View>
            <View style={styles.rightControls}>
              <Pressable onPress={() => router.push(`/${role}/notifications` as any)} hitSlop={8} style={styles.hamburger}>
                <Ionicons name="notifications-outline" size={22} color={C.white} />
                {unread > 0 ? <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
              </Pressable>
              <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.hamburger}>
                <Ionicons name="menu" size={24} color={C.white} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.greeting}>{greetingFor()}, {name} 👋</Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={{ flex: 1 }}>{children}</View>

      <DrawerMenu role={role} open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function DrawerMenu({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const items = navForRole(role);

  const [mounted, setMounted] = useState(open);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [open]);

  if (!mounted) return null;

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [PANEL_W + 40, 0] });

  function go(route: string) {
    onClose();
    if (pathname !== route) router.push(route as any);
  }
  function confirmSignOut() {
    onClose();
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.panel, { width: PANEL_W, transform: [{ translateX }] }]}>
          <LinearGradient colors={['#111111', '#166534']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.panelInner}>
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              {/* Centered brand header (mirrors web sidebar) */}
              <View style={styles.brandHeader}>
                <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
                  <Ionicons name="close" size={20} color={C.white} />
                </Pressable>
                <Image source={EMBLEM} style={styles.logoLg} resizeMode="contain" />
                <Text style={styles.brandWord}>Muddarris</Text>
                <View style={styles.portalPill}>
                  <View style={styles.portalDot} />
                  <Text style={styles.portalText}>{PORTAL_LABEL[role].toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Flat nav list */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: SPACE.sm, paddingBottom: SPACE.md }} showsVerticalScrollIndicator={false}>
                {items.map((it) => {
                  const active = pathname === it.route;
                  return (
                    <Pressable key={it.route} onPress={() => go(it.route)} style={[styles.item, active ? styles.itemActive : null]}>
                      <Ionicons name={it.icon} size={20} color={active ? C.gold : C.white} />
                      <Text style={[styles.itemLabel, active ? styles.itemLabelActive : null]}>{it.label}</Text>
                      {active ? <Ionicons name="chevron-forward" size={16} color={C.gold} style={{ marginLeft: 'auto' }} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.divider} />
              <Pressable onPress={confirmSignOut} style={styles.signOut}>
                <Ionicons name="log-out-outline" size={20} color={C.white} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.md, paddingTop: 8 },
  sideSpacer: { width: 88 },
  brandCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  rightControls: { width: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  emblemSm: { width: 34, height: 34 },
  brandText: { color: C.white, fontFamily: FONT.displayBold, fontSize: 21 },
  hamburger: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: C.ink, fontFamily: FONT.bodyBold, fontSize: 9 },
  greeting: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 13, textAlign: 'center', paddingHorizontal: SPACE.md, paddingBottom: 12, paddingTop: 4 },

  scrim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, borderTopLeftRadius: RADIUS.sheet, borderBottomLeftRadius: RADIUS.sheet, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: -8, height: 0 }, elevation: 16 },
  panelInner: { flex: 1 },
  brandHeader: { alignItems: 'center', paddingTop: SPACE.xl, paddingBottom: SPACE.md, paddingHorizontal: SPACE.lg },
  close: { position: 'absolute', top: SPACE.sm, right: SPACE.sm, width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  logoLg: { width: 60, height: 60, marginBottom: 8 },
  brandWord: { color: C.white, fontFamily: FONT.displayBold, fontSize: 22 },
  portalPill: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: 'rgba(201,162,39,0.10)', borderWidth: 1, borderColor: 'rgba(201,162,39,0.35)' },
  portalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  portalText: { color: C.gold, fontFamily: FONT.bodyBold, fontSize: 11, letterSpacing: 1.2 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginHorizontal: SPACE.lg },

  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACE.md, paddingVertical: 13, borderRadius: RADIUS.md, marginHorizontal: SPACE.sm, marginVertical: 2 },
  itemActive: { backgroundColor: 'rgba(201,162,39,0.14)', borderWidth: 1, borderColor: 'rgba(201,162,39,0.5)' },
  itemLabel: { color: C.white, fontFamily: FONT.bodyMed, fontSize: 15 },
  itemLabelActive: { color: C.gold, fontFamily: FONT.bodyBold },

  signOut: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACE.lg, paddingVertical: 16, marginHorizontal: SPACE.sm },
  signOutText: { color: C.white, fontFamily: FONT.bodySemi, fontSize: 15 },
});
