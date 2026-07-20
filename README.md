# Personal Website

Personal website of Yuqing (Jacky) Jiang.

A lightweight single-page static site (plain HTML/CSS/JS), responsive on both
desktop and mobile. Academic-portfolio layout: hero, about, projects,
experience, and contact, with a light/dark theme toggle (system default +
manual override persisted in `localStorage`). No build step or dependencies.

It may later be migrated to a static site generator such as
[Hexo](https://github.com/hexojs/hexo) if a blog is added; the current layout
maps cleanly onto Hexo's Researcher theme.

## Structure

- `index.html` — page content
- `css/style.css` — styles and theming
- `js/main.js` — theme toggle and footer year

## Local preview

Open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## License

[MIT](LICENSE)
