# jackyjiang08.github.io

Personal website of Yuqing (Jacky) Jiang — live at
<https://jackyjiang08.github.io/>.

A dependency-free static site (plain HTML/CSS/JS, no build step), deployed
automatically by GitHub Pages on every push to `main`.

## Features

- Intern-focused single-page portfolio: hero profile card, impact metrics
  strip with count-up animation, highlights, experience timeline, filterable
  project grid, publication, skills, education, and a working contact form
- Light/dark theme toggle (light default, persisted in `localStorage`)
- Original interactive constellation background (cursor + click effects)
- Résumé download with an AI/ML ↔ Data role toggle that re-emphasizes
  matching projects
- Command palette (Cmd/Ctrl-K) with fuzzy search over navigation and actions
- Contact form via [Web3Forms](https://web3forms.com) with honeypot spam
  protection (paste your access key in `index.html` to activate)
- SEO: JSON-LD Person schema, Open Graph/Twitter cards, sitemap, robots.txt
- Accessibility: WCAG-AA contrast in both themes, full keyboard support,
  `prefers-reduced-motion` respected by every animation, semantic landmarks,
  skip-to-content link

## Structure

```
index.html            # single page
css/
  tokens.css          # design tokens: both theme palettes, type, spacing, radii
  base.css            # reset, base typography
  layout.css          # container, nav, two-column grid, footer
  components.css      # buttons, cards, chips, palette, form controls
  sections.css        # per-section styles (hero … contact)
  utilities.css       # helpers, focus styles, reduced-motion rules
  background.css      # background canvas placement
js/
  main.js             # theme toggle, scrollspy + progress, reveal, metrics, filters
  background.js       # interactive constellation background
  resume-toggle.js    # AI/Data résumé variant switch
  command-palette.js  # Cmd/Ctrl-K palette
  contact.js          # form submission + copy email
assets/
  img/                # headshot, favicons, og-image
  resume/             # résumé PDFs (AI + DA variants)
sitemap.xml
robots.txt
```

## Local preview

No build step — serve the folder and open it:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. (Or just open `index.html` directly.)

## Credits / inspiration

The overall layout direction was inspired by personal sites of peers and the
broader CS-academic homepage tradition (sidebar profile, news/highlights
section, project cards). No code was copied from those sites — all markup,
styles, and effects here (including the canvas background, typing line, and
command palette) are original implementations written for this repo.

## License

[MIT](LICENSE)
