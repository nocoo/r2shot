# R2Shot 2.0.3 testing

The locally prepared ZIP is ready for manual acceptance. It has not been tagged, pushed, or published.

The test framework follows Hooky's current Vitest + jsdom + Puppeteer setup. R2Shot keeps its TypeScript build and Biome linting. Historical 2.0.0 design and store materials remain in `materials/2.0.0/`.

## Automated checks

Use a Node version supported by `package.json` (22.22.2+ on 22.x, 24.15+ on 24.x, or 26+), Bun, and Chrome:

```sh
bun install --frozen-lockfile
bunx puppeteer browsers install chrome
bun run verify
```

To use an existing Chrome instead of downloading one, set `PUPPETEER_EXECUTABLE_PATH` to its executable. The browser suite never uses your normal Chrome profile.

| Command | What it checks |
| --- | --- |
| `bun run test` | Unit tests and shipped popup/settings DOM |
| `bun run test:coverage` | The same tests with 95% gates for statements, branches, functions, and lines |
| `bun run test:integration` | Mocked workflows in `tests/workflow.test.ts` and the Vitest selection guard |
| `bun run build && bun run test:e2e` | Production extension in real headless Chrome |
| `bun run verify` | Frozen install, lint, typechecked production build, coverage, integration, then Chrome E2E |

Vitest defaults to Node. `src/ui.test.js` opts into jsdom, creates the shipped HTML before importing DOM modules, and resets modules and Chrome stubs between tests. The AWS SDK is only a signing reference in tests. The V8 report excludes the background listener registration; Chrome E2E exercises that listener separately and does not contribute to the V8 percentages.

CI retains the L2 integration job and adds L3 Chrome tests using Puppeteer's matching browser. Pre-commit is Husky 9 and checks the staged index with typecheck, lint, coverage gates, and the secret scan. Vitest rejects skipped, focused, and empty runs. The hook stops on the first failed check.

## Chrome extension suite

`tests/e2e/extension.e2e.cjs` copies the production build to a temporary directory, installs it in a fresh browser, and opens the actual toolbar popup with Chrome's extension debugging protocol. This exercises the shipped MV3 worker without adding test exports or a worker driver. The temporary extension and browser profile are removed after the run.

The suite checks settings validation and persistence, an unsaved signed connection test, visible JPEG capture and its uploaded bytes, full-page dimensions and scroll restoration, failed upload and retry, clipboard feedback, responsive settings, and light/dark themes. Scroll-container regressions also check the actual image pixels across the page, a single header and footer, hidden panels, the height limit, and 2× pixel density. R2 HTTP responses are intercepted with synthetic credentials; clipboard success and rejection use stubs. This verifies local capture, signing, and UI behavior. A live bucket, CDN, and native clipboard still require manual acceptance.

Oversized-page regressions capture a 1920 × 1080 viewport at 2× pixel density and a 40,005 CSS-pixel page. They verify bounded output dimensions, proportional scaling, actual content throughout the image including the last section, a single upload, and restored scroll position.

Screenshots, captured JPEGs, and `chrome-extension.json` are written to `dist/verification/`. The report includes Chrome/version information and SHA-256 hashes of the installed runtime files. A build clears `dist/`, so run browser tests after building. Each run clears its preceding report and captured images; a new success report is written only after cleanup completes. A failed run exits nonzero.

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `EXTENSION_PATH` | An unpacked build to test; defaults to `dist/` and must match the current manifest/package version |
| `PUPPETEER_EXECUTABLE_PATH` | Existing Chrome executable; otherwise Puppeteer uses its installed browser |
| `E2E_OUTPUT_DIR` | Evidence directory; defaults to `dist/verification/` |
| `E2E_PACKAGE_PATH` | Also record the SHA-256 of the ZIP from which the tested extension was extracted |

The material generator delegates to this same suite through `scripts/materials/test-extension.cjs`, preserving its screenshots and archive checksum without maintaining a second test implementation.

## Prepared candidate — 2.0.3, 2026-09-17

`dist/unpacked/` is ready to load in Chrome. It is an exact extraction of `dist/r2shot-2.0.3.zip`, which is 71,416 bytes and contains 24 runtime files. The Chrome suite passed against this unpacked candidate, and every tested runtime hash matches the archive.

This candidate fixes the "Page exceeds the safe image size" error on high-DPI and long pages. Oversized images are scaled to fit the canvas limits while retaining all page content within the configured capture limit. The two oversized Chrome fixtures produced complete 3503 × 9133 and 655 × 32767 JPEGs. The scrolling-container and bitmap source-scale fixes from 2.0.2 are retained.

SHA-256 of this local archive:

```text
e9a0f0c88aed0d9aa5f655d0b177b365ebc749b83c9fd65e1e770ca5d051d96d
```

Validation passed: frozen install, lint, typechecking, production build, 160 unit/DOM tests, 8 integration tests, and 11 Chrome scenarios. Coverage is 99.76% statements, 99.13% branches, 100% functions, and 99.75% lines.

These checks ran locally on macOS with Bun 1.4.0 and Chrome for Testing 153.0.8010.36. The package metadata, Chrome report, captured images, and checksum are in `dist/verification/`. Live R2/CDN and user acceptance remain pending.

## Package and manual acceptance

Use **Load unpacked** at `chrome://extensions/` and select `dist/unpacked/`, or click **Reload** if that directory is already loaded. Confirm the version is 2.0.3. To reproduce the package, run `bun run build:zip` and extract `dist/r2shot-2.0.3.zip` into a separate directory. Automated checks do not mark the following steps as accepted:

- [ ] Load existing saved R2 configuration and confirm the bucket, domain, quality, capture limit, and theme survive the upgrade.
- [ ] Use your scoped R2 credentials to test the connection and save settings. Capture a normal page, copy its URL, and open the public image through your CDN.
- [ ] Capture a long page with Full Page while keeping the tab active. Check image completeness, the configured height limit, and restored scroll position.
- [ ] Repeat on the page that previously stayed at the first screen; confirm its inner content now scrolls and the uploaded image includes the content below the viewport.
- [ ] Repeat a capture that previously reported "Page exceeds the safe image size" with the same capture settings. Check that it uploads successfully and retains the last section within the configured limit.
- [ ] Exercise Chrome's actual toolbar, native clipboard permissions, invalid credentials, and browser internal pages.
- [ ] Check light/dark/system themes, keyboard focus, translated labels, and settings after reopening Chrome.

Report the browser version, ZIP SHA-256, reproduction steps, and expected/actual behavior. Keep credentials out of reports. Packaging and tests do not publish a GitHub release or submit to the Chrome Web Store.
