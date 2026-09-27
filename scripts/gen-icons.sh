#!/usr/bin/env bash
# Regenerate the Flow of Funds icon set from the static master SVGs in assets/icons.
# Requires ImageMagick 7 (`magick`). Run from anywhere: scripts/gen-icons.sh
#
# Why this exists: the raster icons were once baked from art that carried the old
# brand red, so a token change drifted out of sync. Keep the masters as the single
# source of truth and regenerate here.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="assets/icons"
OUT="public"

# Render a 128-unit master SVG to an exact NxN PNG (native density, no upscaling).
render() { # <master.svg> <out.png> <px>
  local d=$(( 96 * $3 / 128 ))
  magick -background none -density "$d" "$SRC/$1" -resize "${3}x${3}" "$OUT/$2"
}

render icon.master.svg      icon-192.png      192
render icon.master.svg      icon-512.png      512
render maskable.master.svg  maskable-192.png  192
render maskable.master.svg  maskable-512.png  512
render apple.master.svg     apple-touch-icon.png 180

# Shipped SVG favicon = the static icon master (kept in sync).
cp "$SRC/icon.master.svg" "$OUT/icon.svg"

# Multi-resolution favicon.ico (Next.js serves src/app/favicon.ico at /favicon.ico).
magick -background none -density 384 "$SRC/icon.master.svg" -resize 64x64 \
  -define icon:auto-resize=48,32,16 src/app/favicon.ico

# Open Graph share card (1200x630). Composited: cream gradient + the tilted mark
# (rendered transparent) + text via -annotate. ImageMagick's SVG renderer mangles
# gradients/text, so text is drawn here with explicit macOS font files.
OG_REG="/System/Library/Fonts/Helvetica.ttc"
OG_MONO="/System/Library/Fonts/SFNSMono.ttf"
if [ -f "$SRC/og-mark.svg" ] && [ -f "$OG_REG" ]; then
  OG_TMP="$(mktemp -t ogmark).png"
  magick -background none -density 430 "$SRC/og-mark.svg" -resize 430x430 "$OG_TMP"
  magick -size 1200x630 gradient:'#F4F0E6-#FBF9F3' \
    -fill '#C41E3A' -draw 'rectangle 0,0 1200,8' \
    "$OG_TMP" -gravity West -geometry +70+0 -composite \
    -gravity NorthWest \
    -font "$OG_REG" -fill '#C41E3A' -pointsize 26 -kerning 5 -annotate +610+170 'FINTECH NORTH' \
    -kerning 0 -fill '#1C1C1C' -pointsize 78 -annotate +604+218 'Flow of Funds' \
    -fill '#6B6B66' -pointsize 28 -annotate +610+330 'Map how money and messages move.' \
    -fill '#6B6B66' -pointsize 26 -annotate +610+412 'Curated examples for common payments.' \
    -fill '#6B6B66' -pointsize 26 -annotate +610+454 'AI-generated flows for custom scenarios.' \
    -font "$OG_MONO" -fill '#C41E3A' -pointsize 26 -annotate +610+548 'flows.fintechnorth.ca' \
    "$OUT/og-image.png"
  rm -f "$OG_TMP"
fi

echo "Regenerated icons in $OUT/ and src/app/favicon.ico"
