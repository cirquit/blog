---
layout: gallery
title: Demo gallery
date: 2026-09-20
photos:
  beach-01:
    basename: assets/photos/demo/beach-01
    alt: Sample 1 - flower
    note: 'Golden hour in the garden.'
    exif:
      camera: FUJIFILM X-A3
      lens: XF35mmF2 R WR
      aperture: f/2.0
      shutter: 1/1600
      iso: 200
      focal_length: 35.0 mm
      captured_at: '2026-09-20 02:09:04'
  beach-02:
    basename: assets/photos/demo/beach-02
    alt: Sample 2 - fence
    note: 'Golden hour in the garden.'
    exif:
      camera: FUJIFILM X-A3
      lens: 16-300mm F3.5-6.7 DC OS | Contemporary 025
      aperture: f/6.3
      shutter: 1/1000
      iso: 200
      focal_length: 75.2 mm
      captured_at: '2026-09-20 01:07:44'
---

<!--
  TO CREATE A GALLERY:
  1. Copy this file to _galleries/your-slug.md (no leading underscore --
     a leading underscore makes Jekyll silently skip the file, which is
     exactly why this template itself is never built).
  2. Set `title` and `date` above.
  3. For each photo, run from the repo root:

       scripts/make-photo.sh <source.jpg> _galleries/your-slug.md <photo-slug> "Alt text"

     This generates the derivative files under assets/photos/your-slug/
     AND writes/updates a `photos.<photo-slug>` entry below automatically
     (basename, alt, auto-extracted EXIF, and an empty `note` field).
  4. Edit `note:` per photo if you want flavor text -- re-running the
     script never overwrites a `note` you've already written.
  5. Commit. Nothing here ever runs in CI.
-->
