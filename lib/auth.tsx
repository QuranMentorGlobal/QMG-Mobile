// lib/auth.tsx
// Auth context: holds the Supabase session + the user's profile (incl. role),
// and exposes signIn / signUp / signOut. Mirrors the web app's auth + role model
// (profiles.role in student|teacher|parent|admin; signup upserts a profiles row and,
// for teachers, a teacher_profiles row — defeating any default-student DB trigger).

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Role } from '@/lib/supabase';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  country?: string | null;
}

interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  country?: string;
}

interface AuthValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (input: SignUpInput) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role, country')
    .eq('id', userId)
    .single();
  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      if (data.session?.user) {
        setProfile(await loadProfile(data.session.user.id));
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setProfile(await loadProfile(newSession.user.id));
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
    return {};
  }

  async function signUp(input: SignUpInput) {
    const validRole: Role =
      input.role === 'teacher' ? 'teacher' : input.role === 'parent' ? 'parent' : 'student';

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: { data: { first_name: input.firstName, last_name: input.lastName, role: validRole } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign up failed — please try again.' };

    // Force the chosen role, defeating any DB trigger that defaults to 'student'.
    const profileData = {
      id: data.user.id,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email.trim(),
      role: validRole,
      country: input.country ?? null,
      is_active: true,
    };
    await (supabase.from('profiles') as any).upsert(profileData, { onConflict: 'id' }).select();

    for (let i = 0; i < 4; i++) {
      await (supabase.from('profiles') as any)
        .update({ role: validRole, first_name: input.firstName, last_name: input.lastName })
        .eq('id', data.user.id);
      const { data: check } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (check?.role === validRole) break;
    }

    if (validRole === 'teacher') {
      await (supabase.from('teacher_profiles') as any).upsert(
        { id: data.user.id, is_active: true },
        { onConflict: 'id' }
      );
    }

    // If email confirmation is on, there is no session yet.
    const needsConfirm = !data.session;
    return { needsConfirm };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (session?.user) setProfile(await loadProfile(session.user.id));
  }

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      profile,
      role: profile?.role ?? null,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function homeRouteForRole(role: Role | null): string {
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'parent') return '/parent/dashboard';
  return '/student/dashboard'; // student + admin fallback (admin uses student view, per web)
}
