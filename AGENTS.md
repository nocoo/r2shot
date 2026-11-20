# R2Shot

Manifest V3 Chrome extension (Chrome 123+, no Worker backend) that captures pages, uploads JPEGs to the user's Cloudflare R2 bucket, and copies share links.
Docs: [README.md](README.md) · [Acceptance](TESTING.md) · [Privacy](PRIVACY.md) · [Design](docs/design/README.md) · [Release & Materials](docs/01-release-materials.md) · [Retrospective](Retrospective.md)

Layout: `src/popup`, `src/settings`, `src/background` (UI & MV3 worker), `src/core` (capture, storage, R2 signing), `public/` (manifest/locales/icons), `materials/`, `scripts/materials/`. Stack: TypeScript, Vite, Bun, Vitest, jsdom, Puppeteer.

## Commands

Run from root with Bun, Node matching `package.json` `engines`, Chrome, and Bash/`zip` for release archives.

```sh
bun install --frozen-lockfile
bun run dev              # MV3 watch build (not a web server)
bun run typecheck        # S1 (tsc --noEmit)
bun run lint             # S2 (biome check --error-on-warnings)
bun run test:coverage    # L1 (>=95% statements/branches/functions/lines)
bun run test:l1-gate     # pre-commit gate self-test (blocking CI job)
bun run test:integration # L3 (tests/workflow.test.ts, mocked fetch/Chrome)
bun run test:e2e         # L4 (Puppeteer isolated Chrome profile)
bun run build            # B1 (tsc --noEmit && vite build)
bun run materials:check  # validate materials/<version>/ deliverables
bun run build:zip        # build versioned dist/r2shot-<version>.zip
```

## Invariants

- Preserve Manifest V3 behavior and Chrome 123+ support; `dev` is a Vite watch build, not a web server.
- Keep R2 credentials in the user's `chrome.storage.local` with bucket-scoped access; never commit or log them.
- Report real upload and CDN results honestly: a passing `HeadBucket` check does not prove the public CDN URL works, and mocked fetches are never live uploads.
- Preserve full-page capture limits (32M pixels total, 32,767 px per side), active-tab ownership, and scroll restoration.
- `public/manifest.json` is the sole version authority (`src/shared/version.ts` reads Chrome's manifest at runtime); sync `package.json` in the same commit.
- SemVer: `major` for storage/config-breaking changes, `minor` for features/i18n/UI, `patch` for behavior-preserving fixes; use annotated tags.
- Own deliverables in this repo: run `bun run materials` and `bun run materials:check`; inputs live in `materials/source/`, versioned outputs in `materials/<version>/`, and `unpacked/` stays untracked.
- Preserve original logos and historical concept/approved HTML in [docs/design/](docs/design/README.md); never fabricate manual user acceptance.
- Releases require authorization: follow [docs/01-release-materials.md](docs/01-release-materials.md) to sync versions/`CHANGELOG.md`, tag, attach the ZIP, and start [TESTING.md](TESTING.md) acceptance.

## Quality & Local Gates

Follows `system1-quality`; CI runs [.github/workflows/ci.yml](.github/workflows/ci.yml) -> [.github/workflows/quality-slots.yml](.github/workflows/quality-slots.yml) (`quality / Z1: Gate` required on `main`, including blocking `precommit-gate`). Status vocabulary: `enforced`, `planned`, `manual`, `N/A`.

- **Exceptions / gaps**: `L2 Runtime` is `N/A` (Chrome extension, no Worker/workerd runtime); `P1 Package` is `N/A` (private package; ZIP via `bun run build:zip`); live R2/CDN acceptance is `manual`.
- **L1 coverage**: `>=95%` statements/branches/functions/lines ([vitest.config.ts](vitest.config.ts) + `scripts/l1-coverage-guard.cjs`), excluding `src/background/index.ts` (E2E-covered) and `src/types/**`.
- **Pre-commit** (`.husky/pre-commit`, Husky 9 via `prepare`): runs `gitleaks protect --staged` on the real index, then checks a staged snapshot (`typecheck`, `lint`, `test:coverage`, `l1-coverage-guard`).
- **Pre-push** (`.husky/pre-push`): runs `build`, `test:coverage`, `lint`, and `osv-scanner` (`osv-scanner.toml`, `bun.lock`) on the worktree.
- **Gate discipline**: never bypass hooks, use autofix in checks, lower floors, or cite historical test runs as current proof; doc changes do not authorize deploys or new gates.

## Resources & Isolation

| Lane | Environment / State | Boundary |
| --- | --- | --- |
| Dev | Vite watch build (`dist/`), unpacked extension | Local dev only; no web server or remote Worker resources |
| Tests | Dedicated Puppeteer Chrome profile, fake credentials, intercepted R2 | Isolated temp storage; never touch everyday saved credentials |
| Live R2 | Separately configured real R2 bucket and public CDN | Explicit manual acceptance scope ([TESTING.md](TESTING.md)) only |

## Retrospective

Record incident narratives in [Retrospective.md](Retrospective.md); promote recurring project constraints to `Invariants` above and enforceable safeguards to tests/hooks.
