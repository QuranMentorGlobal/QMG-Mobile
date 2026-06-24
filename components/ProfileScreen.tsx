// components/ProfileScreen.tsx
// Shared profile/account screen for all roles: avatar, name, role, email, sign out.

import { Alert, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, GradientHeader, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { C, FONT, SPACE } from '@/lib/theme';

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  admin: 'Admin',
};

export function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your account';

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen>
      <GradientHeader greeting="Account" name={name} subtitle={profile?.email ?? undefined} />

      <Card style={styles.row}>
        <Avatar uri={profile?.avatar_url} name={name} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{ROLE_LABEL[profile?.role ?? 'student']} account</Text>
        </View>
      </Card>

      <SectionTitle>Details</SectionTitle>
      <Card>
        <Detail label="Email" value={profile?.email ?? '—'} />
        <Detail label="Country" value={profile?.country ?? '—'} />
        <Detail label="Role" value={ROLE_LABEL[profile?.role ?? 'student']} last />
      </Card>

      <View style={{ marginTop: SPACE.lg }}>
        <Button title="Sign out" variant="ghost" onPress={confirmSignOut} />
      </View>

      <Text style={styles.note}>
        Account changes and verification are managed on quranmentorglobal.com. This is the testing build.
      </Text>
    </Screen>
  );
}

function Detail({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detail, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  name: { fontFamily: FONT.displayBold, fontSize: 18, color: C.ink },
  role: { fontFamily: FONT.bodyMed, fontSize: 13, color: C.gold, marginTop: 2 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  detailLabel: { fontFamily: FONT.body, fontSize: 14, color: C.muted },
  detailValue: { fontFamily: FONT.bodySemi, fontSize: 14, color: C.ink, maxWidth: '60%', textAlign: 'right' },
  note: { fontFamily: FONT.body, fontSize: 12, color: C.faint, marginTop: SPACE.lg, lineHeight: 18 },
});
