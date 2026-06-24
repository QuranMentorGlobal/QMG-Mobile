// app/parent/_layout.tsx
import { Stack } from 'expo-router';
import { RoleShell } from '@/components/RoleShell';
import { C } from '@/lib/theme';

export default function ParentLayout() {
  return (
    <RoleShell role="parent">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }} />
    </RoleShell>
  );
}
