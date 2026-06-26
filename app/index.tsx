// app/index.tsx
// Entry gate. Waits for auth to resolve, then sends the user to the right place:
// no session -> login; session -> role home (student/teacher/parent).

import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth, homeRouteForRole } from '@/lib/auth';
import { Loading } from '@/components/ui';
import { C } from '@/lib/theme';

export default function Index() {
  const { loading, session, role } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.cream }}>
        <Loading label="Loading Muddarris…" />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;
  return <Redirect href={homeRouteForRole(role) as any} />;
}
