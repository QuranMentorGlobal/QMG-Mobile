// app/parent/dashboard.tsx
// Parent home: greeting + a quick overview of linked children (via parent_children).

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientHeader, Card, KpiTile, SectionTitle, Screen, EmptyState, Loading, Avatar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchChildren, type Child } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ParentDashboard() {
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setChildren(await fetchChildren(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const name = profile?.first_name ?? 'Parent';

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your dashboard…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader greeting={greetingFor()} name={`Welcome back, ${name}`} subtitle="Keep track of your children's learning." />

      <View style={styles.kpiRow}>
        <KpiTile label="Children" value={children.length} accent />
        <KpiTile label="Linked accounts" value={children.length} />
      </View>

      <SectionTitle>Your children</SectionTitle>
      {children.length === 0 ? (
        <EmptyState title="No children linked yet" body="Link a child's account on quranmentorglobal.com to see them here." />
      ) : (
        children.map((c) => {
          const cname = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Child';
          return (
            <Card key={c.id} style={styles.childRow}>
              <Avatar uri={c.avatar_url} name={cname} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{cname}</Text>
                <Text style={styles.childMeta}>Student account</Text>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: SPACE.sm },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  childName: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  childMeta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
});
