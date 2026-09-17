# R2Shot

Chrome extension that captures pages, uploads JPEGs to the user's R2 bucket and copies share links.
Profile: ts-worker-web (browser extension; no Worker backend).
Direction: [design archive](docs/design/README.md). Frameworks must preserve this handbook.

## Sources of Truth

This file is the quality contract; hooks, CI and config are enforcement. Close implementation gaps without lowering the contract. Historical test results are not evidence of a current passing run.

| Fact | Where |
|---|---|
| Human / acceptance docs | [README.md](README.md), [acceptance guide](materials/2.0.0/TESTING.md), [PRIVACY.md](PRIVACY.md) |
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
| Build / tests | Vite, Bun, Vitest, happy-dom, Chrome extension harness |
| Public / materials | `public`, `materials`, `scripts/materials` |

## Commands

Run from root with Bun, Node 22.12+, Chrome, and Bash/zip for release packages. Test fixtures use fake credentials; live bucket testing needs separately configured real credentials and explicit acceptance scope.

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run build
bun run test:coverage
bun run test:e2e
bun run materials:check
bun run build:zip
```

## Verification

6DQ = L1/L2/L3 + G1/G2 + D1 (test isolation). Status: `enforced`, `planned`, `manual`, or `N/A`; partial enforcement below does not certify the full required bar.
L1 requires statements, branches, functions and lines each ≥95%, with no skipped/focused tests; preserve any stricter package threshold. Native tools must identify unmeasured metrics as gaps.
G1 requires check-only strict analysis/formatting with zero errors/warnings. G2 requires dependency and secret scans, with missing required scanners failing.

| Dimension | Status | Required proof and current evidence/gap |
|---|---|---|
| L1 TypeScript | enforced | CI/pre-push run Vitest coverage with all four thresholds at 95%; background listener registration is excluded and needs browser coverage. |
| L2 capture/upload | planned | `e2e/workflow.test.ts` exercises real application modules but mocks fetch/Chrome APIs; this is not real HTTP against local storage. |
| L3 Chrome UI | manual | Use the versioned materials acceptance guide and extension harness for capture, popup, settings and permissions; real R2/CDN/user acceptance is separate. |
| G1 TypeScript | enforced | CI builds with `tsc --noEmit` and runs Biome with errors on warnings. |
| G2 | enforced | Shared CI scans secrets/dependencies; hooks call gitleaks and OSV. |
| D1 | planned | Unit/in-process tests reset fake stores; complete per-run browser/local-storage isolation and destructive-fixture guards are not an automated gate. |

Local hooks use `.husky` directly: pre-commit types/lint/tests/staged gitleaks; pre-push build/coverage/lint/OSV. These scripts lack fail-fast protection between separate commands, so CI remains necessary. They use the working tree, not index/pushed refs.

Target hooks: pre-commit checks G1 + L1 against the index snapshot (`git checkout-index`) in <30s; pre-push checks L2 and G2 in parallel against every stdin push ref/commit in <3min, plus build where applicable. L3 runs in CI or an explicit manual lane.
Never bypass commit/push hooks, force-push, or use autofix in checks. Documentation changes do not authorize deploying or implementing new gates.

## Resources / Isolation

Use a dedicated Chrome test profile and local/test-owned storage for automated workflows. Never run acceptance against everyday saved credentials or report mocked fetches as live uploads. No remote Worker test resources are needed.

## Operations / Release

Follow [release/material procedures](docs/01-release-materials.md): synchronize versions/changelog, build versioned ZIPs, use annotated version tags and attach the tested package to an authorized release. Notify the user when manual acceptance can begin; preserve actual verification status.

## Retrospective

Move accident narratives to [Retrospective.md](Retrospective.md); keep at most about ten concise recurring project rules here. Put architecture and operational detail in linked docs.

- A successful HeadBucket check does not prove the public CDN URL works.
- Every repository owns and validates its own design/submission deliverables.
