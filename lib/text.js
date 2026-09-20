'use strict';
/**
 * yelee-next · 文本工具
 * 主题脚本（scripts/*.js）与模板助手共用的纯函数，放在这里避免复制粘贴。
 */

/**
 * 极简 HTML → 纯文本；给了 limit 就截断到 limit 个字符以内。
 * 截断会尽量在标点/空格处收尾：句末标点（。！？. 空格）随时可用，
 * 中文逗号只在切点已超过 limit 的 85% 时才用 —— 见下方注释。
 */
function plainText(html, limit) {
  if (!html) return '';
  let text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (limit && text.length > limit) {
    const sliced = text.slice(0, limit);
    /* 硬边界：句末标点 / 空格，切在这里最自然 */
    const hard = Math.max(
      sliced.lastIndexOf('。'),
      sliced.lastIndexOf('！'),
      sliced.lastIndexOf('？'),
      sliced.lastIndexOf('. '),
      sliced.lastIndexOf(' ')
    );
    /* 软边界：中文逗号。中文长句常常整段只有逗号没有句号，只认硬边界就会切成
       「…比较慢，后…」这种半句话。逗号出现得太密，切早了摘要会短得没信息量，
       所以只在足够靠后（> 85%）时才采用；否则维持原来的硬截断。 */
    const soft = sliced.lastIndexOf('，');
    const cut = Math.max(hard, soft > limit * 0.85 ? soft : -1);
    text = (cut > limit * 0.6 ? sliced.slice(0, cut + 1) : sliced) + '…';
  }
  return text;
}

/** CJK 感知的字数统计 */
function countWords(html) {
  const text = plainText(html);
  const cjk = (text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g) || []).length;
  const latin = (
    text
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g, ' ')
      .match(/[A-Za-z0-9][A-Za-z0-9'’_-]*/g) || []
  ).length;
  return cjk + latin;
}

function readingMinutes(words) {
  return Math.max(1, Math.round(words / 300));
}

/** 稳定字符串 hash（按页面挑背景图用） */
function stableHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

module.exports = { plainText, countWords, readingMinutes, stableHash };
