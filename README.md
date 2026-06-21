# QMG Mobile — Proof of Concept (`qmg-mobile`)

A React Native (Expo) proof-of-concept for the **Quran Mentor Global** mobile app. It connects to
the **same Supabase backend, authentication, roles, and teacher data** as the QMG web platform —
no duplicate systems — and uses the same premium **charcoal + dark-gold** identity (no green).

## Phase 1 scope

Splash → Login → Registration → Teacher Listing → Teacher Profile. The goal is to validate mobile
architecture, Supabase integration, auth, navigation, and live on-device testing before building
the full app.

## What it reuses from the existing platform

| Concern | Reuse |
|---|---|
| Auth | Supabase email/password; session persisted via AsyncStorage |
| Roles | `profiles.role` (student · teacher · parent · admin) — read in `AuthContext` |
| Registration | Same flow as web: auth user → upsert `profiles` (pinned role) → seed `teacher_profiles` for teachers |
| Teacher data | The RLS-safe **`public_teachers`** view (same as the web directory) |
| Reviews | Public rows from the `reviews` table |
| Branding | Charcoal/gold tokens mirroring the web + admin theme |

## Tech stack

React Native · Expo (SDK 51) · TypeScript (strict) · Supabase JS · React Navigation (native-stack).

## Architecture

```
App.tsx                      load fonts → SafeAreaProvider → AuthProvider → RootNavigator
src/
  theme/        colors · typography (Fraunces/Inter) · spacing   ← single source of brand truth
  lib/          supabase.ts (AsyncStorage session, EXPO_PUBLIC_* env)
  types/        database.ts (mobile subset: Profile, PublicTeacher, Review, roles)
  context/      AuthContext.tsx (session + profile + role; signIn/signUp/signOut)
  services/     teachers.ts (fetchTeachers / fetchTeacherById / fetchTeacherReviews)
  navigation/   Root → (Splash | Auth | App). App branches by role (scalable).
  components/    Screen · Button · Input · Avatar · Stars · Badge · TeacherCard
  screens/      SplashScreen · auth/Login · auth/Register · teachers/List · teachers/Profile
```

**Scaling to more roles:** `AppNavigator` switches on `role`. Phase 1 routes every role to the
teacher-discovery stack; to add role homes later, return a role-specific navigator
(`StudentTabs`, `TeacherTabs`, `ParentTabs`, `AdminStack`) from that switch — nothing else changes.

## Setup & run

```bash
npm install
cp .env.example .env     # fill in the SAME Supabase project as the web app
npx expo start           # press i / a, or scan the QR with Expo Go on a real device
npm run typecheck        # tsc --noEmit
```

Required env (Expo exposes `EXPO_PUBLIC_*` to the client):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Branding tokens (`src/theme/colors.ts`)

Charcoal `#0B0B0B` background · surfaces `#151515` / `#1C1C1C` · gold `#C8A24A` (bright `#D4AF37`) ·
**dark text `#1A1400` on gold** (contrast rule) · white/cream text · cream secondary `#F7F5F0`.

## Notes / next steps

- Booking, messaging, lessons, dashboards, and the Daily.co room are intentionally out of scope for
  Phase 1 (the "Book a Trial" button is a placeholder).
- Replace `src/assets/icon.png` / `splash.png` with brand artwork before building a standalone binary
  (Expo Go runs without them).
- Auth & teacher reads work with the anon key under your existing RLS; no service-role key ships in
  the app.
