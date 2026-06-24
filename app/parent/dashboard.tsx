// app/parent/dashboard.tsx
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, EmptyState, Loading, Avatar } from '@/components/ui';
import { HeroCard, KpiGrid, ColorKpi } from '@/components/dashboard';
import { useAuth } from '@/lib/auth';
import { fetchChildren, type Child } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export default function ParentDashboard() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setChildren(await fetchChildren(session.user.id));
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen scroll={false}><Loading label="Loading your dashboard…" /></Screen>;

  return (
    <Screen>
      <HeroCard eyebrow="QURANMENTOR GLOBAL" title="Your Family's Journey" subtitle="Track your children's learning in one place." />
      <KpiGrid>
        <ColorKpi label="Children" value={children.length} tone="green" icon={<Ionicons name="people-outline" size={18} color={C.forest} />} />
        <ColorKpi label="Linked Accounts" value={children.length} tone="gold" icon={<Ionicons name="link-outline" size={18} color={C.accent2} />} />
      </KpiGrid>

      <Text style={styles.section}>Your children</Text>
      {children.length === 0 ? (
        <EmptyState title="No children linked yet" body="Link a child's account on quranmentorglobal.com to see them here." />
      ) : (
        children.map((c) => {
          const cname = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Child';
          return (
            <Card key={c.id} style={styles.row}>
              <Avatar uri={c.avatar_url} name={cname} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{cname}</Text>
                <Text style={styles.meta}>Student account</Text>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink, marginTop: SPACE.sm, marginBottom: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
});
