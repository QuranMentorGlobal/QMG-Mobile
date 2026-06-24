// components/RoleTabs.tsx
// Bottom tab navigator styled in QMG colors, with a role guard: if the signed-in
// user's role doesn't match this section (or they're signed out), redirect them.

import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuth, homeRouteForRole } from '@/lib/auth';
import type { Role } from '@/lib/supabase';
import { Loading } from '@/components/ui';
import { C, FONT } from '@/lib/theme';

export interface TabDef {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function RoleTabs({ role, tabs }: { role: Role; tabs: TabDef[] }) {
  const { loading, session, role: userRole } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.cream }}>
        <Loading />
      </View>
    );
  }
  if (!session) return <Redirect href="/auth/login" />;
  // admin is allowed to view the student section (matches web fallback).
  const allowed = userRole === role || (role === 'student' && userRole === 'admin');
  if (!allowed) return <Redirect href={homeRouteForRole(userRole) as any} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.forest,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.borderSoft,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: FONT.bodySemi, fontSize: 11 },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} size={size ?? 22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
