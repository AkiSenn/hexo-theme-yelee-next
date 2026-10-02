<p align="right"><a href="./migration.en.md">English</a> · <strong>简体中文</strong></p>

# 从 Yelee 3.5 迁移

## 迁移步骤

1. 将站点配置中的主题改为 yelee-next：

~~~yaml
theme: yelee-next
~~~

2. 将原 themes/yelee/_config.yml 复制为站点根目录的 _config.yelee-next.yml。也可以从 [起步配置](./starter-config.yml) 开始。旧配置项会在构建时自动识别并迁移。

~~~bash
cp themes/yelee/_config.yml _config.yelee-next.yml
~~~

3. 清理并重新构建：

~~~bash
hexo clean && hexo g && hexo s
~~~

## 配置项对照

| Yelee 3.5 | yelee-next |
| --- | --- |
| avatar、favicon、author、subtitle、since、aboutme | profile.* |
| left_col_width | appearance.sidebar_width |
| base_font_size | appearance.base_font_size |
| background_image | appearance.background_image |
| color_scheme | appearance.color_scheme |
| animate | appearance.animate |
| progressBar.on | appearance.reading_progress |
| limit_article_width.max_width | appearance.width（em 转 px，乘以 16） |
| toc.on、list_number、max_depth、nowrap | article.toc.* |
| copyright | article.copyright |
| fancybox | article.lightbox |
| search.on、path、content | search.enable、search.path、search.excerpt_length |
| share.on | article.share（改为分享方式列表） |
| visit_counter.on、site_visit、page_visit | footer.visit_counter.* |
| mathjax.enable、per_page | math.enable、math.per_page |
| google_analytics、baidu_tongji | analytics.* |
| disqus、valine 等评论配置 | comments.provider |
| baidu_site、google_site | seo.baidu_site、seo.google_site |
| open_in_new.global | open_in_new |

已移除的配置包括 CDN、jquery_ui、github_widget、ie_updater、旧版样式开关、tagcloud、rss、search.field 和 root_url。构建日志会提示无法迁移的旧配置。

## 迁移后检查

- **评论**：旧版 Duoshuo 和 Youyan 已停止服务。可迁移到 giscus；启用前需设置仓库、repo_id、分类和 category_id。非交互式 ICP 备案站点应关闭评论。

~~~yaml
comments:
  enable: true
  provider: giscus
  giscus:
    repo: username/repository
    repo_id: R_xxxxxxx
    category: Announcements
    category_id: DIC_xxxxxxx
    mapping: pathname
~~~

- **统计**：Google Analytics 配置移至 analytics.google_analytics，支持 UA 和 GA4 的 G- 衡量 ID。
- **插件**：新版不再需要 hexo-renderer-stylus 或 hexo-generator-search。Prism 和 hexo-neat 也可能与主题的代码样式或 HTML 压缩冲突。
- **文章选项**：公式、目录、评论和搜索可在 front matter 按文章启用或关闭，例如 mathjax: true、toc: false、comments: false。
- **搜索**：旧 search.on: false 会继续关闭搜索；如需启用，请设置 search.enable: true。
- **缓存**：需要配置静态资源缓存时，参见[缓存指南](./caching.md)。

## 回滚

恢复站点配置中的主题，并重新生成：

~~~yaml
theme: yelee
~~~

~~~bash
hexo clean && hexo g
~~~
