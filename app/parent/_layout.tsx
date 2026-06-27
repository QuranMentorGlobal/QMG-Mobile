// app/parent/_layout.tsx
import { Stack } from 'expo-router';
import { RoleShell } from '@/components/RoleShell';
import { ParentChildProvider } from '@/lib/parentChild';
import { C } from '@/lib/theme';

export default function ParentLayout() {
  return (
    <ParentChildProvider>
      <RoleShell role="parent">
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }} />
      </RoleShell>
    </ParentChildProvider>
  );
}
