# Changelog

All notable changes to R2Shot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.1] - 2026-07-31

### Changed
- STU-2029: chore(deps): 2026-07-31 batch — vite 8.1.5→8.2.0, lucide-react 1.25.0→1.28.0, brace-expansion 5.0.8→5.0.9, @vitejs/plugin-react 6.0.4→6.0.5, @types/react-dom 19.2.3→19.2.4, @types/react 19.2.17→19.2.18, @aws-sdk/client-s3 3.1093.0→3.1099.0, @types/node 26.1.1→26.1.2, @biomejs/biome 2.5.5→2.5.6

## v1.3.0

### Added
- Enable react domain and stricter hooks-adjacent rules

### Changed
- Expand biome coverage to root configs and update docs
- Bump typescript to 7.0.2
- Replace ts-eslint with biome for lint + format
- STU-2145: chore(deps): 2026-07-23 batch — happy-dom + plugin-react + aws-sdk s3 (#151)
- STU-2120: chore(deps): 2026-07-22 batch — aws-sdk s3 + react 19.2.8 (#147)
- 2026-07-21 batch — brace-expansion CVE, aws-sdk, typescript-eslint 8.65, jest-dom v7 (#143)
- Bump happy-dom 20.10.6 → 20.11.0
- Bump lucide-react 1.24.0 → 1.25.0
- Bump @aws-sdk/client-s3 3.1089.0 → 3.1090.0
- Bump vite 8.1.4 → 8.1.5
- Bump tailwindcss + @tailwindcss/vite 4.3.2 → 4.3.3
- Bump @aws-sdk/client-s3 3.1088.0 → 3.1089.0
- Bump @aws-sdk/client-s3 3.1086.0 → 3.1088.0
- Bump ws 8.21.0 → 8.21.1
- Bump typescript-eslint family 8.63.0 → 8.64.0 (#122)
- Bump @aws-sdk/client-s3 3.1085.0 → 3.1086.0 (#121)
- Bump @aws-sdk/client-s3 3.1084.0 → 3.1085.0
- Bump eslint 10.6.0 → 10.7.0
- Bump vite 8.1.3 → 8.1.4
- Bump lucide-react 1.23.0 → 1.24.0
- Bump @aws-sdk/client-s3 3.1083.0 → 3.1084.0
- Bump @types/node 26.1.0 → 26.1.1
- Bump @aws-sdk/client-s3 3.1081.0 → 3.1083.0
- Bump @aws-sdk/client-s3 3.1080.0 → 3.1081.0
- Upgrade dependencies (batch 2026-07-07)
- Upgrade dependencies (batch 2026-07-03)
- Add root .npmrc for supply chain security baseline
- Upgrade dependencies (batch 2026-07-02)
- Upgrade dependencies (batch 2026-07-01)
- Upgrade dependencies (batch 2026-06-30) (#81)
- Bump lucide-react 1.21.0 → 1.22.0
- Bump postcss 8.5.15 → 8.5.16
- Bump eslint 10.5.0 → 10.6.0
- Bump @types/node 26.0.0 → 26.0.1
- Pin direct vite to 8.1.0 (no caret)
- Bump vite 8.0.16 → 8.1.0
- Bump @vitejs/plugin-react 6.0.2 → 6.0.3
- Bump @aws-sdk/client-s3 3.1074.0 → 3.1075.0
- Bump globals 17.6.0 → 17.7.0
- Bump typescript-eslint 8.61.1 → 8.62.0
- Bump @aws-sdk/client-s3 3.1073.0 → 3.1074.0
- Bump @types/chrome 0.1.43 → 0.2.0
- Bump @types/node 25.9.3 → 26.0.0
- Bump lucide-react 1.20.0 → 1.21.0
- Bump @aws-sdk/client-s3 3.1071.0 → 3.1073.0
- Bump fast-xml-parser 5.9.2 → 5.9.3
- Pin base-ci reusable workflow to v2026.5 SHA
- Bump @aws-sdk/client-s3 3.1070.0 → 3.1071.0
- Bump fast-xml-parser 5.9.0 → 5.9.2
- Bump happy-dom 20.10.5 → 20.10.6
- Bump lucide-react 1.18.0 -> 1.20.0
- Bump happy-dom 20.10.4 -> 20.10.5
- Bump @aws-sdk/client-s3 3.1069.0 -> 3.1070.0
- Bump happy-dom 20.10.3 -> 20.10.4
- Bump fast-xml-parser 5.8.0 -> 5.9.0
- Bump @aws-sdk/client-s3 3.1068.0 -> 3.1069.0
- Bump vitest family 4.1.8 -> 4.1.9
- Bump typescript-eslint family 8.61.0 -> 8.61.1

### Fixed
- Widen lint scripts from src to repo root
- Regenerate bun.lock against official npm registry

### Removed
- Drop unused fast-xml-parser dep
- Drop unused root postcss dep

## [1.2.1] - 2026-06-16

### Security

- Force transitive `vite` to `^8.0.16` via `overrides`, eliminating the
  vulnerable `vite@8.0.12` pulled in by `vitest` (GHSA-fx2h-pf6j-xcff
  `server.fs.deny` bypass, GHSA-v6wh-96g9-6wx3 launch-editor NTLMv2 disclosure)

## [1.2.0] - 2026-05-12

### Changed

- Upgrade Vite from 6.x to 8.0.12
- Upgrade vulnerable dependencies

### Added

- Automated release script (`bun run release`)
- G1 static analysis compliance (typecheck + lint-staged)
- G2 security scanning (gitleaks + osv-scanner)
- L2 API E2E tests in CI
- CI workflow_dispatch trigger and base-ci v2026.1
- Expanded test coverage to 95%+ (159 tests across 14 files)

### Fixed

- Coverage config aligned with best practices

## [1.1.2] - 2026-04-14

### Fixed

- `DOMParser is not defined` crash in service worker by replacing browser XML parser with fast-xml-parser via Vite build plugin

## [1.1.0] - 2026-02-22

### Added

- Full-page screenshot capture via scroll-and-stitch (popup toggle)
- Max screens setting (1–100, default 5) to limit full-page capture height on infinite-scroll pages
- Red dev logo variant to distinguish unpacked/development builds from production
- Chrome Web Store badge in README

### Changed

- Full-page toggle moved from Settings to Popup as per-capture local state
- S3Client is now cached as a singleton instead of recreated per request
- Test connection now uses current UI config instead of last-saved config
- Store descriptions rewritten with emoji formatting
- Content Security Policy added to manifest.json

### Fixed

- Full-page capture on browser internal pages (chrome://, edge://) now shows a friendly error instead of crashing
- CSP violation on data: URI fetch replaced with direct blob conversion
- Chrome captureVisibleTab rate limit handled with 550ms throttle between calls
- Settings load/save error handling prevents stuck spinner
- Error text in popup now wraps properly

## [1.0.0] - 2026-02-19

Initial public release.

### Added

- One-click visible tab screenshot capture from browser toolbar
- Upload to Cloudflare R2 via S3-compatible API with date-folder/GUID naming
- CDN URL generation from custom domain, auto-copied to clipboard
- Smart endpoint parsing — paste a full S3 API URL to auto-extract endpoint + bucket name
- Connection test — verify R2 credentials before saving
- Theme support — system / light / dark with persistence
- Configurable JPG quality (1-100)
- i18n — 10 languages (EN, ZH-CN, ZH-TW, JA, KO, FR, DE, ES, PT-BR, RU)
- Settings page with card layout, Lucide icons, version display
- Popup with description text, capture button, copy URL with toast feedback
- Chrome Web Store build script (`bun run build:zip`)
- Store descriptions for 10 languages in `assets/`
- Privacy policy (`PRIVACY.md`)
- 115 tests (108 unit + 7 E2E), 97%+ coverage
- Git hooks — pre-commit (UT), pre-push (UT + lint)

[1.3.1]: https://github.com/nocoo/r2shot/releases/tag/v1.3.1
[1.2.1]: https://github.com/nocoo/r2shot/releases/tag/v1.2.1
[1.2.0]: https://github.com/nocoo/r2shot/releases/tag/v1.2.0
[1.1.2]: https://github.com/nocoo/r2shot/releases/tag/v1.1.2
[1.1.0]: https://github.com/nocoo/r2shot/releases/tag/v1.1.0
[1.0.0]: https://github.com/nocoo/r2shot/releases/tag/v1.0.0
