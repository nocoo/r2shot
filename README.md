<p align="center">
  <img src="logo.png" width="128" height="128" alt="R2Shot logo">
</p>

<h1 align="center">R2Shot</h1>

<p align="center">
  One-click screenshot capture, upload to Cloudflare R2, CDN URL to clipboard
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/tests-115_passing-brightgreen" alt="115 tests passing">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
</p>

---

## Features

- **One-click capture** -- screenshot visible tab from browser toolbar
- **Cloudflare R2 upload** -- automatic upload via S3-compatible API with date-folder/GUID naming
- **CDN URL** -- generates public URL from custom domain, copies to clipboard with toast feedback
- **Smart endpoint parsing** -- paste a full S3 API URL and auto-extract endpoint + bucket name
- **Connection test** -- verify R2 credentials before saving
- **Themes** -- system / light / dark
- **Configurable quality** -- adjust JPG compression (1-100)
- **i18n** -- 10 languages: English, 简体中文, 繁體中文, 日本語, 한국어, Francais, Deutsch, Espanol, Portugues (BR), Русский

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.x+
- Google Chrome

### Install

```sh
bun install
```

> The `prepare` script automatically sets up Git hooks.

### Load in Chrome

1. `bun run build`
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** -> select the `dist/` directory

---

## Development

### Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Type-check and build for production |
| `bun run build:zip` | Build + package into `dist/r2shot-<version>.zip` for Chrome Web Store |
| `bun run test` | Run unit tests (Vitest) |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with V8 coverage report (90% threshold) |
| `bun run test:e2e` | Run E2E tests |
| `bun run lint` | Lint `src/` with ESLint (zero warnings enforced) |
| `bun run lint:fix` | Lint and auto-fix |

### Git Hooks

Hooks live in `.husky/` and are activated via `git config core.hookspath .husky`.

| Stage | Command | Purpose |
|---|---|---|
| `pre-commit` | `bun run test` | Catch regressions before commit |
| `pre-push` | `bun run test && bun run lint` | Full quality gate before push |

### Test Coverage

Coverage is enforced at **90%** for all four metrics:

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   97.62 |    91.60 |   93.93 |   97.62 |
--------------------|---------|----------|---------|---------|
```

### Project Structure

```
r2shot/
├── .husky/                # Git hooks (pre-commit, pre-push)
├── assets/                # Store descriptions (10 languages)
├── e2e/                   # E2E tests
│   └── workflow.test.ts
├── public/
│   ├── _locales/          # i18n messages (10 languages)
│   ├── icons/             # Extension & UI icons (16-128px, logo 32/64px)
│   └── manifest.json      # Chrome Extension Manifest V3
├── scripts/
│   ├── build.sh           # Build + package ZIP for Chrome Web Store
│   └── generate-icons.sh  # Generate icons from logo.png via sips
├── src/
│   ├── background/        # Service worker (message routing)
│   ├── core/              # Domain logic (upload, config, connection, storage)
│   ├── popup/             # Toolbar popup (capture + copy UI)
│   ├── settings/          # Settings page (R2 config, theme)
│   ├── shared/            # Shared UI components (Button, Input, Label, theme)
│   └── types/             # Message types
├── logo.png               # Source logo (2048x2048)
├── popup.html             # Popup entry HTML
├── settings.html          # Settings entry HTML
├── PRIVACY.md             # Privacy policy
├── vite.config.ts         # Multi-entry Vite build config
├── vitest.config.ts       # Vitest + coverage config
├── vitest.e2e.config.ts   # E2E test config
├── eslint.config.js       # ESLint flat config
├── tsconfig.json          # TypeScript config (path aliases)
└── package.json           # Scripts & dependencies
```

### Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Build | Vite 6 |
| Testing | Vitest 3, Testing Library, happy-dom |
| Upload | @aws-sdk/client-s3 (S3-compatible) |
| Extension | Chrome Manifest V3 |

---

## Publishing to Chrome Web Store

### Build

```sh
bun run build:zip
```

This produces `dist/r2shot-<version>.zip` containing the built extension ready for upload.

### Store Assets

| Asset | Location | Status |
|---|---|---|
| Description (EN) | `assets/description-en.txt` | Done |
| Description (ZH) | `assets/description-zh.txt` | Done |
| Description (ZH-TW) | `assets/description-zh-tw.txt` | Done |
| Description (JA) | `assets/description-ja.txt` | Done |
| Description (KO) | `assets/description-ko.txt` | Done |
| Description (FR) | `assets/description-fr.txt` | Done |
| Description (DE) | `assets/description-de.txt` | Done |
| Description (ES) | `assets/description-es.txt` | Done |
| Description (PT-BR) | `assets/description-pt-br.txt` | Done |
| Description (RU) | `assets/description-ru.txt` | Done |
| Privacy Policy | [`PRIVACY.md`](PRIVACY.md) | Done |
| Store Icon (128x128) | `public/icons/icon128.png` | Done |

### Steps

1. Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) ($5 one-time fee)
2. Run `bun run build:zip` to generate the ZIP
3. Upload `dist/r2shot-<version>.zip`
4. Fill in listing details using the descriptions in `assets/`
5. Set privacy policy URL to `https://github.com/nocoo/r2shot/blob/main/PRIVACY.md`
6. Upload store icon and at least 1 screenshot (1280x800 or 640x400)
7. Submit for review (typically 1-3 business days)

---

## License

[MIT](LICENSE)
