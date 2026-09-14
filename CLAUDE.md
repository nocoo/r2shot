# R2Shot — Project Instructions

## Versioning & Release

### Semantic Versioning

Follow [SemVer](https://semver.org/) strictly:

- **MAJOR** (`X.0.0`): breaking changes to user-facing behavior or config schema (e.g., storage key rename that loses saved data)
- **MINOR** (`x.Y.0`): new features, new i18n keys, new UI sections
- **PATCH** (`x.y.Z`): bug fixes, typo corrections, dependency updates, refactors with no behavior change

### Single Source of Truth

- `public/manifest.json` is the **sole authority** for the version number
- `package.json` version **must stay in sync** — update both in the same commit
- `src/shared/version.ts` reads version at runtime via `chrome.runtime.getManifest().version`

### Release Checklist

When bumping a version:

1. Update `version` in both `public/manifest.json` and `package.json`
2. Add a new section to `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format
3. Commit: `chore: bump version to <version> and update changelog`
4. Create annotated tag: `git tag -a v<version> -m "v<version> — <short summary>"`
5. Build ZIP: `bun run build:zip` (produces `dist/r2shot-<version>.zip`)
6. Push: `git push origin main --tags`
7. Create GitHub release: `gh release create v<version> dist/r2shot-<version>.zip --title "v<version> — <title>" --notes "<release notes>"`
   - Release notes should list features/fixes from the CHANGELOG section
   - Attach `r2shot-<version>.zip` as a downloadable asset

### Tag Format

- Tags: `v<major>.<minor>.<patch>` (e.g., `v1.0.0`, `v1.1.0`, `v1.0.1`)
- Always use **annotated tags** (`git tag -a`), never lightweight tags

### CHANGELOG Format

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

[x.y.z]: https://github.com/nocoo/r2shot/releases/tag/vx.y.z
```

## Retrospective

(Record lessons learned from mistakes here)

## Design and submission material ownership

- Generate R2Shot deliverables from this repository using `bun run materials`; validate with `bun run materials:check`. Never depend on a sibling project or an external joint-delivery directory.
- Editable campaign inputs are in `materials/source/`; versioned ZIPs, English store copy, screenshots, banners, marquees, landing HTML and verification are in `materials/<version>/`. Keep generated `unpacked/` out of Git.
- Preserve the original logos and the historical concept/approved HTML in `docs/design/`. Each product owns its material outputs and is committed/pushed separately.
- Notify the user when the tested package is ready for manual acceptance. Use `TESTING.md`; do not record live R2/CDN or user acceptance as passed until actually verified.
