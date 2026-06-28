# Parent role — children fix + Billing + Dashboard (COMPLETE)
Supersedes parent-children-billing-fix. Upload all 3. JS-only → OTA. Run `npx tsc --noEmit`.

## 1. CRITICAL: children now load (was the root cause of every empty parent screen)
`fetchChildren` selected `student_id` from `parent_children`; the column is `child_id`.
Fixed → your 3 children now populate My Children, Attendance, Progress, Dashboard,
and Billing.

## 2. Billing rebuilt to match web (app/parent/billing.tsx)
FAMILY ACCOUNT header · Overview / By Child / Invoices / History tabs · KPI cards
(Total Spent, This Month, Active Plans, Monthly Total) · Refunds · 6-month Monthly
Spend chart · per-child plans · transaction history. (fetchParentBilling extended.)

## 3. Dashboard — added the missing web sections (app/parent/dashboard.tsx)
- "Attendance by Child": overall donut + per-child rate bars
- KPI cards: Recorded Courses · Live Courses · Upcoming Lessons · Spend This Month
  — counts are COMBINED across all children, matching your web view.
`fetchParentDash` now actually computes recorded/live counts, spend-this-month, and
per-child attendance (these were previously hardcoded to 0).

Note: per your plan, these are side-by-side parity fixes against the current web.
When the web is finalized and you send the final repo, we'll do the full pass.
