<p align="center">
    <strong>English</strong> ·
    <a href="./README.md">简体中文</a>
</p>

<p align="center">
    <strong><span style="font-size:1.6em">hexo-theme-yelee-next</span></strong><br>
    <em>A modernized remake of the Hexo theme Yelee — same soul, brand-new stack</em>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Hexo-%3E%3D6.0-0e83cd.svg">
    <img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg">
    <img src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg">
    <img src="https://img.shields.io/badge/AI%20pair-DeepSeek--V4.1--Flash-2b6cb0.svg">
    <a href="https://github.com/AkiSenn/hexo-theme-yelee-next/stargazers"><img src="https://img.shields.io/github/stars/AkiSenn/hexo-theme-yelee-next?style=flat"></a>
</p>

&emsp;&emsp;**yelee-next** is a full remake of [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee) (by [MOxFIVE](https://github.com/MOxFIVE), itself derived from [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia) by [Litten](https://github.com/litten)). It keeps the recognizable look — left profile rail, full-screen background photo, translucent article cards — while replacing the entire 2016-era stack: no jQuery, no require.js, no FontAwesome, no third-party CDN. Just native ES modules, modern CSS and content-hashed long-term caching.

> 📖 中文文档：**[README.md](./README.md)**

---

## Introduction

A two-column theme designed for reading. Sensible defaults work out of the box — search, TOC, reading progress, dark mode, lightbox and code copy are built in. Comments, ICP filings, social icons, analytics and friend links are **render-on-demand**: nothing shows up (and no blank box is left behind) until you fill them in.

---

## Features

- **Zero front-end dependencies**: two native ES modules (`app.js` + `search.js`); no jQuery / require.js / FontAwesome
- **Zero render-blocking assets**: critical CSS inlined, main stylesheet loaded async — measured 0 blocking stylesheets
- **Cache friendly**: content-hash fingerprinting (`?v=<hash>`) with immutable caching; optional Cloudflare `_headers` generation
- **Local search**: build-time `search.json` index matched by vanilla JS — no search plugin required
- **Dark mode**: light / dark / system, remembered in localStorage, no flash of wrong theme
- **Original animations restored**: random homepage reveal, avatar zoom-in, card accent bar, sliding side panels, pulsing footer heart
- **Mobile layout matches the original**: the profile block is a standalone top module; the drawer holds navigation only
- **Avatar click**: shakes, then returns home; on the home page it just shakes and scrolls back to top
- **Reading experience**: scroll-spy TOC, reading progress bar, native `<dialog>` lightbox, code-block language label + copy button
- **Comments**: giscus / waline / twikoo / disqus / valine — off by default and lazy-loaded
- **Accessibility**: semantic markup, tablist, focus-visible, skip-link, `prefers-reduced-motion`
- **SEO**: OG, Twitter Card, schema.org JSON-LD, canonical, automatic demotion of in-post H1
- **i18n**: ships 简体中文 / English / 繁體中文 — add a file under `languages/` to extend

---

## Installation

1. Put the theme under your site's `themes/` directory (pick one):

```bash
# A. Link it (best while developing — theme sources stay in their own repo)
#    Uses a directory junction on Windows, a symlink elsewhere; no cmd/mklink needed
node <theme-dir>/tools/link.mjs  /path/to/hexo-site

# B. Just copy it
cp -r <theme-dir> /path/to/hexo-site/themes/yelee-next

# C. As a git submodule
git submodule add https://github.com/AkiSenn/hexo-theme-yelee-next.git /path/to/hexo-site/themes/yelee-next
```

2. Point the site at it — `theme: yelee-next`

3. Copy the starter config to your site root and fill in the fields marked 👈 (author, social links, filings, analytics IDs…):

```bash
cp themes/yelee-next/docs/starter-config.yml  /path/to/hexo-site/_config.yelee-next.yml
```

4. Build and preview: `hexo clean && hexo g && hexo s`

> **Requirements**: Hexo `>= 6`; the only renderer needed is `hexo-renderer-ejs` (bundled with Hexo's default template).
> You do **not** need `hexo-renderer-stylus` or `hexo-generator-search`.

---

## Configuration

Precedence:

```
<site>/_config.yelee-next.yml  >  theme _config.yml  >  built-in defaults (DEFAULTS in scripts/00-config.js)
```

| File | What it is |
| --- | --- |
| [`_config.yml`](./_config.yml) | Theme defaults, fully commented (comments are in Chinese) |
| [`docs/starter-config.yml`](./docs/starter-config.yml) | Starter config template — copy it and fill in the 👈 fields |
| [`docs/migration.md`](./docs/migration.md) | Migrating from yelee 3.5: legacy keys are migrated automatically (doc in Chinese) |
| [`docs/caching.md`](./docs/caching.md) | Performance & caching: fingerprinting, Cloudflare `_headers` (doc in Chinese) |

**Render-on-demand options**

| Config | When left empty |
| --- | --- |
| `subnav` (social icons) | no icon row at the bottom of the sidebar |
| `friends` (friend links) | no “Links” tab |
| `profile.aboutme` | no “About” tab |
| `footer.icp` / `footer.police_icp` | no filing line in the footer (the two are independent) |
| `footer.runtime.since` | no “running for N days” line |
| `analytics.*` | no analytics script is loaded at all |
| `comments.enable: false` (default) | comment area, load bar and “jump to comments” buttons are not rendered at all |

> The `legacy` branch keeps the full original yelee 3.5 source, so you can `git diff legacy main` to see exactly what changed.

---

## Migrating from yelee

Save your old `themes/yelee/_config.yml` as `<site>/_config.yelee-next.yml`. Legacy keys are detected and migrated automatically, with a build-time log. Full key mapping: [`docs/migration.md`](./docs/migration.md) (Chinese).

---

## Deployment

Cloud CI (Cloudflare Workers Builds, GitHub Actions…) builds from a Git checkout, where **a local directory link does not exist** — so the site repo needs a copy of the theme:

```bash
# Sync the theme into the site repo (idempotent; --check only compares)
node <theme-dir>/tools/sync.mjs  /path/to/hexo-site
node <theme-dir>/tools/sync.mjs  /path/to/hexo-site --check

# Post-build audit: missing asset references, blocking requests, leftover legacy deps
node <theme-dir>/tools/check.mjs  /path/to/hexo-site/public
```

The theme repo stays the single source of truth; the copy in the site repo is generated, and its `SYNCED.json` records origin, timestamp and fingerprint.

### CI

The repo ships a GitHub Actions check (`.github/workflows/check.yml`): secret guard → YAML validation → build a minimal Hexo site → asset audit → 18 signature checks.
To run the very same steps locally before pushing:

```bash
node tools/local-ci.mjs
```

---

## Performance

Measured on a real site (21 pages, 3 posts):

| Asset | Raw | Transfer (brotli) | Blocking |
| --- | --- | --- | --- |
| `index.html` (incl. inlined critical CSS + SVG sprite) | 42 KB | 11 KB | — |
| `css/theme.css?v=<hash>` | 47 KB | 16 KB | no (`preload`, async) |
| `js/app.js?v=<hash>` | 41 KB | 17 KB | no (modules are deferred) |
| `js/search.js?v=<hash>` | 4.7 KB | 2 KB | no |
| `search.json` | 4.8 KB | 2.5 KB | no (fetched on first search) |
| Background WebP (one per page, only one loaded) | 7–50 KB | — | no (`preload` + `fetchpriority=high`) |

First visit: about **8 requests / 87 KB**. The original theme shipped jQuery + require.js + FontAwesome + four CDN stylesheets + site-wide MathJax — an order of magnitude more.
`node tools/check.mjs <public>` reproduces these numbers.

---

## Credits

- **Engineering**: most of this remake — architecture, layouts, stylesheets, front-end modules, build plugins, docs and verification — was **built by the AI pair programmer [DeepSeek-V4.1-Flash](https://www.deepseek.com/) 🐋**, working from AkiSenn's requirements, reviews and repeated debugging rounds.
- **Remake author / maintainer**: [AkiSenn](https://github.com/AkiSenn).
- **Original theme**: [MOxFIVE](https://github.com/MOxFIVE) — [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee); the visual and interaction language of this theme is his.
- **Earlier ancestor**: [Litten](https://github.com/litten) — [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia).
- The footer line `Hexo · Yelee Next <version>（AkiSenn & MOxFIVE）` is the theme's authorship credit, hard-coded in the template on purpose.
- Default visual asset: the theme ships a **whale placeholder avatar** (`source/img/avatar.png`) — replace it with your own image.

---

## License

[MIT](./LICENSE) © AkiSenn (remake) · MOxFIVE (original theme) · Litten (yilia)

<!--
Screenshot placeholder (enable when available):
<p align="center">
    <img src="docs/screenshot-home.png" alt="yelee-next home">
    <img src="docs/screenshot-post.png" alt="yelee-next article">
</p>
-->
