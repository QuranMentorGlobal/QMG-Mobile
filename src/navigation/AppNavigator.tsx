// src/navigation/AppNavigator.tsx
// The authenticated experience. Phase 1 ships the teacher-discovery stack for all
// roles. To add role-specific homes later, branch on `role` here and return the
// appropriate navigator (e.g. <StudentTabs/> | <TeacherTabs/> | <ParentTabs/> |
// <AdminStack/>) — the rest of the app is unaffected.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import { useAuth } from '@/context/AuthContext';
import { TeacherListScreen } from '@/screens/teachers/TeacherListScreen';
import { TeacherProfileScreen } from '@/screens/teachers/TeacherProfileScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

function DiscoveryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TeacherList" component={TeacherListScreen} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { role } = useAuth();

  // Phase 1: every role lands on teacher discovery. The switch is the single
  // extension point for future role homes.
  switch (role) {
    case 'student':
    case 'teacher':
    case 'parent':
    case 'admin':
    default:
      return <DiscoveryStack />;
  }
}
