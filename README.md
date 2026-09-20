<p align="center">
    <a href="./README.en.md">English</a> ·
    <strong>简体中文</strong>
</p>

<p align="center">
    <strong><span style="font-size:1.6em">hexo-theme-yelee-next</span></strong><br>
    <em>Yelee 主题的现代化重制版 · 保留老味道，技术栈全部换新</em>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Hexo-%3E%3D6.0-0e83cd.svg">
    <img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg">
    <img src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg">
    <img src="https://img.shields.io/badge/AI%20pair-DeepSeek--V4.1--Flash-2b6cb0.svg">
    <a href="https://github.com/AkiSenn/hexo-theme-yelee-next/stargazers"><img src="https://img.shields.io/github/stars/AkiSenn/hexo-theme-yelee-next?style=flat"></a>
</p>

&emsp;&emsp;主题 **yelee-next** 是 [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee)（原作者 [MOxFIVE](https://github.com/MOxFIVE)，其前身是 [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia) by [Litten](https://github.com/litten)）的**全套重制版**：保留左侧头像栏、全屏背景大图、半透明卡片这些一眼认得出来的老味道，把 2016 年的技术栈整个换掉 —— 零 jQuery、零 require.js、零 FontAwesome、零外部 CDN，原生 ESM + 现代 CSS + 内容指纹长缓存。

> 📖 English documentation: **[README.en.md](./README.en.md)**

---

## 简介

面向「读文字」的双栏博客主题。默认值开箱即用：搜索、目录、阅读进度、深浅色、图片灯箱、代码复制都内置；评论、备案号、社交图标、统计、友链**全部「填了才显示」**，不填不会在页面上留下空白框。

---

## 特性

- **零前端依赖**：2 个原生 ESM（`app.js` + `search.js`），无 jQuery / require.js / FontAwesome
- **零渲染阻塞**：关键 CSS 内联 + 主样式表异步加载，实测 0 个阻塞渲染的样式表
- **缓存友好**：内容指纹 `?v=<hash>` + 一年不可变缓存；可选生成 Cloudflare `_headers`
- **本地搜索**：构建期生成 `search.json`，原生 JS 匹配，不需要任何搜索插件
- **深色模式**：浅色 / 深色 / 跟随系统三态，localStorage 记忆，无闪白
- **复刻原版动效**：首页文章随机入场、头像 zoomIn、卡片左侧色条、面板横滑、页脚爱心 pulse
- **移动端布局对齐原版**：头像区是顶部独立模块，抽屉只放导航
- **点头像**：震动一下回首页；已在首页则不重载、滚回顶部
- **阅读体验**：目录滚动高亮、阅读进度条、图片点击放大（原生 `<dialog>`）、代码块语言标签 + 复制按钮
- **评论**：支持 giscus / waline / twikoo / disqus / valine，默认关闭且按需加载
- **无障碍**：语义化标签、tablist、focus-visible、skip-link、`prefers-reduced-motion`
- **SEO**：OG / Twitter Card / schema.org JSON-LD / canonical，正文 H1 自动降级
- **多语言**：内置简体中文 / English / 繁體中文，往 `languages/` 加文件即可扩展

---

## 安装

1. 把主题放进站点的 `themes/` 目录（三种方式任选）：

```bash
# A. 目录链接（推荐开发时用：主题源码留在独立仓库，改动即时生效）
#    Windows 用目录 junction，其它平台用 symlink，不依赖 cmd/mklink
node <主题目录>/tools/link.mjs  /path/to/hexo-site

# B. 直接复制
cp -r <主题目录> /path/to/hexo-site/themes/yelee-next

# C. 作为 git submodule
git submodule add https://github.com/AkiSenn/hexo-theme-yelee-next.git /path/to/hexo-site/themes/yelee-next
```

2. 在站点 `_config.yml` 里指向它：`theme: yelee-next`

3. 把起步配置复制到站点根目录，按「👈」提示填自己的信息（作者、社交链接、备案号、统计 ID 等）：

```bash
cp themes/yelee-next/docs/starter-config.yml  /path/to/hexo-site/_config.yelee-next.yml
```

4. 构建并本地预览：`hexo clean && hexo g && hexo s`

> **依赖**：Hexo `>= 6`，渲染器只需要 `hexo-renderer-ejs`（Hexo 默认模板自带）。
> **不需要** `hexo-renderer-stylus`，也**不需要** `hexo-generator-search`。

---

## 配置

优先级：

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

---

## 从原版 yelee 迁移

把原来的 `themes/yelee/_config.yml` 另存为站点的 `_config.yelee-next.yml` 即可 —— 旧 key 会被自动识别并迁移（构建时打印迁移日志）。完整对照表见 [`docs/migration.md`](./docs/migration.md)。

---

## 部署

云端 CI（Cloudflare Workers Builds、GitHub Actions…）从 Git 仓库拉源码构建，**本地的目录链接在云端不存在**，所以站点仓库里需要有一份主题副本：

```bash
# 把主题同步成站点仓库里的副本（幂等；--check 只对比不写入）
node <主题目录>/tools/sync.mjs  /path/to/hexo-site
node <主题目录>/tools/sync.mjs  /path/to/hexo-site --check

# 生成后体检产物：资源引用是否缺失、还有没有阻塞请求、有没有老依赖残留
node <主题目录>/tools/check.mjs  /path/to/hexo-site/public
```

**主题仓库始终是唯一真源**，站点里那份是生成物 —— 目录里的 `SYNCED.json` 会标明来源、时间与指纹。

### 持续集成

仓库自带 GitHub Actions 自检（`.github/workflows/check.yml`）：密钥防呆 → 校验 YAML → 搭最小 Hexo 站点生成一遍 → 产物体检 → 18 项关键签名检查。
推之前想先在本地跑同样的步骤：

```bash
node tools/local-ci.mjs
```

---

## 性能

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

## 致谢

- **工程实现**：本重制版的**大部分工程（架构、模板、样式、前端脚本、构建插件、文档与测试）由 AI 结对助手 [DeepSeek-V4.1-Flash](https://www.deepseek.com/) 🐋 完成**，在 AkiSenn 的需求、审查与反复调试下成型。
- **重制版作者 / 维护者**：[AkiSenn](https://github.com/AkiSenn) —— 提出目标、定义细节、验收每一处改动。
- **原主题作者**：[MOxFIVE](https://github.com/MOxFIVE) —— [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee)，本主题的视觉与交互原型都来自他。
- **更早的源头**：[Litten](https://github.com/litten) —— [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia)，yelee 的双栏布局与侧栏交互承自 yilia。
- 默认可视化素材：主题自带一张**鲸鱼占位头像**（`source/img/avatar.png`），换成自己的图即可。

---

## 许可

[MIT](./LICENSE) © AkiSenn（重制版）· MOxFIVE（原主题）· Litten（yilia）

<!--
截图占位（等有图了再放开）：
<p align="center">
    <img src="docs/screenshot-home.png" alt="yelee-next 首页">
    <img src="docs/screenshot-post.png" alt="yelee-next 文章页">
</p>
-->
