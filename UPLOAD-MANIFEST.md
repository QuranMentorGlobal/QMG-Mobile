# Muddarris Mobile — Consolidated Upload (FINAL, currency-scope corrected)

Single source of truth. Contains the final version of every file changed while
reconciling the mobile app with the current `muddarris.com` web app. Supersedes ALL
earlier zips (web-parity-FINAL, natives-batch, location/timezone/currency batches).
**Upload everything here and you're done.**

## ⚠️ This is a fresh BUILD, not an OTA
This set adds native modules (`expo-location`, `expo-document-picker`), so it must
ship via a new EAS **Build & Submit** — not an OTA publish. (You're already building,
so this is fine.) `package-lock.json` is included and in sync, so `npm ci
--legacy-peer-deps` will pass.

## ✅ Currency scope — CORRECTED (important)
The teacher **earnings ledger is paid in USD**, so the web keeps every teacher
financial surface dollar-locked. An earlier pass wrongly localized them (e.g. a UAE
teacher saw AED on mobile but USD on web). Now fixed — localization matches the web
**exactly**:

**Localized (display currency, with "≈ $usd" tail) — student-facing only:**
- Teachers list, Teacher detail (`TeachersScreen`, `TeacherDetailScreen`)
- Bookings — all roles (`BookingsScreen`, `ParentBookingsScreen`)
- Book page (`BookingScreen`), Checkout subtotal/total (`CheckoutScreen`)

**USD-locked (raw `$x.toFixed(2)`) — matches web:**
- Teacher dashboard earnings, Teacher earnings ledger, Teacher analytics
- Student billing, Parent billing
- Checkout's actual charge ("Pay"/"Amount paid" stays the literal USD charge)

`exchange_rates` still only affects the student-facing surfaces above.

## Reverted to original (3 files)
`app/teacher/analytics.tsx`, `app/student/billing.tsx`, `app/parent/billing.tsx`
are byte-identical to your original repo — included so you can overwrite any
localized copies already pushed. If your repo never received the localized versions,
these are no-ops.

## Pre-deploy
- `npx tsc --noEmit` once.
- Bump `android.versionCode` 6 → 7 (or rely on EAS auto-increment) before submitting.
- `exchange_rates` populated for your display currencies (else student prices fall back to USD — safe).
- `profiles` has `timezone` / `auto_detect_timezone` columns (else the detector no-ops).

## Native features in this build
- ID / Ijazah upload → system **document picker** → PRIVATE `verification-documents` bucket (stores path, not a public URL).
- Location banner "Detect automatically" → real **device GPS** (reverse-geocode → country), IP fallback.
- Profile photo / intro video → native image/video picker (was already wired).

## Ledger — all closed
Currency (correctly scoped) · Teacher Profile (parity + native uploads) ·
Stale-domain sweep (`muddarris.com`, no www; Android package unchanged) ·
NotificationPrefs (all roles) · TimezoneDetector · LocationGateBanner.
Remaining unbuilt area: the **admin role** (never ported to mobile).
