<p align="center">
  <img src="../assets/brand/icon-rounded.png" alt="R2Shot" width="128" height="128" />
</p>

<h1 align="center">R2Shot</h1>

<p align="center">Capture web pages, upload to your own R2 storage, and copy a shareable link.</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/r2shot/chhcpjnlcbomogddjockcpjjpiijogha">Chrome Web Store</a> ·
  <a href="../README.md">简体中文</a>
</p>

## What it does

R2Shot is a Chrome extension that combines webpage screenshots and image uploads in one popup. Configure your own Cloudflare R2 bucket and public domain, and captures upload directly to that bucket. After uploading, click Copy URL to share the image in notes, documents, or messages.

You provide the storage and R2 credentials. Version 2.0.0 introduces a compact sea-glass interface in the hexly.ai family. The popup and settings support 10 languages, with light, dark, and system themes. Chrome 123 or later is required.

## Features

- Capture the visible area of the current tab, or enable Full Page to scroll vertically and stitch captures together.
- Upload JPEG images with quality from 1–100. Full-page capture defaults to 5 viewport heights, adjustable from 1–100.
- Store images under a UTC date folder with a random UUID, such as `2026-09-08/<uuid>.jpg`.
- Generate an HTTPS image URL from the public domain, with a copy button and upload error feedback.
- Extract the endpoint and bucket name from a pasted R2 S3 API URL, and test bucket connectivity.
- Keep configuration in the local browser, with light, dark, and system themes.

Full-page output is limited to 32 million pixels and 32,767 pixels per side to bound memory use. Keep the original tab active during capture. Full-page mode stitches loaded content at the current viewport width and attempts to restore the original scroll position afterward. Browser internal pages do not support this mode. Dynamic and infinite-scroll pages are limited by loaded content and the configured capture height.

## Usage

### Install

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/r2shot/chhcpjnlcbomogddjockcpjjpiijogha) and pin the extension. Alternatively, build from source below, open `chrome://extensions/`, enable Developer mode, and use Load unpacked to select `dist/`.

### Configure and capture

Open Settings and fill in:

| Setting | Value |
| --- | --- |
| Endpoint URL | R2 S3 API endpoint, such as `https://<account-id>.r2.cloudflarestorage.com` |
| Access Key ID / Secret Access Key | R2 credentials with read and write access to the target bucket |
| Bucket Name | Upload destination bucket |
| Custom Domain | A domain configured for public access, such as `cdn.example.com`, with or without `https://` |
| JPG Quality | JPEG quality, default 90 |
| Max Screens (Full Page) | Maximum number of viewport heights, default 5 |

Click Test Connection to check bucket access, then Save. The connection test uses `HeadBucket`; verify the public domain separately by opening a link after an actual upload.

Return to a regular webpage, open the popup, choose whether to enable Full Page, and click Capture. Click Copy URL after success. R2 credentials are stored as plain text in the extension's `chrome.storage.local`; use credentials limited to the target bucket. See the [privacy policy](../PRIVACY.md) for details.

## Development

Requires Bun, Node.js 22.22.2+ (22.x), 24.15+ (24.x), or 26+, and Chrome. Run from the repository root:

```bash
git clone https://github.com/nocoo/r2shot.git
cd r2shot
bun install --frozen-lockfile
bun run build
```

Load the resulting `dist/` directory as an unpacked extension in Chrome. During development, run:

```bash
bun run dev
```

This watches files and rebuilds the extension with red development icons. Reload the extension in `chrome://extensions/` after changes. It does not start a regular web development server.

```bash
bun run typecheck
bun run lint
bun run build:zip
```

`build:zip` requires Bash and `zip`, and produces `dist/r2shot-<version>.zip`. Capture, storage, and clipboard functionality require a real extension environment.

```text
src/popup/         Capture popup and copy action
src/settings/      R2 configuration and theme
src/background/    Extension message handling
src/core/          Capture, stitching, S3 upload, and local configuration
public/            Manifest V3, icons, and localization resources
tests/             Workflow integration and real Chrome extension tests
```

## Tests

Run from the repository root:

| Test layer | Command |
| --- | --- |
| Unit and DOM tests | `bun run test` |
| Workflow integration tests | `bun run test:integration` |
| Real Chrome extension tests (build first) | `bun run test:e2e` |
| Unit tests in watch mode | `bun run test:watch` |
| Full local quality check | `bun run verify` |

The framework follows Hooky: Vitest uses Node by default, with jsdom selected per DOM test file. `bun run test:coverage` produces a report with 95% gates for all four metrics. The AWS SDK is a development-only reference for Signature V4 compatibility tests.

Puppeteer installs a temporary copy of `dist/` in an isolated Chrome browser and tests the real popup, messaging, storage, screenshots, and scroll stitching. R2 HTTP responses and clipboard access are stubbed; no real credentials are needed. Run `bunx puppeteer browsers install chrome` once to install the matching browser, or set `PUPPETEER_EXECUTABLE_PATH` to use an existing Chrome.

`bun run verify` checks the frozen install, linting, production build, coverage gates, workflow integration, and real Chrome extension tests. CI runs separate workflow integration and browser checks; the commit hook enforces coverage. Browser evidence goes to `dist/verification/`. See [TESTING.md](../TESTING.md) for commands, optional paths, and manual acceptance.

## Stack

The shipped extension uses native JavaScript, HTML, CSS, Fetch, and Web Crypto. The TypeScript core is compiled during development; no framework or AWS SDK is included in the runtime.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)

| Area | Implementation |
| --- | --- |
| Extension | Chrome Manifest V3, background service worker, Chrome Tabs / Scripting / Storage APIs |
| Interface | Native DOM, CSS custom properties, system fonts, inline SVG |
| Images and uploads | OffscreenCanvas, Fetch, Web Crypto SHA-256 / HMAC, Cloudflare R2 |
| Build and testing | Vite, TypeScript, Biome, Vitest, jsdom, Puppeteer |

## Documentation

- [Privacy policy and local credential storage](../PRIVACY.md)
- [Changelog](../CHANGELOG.md)
- [R2Shot and Hooky dependency review (2026-09-16)](dependency-review-2026-09-16.md)
- [Extension manifest](../public/manifest.json)

A product of [hexly.ai](https://hexly.ai).

## License

[MIT](../LICENSE) © 2026 Zheng Li

## Design and submission materials

[Concepts and approved family designs](design/README.md) · [R2Shot 2.0.0 gallery](../materials/2.0.0/index.html) · [Manual testing](../materials/2.0.0/TESTING.md)

Run `bun run materials` from this repository to generate its own tested package, English store copy, promotional assets and standalone website. Original artwork, prompts and design references are retained. See [the directory and reproduction guide](../materials/README.md).
