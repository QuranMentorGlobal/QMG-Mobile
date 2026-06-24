// lib/supabase.ts
// Supabase client for React Native.
// Uses AsyncStorage for session persistence (RN has no cookies — unlike the web app's
// @supabase/ssr cookie flow). Same project URL + anon key as the web platform, so it
// reads/writes the exact same data.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced clearly in dev so a missing .env is obvious rather than silent.
  console.warn(
    '[QMG] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in .env (local) and as EAS secrets (builds).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Role = 'student' | 'teacher' | 'parent' | 'admin';
