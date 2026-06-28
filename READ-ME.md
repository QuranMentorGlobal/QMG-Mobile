# ONE consolidated batch — upload ALL of these together
JS-only → OTA. Run `npx tsc --noEmit` after. 33 files.

This single batch contains every change from all prior batches so nothing is missed.
Upload everything. Pay special attention to the 8 NEW files below — they don't exist
in the repo yet, so you must CREATE them in GitHub (same folder/path shown). If a NEW
file is skipped, the page that imports it (e.g. the parent profile) silently won't work.

## ⚠️ NEW FILES — must be CREATED in GitHub (these are why things "didn't work")
- lib/parentProfileActions.ts        ← parent profile data layer
- components/ParentProfile.tsx        ← the full parent profile page
- lib/help/content.ts
- components/HelpCenter.tsx
- components/AIImprove.tsx
- app/student/help-center.tsx
- app/parent/help-center.tsx
- app/teacher/help-center.tsx

## The two you said were still broken
1. COURSES TAB — now actually fixed. The real bug was in the grid, not the tile:
   `tabGrid` had `justifyContent: space-between` AND `gap` together with 48.5%-wide
   tiles → 97% + gap overflowed the row, so a tile wrapped (the jagged/missing-tile
   look). Removed the conflicting `gap`. Fixed in app/student/courses.tsx and
   app/parent/courses.tsx. (Course-detail tabs were also rebuilt: app/student/course/[id].tsx.)
2. PARENT PROFILE — the code was correct; it just needs its NEW files (ParentProfile.tsx
   + parentProfileActions.ts) uploaded. They're in this batch. After upload, the parent
   profile shows the full page (cover, Children/Lessons/Bookings stats, About Your Family,
   Contact & Location, Account=Parent, Notifications, location, Hadith).

## Everything else included (already built earlier)
- Child filters removed (parent attendance/progress/lessons/courses/bookings)
- Parent nav: Dashboard · Children · Teachers · … (Teachers 3rd)
- Chat green space removed (components/ChatThread.tsx)
- Page titles centered (parent progress/lessons/bookings)
- Parent billing rebuild + parent dashboard KPI/attendance (app/parent/billing.tsx, dashboard.tsx; lib/db.ts)
- Banner green-flash fix (components/dashboard.tsx)
- AI matching/bio/support, Help Center, attendance email fan-out, www-domain fix,
  currency cache reset, fetchChildren child_id fix (lib/db.ts and related)

## Full file list (paths preserved)
lib/: db.ts, nav.ts, attendanceActions.ts, lessonsActions.ts, help/content.ts*, parentProfileActions.ts*
components/: TeachersScreen, AIImprove*, TeacherProfileScreen, SupportScreen, HelpCenter*, ChatThread, dashboard, ui, StudentProfile, ParentProfile*, ParentBookingsScreen
app/student/: courses, course/[id], lessons, help-center*
app/parent/: courses, billing, dashboard, profile, attendance, progress, lessons, help-center*
app/teacher/: help, courses, earnings, help-center*
(* = NEW file, must be created)
