# Muddarris Mobile — Consolidated Web-Parity Upload (FINAL)

This single package contains the **final version of every file changed** while
reconciling the mobile app with the current `muddarris.com` web app (3 days of web
drift). It supersedes all earlier per-batch zips — where a file appeared in more
than one batch, the copy here is the latest. **Upload this and you're done.**

All paths are repo-relative: drop each file into the matching folder in `qmg-mobile`
via the GitHub web UI.

## Before deploying
- Run `npx tsc --noEmit` once. Every file here is esbuild- and import-resolution-clean,
  but the full type graph needs the EAS deps that aren't installable in the sandbox.
- Make sure the shared Supabase `exchange_rates` table has rows for your key
  currencies (e.g. PKR). Without a rate, prices safely fall back to USD.
- `profiles` must have `timezone` / `auto_detect_timezone` columns (the web uses
  them already). If absent, the timezone detector no-ops silently.

## What's included (34 files)

### New files (11)
- `lib/pricing/currency.ts` — currency maps + `formatCurrency` (pure)
- `lib/pricing/useDisplayCurrency.tsx` — resolves currency from `profiles.country` + `exchange_rates`; `useMoney` / `formatMoneySync` helpers
- `components/Price.tsx` — `<Price usd={n}/>` localized price
- `components/ChildSwitcher.tsx` — parent "VIEWING" child selector
- `components/ParentBookingsScreen.tsx` — parent bookings (all children)
- `components/LocationGateBanner.tsx` — prompt + IP auto-detect when no country set
- `components/NotificationPrefs.tsx` — notification toggles for student/parent profile
- `components/TimezoneDetector.tsx` — session-once timezone auto-detect + prompt
- `lib/parentChild.tsx` — parent-child selection context
- `lib/parentActions.ts` — parent bookings/schedule/courses/progress data

### Changed files (23)
Parent screens: `app/parent/{_layout,bookings,courses,lessons,attendance,progress,billing,dashboard}.tsx`
Currency wiring: `components/{TeachersScreen,TeacherDetailScreen,BookingsScreen,BookingScreen,CheckoutScreen}.tsx`, `app/teacher/{dashboard,earnings,analytics,courses}.tsx`, `app/student/billing.tsx`, `app/parent/billing.tsx`
Profile + shell: `components/{ProfileScreen,RoleShell,TeacherProfileScreen}.tsx`
Domain fix: `app/teacher/help.tsx` (+ courses/earnings constants), `components/ProfileScreen.tsx`
Data layer: `lib/bookingActions.ts` (parent cancel)
Dashboards (location banner): `app/{student,teacher,parent}/dashboard.tsx`

## Parity ledger — ALL CLOSED
1. ✅ Currency / localized pricing — foundation + wired app-wide (charge amounts stay USD by design)
2. ✅ Teacher Profile verification — already in parity; added native photo/video upload + domain fix
3. ✅ Stale-domain sweep — everything on `muddarris.com` (no www); Android package unchanged
4. ✅ NotificationPrefs — now on all three roles
5. ✅ TimezoneDetector — mounted in `RoleShell`
6. ✅ LocationGateBanner — on all dashboards, feeds the currency system

Route/nav structure was already in full parity; the "missing" `teacher/verification`
and `course-studio/enrollments` turned out to be retired redirects on the web.

## Notes / deferred (need a native build, not OTA)
- ID / Ijazah **document** (PDF) upload still opens web — needs `expo-document-picker`.
- Device-GPS location still uses IP detection — `expo-location` isn't in this build.
