# r2shot

Chrome extension that captures visible tab screenshots, uploads them to Cloudflare R2 via S3-compatible API, and copies a CDN URL to clipboard.

## Features

- One-click screenshot capture from browser toolbar
- Automatic upload to Cloudflare R2 with date-folder/GUID naming
- CDN URL generation and clipboard copy
- Settings page for R2 configuration (account, keys, bucket, CDN URL, JPG quality)
- Connection verification
- Dark/light theme support

## Tech Stack

TypeScript, Vite 6, React 19, Tailwind CSS 4, Vitest 3, Chrome MV3, @aws-sdk/client-s3

## Development

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)

### Setup

```sh
bun install
```

This automatically configures git hooks via the `prepare` script.

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Type-check and build for production |
| `bun run test` | Run unit tests |
| `bun run test:watch` | Run unit tests in watch mode |
| `bun run test:coverage` | Run unit tests with coverage report |
| `bun run test:e2e` | Run E2E tests |
| `bun run lint` | Lint source (zero warnings enforced) |
| `bun run lint:fix` | Lint and auto-fix |

### Git Hooks

Hooks live in `.husky/` and are activated via `git config core.hookspath .husky`.

| Hook | Runs |
|------|------|
| `pre-commit` | Unit tests |
| `pre-push` | Unit tests + lint |

### Testing

- **Unit tests**: 81 tests across 10 files, 90%+ coverage threshold on statements, branches, functions, and lines
- **E2E tests**: 7 tests covering full capture-upload-URL workflow
- Coverage is enforced in `vitest.config.ts`

### Load Extension in Chrome

1. `bun run build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` directory
