# UI + currency fixes — COMPLETE (supersedes ui-currency-fixes-batch)
Upload all 6. JS-only → OTA. Run `npx tsc --noEmit` first.

## Courses screen — root causes found from your screenshots
1. **Active tab showed BLANK/white (not gradient).** The active tile wrapped its
   content in a LinearGradient that collapsed to zero height — so the active tab
   (Completed in your shot, Recorded in the other) rendered invisible, which ALSO
   left the empty gap that made the grid look jagged. Rebuilt the tile: the
   gradient is now an absolute-fill layer behind the content over a min-height
   tile, so it CANNOT collapse. (student + parent)
2. **Tabs now match web layout & sizing:** icon left · label centered · count
   right, all tiles equal height (clean 2×2 + full-width Completed). (student + parent)
3. **Stat cards (Enrolled / In Progress / Completed) looked like distorted nested
   boxes.** Cause: a translucent tint + drop-shadow elevation composites badly on
   Android. Removed the shadow → flat tinted cards like web. (student)

## Also (from the first review)
4. AI "Find my best match" no longer overflows off-screen (column, not row).
5. Teacher prices in wrong currency (AED): profile saves now invalidate the
   display-currency cache → after Save, prices re-resolve to your country's
   currency without an app restart. (student + teacher profiles)
6. Page titles centered on every screen, all roles.

## Still open
- Parent courses still lacks the top 3-stat row that student has (needs a small
  data add) — tell me if you want it added for full parity.
- The teacher-side pages you mentioned — please share those screenshots.
