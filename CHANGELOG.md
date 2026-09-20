# 更新日志

本主题遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。
版本号同时写在三处（`package.json`、`_config.yml`、`scripts/00-config.js`），
`node tools/version-check.mjs` 会检查它们是否一致，CI 也会跑。

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
