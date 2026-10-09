# Personal site — Jekyll on GitHub Pages

A minimal personal site: **About**, **CV**, **Papers** and a **Journal**
(travel, photographs, notes) laid out like a small webzine. No framework, no
build step on your side: GitHub builds it every time you push.

## Publish it (10 minutes)

1. Create a GitHub repository named **`<your-username>.github.io`** (public).
2. Upload the contents of this folder to it (drag-and-drop on github.com works,
   or `git init && git add . && git commit -m "site" && git push`).
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from
   a branch**, branch `main`, folder `/ (root)`. Save.
4. After a minute the site is live at `https://<your-username>.github.io`.
5. Open `_config.yml` and set `url` to that address.

Using a different repo name (e.g. `website`)? Set `baseurl: "/website"` in
`_config.yml`. Want your own domain later (≈ €10/year)? Add it under
Settings → Pages → Custom domain.

## What to edit

| What | Where |
|---|---|
| Name, links, email, portrait | `_config.yml` |
| Bio and "Now" | `index.html` |
| News items on the front page | `_data/news.yml` |
| CV | `_data/cv.yml` (+ put your PDF at `assets/cv.pdf`) |
| Papers | `_data/papers.yml` |
| Journal categories | `_data/categories.yml` |
| Colours, fonts, spacing | `assets/css/style.css` (tokens at the top) |

The CV, papers and news are placeholder examples: check every date and detail.

## Writing a journal entry

Create `_posts/YYYY-MM-DD-short-name.md`:

```markdown
---
title: Three days in Sarajevo
dek: One-line standfirst shown under the title and on the index.
category: travel          # travel | photo | notes (see _data/categories.yml)
location: Bosnia and Herzegovina
cover: /assets/img/journal/sarajevo/cover.jpg
featured: true            # optional: pins it as the big entry on /journal/
---

Your text in Markdown.

{% include figure.html src="/assets/img/journal/sarajevo/1.jpg" caption="A caption." %}
{% include figure.html src="/assets/img/journal/sarajevo/2.jpg" size="wide" %}
{% include figure.html src="/assets/img/journal/sarajevo/3.jpg" size="full" %}
{% include gallery.html images="/assets/img/…/a.jpg, /assets/img/…/b.jpg, /assets/img/…/c.jpg" caption="Three at once." %}
```

Photo sizes: none = text width, `wide` = wider than the text, `full` = edge to
edge. Posts dated in the future are not published until that date.

Photo exports:

| File | Long edge | Format | Target weight |
|---|---|---|---|
| `NN.jpg` (every photo) | 1920 px long edge (≥ 1080 px short edge; older posts 1600) | JPEG q 78, progressive, sRGB, metadata stripped | 200–550 KB |
| `cover.jpg` | 2000 px | JPEG q 80 | ≤ 600 KB |
| `NN-600.avif`, `NN-1000.avif`, `NN.avif` | 600 / 1000 px wide, full size (set `full_w` in the post) | AVIF q 60 | ~ two-thirds of the JPEG |
| `cover-1200.avif`, `cover.avif` | 1200 / 2000 px wide | AVIF q 60 | |

Browsers that understand AVIF (nearly all) download only the size they need;
the JPEG is the fallback. Put `avif: true` in a post's front matter only once
the AVIF copies exist next to its photos, otherwise leave it out and the JPEGs
are used.

The four sample posts and `assets/img/journal/*` are placeholders; delete them
when you have your own.

## Preview locally (optional)

```bash
bundle install
bundle exec jekyll serve     # → http://localhost:4000
```

## Notes

- Fonts (Inter, Newsreader — SIL Open Font License) are self-hosted in
  `assets/fonts/`, so visitors' browsers never contact Google Fonts.
- Light/dark follows the visitor's system; the footer toggle overrides it.
- RSS feed for the journal at `/journal/feed.xml`; SEO/social tags are generated
  automatically. The CV page prints cleanly (Ctrl/Cmd-P).

## Globe and lattice

- **Journal globe** (`assets/js/globe.js`, three.js, loaded only when the globe scrolls into view).
  A post appears on it when its front matter has a route of `[lat, lon]` stops, e.g.
  `route: [[44.49, 11.34], [43.77, 11.26]]`. The highlighted countries are listed in
  `_data/travel.yml`; changing that list needs the globe rebuilt (ask Claude).
- **Papers lattice** (`assets/js/lattice.js`, plain canvas, ~3 KB). Spacing, blockade radius and
  decay time are the constants at the top of the file.

Both respect "reduce motion" and pause when off screen.
