#!/usr/bin/env node
/**
 * 版本号一致性检查：package.json / _config.yml / scripts/00-config.js 三处必须一致，
 * 且形如 x.y.z。
 *   node tools/version-check.mjs
 *
 * 为什么要单独查：主题版本号散在三处 —— npm 元数据、主题配置（页脚的 Yelee-Next
 * 链接 title 取自这里）、以及内置默认值。漏改一处就会出现「装了 1.1.0、页脚却写着
 * 1.0.0」这种查起来很费劲的不一致。CI 与 tools/local-ci.mjs 都会跑它。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sources = [
  ['package.json', () => JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version],
  [
    '_config.yml',
    () => {
      const m = fs.readFileSync(path.join(repoRoot, '_config.yml'), 'utf8').match(/^version:\s*(\S+)\s*$/m);
      return m ? m[1] : null;
    }
  ],
  [
    'scripts/00-config.js',
    () => {
      const m = fs.readFileSync(path.join(repoRoot, 'scripts/00-config.js'), 'utf8').match(/^\s*version:\s*'([^']+)'/m);
      return m ? m[1] : null;
    }
  ]
];

let bad = 0;
const found = [];
for (const [file, read] of sources) {
  let v = null;
  try {
    v = read();
  } catch (e) {
    console.error(`✗ ${file} 读取失败：${e.message}`);
    bad++;
    continue;
  }
  if (!v) {
    console.error(`✗ ${file} 里没找到 version`);
    bad++;
    continue;
  }
  found.push(v);
  console.log(`${/^\d+\.\d+\.\d+$/.test(v) ? '✓' : '✗'} ${file.padEnd(22)} ${v}${/^\d+\.\d+\.\d+$/.test(v) ? '' : '（不是 x.y.z 形式）'}`);
  if (!/^\d+\.\d+\.\d+$/.test(v)) bad++;
}

const unique = [...new Set(found)];
if (unique.length > 1) {
  console.error(`\n✗ 三处版本号不一致：${found.join(' / ')}`);
  bad++;
} else if (unique.length === 1) {
  console.log(`\n✓ 三处版本号一致：${unique[0]}`);
}

/* CHANGELOG 也要跟着走：首条必须是当前版本，且不能有重复条目
   （改 CHANGELOG 时把上一条的标题吃掉过好几次，这里兜住）。 */
try {
  const md = fs.readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
  const heads = [...md.matchAll(/^## \[([0-9]+\.[0-9]+\.[0-9]+)\]/gm)].map(m => m[1]);
  if (!heads.length) {
    console.error('✗ CHANGELOG.md 里没找到任何 "## [x.y.z]" 版本小节');
    bad++;
  } else {
    const okFirst = unique.length === 1 && heads[0] === unique[0];
    const okUnique = new Set(heads).size === heads.length;
    console.log(`${okFirst ? '✓' : '✗'} CHANGELOG.md 首条 ${heads[0]}（应为当前版本）`);
    console.log(`${okUnique ? '✓' : '✗'} CHANGELOG.md 版本小节无重复（${heads.length} 条：${heads.join(' / ')}）`);
    if (!okFirst || !okUnique) bad++;
  }
} catch (e) {
  console.error(`✗ CHANGELOG.md 读取失败：${e.message}`);
  bad++;
}

if (bad) {
  console.error(`${bad} 项版本号检查未通过。改版本时记得三处一起改（package.json、_config.yml、scripts/00-config.js），并在 CHANGELOG.md 顶部加一节`);
  process.exit(1);
}
