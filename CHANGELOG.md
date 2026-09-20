# 更新日志

本主题遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。
版本号同时写在三处（`package.json`、`_config.yml`、`scripts/00-config.js`），
`node tools/version-check.mjs` 会检查它们是否一致，CI 也会跑。

---

## [1.3.1] - 2026-09-20

### 新增

- **图片内容指纹**：头像、站点图标（`profile.favicon`，一项或多项）、`apple_touch_icon`、背景大图、`seo.og_image`，以及**正文里能定位到文件的 `<img>`**，构建期都会带上 `?v=<内容哈希>`（md5 前 8 位，见 `lib/assets.js`）。

  为什么需要：静态托管普遍把 `/img/*` 也设成长缓存甚至 `immutable`（本站 `_headers` 就是一年 immutable）。图片没有指纹时，**换了图浏览器与 CDN 会一直用旧的那份** —— 以前只能手动改名，或手写 `?v=2` 这种迟早忘记维护的版本号。

  ```html
  <img src="/img/my-avatar.png?v=544e5f35">
  <link rel="icon" href="/img/my-favicon.svg?v=bb65e96e">
  ```

  行为约定：

  - 文件**查不到**就原样返回（文章资源目录里的图、外链、`data:` 一律不猜）；
  - 手写的 `?v=N` 会被**覆盖**成内容哈希；
  - 查找顺序是**主题 → 站点**（同名文件时产物里是主题那份，实测）；
  - 与 css/js 共用同一个开关 `assets.fingerprint`（关掉就都不加）。

  实测：给图标追加一个字节 → URL 由 `?v=6651e01d` 变 `?v=7edb3690`；内容复原 → URL 复原。

  > ⚠️ 增量构建会复用已渲染的 HTML，**换了图建议 `hexo clean` 再 `generate`**；云端 CI 从干净仓库构建，不受影响。

### 修复

- `lib/` 下被 `require` 的模块**拿不到 Hexo 注入的 `hexo` 全局**（那个全局只有 `scripts/*.js` 能看到），首版实现因此在主题里静默失效（查找根目录为空 → 什么都不加指纹）。现在改为显式 `configure(theme_dir, source_dir)` 注入。

### 工程

- CI 新增两条断言：头像与站点图标必须带 `?v=<8 位哈希>`；原先两条图标声明断言也更新为要求该查询串（旧正则在加上指纹后会失配，已被 CI 拦下过一次）。

---

## [1.3.0] - 2026-09-20

### 变更

- **宽屏（≥1080px）下顶栏不再显示站名、搜索框与主题开关**。侧栏本来就有站名、搜索框和三档主题开关（浅色 / 深色 / 跟随系统），顶栏再重复一遍既冗余，又在内容区顶上压出一条与圆角卡片风格不符的方框栏。现在宽屏下顶栏只剩**阅读进度条** —— 去掉内外边距、底色与模糊后，它就是内容栏顶部的一条 2px 细线，滚动阅读时才出现（`appearance.reading_progress` 仍可整体关闭）。

  窄屏（<1080px）顶栏维持原样：抽屉入口 + 站名 + 搜索 + 主题。那里的抽屉是唯一入口，删不得。

  > 顺带对齐了一处注释与实现不符：`_critical.css` 里写着「宽屏下由 CSS 隐藏」，但当时只隐藏了抽屉按钮，顶栏本体一直显示着。

  想恢复宽屏顶栏的话，加几行自定义 CSS 即可：

  ```css
  @media (min-width: 1080px) {
    .topbar { padding: 8px 12px; background: color-mix(in srgb, var(--c-bg) 80%, transparent); backdrop-filter: blur(14px); }
    .topbar__title { display: inline; }   /* 默认已 hidden */
    .topbar__actions { display: flex; }
  }
  ```

### 修复

- **Prism 下代码块的语言标签显示错误**：Prism 输出的是 `<pre class="line-numbers language-bash">`，主题把 `line-numbers` 当成了语言名，标签显示成「line-numbers language-bash」。现在优先取 `language-xxx`，并忽略高亮器与主题自己的标记类。
- **补齐 Prism 的行号样式**：Prism 的 line-numbers 插件输出 `.line-numbers-rows`（每行一个空 `<span>`，靠 CSS 计数器显示编号），主题此前没有对应样式 —— 这些 span 是空的、不可见，**等于没有行号**。现在按官方实现适配到主题变量（3em 编号区 + 右侧 1px 分隔线），与 Hexo 内置高亮的 `td.gutter` 视觉对齐。

  > 附带说明：Hexo 内置的 highlight.js 对 bash **几乎不着色** —— `npm install x --save` 这类纯命令行一个 token 都没有，看起来就像没高亮；Prism 会把命令（`npm` / `install`）、`--参数`、`&&` 都标出来。站点侧把 `syntax_highlighter` 换成 `prismjs` 即可获得更好的命令行高亮，主题对三套类名（内置 / hljs / Prism）都已支持。

### 工程

- CI 的测试站点改用 Prism 构建（与线上一致），并新增两条签名断言：语言标签必须取 `language-xxx`、行号容器 `.line-numbers-rows` 必须存在 —— 避免以后只测内置高亮那一条路径。

---

## [1.2.0] - 2026-09-20

无破坏性变更：`profile.favicon` 仍可只写一个路径，行为与 1.1.0 相同。

### 新增

- **站点图标支持一行配多个**：`profile.favicon` 除了字符串，也可以给一组路径，
  会按顺序输出多行 `<link rel="icon">`，并按扩展名自动补 `type`
  （`.svg` 会额外带 `sizes="any"`，`.ico` / `.png` / `.jpg` / `.webp` 各对应自己的类型）。

  ```yaml
  profile:
    favicon:
      - /img/my-favicon.svg      # → <link rel="icon" type="image/svg+xml" sizes="any" href="...">
      - /img/my-favicon.png      # → <link rel="icon" type="image/png" href="...">
  ```

  SVG 在前 + 位图兜底是标准做法（Safari 对 SVG favicon 支持较晚）。带上 `type` 后，
  浏览器可以直接挑合适的那个，不必先把文件下载回来再猜格式。

### 清理 / 文档

- **删掉主题里遗留的 `source/img/GitHub.png`（3.8KB）**。它是早年把 GitHub 图标放在图床上、
  图床失效后的救急替代品；现在社交图标早已换成内置 SVG 精灵表（`yn_icon('github')`，
  `currentColor` 跟随文字色），这个文件在主题里**没有任何引用**，纯属给每个使用者白打包 3.8KB。
- `_config.yml` 与 `docs/starter-config.yml` 补上一条**容易踩的坑**：站点与主题存在**同名**资源时，
  Hexo 产物里留下的是**主题那份**（实测：两边放同路径不同内容，产物是主题的）——
  所以自己的图要放**站点** `source/img/` 下，并用 `my-avatar.png` 这类不重名的文件名；
  直接改主题自带文件的话，下次升级主题又会被覆盖回去。
- CI 新增两条签名断言：站点图标必须输出 SVG（含 `sizes="any"`）与 PNG 两行声明。

---

## [1.1.0] - 2026-09-20

无破坏性变更：不新增任何必填配置，`performance.precompress` 默认关闭，
因此**不配置任何东西时行为与 1.0.0 一致**。

### 新增

- **可选预压缩（`performance.precompress`）** —— 构建时给 css/js 各生成一份同名的
  `.br`（brotli 质量 11，可用 `performance.precompress_quality` 调整）。
  **默认关闭**，因为只有「会使用同名 `.br` 的托管方」才吃得到收益：
  - nginx 配了 `brotli_static on;`；
  - Cloudflare Workers 用 Worker 脚本自己下发（`docs/caching.md` 第七节有完整片段）。

  实测（真实站点首屏）：`theme.css` 17.05K → **12.58K**、`app.js` 16.71K → **13.01K**、
  `search.js` 2.09K → **1.60K**；首屏合计 47.36K → **38.85K（省 8.51K / 18%）**。
  >
  > ⚠️ 注意：**Cloudflare Worker 静态资产不会自动使用同名 `.br`**（实测验证过），
  > GitHub Pages 也不会。这些环境下开了只是让部署多几十 KB 死文件，所以默认关。
  > 另外自己写 Worker 下发时，返回预压缩 body **必须带 `encodeBody: 'manual'`**，
  > 否则运行时会把 body 再压一次，浏览器收到 `br(br(css))`、样式表直接报废且不报错。

- **SEO：每页唯一且够长的 meta description**。按页面类型分别拼装（文章页 / 标签页 /
  分类页 / 归档页 / 索引页 / 首页各有模板，文案在 `languages/*.yml` 的 `seo:` 段），
  避免「描述过短」「多页描述重复」这两类站长后台警告。同时修复了归档页标题重复。

- **`tools/seo-audit.mjs`** —— SEO 体检：描述过短 / 描述重复 / 标题重复。
  ```bash
  node tools/seo-audit.mjs <public 目录> --min 35
  ```
- **`tools/version-check.mjs`** —— 三处版本号一致性检查（防止「装了 1.1.0、页脚写着 1.0.0」）。

### 修复

- **列表摘要不再切在中文半句上**：截断时新增「，」作为软边界（仅在切点超过上限 85% 时
  采用，避免摘要被切得太短）；句末标点的原有行为不变。典型症状由
  「…访问速度比较慢，后…」变为「…访问速度比较慢，…」。
- **`tools/sync.mjs` 的文件清单改由 git 决定**（`git ls-files --cached --others
  --exclude-standard`），自动继承 `.gitignore`。此前硬编码的排除清单等于把 `.gitignore`
  抄了第二遍，漏掉了 `.ci/`（本地 CI 的临时站点）与 `.handoff.md`，于是「跑完本地 CI
  再同步」会把 76 个临时文件（其中还嵌套着一整份主题副本）塞进站点仓库；
  `--check` 也因此永远假报「需要同步」。现在指纹与复制共用同一份清单。
- **`tools/local-ci.mjs` 不再假绿灯**：它原先只解析 `run: |` 形式的步骤，单行
  `run: node tools/xxx.mjs` 的 4 个步骤（产物体检 / SEO 体检 / 签名检查 / 清理）被静默
  跳过，脚本却照样打印「工作流全部步骤本地复现通过」。现在两种形式都解析，并在解析后
  与 YAML 里 `run:` 的出现次数核对，对不上直接报错退出。

### 文档 / 工程

- `docs/caching.md` 新增第七节「预压缩（Brotli-11，可选）」：实测对比表、
  为什么默认关闭、Cloudflare Workers 完整片段、部署后验证方法。
- CI 新增两步：版本号一致性、预压缩自检（开开关重建，断言 `.br` 存在、比原文件小、
  且解压后与原文件逐字节一致）。
- 版权署名更新为 `Copyright (c) 2026 AkiSenn (hexo-theme-yelee-next)`；
  `.gitignore` 补 `.handoff.md`（本地交接记录）与 `$RECYCLE.BIN/`（Windows 回收站残留）。

---

## [1.0.0] - 2026-09-20

首个正式版本：把原版 yelee 3.5 全量重制。

- **零前端依赖**：2 个原生 ESM（`app.js` + `search.js`），无 jQuery / require.js /
  FontAwesome / 外部 CDN。
- **零渲染阻塞**：关键 CSS 内联 + 主样式表异步加载。
- **缓存友好**：内容指纹 `?v=<hash>` + 一年不可变缓存，可选生成 Cloudflare `_headers`。
- 内置本地搜索、深色模式、目录、阅读进度、图片灯箱、代码复制、多语言（简中 / EN / 繁中）。
- 评论（giscus / waline / twikoo / disqus / valine）默认关闭、按需加载；
  备案号、社交图标、统计、友链全部「填了才显示」。
- 复刻原版动效与移动端布局；`legacy` 分支保留原版 yelee 3.5 全量源码，便于
  `git diff legacy main` 对照。
