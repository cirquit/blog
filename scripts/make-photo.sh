#!/usr/bin/env bash
# Add one photo to a gallery or post: generate its web derivatives AND
# write/update its metadata (alt, EXIF, empty note) in the target file's
# front matter. Run this by hand, locally, before committing -- never in CI.
#
# Usage:
#   scripts/make-photo.sh <source.jpg> <target.md> <slug> "<alt text>"
#
# <target.md> is the _galleries/*.md or _posts/*.md file that owns this
# photo -- it must already exist with `---` front matter fences (copy
# _galleries/_template.md or _drafts/template.md first).
#
# Derives, from <target.md>'s own filename (without extension) as <group>:
#   assets/photos/<group>/<slug>-thumb.avif   assets/photos/<group>/<slug>-thumb.webp
#   assets/photos/<group>/<slug>-full.avif    assets/photos/<group>/<slug>-full.webp
# and writes/updates photos.<slug> in <target.md>'s front matter with
# basename, alt, auto-extracted EXIF, and an empty `note` (never
# overwritten if you've already written one).
#
# Requires libvips (`brew install vips`) and exiftool (`brew install exiftool`).
# Converts to sRGB explicitly before encoding -- do not "simplify" this to a
# plain --strip, since source photos from wide-gamut cameras/phones (Display
# P3 etc.) will shift color if the ICC profile is dropped instead of converted.

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <source.jpg> <target.md> <slug> <alt text>" >&2
  exit 1
fi

SRC="$1"
TARGET="$2"
SLUG="$3"
ALT="$4"

if [ ! -f "$SRC" ]; then
  echo "Source file not found: $SRC" >&2
  exit 1
fi
if [ ! -f "$TARGET" ]; then
  echo "Target front-matter file not found: $TARGET (copy _galleries/_template.md or _drafts/template.md first)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GROUP="$(basename "$TARGET")"
GROUP="${GROUP%.*}"
OUT_DIR="$REPO_ROOT/assets/photos/$GROUP"
BASENAME_SITE="assets/photos/$GROUP/$SLUG"  # site-relative, used in front matter

SRGB_PROFILE="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
if [ ! -f "$SRGB_PROFILE" ]; then
  SRGB_PROFILE="${SRGB_PROFILE_OVERRIDE:?set SRGB_PROFILE_OVERRIDE to an sRGB .icc path}"
fi

mkdir -p "$OUT_DIR"

THUMB_SIZE=640
FULL_SIZE=2560
THUMB_AVIF_Q=50
THUMB_WEBP_Q=65
FULL_AVIF_Q=55
FULL_WEBP_Q=70

OUT_PREFIX="$OUT_DIR/$SLUG"

vipsthumbnail "$SRC" --size "$THUMB_SIZE" --output-profile "$SRGB_PROFILE" \
  -o "${OUT_PREFIX}-thumb.avif[Q=${THUMB_AVIF_Q}]"
vipsthumbnail "$SRC" --size "$THUMB_SIZE" --output-profile "$SRGB_PROFILE" \
  -o "${OUT_PREFIX}-thumb.webp[Q=${THUMB_WEBP_Q}]"
vipsthumbnail "$SRC" --size "$FULL_SIZE" --output-profile "$SRGB_PROFILE" \
  -o "${OUT_PREFIX}-full.avif[Q=${FULL_AVIF_Q}]"
vipsthumbnail "$SRC" --size "$FULL_SIZE" --output-profile "$SRGB_PROFILE" \
  -o "${OUT_PREFIX}-full.webp[Q=${FULL_WEBP_Q}]"

echo "Generated:"
ls -la "${OUT_PREFIX}"-thumb.* "${OUT_PREFIX}"-full.*

EXIF_JSON="$(mktemp -t make-photo-exif).json"
trap 'rm -f "$EXIF_JSON"' EXIT
exiftool -j -Make -Model -LensModel -FNumber -ExposureTime -ShutterSpeed -ISO \
  -FocalLength -DateTimeOriginal "$SRC" > "$EXIF_JSON"

ruby "$SCRIPT_DIR/merge-photo-metadata.rb" "$TARGET" "$SLUG" "$BASENAME_SITE" "$ALT" "$EXIF_JSON"
