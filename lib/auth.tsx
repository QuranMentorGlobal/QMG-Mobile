// lib/auth.tsx
// Auth context: holds the Supabase session + the user's profile (incl. role),
// and exposes signIn / signUp / signOut. Mirrors the web app's auth + role model
// (profiles.role in student|teacher|parent|admin; signup upserts a profiles row and,
// for teachers, a teacher_profiles row — defeating any default-student DB trigger).
//
// HARDENED: initial session resolution can never hang the app on the loading screen.
// getSession() is raced against a timeout, the profile fetch is non-blocking, and
// setLoading(false) is guaranteed to run via finally. A stale/corrupt stored session
// or an unreachable backend now degrades to the login screen instead of an infinite
// "Loading QuranMentor…" spinner.

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

// Resolve a promise, but never wait longer than `ms`. On timeout, resolve with
// `fallback` so a hung network call can't freeze app startup.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

async function loadProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url, role, country')
      .eq('id', userId)
      .single();
    return (data as Profile) ?? null;
  } catch {
    // Network/permission error fetching the profile must not block startup.
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        // getSession() reads the persisted token from AsyncStorage. Normally fast,
        // but if it stalls (e.g. storage lock / bad client config) we must not wait
        // forever — fall back to "no session" after 8s so the user reaches login.
        const result = await withTimeout(supabase.auth.getSession(), 8000, {
          data: { session: null },
        } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

        if (!active) return;
        const current = result?.data?.session ?? null;
        setSession(current);

        if (current?.user) {
          // Non-blocking: even if this is slow/null, loading is released in finally.
          const p = await withTimeout(loadProfile(current.user.id), 8000, null);
          if (active) setProfile(p);
        }
      } catch {
        if (active) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        // ALWAYS release the loader — this is the line whose absence caused the hang.
        if (active) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        const p = await withTimeout(loadProfile(newSession.user.id), 8000, null);
        if (active) setProfile(p);
      } else {
        setProfile(null);
      }
      // Defensive: any auth state change also guarantees we're out of the loader.
      if (active) setLoading(false);
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
