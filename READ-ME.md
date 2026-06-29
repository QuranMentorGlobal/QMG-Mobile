# Real fixes: parent nav order + courses active-tab gradient
4 files. JS-only (deployable via OTA, or include in your next build & submit).
Run `npx tsc --noEmit`.

## Why the last attempt did nothing — two wrong spots, now corrected
1. PARENT NAV (lib/nav.ts): the drawer renders the FLAT `parentNav` array, but my
   earlier change was in `navSectionsForRole` (a grouped list the shell doesn't use).
   Fixed the real array — order is now Dashboard · Children · Teachers · Bookings ·
   Courses · Lessons · Attendance · Progress · Billing · Messages · Support · Profile.

2. COURSES ACTIVE TAB (app/student/courses.tsx, app/parent/courses.tsx): the active
   tile painted its green gradient with `StyleSheet.absoluteFill`, which renders with
   zero size on your Hermes/new-architecture build — so the active tile came out
   transparent (looked blank/missing). Rewritten so the gradient IS the content box
   (its own padding + minHeight), which always has real dimensions. The active tab now
   shows the green→gold gradient and the grid stays aligned. Same fix applied to the
   course-detail tabs (app/student/course/[id].tsx).

If you can publish OTA, these go live without a store submission. If OTA isn't wired
yet, include them in your next build & submit.
