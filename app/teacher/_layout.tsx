// app/teacher/_layout.tsx
import { Stack } from 'expo-router';
import { RoleShell } from '@/components/RoleShell';
import { C } from '@/lib/theme';

export default function TeacherLayout() {
  return (
    <RoleShell role="teacher">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }} />
    </RoleShell>
  );
}
