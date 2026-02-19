#!/usr/bin/env bash
# Generate extension icons from the source logo.
# Usage: ./scripts/generate-icons.sh [source] [output_dir]
# Defaults: source=logo.png, output_dir=public/icons

set -euo pipefail

SOURCE="${1:-logo.png}"
OUTPUT_DIR="${2:-public/icons}"

if [ ! -f "$SOURCE" ]; then
  echo "Error: source file '$SOURCE' not found" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

SIZES=(16 32 48 64 128)

for size in "${SIZES[@]}"; do
  # Use "icon" prefix for extension sizes, "logo" prefix for UI sizes
  if [ "$size" -eq 32 ] || [ "$size" -eq 64 ]; then
    out="$OUTPUT_DIR/logo${size}.png"
  else
    out="$OUTPUT_DIR/icon${size}.png"
  fi
  sips -z "$size" "$size" "$SOURCE" --out "$out" > /dev/null 2>&1
  echo "Generated $out (${size}x${size})"
done

echo "Done."
