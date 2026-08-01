<div align="center">

# jackyjiang08.github.io

**Personal website of Yuqing (Jacky) Jiang** — CS & Statistics @ UIUC
Quantitative Developer · Data Scientist · ML Engineer

[![Live site](https://img.shields.io/badge/live-jackyjiang08.github.io-274c72?style=flat-square)](https://jackyjiang08.github.io/)
[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-222?style=flat-square&logo=github)](https://pages.github.com/)
[![Build step](https://img.shields.io/badge/build-none-16a34a?style=flat-square)](#getting-started)
[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-blue?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

</div>

---

## Overview

Three pages of plain HTML, CSS, and JavaScript — no framework, no bundler,
**no runtime dependencies** (npm is used only by the offline photo/map build
scripts):

- **`index.html`** — the portfolio: profile sidebar, highlights, experience,
  projects, publication, skills, education, contact.
- **`misc.html`** — beyond work: hobbies, a featured-photo carousel, and an
  interactive travel Footprints map.
- **`album.html`** — the full photo collection as a masonry collage.

Every push to `main` is deployed automatically by GitHub Pages, so the source
in this repository is exactly what ships to production. The site is designed
around one goal: let a recruiter or hiring manager understand the work in
under a minute, on any device.

## Features

| | |
|---|---|
| **Portfolio sections** | Academic-style profile sidebar, highlights with year-filtered archive, experience timeline, project grid, publication, skills, and education |
| **Résumé viewer** | View-only in-page PDF viewer ([PDF.js](https://mozilla.github.io/pdf.js/)) with an AI/ML ↔ Data variant switch, opened from the profile sidebar |
| **Command palette** | `Cmd`/`Ctrl` + `K` fuzzy search (with number + ASCII aliases) across navigation and quick actions |
| **Misc. page** | Hobby grid with original line icons, featured marquee carousel, and a full album page with automatic EXIF-date ordering |
| **Footprints map** | Single-projection composite world map (Natural Earth) with GPU-smooth zoom that re-bakes into the viewBox for vector crispness, CN/US province/state detail layers, region/country/city popovers, and animated progress rings |
| **Page views** | Live counter in the sidebar backed by the free Abacus API, hidden gracefully when unreachable |
| **Theming** | Light/dark toggle, light as default, persisted in `localStorage` |
| **Motion** | [canvas-nest.js](https://github.com/hustcc/canvas-nest.js) cursor-following network background, plus an original click ripple/burst effect |
| **Contact** | [Web3Forms](https://web3forms.com)-backed form with honeypot spam protection and a mail-client fallback |
| **SEO** | JSON-LD `Person` schema, Open Graph and Twitter cards, `sitemap.xml`, `robots.txt` |
| **Accessibility** | WCAG-AA contrast in both themes, full keyboard support, semantic landmarks, skip-to-content link, and `prefers-reduced-motion` honored by every animation |

## Tech stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Canvas API](https://img.shields.io/badge/Canvas_API-000?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222?style=flat-square&logo=githubpages&logoColor=white)

Runtime code is vendored, never hotlinked:
[canvas-nest.js](https://github.com/hustcc/canvas-nest.js) (MIT) for the
ambient background and [PDF.js](https://mozilla.github.io/pdf.js/)
(Apache-2.0) for the in-page résumé viewer. Everything else is hand-written:
styling is organized with CSS custom properties (design tokens) across layered
stylesheets; behavior is split into small vanilla scripts, each owning a
single concern.

## Project structure

```text
index.html              # portfolio page — semantic sections, JSON-LD, meta
misc.html               # Misc. page — hobbies, featured carousel, Footprints map
album.html              # full photo album (masonry + lightbox)
css/
  tokens.css            # design tokens: both theme palettes, type, spacing, radii
  base.css              # reset and base typography
  layout.css            # container, nav, two-column grid, footer
  components.css        # buttons, cards, chips, modal, palette, form controls
  sections.css          # per-section styles (hero … contact, Misc., map)
  utilities.css         # helpers, focus styles, reduced-motion rules
  background.css        # background canvas placement
js/
  main.js               # theme toggle, scrollspy + progress, reveal, highlights, views counter
  gallery.js            # shared lightbox, album masonry, featured carousel
  footprints.js         # Footprints map: camera, popovers, rings
  background.js         # canvas-nest loader + click ripple/burst effect
  modal.js              # shared modal (dialog semantics, focus trap)
  resume-viewer.js      # view-only PDF résumé viewer (AI/Data switch)
  command-palette.js    # Cmd/Ctrl-K palette
  contact.js            # form submission
  data/
    highlights.js       # Highlights entries — append an object to add one
    photos.js           # photo manifest — GENERATED by the inbox pipeline
    footprints.js       # visited countries/regions/cities
  vendor/
    canvas-nest.min.js  # canvas-nest.js v2.0.4 (MIT)
    pdf.min.js          # PDF.js 3.11.174 (Apache-2.0) + pdf.worker.min.js
assets/
  img/                  # headshot, favicons, Open Graph image
  maps/                 # generated composite map + LICENSES.md (Natural Earth, PD)
  photos/               # gallery WebPs (+ thumbs/) in date folders, built by the pipeline
  resume/               # résumé PDFs (AI/ML and Data Analytics variants)
data/
  maps-src/             # Natural Earth source data for the map build
photos-inbox/           # photo upload inbox — see its README
scripts/
  process-inbox.mjs     # photo pipeline (CI + npm run photos)
  build-map.mjs         # composite map builder (npm run map)
sitemap.xml
robots.txt
```

## Getting started

Clone and serve the folder — there is nothing to install or build.

```bash
git clone https://github.com/JackyJiang08/JackyJiang08.github.io.git
cd JackyJiang08.github.io
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly in a browser
also works, though a local server better matches production behavior for
absolute paths.

## Configuration

- **Contact form** — the `access_key` hidden input in `index.html` holds the
  [Web3Forms](https://web3forms.com) key; replace it to route submissions to
  a different inbox. If the key is ever removed, the form degrades gracefully
  by handing the message to the visitor's email client.
- **Theme and typography** — every color, font, radius, and spacing value
  lives in `css/tokens.css`; both palettes can be retuned from that one file.
- **Content** — portfolio copy is authored inline in `index.html`;
  highlights, photos, and footprints live in `js/data/`.

## Adding photos

Photos are added by dropping files into `photos-inbox/<tag>/` — a GitHub
Action converts them to WebP + thumbnails, adds them to the album, links them
to the Footprints map (the folder tag names the country/region/city), and
empties the inbox. Full conventions in `photos-inbox/README.md`.

**From your phone** — no tooling needed:

1. Open github.com in a mobile browser → `photos-inbox/<tag>/`
2. Add file → Upload files (≤ 25 MB each) → commit
3. The Action publishes in ~1–2 minutes

**From a computer** — either the same web upload, or on a local clone:

```bash
npm install        # once — installs sharp + exif-reader
# drop files into photos-inbox/<tag>/  (jpg, jpeg, png, heic)
npm run photos     # runs the same processor the Action uses
git add -A && git commit && git push
```

Conventions: a `-feat` filename suffix puts the photo in the Misc. carousel;
a `YYYY-MM_` filename prefix overrides the date (otherwise EXIF
`DateTimeOriginal`, then file mtime); everything sorts newest-first. Manual
edits to `caption`/`date`/`featured` in `js/data/photos.js` survive
reprocessing.

## Deployment

GitHub Pages serves `main` from the repository root. Pushing to `main`
publishes within a minute:

```bash
git push origin main
```

## Credits

The layout direction draws on the CS-academic homepage tradition — sidebar
profile, news/highlights section, project cards — and on personal sites of
peers. The ambient network background is
[canvas-nest.js](https://github.com/hustcc/canvas-nest.js) by hustcc (MIT),
the résumé viewer uses [PDF.js](https://mozilla.github.io/pdf.js/) (Mozilla,
Apache-2.0), and the map geometry is
[Natural Earth](https://www.naturalearthdata.com/) (public domain).
Everything else — markup, styles, the map camera, click effects, and the
command palette — is original code written for this repository.

## License

This repository's original content is licensed under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
(attribution required · non-commercial · share-alike). Exceptions: the
vendored components in `js/vendor/` (canvas-nest.js, MIT; PDF.js,
Apache-2.0) and the Natural Earth data in `data/maps-src/` (public domain)
remain under their own licenses; the résumé PDFs, headshot, and personal
written content are personal material — all rights reserved, no reuse
permitted.
