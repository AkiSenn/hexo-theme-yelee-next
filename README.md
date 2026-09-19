<p align="center">
    <strong><span style="font-size:1.6em">hexo-theme-yelee-next</span></strong><br>
    <em>Yelee 主题的现代化重制版 · A modernized remake of the Hexo theme Yelee</em>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Hexo-%3E%3D6.0-0e83cd.svg">
    <img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg">
    <img src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg">
    <img src="https://img.shields.io/badge/AI%20pair-DeepSeek--V4.1--Flash-2b6cb0.svg">
</p>

&emsp;&emsp;主题 **yelee-next** 是 [hexo-theme-yelee][1]（原作者 [MOxFIVE][2]，其前身是 [hexo-theme-yilia][3] by [Litten][4]）的**全套重制版**：保留左侧头像栏、全屏背景大图、半透明卡片这些一眼认得出来的老味道，把 2016 年的技术栈整个换掉 —— 零 jQuery、零 require.js、零 FontAwesome、零外部 CDN，原生 ESM + 现代 CSS + 内容指纹长缓存。

&emsp;&emsp;**Yelee-next** is a full remake of [hexo-theme-yelee][1], which itself derives from [hexo-theme-yilia][3]. It keeps the recognizable look (left profile rail, full-screen background photo, translucent article cards) while replacing the 2016-era stack entirely: no jQuery, no require.js, no FontAwesome, no third-party CDN — just native ES modules, modern CSS and content-hashed long-term caching.

---

## 简介 · Introduction

| | |
| --- | --- |
| **中文** | 面向「读文字」的双栏博客主题。默认值开箱即用：搜索、目录、阅读进度、深浅色、图片灯箱、代码复制都内置；评论、备案号、社交图标、统计、友链**全部「填了才显示」**，不填不会在页面上留下空白框。 |
| **English** | A two-column theme designed for reading. Sensible defaults out of the box — search, TOC, reading progress, dark mode, lightbox and code copy are built in; comments, ICP filings, social icons, analytics and friend links are **render-on-demand** (nothing shows up, and no blank box is left behind, until you fill them in). |

---

## 特性 · Features

| 中文 | English |
| --- | --- |
| 零前端依赖：2 个原生 ESM（`app.js` + `search.js`），无 jQuery / require.js / FontAwesome | Zero front-end deps: two native ES modules, no jQuery / require.js / FontAwesome |
| 关键 CSS 内联 + 主样式表异步加载，实测 **0 个阻塞渲染的样式表** | Critical CSS inlined, main stylesheet async — measured **zero render-blocking stylesheets** |
| 内容指纹 `?v=<hash>` + 一年不可变缓存；可选生成 Cloudflare `_headers` | Content-hash fingerprinting (`?v=<hash>`) with immutable caching; optional Cloudflare `_headers` generation |
| 构建期生成 `search.json`，原生 JS 本地搜索（不需要任何搜索插件） | Build-time `search.json` index with vanilla-JS local search (no search plugin) |
| 深色 / 浅色 / 跟随系统三态，localStorage 记忆，**无闪白** | Light / dark / system with localStorage memory and **no flash of wrong theme** |
| 复刻原版动效：首页文章随机入场、头像 zoomIn、卡片色条、面板横滑、页脚爱心 pulse | Original animations restored: random homepage reveal, avatar zoom-in, card accent bar, sliding panels, pulsing heart |
| 移动端头像区是**顶部独立模块**（对齐原版布局），抽屉只放导航 | On mobile the profile block is a **standalone top module** (matching the original); the drawer holds navigation only |
| 点头像：震动一下回首页；已在首页则不重载、滚回顶部 | Click the avatar: shake, then go home; on the home page it shakes and scrolls back to top |
| 图片点击放大（原生 `<dialog>`）、代码块语言标签 + 复制按钮、阅读进度条 | Native `<dialog>` lightbox, code-block language label + copy button, reading progress bar |
| 评论支持 giscus / waline / twikoo / disqus / valine，**默认关闭**且按需加载 | Comments support giscus / waline / twikoo / disqus / valine, **off by default** and lazy-loaded |
| 无障碍：语义化标签、tablist、focus-visible、skip-link、`prefers-reduced-motion` | Accessibility: semantic markup, tablist, focus-visible, skip-link, `prefers-reduced-motion` |
| SEO：OG / Twitter Card / schema.org JSON-LD / canonical，正文 H1 自动降级 | SEO: OG, Twitter Card, schema.org JSON-LD, canonical, automatic demotion of in-post H1 |
| 中英繁三套语言包，往 `languages/` 加文件即可扩展 | i18n bundles for 简体中文 / English / 繁體中文 — add a file under `languages/` to extend |

---

## 安装 · Installation

**中文**

1. 把主题放进站点的 `themes/` 目录（三种方式任选）：

```bash
# A. 目录链接（推荐开发时用：主题源码留在独立仓库，改动即时生效）
#    Windows 用目录 junction，其它平台用 symlink，不依赖 cmd/mklink
node <主题目录>/tools/link.mjs  /path/to/hexo-site

# B. 直接复制
cp -r <主题目录> /path/to/hexo-site/themes/yelee-next

# C. 作为 git submodule（需要主题有远端仓库）
git submodule add <仓库地址> /path/to/hexo-site/themes/yelee-next
```

2. 在站点 `_config.yml` 里指向它：`theme: yelee-next`

3. 把起步配置复制到站点根目录，按「👈」提示填自己的信息（作者、社交链接、备案号、统计 ID 等）：

```bash
cp themes/yelee-next/docs/starter-config.yml  /path/to/hexo-site/_config.yelee-next.yml
```

4. 构建并本地预览：`hexo clean && hexo g && hexo s`

**English**

1. Put the theme under your site's `themes/` directory (pick one):

```bash
# A. Link it (best while developing — theme sources stay in their own repo)
node <theme-dir>/tools/link.mjs  /path/to/hexo-site

# B. Just copy it
cp -r <theme-dir> /path/to/hexo-site/themes/yelee-next

# C. As a git submodule
git submodule add <repo-url> /path/to/hexo-site/themes/yelee-next
```

2. Point the site at it — `theme: yelee-next`

3. Copy the starter config to your site root and fill in the fields marked 👈:

```bash
cp themes/yelee-next/docs/starter-config.yml  /path/to/hexo-site/_config.yelee-next.yml
```

4. Build and preview: `hexo clean && hexo g && hexo s`

> **依赖 · Requirements**：Hexo `>= 6`，渲染器只需要 `hexo-renderer-ejs`（Hexo 默认模板自带）。
> **不需要** `hexo-renderer-stylus`，也**不需要** `hexo-generator-search`。

---

## 配置 · Configuration

优先级 · Precedence:

```
站点 _config.yelee-next.yml  >  主题 _config.yml  >  主题内置默认值（scripts/00-config.js 的 DEFAULTS）
```

| 文件 | 说明 |
| --- | --- |
| [`_config.yml`](./_config.yml) | 主题默认配置，每一项都有中文注释 |
| [`docs/starter-config.yml`](./docs/starter-config.yml) | 起步配置示例（复制即用，占位符标了 👈） |
| [`docs/migration.md`](./docs/migration.md) | 从原版 yelee 3.5 迁移：**旧 key 自动迁移**，对照表 + 手动处理清单 |
| [`docs/caching.md`](./docs/caching.md) | 性能与缓存：指纹原理、Cloudflare `_headers`、验证方法 |

> 仓库里的 `legacy` 分支存放原版 yelee 3.5 的全量源码，方便 `git diff legacy main` 对照检查重制了哪些东西。
> The `legacy` branch keeps the full original yelee 3.5 source, so you can `git diff legacy main` to see exactly what changed.

**「填了才显示」的项 · Render-on-demand**

| 配置 | 不填时 |
| --- | --- |
| `subnav`（社交图标） | 侧栏底部不出现图标区 |
| `friends`（友链） | 不出现「友链」页签 |
| `profile.aboutme` | 不出现「关于我」页签 |
| `footer.icp` / `footer.police_icp` | 页脚不出现对应备案行（两项独立，填一项显示一项） |
| `footer.runtime.since` | 不显示「本站已运行」 |
| `analytics.*` | 完全不加载统计脚本 |
| `comments.enable: false`（默认） | 评论区、加载细栏、「跳到评论」按钮全部不渲染，页面里零痕迹 |

---

## 从原版 yelee 迁移 · Migrating from yelee

**中文**：把原来的 `themes/yelee/_config.yml` 另存为站点的 `_config.yelee-next.yml` 即可 —— 旧 key 会被自动识别并迁移（构建时打印迁移日志）。完整对照表见 [`docs/migration.md`](./docs/migration.md)。

**English**: Save your old `themes/yelee/_config.yml` as `<site>/_config.yelee-next.yml`. Legacy keys are migrated automatically, with a build-time log. Full key mapping in [`docs/migration.md`](./docs/migration.md).

---

## 部署 · Deployment

云端 CI（Cloudflare Workers Builds、GitHub Actions…）从 Git 仓库拉源码构建，**本地的目录链接在云端不存在**，所以站点仓库里需要有一份主题副本：

```bash
# 把主题同步成站点仓库里的副本（幂等；--check 只对比不写入）
node <主题目录>/tools/sync.mjs  /path/to/hexo-site
node <主题目录>/tools/sync.mjs  /path/to/hexo-site --check

# 生成后体检产物：资源引用是否缺失、还有没有阻塞请求、有没有老依赖残留
node <主题目录>/tools/check.mjs  /path/to/hexo-site/public
```

**主题仓库始终是唯一真源**，站点里那份是生成物 —— 目录里的 `SYNCED.json` 会标明来源、时间与指纹。

---

## 性能 · Performance

在一个真实站点（21 个页面、3 篇文章）上的实测：

| 资源 | 原始 | 传输（brotli） | 阻塞渲染 |
| --- | --- | --- | --- |
| `index.html`（含内联关键 CSS + SVG 图标表） | 42 KB | 11 KB | — |
| `css/theme.css?v=<hash>` | 47 KB | 16 KB | 否（`preload` 异步） |
| `js/app.js?v=<hash>` | 41 KB | 17 KB | 否（module 天然 defer） |
| `js/search.js?v=<hash>` | 4.7 KB | 2 KB | 否 |
| `search.json` | 4.8 KB | 2.5 KB | 否（首次搜索才拉） |
| 背景大图 WebP（按页分配，单页只用 1 张） | 7–50 KB | — | 否（`preload` + `fetchpriority=high`） |

首屏约 **8 个请求 / 87 KB**；原版是 jQuery + require.js + FontAwesome + 4 个 CDN 样式表 + 全站 MathJax，属于数量级下降。
`node tools/check.mjs <public>` 可以复现这些数字。

---

## 致谢 · Credits

**中文**

- **工程实现**：本重制版的**大部分工程（架构、模板、样式、前端脚本、构建插件、文档与测试）由 AI 结对助手 [DeepSeek-V4.1-Flash](https://www.deepseek.com/) 🐋 完成**，在 AkiSenn 的需求、审查与反复调试下成型。
- **重制版作者 / 维护者**：[AkiSenn](https://github.com/AkiSenn) —— 提出目标、定义细节、验收每一处改动。
- **原主题作者**：[MOxFIVE](https://github.com/MOxFIVE) —— [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee)，本主题的视觉与交互原型都来自他。
- **更早的源头**：[Litten](https://github.com/litten) —— [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia)，yelee 的双栏布局与侧栏交互承自 yilia。
- 页脚的 `Hexo · Yelee Next <version>（AkiSenn & MOxFIVE）` 是主题构建者署名，写在模板里、不提供配置项。

**English**

- **Engineering**: most of this remake — architecture, layouts, stylesheets, front-end modules, build plugins, docs and verification — was **built by the AI pair programmer [DeepSeek-V4.1-Flash](https://www.deepseek.com/) 🐋**, working from AkiSenn's requirements, reviews and repeated debugging rounds.
- **Remake author / maintainer**: [AkiSenn](https://github.com/AkiSenn).
- **Original theme**: [MOxFIVE](https://github.com/MOxFIVE) — [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee); the visual and interaction language of this theme is his.
- **Earlier ancestor**: [Litten](https://github.com/litten) — [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia).
- The footer line `Hexo · Yelee Next <version>（AkiSenn & MOxFIVE）` is the theme's authorship credit, hard-coded in the template on purpose.

---

## 许可 · License

[MIT](./LICENSE) © AkiSenn（重制版 / remake）· MOxFIVE（原主题 / original theme）· Litten（yilia）

[1]: https://github.com/MOxFIVE/hexo-theme-yelee
[2]: https://github.com/MOxFIVE
[3]: https://github.com/litten/hexo-theme-yilia
[4]: https://github.com/litten

<!--
截图占位（等有图了再放开）· Screenshot placeholder (enable when available):
<p align="center">
    <img src="docs/screenshot-home.png" alt="yelee-next 首页 / home">
    <img src="docs/screenshot-post.png" alt="yelee-next 文章页 / article">
</p>
-->
