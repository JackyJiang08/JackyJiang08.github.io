<div align="center">

# jackyjiang08.github.io

**Personal website of Yuqing (Jacky) Jiang** — CS & Statistics @ UIUC
Quantitative Developer · Data Scientist · ML Engineer

[![Live site](https://img.shields.io/badge/live-jackyjiang08.github.io-274c72?style=flat-square)](https://jackyjiang08.github.io/)
[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-222?style=flat-square&logo=github)](https://pages.github.com/)
[![Build step](https://img.shields.io/badge/build-none-16a34a?style=flat-square)](#getting-started)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Overview

A single-page portfolio built with plain HTML, CSS, and JavaScript — no
framework, no bundler, no dependencies. Every push to `main` is deployed
automatically by GitHub Pages, so the source in this repository is exactly what
ships to production.

The site is designed around one goal: let a recruiter or hiring manager
understand the work in under a minute, on any device, with or without
JavaScript-heavy effects.

## Features

| | |
|---|---|
| **Portfolio sections** | Academic-style profile sidebar, highlights, experience timeline, filterable project grid, publication, skills, and education |
| **Résumé viewer** | View-only in-page PDF viewer ([PDF.js](https://mozilla.github.io/pdf.js/)) with an AI/ML ↔ Data variant switch, opened from the profile sidebar |
| **Command palette** | `Cmd`/`Ctrl` + `K` fuzzy search across navigation and quick actions |
| **Theming** | Light/dark toggle, light as default, persisted in `localStorage` |
| **Motion** | [canvas-nest.js](https://github.com/hustcc/canvas-nest.js) cursor-following network background, plus an original click ripple/burst effect |
| **Contact** | [Web3Forms](https://web3forms.com)-backed form with honeypot spam protection and a mail-client fallback, plus copy-to-clipboard email |
| **SEO** | JSON-LD `Person` schema, Open Graph and Twitter cards, `sitemap.xml`, `robots.txt` |
| **Accessibility** | WCAG-AA contrast in both themes, full keyboard support, semantic landmarks, skip-to-content link, and `prefers-reduced-motion` honored by every animation |

## Tech stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Canvas API](https://img.shields.io/badge/Canvas_API-000?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222?style=flat-square&logo=githubpages&logoColor=white)

Runtime dependencies are vendored, never hotlinked:
[canvas-nest.js](https://github.com/hustcc/canvas-nest.js) (MIT) for the
ambient background and [PDF.js](https://mozilla.github.io/pdf.js/)
(Apache-2.0) for the in-page résumé viewer. Everything else is hand-written:
styling is organized with
CSS custom properties (design tokens) across layered stylesheets; behavior is
split into small vanilla scripts, each owning a single concern.

## Project structure

```text
index.html              # the main page — semantic sections, JSON-LD, meta
misc.html               # Misc. page — hobbies, featured carousel, footprints map
album.html              # full photo album (masonry + lightbox)
css/
  tokens.css            # design tokens: both theme palettes, type, spacing, radii
  base.css              # reset and base typography
  layout.css            # container, nav, two-column grid, footer
  components.css        # buttons, cards, chips, command palette, form controls
  sections.css          # per-section styles (hero … contact)
  utilities.css         # helpers, focus styles, reduced-motion rules
  background.css        # background canvas placement
js/
  main.js               # theme toggle, scrollspy + progress, reveal, filters, highlights
  data/highlights.js    # Highlights entries — append an object to add one
  data/photos.js        # photo manifest — drop a file + append an object
  gallery.js            # photo grid, category chips, original lightbox
  background.js         # canvas-nest loader + click ripple/burst effect
  modal.js              # shared modal (dialog semantics, focus trap)
  resume-viewer.js      # view-only PDF résumé viewer (AI/Data switch)
  vendor/canvas-nest.min.js  # canvas-nest.js v2.0.4 (MIT, github.com/hustcc/canvas-nest.js)
  vendor/pdf.min.js     # PDF.js 3.11.174 (Apache-2.0, Mozilla) + pdf.worker.min.js
  command-palette.js    # Cmd/Ctrl-K palette
  contact.js            # form submission + copy email
assets/
  img/                  # headshot, favicons, Open Graph image
  maps/                 # vendored world/CN/US SVG maps (see maps/LICENSES.md)
  photos/               # gallery images (+ thumbs/), built by the photo pipeline
  resume/               # résumé PDFs (AI/ML and Data Analytics variants)
scripts/
  build-photos.mjs      # photo pipeline — see "Adding photos"
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

- **Contact form** — set a [Web3Forms](https://web3forms.com) access key in the
  `access_key` hidden input in `index.html` to receive submissions in your
  inbox. While it is empty, the form degrades gracefully: the message is handed
  off to the visitor's email client instead of being lost.
- **Theme and typography** — every color, font, radius, and spacing value lives
  in `css/tokens.css`; both palettes can be retuned from that one file.
- **Content** — all copy is authored inline in `index.html`; there is no CMS or
  data file to keep in sync.

## Adding photos

Originals live in `photos-original/<Category>/` (git-ignored, never
committed). The pipeline converts them to committed web assets:

```bash
npm install        # once — installs sharp
# drop files into photos-original/<Category>/  (jpg, jpeg, png, heic)
npm run photos     # builds assets/photos/**/*.webp + thumbs, regenerates js/data/photos.js
# review the new entries, fill in dates/captions, then commit
```

Outputs: `assets/photos/<category>/<name>.webp` (long edge 1600 px) and
`assets/photos/thumbs/<category>/<name>.webp` (long edge 400 px, used by the
masonry grid and carousel). Hand-edited `caption`/`date`/`featured` fields in
`js/data/photos.js` survive regeneration (merged by photo id).

**Featured photos**: the Misc. page carousel shows only entries with
`featured: true`; the album page always shows everything. Name a source file
with a `-feat` suffix (e.g. `kyoto-sunset-feat.jpg`) to mark it featured on
first generation — the suffix is stripped from the public filename and
caption. You can also toggle `featured` by hand in `js/data/photos.js`.

## Deployment

GitHub Pages serves `main` from the repository root. Pushing to `main` publishes
within a minute:

```bash
git push origin main
```

## Credits

The layout direction draws on the CS-academic homepage tradition — sidebar
profile, news/highlights section, project cards — and on personal sites of
peers. The ambient network background is
[canvas-nest.js](https://github.com/hustcc/canvas-nest.js) by hustcc (MIT),
vendored in `js/vendor/`. Everything else — markup, styles, click effects, and
the command palette — is original code written for this repository.

## License

Released under the [MIT License](LICENSE). The résumé PDFs, headshot, and
written content are personal material — please do not reuse them.
