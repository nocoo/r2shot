# Testing R2Shot

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

Screenshots, captured JPEGs, and `chrome-extension.json` are written to `dist/verification/`. The report includes Chrome/version information and SHA-256 hashes of the installed runtime files. A build clears `dist/`, so run browser tests after building. A failed run exits nonzero and removes the preceding success report.

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `EXTENSION_PATH` | An unpacked build to test; defaults to `dist/` and must match the current manifest/package version |
| `PUPPETEER_EXECUTABLE_PATH` | Existing Chrome executable; otherwise Puppeteer uses its installed browser |
| `E2E_OUTPUT_DIR` | Evidence directory; defaults to `dist/verification/` |
| `E2E_PACKAGE_PATH` | Also record the SHA-256 of the ZIP from which the tested extension was extracted |

The material generator delegates to this same suite through `scripts/materials/test-extension.cjs`, preserving its screenshots and archive checksum without maintaining a second test implementation.

## Package and manual acceptance

`bun run build:zip` prepares `dist/r2shot-<version>.zip`. Extract it into a separate directory and use **Load unpacked** at `chrome://extensions/`. Automated checks do not mark the following steps as accepted:

- [ ] Load existing saved R2 configuration and confirm the bucket, domain, quality, capture limit, and theme survive the upgrade.
- [ ] Use your scoped R2 credentials to test the connection and save settings. Capture a normal page, copy its URL, and open the public image through your CDN.
- [ ] Capture a long page with Full Page while keeping the tab active. Check image completeness, the configured height limit, and restored scroll position.
- [ ] Exercise Chrome's actual toolbar, native clipboard permissions, invalid credentials, and browser internal pages.
- [ ] Check light/dark/system themes, keyboard focus, translated labels, and settings after reopening Chrome.

Report the browser version, ZIP SHA-256, reproduction steps, and expected/actual behavior. Keep credentials out of reports. Packaging and tests do not publish a GitHub release or submit to the Chrome Web Store.
