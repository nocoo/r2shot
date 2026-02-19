# Changelog

All notable changes to R2Shot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/nocoo/r2shot/releases/tag/v1.0.0
