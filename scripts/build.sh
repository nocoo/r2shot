#!/bin/bash
#
# Build the extension and package into a ZIP for Chrome Web Store submission.
#
# Output: dist/r2shot-<version>.zip
#
# Steps:
#   1. Run Vite production build (type-check + bundle into dist/)
#   2. ZIP the dist/ contents (manifest.json, _locales/, icons/, JS/CSS/HTML)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

# Build first
echo "Building extension..."
cd "$ROOT_DIR"
bun run build

# Read version from the built manifest.json
VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DIST_DIR/manifest.json','utf8')).version)")
OUTFILE="$DIST_DIR/r2shot-${VERSION}.zip"

# Safety check: ensure production build uses production icons (not dev)
if grep -q '"icons/dev/' "$DIST_DIR/manifest.json"; then
  echo "ERROR: dist/manifest.json contains dev icon paths!" >&2
  echo "       This looks like a development build. Run 'bun run build:zip' to build for production." >&2
  exit 1
fi

echo ""
echo "Packaging R2Shot v${VERSION}"
echo ""

# Remove any previous ZIP
rm -f "$DIST_DIR"/r2shot-*.zip

# Create ZIP from dist/ contents (exclude dev icons and ZIP files)
cd "$DIST_DIR"
zip -r "$OUTFILE" . \
  -x "r2shot-*.zip" \
  -x "icons/dev/*" \
  > /dev/null

# Report
SIZE=$(du -h "$OUTFILE" | cut -f1 | xargs)
echo "  Done: $OUTFILE ($SIZE)"
echo ""
echo "Upload this file to the Chrome Web Store Developer Dashboard."
