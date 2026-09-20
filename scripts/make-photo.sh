#!/usr/bin/env bash
# Generate the two derivative sizes (thumb, full) x two formats (AVIF, WebP)
# used by _includes/photo.html and the _galleries collection, from one source
# photo. Run this by hand, locally, before committing -- never in CI.
#
# Usage:
#   scripts/make-photo.sh <source.jpg> <output-dir> <basename>
#
# Produces, in <output-dir>:
#   <basename>-thumb.avif   <basename>-thumb.webp   (~500-700px long edge)
#   <basename>-full.avif    <basename>-full.webp    (~2560px long edge)
#
# Requires libvips (`brew install vips`). Converts to sRGB explicitly before
# encoding -- do not "simplify" this to a plain --strip, since source photos
# from wide-gamut cameras/phones (Display P3 etc.) will shift color if the
# ICC profile is dropped instead of converted.

set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <source.jpg> <output-dir> <basename>" >&2
  exit 1
fi

SRC="$1"
OUT_DIR="$2"
BASENAME="$3"

if [ ! -f "$SRC" ]; then
  echo "Source file not found: $SRC" >&2
  exit 1
fi

SRGB_PROFILE="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
if [ ! -f "$SRGB_PROFILE" ]; then
  echo "sRGB profile not found at $SRGB_PROFILE -- pass a different path via \$SRGB_PROFILE_OVERRIDE" >&2
  SRGB_PROFILE="${SRGB_PROFILE_OVERRIDE:?set SRGB_PROFILE_OVERRIDE to an sRGB .icc path}"
fi

mkdir -p "$OUT_DIR"

THUMB_SIZE=640
FULL_SIZE=2560
THUMB_AVIF_Q=50
THUMB_WEBP_Q=65
FULL_AVIF_Q=55
FULL_WEBP_Q=70

OUT_PREFIX="$OUT_DIR/$BASENAME"

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
