// src/context/AuthContext.tsx
// Central auth + role state. Reuses the EXISTING QMG auth system:
//   - Supabase email/password sign-in & sign-up
//   - role lives in profiles.role (student | teacher | parent | admin)
// This context is the single source of truth the navigator uses to route a user
// into the correct role experience — so adding Student/Teacher/Parent/Admin
// stacks later needs no change here.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';

interface AuthState {
  initializing: boolean;          // true while we bootstrap the stored session
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  country?: string;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, role, first_name, last_name, email, country, avatar_url, bio, is_active')
    .eq('id', userId)
    .single();
  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Bootstrap stored session + subscribe to auth changes.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) setProfile(await loadProfile(data.session.user.id));
      setInitializing(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      setProfile(next?.user ? await loadProfile(next.user.id) : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    // onAuthStateChange will refresh session + profile.
  }

  // Mirrors the web signup: create the auth user, then upsert profiles with the
  // chosen role (defeating any DB trigger that defaults to 'student'), and for
  // teachers seed a teacher_profiles row with status 'not_submitted'.
  async function signUp(input: SignUpInput) {
    const { firstName, lastName, email, password, role, country } = input;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: firstName, last_name: lastName, role } },
    });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) return; // email-confirmation flow: profile is created on first login

    await (supabase as any)
      .from('profiles')
      .upsert(
        { id: userId, first_name: firstName, last_name: lastName, email: email.trim(), role, country: country ?? null, is_active: true },
        { onConflict: 'id' }
      );

    if (role === 'teacher') {
      await (supabase as any)
        .from('teacher_profiles')
        .upsert({ user_id: userId, status: 'not_submitted' }, { onConflict: 'user_id' });
    }

    if (data.session?.user) setProfile(await loadProfile(data.session.user.id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (session?.user) setProfile(await loadProfile(session.user.id));
  }

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      session,
      profile,
      role: profile?.role ?? null,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [initializing, session, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
