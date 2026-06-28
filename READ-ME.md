# Parent role fixes — children loading (CRITICAL) + Billing rebuild
JS-only → OTA. Run `npx tsc --noEmit` first.

## 1. CRITICAL: children weren't loading on mobile (web showed 3, app showed 0)
`fetchChildren` queried the WRONG column: it selected `student_id` from the
`parent_children` table, but the column is `child_id` (the insert in the same file
and all of web use `child_id`). So it always returned zero children — which is why
My Children, Attendance, Progress, the dashboard's Children's Progress, AND Billing
totals were all empty on mobile while web showed everything.

Fixed in `lib/db.ts` → `fetchChildren` now selects `child_id`. Because the shared
parent context (parentChild.tsx) and every parent screen use this helper, this one
fix restores children across My Children, Attendance, Progress, Dashboard and Billing.

## 2. Parent Billing rebuilt to match web (`app/parent/billing.tsx`)
Was a basic Total-Spent/Payments/Refunds page. Now mirrors web:
- "FAMILY ACCOUNT" header
- Tabs: Overview · By Child · Invoices · History
- Overview: KPI cards (Total Spent, This Month, Active Plans, Monthly Total),
  Refunds card, and a 6-month Monthly Spend bar chart (OTA-safe Views, no native lib)
- By Child: per-child cards (active plans, total spent, Browse teachers)
- Invoices / History: transaction lists with child badges + amounts
`fetchParentBilling` in lib/db.ts was extended to compute this-month, monthly
series, active plans, monthly total, and the per-child breakdown.

## Still to do (next batch)
- Parent DASHBOARD parity: after this fix the existing sections populate with your
  children, but web has extra sections mobile lacks — KPI cards (Recorded Courses /
  Live Courses / Upcoming / Spend This Month) and the "Attendance by Child" donut.
  I'll add those next.
