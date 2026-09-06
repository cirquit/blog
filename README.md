# blog

Personal blog. Jekyll + a vendored fork of the [Tale](https://github.com/chesterhow/tale)
theme (MIT), with comments and analytics removed. Hosted on GitHub Pages via
GitHub Actions.

## Local development

Ruby is managed by [mise](https://mise.jdx.dev/) and pinned in `mise.toml`.
Nothing is installed globally; gems land in `vendor/bundle`.

```sh
mise install                              # one-time: install the pinned Ruby
mise exec -- bundle config set --local path vendor/bundle
mise exec -- bundle install
mise exec -- bundle exec jekyll serve     # http://localhost:4000/blog/
```

Add `--drafts` to preview files in `_drafts/`.

## Writing a post

Copy `_drafts/template.md` to `_posts/YYYY-MM-DD-slug.md`, fill in the front
matter, commit. This works from the GitHub mobile/web app. Once Pages is
enabled the site rebuilds on every push to `main`.

## Publishing (when ready to go public)

1. Make the repo public (GitHub Pages does not build private repos on the free plan).
2. Settings -> Pages -> Source: "GitHub Actions".
3. Push to `main`; the `Build and deploy` workflow publishes the site.
4. Custom domain: add a `CNAME` file, configure registrar DNS, set the domain
   in Settings -> Pages, enable "Enforce HTTPS". Then set `baseurl: ""` and
   `url:` to the domain in `_config.yml`.
