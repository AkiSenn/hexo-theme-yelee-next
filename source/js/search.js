/**
 * yelee-next · 本地搜索索引
 * ---------------------------------------------------------------------------
 * 只做两件事：拉 search.json 建内存索引、按关键词打分返回命中项。
 * 刻意不 import/export（脚本文件名带内容指纹，动态 import 容易丢版本参数），
 * 只把 API 挂到 window.YeleeSearch 上，由 app.js 轮询取用。
 *
 * 匹配规则：查询按空白切词，**所有词都必须命中**（AND，大小写不敏感）。
 * 打分：标题 +10/词，标签或分类 +5，摘要 +2，正文 +1；同分按 date 倒序。
 * 返回的是原始数据，HTML 转义与 <mark> 高亮由 app.js 负责。
 */

(function () {
  const state = {
    promise: null, /* 加载中的 Promise（幂等） */
    items: [], /* 原始条目（对外返回的形状） */
    index: [] /* 与 items 一一对应的预小写副本，避免每次查询重复 toLowerCase */
  };

  const API = {
    loaded: false,
    locale: { results: null, empty: null },
    limit: 20,
    load: load,
    query: query
  };

  /** 索引路径来自 <html data-search-path>，兜底 /search.json */
  function indexPath() {
    const el = document.documentElement;
    const p = el && el.getAttribute ? el.getAttribute('data-search-path') : '';
    return p || '/search.json';
  }

  function toArray(value) {
    if (!value) return [];
    if (Object.prototype.toString.call(value) === '[object Array]') return value;
    return [value];
  }

  function pick(item) {
    const tags = toArray(item.tags).concat(toArray(item.categories)).map(t => String(t));
    return {
      title: String(item.title == null ? '' : item.title),
      url: String(item.url == null ? '' : item.url),
      date: String(item.date == null ? '' : item.date),
      excerpt: String(item.excerpt == null ? '' : item.excerpt),
      text: String(item.text == null ? '' : item.text),
      tags: tags
    };
  }

  function build(data) {
    const items = [];
    const index = [];
    const list = toArray(data);
    for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      if (!raw || typeof raw !== 'object') continue;
      const item = pick(raw);
      if (!item.title && !item.url) continue;
      items.push(item);
      index.push({
        title: item.title.toLowerCase(),
        tags: item.tags.join(' ').toLowerCase(),
        excerpt: item.excerpt.toLowerCase(),
        text: item.text.toLowerCase()
      });
    }
    state.items = items;
    state.index = index;
  }

  /** 幂等：成功前重复调用共用同一个 Promise；失败后可重试 */
  function load() {
    if (API.loaded) return Promise.resolve();
    if (state.promise) return state.promise;
    const url = indexPath();
    state.promise = fetch(url, { credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
        return res.json();
      })
      .then(data => {
        build(data);
        API.loaded = true;
      })
      .catch(err => {
        state.promise = null;
        API.loaded = false;
        throw err;
      });
    return state.promise;
  }

  /** 同步查询：返回 top <limit> 条原始条目 */
  function query(term) {
    const text = String(term == null ? '' : term).trim().toLowerCase();
    if (!text || !API.loaded) return [];
    const tokens = text.split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    const items = state.items;
    const index = state.index;
    const hits = [];

    for (let i = 0; i < index.length; i++) {
      const row = index[i];
      let score = 0;
      let ok = true;
      for (let t = 0; t < tokens.length; t++) {
        const tk = tokens[t];
        let matched = false;
        if (row.title.indexOf(tk) > -1) {
          score += 10;
          matched = true;
        }
        if (row.tags && row.tags.indexOf(tk) > -1) {
          score += 5;
          matched = true;
        }
        if (row.excerpt && row.excerpt.indexOf(tk) > -1) {
          score += 2;
          matched = true;
        }
        if (row.text && row.text.indexOf(tk) > -1) {
          score += 1;
          matched = true;
        }
        if (!matched) {
          ok = false;
          break;
        }
      }
      if (ok) hits.push({ i: i, score: score });
    }

    hits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(items[b.i].date).localeCompare(String(items[a.i].date));
    });

    const limit = Number(API.limit) > 0 ? Number(API.limit) : 20;
    const out = [];
    for (let n = 0; n < hits.length && n < limit; n++) {
      out.push(items[hits[n].i]);
    }
    return out;
  }

  window.YeleeSearch = API;
})();
