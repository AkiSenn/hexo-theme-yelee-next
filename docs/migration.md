# 从 yelee 3.5 迁移到 yelee-next

## 一、三步走

### 1. 换主题

```yaml
# 站点 _config.yml
theme: yelee-next      # 原来是 yelee
```

挂载方式见 README（推荐 `node tools/link.mjs E:/hexo`，用目录 junction，主题源码留在独立仓库里）。

### 2. 老配置直接搬（或直接抄起步配置）

> 懒得对比旧 key 的话，直接用仓库里的起步配置：
> `cp docs/starter-config.yml <站点>/_config.yelee-next.yml`，里面按你这套站点预设好了，
> 只需填 ICP / GA / giscus 几处（都有 `👉` 标注与分步说明）。下面的自动迁移对老配置同样生效。


把原来的 `themes/yelee/_config.yml` **另存为站点根目录的 `_config.yelee-next.yml`**，不用改任何 key：

```bash
cp themes/yelee/_config.yml _config.yelee-next.yml
```

构建时会打印一行迁移日志，例如：

```
INFO  [yelee-next] 已自动迁移旧配置：avatar → profile.avatar, left_col_width → appearance.sidebar_width,
      toc.on → article.toc.enable, mathjax.enable → math.enable, google_analytics → analytics.google_analytics ...
INFO  [yelee-next] 以下旧配置在新版已不再使用（可删除）：CDN, jquery_ui, github_widget, ie_updater, ...
```

不用一次性改干净，新版会一直兼容旧 key；想收拾干净再照着下面的表改。

### 3. 构建

```bash
hexo clean && hexo g && hexo s
```

`hexo clean` 必须做一次：主题换了、模板路径全变了。

---

## 二、旧 key → 新 key 对照表

| 原版 yelee 3.5 | yelee-next | 说明 |
| --- | --- | --- |
| `avatar` / `favicon` / `author` / `subtitle` / `since` / `aboutme` | `profile.*` | 留空时 `author`/`subtitle`/`email` 回落站点 `config` |
| `left_col_width` | `appearance.sidebar_width` | |
| `base_font_size` | `appearance.base_font_size` | |
| `background_image: 5` | `appearance.background_image` | 现在从 `bg-1..bg-N.webp` 里**按页面固定**选一张（原版是每次刷新随机，且靠 jQuery） |
| `color_scheme` | `appearance.color_scheme` | `auto` / `light` / `dark`，新增深色模式 |
| `animate` | `appearance.animate` | |
| `progressBar.on` | `appearance.reading_progress` | |
| `limit_article_width.max_width`（单位 em） | `appearance.width`（px，×16 换算） | |
| `toc.on` / `list_number` / `max_depth` / `nowrap` | `article.toc.*` | 新增 `min_depth`、`expand` |
| `copyright` | `article.copyright` | 新增 `license` / `license_url` |
| `fancybox` | `article.lightbox` | fancybox 2 依赖 jQuery，换成原生 `<dialog>` |
| `search.on` / `path` | `search.enable` / `search.path` | 索引格式换成 `search.json` |
| `search.content` | `search.excerpt_length` | |
| `share.on` | `article.share` | 从布尔变成数组：`[native, copy, weibo, twitter, telegram, qq]` |
| `visit_counter.on` / `site_visit` / `page_visit` | `footer.visit_counter.enable` / `site_pv` / `page_pv` | 新增 `site_uv`、`src` |
| `mathjax.enable` / `per_page` | `math.enable` / `math.per_page` | **修掉了原版 `theme.mathjax` 恒为真导致全站加载 MathJax 的 bug** |
| `google_analytics` / `baidu_tongji` | `analytics.*` | |
| `disqus` / `valine` / `duoshuo` / `youyan` 的 `.on` | `comments.provider` | 写了 `on: false` 的会被正确忽略 |
| `baidu_site` / `google_site` | `seo.baidu_site` / `seo.google_site` | |
| `open_in_new.global` | `open_in_new` | 分区域粒度取消，改为全局开关 + `open_in_new_exclude` |

**已废弃**（新版不再使用，构建时会提示）：`CDN`（全部自托管）、`jquery_ui`、`github_widget`、`ie_updater`、`tab_title_change`、`highlight_style`、`blockquote_style`、`heading_style`、`list_style`、`tagcloud`（标签云变成侧栏固定面板）、`rss`（RSS 链接直接写在 `subnav` 里）、`search.field`、`root_url`（统一用 Hexo 的 `config.root`）。

---

## 三、迁移后建议手动做的事

### 1. 评论换成 giscus

原版配的 `valine`（LeanCloud 国内版）和 `duoshuo`（多说已停服）、`youyan`（友言已停服）都不能用了。到 <https://giscus.app> 选仓库 → 生成配置 → 抄进 `_config.yelee-next.yml`：

```yaml
comments:
  provider: giscus
  giscus:
    repo: 用户名/仓库名
    repo_id: R_xxxxxxx        # 必填，否则评论区加载失败（构建时会 warning）
    category: Announcements
    category_id: DIC_xxxxxxx  # 必填
    mapping: pathname
```

> 想保留旧的 Valine 评论数据，就把 `provider: valine` 填上、`valine.appid/appkey/serverURLs` 填全（主题仍支持）。但 LeanCloud 国内版已经不稳定，长期看建议迁 giscus。

### 2. 统计

`analytics.google_analytics` 现在同时支持 `UA-` 和 `G-`。原版 `head.ejs` 里硬编码的那个 `G-F61JPBRL9V` 已经删掉了 —— 那是写在模板里的，任何配置都改不动它，属于 bug。

### 3. 可以卸掉的 Hexo 插件

| 插件 | 建议 | 原因 |
| --- | --- | --- |
| `hexo-renderer-stylus` | 卸载 | 新版是纯 CSS，不再编译 stylus |
| `hexo-generator-search` | 卸载 | 主题自带 `search.json`，它生成的 `search.xml` 白占体积 |
| `hexo-prism-plugin` | 建议卸载 | 它会在**每个页面**注入一个阻塞渲染的 `/css/prism.css`（实测 20 个页面都有）；主题自己给 `figure.highlight` / `pre>code` 两种结构都做了语言标签、复制按钮与语法着色 |
| `hexo-neat` | 建议关掉 | `neat_enable: false`；主题自带保守压缩（只去注释与标签间空白，跳过 `pre/script/style`），两个一起上容易互相打架 |
| `hexo-filter-github-emojis` | 可留 | 与主题无关 |

```bash
npm remove hexo-renderer-stylus hexo-generator-search
```

### 4. 缓存头（Cloudflare）

指纹上线后，静态资源可以放心开一年不可变缓存。见 [`caching.md`](./caching.md)，里面有可以直接抄的 `_headers`。

### 5. front-matter 约定（可选）

```yaml
---
title: 一篇文章
mathjax: true     # 只有写了才加载公式库（默认 per_page: true）
toc: false        # 单篇关掉目录
comments: false   # 单篇关掉评论
search: false     # 不进搜索索引
sticky: 100       # 置顶（配合 hexo-generator-index）
---
```

### 6. 打开搜索

老配置里 `search.on: false` 会把搜索关掉（原主题默认也是关的）。新式 key 优先级更高，所以只要在 `_config.yelee-next.yml` 里写：

```yaml
search:
  enable: true
  limit: 20
  excerpt_length: 140
  preload: false
  shortcut: true      # 按 / 或 Ctrl/Cmd+K 唤起
```

构建日志里出现 `Generated: search.json` 就说明索引生成成功。前端交互：放大镜或快捷键唤起浮层 → `↑↓` 选择 → `Enter` 打开。
（原主题是侧栏内嵌输入框 + `search.xml` + jQuery 解析，新版换成构建期 `search.json` + 原生 JS；`hexo-generator-search` 可以卸掉了。）

### 7. 标签 / 分类页

`source/tags/index.md`、`source/categories/index.md` 是空内容的页面，新版会在里面自动渲染**标签云 + 分类索引**（老 yelee 靠硬编码路径 `tags/index.html` 判断，新版两种写法都认：Hexo 约定的 `type: tags` 或路径匹配）。

### 8. 404 页面

站点 `source/404.html`（配 `skip_render`）优先级更高，主题自带的 `layout/404.ejs` 只是兜底；两者可以共存，不动也行。

---

## 四、回滚

主题是独立仓库、配置是独立的 `_config.yelee-next.yml`，回滚只要：

```yaml
theme: yelee
```

```bash
node E:/yelee-next/tools/link.mjs E:/hexo --unlink
hexo clean && hexo g
```

老主题目录 `themes/yelee` 一直没动过，站点原来的 `_config.yml` 也没被改（只多了一个 `_config.yelee-next.yml`）。
