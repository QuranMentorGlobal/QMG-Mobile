// src/navigation/types.ts
// Param lists for type-safe navigation. New role stacks extend AppStackParamList
// (or get their own param list) without touching existing screens.
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  TeacherList: undefined;
  TeacherProfile: { id: string; name?: string };
  // Future (per role): StudentDashboard, TeacherDashboard, ParentDashboard, AdminDashboard, Booking, Messages, ...
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
