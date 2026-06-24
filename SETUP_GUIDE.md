# QMG Mobile — Setup & Deployment Guide

A real **React Native (Expo SDK 56)** app for QuranMentor Global. Three roles
(student · teacher · parent), same Supabase data as the website, your Green + Gold
brand. Built to ship to **Google Play Internal Testing** with **no local machine** —
everything runs in the cloud (EAS Build) and from **GitHub Actions**.

> You only ever do the one-time setup below once. After that: push to GitHub → testers
> get the update. Full rebuilds (icon/permissions/native deps) are one button in the
> Actions tab.

---

## What's inside

```
qmg-mobile/
├─ app/                      # screens (Expo Router, file-based like Next.js)
│  ├─ index.tsx              # auth gate → routes by role
│  ├─ auth/login.tsx         # login (role tabs)
│  ├─ auth/signup.tsx        # signup (role pick, mirrors web profile creation)
│  ├─ student/ …             # dashboard · teachers · bookings · profile
│  ├─ teacher/ …             # dashboard · bookings · profile
│  └─ parent/  …             # dashboard · children · profile
├─ components/               # UI kit + shared screens (signature gradient, cards…)
├─ lib/                      # theme tokens · supabase client · auth · db queries
├─ assets/                   # app icon, splash, adaptive icon (from your logo)
├─ app.json                  # app identity, package, OTA config
├─ eas.json                  # cloud build + Play submit profiles
└─ .github/workflows/        # build.yml (build+submit) · ota-update.yml (instant)
```

Data is read from the **same tables** the web app uses: `profiles`, `public_teachers`,
`bookings`, `lessons`, `parent_children`. The anon key is the same as your web
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe in client apps).

---

## STEP 1 — Put the code on GitHub

1. On GitHub: **New repository** → name it `qmg-mobile` → **Private** → *don't* add a
   README → **Create**.
2. Unzip `qmg-mobile.zip` on your computer.
3. On the new repo page click **uploading an existing file**, then drag in **all the
   files and folders** from the unzipped folder (including the hidden `.github` folder,
   `.gitignore`, `eas.json`, `app.json`). Commit to `main`.

> `node_modules` is **not** included (it's rebuilt in the cloud). That's correct.

---

## STEP 2 — Create your Expo project (web only, no terminal)

1. Sign up free at **https://expo.dev**.
2. **Projects → Create a project**. Name: `qmg-mobile`. Copy the **Project ID** it gives
   you (a UUID like `a1b2c3d4-…`).
3. In your GitHub repo, edit **`app.json`** and replace **both** copies of
   `REPLACE_WITH_EAS_PROJECT_ID`:
   - `expo.extra.eas.projectId` → your Project ID
   - `expo.updates.url` → `https://u.expo.dev/<your Project ID>`
   Commit.
4. Create an **access token**: expo.dev → your avatar → **Account settings → Access
   tokens → Create token**. Copy it.

---

## STEP 3 — Add your Supabase keys

Edit **`eas.json`** in GitHub. In **all three** build profiles (`development`,
`preview`, `production`) replace:
- `EXPO_PUBLIC_SUPABASE_URL` → your real `https://xxxx.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → your real anon key

(Same values as your website. Commit.) No Supabase/database changes are needed.

---

## STEP 4 — Add GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `EXPO_TOKEN` | the Expo access token from Step 2 |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | the Play service-account JSON (Step 6) — add later |

You can add `EXPO_TOKEN` now and the Play one after Step 6.

---

## STEP 5 — First build (creates your signing key automatically)

1. Repo → **Actions** tab → **Build & Submit (Android · Play Internal)** →
   **Run workflow**. For this first run set **submit = false** (you'll submit after the
   Play app exists).
2. EAS builds in the cloud (~10–15 min). On the **first** build it auto-generates and
   stores your Android **keystore** on Expo's servers — you never handle it locally.
3. When done, open the build on **expo.dev → your project → Builds** and **download the
   `.aab`**.

---

## STEP 6 — Google Play Console: Internal Testing

1. Play Console → **Create app**. Name `QuranMentor Global`, app, free.
2. Set the **package name** to **`com.quranmentorglobal.app`** (must match `app.json`).
3. Left menu → **Testing → Internal testing → Create new release**.
4. Upload the `.aab` you downloaded in Step 5. Add release notes → **Save → Review →
   Roll out**.
5. **Testers tab** → create an email list → add your family/friends' Google emails →
   **save**. Copy the **opt-in link** and send it to them. They tap it, install from
   Play, and they're in. ✅

### Connect EAS Submit for future one-click releases (optional but recommended)
1. Play Console → **Setup → API access** → link a Google Cloud project → **create a
   service account** → grant it **Release manager** (or Admin) → create a **JSON key**.
2. Paste that JSON into the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` GitHub secret (Step 4).
3. From now on, **Build & Submit** with **submit = true** uploads to Internal Testing
   automatically — no manual download/upload.

---

## Day-to-day: how you ship changes

**Small change (text, colors, layout, logic)** → just **push to `main`**. The
**OTA Update** action publishes it; testers get it within seconds on next app open. No
rebuild, no Play upload.

**Big change (app icon, Android permissions, new native library, version bump)** →
**Actions → Build & Submit → Run** (submit = true). New `.aab` builds and lands in
Internal Testing.

> Rule of thumb: if it's only `.tsx`/JS/styles → OTA. If you touched `app.json` native
> config or added a native dependency → full build.

---

## Moving beyond testing (later)

- **Closed Testing**: in Play Console, promote the internal release to a Closed track and
  invite more testers. (If your Play account is personal and newly created, Google
  requires a 14-day closed test with 12+ testers before production — Internal testing,
  which you're using now, is exempt.)
- **Production**: promote to the Production track, complete the store listing
  (screenshots, description, data-safety form, privacy policy →
  `https://www.quranmentorglobal.com/privacy-policy`), and submit for review.

---

## Notes & honest limitations (POC scope)

- **Screens included**: login, signup, and for each role a dashboard + core lists
  (browse teachers, bookings, children, profile). Deeper flows (booking a lesson,
  payments, messaging, video) still live on the website for now — we add them natively
  in later passes.
- **Signup email confirmation**: if Supabase email confirmation is on, new users confirm
  via the email link (opens the website), then sign in on the app. Native deep-link
  confirmation is a later enhancement.
- **iOS**: the project is iOS-ready, but Apple needs a paid Apple Developer account +
  TestFlight. This guide covers Android/Play, your current target.

---

## Local verification already done

- `tsc --noEmit` → **EXIT 0** (full type safety)
- `expo export --platform android` → **bundles clean** (all routes/imports resolve)

If a cloud build ever fails, open the EAS build logs from the Actions run link — the
error is almost always a missing secret or an unreplaced `REPLACE_…` placeholder.
