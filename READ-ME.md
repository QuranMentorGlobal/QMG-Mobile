# AI features + www domain fix (upload all)

You hadn't applied the AI batch yet, so this package contains BOTH the AI features
and the domain fix in one go. Upload all 10 files. JS-only — ships over OTA.

## Critical: domain switched to www.muddarris.com
Your API and site live on `www.muddarris.com`; the no-www apex (`muddarris.com`) is
parked at Hostinger. Every `https://muddarris.com` reference (API + links + banner
images) was hitting the parking page. All are now `https://www.muddarris.com`:
- `lib/db.ts` — API_BASE (fixes ALL backend calls: AI, payments, checkout-quote, eligibility)
- `components/dashboard.tsx` — dashboard banner image URLs
- `components/TeacherProfileScreen.tsx` — public-profile preview link
- `app/teacher/help.tsx`, `courses.tsx`, `earnings.tsx` — web links

This reverses the earlier "no-www canonical" rule, but it has to match where your
API actually lives. Long-term fix: point the apex `muddarris.com` DNS at your app
host (same target as `www`) and remove Hostinger parking — then you could move back
to no-www if you want.

## AI features (now functional — /api/ai/* on Groq, gated by /api/ai/status)
- `components/TeachersScreen.tsx` — "Find my best match" questionnaire → recommend-teachers
- `components/AIImprove.tsx` (NEW) + `TeacherProfileScreen.tsx` — Bio/Welcome "Improve with AI"
- `components/SupportScreen.tsx` — "Get an instant answer" support assistant
- `lib/db.ts` — aiStatus / aiRecommendTeachers / aiImproveText / aiSupportAssistant helpers

## Also in this batch
- `app/student/lessons.tsx` — 15-minute join gate (matches teacher/parent + web)

Run `npx tsc --noEmit` before deploying.
