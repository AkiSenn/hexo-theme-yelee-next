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

## 复刻了原版的哪些"味道"

重制不等于换皮，老主题这些辨识度高的小细节都留着了：

| 细节 | 原版 | 重制版 |
| --- | --- | --- |
| **移动端头像区** | 窄屏隐藏左栏（`.left-col{display:none}`），另有一个位于文档流最上方的 `#mobile-nav` 承载头像/署名/签名 | 同样拆成独立的 `.mobile-head` 顶部模块：主色渐变横带 + 头像压带 + 署名/签名/社交图标，**不塞进侧栏抽屉**；抽屉只留导航 |
| **首页文章入场** | 首页所有文章先 `opacity:0`，ScrollReveal 进入视口时随机套一个 animate.css 动画（8 选 1）；**快速下滑时未轮到的文章是空白的，像没加载出来** | 同款观感：IntersectionObserver 揭示 + 同名 8 个关键帧随机挑一个；首篇高于视口则不做动画（原版同款判断）。差异：修掉原版随机名越界成 `undefined` 的小 bug、无 JS/动效敏感/脚本出错时兜底显示，不留白 |
| **头像每次加载 zoomIn** | `.profilepic img` 带 `animated zoomIn`，0.4s + 0.3s 延迟 —— 所以**点文章跳页后头像会再"抖"一下** | 同款：`.profile__avatar img` 每次加载播 `yelee-zoomIn .4s ease .3s`（用 `backwards` 避免原版"先显示再跳回透明"的闪烁） |
| **卡片左侧色条** | `.article-header{border-left:6px solid #eee}`，hover 变 `5px solid #9c9`（绿） | 同款位置：卡片左侧 4px 竖条，hover/focus 变主色 |
| **侧栏面板滑动** | `.switch-wrap{transition:transform .3s ease-in}` + `.turn-left{translate(-100%)}` 横向滑动 | 页签切换时面板横向滑入 0.3s（`.side-panel.is-active` 走 `yelee-panel-in`） |
| **评论点击展开** | `comments/click2show.ejs`：`preload_comment: false` 时先显示一条 `aside.comment-bar`（pulse 评论图标），点击才加载评论并淡出 | 同款交互：默认给一条「点击加载评论」细栏，点了才注入第三方脚本（首屏对 giscus/unpkg **零请求**）；标题右侧「收起」按钮一按，区块整块 `[hidden]` 不占位，**页脚自动顶上来**；`comments.enable: false` 时整个评论区不渲染 |
| **页脚爱心** | `fa-heart animated infinite pulse`（1.1s，红色） | 同款：内联 SVG 爱心 + `yelee-pulse 1.1s infinite` |
| **点头像回主页** | 头像链到站点根目录 | 头像（桌面侧栏 + 移动端顶部两处）点击 → 播一次震动 → 回主页；已在首页则震一下并滚回顶部；Ctrl/Cmd/中键仍可新标签打开 |
| **头像抖动** | `.profilepic:hover` 的 0.15s 快速抖动 + 蓝色辉光 | 同样的节奏（`translate` 实现，不触发重排）+ 主色辉光，`prefers-reduced-motion` 下自动关闭 |
| 侧栏竖排页签 | 小鸟屋/丝带/回环/小人四个手绘图标 + 横向滑动 | 同一位置换成无障碍 tablist（目录·菜单·标签云·友链·关于） |
| 背景大图 | 每次刷新随机一张 | 按页面固定选一张（可 preload、可缓存），窄屏不加载背景图省流量 |
| 彩色标签 chip | `resetTags()` 给标签随机上色 | 按标签名稳定取色（同一标签永远同色） |
| `/tags/` 标签云页 | 硬编码路径判断 `tags/index.html` | 认 Hexo 约定的 `type: tags`，也认老路径写法 |
| 侧栏底部社交图标 | FontAwesome 字体图标 | 内联 SVG（匹配不到就显示名字首字母徽标） |

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

### 3. 配置（照抄一份起步配置，填三个空）

**推荐把自定义配置写在站点根目录的 `_config.yelee-next.yml`**（Hexo 原生支持，升级主题不会丢）。仓库里已经备好一份填了中文注释、按你这套站点预设好的起步配置：

```bash
# Git Bash / PowerShell / cmd 都能用
cp docs/starter-config.yml  <你的站点>/_config.yelee-next.yml
```

然后只需要改这几处（起步配置里都标了 `👉`）：

| 要填的东西 | 配置项 | 去哪拿 |
| --- | --- | --- |
| **ICP 备案号** | `footer.icp` + `footer.icp_link` | 起步配置里已填好你原来的「萌ICP备20220413号 / https://icp.gov.moe/?keyword=20220413」，换成自己的即可；以后换成工信部备案就写 `京ICP备2026xxxxxx号` + `https://beian.miit.gov.cn/`。留空则页脚整块不显示 |
| **Google Analytics** | `analytics.google_analytics` | <https://analytics.google.com> → 左下「管理」→ 数据收集和修改 →「数据流」→ 点你的网站 → 右侧「**衡量 ID**」形如 `G-XXXXXXXXXX`，粘进去。留空 = 完全不加载 GA；老的 `UA-XXXXXXX-X` 也认但 Google 已停收数据 |
| **百度统计** | `analytics.baidu_tongji` | <https://tongji.baidu.com> → 管理 → 代码获取 → 代码里 `hm.js?` 后面那串 32 位字符串 |
| **giscus 评论** | `comments.giscus.repo_id` / `category_id` | 见 [`_config.yml`](./_config.yml) 里「两个 id 怎么拿」的四步；不填也能上线，只是评论区不可用 + 构建时 warning |
| 站点信息 | `profile.author/subtitle/avatar/since/email` | 已经在起步配置里按你的站点填好了 |
| 版权年份 | `profile.since` | 填 `2020` → 页脚显示 `© 2020-2026`（**结束年取构建时的当前年**，不用手改）；填 `2025` → `© 2025-2026`；留空则只显示 `© 2026`。`AutumnT` 那部分取 `profile.author`，可改 |
| 页脚署名 | 无配置项 | `Hexo · Yelee Next <version>（AkiSenn & MOxFIVE）`：版本号取 `_config.yml` 的 `version`；`AkiSenn` 与 `MOxFIVE` 是主题构建者署名，**写死在模板里不可配置**（链接分别是你的 GitHub 主页与原主题仓库） |

优先级：`_config.yelee-next.yml` 新式 key > 同文件旧式 key > 主题 `_config.yml` > 内置默认值。全部配置项和默认值都在 [`_config.yml`](./_config.yml) 的注释里。

### 4. 搜索（默认开）

搜索是**构建期**把文章正文压成 `search.json`，前端零依赖本地匹配（原版是 `search.xml` + jQuery 解析）：

- 唤起：顶栏/侧栏的放大镜，或按 `/`、`Ctrl/Cmd+K`；`↑` `↓` 选，`Enter` 打开，`Esc` 关闭
- 索引体积：3 篇文章 ≈ 4.8 KB；首次唤起才拉取（`search.preload: true` 可改成预加载）
- 与原主题的差别：原版是「左侧栏内嵌输入框 + 结果铺在侧栏」，新版是居中浮层。要哪种都可以说，改起来是纯样式 + 挂载点的事
- ⚠️ **老配置里的 `search.on: false` 会把搜索关掉**（你原来的配置就是 false）。起步配置里已经用新式 key 明确写了 `search.enable: true`，新式 key 优先级最高，一定赢过 `search.on`
- 装了 `hexo-generator-search` 的话可以卸掉：它的 `search.xml` 没人用了，纯占体积

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
docs/                    起步配置(照着填) / 迁移指南 / 性能与缓存说明
```

---

## 部署（Cloudflare Workers / 任何云端 CI）

云端 CI（Cloudflare Workers Builds、GitHub Actions…）从 GitHub 拉源码构建，**本地那种
目录 junction 在云端不存在**，所以站点仓库里需要有一份主题副本。做法：

```bash
# 1) 改主题 → 在主题仓库提交
cd E:/yelee-next && git add -A && git commit -m "..." && git push

# 2) 把主题同步成站点仓库里的副本（自动解除 junction、清掉旧副本、写 SYNCED.json）
node tools/sync.mjs E:/hexo

# 3) 提交并推送站点仓库 → 云端自动构建部署
cd E:/hexo && git add themes/yelee-next && git commit -m "chore: 同步 yelee-next 主题" && git push
```

`tools/sync.mjs` 是幂等的：**主题仓库始终是唯一真源**，站点里那份是纯生成物
（目录里会有一份 `SYNCED.json` 标明来源与指纹，别直接改那份）。想检查副本是否最新：

```bash
node tools/sync.mjs E:/hexo --check
```

站点侧的配置放在站点根目录 `_config.yelee-next.yml`（Hexo 原生支持），
升级/重新同步主题都不会丢 —— 起步模板见 [`docs/starter-config.yml`](./docs/starter-config.yml)。

---

## 命令与环境

```bash
node tools/link.mjs E:/hexo            # 挂到站点（建目录 junction）
node tools/link.mjs E:/hexo --unlink   # 摘掉
node tools/check.mjs E:/hexo/public    # 检查生成产物
```

`tools/check.mjs` 会逐页检查 HTML 里引用的本地资源是否存在，并统计还残留多少 jQuery/require.js/FontAwesome/fancybox/MathJax2 引用与阻塞渲染的样式表。

**用哪个 shell 都行**：`link.mjs` 内部用 Node 的 `fs.symlinkSync(..., 'junction')` 建链接，直接走 Windows API，不调用 `cmd /c mklink`（所以在 PowerShell 里不会撞上 `mklink` 不是命令的问题），失败时才回退到 `mklink`，再失败会提示改用「直接复制目录」。文档里的示例统一用正斜杠，Git Bash / PowerShell / cmd 都能直接粘。

### 常见报错

| 现象 | 原因 / 处理 |
| --- | --- |
| `mklink : 无法将"mklink"项识别为 cmdlet` | 你在 PowerShell 里手敲了 `mklink`（它是 cmd 内置命令）。用 `node tools/link.mjs <站点>`，或改用 Git Bash |
| `hexo : 无法将"hexo"项识别为...` | 用 `npx hexo g`，或 `node node_modules/hexo-cli/bin/hexo g` |
| `hexo server` 卡住 / 端口占用 | 换端口 `hexo s -p 4011`；关掉卡死的进程：Git Bash `netstat -ano \| grep :4000` 后 `taskkill //F //PID <pid>`，PowerShell `Get-NetTCPConnection -LocalPort 4000 \| % { Stop-Process -Id $_.OwningProcess -Force }` |
| 页面没有任何样式 | 确认 `themes/yelee-next` 链接或目录真的存在；`hexo clean && hexo g` 一次 |
| 搜索点开没结果 | ① 老配置的 `search.on: false` 把搜索关了 → 写成 `search: { enable: true }`；② 确认 `public/search.json` 已生成（构建日志里有一行 `Generated: search.json`） |
| 评论区提示加载失败 | `comments.giscus.repo_id` / `category_id` 没填（构建时也会 warning 提醒） |
| 改了配置没生效 | 主题配置变化不触发增量重建，`hexo clean && hexo g` |

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
