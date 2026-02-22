#!/usr/bin/env bash
# Generate extension icons from the source logo.
#
# Generates both production icons (blue) and dev icons (red).
# Dev icons live in public/icons/dev/ for use when loading the
# extension unpacked during development.
#
# Usage: ./scripts/generate-icons.sh [source] [output_dir]
# Defaults: source=logo.png, output_dir=public/icons

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE="${1:-$ROOT_DIR/logo.png}"
OUTPUT_DIR="${2:-$ROOT_DIR/public/icons}"
DEV_SOURCE="$ROOT_DIR/logo-dev.png"

if [ ! -f "$SOURCE" ]; then
  echo "Error: source file '$SOURCE' not found" >&2
  exit 1
fi

# Generate dev logo if it doesn't exist or source is newer
if [ ! -f "$DEV_SOURCE" ] || [ "$SOURCE" -nt "$DEV_SOURCE" ]; then
  echo "Generating dev logo (red variant)..."
  python3 "$SCRIPT_DIR/generate-dev-logo.py" "$SOURCE" "$DEV_SOURCE"
fi

resize_icons() {
  local src="$1"
  local outdir="$2"
  local label="$3"

  mkdir -p "$outdir"

  local sizes=(16 32 48 64 128)
  for size in "${sizes[@]}"; do
    # Use "icon" prefix for extension sizes, "logo" prefix for UI sizes
    if [ "$size" -eq 32 ] || [ "$size" -eq 64 ]; then
      out="$outdir/logo${size}.png"
    else
      out="$outdir/icon${size}.png"
    fi
    sips -z "$size" "$size" "$src" --out "$out" > /dev/null 2>&1
    echo "  $label: $out (${size}x${size})"
  done
}

echo "Generating production icons..."
resize_icons "$SOURCE" "$OUTPUT_DIR" "prod"

echo "Generating dev icons..."
resize_icons "$DEV_SOURCE" "$OUTPUT_DIR/dev" "dev"

echo "Done."
