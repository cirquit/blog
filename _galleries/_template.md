---
layout: gallery
title: "TITLE HERE"
date: 2026-01-01
photos: {}
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
