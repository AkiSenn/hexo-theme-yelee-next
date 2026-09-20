/* eslint-disable */
/**
 * yelee-next · 配置归一化
 * ---------------------------------------------------------------------------
 * 1) 把原版 yelee 3.5 的扁平配置项映射到新结构（新 key 优先，绝不覆盖显式配置）
 * 2) 补齐默认值，派生模板里要用的列表（menu_items / subnav_items / background_list ...）
 * 3) 对明显配错的地方打 warning，而不是静默失败
 *
 * 本文件由 Hexo 的插件加载器执行：外层是 (async function(exports, require, module,
 * __filename, __dirname, hexo){ ... })，所以这里可以直接用 `hexo`。
 */

const DEFAULTS = {
  version: '1.2.0',

  profile: {
    author: '',
    subtitle: '',
    avatar: '/img/avatar.png',
    favicon: '/img/favicon.png',
    apple_touch_icon: '',
    email: '',
    since: '',
    aboutme: ''
  },

  menu: { 主页: '/' },
  subnav: {},
  friends: {},

  appearance: {
    base_font_size: 16,
    sidebar_width: 300,
    background_image: 6,
    background_overlay: 0.3,
    color_scheme: 'auto',
    theme_switch: true,
    animate: true,
    reading_progress: true,
    accent: '',
    radius: 14,
    width: 1000,
    font_family: '',
    code_font: ''
  },

  article: {
    excerpt: 'auto',
    excerpt_length: 200,
    more_link: '',
    toc: {
      enable: true,
      min_depth: 2,
      max_depth: 3,
      list_number: true,
      expand: false,
      nowrap: false
    },
    copyright: true,
    license: 'CC BY-NC-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    lightbox: true,
    lazyload: true,
    updated: true,
    word_count: true,
    reading_time: true,
    post_nav: true,
    share: ['native', 'copy', 'weibo', 'twitter', 'telegram']
  },

  search: {
    enable: true,
    path: 'search.json',
    limit: 20,
    excerpt_length: 140,
    preload: false,
    shortcut: true
  },

  comments: {
    enable: true,
    lazyload: true,
    /* preload: false → 先显示一条「点击加载评论」的细栏（复刻原版 click2show），
       true → 直接展开加载；collapsible: false → 不给「收起」按钮 */
    preload: false,
    collapsible: true,
    provider: 'giscus',
    hint: '',
    giscus: {
      repo: '',
      repo_id: '',
      category: 'Announcements',
      category_id: '',
      mapping: 'pathname',
      strict: false,
      reactions_enabled: 1,
      input_position: 'top',
      theme: 'preferred_color_scheme',
      lang: 'zh-CN',
      loading: 'lazy'
    },
    waline: { serverURL: '', lang: 'zh-CN' },
    twikoo: { envId: '' },
    disqus: { shortname: '' },
    valine: { appid: '', appkey: '', serverURLs: '' }
  },

  footer: {
    copyright: true,
    powered_by: true,
    custom: '',
    icp: '',
    icp_link: '',
    /* 公安备案：police_icp 是展示文案，police_icp_code 是备案编号（纯数字/字母）。
       链接留空时按编号自动生成 mps.gov.cn 的查询地址。 */
    police_icp: '',
    police_icp_code: '',
    police_icp_link: '',
    police_icp_icon: '',
    runtime: { enable: true, since: '', text: '' },
    visit_counter: {
      enable: true,
      provider: 'busuanzi',
      /* 新版不蒜子(cdn.busuanzi.cc) 的 api.php 会直接返回这些字段，
         脚本按「字段名 = 元素 id」回填，所以模板里写上对应 id 就行，不需要额外 JS：
           busuanzi_today_pv 今日总访问量 / busuanzi_today_uv 今日访客数
           busuanzi_site_pv  本站总访问量 / busuanzi_site_uv  本站访客数
           busuanzi_page_pv  本页阅读量   / busuanzi_page_uv  本页访客数 */
      today_pv: true,
      today_uv: false,
      site_pv: true,
      site_uv: false,
      page_pv: false,
      page_uv: false
    }
  },

  math: {
    enable: true,
    per_page: true,
    engine: 'mathjax',
    mathjax: { cdn: 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js', config: {} },
    katex: {
      cdn: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js',
      auto_render: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js',
      css: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
    }
  },

  analytics: { google_analytics: '', baidu_tongji: '' },

  assets: { cdn: '', fingerprint: true, critical_css: true, preconnect: [] },

  performance: {
    minify_html: true,
    instant_nav: true,
    generate_headers: false,
    precompress: false,
    precompress_quality: 11
  },

  seo: { twitter_id: '', og_image: '', json_ld: true, baidu_site: '', google_site: '' },

  open_in_new: true,
  open_in_new_exclude: []
};

/* 旧 key → 新 key。to 为 null 表示该配置在新版里已没有对应物（只提示，不报错）。 */
const AS_IS = v => v;
const NUM = v => (v === '' || v === null ? undefined : Number(v));
const BOOL = v => (typeof v === 'string' ? v !== 'false' && v !== '0' : !!v);
const SHARE_LIST = v => (BOOL(v) ? DEFAULTS.article.share : []);

const LEGACY_MAP = [
  ['avatar', 'profile.avatar', AS_IS],
  ['favicon', 'profile.favicon', AS_IS],
  ['author', 'profile.author', AS_IS],
  ['since', 'profile.since', AS_IS],
  ['aboutme', 'profile.aboutme', AS_IS],
  ['subtitle', 'profile.subtitle', AS_IS],

  ['left_col_width', 'appearance.sidebar_width', NUM],
  ['base_font_size', 'appearance.base_font_size', NUM],
  ['background_image', 'appearance.background_image', AS_IS],
  ['color_scheme', 'appearance.color_scheme', v => v || 'auto'],
  ['animate', 'appearance.animate', BOOL],
  ['progressBar.on', 'appearance.reading_progress', BOOL],
  ['limit_article_width.max_width', 'appearance.width', v => (v ? Math.round(Number(v) * 16) : undefined)],

  ['fancybox', 'article.lightbox', BOOL],
  ['copyright', 'article.copyright', BOOL],
  ['toc.on', 'article.toc.enable', BOOL],
  ['toc.list_number', 'article.toc.list_number', BOOL],
  ['toc.max_depth', 'article.toc.max_depth', NUM],
  ['toc.nowrap', 'article.toc.nowrap', BOOL],

  ['search.on', 'search.enable', BOOL],
  ['search.path', 'search.path', AS_IS],
  ['search.content', 'search.excerpt_length', v => (BOOL(v) ? 140 : 0)],

  ['share.on', 'article.share', SHARE_LIST],

  ['visit_counter.on', 'footer.visit_counter.enable', BOOL],
  ['visit_counter.site_visit', 'footer.visit_counter.site_pv', BOOL],
  ['visit_counter.page_visit', 'footer.visit_counter.page_pv', BOOL],

  ['mathjax.enable', 'math.enable', BOOL],
  ['mathjax.per_page', 'math.per_page', BOOL],

  ['google_analytics', 'analytics.google_analytics', AS_IS],
  ['baidu_tongji', 'analytics.baidu_tongji', AS_IS],
  ['baidu_site', 'seo.baidu_site', AS_IS],
  ['google_site', 'seo.google_site', AS_IS],

  ['preload_comment', 'comments.preload', BOOL],
  ['open_in_new.global', 'open_in_new', BOOL],
  ['open_in_new', 'open_in_new', AS_IS],

  /* 已废弃且无法平移的旧配置：仅记录，避免用户以为还在生效 */
  ['root_url', null],
  ['CDN', null],
  ['jquery_ui', null],
  ['github_widget', null],
  ['ie_updater', null],
  ['tab_title_change', null],
  ['highlight_style', null],
  ['blockquote_style', null],
  ['heading_style', null],
  ['list_style', null],
  ['tagcloud', null],
  ['limit_article_width.on', null],
  ['search.field', null],
  ['search.onload', null],
  ['rss', null]
];

const COMMENT_LEGACY = [
  ['valine', 'valine'],
  ['disqus', 'disqus'],
  ['youyan', 'youyan'],
  ['duoshuo', 'duoshuo']
];

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function getPath(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let cur = obj;
  for (const k of keys) {
    if (!isPlainObject(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[last] = value;
}

/** 深合并：override 优先；数组整体替换；null 视为「没写」（YAML 空值） */
function deepMerge(base, override) {
  if (!isPlainObject(base)) return override === undefined ? base : override;
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  if (!isPlainObject(override)) return out;
  for (const key of Object.keys(override)) {
    const o = override[key];
    if (o === undefined || o === null) continue;
    out[key] = isPlainObject(out[key]) && isPlainObject(o) ? deepMerge(out[key], o) : o;
  }
  return out;
}

function toArrayOfPaths(value, dir) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const n = Number(value);
    return Array.from({ length: n }, (_, i) => `${dir}/bg-${i + 1}.webp`);
  }
  return [String(value)];
}

function normalizeMenu(menu) {
  const list = [];
  for (const [name, value] of Object.entries(menu || {})) {
    if (isPlainObject(value)) {
      list.push({
        name,
        path: value.path || value.url || '/',
        icon: value.icon || '',
        new_tab: !!value.new_tab
      });
    } else {
      list.push({ name, path: value, icon: '', new_tab: false });
    }
  }
  return list;
}

function normalizeSocial(subnav) {
  const list = [];
  for (const [name, value] of Object.entries(subnav || {})) {
    if (isPlainObject(value)) {
      list.push({ name, url: value.url || value.path || '#', icon: value.icon || name });
    } else {
      list.push({ name, url: value, icon: name });
    }
  }
  return list;
}

let normalized = false;

function normalize() {
  if (normalized) return;
  const theme = hexo.theme.config;
  if (!theme) return;

  const site = hexo.config || {};
  /* 站点根目录的 _config.<theme>.yml（Hexo 已经解析好并放在 config.theme_config） */
  const alt = deepMerge({}, site.theme_config || {});
  const used = [];
  const dropped = [];

  const isSet = v => v !== undefined && v !== null && v !== '';

  /* ---- 1) 旧 key 平移 ----
     优先级：站点 alt 里的新 key > 站点 alt 里的旧 key > 主题 _config.yml 里的值 > 内置默认值
     主题自带的 _config.yml 故意把「有旧 key 对应」的项留空，避免挡住旧配置。 */
  for (const [from, to, transform] of LEGACY_MAP) {
    const altLegacy = getPath(alt, from);
    const altNew = to ? getPath(alt, to) : undefined;
    const themeLegacy = getPath(theme, from);

    if (!to) {
      if (isSet(altLegacy) || isSet(themeLegacy)) dropped.push(from);
      continue;
    }
    /* 站点已经用新式 key 显式配过 → 不动 */
    if (isSet(altNew)) continue;

    const source = isSet(altLegacy) ? altLegacy : isSet(themeLegacy) ? themeLegacy : undefined;
    if (source === undefined) continue;
    /* open_in_new 这种「新结构是布尔、旧结构是对象」的键，只在旧值是布尔时才平移 */
    if (to === 'open_in_new' && isPlainObject(source)) continue;

    let value;
    try {
      value = transform(source, theme);
    } catch (e) {
      value = undefined;
    }
    if (value === undefined) continue;
    /* 目标值已经一样就不折腾（例如主题自带 _config.yml 里写的 search.path） */
    if (getPath(theme, to) === value) continue;
    setPath(theme, to, value);
    used.push(`${isSet(altLegacy) ? '' : 'theme:'}${from} → ${to}`);
  }

  /* ---- 2) 旧评论后端自动识别（站点显式配了 comments.provider 就不插手）---- */
  if (!isSet(getPath(alt, 'comments.provider'))) {
    for (const [key, provider] of COMMENT_LEGACY) {
      const altConf = getPath(alt, key);
      const themeConf = getPath(theme, key);
      const conf = isSet(altConf) ? altConf : themeConf;
      if (!isPlainObject(conf)) continue;
      /* 旧配置里写了 on: false 就是明确关掉，别因为还留着 appid 就把它当启用 */
      const explicitlyOff = conf.on === false || conf.on === 'false' || conf.on === 0;
      if (explicitlyOff) continue;
      if (conf.on === true || conf.shortname || conf.appid || conf.domain || conf.id) {
        setPath(theme, 'comments.provider', provider);
        used.push(`${key}.on → comments.provider=${provider}`);
        break;
      }
    }
  }

  /* ---- 3) 兜默认值 ---- */
  const merged = deepMerge(DEFAULTS, theme);
  for (const key of Object.keys(theme)) delete theme[key];
  Object.assign(theme, merged);

  /* ---- 4) 站点级配置兜底 ---- */
  const siteAuthor = site.author || site.title || '';
  if (!theme.profile.author) theme.profile.author = siteAuthor;
  if (!theme.profile.subtitle) theme.profile.subtitle = site.subtitle || site.description || '';
  if (!theme.profile.email && site.email) theme.profile.email = site.email;
  if (!theme.seo.og_image) theme.seo.og_image = theme.profile.avatar;

  /* ---- 5) 派生列表 / 类型收敛 ---- */
  theme.menu_items = normalizeMenu(theme.menu);
  theme.subnav_items = normalizeSocial(theme.subnav);
  theme.friends_items = normalizeSocial(theme.friends);
  theme.background_list = toArrayOfPaths(theme.appearance.background_image, '/background');

  /* 公安备案图标：配置留空时，若主题 source/img/beian.png 存在就自动用它
     （把公安部给的官方图标丢进 themes/yelee-next/source/img/ 即可，无需改配置），
     否则回落到内置的盾牌 SVG。 */
  if (theme.footer.police_icp && !theme.footer.police_icp_icon) {
    try {
      const fs = require('fs');
      const path = require('path');
      if (fs.existsSync(path.join(hexo.theme_dir, 'source', 'img', 'beian.png'))) {
        theme.footer.police_icp_icon = '/img/beian.png';
      }
    } catch (e) {}
  }

  /* 公安备案链接：给了就用手填的，否则用编号自动拼 mps.gov.cn 的查询地址 */
  if (theme.footer.police_icp) {
    const code = String(theme.footer.police_icp_code || (String(theme.footer.police_icp).match(/\d{6,}/) || [''])[0] || '');
    theme.footer.police_icp_code = code;
    if (!theme.footer.police_icp_link) {
      theme.footer.police_icp_link = code
        ? `https://beian.mps.gov.cn/#/query/webSearch?code=${code}`
        : 'https://beian.mps.gov.cn/';
    }
  }


  theme.appearance.base_font_size = Number(theme.appearance.base_font_size) || 16;
  theme.appearance.sidebar_width = Number(theme.appearance.sidebar_width) || 300;
  theme.appearance.width = Number(theme.appearance.width) || 1000;
  theme.appearance.radius = Number(theme.appearance.radius);
  if (Number.isNaN(theme.appearance.radius)) theme.appearance.radius = 14;
  theme.appearance.background_overlay = Number(theme.appearance.background_overlay);
  if (Number.isNaN(theme.appearance.background_overlay)) theme.appearance.background_overlay = 0.3;

  if (typeof theme.article.share === 'string') theme.article.share = [theme.article.share];
  if (theme.article.share === true) theme.article.share = DEFAULTS.article.share.slice();
  if (!theme.article.share) theme.article.share = [];

  if (typeof theme.open_in_new === 'string') theme.open_in_new = theme.open_in_new !== 'false';

  /* 搜索关闭时不需要索引文件 */
  if (!theme.search.enable) theme.search.enabled = false;

  /* ---- 6) 体检 ---- */
  const warn = msg => hexo.log.warn(`[yelee-next] ${msg}`);

  if (used.length) hexo.log.info('[yelee-next] 已自动迁移旧配置：%s', used.join(', '));
  if (dropped.length) {
    hexo.log.info(
      '[yelee-next] 以下旧配置在新版已不再使用（可删除）：%s',
      [...new Set(dropped)].join(', ')
    );
  }

  const provider = theme.comments.provider;
  if (theme.comments.enable && provider === 'giscus') {
    if (!theme.comments.giscus.repo || !theme.comments.giscus.repo_id) {
      warn('comments.provider=giscus 但 repo / repo_id 没填完整，评论会加载失败。到 https://giscus.app 生成后填进 _config.yml');
    }
  }
  if (theme.comments.enable && provider === 'waline' && !theme.comments.waline.serverURL) {
    warn('comments.provider=waline 但 waline.serverURL 为空');
  }
  if (theme.comments.enable && provider === 'twikoo' && !theme.comments.twikoo.envId) {
    warn('comments.provider=twikoo 但 twikoo.envId 为空');
  }
  if (theme.comments.enable && provider === 'disqus' && !theme.comments.disqus.shortname) {
    warn('comments.provider=disqus 但 disqus.shortname 为空');
  }
  if (theme.math.enable && theme.math.per_page && theme.math.engine === 'mathjax' && !theme.math.mathjax.cdn) {
    warn('math.mathjax.cdn 为空，公式文章不会渲染');
  }
  if (theme.assets.cdn && theme.assets.fingerprint) {
    hexo.log.info('[yelee-next] 使用 CDN 前缀 %s，资源指纹已启用', theme.assets.cdn);
  }

  normalized = true;
}

/* 归一化必须发生在任何模板渲染之前 */
hexo.extend.filter.register('before_generate', normalize, 5);

module.exports = normalize;
