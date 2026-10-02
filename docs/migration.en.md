<p align="right"><strong>English</strong> · <a href="./migration.md">简体中文</a></p>

# Migrating from Yelee 3.5

## Steps

1. Set the theme in your site config:

~~~yaml
theme: yelee-next
~~~

2. Copy themes/yelee/_config.yml to _config.yelee-next.yml in your site root. You can also start with the [starter config](./starter-config.yml). Legacy keys are detected and migrated during the build.

~~~bash
cp themes/yelee/_config.yml _config.yelee-next.yml
~~~

3. Clean and rebuild:

~~~bash
hexo clean && hexo g && hexo s
~~~

## Configuration mapping

| Yelee 3.5 | yelee-next |
| --- | --- |
| avatar, favicon, author, subtitle, since, aboutme | profile.* |
| left_col_width | appearance.sidebar_width |
| base_font_size | appearance.base_font_size |
| background_image | appearance.background_image |
| color_scheme | appearance.color_scheme |
| animate | appearance.animate |
| progressBar.on | appearance.reading_progress |
| limit_article_width.max_width | appearance.width (convert em to px by multiplying by 16) |
| toc.on, list_number, max_depth, nowrap | article.toc.* |
| copyright | article.copyright |
| fancybox | article.lightbox |
| search.on, path, content | search.enable, search.path, search.excerpt_length |
| share.on | article.share (now a list of share methods) |
| visit_counter.on, site_visit, page_visit | footer.visit_counter.* |
| mathjax.enable, per_page | math.enable, math.per_page |
| google_analytics, baidu_tongji | analytics.* |
| disqus, valine and other comment settings | comments.provider |
| baidu_site, google_site | seo.baidu_site, seo.google_site |
| open_in_new.global | open_in_new |

Removed settings include CDN, jquery_ui, github_widget, ie_updater, legacy style switches, tagcloud, rss, search.field and root_url. Build output lists legacy settings that could not be migrated.

## After migration

- **Comments:** Duoshuo and Youyan have shut down. Consider moving to giscus. Set the repository, repo_id, category and category_id before enabling it. Sites with a non-interactive ICP filing should keep comments disabled.

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

- **Analytics:** Google Analytics settings now live under analytics.google_analytics. Both UA and GA4 G- measurement IDs are supported.
- **Plugins:** hexo-renderer-stylus and hexo-generator-search are no longer needed. Prism and hexo-neat may conflict with the theme's code styling or HTML minification.
- **Post options:** Enable or disable math, the table of contents, comments and search per post with front matter, for example mathjax: true, toc: false or comments: false.
- **Search:** A legacy search.on: false setting still disables search. Set search.enable: true to turn it on.
- **Caching:** See the [caching guide](./caching.en.md) to configure static asset caching.

## Rollback

Restore the theme setting and rebuild:

~~~yaml
theme: yelee
~~~

~~~bash
hexo clean && hexo g
~~~
