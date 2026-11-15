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

Quality follows `system1-quality` (v1.3.0) with 12 canonical slots (`impl`, `todo`, `na`) and `nocoo/base-ci` v2026.15 (`777bbe4f9bacab8a91d8c01974480a6ee23d28e0`) in native mode (`quality-slots.yml`).

| Slot | Status | Required proof and current evidence/gap |
|---|---|---|
| S1: Types | enforced (`impl`) | `bun run typecheck` (`tsc --noEmit`) in pre-commit index snapshot & CI `s1-types`. |
| S2: Lint | enforced (`impl`) | `bun run lint` (`biome check . --error-on-warnings`) in pre-commit index snapshot & CI `s2-lint`. |
| S3: Workflow | enforced (`impl`) | `actionlint` + 40-char SHA pinning in CI `s3-workflow`. |
| G1: Secrets | enforced (`impl`) | `gitleaks protect --staged` in pre-commit; `gitleaks dir . --config .gitleaks.toml` in CI `g1-secrets`. |
| G2: Dependencies | enforced (`impl`) | `osv-scanner` (`osv-scanner.toml`, `bun.lock`) in pre-push & CI `g2-dependencies`. |
| B1: Build | enforced (`impl`) | `bun run build` (`tsc --noEmit && vite build`) in pre-push & CI `b1-build`. |
| L1: Unit | enforced (`impl`) | Vitest coverage (`>=95%` statements/branches/functions/lines) + `node ./scripts/l1-coverage-guard.cjs`; repeatable gate self-test `bun run test:l1-gate` runs as blocking CI job `precommit-gate` (`Pre-commit gate self-test`). |
| L2: Runtime | N/A (`na`) | Chrome extension without Cloudflare Worker / workerd runtime tests. |
| L3: Integration | enforced (`impl`) | CI runs `bun run test:integration` (`tests/workflow.test.ts`, mocked fetch/Chrome APIs). |
| L4: E2E | enforced (`impl`) | CI runs `bun run test:e2e` (Puppeteer isolated Chrome profile with intercepted R2 responses); live bucket/CDN acceptance remains manual. |
| P1: Package | N/A (`na`) | Private `package.json`; extension ZIP built via `bun run build:zip`. |
| Z1: Gate | enforced (`impl`) | Aggregates all `impl` slots + `precommit-gate` & SHA consistency (`quality / Z1: Gate`). |

Husky 9 is installed with `prepare` set to `husky`. Git runs `.husky/_`, and that shim runs the tracked hooks. Pre-commit checks the staged index: typecheck, Biome with warnings as errors, and Vitest coverage at the existing 95% floors. `gitleaks --staged` reads the original index before Git's hook environment is removed. `set -e` stops on the first failed command. Pre-push runs build, coverage, lint, and OSV on the worktree. CI runs `.github/workflows/ci.yml` -> `./.github/workflows/quality-slots.yml`, gated on `quality / Z1: Gate`.
Never bypass commit/push hooks, force-push, or use autofix in checks. Documentation changes do not authorize deploying or implementing new gates.

## Resources / Isolation

Use a dedicated Chrome test profile and local/test-owned storage for automated workflows. Never run acceptance against everyday saved credentials or report mocked fetches as live uploads. No remote Worker test resources are needed.

## Operations / Release

Follow [release/material procedures](docs/01-release-materials.md): synchronize versions/changelog, build versioned ZIPs, use annotated version tags and attach the tested package to an authorized release. Notify the user when manual acceptance can begin; preserve actual verification status.

## Retrospective

Move accident narratives to [Retrospective.md](Retrospective.md); keep at most about ten concise recurring project rules here. Put architecture and operational detail in linked docs.

- A successful HeadBucket check does not prove the public CDN URL works.
- Every repository owns and validates its own design/submission deliverables.
