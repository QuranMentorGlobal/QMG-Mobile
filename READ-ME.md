# Banner green-flash fix (components/dashboard.tsx)
JS-only → OTA.

Cause: each banner showed the REMOTE web image over a charcoal→forest→gold gradient.
On a cold start the remote images aren't cached, so while each next one downloaded
(~1s) the green gradient showed through — the "green blink". After one full cycle the
images were cached, so it went smooth.

Fix:
1. The BUNDLED photo (already shipped in the app) now renders as an instant base layer,
   so there is never green between slides — a real photo always shows immediately.
2. The web image overlays the bundled one once it loads (still lets you update banners
   from the website without an app release); if it fails, the bundled photo stays.
3. All banner URLs are prefetched on mount to warm the cache, so even the web overlay
   appears without a wait on the first cycle.
