<p align="center">
  <strong>English</strong> ·
  <a href="./README.md">简体中文</a>
</p>

<p align="center">
  <strong>hexo-theme-yelee-next</strong><br>
  <em>A modern remake of the Yelee theme for Hexo</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hexo-%3E%3D6.0-0e83cd.svg">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg">
  <a href="https://github.com/AkiSenn/hexo-theme-yelee-next/stargazers"><img src="https://img.shields.io/github/stars/AkiSenn/hexo-theme-yelee-next?style=flat"></a>
</p>

yelee-next modernizes [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee), preserving its sidebar, full-screen background and translucent cards while using native ES modules and modern CSS.

![yelee-next shown on desktop, tablet and phone](./docs/responsive-showcase.png)

Showcase based on the [akisenn.com](https://akisenn.com/) homepage.

## Features

- No jQuery, require.js, FontAwesome or third-party CDN dependencies
- Built-in local search, table of contents, reading progress, dark mode, image lightbox and code copy
- Comments, analytics and social links appear only when configured
- Supports giscus, waline, twikoo, disqus and valine
- Ships with Simplified Chinese, Traditional Chinese and English
- Includes asset fingerprinting, cache header generation, SEO metadata and accessibility support

## Installation

Requires Hexo 6 or later and hexo-renderer-ejs. Install the theme in your site's themes/yelee-next directory by linking, copying or adding it as a Git submodule:

~~~bash
node <theme-dir>/tools/link.mjs /path/to/hexo-site
cp -r <theme-dir> /path/to/hexo-site/themes/yelee-next
git submodule add https://github.com/AkiSenn/hexo-theme-yelee-next.git /path/to/hexo-site/themes/yelee-next
~~~

Copy the starter config to your site root and select the theme:

~~~bash
cp themes/yelee-next/docs/starter-config.yml /path/to/hexo-site/_config.yelee-next.yml
~~~

~~~yaml
theme: yelee-next
~~~

Build and preview:

~~~bash
hexo clean && hexo g && hexo s
~~~

## Configuration

Configuration precedence: site _config.yelee-next.yml → theme _config.yml → built-in defaults.

| Guide | Contents |
| --- | --- |
| [Theme config](./_config.yml) | Theme defaults |
| [Starter config](./docs/starter-config.yml) | Copy-ready configuration template |
| [Migration guide (中文)](./docs/migration.md) · [English](./docs/migration.en.md) | Migrate from Yelee 3.5 |
| [Caching guide (中文)](./docs/caching.md) · [English](./docs/caching.en.md) | Asset fingerprinting and caching |
| [Changelog](./CHANGELOG.md) | Release history (Chinese) |

## Deployment

Cloud builds need a copy of the theme in the site repository. Use the sync tool to update it:

~~~bash
node <theme-dir>/tools/sync.mjs /path/to/hexo-site
~~~

Audit the generated site:

~~~bash
node <theme-dir>/tools/check.mjs /path/to/hexo-site/public
node <theme-dir>/tools/seo-audit.mjs /path/to/hexo-site/public
~~~

## Credits

Based on [Yelee by MOxFIVE](https://github.com/MOxFIVE/hexo-theme-yelee), whose layout builds on [Yilia by Litten](https://github.com/litten/hexo-theme-yilia). Maintained by [AkiSenn](https://github.com/AkiSenn).

## License

[MIT](./LICENSE) © 2026 AkiSenn
