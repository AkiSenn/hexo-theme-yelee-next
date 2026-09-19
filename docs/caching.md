# 性能与缓存

## 一、首屏请求对比

| | 原版 yelee 3.5 | yelee-next |
| --- | --- | --- |
| 阻塞渲染的 CSS | 4 个（font-awesome + animate + fancybox + pace，全在 cdnjs/bootcss） | **0**（关键 CSS 内联，主样式 `preload` 异步） |
| 阻塞渲染的 JS | 2 个（jQuery 2.2.4 + clipboard，串行，且在 `<head>`） | **0**（`type="module"` 天然 defer，8KB） |
| JS 库 | jQuery + require.js + scrollReveal + fancybox + clipboard + pace | 无 |
| 字体 | FontAwesome 4 的 4 个字体文件 | 无（系统字体栈） |
| 图片 | 原图直出、无懒加载 | WebP + `lazy` + `async`，首图 `fetchpriority=high` |
| 第三方 | 每页都拉 MathJax 2.6（60KB+）、不蒜子、GA | 全部按需：公式按文章 opt-in、统计进视口才加载、评论滚到评论区才加载 |

一次首页访问大约从 **20+ 个请求、~400KB 阻塞资源** 降到 **2 个 CSS/JS 请求 + 1 张背景图**。

## 二、资源指纹（cache busting）

`scripts/10-helpers.js` 里注册了 `yn_asset()`：

```js
// 模板里这样写
yn_asset('css/theme.css')   // → /css/theme.css?v=3f9a1c7e
```

`?v=` 是**主题源文件的 md5 前 8 位**，构建期算出来的。文件改了 → 指纹变了 → URL 变了 → 浏览器和 CDN 必然拿到新内容；文件没改 → URL 不变 → 可以放心开一年不可变缓存。

- 关掉：`assets.fingerprint: false`
- CDN 前缀：`assets.cdn: https://cdn.jsdelivr.net/gh/you/repo@v4`（默认留空 = 自托管，少一个域名的 DNS/TLS/连接开销）

## 三、关键 CSS 与异步样式表

`head.ejs` 的策略：

```html
<style>/* critical.css：变量、reset、布局骨架、侧栏外壳、卡片外壳 */</style>
<style>:root{ --sidebar-w:300px; ... }</style>   <!-- 主题配置 → CSS 变量 -->
<link rel="preload" as="style" href="/css/theme.css?v=..." onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/css/theme.css?v=..."></noscript>
```

首屏结构样式内联（不发请求、不阻塞），完整样式异步补齐。关掉：`assets.critical_css: false`。

主题配置里这几个值会直接注入 CSS 变量，改配置不用重新编译样式：
`base_font_size`、`sidebar_width`、`width`、`radius`、`accent`、`font_family`、`code_font`。

## 四、Cloudflare `_headers`

指纹启用后，静态资源可以开**一年不可变缓存**，HTML 保持协商缓存（发文刷新立刻可见）。

```txt
# 站点根目录 source/_headers
/*.html
  Cache-Control: public, max-age=0, must-revalidate

/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=31536000, immutable

/background/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/search.json
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/apple-touch-icon.png
  Cache-Control: public, max-age=31536000, immutable

/favicon.ico
  Cache-Control: public, max-age=31536000, immutable
```

⚠️ **不要**写 `/*` 兜底的 `Cache-Control`：Cloudflare 会把同一响应头命中多条规则的值用逗号拼起来，跟默认的 `public, max-age=0, must-revalidate` 拼一起就是非法值。

也可以让主题生成：`performance.generate_headers: true`（仅当站点 `source/_headers` 不存在时才写，避免覆盖你手写的那份）。

验证：

```bash
curl -sI https://你的域名/css/theme.css | grep -i cache-control
curl -sI https://你的域名/ | grep -i cache-control
```

## 五、其它已做的优化

- **背景大图**：构建期按页面路径稳定选择（`yn_background()`），同一页面每次访问都是同一张 → 可被浏览器/CDN 缓存，也能在 `<head>` 里 `preload`（原版是运行时随机 + jQuery 设 style，缓存必然错开）。窄屏下直接不加载背景图，省流量。图已压成 WebP：6 张共 180KB（原来 6 张 JPEG 共 284KB）。
- **Speculation Rules**：`performance.instant_nav: true` 时注入 `<script type="speculationrules">`，鼠标悬停即预渲染下一页，站内跳转接近瞬时（浏览器不支持时自动忽略，无副作用）。
- **图片**：`loading="lazy" decoding="async"`，缺少 `alt` 时自动补空 `alt`；文章正文第一张图自动改成 `loading="eager" fetchpriority="high"`（它是 LCP 候选）。
- **评论 / 不蒜子**：`IntersectionObserver` 触发加载，首屏对 `giscus.app`、`busuanzi` 零请求。
- **运行天数计时器**：只在页脚可见时每秒更新（原版 `setInterval(...,250)` 无条件跑）。
- **HTML 压缩**：只删注释 + 标签间空白，`pre / textarea / script / style` 原样保护，避免压坏代码块（`performance.minify_html: false` 可关）。
- **无网页字体**：正文用系统字体栈，少 2~4 个字体请求和 FOUT。

## 六、构建期体检

```bash
node tools/check.mjs E:/my-blog/public
```

输出每页 HTML 体积、本地资源引用是否有缺失、还有多少阻塞渲染的 `<link rel=stylesheet>`、以及是否残留 jQuery / require.js / FontAwesome / fancybox / MathJax2 的引用。

## 七、还能再快的地方（没做，留给你）

- Cloudflare 侧：开 Brotli（默认开）、Tiered Cache、早提示（Early Hints）。
- 背景图用 Cloudflare Images / 图片变换按设备下发不同分辨率（现在统一 1600px 宽）。
- 站内搜索索引超过几百篇再考虑分片或换成预构建的倒排索引。
- 若在意 LCP，可把首屏背景图换成更低分辨率的占位（LQIP）+ 模糊过渡。
