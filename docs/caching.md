<p align="right"><a href="./caching.en.md">English</a> · <strong>简体中文</strong></p>

# 缓存配置

## 资源指纹

主题 CSS 和 JavaScript 会在 URL 中附加文件指纹，例如 css/theme.css?v=HASH。文件内容变化时，指纹也会变化，浏览器和 CDN 因此会请求新版本；未变化的文件可安全使用长期缓存。

主题头像、图标、背景图、社交分享图，以及能定位到本地文件的文章图片也会自动加指纹。外链、data URL、查找不到的图片路径和文章资源目录中的图片保持原样。

- 修改图片后建议先运行 hexo clean，再重新生成，避免增量构建复用旧 HTML。
- assets.fingerprint: false 可关闭所有指纹。
- assets.cdn 只作用于主题 CSS 和 JavaScript，图片仍由站点提供。

## 样式加载

主题将首屏所需的关键 CSS 内联到 HTML，并异步加载完整样式表。设置 assets.critical_css: false 可关闭关键 CSS 内联。

## Cloudflare 缓存头

在站点的 source/_headers 中可配置：

~~~text
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
~~~

避免添加匹配所有路径的 Cache-Control 规则；Cloudflare 可能会将多条规则中的值合并，导致响应头无效。

也可以将 performance.generate_headers 设为 true，让主题生成 source/_headers。若该文件已存在，主题不会覆盖它。

## 可选 Brotli 预压缩

将 performance.precompress 设为 true 后，构建会为 CSS 和 JavaScript 生成 .br 文件。仅当托管方会直接提供这些文件时才启用，例如配置了 brotli_static 的 Nginx，或自定义 Worker。

Cloudflare Workers 静态资产和 GitHub Pages 不会自动使用同目录下的 .br 文件；在这些平台单独开启预压缩不会缩小传输内容。

## 检查构建产物

~~~bash
node tools/check.mjs /path/to/hexo-site/public
~~~

该命令会检查缺失的本地资源引用、渲染阻塞样式表和遗留依赖。
