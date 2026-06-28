# Batch: tabs, chat space, parent nav/filters, centering
JS-only → OTA. Run `npx tsc --noEmit`. Upload all.

1. COURSE DETAIL tabs (app/student/course/[id].tsx) — the Overview/Lessons/Progress/
   Resources/Certificate tabs had the old collapsing-gradient + a border-size mismatch
   (idle had a 1px border, active didn't) → "Progress" sat offset and the active tab
   went blank. Rebuilt: gradient is a full-bleed layer, idle & active are identical size.

2. COURSE LIST tabs (app/student/courses.tsx, app/parent/courses.tsx) — these already
   carry the bulletproof fix (active gradient can't collapse). Included so you have them
   if the earlier batch wasn't uploaded — this is the version that fixes the missing/
   white active tile.

3. CHAT green space (components/ChatThread.tsx) — the thread header added a second
   status-bar inset under the app header, creating the green gap. Removed it; the
   contact row now sits right under the greeting, giving more room for chat history.

4. PARENT NAV order (lib/nav.ts) — Teachers moved into MAIN as the 3rd item:
   Dashboard · Children · Teachers · Bookings · Courses · Lessons · Attendance.

5. CHILD FILTERS removed (parent attendance, progress, lessons, courses, bookings) —
   the ChildSwitcher pill row is gone; pages show combined data (the context default).

6. PAGE TITLES centered on the remaining parent pages (progress, lessons, bookings;
   attendance/courses were already centered).

## Still to do — flagged, not in this batch
PARENT PROFILE rebuild: it currently uses the bare shared ProfileScreen (read-only
email/country + notifications). Student & teacher profiles are full editable pages.
I'll rebuild the parent profile to match — it's a ~300-line page and I want to mirror
your web parent profile properly, so it's the next focused batch.
