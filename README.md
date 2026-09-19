# yelee-next

> [yelee](https://github.com/MOxFIVE/hexo-theme-yelee)（yilia 血统）的**现代化重制版** —— 保留左侧头像栏 + 全屏背景大图 + 半透明卡片的老味道，把 2016 年的技术栈整个换掉：零 jQuery、零 require.js、零 FontAwesome、零外部 CDN，原生 ESM + 现代 CSS + 内容指纹长缓存。

- 目标 Hexo：`>= 6`（在 Hexo 8.1.2 上实测）
- 渲染器依赖：只需要 `hexo-renderer-ejs`（Hexo 默认模板就带）；**不再需要 `hexo-renderer-stylus`**
- 浏览器目标：常青浏览器（Chrome / Edge / Safari / Firefox 近两年版本）

---

## 为什么重制

原版 yelee 3.5 停留在 Hexo 3 时代，放到今天有一堆硬伤：

| 问题 | 旧版现状 | 重制版 |
| --- | --- | --- |
| 前端依赖 | jQuery 2.2.4 + require.js + 8 个 cdnjs/bootcss 外链 | 0 依赖，2 个原生 ESM（app.js 41KB / gzip 12.5KB + search.js 4.7KB / gzip 2KB） |
| 图标 | FontAwesome 4.6（CSS + 4 个字体文件） | 内联 SVG sprite（≈3KB，随 HTML gzip） |
| 样式 | Stylus，需要 `hexo-renderer-stylus` | 纯 CSS：内联关键 CSS 11.8KB（gzip 4.4KB）+ 异步 theme.css 46.6KB（gzip 11KB） |
| 渲染阻塞 | 4 个 CDN CSS + 2 个 CDN JS 串行 | 0 个阻塞请求 |
| 缓存 | 资源无指纹，`_headers` 只能给目录设短缓存 | 内容指纹 `?v=<hash>` + 一年不可变缓存 |
| 公式 | `theme.mathjax` 是对象恒为真 → **全站每页**都拉 MathJax 2.6（60KB+） | 按文章 opt-in（`mathjax: true`），MathJax 4 / KaTeX 可选 |
| 搜索 | `search.xml` + jQuery 解析，体积大 | 构建期 `search.json` 索引 + 原生 JS 匹配 |
| 评论 | valine/duoshuo/youyan（多已停服），且首屏就加载 | giscus / waline / twikoo / disqus，滚到评论区才加载 |
| 访问统计 | 不蒜子老 CDN，页脚 `setInterval` 每 250ms 跑一次 | 进入视口才加载，计时器可见时才跑 |
| 图片 | 原图直出，无懒加载 | WebP + `loading=lazy` + `decoding=async`，首图 `fetchpriority=high` |
| 深色模式 | 无 | `auto/light/dark` 三态，localStorage 记忆，无闪白 |
| 无障碍 | div 堆砌、无 aria、无键盘支持 | 语义化标签、tablist、focus-visible、skip-link、`prefers-reduced-motion` |
| SEO | 无 OG/Twitter/JSON-LD，标题层级混乱 | OG + Twitter Card + schema.org JSON-LD + canonical，正文 H1 自动降级 |
| 站内结构 | 一切靠 jQuery 运行时改写 DOM | 构建期处理好 HTML，运行时只做交互 |

> 另外修掉了原版 `head.ejs` 里**硬编码的 Google Analytics**（`G-F61JPBRL9V` 写死在模板里，跟配置里的 UA 号两套并存）——现在统一走 `analytics.google_analytics`。

---

## 快速开始

### 1. 挂到 Hexo 站点（推荐：目录 junction，主题代码始终留在本仓库）

```bash
git clone <本仓库> E:/yelee-next
node E:/yelee-next/tools/link.mjs E:/hexo          # 在 E:/hexo/themes/ 下建 yelee-next 链接
```

然后在站点 `_config.yml` 里：

```yaml
theme: yelee-next
```

```bash
hexo clean && hexo g && hexo s
```

### 2. 或者直接拷贝目录

把整个仓库复制到 `你的站点/themes/yelee-next/`，同样把 `theme` 改成 `yelee-next`。

### 3. 配置

所有配置项、默认值、旧版 key 对照表都在 [`_config.yml`](./_config.yml) 的注释里。**推荐把自定义配置写在站点根目录的 `_config.yelee-next.yml`**（Hexo 原生支持，升级主题不会丢）：

```yaml
# 站点根目录 _config.yelee-next.yml
profile:
  author: 你的名字
  since: 2020
comments:
  giscus:
    repo: 用户名/仓库名
    repo_id: R_xxxx
    category: Announcements
    category_id: DIC_xxxx
```

优先级：`_config.yelee-next.yml` 的新式 key > 同文件的旧式 key > 主题 `_config.yml` > 内置默认值。

### 4. 从原版 yelee 3.5 迁移

把老的 `themes/yelee/_config.yml` 直接另存为站点的 `_config.yelee-next.yml` 即可，旧 key 会自动映射（构建时会打印迁移日志）。
详见 [`docs/migration.md`](./docs/migration.md)。

---

## 目录结构

```
_config.yml              配置（含旧 key 对照表）
lib/text.js              主题脚本与模板助手共用的纯函数
scripts/                 主题级 Hexo 插件（Hexo 会自动加载主题的 scripts/）
  00-config.js           配置归一化：旧 key 迁移 + 默认值 + 派生列表 + 体检告警
  10-helpers.js          模板助手（yn_* 前缀）：资源指纹、图标、摘要、字数、TOC、绝对 URL...
  30-filters.js          渲染后处理：代码块增强、图片懒加载、表格包裹、标题锚点、外链、HTML 压缩
  40-search.js           search.json 索引生成
  50-headers.js          可选：生成 public/_headers（Cloudflare 长缓存）
layout/                  EJS 模板（layout / 各页面 / _partial 组件）
source/css/              _critical.css（下划线开头，Hexo 不会拷贝到 public，只被内联）+ theme.css（异步）
source/js/               app.js + search.js（原生 ESM，无构建）
source/img|background/   头像、图标、背景大图（WebP，已压过）
languages/               default(简中) / en / zh-TW
tools/link.mjs           把主题挂到 Hexo 站点
tools/check.mjs          生成产物体检：资源引用是否存在、是否还有老依赖、阻塞请求统计
docs/                    迁移指南 / 性能与缓存说明
```

---

## 命令

```bash
node tools/link.mjs E:/hexo            # 挂到站点
node tools/link.mjs E:/hexo --unlink   # 摘掉
node tools/check.mjs E:/hexo/public    # 检查生成产物
```

`tools/check.mjs` 会逐页检查 HTML 里引用的本地资源是否存在，并统计还残留多少 jQuery/require.js/FontAwesome/fancybox/MathJax2 引用与阻塞渲染的样式表。

---

## 体积与请求（本站实测，3 篇文章）

| 资源 | 原始 | gzip | 是否阻塞渲染 |
| --- | --- | --- | --- |
| index.html（含内联关键 CSS + SVG sprite） | 38 KB | 9 KB | — |
| 文章页 HTML | 60 KB | 14 KB | — |
| css/theme.css（内容指纹 `?v=`） | 46.6 KB | 11 KB | 否（`preload` 异步） |
| js/app.js | 41 KB | 12.5 KB | 否（module 天然 defer） |
| js/search.js | 4.7 KB | 2 KB | 否 |
| 背景大图 WebP（6 张按页面分配，单页只用 1 张） | 7–50 KB | — | 否（`preload` + `fetchpriority=high`） |

`node tools/check.mjs <public>` 可以直接复现上表并检查资源引用完整性（本仓库最后一次自检：21 个页面、596 处本地引用、0 缺失、0 阻塞样式表、0 老依赖残留）。

## 已知边界

- 主题只做**渲染与交互**，不打包任何第三方库；评论、统计、公式都用官方 CDN，且都延迟加载。
- 不支持 IE（原版号称 IE8+，代价是整个前端架构停留在 2015 年）。
- 原版的 `github_widget`（GitHub 仓库挂件）、`tab_title_change`（切标签改标题）、`jquery_ui` tooltip、`open_in_new` 的分区域粒度、`fancybox` 全部移除或替换（灯箱改原生 `<dialog>`，外链新窗口改成全局开关）。
- 站内搜索在**构建期**生成索引，因此新增文章后需要重新 `hexo g`（Hexo 本来就是这样）。
- `/tags/` 与 `/categories/` 空内容页会自动渲染成标签云 + 分类索引（认 `type: tags` 这个 Hexo 约定，也认老站点的 `tags/index.html` 路径）。
- 脚注（`[^1]`）取决于 Markdown 渲染器：`hexo-renderer-marked` 不支持，需要换 `hexo-renderer-markdown-it`；主题侧的 `.footnotes` 样式已经备好。
- 代码高亮兼容三种类名（Hexo 内置 / highlight.js / Prism），但**具体配色由高亮器决定**；主题只保证在浅色与深色代码块底色上都可读。

---

## 致谢与许可

- 原主题 [hexo-theme-yelee](https://github.com/MOxFIVE/hexo-theme-yelee) © MOxFIVE
- 更早的源头 [hexo-theme-yilia](https://github.com/litten/hexo-theme-yilia) © Litten
- 重制版 © AutumnT，MIT License（见 [LICENSE](./LICENSE)）

仓库里保留了一个 `legacy` 分支存放原版 3.5 全量源码，方便 `git diff legacy main` 对照。
