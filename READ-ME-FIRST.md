# Native batch — REQUIRES A FRESH BUILD (do NOT OTA these)

These five files add two **native modules**, so they must ship in a new EAS
**Build & Submit**. They cannot go out as an OTA update — if the JS reaches a
device whose installed binary lacks these modules, the app will crash the moment
it opens the document picker or requests location.

## Deploy order
1. Upload all five files below.
2. Bump `android.versionCode` in app.json (currently 6 → 7) before submitting to Play.
3. Run a fresh EAS **Build & Submit** (not an OTA publish).
4. `npx tsc --noEmit` first, as usual.

## Files
- `package.json` — adds `expo-document-picker ~56.0.4`, `expo-location ~56.0.18`
  (deps sorted; package name & version unchanged).
- `app.json` — adds the `expo-location` config plugin with permission strings.
  Android package `com.quranmentorglobal.app` and version `1.1.0` are unchanged.
- `lib/db.ts` — new `uploadVerificationDoc()` → uploads to the **private**
  `verification-documents` bucket and returns the storage path (sensitive docs are
  never put in a public bucket).
- `components/TeacherProfileScreen.tsx` — ID & Ijazah now upload natively via the
  system document picker (PDF or image). **Supersedes the FINAL-zip copy.**
- `components/LocationGateBanner.tsx` — "Detect automatically" now uses real device
  GPS (permission → reverse-geocode → country), with IP detection as fallback.
  **Supersedes the FINAL-zip copy.**

## What this closes
Both previously-deferred natives are now done: PDF/ID document upload and true GPS
location. Nothing else in the app is affected; the other FINAL-zip files remain
OTA-deployable as before.
