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

echo ""
echo "Packaging R2Shot v${VERSION}"
echo ""

# Remove any previous ZIP
rm -f "$DIST_DIR"/r2shot-*.zip

# Create ZIP from dist/ contents
cd "$DIST_DIR"
zip -r "$OUTFILE" . \
  -x "r2shot-*.zip" \
  > /dev/null

# Report
SIZE=$(du -h "$OUTFILE" | cut -f1 | xargs)
echo "  Done: $OUTFILE ($SIZE)"
echo ""
echo "Upload this file to the Chrome Web Store Developer Dashboard."
