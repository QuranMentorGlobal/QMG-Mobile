// components/RoleShell.tsx
// Shared chrome for every role: gradient top bar + hamburger, and a polished
// right-sliding drawer (user profile card, grouped sections, gold active state,
// dark overlay, rounded inner edge, soft shadow). Guards auth/role.

import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, homeRouteForRole } from '@/lib/auth';
import type { Role } from '@/lib/supabase';
import { navSectionsForRole, PORTAL_LABEL } from '@/lib/nav';
import { Loading } from '@/components/ui';
import { C, FONT, G, RADIUS, SHADOW, SPACE } from '@/lib/theme';

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
  const [open, setOpen] = useState(false);

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
            <View style={styles.brandRow}>
              <Image source={EMBLEM} style={styles.emblemSm} resizeMode="contain" />
              <Text style={styles.brandText}>QuranMentor<Text style={{ color: C.gold }}>Global</Text></Text>
            </View>
            <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.hamburger}>
              <Ionicons name="menu" size={24} color={C.white} />
            </Pressable>
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
  const { signOut, profile } = useAuth();
  const sections = navSectionsForRole(role);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Account';

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
  const backdrop = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

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

  const ini = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.panel, { width: PANEL_W, transform: [{ translateX }] }]}>
          <LinearGradient colors={G.drawer} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.panelInner}>
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <View style={styles.head}>
                <Image source={EMBLEM} style={styles.emblemLg} resizeMode="contain" />
                <Text style={styles.headBrand}>QuranMentor<Text style={{ color: C.gold }}>Global</Text></Text>
                <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
                  <Ionicons name="close" size={20} color={C.textMid} />
                </Pressable>
              </View>

              <View style={styles.profileCard}>
                <View style={styles.profileAvatar}><Text style={styles.profileIni}>{ini}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
                  <View style={styles.rolePill}>
                    <Ionicons name="star" size={10} color={C.ink} />
                    <Text style={styles.rolePillText}>{PORTAL_LABEL[role].toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACE.md }} showsVerticalScrollIndicator={false}>
                {sections.map((sec) => (
                  <View key={sec.title} style={{ marginTop: SPACE.md }}>
                    <Text style={styles.secLabel}>{sec.title}</Text>
                    {sec.items.map((it) => {
                      const active = pathname === it.route;
                      return (
                        <Pressable key={it.route} onPress={() => go(it.route)} style={styles.itemWrap}>
                          {active ? (
                            <LinearGradient colors={['#C9A227', '#E3C04A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.itemActive}>
                              <Ionicons name={it.icon} size={20} color={C.ink} />
                              <Text style={styles.itemLabelActive}>{it.label}</Text>
                              <Ionicons name="chevron-forward" size={16} color={C.ink} style={{ marginLeft: 'auto' }} />
                            </LinearGradient>
                          ) : (
                            <View style={styles.item}>
                              <Ionicons name={it.icon} size={20} color={C.textLo} />
                              <Text style={styles.itemLabel}>{it.label}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>

              <Pressable onPress={confirmSignOut} style={styles.signOut}>
                <Ionicons name="log-out-outline" size={20} color={C.textMid} />
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, paddingTop: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emblemSm: { width: 26, height: 26 },
  brandText: { color: C.white, fontFamily: FONT.displayBold, fontSize: 17 },
  hamburger: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  greeting: { color: C.goldLight, fontFamily: FONT.bodySemi, fontSize: 13, paddingHorizontal: SPACE.md, paddingBottom: 12, paddingTop: 4 },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, borderTopLeftRadius: RADIUS.sheet, borderBottomLeftRadius: RADIUS.sheet, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: -8, height: 0 }, elevation: 16 },
  panelInner: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md },
  emblemLg: { width: 34, height: 34 },
  headBrand: { color: C.white, fontFamily: FONT.displayBold, fontSize: 17, flex: 1 },
  close: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SPACE.md, marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  profileIni: { color: C.ink, fontFamily: FONT.bodyBold, fontSize: 17 },
  profileName: { color: C.white, fontFamily: FONT.bodyBold, fontSize: 15 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: C.gold, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, marginTop: 5 },
  rolePillText: { color: C.ink, fontFamily: FONT.bodyBold, fontSize: 9, letterSpacing: 0.5 },

  secLabel: { color: 'rgba(255,255,255,0.45)', fontFamily: FONT.bodyBold, fontSize: 10, letterSpacing: 1.2, marginLeft: SPACE.lg, marginBottom: 6 },
  itemWrap: { marginHorizontal: SPACE.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACE.md, paddingVertical: 13, borderRadius: RADIUS.md },
  itemActive: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACE.md, paddingVertical: 13, borderRadius: RADIUS.md, ...SHADOW.card },
  itemLabel: { color: C.textMid, fontFamily: FONT.bodyMed, fontSize: 15 },
  itemLabelActive: { color: C.ink, fontFamily: FONT.bodyBold, fontSize: 15 },

  signOut: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACE.lg, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', marginHorizontal: SPACE.sm },
  signOutText: { color: C.textMid, fontFamily: FONT.bodySemi, fontSize: 15 },
});
