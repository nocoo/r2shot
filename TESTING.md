# R2Shot 2.0.1 testing

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
| `bun run test:integration` | Only the 8 mocked workflows in `tests/workflow.test.ts` |
| `bun run build && bun run test:e2e` | Production extension in real headless Chrome |
| `bun run verify` | Frozen install, lint, typechecked production build, coverage, integration, then Chrome E2E |

Vitest defaults to Node. `src/ui.test.js` opts into jsdom, creates the shipped HTML before importing DOM modules, and resets modules and Chrome stubs between tests. The AWS SDK is only a signing reference in tests. The V8 report excludes the background listener registration; Chrome E2E exercises that listener separately and does not contribute to the V8 percentages.

CI retains the L2 integration job and adds L3 Chrome tests using Puppeteer's matching browser. Pre-commit runs typechecking, lint, coverage gates, and the existing secret scan. Hook scripts stop on the first failed check.

## Chrome extension suite

`tests/e2e/extension.e2e.cjs` copies the production build to a temporary directory, installs it in a fresh browser, and opens the actual toolbar popup with Chrome's extension debugging protocol. This exercises the shipped MV3 worker without adding test exports or a worker driver. The temporary extension and browser profile are removed after the run.

The suite checks settings validation and persistence, an unsaved signed connection test, visible JPEG capture and its uploaded bytes, full-page dimensions and scroll restoration, failed upload and retry, clipboard feedback, responsive settings, and light/dark themes. R2 HTTP responses are intercepted with synthetic credentials; clipboard success and rejection use stubs. This verifies local capture, signing, and UI behavior. A live bucket, CDN, and native clipboard still require manual acceptance.

Screenshots, captured JPEGs, and `chrome-extension.json` are written to `dist/verification/`. The report includes Chrome/version information and SHA-256 hashes of the installed runtime files. A build clears `dist/`, so run browser tests after building. Each run clears its preceding report and five images; a new success report is written only after cleanup completes. A failed run exits nonzero.

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `EXTENSION_PATH` | An unpacked build to test; defaults to `dist/` and must match the current manifest/package version |
| `PUPPETEER_EXECUTABLE_PATH` | Existing Chrome executable; otherwise Puppeteer uses its installed browser |
| `E2E_OUTPUT_DIR` | Evidence directory; defaults to `dist/verification/` |
| `E2E_PACKAGE_PATH` | Also record the SHA-256 of the ZIP from which the tested extension was extracted |

The material generator delegates to this same suite through `scripts/materials/test-extension.cjs`, preserving its screenshots and archive checksum without maintaining a second test implementation.

## Prepared candidate — 2026-09-16

`dist/r2shot-2.0.1.zip` is 70,904 bytes and contains 24 runtime files. The Chrome suite passed against an extraction of this ZIP, and every tested runtime hash matches the archive. The manifest only changes its version; Chrome 123 remains the minimum. No test sources, worker hooks, synthetic credentials, dev icons, or source maps are packaged.

SHA-256 of this local archive:

```text
cc8f5c3a7079e4536f89756fba61bb124b1d319bbf058a568cb064337c629ca5
```

Validation passed: frozen install, lint, typechecking, production build, 154 unit/DOM tests, 8 integration tests, and 7 Chrome scenarios. Coverage is 99.75% statements, 99.10% branches, 100% functions, and 99.74% lines. Failed preflight, failed Git-hook gates, and an injected browser cleanup failure were checked as well. Bun audit and OSV found no dependency vulnerabilities in R2Shot.

These checks ran locally on macOS with Bun 1.4.0, Node 26.8.1, and Chrome for Testing 153.0.8010.36. Remote CI has been configured but has not been run. The archive checks, Chrome report, logs, screenshots, and checksum are in `dist/verification/`. The two-project dependency findings are in [the dependency review](docs/dependency-review-2026-09-16.md).

## Package and manual acceptance

`bun run build:zip` prepares `dist/r2shot-2.0.1.zip`. Extract it into a separate directory and use **Load unpacked** at `chrome://extensions/`. Automated checks do not mark the following steps as accepted:

- [ ] Load existing saved R2 configuration and confirm the bucket, domain, quality, capture limit, and theme survive the upgrade.
- [ ] Use your scoped R2 credentials to test the connection and save settings. Capture a normal page, copy its URL, and open the public image through your CDN.
- [ ] Capture a long page with Full Page while keeping the tab active. Check image completeness, the configured height limit, and restored scroll position.
- [ ] Exercise Chrome's actual toolbar, native clipboard permissions, invalid credentials, and browser internal pages.
- [ ] Check light/dark/system themes, keyboard focus, translated labels, and settings after reopening Chrome.

Report the browser version, ZIP SHA-256, reproduction steps, and expected/actual behavior. Keep credentials out of reports. Packaging and tests do not publish a GitHub release or submit to the Chrome Web Store.
