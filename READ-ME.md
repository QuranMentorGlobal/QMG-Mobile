# Help Center (gap #5) — browsable articles on mobile

Web had a full Help Center (articles + categories); mobile had only the ticket form.
This ports it. JS-only — ships over OTA. Run `npx tsc --noEmit` first.

## New
- `lib/help/content.ts` — the shared knowledge base, copied VERBATIM from web
  (single source of truth: ROLE_HUBS, CATEGORIES, ~25 ARTICLES/role, search helpers).
  When you update help content on web, re-copy this one file to keep them identical.
- `components/HelpCenter.tsx` — the browser: search, popular, categories, and full
  article view (overview, numbered steps, FAQs, troubleshooting, related links).
- `app/{student,teacher,parent}/help-center.tsx` — role routes. Accept a `?slug=`
  param to deep-link an article.

## Changed
- `components/SupportScreen.tsx` — adds a "Browse the Help Center" entry, and
  RESTORES the AI support-assistant source links (each answer now links to the
  article it came from, opening it in the native Help Center).
  **Supersedes the SupportScreen.tsx in the ai-and-www-fix batch.**
- `app/teacher/help.tsx` — "Browse all help articles" now opens the native Help
  Center instead of the external website.

## Note
This matches web behavior. The article `icon` keys in content.ts reference web's
icon set and are simply ignored on mobile (cosmetic) — no mapping needed.
