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
/**
 * 列表摘要：**段落级**抽取，而不是把整篇 HTML 拍平成一行再截断。
 *
 * 为什么不能用 plainText(content, n)：那样 h2 小标题与代码块内容都会被压成
 * 普通文字混进摘要 —— 首页卡片会出现「前言 近几年Github Pages来搭建…」
 * （「前言」其实是原文的 h2）、「… 国内 bash 国内访问 https://…」（那是代码块）。
 * 这里只取正文段落 <p>，跳过标题 / 代码块 / 引用 / 列表 / 表格，拼够 limit 为止。
 */
function leadingParagraphs(html, limit, maxParagraphs) {
  if (!html) return '';
  const maxP = maxParagraphs || 2;
  const body = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<h[1-6]\b[\s\S]*?<\/h[1-6]>/gi, ' ')
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, ' ')
    .replace(/<table\b[\s\S]*?<\/table>/gi, ' ')
    .replace(/<ul\b[\s\S]*?<\/ul>/gi, ' ')
    .replace(/<ol\b[\s\S]*?<\/ol>/gi, ' ');

  const picked = [];
  let total = 0;
  for (const m of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = plainText(m[1]);
    if (!text) continue;
    picked.push(text);
    total += text.length;
    if (picked.length >= maxP || (limit && total >= limit)) break;
  }
  /* 一段都没有（文章全是列表/代码）：退回原行为，至少别给空摘要 */
  if (!picked.length) return plainText(html, limit);
  return truncate(picked.join(' '), limit);
}

/**
 * 中英文之间补空格（「盘古之白」的极简实现）：只处理「汉字紧贴拉丁字母/数字」，
 * 因此英文站点不受影响，且幂等（已有空格处不再匹配）。
 * 调用方必须**只对文本节点**调用，不要用在标签属性或 code/pre 上。
 */
function autospace(text) {
  if (!text) return '';
  const CJK = '[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af]';
  return String(text)
    .replace(new RegExp('(' + CJK + ')([A-Za-z0-9])', 'g'), '$1 $2')
    .replace(new RegExp('([A-Za-z0-9])(' + CJK + ')', 'g'), '$1 $2');
}

/** 按标点/空格边界截断并加省略号（摘要与描述共用） */
function truncate(text, limit) {
  if (!limit || text.length <= limit) return text;
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
  return (cut > limit * 0.6 ? sliced.slice(0, cut + 1) : sliced) + '…';
}

function plainText(html, limit) {
  if (!html) return '';
  const text = String(html)
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
  return truncate(text, limit);
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

module.exports = { plainText, leadingParagraphs, autospace, truncate, countWords, readingMinutes, stableHash };
