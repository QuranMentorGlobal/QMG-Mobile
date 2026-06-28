# UI + currency fixes (batch 1 of the screenshot review)

JS-only — OTA. Run `npx tsc --noEmit` first.

## Fixed
1. **AI "Find my best match" overflowed off-screen** (components/TeachersScreen.tsx)
   The card was `flexDirection:'row'`, so when expanded the form sat BESIDE the
   header and ran off the right edge. Now a column — form stacks full-width below.

2. **All teacher prices showed in AED even after changing country to UK**
   (components/StudentProfile.tsx + TeacherProfileScreen.tsx)
   Root cause: the display-currency is cached once per app session; saving a new
   country never invalidated that cache, so it stayed on the old currency (AED)
   until an app restart. Both profile saves now call `resetDisplayCurrency()`.
   → After uploading: open Profile, make sure country = your country, tap Save.
     Prices re-resolve to your currency (UK → GBP) without a restart.

3. **Page titles now centered on every screen, all roles** (components/ui.tsx)
   PageTitle was left-aligned; now centered (Teachers/Courses already used custom
   centered headers, so those were fine — this fixes Support/Billing/Lessons/etc.).

4. **Course category tabs equal size** (app/student/courses.tsx + app/parent/courses.tsx)
   Tiles wrapped to uneven heights ("Recorded Courses" = 2 lines). Added a fixed
   min-height so 1-line and 2-line tiles match → clean 2×2 grid. Active tab already
   renders the green→gold gradient in both (unchanged).

## Still need from you (couldn't reproduce from code / need specifics)
- "Active tab becomes white": in the code, active = gradient in BOTH student and
  parent. I couldn't find a white-active path — which screen/state shows it white?
- "Course cards distorted": which part looks distorted (the green banner height,
  the icon, a real banner image stretching)? A close-up helps.
- "Parent courses should match student": they're already the same TabTile + card
  structure (parent just adds child badges + child switcher). What specifically
  differs that you want changed?
- Teacher pages not matching web — please share those screenshots.
