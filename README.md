# blog

Jekyll site, hosted on GitHub Pages. Writing at `/writing/`, photo series at `/series/`.

Ruby is pinned by [mise](https://mise.jdx.dev/); gems install into `vendor/bundle`.

## Preview with live reload

```sh
mise install                                                          # once
mise exec -- bundle config set --local path vendor/bundle && mise exec -- bundle install   # once
mise exec -- bundle exec jekyll serve --drafts --livereload
# http://localhost:4000/blog/
```

## Add photos

```sh
mise exec -- bundle exec ruby scripts/import-series.rb <slug> <dir-with-originals> [--title "Title"]
```

Needs ImageMagick (`brew install imagemagick`). Originals are only read, so they
can live anywhere. For each photo it writes a web-sized and a thumbnail WebP to
`assets/photos/<slug>/` and a stub `_photos/<slug>/NN.md`, plus `_series/<slug>.md`
the first time. Nothing is overwritten; running again with new photos continues the numbering.

Then edit by hand:

- `_series/<slug>.md`: `title`, `description`, `cover` (which photo is the cover), and any text below the front matter.
- `_photos/<slug>/NN.md`: `alt`, `note` (shown under the photo), and the caption fields `camera`, `lens` (focal range, e.g. `16-300mm`), `aperture`, `shutter`, `iso`, plus `place` (city; shown as "Month in place" with the month from `captured_at`). Text below the front matter is shown as a comment. Empty fields are skipped.
- Photos appear in filename order. Delete a photo by removing its `.md` and its two images.

## Add a post

Copy `_drafts/template.md` to `_posts/YYYY-MM-DD-slug.md`, set `title` and `date`, write Markdown.
`_drafts/` never publishes; preview a draft with `--drafts`.

## Publish

Push to `main`; the GitHub Action builds and deploys to `https://cirquit.github.io/blog/`
(Settings → Pages → Source: GitHub Actions, once).
