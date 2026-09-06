# blog

Personal blog. Jekyll + a vendored fork of the [Tale](https://github.com/chesterhow/tale)
theme (MIT), comments and analytics removed, font self-hosted, CSS inlined.
Hosted on GitHub Pages, built by GitHub Actions.

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
# → http://localhost:4000/blog/   (rebuilds + reloads the browser on save)
```

`--drafts` also renders `_drafts/`. Drop it to preview exactly what will publish.

---

## 2. Where everything lives

| Path | What it is | Touch it? |
|---|---|---|
| `_config.yml` | Site name, your name, URL, build settings | **Yes — start here** |
| `_posts/` | One Markdown file per published post | **Every time you write** |
| `_drafts/` | Unpublished drafts. `template.md` is the starting point | When starting a post |
| `_pages/about.md` | The About page | Occasionally |
| `_pages/404.html` | "Not found" page | Rarely |
| `_pages/tags.html` | Auto-generated tag index | Never |
| `_includes/navigation.html` | The top nav links | To add/rename menu items |
| `_includes/footer.html` | The footer line | To change the footer |
| `_includes/tweet.html` | The tweet-citation snippet | Never (just use it — see §5) |
| `_includes/head.html` | `<head>`: fonts, inlined CSS, favicons, SEO | Rarely |
| `_layouts/` | Page skeletons (`default`, `home`, `post`) | Rarely |
| `_sass/tale/_variables.scss` | **Colors and fonts** | To restyle (see §4) |
| `_sass/tale/*.scss` | The rest of the stylesheet | To restyle |
| `assets/fonts/` | Self-hosted Libre Baskerville (woff2) | Never |
| `assets/favicon-*.png`, `favicon.ico` | Browser-tab icons | To change the icon |
| `.github/workflows/deploy.yml` | The publish robot | Never |
| `Gemfile` / `mise.toml` | Ruby + gem versions | Never |

Ignored (regenerated, never committed): `_site/`, `vendor/`, `.jekyll-cache/`.

---

## 3. Customize the site

Edit `_config.yml` — the top block has four `# TODO` fields:

```yaml
title:        My Blog          # header + browser tab
description:  "A personal blog."# SEO + RSS feed
author:
  name:       Your Name        # "Written by ..." under each post
```

Config changes need a **server restart** (Ctrl-C, re-run `jekyll serve`).
Everything else hot-reloads.

**Nav menu:** `_includes/navigation.html` — add/remove `<li><a>` lines.
**Footer:** `_includes/footer.html`.
**About page:** `_pages/about.md` — plain Markdown.

---

## 4. Restyle (colors + fonts)

`_sass/tale/_variables.scss` holds every color and font:

```scss
$default-color:  #555;   // body text
$default-shade:  #353535; // headings
$blue:           #4a9ae1; // links + accents
$serif-primary:  'Libre Baskerville', 'Times New Roman', serif; // body font
$sans-serif:     'Helvetica Neue', ...;  // headings + nav
```

Change a value, save, the browser reloads. To swap the body font entirely,
replace the files in `assets/fonts/`, update the `@font-face` blocks in
`_includes/head.html`, and update `$serif-primary`.

---

## 5. Write a post

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

### Images

Put the file in `assets/`, reference it: `![alt text](/blog/assets/photo.jpg)`.
Compress it first (aim < 200 KB) — one raw photo outweighs the whole rest of the page.

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

## 7. Performance notes

Already done, don't undo:

- Font self-hosted (`assets/fonts/`), `font-display: swap`, 400 weight preloaded.
- Full CSS inlined into `<head>` — zero render-blocking requests.
- `favicon.ico` is a 1.4 KB PNG-in-ICO.
- No JavaScript anywhere.

First load: ~25 KB, one domain, one request on the critical path.
