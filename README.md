<div align="center">

# jackyjiang08.github.io

**Personal website of Yuqing (Jacky) Jiang** — CS & Statistics @ UIUC
Quantitative Developer · Data Scientist · ML Engineer

[![Live site](https://img.shields.io/badge/live-jackyjiang08.github.io-2563eb?style=flat-square)](https://jackyjiang08.github.io/)
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
| **Portfolio sections** | Hero profile card with typed role line, impact-metrics strip with count-up animation, highlights, experience timeline, filterable project grid, publication, skills, and education |
| **Résumé toggle** | Downloadable résumé with an AI/ML ↔ Data Analytics variant switch that re-emphasizes the matching projects |
| **Command palette** | `Cmd`/`Ctrl` + `K` fuzzy search across navigation and quick actions |
| **Theming** | Light/dark toggle, light as default, persisted in `localStorage` |
| **Motion** | Original interactive constellation canvas background with cursor and click response |
| **Contact** | [Web3Forms](https://web3forms.com)-backed form with honeypot spam protection and a mail-client fallback, plus copy-to-clipboard email |
| **SEO** | JSON-LD `Person` schema, Open Graph and Twitter cards, `sitemap.xml`, `robots.txt` |
| **Accessibility** | WCAG-AA contrast in both themes, full keyboard support, semantic landmarks, skip-to-content link, and `prefers-reduced-motion` honored by every animation |

## Tech stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Canvas API](https://img.shields.io/badge/Canvas_API-000?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222?style=flat-square&logo=githubpages&logoColor=white)

No runtime dependencies. Styling is organized with CSS custom properties
(design tokens) across layered stylesheets; behavior is split into small
vanilla scripts, each owning a single concern.

## Project structure

```text
index.html              # the entire page — semantic sections, JSON-LD, meta
css/
  tokens.css            # design tokens: both theme palettes, type, spacing, radii
  base.css              # reset and base typography
  layout.css            # container, nav, two-column grid, footer
  components.css        # buttons, cards, chips, command palette, form controls
  sections.css          # per-section styles (hero … contact)
  utilities.css         # helpers, focus styles, reduced-motion rules
  background.css        # background canvas placement
js/
  main.js               # theme toggle, scrollspy + progress, reveal, metrics, filters
  background.js         # interactive constellation background
  resume-toggle.js      # AI/Data résumé variant switch
  command-palette.js    # Cmd/Ctrl-K palette
  contact.js            # form submission + copy email
assets/
  img/                  # headshot, favicons, Open Graph image
  resume/               # résumé PDFs (AI/ML and Data Analytics variants)
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

## Deployment

GitHub Pages serves `main` from the repository root. Pushing to `main` publishes
within a minute:

```bash
git push origin main
```

## Credits

The layout direction draws on the CS-academic homepage tradition — sidebar
profile, news/highlights section, project cards — and on personal sites of
peers. No code was copied: the markup, styles, canvas background, typing line,
and command palette are all original implementations written for this
repository.

## License

Released under the [MIT License](LICENSE). The résumé PDFs, headshot, and
written content are personal material — please do not reuse them.
