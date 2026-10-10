# blog

Personal blog. Jekyll, a small hand-written theme (one SCSS file, a few
layouts), Source Serif 4 self-hosted, CSS inlined. Two things only:
**Writing** (posts) and **Galleries** (one Markdown file per photo). Hosted on
GitHub Pages, built by GitHub Actions.

---

## 1. Local preview

Ruby is pinned by [mise](https://mise.jdx.dev/) in `mise.toml`. Nothing installs
globally; gems live in `vendor/bundle`.

```sh
# one-time
mise install
mise exec -- bundle config set --local path vendor/bundle
mise exec -- bundle install

# every session
mise exec -- bundle exec jekyll serve --drafts --livereload
# -> http://localhost:4000/blog/   (rebuilds + reloads the browser on save)
```

`--drafts` also renders `_drafts/`. Drop it to preview exactly what will publish.

---

## 2. Where everything lives

| Path | What it is |
|---|---|
| `_config.yml` | Site name, your name, URL, collections, build settings |
| `_posts/` | One Markdown file per post |
| `_drafts/` | Unpublished drafts; `template.md` is the starting point |
| `_galleries/<slug>.md` | One per gallery (title, date, description, cover, optional intro) |
| `_photos/<slug>/<NN>.md` | One per photo; the filename order is the gallery order |
| `assets/photos/<slug>/` | The image files |
| `_pages/galleries.html`, `_pages/404.html` | Gallery index, "not found" page |
| `index.html` | The post list (`/blog/`, 5 per page) |
| `_layouts/` | `default`, `post`, `gallery`, `photo` |
| `_includes/` | `head`, `nav`, plus `tweet.html` and `photo.html` for use inside posts |
| `_sass/main.scss` | The whole stylesheet (colors and widths are variables at the top) |
| `assets/fonts/` | Source Serif 4 (woff2) and its OFL license |
| `assets/js/photo-nav.js` | Arrow keys / swipe on photo pages; the site's only script |
| `scripts/import-gallery.rb` | One-time helper to stub out a gallery from a folder of images |
| `scripts/make-photo.sh`, `scripts/merge-photo-metadata.rb` | Old photo pipeline, currently unused |

Ignored (regenerated, never committed): `_site/`, `vendor/`, `.jekyll-cache/`.

---

## 3. Customize the site

Edit `_config.yml`; the top block has four `# TODO` fields (title, description,
author). Config changes need a **server restart**. Everything else hot-reloads.
Nav links are in `_includes/nav.html`; colors, fonts and widths in
`_sass/main.scss`.

---
## 4. Write a post

### On a computer

1. Copy `_drafts/template.md` → `_posts/YYYY-MM-DD-slug.md`
   (e.g. `_posts/2026-09-20-first-real-post.md` — real date, dashes only).
2. Edit the front matter (between the `---` lines):
   ```yaml
   ---
   layout: post
   title: "My Post Title"
   date: 2026-09-20 10:00:00 +0000
   tags: [ideas, notes]
   ---
   ```
   A `date` in the future stays hidden until then. `tags` is optional.
3. Write the body in Markdown.
4. Commit. With `jekyll serve` running, refresh to preview.

### On mobile (GitHub app or github.com)

Same, without a preview:

1. In the repo, open `_drafts/template.md`, copy its contents.
2. Create a new file: `_posts/2026-09-20-slug.md`.
3. Paste, edit `title` + `date`, keep the `---` fences, write.
4. Commit. Once Pages is enabled the site rebuilds in ~1 minute.

### Drafts

Anything in `_drafts/` never publishes. Preview drafts with
`jekyll serve --drafts`. Move the file to `_posts/` with a dated name to publish.

### Cite a tweet

Anywhere in a post:

```liquid
{% include tweet.html
   handle="@someone" name="Someone"
   url="https://x.com/someone/status/123"
   date="2026-01-01"
   text="the quoted text" %}
```

Only `url` and `text` are required. Renders as a static quote box — no
JavaScript, nothing loads from X, and it survives the tweet being deleted.

### Add a photo to a post

```liquid
{% include photo.html src="/assets/photos/foo.webp" alt="Alt text" caption="Optional caption" %}
```

---

## 5. Galleries

A gallery is `_galleries/<slug>.md` plus one file per photo. Everything is
plain text; edit by hand whenever.

```yaml
# _galleries/demo.md  (the body, if any, is shown under the description)
title: Demo gallery
date: 2026-09-20
description: One or two sentences shown under the title.
cover: "01"            # which photo's thumb represents it on /galleries/
```

```yaml
# _photos/demo/01.md  (all fields optional except gallery + image)
gallery: demo
image: /assets/photos/demo/beach-01-full.webp
thumb: /assets/photos/demo/beach-01-thumb.webp   # falls back to image
alt: Flower in golden light
note: Golden hour in the garden.                 # shown under the photo
place: Garching, Germany
camera: FUJIFILM X-A3
lens: XF35mmF2 R WR
focal_length: 35 mm
aperture: f/2.0
shutter: 1/1600
iso: 200
captured_at: 2026-09-20 02:09:04
```

The Markdown body of a photo file, if any, is rendered as a comment under the
caption. Empty or missing fields are skipped. Photos appear in filename order
(`01`, `02`, ...); each is at `/galleries/<slug>/<NN>/`.

### Import helper

```sh
mise exec -- bundle exec ruby scripts/import-gallery.rb <slug> <image-dir> [--title "Title"]
```

Copies the images to `assets/photos/<slug>/NN.<ext>` (no resizing), writes
`_photos/<slug>/NN.md` stubs (EXIF filled in if `exiftool` is installed) and
`_galleries/<slug>.md` if missing. Numbering continues after the highest
existing `NN`; it never overwrites anything.

---
## 6. Publish

The repo is **private** for now. GitHub Pages does not build private repos on
the free plan, so previewing = `jekyll serve` locally.

When ready to go live:

1. Make the repo **public** (Settings → General → Change visibility).
2. Settings → **Pages** → Source: **GitHub Actions**.
3. Push to `main`. The `Build and deploy` workflow publishes the site.
   Live at `https://cirquit.github.io/blog/`.

### Custom domain (later)

1. Add a file named `CNAME` at the repo root containing just the domain
   (e.g. `blog.example.com`).
2. At your DNS provider: a `CNAME` record for the subdomain → `cirquit.github.io`
   (for an apex domain, four `A` records to GitHub's Pages IPs — current list in
   [GitHub's docs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. Settings → Pages → enter the domain, wait for DNS, tick **Enforce HTTPS**.
4. In `_config.yml`: set `baseurl: ""` and `url: "https://blog.example.com"`.

---

---

## 7. Notes

- Fonts self-hosted, `font-display: swap`, body weight preloaded; full CSS
  inlined into `<head>`; no render-blocking requests.
- No JavaScript except `assets/js/photo-nav.js` (deferred, photo pages only).
  The site works fully without it.
