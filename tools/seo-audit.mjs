#!/usr/bin/env node
/**
 * SEO 体检：检查产物的 <title> 与 meta description。
 *   node tools/seo-audit.mjs <public 目录> [--min 50] [--json]
 *
 * 为什么需要它：搜索引擎后台（Bing / Google）最常见的两条警告就是
 *   · 「Meta descriptions on many of your pages are too short」
 *   · 「Too many pages with identical meta descriptions」
 * 这个脚本把这两条在本地就查出来：
 *   ✗ 描述过短（默认 < 50 字符）
 *   ✗ 多页描述完全重复
 *   ✗ 缺少描述 / 缺少标题
 *   ✗ 标题重复
 * 退出码非 0 表示有问题，可直接放进 CI。
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const root = path.resolve(args[0] || 'public');
const minLen = Number(args[1] || (flags.find(f => f.startsWith('--min')) || '--min=50').split('=')[1] || 50);
const asJson = flags.includes('--json');

if (!fs.existsSync(root)) {
  console.error('目录不存在: ' + root);
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pick = (html, re) => {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};

const pages = walk(root).map(file => {
  const html = fs.readFileSync(file, 'utf8');
  const desc = pick(html, /<meta name="description" content="([^"]*)"/i);
  const robots = pick(html, /<meta name="robots" content="([^"]*)"/i);
  return {
    url: '/' + path.relative(root, file).replace(/\\/g, '/'),
    title: pick(html, /<title>([^<]*)<\/title>/i),
    desc,
    len: [...desc].length,
    noindex: /noindex/i.test(robots)
  };
});

/* 标了 noindex 的页面（404 等）本来就不进索引，不要求它有描述 */
const skipped = pages.filter(p => p.noindex);
const indexed = pages.filter(p => !p.noindex);
const short = indexed.filter(p => p.len > 0 && p.len < minLen);
const empty = indexed.filter(p => !p.desc);
const byDesc = new Map();
const byTitle = new Map();
for (const p of indexed) {
  if (p.desc) byDesc.set(p.desc, [...(byDesc.get(p.desc) || []), p]);
  if (p.title) byTitle.set(p.title, [...(byTitle.get(p.title) || []), p]);
}
const dupDesc = [...byDesc.entries()].filter(([, list]) => list.length > 1);
const dupTitle = [...byTitle.entries()].filter(([, list]) => list.length > 1);

if (asJson) {
  console.log(JSON.stringify({ pages, short, empty, dupDesc, dupTitle }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log('===== SEO 体检（description / title）=====');
  console.log('页面数: ' + pages.length + '，描述长度下限: ' + minLen + ' 字符\n');
  console.log('  ' + pad('URL', 40) + pad('描述长度', 10) + '描述');
  for (const p of pages.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log('  ' + pad(p.url.slice(0, 38), 40) + pad(p.len, 10) + p.desc.slice(0, 90));
  }
  console.log('\n----- 问题 -----');
  const line = (label, list, fmt) => {
    if (!list.length) {
      console.log('✓ ' + label + '：无');
      return 0;
    }
    console.log('✗ ' + label + '（' + list.length + '）');
    for (const item of list) console.log('    ' + fmt(item));
    return list.length;
  };
  let bad = 0;
  bad += line('缺少 description', empty, p => p.url);
  bad += line('描述过短', short, p => p.url + '  (' + p.len + ' 字符)');
  bad += line('描述重复', dupDesc, ([d, list]) => list.map(p => p.url).join('  ≡  ') + '\n      "' + d.slice(0, 70) + '…"');
  bad += line('标题重复', dupTitle, ([t, list]) => list.map(p => p.url).join('  ≡  ') + '   "' + t + '"');
  console.log(bad ? '\n共 ' + bad + ' 类问题需要处理' : '\n全部通过');
  process.exitCode = bad ? 1 : 0;
}
