// app/parent/children.tsx
// Children list for parents (via parent_children -> profiles).

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Avatar, Card, GradientHeader, Screen, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fetchChildren, type Child } from '@/lib/db';
import { C, FONT, SPACE } from '@/lib/theme';

export default function Children() {
  const { session } = useAuth();
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

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading children…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <GradientHeader greeting="Children" name="Linked accounts" subtitle={`${children.length} linked`} />
      {children.length === 0 ? (
        <EmptyState title="No children linked yet" body="Link a child's account on the website to manage their learning here." />
      ) : (
        children.map((c) => {
          const cname = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Child';
          return (
            <Card key={c.id} style={styles.row}>
              <Avatar uri={c.avatar_url} name={cname} size={48} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  name: { fontFamily: FONT.bodyBold, fontSize: 15, color: C.ink },
  meta: { fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 },
});
