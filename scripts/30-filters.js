/* eslint-disable */
/**
 * yelee-next · 渲染后处理
 * ---------------------------------------------------------------------------
 * 这些过滤器跑在 after_render:html 上。注意 Hexo 会对「Markdown 渲染」和
 * 「主题布局渲染」各跑一遍，所以**每个转换都必须幂等**（重复执行结果不变）。
 *
 * 过滤器只拿到最终 HTML 字符串 + { path, text }，拿不到 page locals，
 * 所以页面类型靠 HTML 里的标记判断（body 的 page-* class）。
 */

const { URL } = require('url');
const path = require('path');
/* 与 10-helpers.js 共用同一份内容指纹实现（同一个文件只算一次哈希） */
const { configure, fingerprintSrc } = require(path.join(hexo.theme_dir, 'lib', 'assets.js'));
configure(hexo.theme_dir, hexo.source_dir);

/* 需要原样保留、不能被压缩逻辑碰的块 */
const PROTECT = /<(pre|textarea|script|style)\b[\s\S]*?<\/\1>/gi;

function protectBlocks(html, store) {
  return html.replace(PROTECT, m => {
    const i = store.push(m) - 1;
    return `\u0000P${i}\u0000`;
  });
}

function restoreBlocks(html, store) {
  return html.replace(/\u0000P(\d+)\u0000/g, (_, i) => store[Number(i)]);
}

/* ------------------------------------------------------------------ 代码块 */

const COPY_ICON =
  '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-copy"></use></svg>';
const CHECK_ICON =
  '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>';

/* 不是语言名的类名（高亮器/主题自己加的标记）。
   ⚠️ Prism 的输出是 <pre class="line-numbers language-bash">，早前会把 line-numbers
   当成语言名，代码块左上角就显示成「line-numbers language-bash」。 */
const NON_LANG = new Set(['highlight', 'codeblock', 'line-numbers', 'line-numbers-rows', 'prism', 'prismjs', 'language',
  /* Prism 给「没写语言的围栏」加的是 language-none，当语言名显示成「none」很怪，按无语言处理（回落 text） */
  'none', 'plain', 'plaintext', 'text']);

function langFromClasses(cls) {
  const classes = String(cls || '').split(/\s+/).filter(Boolean);
  /* 优先认显式的 language-xxx（Prism / 各渲染器的通用写法）；
     但 language-none / language-text 这类「等于没写语言」的要回落到空，
     否则代码块左上角会显示成「none」。 */
  const explicit = classes.find(c => /^language-/i.test(c));
  if (explicit) {
    const name = explicit.replace(/^language-/i, '');
    return NON_LANG.has(name.toLowerCase()) ? '' : name;
  }
  return (
    classes
      .filter(c => !NON_LANG.has(c.toLowerCase()))
      .map(c => c.replace(/^language-/, ''))[0] || ''
  );
}

function codeBar(lang) {
  return (
    `<div class="codeblock__bar">` +
    `<span class="codeblock__lang">${lang || 'text'}</span>` +
    `<button class="codeblock__copy" type="button" data-yn-copy aria-label="copy" title="copy">` +
    COPY_ICON +
    `<span class="codeblock__copied" hidden>${CHECK_ICON}</span>` +
    `</button>` +
    `</div>`
  );
}

/** figure.highlight（Hexo 内置高亮，line_number 打开时是 table 结构） */
function enhanceFigure(figure) {
  if (/data-yn-code/.test(figure)) return figure;
  const open = figure.match(/^<figure\b([^>]*)>/i);
  if (!open) return figure;
  const attrs = open[1];
  const cls = (attrs.match(/class="([^"]*)"/i) || [, ''])[1];
  const lang = langFromClasses(cls);
  const newOpen = `<figure data-yn-code="1" data-lang="${lang || 'text'}"${attrs}>`;
  return newOpen + codeBar(lang) + figure.slice(open[0].length);
}

/** 裸 <pre><code class="language-x">（prism / 关闭内置高亮时的形态） */
function enhancePre(pre) {
  if (/data-yn-code/.test(pre)) return pre;
  const open = pre.match(/^<pre\b([^>]*)>/i);
  if (!open) return pre;
  const inner = pre.slice(open[0].length, pre.length - '</pre>'.length);
  const codeOpen = inner.match(/^<code\b([^>]*)>/i);
  const cls = codeOpen ? (codeOpen[1].match(/class="([^"]*)"/i) || [, ''])[1] : '';
  /* 语言名先看内层 code 的 class，再退回 pre 的 class —— 两处都走 langFromClasses，
     不要把原始 class 串直接当语言名（那正是「line-numbers language-bash」的来源）。 */
  const lang =
    langFromClasses(cls) ||
    langFromClasses((open[1].match(/class="([^"]*)"/i) || [, ''])[1]);
  /* 已经是我们自己的结构就不动 */
  if (/class="codeblock"/.test(open[1])) return pre;
  return `<div class="codeblock" data-yn-code="1" data-lang="${lang || 'text'}">${codeBar(lang)}<pre${open[1]}>${inner}</pre></div>`;
}

function enhanceCodeBlocks(html) {
  const kept = [];
  /* 先把 figure.highlight 摘出来，避免里面的 <pre> 被当成裸 pre 再包一层 */
  let out = html.replace(/<figure class="highlight[^"]*"[\s\S]*?<\/figure>/gi, m => {
    const i = kept.push(enhanceFigure(m)) - 1;
    return `\u0000C${i}\u0000`;
  });
  out = out.replace(/<pre\b[\s\S]*?<\/pre>/gi, m => enhancePre(m));
  return out.replace(/\u0000C(\d+)\u0000/g, (_, i) => kept[Number(i)]);
}

/* -------------------------------------------------------------------- 图片 */

/** <img src> 加内容指纹：外链 / data: / 查不到文件（如文章资源目录里的图）原样保留 */
function fingerprintImg(tag, enabled) {
  if (!enabled) return tag;
  const m = tag.match(/\bsrc="([^"]*)"/i);
  if (!m) return tag;
  const raw = m[1];
  /* 属性里的 & 是 &amp;，先还原再解析，拼回去时再转义（否则会被当成查询参数） */
  const plain = raw.replace(/&amp;/g, '&');
  const next = fingerprintSrc(plain);
  if (next === plain) return tag;
  return tag.replace(m[0], 'src="' + next.replace(/&/g, '&amp;') + '"');
}

function enhanceImages(html, lazyload, isPostPage, fingerprint) {
  let out = html.replace(/<img\b[^>]*>/gi, tag => {
    if (/data-eager/.test(tag) || /fetchpriority="high"/.test(tag)) return tag;
    let t = fingerprintImg(tag, fingerprint);
    if (lazyload && !/\bloading=/i.test(t)) t = t.replace(/<img\b/i, '<img loading="lazy"');
    if (!/\bdecoding=/i.test(t)) t = t.replace(/<img\b/i, '<img decoding="async"');
    if (!/\balt=/i.test(t)) t = t.replace(/<img\b/i, '<img alt=""');
    return t;
  });

  /* 文章正文第一张图是天然 LCP 候选，别让它懒加载 */
  if (isPostPage) {
    const anchor = out.search(/<div class="[^"]*post__content/i);
    if (anchor > -1) {
      const head = out.slice(0, anchor);
      const tail = out.slice(anchor);
      let done = false;
      const patched = tail.replace(/<img\b[^>]*>/i, tag => {
        if (done || /data-eager/.test(tag)) return tag;
        done = true;
        return tag
          .replace(/\sloading="lazy"/i, ' loading="eager"')
          .replace(/<img\b/i, '<img fetchpriority="high"');
      });
      out = head + patched;
    }
  }
  return out;
}

/* -------------------------------------------------------------------- 表格 */

function enhanceTables(html) {
  return html.replace(/(<div class="table-wrap">)?(<table\b[^>]*>[\s\S]*?<\/table>)/gi, (m, wrap, table) =>
    wrap ? m : `<div class="table-wrap">${table}</div>`
  );
}

/* ---------------------------------------------------------------- 标题锚点 */

function slugify(text, index) {
  const s = String(text)
    .replace(/<[^>]+>/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .toLowerCase();
  return s ? `h-${s}` : `h-${index}`;
}

function ensureHeadingIds(html) {
  let i = 0;
  const seen = new Set();
  return html.replace(/<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (m, level, attrs, inner) => {
    i += 1;
    if (/\bid=/i.test(attrs)) {
      seen.add((attrs.match(/\bid="([^"]*)"/i) || [, ''])[1]);
      return m;
    }
    let id = slugify(inner, i);
    let n = 2;
    while (seen.has(id)) id = `${slugify(inner, i)}-${n++}`;
    seen.add(id);
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
}

/* ---------------------------------------------------------------- 站外链接 */

function enhanceExternalLinks(html, cfg, siteUrl, excludes) {
  return html.replace(/<a\s[^<>]*?href=["']([^"']+)["'][^<>]*?>/gi, tag => {
    if (/\btarget=/i.test(tag)) return tag;
    const href = (tag.match(/href=["']([^"']+)["']/i) || [, ''])[1];
    if (!/^(https?:)?\/\//i.test(href)) return tag;
    let host = '';
    try {
      host = new URL(href.startsWith('//') ? 'https:' + href : href).hostname;
    } catch (e) {
      return tag;
    }
    let siteHost = '';
    try {
      siteHost = new URL(siteUrl).hostname;
    } catch (e) {
      siteHost = '';
    }
    if (siteHost && (host === siteHost || host.endsWith('.' + siteHost))) return tag;
    if ((excludes || []).some(h => host === h || host.endsWith('.' + h))) return tag;
    const inject = /rel=/i.test(tag) ? 'target="_blank"' : 'target="_blank" rel="noopener noreferrer"';
    return tag.replace(/<a\b/i, `<a ${inject}`);
  });
}

/* ------------------------------------------------------------------- 压缩 */

function minifyHtml(html) {
  const store = [];
  let out = protectBlocks(html, store);
  out = out
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return restoreBlocks(out, store);
}

/* ---------------------------------------------------------------- 标题层级 */

/**
 * 文章正文里如果自带了 `# 一级标题`，会让页面出现多个 H1（SEO 与大纲都不好）。
 * 只在「正文片段」这一遍把它降成 H2；页面上那一遍已经是完整文档，不动，
 * 所以模板写的 `<h1 class="article__title">` 不受影响。
 */
function demoteContentH1(html) {
  return html.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, '<h2$1>$2</h2>');
}

/* --------------------------------------------------------------- 注册过滤器 */

function themeCfg() {
  return (hexo.theme && hexo.theme.config) || {};
}

hexo.extend.filter.register(
  'after_render:html',
  function (str) {
    if (!str || typeof str !== 'string') return str;
    /* 只处理完整页面：Markdown 片段（post.content 渲染）跳过重活，交给页面级那一遍 */
    const isDocument = /<html[\s>]/i.test(str);
    const cfg = themeCfg();
    if (!cfg.article) return str;

    let out = str;
    if (!isDocument && /<h1\b/i.test(out)) out = demoteContentH1(out);
    if (isDocument || /<(figure|pre)\b/i.test(out)) out = enhanceCodeBlocks(out);
    if (/<table\b/i.test(out)) out = enhanceTables(out);
    if (/<h[2-6]\b/i.test(out)) out = ensureHeadingIds(out);
    if (/<img\b/i.test(out)) {
      out = enhanceImages(
        out,
        cfg.article.lazyload !== false,
        /<body[^>]*class="[^"]*page-post/i.test(out),
        !cfg.assets || cfg.assets.fingerprint !== false
      );
    }
    if (cfg.open_in_new) {
      out = enhanceExternalLinks(out, cfg, hexo.config.url, cfg.open_in_new_exclude || []);
    }
    return out;
  },
  40
);

hexo.extend.filter.register(
  'after_render:html',
  function (str) {
    const cfg = themeCfg();
    if (!cfg.performance || cfg.performance.minify_html === false) return str;
    if (!str || typeof str !== 'string' || !/<html[\s>]/i.test(str)) return str;
    return minifyHtml(str);
  },
  95
);
