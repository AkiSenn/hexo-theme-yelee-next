/**
 * yelee-next · 前端交互
 * ---------------------------------------------------------------------------
 * 原生 ESM、零依赖、零构建、无 jQuery。所有钩子都来自 layout/_partial/*.ejs，
 * 任何一块功能挂掉都不允许影响其它功能 —— 每个模块都被 boot() 单独包在
 * try/catch 里，出错只 console.warn 一次。
 *
 * 模块索引：
 *   0. 基础工具（选择器 / rAF 节流 / 剪贴板 / 脚本注入 / 高亮转义）
 *   1. 主题切换（light | dark | auto，localStorage: yelee-theme）
 *   2. 侧栏抽屉（窄屏；焦点管理 + Esc + 遮罩 + 链接自动关闭）
 *   3. 侧栏分页签（tablist ↔ tabpanel，方向键切换）
 *   4. 文章目录（IntersectionObserver 高亮 + 顶栏偏移跳转）
 *   5. 顶部阅读进度（rAF 节流 + transform: scaleX）
 *   6. 悬浮操作条（显隐 / 回到顶部 / 跳到评论）
 *   7. 复制类（复制链接 / 版权链接 / 代码块）+ 系统分享
 *   8. 评论懒加载（giscus / waline / twikoo / disqus / valine）
 *   9. 运行天数（1s interval，且仅在可见时运行）
 *  10. 不蒜子懒加载
 *  11. 图片灯箱（原生 <dialog>）
 *  12. 搜索浮层（<dialog> + 本地索引）
 */

/* ============================================================ 0. 基础工具 */

const html = document.documentElement;

/** 同一个模块的报错只提示一次，避免滚动/输入时刷屏 */
const warned = new Set();
function warnOnce(scope, err) {
  if (warned.has(scope)) return;
  warned.add(scope);
  console.warn('[yelee] ' + scope + ' 初始化失败：', err);
}

/** 每个功能一个隔离舱：同步 throw 与 Promise reject 都只 warn 一次 */
function boot(scope, fn) {
  try {
    const r = fn();
    if (r && typeof r.catch === 'function') r.catch(err => warnOnce(scope, err));
  } catch (err) {
    warnOnce(scope, err);
  }
}

function $(sel, root) {
  return (root || document).querySelector(sel);
}
function $$(sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
}

/* prefers-reduced-motion：所有平滑滚动 / 动画都要降级 */
const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function reduced() {
  return !!(reduceMQ && reduceMQ.matches);
}
/* 窄屏断点与 CSS 保持一致（<1080px 才走抽屉） */
const narrowMQ = window.matchMedia ? window.matchMedia('(max-width: 1079px)') : null;
function isNarrow() {
  return !!(narrowMQ && narrowMQ.matches);
}

/** 滚动/尺寸变化统一走 rAF 节流（绝不用 setInterval 做节流） */
function onViewportChange(fn) {
  let ticking = false;
  const run = () => {
    ticking = false;
    try {
      fn();
    } catch (err) {
      warnOnce('scroll', err);
    }
  };
  const request = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(run);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  run();
  return request;
}

/** 置顶导航的实际高度：作为锚点跳转的偏移量（隐藏时为 0） */
function topbarOffset() {
  const bar = $('.topbar');
  if (!bar) return 0;
  const cs = window.getComputedStyle(bar);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  return Math.round(bar.getBoundingClientRect().height) || 0;
}

function scrollToY(top) {
  const y = Math.max(0, Math.round(top));
  try {
    window.scrollTo({ top: y, behavior: reduced() ? 'instant' : 'smooth' });
  } catch (err) {
    window.scrollTo(0, y);
  }
}

/** 最近的可滚动祖先（TOC 真正的滚动容器是 .sidebar__scroll，不是 .side-panel） */
function scrollParent(el) {
  let node = el && el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = window.getComputedStyle(node);
    const oy = cs.overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

/** scrollIntoView 的容错封装（部分环境未实现 / 老浏览器不认 options） */
function safeScrollIntoView(el, opts) {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  try {
    el.scrollIntoView(opts);
  } catch (err) {
    try {
      el.scrollIntoView();
    } catch (err2) {
      /* 忽略 */
    }
  }
}

/** 滚动到元素（extra = 额外留白，默认再让开顶栏） */
function scrollToEl(el, extra) {
  if (!el) return;
  const y = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
  scrollToY(y - topbarOffset() - (typeof extra === 'number' ? extra : 12));
}

/** 同一个元素上的临时反馈只保留最后一个定时器 */
const timers = new WeakMap();
function later(el, ms, fn) {
  const old = timers.get(el);
  if (old) clearTimeout(old);
  timers.set(
    el,
    setTimeout(() => {
      timers.delete(el);
      try {
        fn();
      } catch (err) {
        /* 反馈还原失败无所谓 */
      }
    }, ms)
  );
}
function flash(el, ms) {
  if (!el) return;
  el.classList.add('is-copied');
  later(el, ms || 1600, () => el.classList.remove('is-copied'));
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    return '&#39;';
  });
}
function escapeRe(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 先按命中片段切开，再逐段转义、只给命中段包 <mark>（避免转义后再匹配的坑） */
function highlight(text, tokens) {
  const raw = String(text == null ? '' : text);
  const list = (tokens || []).filter(Boolean);
  if (!list.length) return escapeHtml(raw);
  const re = new RegExp('(' + list.map(escapeRe).join('|') + ')', 'gi');
  return raw
    .split(re)
    .map((part, i) => (i % 2 === 1 ? '<mark>' + escapeHtml(part) + '</mark>' : escapeHtml(part)))
    .join('');
}

/* ---------------------------------------------------------------- 剪贴板 */

/** 老接口兜底：临时 textarea + execCommand */
function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (err) {
    return false;
  }
}

/** 复制文本：优先异步剪贴板，失败静默降级（返回 Promise<boolean>） */
function copyText(text) {
  return new Promise(resolve => {
    const nav = window.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(String(text)).then(
        () => resolve(true),
        () => resolve(legacyCopy(text))
      );
      return;
    }
    resolve(legacyCopy(text));
  });
}

/** i18n 文案统一从 <html data-i18n-*> 上取 */
function i18n(name, fallback) {
  const v = html.getAttribute('data-i18n-' + name);
  return v == null || v === '' ? fallback : v;
}

/* ------------------------------------------------------------ 脚本注入 */

function loadScript(src, attrs) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    Object.keys(attrs || {}).forEach(k => s.setAttribute(k, String(attrs[k])));
    s.addEventListener('load', () => resolve(s), { once: true });
    s.addEventListener('error', () => reject(new Error('script 加载失败: ' + src)), { once: true });
    document.head.appendChild(s);
  });
}

/* 跨模块共享的几个入口（TOC 需要“打开抽屉 + 切到 toc 面板”） */
const ui = { openSidebar: null, closeSidebar: null, activateTab: null };

/* ============================================================ 1. 主题切换 */

function initTheme() {
  const KEY = 'yelee-theme';
  const darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function syncButtons(mode) {
    $$('[data-theme-switch] [data-theme-value]').forEach(btn => {
      const on = btn.getAttribute('data-theme-value') === mode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /** giscus 已加载时同步主题（giscus 只接受它自己的 postMessage 协议） */
  function syncGiscus(dark) {
    if (!$('iframe.giscus-frame')) return;
    try {
      const frame = $('iframe.giscus-frame');
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage({ giscus: { setConfig: { theme: dark ? 'dark' : 'light' } } }, 'https://giscus.app');
    } catch (err) {
      /* 跨域失败忽略 */
    }
  }

  function apply(mode, persist) {
    const m = mode === 'light' || mode === 'dark' || mode === 'auto' ? mode : 'auto';
    const dark = m === 'dark' || (m === 'auto' && !!darkMQ && darkMQ.matches);
    html.setAttribute('data-theme-mode', m);
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (persist) {
      try {
        window.localStorage.setItem(KEY, m);
      } catch (err) {
        /* 隐私模式忽略 */
      }
    }
    syncButtons(m);
    syncGiscus(dark);
  }

  /* 三态按钮 */
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('[data-theme-switch] [data-theme-value]') : null;
    if (!btn) return;
    const v = btn.getAttribute('data-theme-value');
    if (v !== 'light' && v !== 'dark' && v !== 'auto') return;
    e.preventDefault();
    apply(v, true);
  });

  /* 顶栏二态按钮：写死 light/dark，不落回 auto */
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('[data-toggle-theme]') : null;
    if (!btn) return;
    e.preventDefault();
    apply(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });

  /* 跟随系统：只有 auto 模式下才跟着系统变 */
  if (darkMQ) {
    const onChange = e => {
      if (html.getAttribute('data-theme-mode') !== 'auto') return;
      html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      syncGiscus(e.matches);
    };
    if (darkMQ.addEventListener) darkMQ.addEventListener('change', onChange);
    else if (darkMQ.addListener) darkMQ.addListener(onChange);
  }

  /* 初始化：把已保存（或 head 内联脚本推导出）的模式标到按钮上 */
  let saved = '';
  try {
    saved = window.localStorage.getItem(KEY) || '';
  } catch (err) {
    saved = '';
  }
  const mode = saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : html.getAttribute('data-theme-mode') || 'auto';
  apply(mode, false);
}

/* ============================================================ 2. 侧栏抽屉 */

function initDrawer() {
  const sidebar = $('#sidebar');
  const mask = $('[data-close-sidebar]');
  const openers = $$('[data-open-sidebar]');
  if (!sidebar) return;

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocus = null;

  function firstFocusable() {
    const list = $$(FOCUSABLE, sidebar).filter(el => el.offsetParent !== null || el.getClientRects().length);
    const target = list[0] || sidebar;
    /* 侧栏里一个可聚焦元素都没有时，让它自己可聚焦，保证焦点确实进入抽屉 */
    if (target === sidebar && !sidebar.hasAttribute('tabindex')) sidebar.setAttribute('tabindex', '-1');
    return target;
  }
  function isOpen() {
    return sidebar.classList.contains('is-open');
  }
  function open() {
    if (isOpen()) return;
    lastFocus = document.activeElement;
    sidebar.classList.add('is-open');
    if (mask) mask.hidden = false;
    openers.forEach(b => b.setAttribute('aria-expanded', 'true'));
    document.body.classList.add('is-locked');
    const target = firstFocusable();
    try {
      target.focus({ preventScroll: true });
    } catch (err) {
      if (target.focus) target.focus();
    }
  }
  function close() {
    if (!isOpen()) return;
    sidebar.classList.remove('is-open');
    if (mask) mask.hidden = true;
    openers.forEach(b => b.setAttribute('aria-expanded', 'false'));
    document.body.classList.remove('is-locked');
    const back = lastFocus && document.contains(lastFocus) ? lastFocus : openers[0];
    if (back && back.focus) {
      try {
        back.focus({ preventScroll: true });
      } catch (err) {
        back.focus();
      }
    }
    lastFocus = null;
  }

  openers.forEach(btn =>
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (isOpen()) close();
      else open();
    })
  );
  if (mask) mask.addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.preventDefault();
    close();
  });

  /* 抽屉内的任意链接（含 TOC 的 #锚点）点击后自动收起 */
  sidebar.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (a && isOpen()) close();
  });

  ui.openSidebar = open;
  ui.closeSidebar = close;
}

/* ======================================================== 3. 分页签面板 */

function initTabs() {
  const btns = $$('.side-tabs__btn[data-tab]');
  const panels = $$('.side-panel[data-panel]');
  if (!btns.length || !panels.length) return;

  function activate(id) {
    const exists = btns.some(b => b.getAttribute('data-tab') === id);
    if (!exists) return;
    btns.forEach(b => {
      const on = b.getAttribute('data-tab') === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    panels.forEach(p => {
      const on = p.getAttribute('data-panel') === id;
      p.classList.toggle('is-active', on);
      /* 切面板回到顶部：面板自身 + 它真正所在的可滚动容器（.sidebar__scroll） */
      if (on) {
        p.scrollTop = 0;
        const box = scrollParent(p);
        if (box) box.scrollTop = 0;
      }
    });
    ui.activeTab = id;
  }

  btns.forEach((btn, i) => {
    btn.addEventListener('click', () => activate(btn.getAttribute('data-tab')));
    btn.addEventListener('keydown', e => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = btns.length - 1;
      if (next === null) return;
      e.preventDefault();
      const target = btns[next];
      activate(target.getAttribute('data-tab'));
      target.focus();
    });
  });

  const current = btns.filter(b => b.getAttribute('aria-selected') === 'true')[0] || btns[0];
  activate(current.getAttribute('data-tab'));
  ui.activateTab = activate;
}

/* ============================================================ 4. 目录 */

function initToc() {
  const content = $('#post-content') || $('.post__content');
  const links = $$('.toc-link[href^="#"]');
  if (!content || !links.length) return;

  const map = new Map();
  links.forEach(a => {
    let id = (a.getAttribute('href') || '').slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (err) {
      /* 保持原样 */
    }
    if (id) map.set(id, a);
  });

  const headings = $$('h2[id], h3[id], h4[id]', content).filter(h => map.has(h.id));
  if (!headings.length) return;

  let currentId = '';

  /** 让当前项在 toc 面板的可滚动容器里保持可见（该容器内的 block:'nearest'） */
  function keepVisible(link) {
    if (!link) return;
    const box = scrollParent(link);
    /* 没有可滚动祖先 = 本来就全看得见，什么都不用做（也避免 scrollIntoView 把正文带偏） */
    if (!box) return;
    const lr = link.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    if (lr.top < br.top + 8) box.scrollTop -= br.top + 8 - lr.top;
    else if (lr.bottom > br.bottom - 8) box.scrollTop += lr.bottom - br.bottom + 8;
  }

  function setActive(id) {
    if (id === currentId) return;
    currentId = id;
    const active = map.get(id);
    links.forEach(a => a.classList.toggle('is-active', a === active));
    keepVisible(active);
  }

  const offset = Math.max(8, topbarOffset() + 12);
  const visible = new Set();
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (en.isIntersecting) visible.add(en.target);
        else visible.delete(en.target);
      });
      if (visible.size) {
        const first = headings.filter(h => visible.has(h))[0];
        if (first) {
          setActive(first.id);
          return;
        }
      }
      /* 兜底：取最后一个已经越过顶栏的标题 */
      let last = null;
      const line = Math.max(8, topbarOffset() + 8);
      headings.forEach(h => {
        if (h.getBoundingClientRect().top <= line) last = h;
      });
      if (last) setActive(last.id);
    },
    { rootMargin: '-' + offset + 'px 0px -55% 0px', threshold: 0 }
  );
  headings.forEach(h => io.observe(h));

  links.forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      let id = href.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch (err) {
        /* 保持原样 */
      }
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      scrollToEl(target);
      setActive(id);
      try {
        window.history.replaceState(null, '', '#' + id);
      } catch (err) {
        /* file:// 等场景忽略 */
      }
    });
  });

  $$('[data-open-toc]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.preventDefault();
      const first = links[0];
      if (isNarrow()) {
        if (ui.openSidebar) ui.openSidebar();
        if (ui.activateTab) ui.activateTab('toc');
        /* 等抽屉过渡开始后再聚焦，避免浏览器把焦点滚回抽屉外 */
        if (first) later(btn, 80, () => first.focus({ preventScroll: true }));
      } else {
        const panel = first ? first.closest('.side-panel') : null;
        if (panel) safeScrollIntoView(panel, { block: 'nearest', behavior: reduced() ? 'instant' : 'smooth' });
        if (first) {
          try {
            first.focus({ preventScroll: true });
          } catch (err) {
            first.focus();
          }
        }
      }
    })
  );
}

/* ======================================================== 5. 阅读进度 */

function initProgress() {
  const wrap = $('[data-progress]');
  const bar = $('[data-progress-bar]');
  if (!wrap || !bar) return;

  const isPost = document.body.classList.contains('page-post');
  if (!isPost) {
    wrap.hidden = true;
    return;
  }

  const content = $('#post-content') || $('.post__content');

  function update() {
    const scroller = document.scrollingElement || document.documentElement;
    const y = Math.max(0, scroller.scrollTop || window.scrollY || 0);
    let p;
    if (content) {
      /* 正文在视口里的推进比例：正文顶部进入视口开始，底部离开视口结束 */
      const top = content.getBoundingClientRect().top + y;
      const height = content.offsetHeight || 0;
      p = height > 0 ? (y + window.innerHeight - top) / height : 0;
    } else {
      const max = scroller.scrollHeight - window.innerHeight;
      p = max > 0 ? y / max : 0;
    }
    p = Math.min(1, Math.max(0, p));
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    /* 还没开始滚动就保持隐藏 */
    wrap.hidden = !(y > 0 && p > 0);
  }

  onViewportChange(update);
}

/* ==================================================== 6. 悬浮操作条 */

function initFab() {
  const fab = $('[data-fab]');
  const toTop = $('[data-to-top]');
  const comments = $('[data-goto-comments]');

  if (fab) {
    onViewportChange(() => {
      fab.hidden = Math.max(0, window.scrollY || window.pageYOffset || 0) <= 320;
    });
  }
  if (toTop) toTop.addEventListener('click', () => scrollToY(0));
  if (comments) {
    comments.addEventListener('click', () => {
      if (ui.expandComments) ui.expandComments();
      const el = $('#comments');
      if (el) scrollToEl(el);
    });
  }
}

/* ================================================== 7. 复制 / 系统分享 */

function initCopy() {
  /* 复制链接：去掉 #hash；同 .share 内的 [data-copy-label] 文案临时替换 */
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('[data-copy-link]') : null;
    if (!btn) return;
    e.preventDefault();
    const url = String(window.location.href).split('#')[0];
    const scope = btn.closest('.share') || btn.parentElement || btn;
    const label = scope ? scope.querySelector('[data-copy-label]') : null;
    copyText(url).then(() => {
      flash(btn, 1600);
      if (label) {
        if (!label.dataset.ynLabel) label.dataset.ynLabel = label.textContent;
        label.textContent = i18n('copied', '已复制');
        later(label, 1600, () => {
          if (label.dataset.ynLabel != null) label.textContent = label.dataset.ynLabel;
        });
      }
    });
  });

  /* 复制纯文本（文末版权里的原始链接） */
  document.addEventListener('click', e => {
    const el = e.target && e.target.closest ? e.target.closest('[data-copy-text]') : null;
    if (!el) return;
    e.preventDefault();
    const text = el.getAttribute('data-copy-text') || '';
    copyText(text).then(() => flash(el, 1600));
  });

  /* 代码块：figure.highlight 只取 td.code 那一列，div.codeblock 直接取 pre */
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('button[data-yn-copy]') : null;
    if (!btn) return;
    e.preventDefault();
    const box = btn.closest('figure[data-yn-code], div.codeblock, figure.highlight, [data-yn-code]') || btn.parentElement;
    if (!box) return;
    const pre = box.querySelector('td.code pre') || box.querySelector('pre');
    if (!pre) return;
    const text = pre.innerText != null ? pre.innerText : pre.textContent || '';
    copyText(text.replace(/\n+$/, '')).then(ok => {
      if (!ok) return; /* 复制失败保持原状，不误报“已复制” */
      const copied = btn.querySelector('.codeblock__copied');
      if (!btn.dataset.ynLabel) btn.dataset.ynLabel = btn.getAttribute('aria-label') || '';
      flash(btn, 1600);
      btn.setAttribute('aria-label', i18n('copied', '已复制'));
      if (copied) copied.hidden = false;
      later(btn, 1600, () => {
        btn.setAttribute('aria-label', btn.dataset.ynLabel);
        if (copied) copied.hidden = true;
      });
    });
  });

  /* 系统分享：支持才显示按钮 */
  const native = $('[data-share-native]');
  if (native) {
    if (navigator.share) {
      native.hidden = false;
      native.addEventListener('click', e => {
        e.preventDefault();
        navigator.share({ title: document.title, url: window.location.href }).catch(err => {
          /* 用户取消（AbortError）静默忽略 */
          if (err && err.name === 'AbortError') return;
        });
      });
    } else {
      native.hidden = true;
    }
  }
}

/* ====================================================== 8. 评论懒加载 */

const COMMENT_DEFAULTS = {
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
};
const COMMENT_SCRIPTS = {
  waline: 'https://unpkg.com/@waline/client@3/dist/waline.js',
  twikoo: 'https://cdn.jsdelivr.net/npm/twikoo@1.6/dist/twikoo.min.js',
  valine: 'https://unpkg.com/valine@1.5.1/dist/Valine.min.js'
};

function initComments() {
  const mount = $('[data-comments]');
  if (!mount) return;

  const provider = String(mount.getAttribute('data-provider') || '').toLowerCase();
  const lazy = mount.getAttribute('data-lazyload') !== '0';
  let cfg = {};
  try {
    cfg = JSON.parse(mount.getAttribute('data-config') || '{}') || {};
  } catch (err) {
    cfg = {};
    warnOnce('comments.config', err);
  }

  const loading = mount.querySelector('.comments__loading');

  /* 未知 provider / 缺依赖 / 脚本加载失败：只显示一行失败文案，不刷控制台 */
  function fail(message) {
    const text = message || '评论加载失败';
    let el = loading;
    if (!el || !el.parentNode) {
      /* 占位已被移除（或本来就没有）时补一个，保证始终有一行提示 */
      el = document.createElement('p');
      el.className = 'comments__loading';
      mount.insertBefore(el, mount.firstChild);
    }
    el.textContent = text;
  }

  function scriptUrl(kind, fallback) {
    return cfg.js || cfg.script || cfg.cdn || fallback;
  }

  function injectGiscus() {
    const d = Object.assign({}, COMMENT_DEFAULTS.giscus, cfg);
    const s = document.createElement('script');
    s.src = cfg.src || 'https://giscus.app/client.js';
    s.setAttribute('crossorigin', 'anonymous');
    s.crossOrigin = 'anonymous';
    s.async = true;
    const attrs = {
      'data-repo': d.repo,
      'data-repo-id': d.repo_id,
      'data-category': d.category,
      'data-category-id': d.category_id,
      'data-mapping': d.mapping,
      'data-strict': d.strict ? '1' : '0',
      'data-reactions-enabled': String(d.reactions_enabled) === '0' ? '0' : '1',
      'data-emit-metadata': '0',
      'data-input-position': d.input_position,
      'data-theme': d.theme,
      'data-lang': d.lang,
      'data-loading': d.loading
    };
    Object.keys(attrs).forEach(k => s.setAttribute(k, attrs[k] == null ? '' : String(attrs[k])));
    mount.appendChild(s);
  }

  function injectWaline() {
    loadScript(scriptUrl('waline', COMMENT_SCRIPTS.waline)).then(() => {
      if (!window.Waline || !window.Waline.init) {
        fail('评论加载失败');
        return;
      }
      window.Waline.init({
        el: mount,
        serverURL: cfg.serverURL || '',
        lang: cfg.lang || 'zh-CN',
        path: window.location.pathname,
        dark: 'html[data-theme="dark"]'
      });
    }, () => fail('评论加载失败'));
  }

  function injectTwikoo() {
    loadScript(scriptUrl('twikoo', COMMENT_SCRIPTS.twikoo)).then(() => {
      if (!window.twikoo || !window.twikoo.init) {
        fail('评论加载失败');
        return;
      }
      window.twikoo.init({ envId: cfg.envId || '', el: mount });
    }, () => fail('评论加载失败'));
  }

  function injectValine() {
    loadScript(scriptUrl('valine', COMMENT_SCRIPTS.valine)).then(() => {
      if (!window.Valine) {
        fail('评论加载失败');
        return;
      }
      /* eslint-disable no-new */
      new window.Valine({
        el: mount,
        appId: cfg.appid || cfg.appId || '',
        appKey: cfg.appkey || cfg.appKey || '',
        serverURLs: cfg.serverURLs || '',
        path: window.location.pathname
      });
    }, () => fail('评论加载失败'));
  }

  function injectDisqus() {
    const shortname = cfg.shortname || cfg.shortName || '';
    if (!shortname) {
      fail('评论加载失败');
      return;
    }
    window.disqus_config = function () {
      this.page.url = window.location.href;
      this.page.identifier = window.location.pathname;
    };
    loadScript('https://' + shortname + '.disqus.com/embed.js').catch(() => fail('评论加载失败'));
  }

  const PROVIDERS = {
    giscus: injectGiscus,
    waline: injectWaline,
    twikoo: injectTwikoo,
    valine: injectValine,
    disqus: injectDisqus
  };

  function load() {
    /* 幂等：同一页面只初始化一次 */
    if (mount.dataset.ynCommentsReady === '1') return;
    mount.dataset.ynCommentsReady = '1';
    const run = PROVIDERS[provider];
    if (!run) {
      /* 未知 provider：留着 .comments__loading 改文案，别把它删掉 */
      fail('评论加载失败');
      return;
    }
    if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    try {
      run();
    } catch (err) {
      warnOnce('comments.' + provider, err);
      fail('评论加载失败');
    }
  }

  if (!lazy) {
    load();
    return;
  }

  /* 供「点击加载评论」「展开」复用的入口 */
  ui.loadComments = load;

  const io = new IntersectionObserver(
    entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      load();
    },
    { rootMargin: '400px 0px' }
  );
  io.observe(mount);
}

/* ==================================== 8.1 评论区展开 / 收起（原版 click2show） ==
   收起时给 .comments__panel 加 [hidden]，整块不占位 —— 下面的页脚会自动顶上来，
   不会留一个空白框。展开时才注入第三方评论脚本（首屏对 giscus/unpkg 零请求）。 */

function initCommentsUI() {
  const root = $('#comments');
  if (!root) return;
  const bar = $('[data-load-comments]', root);
  const panel = $('[data-comments-panel]', root);
  if (!panel) return;
  const toggle = $('[data-toggle-comments]', root);
  const toggleLabel = $('[data-comments-toggle-label]', root);

  function open() {
    if (bar) bar.hidden = true;
    panel.hidden = false;
    root.setAttribute('data-state', 'open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (toggleLabel) toggleLabel.textContent = i18n('comments-collapse', '收起');
    if (ui.loadComments) ui.loadComments();
  }

  function collapse() {
    panel.hidden = true;
    if (bar) bar.hidden = false;
    root.setAttribute('data-state', 'bar');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (toggleLabel) toggleLabel.textContent = i18n('comments-expand', '展开');
  }

  if (bar) bar.addEventListener('click', open);
  if (toggle) toggle.addEventListener('click', collapse);

  /* 「跳到评论」类按钮（文章信息栏的评论按钮、右下角悬浮条）：收起状态下先展开再滚过去 */
  ui.expandComments = () => {
    if (panel.hidden) open();
  };

  /* 直接带 #comments 打开（别人分享的锚点链接）就自动展开 */
  if (location.hash === '#comments') open();
}

/* ======================================================== 9. 运行天数 */

function initRuntime() {
  const el = $('[data-runtime]');
  if (!el) return;
  const out = el.querySelector('[data-runtime-text]');
  const raw = el.getAttribute('data-since') || '';
  if (!out || !raw) return;

  /* Safari 不认 'YYYY-MM-DD'，换成 '/' 分隔 */
  const since = new Date(String(raw).replace(/-/g, '/'));
  if (isNaN(since.getTime())) return;

  const prefix = el.getAttribute('data-text') || '';
  const format = el.getAttribute('data-format') || '{d} 天 {h} 小时 {m} 分 {s} 秒';
  let timer = null;

  function tick() {
    const total = Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const body = format
      .replace('{d}', d)
      .replace('{h}', h)
      .replace('{m}', m)
      .replace('{s}', s);
    out.textContent = (prefix ? prefix + ' ' : '') + body;
  }

  function start() {
    if (timer) return;
    tick();
    timer = setInterval(tick, 1000);
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  const io = new IntersectionObserver(
    entries => {
      if (entries.some(en => en.isIntersecting)) start();
      else stop();
    },
    { threshold: 0 }
  );
  io.observe(el);

  /* 先算一次：页脚还没进视口时也能显示「已运行 N 天」，只是不跑计时器 */
  tick();
}

/* ====================================================== 10. 不蒜子懒加载 */

function initBusuanzi() {
  const el = $('[data-busuanzi][data-src]');
  if (!el) return;
  const src = el.getAttribute('data-src');
  if (!src) return;
  let done = false;

  function inject() {
    if (done) return;
    done = true;
    loadScript(src).catch(err => warnOnce('busuanzi', err));
  }

  if (!('IntersectionObserver' in window)) {
    inject();
    return;
  }
  const io = new IntersectionObserver(
    entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      inject();
    },
    { rootMargin: '200px 0px' }
  );
  io.observe(el);
}

/* ========================================================= 11. 图片灯箱 */

function initLightbox() {
  /* 模板在 <html data-lightbox="0"> 上关掉（article.lightbox: false） */
  if (html.getAttribute('data-lightbox') === '0') return;
  const content = $('#post-content') || $('.post__content');
  if (!content) return;

  let dialog = null;
  let image = null;

  function ensure() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    image = document.createElement('img');
    image.className = 'lightbox__img';
    image.alt = '';
    image.decoding = 'async';
    dialog.appendChild(image);

    /* 右上角关闭按钮：键盘用户也能关（Esc 由 <dialog> 原生支持） */
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox__close';
    closeBtn.setAttribute('aria-label', i18n('close', 'Close'));
    closeBtn.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-close"></use></svg>';
    closeBtn.addEventListener('click', close);
    dialog.appendChild(closeBtn);

    /* 点击背景（事件目标就是 dialog 本身）或点击图片都关闭 */
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target === image) close();
    });
    /* 原生 <dialog> 自带 Esc 关闭，这里再兜一层，保证行为明确 */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented || !dialog.open) return;
      e.preventDefault();
      close();
    });
    dialog.addEventListener('close', () => image.removeAttribute('src'));
    document.body.appendChild(dialog);
    return dialog;
  }

  function close() {
    if (!dialog) return;
    try {
      dialog.close();
    } catch (err) {
      dialog.removeAttribute('open');
    }
  }

  content.addEventListener('click', e => {
    const img = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!img || !content.contains(img)) return;
    /* 图片外面套了链接就交给链接自己处理 */
    if (img.closest('a')) return;
    const src = img.currentSrc || img.getAttribute('src') || '';
    if (!src) return;
    e.preventDefault();
    const dlg = ensure();
    image.src = src;
    image.alt = img.getAttribute('alt') || '';
    dlg.setAttribute('aria-label', img.getAttribute('alt') || document.title || '');
    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {
      /* 老浏览器降级：直接新窗口看大图 */
      window.open(src, '_blank', 'noopener');
    }
  });
}

/* ========================================================= 12. 搜索浮层 */

function initSearch() {
  const dialog = $('[data-search-dialog]');
  const input = $('[data-search-input]');
  const results = $('[data-search-results]');
  if (!dialog || !input || !results) return;

  let hint = results.querySelector('.search-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'search-hint';
    results.insertBefore(hint, results.firstChild);
  }
  const defaultHint = hint.textContent || '';
  const POLL_MS = 100;
  const POLL_MAX = 10; /* 最多等 1 秒（search.js 由后面的 <script> 加载） */

  function emptyText() {
    return i18n('search-empty', '没有找到相关内容');
  }
  function loadingText() {
    return i18n('search-loading', '正在加载索引…');
  }
  function setHint(text) {
    hint.textContent = text;
  }
  function countText(n, api) {
    const tpl = api && api.locale && api.locale.results;
    return tpl ? String(tpl).replace(/\{n\}|%d/, n) : '找到 ' + n + ' 篇相关文章';
  }
  function clearResults() {
    $$('.search-result', results).forEach(el => el.parentNode && el.parentNode.removeChild(el));
  }

  /** search.js 可能还没执行完：轮询等 window.YeleeSearch 出现 */
  function withSearch(cb, attempt) {
    const n = attempt || 0;
    const api = window.YeleeSearch;
    if (api) {
      if (api.locale) {
        api.locale.empty = html.getAttribute('data-i18n-search-empty') || null;
        api.locale.results = html.getAttribute('data-i18n-search-results') || null;
      }
      cb(api);
      return;
    }
    if (n >= POLL_MAX) {
      cb(null);
      return;
    }
    setTimeout(() => withSearch(cb, n + 1), POLL_MS);
  }

  function buildResult(item, tokens) {
    const a = document.createElement('a');
    a.className = 'search-result';
    a.href = item.url || '#';

    const head = document.createElement('span');
    head.className = 'search-result__head';

    const title = document.createElement('span');
    title.className = 'search-result__title';
    title.innerHTML = highlight(item.title, tokens);
    head.appendChild(title);

    const time = document.createElement('time');
    time.className = 'search-result__date';
    time.textContent = item.date || '';
    head.appendChild(time);

    const excerpt = document.createElement('span');
    excerpt.className = 'search-result__excerpt';
    excerpt.innerHTML = highlight(item.excerpt, tokens);

    a.appendChild(head);
    a.appendChild(excerpt);
    return a;
  }

  function render() {
    const api = window.YeleeSearch;
    const term = String(input.value || '').trim();
    if (!api || !api.loaded) return;
    clearResults();
    if (!term) {
      setHint(defaultHint);
      return;
    }
    let list = [];
    try {
      list = api.query(term) || [];
    } catch (err) {
      warnOnce('search.query', err);
      list = [];
    }
    if (!list.length) {
      setHint(emptyText());
      return;
    }
    setHint(countText(list.length, api));
    const tokens = term.split(/\s+/).filter(Boolean);
    const frag = document.createDocumentFragment();
    list.forEach(item => frag.appendChild(buildResult(item, tokens)));
    results.appendChild(frag);
  }

  function startLoad() {
    /* 先把“正在加载索引”摆出来，search.js 还没执行完时也不能空着 */
    setHint(loadingText());
    withSearch(api => {
      if (!api) {
        setHint(emptyText());
        return;
      }
      if (api.loaded) {
        render();
        return;
      }
      Promise.resolve()
        .then(() => api.load())
        .then(() => render())
        .catch(err => {
          warnOnce('search.load', err);
          setHint(emptyText());
        });
    });
  }

  function open() {
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch (err) {
        dialog.setAttribute('open', '');
      }
    }
    try {
      input.focus({ preventScroll: true });
    } catch (err) {
      input.focus();
    }
    if (typeof input.select === 'function') input.select();
    /* 打开即开始加载索引 */
    startLoad();
  }

  function close() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  let debounce = null;
  input.addEventListener('input', () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      debounce = null;
      render();
    }, 120);
  });

  input.addEventListener('keydown', e => {
    const items = $$('.search-result', results);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      const at = items.findIndex(el => el.classList.contains('is-active'));
      const next = e.key === 'ArrowDown' ? (at + 1) % items.length : at <= 0 ? items.length - 1 : at - 1;
      items.forEach((el, i) => el.classList.toggle('is-active', i === next));
      const cur = items[next];
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cur = items.filter(el => el.classList.contains('is-active'))[0] || items[0];
      if (cur) window.location.href = cur.href;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  /* form[method=dialog] 会在 Enter/提交时自动关闭浮层，这里兜住 */
  const form = results.closest('form') || $('[data-search-form]');
  if (form) form.addEventListener('submit', e => e.preventDefault());

  /* 点击 ::backdrop 时事件目标就是 dialog 自身 */
  dialog.addEventListener('click', e => {
    if (e.target === dialog) close();
  });

  /* 兜底：原生 <dialog> 的 Esc 在个别环境不触发，这里再兜一层 */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented || !dialog.open) return;
    e.preventDefault();
    close();
  });

  $$('[data-open-search]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.preventDefault();
      open();
    })
  );
  $$('[data-close-search]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.preventDefault();
      close();
    })
  );

  /* 索引预加载：search.preload: true 时页面加载完就拉一次 */
  if (html.getAttribute('data-search-preload') === '1') {
    withSearch(api => {
      if (api && !api.loaded) Promise.resolve().then(() => api.load()).catch(err => warnOnce('search.preload', err));
    });
  }

  /* 快捷键：/ 或 Ctrl|Cmd+K 打开；焦点在输入框 / contenteditable 里时一律忽略 */
  if (html.getAttribute('data-search-shortcut') === '0') return;
  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
    if (typing) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      open();
      return;
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });
}

/* ================================================== 14. 头像抖动 / 回首页 ==
   复刻原版 yelee 的招牌细节：头像悬停会快速抖动（CSS 里做的），点击时
   再震一下然后回首页。要点：
     · 在文章页点：先播 0.46s 震动，再跳转（不然动画一闪而过看不见）
     · 已在首页点：不刷新页面（避免整页重载），震一下并平滑滚回顶部
     · Ctrl/Cmd/中键点击：不拦截，保留「新标签打开」的原生行为
     · prefers-reduced-motion：跳过动画，立即执行跳转/滚动 */

function initAvatarShake() {
  /* 桌面是侧栏里的头像，移动端是顶部的独立头像模块，两处 DOM 都要挂 */
  const avatars = $$('.profile__avatar');
  if (!avatars.length) return;
  const root = (html.getAttribute('data-root') || '/').replace(/index\.html$/, '');
  const SHAKE_MS = 460;

  function isHome() {
    const p = location.pathname.replace(/index\.html$/, '');
    return p === root || p === root.replace(/\/$/, '') || p === '' || p === '/';
  }

  function bind(avatar) {
  avatar.addEventListener('click', e => {
    /* 新标签 / 新窗口 / 中键：交给浏览器，不动 */
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const href = avatar.getAttribute('href') || root;
    const still = reduced();

    if (!still) {
      avatar.classList.add('is-shaking');
      window.setTimeout(() => avatar.classList.remove('is-shaking'), SHAKE_MS);
    }

    if (isHome()) {
      /* 已经在首页：震一下就当"回到顶部"，不重新加载 */
      e.preventDefault();
      if (still) scrollToY(0);
      else window.setTimeout(() => scrollToY(0), SHAKE_MS - 180);
      return;
    }

    /* 不在首页：让动画播完再走，跳转前 120ms 就开始，视觉上更连贯 */
    e.preventDefault();
    window.setTimeout(() => {
      location.href = href;
    }, still ? 0 : SHAKE_MS - 120);
  });
  }

  avatars.forEach(bind);
}

/* ============================================ 15. 首页文章入场（复刻原版） ==
   老主题 main.js 的做法：首页所有 .article 先 opacity:0，ScrollReveal 进入视口时
   套一个随机的 animate.css 动画并置为 opacity:1 —— 所以快速下滑时，还没轮到的
   文章是"空白"的，像没加载出来。这里用 IntersectionObserver 复刻同样的观感：
     · 第一张卡片比视口还高时，它不参与动画（原版同款判断）
     · 随机名沿用原版那 8 个（原版 Math.ceil 的取值有极小概率越界成 undefined，
       这里用 Math.floor 修掉，动画名永远有效）
     · 无 JS / 动效敏感 / 兜底超时：全部直接显示，绝不留白 */

const REVEAL_NAMES = [
  'pulse',
  'fadeIn',
  'fadeInRight',
  'flipInX',
  'lightSpeedIn',
  'rotateInUpLeft',
  'slideInUp',
  'zoomIn'
];

function initReveal() {
  if (html.getAttribute('data-animate') === '0') return;
  const body = document.body;
  if (!body || !body.classList.contains('is-home')) return;
  const cards = $$('.post-list > .post-card');
  if (!cards.length) return;

  /* noAnim=true 时只显示、不套动画（原版对"太长的那一篇"就是这么处理的） */
  const show = (el, noAnim) => {
    if (el.classList.contains('is-revealed')) return;
    if (!noAnim && !reduced()) {
      el.classList.add('anim-' + REVEAL_NAMES[Math.floor(Math.random() * REVEAL_NAMES.length)]);
    }
    el.classList.add('is-revealed');
  };

  let list = cards;
  /* 原版逻辑：首屏那篇比视口还高就不做动画（直接 opacity:1），否则用户一进来
     整屏都是空白，观感像是没加载出来 */
  if (cards[0].getBoundingClientRect().height > window.innerHeight) {
    show(cards[0], true);
    list = cards.slice(1);
  }

  if (reduced() || typeof IntersectionObserver !== 'function') {
    list.forEach(show);
    return;
  }

  const io = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        show(en.target);
        io.unobserve(en.target);
      });
    },
    { threshold: 0.01, rootMargin: '0px 0px -30px 0px' }
  );
  list.forEach(card => io.observe(card));

  /* 兜底：3 秒后无论如何全部显示（脚本被拦、IO 异常都不至于白屏） */
  window.setTimeout(() => list.forEach(show), 3000);
}

/* ============================================ 16. 滚动态（顶栏分层阴影） ==
   原版移动端滚过 69px 会把 overlay 固定成 42px 细条；这里用
   html.is-scrolled 给顶栏加一层阴影，等价地表达"页面已经滚起来了"。 */
function initScrollState() {
  const sync = () => {
    html.classList.toggle('is-scrolled', (window.scrollY || 0) > 8);
  };
  onViewportChange(sync);
}

/* ============================================================== 启动 */

function main() {
  boot('theme', initTheme);
  boot('drawer', initDrawer);
  boot('tabs', initTabs);
  boot('toc', initToc);
  boot('progress', initProgress);
  boot('fab', initFab);
  boot('copy', initCopy);
  boot('comments', initComments);
  boot('commentsUI', initCommentsUI);
  boot('runtime', initRuntime);
  boot('busuanzi', initBusuanzi);
  boot('lightbox', initLightbox);
  boot('search', initSearch);
  boot('avatar', initAvatarShake);
  boot('reveal', initReveal);
  boot('scrollState', initScrollState);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
