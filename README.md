# QuranMentor Global — Mobile (Expo)

Native React Native app (Expo SDK 56) for the QMG tutoring marketplace.
Three roles (student · teacher · parent), same Supabase backend as the website,
Green + Gold brand. Ships to Google Play Internal Testing via EAS Build + GitHub Actions.

**Start here → [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)** for the full no-local-machine
setup and deployment walkthrough.

## Quick reference
- Tech: Expo Router · React 19 · Supabase (AsyncStorage sessions) · expo-updates (OTA)
- Build: `eas.json` (production = Play `.aab`)
- CI: `.github/workflows/build.yml` (build+submit) · `ota-update.yml` (instant JS updates)
- Brand tokens: `lib/theme.ts` (mirrors the web `PlatformUI.tsx` T object)
- Verified: `tsc --noEmit` EXIT 0 · `expo export` bundles clean
