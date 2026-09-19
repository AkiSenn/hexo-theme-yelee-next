#!/usr/bin/env node
/**
 * 生成产物体检：检查 public/ 里每个 HTML 引用的本地资源是否真的存在，
 * 顺手统计体积/阻塞请求/是否还残留 jQuery、require.js、FontAwesome 等老依赖。
 *
 *   node tools/check.mjs E:\hexo\public
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'public');
if (!fs.existsSync(root)) {
  console.error(`✗ 找不到目录：${root}`);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(root);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const LEGACY = [
  ['jquery', /jquery[.-][\d.]*(\.min)?\.js/i],
  ['require.js', /require(\.min)?\.js/i],
  ['font-awesome', /font-awesome/i],
  ['fancybox', /fancybox/i],
  ['animate.css', /animate(\.min)?\.css/i],
  ['mathjax 2.x', /mathjax\/2\./i]
];

const problems = [];
const stats = {
  html: htmlFiles.length,
  htmlBytes: 0,
  refs: 0,
  missing: 0,
  blockingCss: 0,
  blockingUrls: new Map(),
  legacy: new Map()
};

const ASSET_ATTR = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;

for (const file of htmlFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  stats.htmlBytes += Buffer.byteLength(raw);
  const rel = path.relative(root, file).replace(/\\/g, '/');

  for (const [, url] of raw.matchAll(ASSET_ATTR)) {
    if (/^(https?:)?\/\//.test(url) || /^(data|mailto|tel|javascript):/i.test(url) || url.startsWith('#')) continue;
    let clean = url.split('#')[0].split('?')[0];
    try {
      clean = decodeURIComponent(clean);
    } catch (e) {}
    if (!clean || clean === '/') continue;
    stats.refs += 1;
    const abs = path.join(root, clean.replace(/^\//, ''));
    const candidates = [abs, abs + '.html', path.join(abs, 'index.html')];
    if (!candidates.some(c => fs.existsSync(c) && fs.statSync(c).isFile())) {
      stats.missing += 1;
      problems.push(`${rel} → 引用了不存在的资源 ${clean}`);
    }
  }

  /* 只统计真正阻塞渲染的样式表：排除 <noscript> 兜底与 media=print。
     注意要按属性解析，不能用 /rel="stylesheet"/ 直接匹配整段：
     <link rel="preload" onload="this.rel='stylesheet'"> 那种异步写法会被误判。 */
  const withoutNoscript = raw.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  for (const tag of withoutNoscript.match(/<link[^>]*>/gi) || []) {
    const attrs = {};
    for (const [, name, value] of tag.matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
      attrs[name.toLowerCase()] = value;
    }
    if ((attrs.rel || '').toLowerCase() !== 'stylesheet') continue;
    if ((attrs.media || '').toLowerCase() === 'print') continue;
    stats.blockingCss += 1;
    const url = attrs.href || '';
    if (url && !/^(https?:)?\/\//.test(url)) {
      const key = url.split('?')[0];
      stats.blockingUrls.set(key, (stats.blockingUrls.get(key) || 0) + 1);
    }
  }

  /* 只把「真的被引用为资源」的 URL 拿来判断老依赖，避免正文里出现 fancybox 字样就误报 */
  for (const [, url] of raw.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    for (const [name, re] of LEGACY) {
      if (re.test(url)) stats.legacy.set(name, (stats.legacy.get(name) || 0) + 1);
    }
  }
}

const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log('===== yelee-next 产物体检 =====');
console.log(`HTML 页面      : ${stats.html} 个，共 ${kb(stats.htmlBytes)}，平均 ${kb(stats.htmlBytes / Math.max(stats.html, 1))}`);
console.log(`本地资源引用   : ${stats.refs} 处，缺失 ${stats.missing} 处`);
console.log(`阻塞渲染的 CSS : ${stats.blockingCss} 个 <link rel=stylesheet>（不含 noscript 兜底与 media=print）`);
for (const [url, count] of [...stats.blockingUrls].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  - ${url}  出现在 ${count} 个页面`);
}

if (stats.legacy.size) {
  console.log('\n⚠ 仍检测到老依赖引用：');
  for (const [name, count] of stats.legacy) console.log(`  - ${name}: 出现在 ${count} 个页面`);
} else {
  console.log('\n✓ 没有 jQuery / require.js / FontAwesome / fancybox / MathJax2 的残留引用');
}

if (problems.length) {
  console.log(`\n✗ 缺失资源（${problems.length}）：`);
  for (const p of problems.slice(0, 40)) console.log('  - ' + p);
  if (problems.length > 40) console.log(`  ... 另外 ${problems.length - 40} 条`);
  process.exitCode = 1;
} else {
  console.log('\n✓ 所有本地资源引用都能在 public/ 里找到');
}
