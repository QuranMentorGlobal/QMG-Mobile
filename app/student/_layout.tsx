// app/student/_layout.tsx
import { Stack } from 'expo-router';
import { RoleShell } from '@/components/RoleShell';
import { C } from '@/lib/theme';

export default function StudentLayout() {
  return (
    <RoleShell role="student">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }} />
    </RoleShell>
  );
}
