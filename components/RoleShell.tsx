// components/RoleShell.tsx
// The ONE shared chrome for every role: a gradient top bar with a hamburger, and a
// right-sliding drawer (logo, gold portal pill, role nav items, Sign Out). Designed
// once here; each role's _layout just passes its role. Also guards auth/role.

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, homeRouteForRole } from '@/lib/auth';
import type { Role } from '@/lib/supabase';
import { navForRole, PORTAL_LABEL } from '@/lib/nav';
import { Loading } from '@/components/ui';
import { C, FONT, G, RADIUS, SPACE } from '@/lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_W = Math.min(320, SCREEN_W * 0.84);
const EMBLEM = require('@/assets/splash-icon.png'); // gold emblem on transparent

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { loading, session, role: userRole, profile } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.cream }}>
        <Loading />
      </View>
    );
  }
  if (!session) return <Redirect href="/auth/login" />;
  const allowed = userRole === role || (role === 'student' && userRole === 'admin');
  if (!allowed) return <Redirect href={homeRouteForRole(userRole) as any} />;

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'there';

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <TopBar greeting={`${greetingFor()}, ${name}`} onMenu={() => setOpen(true)} />
      <View style={{ flex: 1 }}>{children}</View>
      <DrawerMenu role={role} open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function TopBar({ greeting, onMenu }: { greeting: string; onMenu: () => void }) {
  return (
    <LinearGradient colors={G.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <Image source={EMBLEM} style={styles.emblemSm} resizeMode="contain" />
            <Text style={styles.brandText}>
              QuranMentor<Text style={{ color: C.gold }}>Global</Text>
            </Text>
          </View>
          <Pressable onPress={onMenu} hitSlop={10} style={styles.hamburger}>
            <Ionicons name="menu" size={26} color={C.white} />
          </Pressable>
        </View>
        <Text style={styles.greeting}>{greeting} 👋</Text>
      </SafeAreaView>
    </LinearGradient>
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
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [open]);

  if (!mounted) return null;

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [PANEL_W, 0] });
  const backdrop = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

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
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.panel, { width: PANEL_W, transform: [{ translateX }] }]}>
          <LinearGradient colors={G.drawer} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              {/* Brand + portal pill */}
              <View style={styles.drawerHead}>
                <Image source={EMBLEM} style={styles.emblemLg} resizeMode="contain" />
                <Text style={styles.drawerBrand}>
                  QuranMentor<Text style={{ color: C.gold }}>Global</Text>
                </Text>
                <View style={styles.portalPill}>
                  <Ionicons name="star" size={11} color={C.ink} />
                  <Text style={styles.portalText}>{PORTAL_LABEL[role].toUpperCase()}</Text>
                </View>
              </View>

              {/* Nav items */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: SPACE.sm }} showsVerticalScrollIndicator={false}>
                {items.map((it) => {
                  const active = pathname === it.route;
                  return (
                    <Pressable
                      key={it.route}
                      onPress={() => go(it.route)}
                      style={[styles.navItem, active && styles.navItemActive]}
                    >
                      <Ionicons name={it.icon} size={19} color={active ? C.ink : C.textLo} />
                      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{it.label}</Text>
                      {active && <Ionicons name="chevron-forward" size={16} color={C.ink} style={{ marginLeft: 'auto' }} />}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Sign out */}
              <Pressable onPress={confirmSignOut} style={styles.signOut}>
                <Ionicons name="log-out-outline" size={19} color={C.textMid} />
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
  // Top bar
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, paddingTop: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emblemSm: { width: 26, height: 26 },
  brandText: { color: C.white, fontFamily: FONT.displayBold, fontSize: 17 },
  hamburger: { padding: 4 },
  greeting: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 13, paddingHorizontal: SPACE.md, paddingBottom: 12, paddingTop: 4 },
  // Drawer
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0 },
  drawerHead: { alignItems: 'center', paddingTop: SPACE.lg, paddingBottom: SPACE.md, paddingHorizontal: SPACE.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  emblemLg: { width: 46, height: 46, marginBottom: 8 },
  drawerBrand: { color: C.white, fontFamily: FONT.displayBold, fontSize: 18 },
  portalPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.gold, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  portalText: { color: C.ink, fontFamily: FONT.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACE.md, paddingVertical: 13, marginHorizontal: SPACE.sm, borderRadius: RADIUS.md },
  navItemActive: { backgroundColor: C.gold },
  navLabel: { color: C.textMid, fontFamily: FONT.bodyMed, fontSize: 15 },
  navLabelActive: { color: C.ink, fontFamily: FONT.bodyBold },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACE.md, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginHorizontal: SPACE.sm },
  signOutText: { color: C.textMid, fontFamily: FONT.bodySemi, fontSize: 15 },
});
