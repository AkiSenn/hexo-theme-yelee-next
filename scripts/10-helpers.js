/* eslint-disable */
/**
 * yelee-next · 模板助手
 * ---------------------------------------------------------------------------
 * 全部以 yn_ 前缀注册，避免和 Hexo 核心助手（url_for / toc / list_tags ...）撞名。
 * 这些函数在模板里通过 this（= 当前页面的 locals）拿到了 config / theme / page。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { escapeHTML } = require('hexo-util');
const { plainText, countWords, readingMinutes, stableHash } = require(path.join(
  hexo.theme_dir,
  'lib',
  'text.js'
));

const helper = hexo.extend.helper;
const hashCache = new Map();
const fileCache = new Map();

/* ------------------------------------------------------------------ 基础工具 */

function readThemeFile(rel) {
  const abs = path.join(hexo.theme_dir, 'source', rel.replace(/^\/+/, ''));
  if (fileCache.has(abs)) return fileCache.get(abs);
  let content = '';
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    content = '';
  }
  fileCache.set(abs, content);
  return content;
}

function fileHash(rel) {
  const abs = path.join(hexo.theme_dir, 'source', rel.replace(/^\/+/, ''));
  if (hashCache.has(abs)) return hashCache.get(abs);
  let hash = '';
  try {
    hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex').slice(0, 8);
  } catch (e) {
    hash = '';
  }
  hashCache.set(abs, hash);
  return hash;
}

/* ------------------------------------------------------------------ 资源相关 */

/** 主题资源 URL：可选 CDN 前缀 + 内容指纹 */
helper.register('yn_asset', function (rel) {
  const cfg = this.theme || {};
  const assets = cfg.assets || {};
  const clean = String(rel).replace(/^\/+/, '');
  let url;
  if (assets.cdn) {
    url = String(assets.cdn).replace(/\/+$/, '') + '/' + clean;
  } else {
    url = this.url_for('/' + clean);
  }
  if (assets.fingerprint) {
    const hash = fileHash(clean);
    if (hash) url += (url.includes('?') ? '&' : '?') + 'v=' + hash;
  }
  return url;
});

/** 内联关键 CSS 的正文 */
helper.register('yn_critical_css', function () {
  return readThemeFile('css/_critical.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim();
});

/** 图片地址：绝对 URL 原样返回，站内相对路径走 url_for */
helper.register('yn_img', function (src) {
  if (!src) return '';
  const s = String(src);
  if (/^(https?:)?\/\//.test(s) || s.startsWith('data:')) return s;
  return this.url_for(s.startsWith('/') ? s : '/' + s);
});

/** 绝对地址（OG / Twitter Card / JSON-LD 必须用绝对 URL） */
helper.register('yn_abs', function (src) {
  if (!src) return '';
  const s = String(src);
  if (/^https?:\/\//.test(s)) return s;
  const base = String((this.config && this.config.url) || '').replace(/\/+$/, '');
  const path = /^\/\//.test(s) ? s : this.url_for(s.startsWith('/') ? s : '/' + s);
  return base + (path.startsWith('/') ? path : '/' + path);
});

/** 内联 SVG 图标（symbol 定义见 layout/_partial/icons.ejs） */
helper.register('yn_icon', function (name, opts) {
  const o = opts || {};
  const cls = ['icon', o.class].filter(Boolean).join(' ');
  const size = o.size ? ` width="${o.size}" height="${o.size}"` : '';
  const a11y = o.label ? ` role="img" aria-label="${escapeHTML(o.label)}"` : ' aria-hidden="true"';
  return `<svg class="${cls}"${size}${a11y} focusable="false"><use href="#i-${escapeHTML(String(name))}"></use></svg>`;
});

/** 按页面路径稳定地选一张背景图（构建期决定，可被 CDN 缓存、可被 preload） */
helper.register('yn_background', function () {
  const cfg = this.theme || {};
  const list = cfg.background_list || [];
  if (!list.length) return '';
  const key = this.page && this.page.path ? this.page.path : (this.path || '/');
  return list[stableHash(String(key)) % list.length];
});

/* ------------------------------------------------------------------ 文章相关 */

/** 列表页摘要：有 <!-- more --> 用渲染好的 excerpt，否则按字数截断纯文本 */
helper.register('yn_excerpt', function (post) {
  const cfg = (this.theme && this.theme.article) || {};
  if (!post) return '';
  if (post.excerpt) return post.excerpt;
  if (cfg.excerpt === false) return post.content || '';
  const len = Number(cfg.excerpt_length) || 200;
  return escapeHTML(plainText(post.content, len));
});

/** 列表页是否展示「阅读全文」 */
helper.register('yn_has_more', function (post) {
  const cfg = (this.theme && this.theme.article) || {};
  if (!post) return false;
  if (post.excerpt) return true;
  return cfg.excerpt !== false;
});

helper.register('yn_words', function (post) {
  if (!post) return 0;
  return countWords(post.content || post.excerpt || '');
});

helper.register('yn_minutes', function (post) {
  return readingMinutes(this.yn_words(post));
});

/** 文章目录：交给 Hexo 官方 toc()，只固定 class 名，方便 CSS/JS 挂载 */
helper.register('yn_toc', function (post, opts) {
  const cfg = (this.theme && this.theme.article && this.theme.article.toc) || {};
  const o = Object.assign({}, cfg, opts || {});
  const content = post && (post.content || post._content);
  if (!content) return '';
  return this.toc(content, {
    min_depth: Number(o.min_depth) || 2,
    max_depth: Number(o.max_depth) || 3,
    list_number: o.list_number !== false,
    class: 'toc',
    class_item: 'toc-item',
    class_link: 'toc-link',
    class_text: 'toc-text',
    class_child: 'toc-child',
    class_number: 'toc-number',
    class_level: 'toc-level'
  });
});

/** 页面类型：home | post | page | archive | tag | category | 404 */
helper.register('yn_page_type', function () {
  const page = this.page || {};
  if (String(page.path || '') === '404.html' || page.layout === '404') return '404';
  if (this.is_post && this.is_post()) return 'post';
  if (this.is_home && this.is_home()) return 'home';
  if (this.is_category && this.is_category()) return 'category';
  if (this.is_tag && this.is_tag()) return 'tag';
  if (this.is_archive && this.is_archive()) return 'archive';
  if (this.is_page && this.is_page()) return 'page';
  return 'index';
});

/** 当前导航项是否命中当前页面 */
helper.register('yn_is_active', function (target) {
  if (!target) return false;
  const page = this.page || {};
  const current = ('/' + String(page.path || '').replace(/^\/+/, '')).replace(/index\.html$/, '');
  const want = String(this.url_for(target)).replace(/index\.html$/, '');
  if (want === '/' || want === '') return current === '/' || current === '';
  return current === want || current.startsWith(want) || String(page.path || '').startsWith(want.replace(/^\//, ''));
});

/** 取年份：'2020' / 2020 / Date(2020-08-25) 都能解析出来，失败返回 0 */
helper.register('yn_year', function (value) {
  if (!value) return 0;
  if (value instanceof Date) return Number(this.date(value, 'YYYY')) || 0;
  const m = String(value).match(/(\d{4})/);
  return m ? Number(m[1]) : 0;
});

/** 格式化日期 */
helper.register('yn_date', function (value, format) {
  if (!value) return '';
  return this.date(value, format || 'YYYY-MM-DD');
});

helper.register('yn_plain', function (html, limit) {
  return plainText(html, limit);
});

/* ---------------------------------------------------------------------------
 * meta description
 *
 * 搜索引擎的建议长度约 150-160 字符（中文约 75-80 字），并且**每页应当唯一**。
 * 站点描述只有一个，如果标签页 / 分类页 / 归档页都回落到它，站长后台就会报
 * 「描述过短」+「多页描述重复」。所以这里按页面类型分别拼装：
 *   · 文章页     → front-matter description → 摘要 → 正文首段
 *   · 标签/分类  → 「xxx」标签下共 N 篇文章：标题1、标题2…（随术语天然唯一）
 *   · 归档页     → 年 / 月 + 篇数 + 文章标题
 *   · 索引页     → 标签云 / 分类：共 N 个，包括 a、b、c
 *   · 普通页面   → 正文首段
 *   · 首页       → 站点描述；不足 80 字就补副标题与最新文章标题
 * 文案模板放在 languages/*.yml 的 seo: 段，可自行翻译或改写。
 * ------------------------------------------------------------------------ */
const DESC_LIMIT = 160;

/** Warehouse Query / 数组 / 空值 → 真数组 */
function asArray(value) {
  if (!value) return [];
  if (typeof value.toArray === 'function') return value.toArray();
  return Array.isArray(value) ? value : [];
}

/** 页面是不是「标签云 / 分类索引」页（新写法 type: tags；老 yelee 站点只有空页面 + 路径） */
function taxonomyIndexOf(page) {
  const type = String((page && page.type) || '');
  const p = String((page && page.path) || '');
  if (type === 'tags' || /(^|\/)tags\/index\.html$/.test(p)) return 'tags';
  if (type === 'categories' || /(^|\/)categories\/index\.html$/.test(p)) return 'categories';
  return '';
}

helper.register('yn_description', function () {
  const page = this.page || {};
  const site = this.config || {};
  const profile = (this.theme && this.theme.profile) || {};
  const cut = value => plainText(value || '', DESC_LIMIT);
  const type = this.yn_page_type();
  const posts = asArray(page.posts);
  const titles = n =>
    posts
      .slice(0, n)
      .map(post => plainText(post.title || '', 40))
      .filter(Boolean)
      .join('、');
  const names = (collection, n) =>
    asArray(collection)
      .slice(0, n)
      .map(item => plainText(item.name || item.title || '', 20))
      .filter(Boolean)
      .join('、');
  /* 模板 locals 里不一定挂着 site.tags（页面级渲染时可能是空的），
     回落到 hexo.locals —— 否则会出现「标签云：本站共 0 个标签，包括」。 */
  const siteCollection = kind =>
    asArray((this.site && this.site[kind]) || (hexo.locals.get && hexo.locals.get(kind)));
  /* 拼好的描述太短时，补一句站点描述：既满足搜索引擎的长度检查，
     又不会造成「整段重复」—— 前半段（含术语/篇数/标题）本来就是唯一的。 */
  const pad = text => {
    const base = cut(text);
    if ([...base].length >= 90) return base;
    const extra = cut(site.description || '');
    if (!extra || base.includes(extra)) return base;
    return cut(base + ' · ' + extra);
  };

  // ① front-matter 明确写了 description → 以它为准
  if (page.description) return cut(page.description);

  // ② 文章页
  if (type === 'post') return cut(page.excerpt || page.content);

  // ③ 标签 / 分类的单个术语页（随术语与文章变化，天然唯一）
  if (type === 'tag' && page.tag) return pad(this.__('seo.tag', page.tag, posts.length, titles(3)));
  if (type === 'category' && page.category) {
    return pad(this.__('seo.category', page.category, posts.length, titles(3)));
  }

  // ④ 归档页：/archives/ 、/archives/2020/ 、/archives/2020/08/
  if (type === 'archive') {
    if (page.year && page.month) {
      return pad(this.__('seo.archive_month', page.year, page.month, posts.length, titles(3)));
    }
    if (page.year) return pad(this.__('seo.archive_year', page.year, posts.length, titles(3)));
    return pad(this.__('seo.archive', posts.length));
  }

  // ⑤ 标签云 / 分类索引页
  const taxIndex = taxonomyIndexOf(page);
  if (taxIndex === 'tags') {
    const tags = siteCollection('tags');
    if (tags.length) return pad(this.__('seo.tags_index', tags.length, names(tags, 6)));
    return pad(`${this.__('nav.tags')} | ${site.title || ''}${site.subtitle ? ' - ' + site.subtitle : ''}`);
  }
  if (taxIndex === 'categories') {
    const cats = siteCollection('categories');
    if (cats.length) return pad(this.__('seo.categories_index', cats.length, names(cats, 6)));
    return pad(`${this.__('page.category')} | ${site.title || ''}${site.subtitle ? ' - ' + site.subtitle : ''}`);
  }

  // ⑥ 普通页面（关于页等）：正文首段
  if (page.content) return pad(page.content);

  // ⑦ 首页：站点描述；不足 80 字就补副标题与最新文章标题，避免被判「描述过短」
  if (type === 'home') {
    const base = cut(site.description || profile.subtitle || '');
    const extra = [];
    if ([...base].length < 80) {
      if (site.subtitle) extra.push(cut(site.subtitle));
      if (posts.length) extra.push(cut(this.__('seo.latest', titles(3))));
    }
    return cut([base, ...extra].filter(Boolean).join(' · '));
  }

  // ⑧ 兜底
  if (page.title) {
    return pad(`${page.title} | ${site.title || ''}${site.subtitle ? ' - ' + site.subtitle : ''}`);
  }
  return cut(site.description || profile.subtitle || site.title || '');
});

/** 页面标题 */
helper.register('yn_title', function () {
  const page = this.page || {};
  const site = this.config || {};
  let title = page.title;
  if (this.is_archive && this.is_archive()) {
    title = this.__('page.archives');
    /* 月份归档页面同时带 year 与 month，必须先判 is_month —— 反过来的话
       /archives/2020/ 与 /archives/2020/08/ 会生成一模一样的 title。 */
    if (this.is_month && this.is_month()) title += `: ${page.year}/${page.month}`;
    else if (this.is_year && this.is_year()) title += `: ${page.year}`;
  } else if (this.is_category && this.is_category()) {
    title = `${this.__('page.category')}: ${page.category}`;
  } else if (this.is_tag && this.is_tag()) {
    title = `${this.__('page.tag')}: ${page.tag}`;
  } else {
    /* 标签云 / 分类索引页：老 yelee 站点的 front-matter 里 title 写的是英文 slug
       （title: tags / title: categories），直接渲染会得到「tags | 站点名」。
       这类页面统一换成语言包里的名字。 */
    const taxIndex = taxonomyIndexOf(page);
    if (taxIndex && (!title || /^[a-z0-9_-]+$/i.test(String(title)))) {
      title = taxIndex === 'categories' ? this.__('page.category') : this.__('nav.tags');
    }
  }
  if (!title || this.is_home()) return site.title + (site.subtitle ? ' - ' + site.subtitle : '');
  return `${title} | ${site.title}`;
});

/** 文章第一张图（用于 og:image） */
helper.register('yn_first_image', function (post) {
  const html = (post && post.content) || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
});

/** 安全地把对象塞进 <script type="application/ld+json"> */
helper.register('yn_json', function (obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
});

/** 阅读页顺序：上一/下一篇文章（Hexo 的 post.prev / post.next 依赖排序，这里只做兜底） */
helper.register('yn_share_url', function (network, page) {
  const url = encodeURIComponent(this.url);
  const title = encodeURIComponent((page && page.title) || this.config.title);
  switch (network) {
    case 'weibo':
      return `https://service.weibo.com/share/share.php?url=${url}&title=${title}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    case 'telegram':
      return `https://t.me/share/url?url=${url}&text=${title}`;
    case 'qq':
      return `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`;
    default:
      return url;
  }
});
