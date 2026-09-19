/* eslint-disable */
/**
 * yelee-next · 本地搜索索引
 * ---------------------------------------------------------------------------
 * 构建期把文章正文压成纯文本，生成 search.json（默认约几十 KB，gzip 后更小）。
 * 前端首次聚焦搜索框时才拉取，纯原生 JS 做倒排匹配，没有 search.xml、
 * 没有 jQuery、没有第三方搜索服务。
 */

const path = require('path');
const { plainText } = require(path.join(hexo.theme_dir, 'lib', 'text.js'));

hexo.extend.generator.register('yelee_search_index', function (locals) {
  const cfg = (this.theme && this.theme.config) || {};
  const search = cfg.search || {};
  if (!search.enable) return;

  const root = this.config.root && this.config.root !== '/' ? this.config.root.replace(/\/$/, '') : '';
  const limit = Number(search.excerpt_length) || 140;

  const items = locals.posts
    .sort('-date')
    .filter(post => post.published !== false && post.search !== false && post.title)
    .map(post => {
      const full = plainText(post.content);
      const item = {
        title: String(post.title),
        url: root + '/' + String(post.path || '').replace(/^\//, ''),
        date: post.date ? post.date.format('YYYY-MM-DD') : '',
        excerpt: plainText(post.content, limit)
      };
      if (post.tags && post.tags.length) item.tags = post.tags.map(t => String(t.name || t));
      if (post.categories && post.categories.length) {
        item.categories = post.categories.map(c => String(c.name || c));
      }
      /* 只索引正文前若干字，控制索引体积 */
      if (full) item.text = full.slice(0, 1200);
      return item;
    });

  return {
    path: String(search.path || 'search.json'),
    data: JSON.stringify(items)
  };
});
