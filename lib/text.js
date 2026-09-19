'use strict';
/**
 * yelee-next · 文本工具
 * 主题脚本（scripts/*.js）与模板助手共用的纯函数，放在这里避免复制粘贴。
 */

/** 极简 HTML → 纯文本 */
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
    const cut = Math.max(
      sliced.lastIndexOf('。'),
      sliced.lastIndexOf('！'),
      sliced.lastIndexOf('？'),
      sliced.lastIndexOf('. '),
      sliced.lastIndexOf(' ')
    );
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
