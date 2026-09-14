# R2Shot 2.0.0 — Manual acceptance

Status: **ready for your test; manual acceptance pending**.

Use [r2shot-2.0.0.zip](r2shot-2.0.0.zip) or the generated `unpacked/` directory. In Chrome, open `chrome://extensions/`, enable Developer mode, and choose Load unpacked. The ZIP is the submitted artifact; `unpacked/` is its exact local extraction and is not checked into Git. A fresh clone can extract the ZIP or run `bun run materials`.

Minimum Chrome: 123. The interactive HTML uses demo data; test real requests and captures in the installed extension.

1. Enter your own R2 endpoint, bucket, scoped credentials, and working public domain. Test Connection and save.
2. Capture the visible area on an ordinary page. Click Copy URL and open that link to confirm the actual image is publicly accessible.
3. Capture a longer page with Full Page, keeping the tab active. Check image completeness, height limit, and restored scroll position.
4. Reopen settings and Chrome to confirm configuration. Check quality, themes, clipboard access, and an invalid-credentials failure.

Automated checks: 154 unit tests, the existing coverage gates, lint, repository E2E/workflow tests, and the production build passed. See [verification/build.json](verification/build.json) and its logs. Native clipboard interaction and real receiving services remain part of manual acceptance. R2 HTTP responses in the Chrome checks were simulated; no live R2 bucket or public CDN was used.

When reporting a result, include the Chrome version, tested ZIP SHA-256, reproduction steps, and expected/actual behavior. Keep credentials out of reports.

SHA-256: `8a5b3c8b62f68d0b31cb03058994624e7fe5af7e10b05a7f44088ff82226bd2e`
