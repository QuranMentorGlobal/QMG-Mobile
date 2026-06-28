# Audit loose ends — attendance email (#6) + mark-lesson-live (#2 minor)

JS-only — ships over OTA. Run `npx tsc --noEmit` first.

## #6 — attendance email fan-out (was the real gap)
Mobile already sent IN-APP notifications to student + parents on every mark; what
was missing vs web was the EMAIL fan-out for the meaningful statuses.
- `lib/attendanceActions.ts` — recordAttendance now POSTs to
  `${API_BASE}/api/attendance/notify` for absent/late/excused (fire-and-forget),
  exactly like web's src/lib/attendance.ts. Added optional `courseTitle` to opts.
- `app/teacher/attendance.tsx` — passes `courseTitle` from the row into the mark.
(Note: `attendance/remind` is a server cron, not a UI feature — correctly N/A on mobile.)

## #2 minor — teacher marks lesson live on join
Web sets `lessons.status='live'` when the TEACHER joins (teacher only). Mobile opened
the room without it.
- `lib/lessonsActions.ts` — added `bookingId` to the Session type + a
  `markLessonLive(bookingId)` helper (updates lessons.status='live' by booking).
- `app/teacher/lessons.tsx` — the teacher Join now calls markLessonLive before
  opening the room. Student/parent joins do NOT mark live (matches web).

This closes every item from the web-vs-mobile audit.
