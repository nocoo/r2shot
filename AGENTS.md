# R2Shot

Chrome extension that captures pages, uploads JPEGs to the user's R2 bucket and copies share links.
Profile: ts-worker-web (browser extension; no Worker backend).
Human overview: [README.md](README.md). Direction: [design archive](docs/design/README.md). Frameworks must preserve this handbook.

## Sources of Truth

This file is the quality contract; hooks, CI and config are enforcement. Close implementation gaps without lowering the contract. Historical test results are not evidence of a current passing run. Maintain this root `AGENTS.md` as the only project handbook; do not create a `CLAUDE.md` alias, copy or import.

| Fact | Where |
|---|---|
| Human / acceptance docs | [README.md](README.md), [acceptance guide](TESTING.md), [PRIVACY.md](PRIVACY.md) |
| Version authority | `public/manifest.json`; synchronize `package.json` in the same commit |
| Runtime version | `src/shared/version.ts` reads Chrome's manifest |
| Enforcement | `.husky`, Vitest configs, `tsconfig.json`, Biome and CI |
| Release / campaign detail | [release and materials](docs/01-release-materials.md) |
| Accidents | [Retrospective.md](Retrospective.md) |
| Machine workflow | global `AGENTS.md` and Git rules |

## Project Invariants

- Preserve Manifest V3 behavior and Chrome 123+ support; dev is a watch build, not a web server.
- R2 credentials stay in the user's `chrome.storage.local`; never commit or log them. Use bucket-scoped access and report real upload/CDN results honestly.
- Preserve full-page limits (32 million pixels and 32,767 per side), active-tab ownership and scroll restoration.
- Version storage/config-breaking changes as major, user features/i18n/UI as minor, and behavior-preserving fixes as patch; use annotated tags.
- Generate materials only from this repository. Editable inputs are `materials/source/`, versioned outputs `materials/<version>/`; keep generated unpacked packages out of Git.
- Preserve original logos and historical approved/concept HTML in `docs/design/`; manual user acceptance must not be invented.

## Stack / Layout

| Component | Path / choice |
|---|---|
| Browser UI / handlers | `src/popup`, `src/settings`, `src/background` |
| Capture / storage / signing | `src/core`, TypeScript |
| Build / tests | Vite, Bun, Vitest, jsdom, Puppeteer |
| Public / materials | `public`, `materials`, `scripts/materials` |

## Commands

Run from root with Bun, a Node version allowed by `package.json` engines, Chrome, and Bash/zip for release packages. Test fixtures use fake credentials; live bucket testing needs separately configured real credentials and explicit acceptance scope.

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run build
bun run test:coverage
bun run test:integration
bun run test:e2e
bun run materials:check
bun run build:zip
```

## Verification

6DQ = L1/L2/L3 + G2 + D1 (test isolation); the former G1 dimension was merged into L1 on 2026-09-21. Status: `enforced`, `planned`, `manual`, or `N/A`; partial enforcement below does not certify the full required bar.
L1 requires statements, branches, functions and lines each ≥95%, with no skipped/focused tests; preserve any stricter package threshold. Native tools must identify unmeasured metrics as gaps. L1 also includes check-only strict types and analysis/formatting with zero errors/warnings (the former G1 contract). G2 requires dependency and secret scans, with missing required scanners failing.

| Dimension | Status | Required proof and current evidence/gap |
|---|---|---|
| L1 TypeScript | planned | Installed pre-commit already runs the staged index snapshot through typecheck, Biome with warnings as errors, and Vitest coverage with all four thresholds at 95%; focused, skipped, and empty runs fail, and background listener registration stays excluded from V8 and is checked by Chrome E2E. CI builds with `tsc --noEmit`. Full unified L1 stays planned: <30s timing measurement and isolated rejection proof remain unverified. |
| L2 capture/upload | planned | CI runs `bun run test:integration` (`tests/workflow.test.ts` and the Vitest selection guard). It exercises real application modules with mocked fetch/Chrome APIs; this is not real HTTP against storage. |
| L3 Chrome UI | manual | CI runs `bun run test:e2e` in an isolated Chrome profile with intercepted R2 responses. Live bucket, CDN, and user acceptance remain manual. |
| G2 | enforced | Shared CI scans secrets/dependencies; hooks call gitleaks and OSV. |
| D1 | planned | Unit/in-process tests reset fake stores; complete per-run browser/local-storage isolation and destructive-fixture guards are not an automated gate. |

Husky 9 is installed with `prepare` set to `husky`. Git runs `.husky/_`, and that shim runs the tracked hooks. Pre-commit checks the staged index: typecheck, Biome with warnings as errors, and Vitest coverage at the existing 95% floors. `gitleaks --staged` reads the original index before Git's hook environment is removed. `set -e` stops on the first failed command. Pre-push still runs build, coverage, lint, and OSV on the worktree.

Target hooks remain: pre-commit checks unified L1 (types, check-only lint, coverage) against the index snapshot (`git checkout-index`) in <30s; pre-push checks L2 and G2 in parallel against every stdin push ref/commit in <3min, plus build where applicable. The index snapshot is installed; the <30s measurement and the pre-push stdin-ref checks are still open. L3 runs in CI or an explicit manual lane.
Never bypass commit/push hooks, force-push, or use autofix in checks. Documentation changes do not authorize deploying or implementing new gates.

## Resources / Isolation

Use a dedicated Chrome test profile and local/test-owned storage for automated workflows. Never run acceptance against everyday saved credentials or report mocked fetches as live uploads. No remote Worker test resources are needed.

## Operations / Release

Follow [release/material procedures](docs/01-release-materials.md): synchronize versions/changelog, build versioned ZIPs, use annotated version tags and attach the tested package to an authorized release. Notify the user when manual acceptance can begin; preserve actual verification status.

## Retrospective

Move accident narratives to [Retrospective.md](Retrospective.md); keep at most about ten concise recurring project rules here. Put architecture and operational detail in linked docs.

- A successful HeadBucket check does not prove the public CDN URL works.
- Every repository owns and validates its own design/submission deliverables.
