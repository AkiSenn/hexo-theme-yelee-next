#!/usr/bin/env node
/**
 * 把本主题同步到某个 Hexo 站点的 themes/<名字> 目录。
 *
 * 为什么需要它：Cloudflare Workers Builds / GitHub Actions 是从 GitHub 拉源码构建的，
 * 本地那种 junction 链接在云端不存在，所以站点仓库里需要有一份主题副本。
 * 本脚本保证「主题仓库是唯一真源」，站点里那份是纯生成物。
 *
 * 用法：
 *   node tools/sync.mjs E:/my-blog                    # 同步到 E:/my-blog/themes/yelee-next
 *   node tools/sync.mjs E:/my-blog yelee-next         # 指定主题目录名
 *   node tools/sync.mjs E:/my-blog --check            # 只对比差异，不写入
 *
 * 行为：
 *   · 目标若是指向本仓库的 junction/软链接 → 先自动解除（不会动到源目录）
 *   · 目标是普通目录 → 整个删掉重建（它本来就是生成物）
 *   · 排除 .git / node_modules / public / .dev / 各类缓存
 *   · 复制完写一份 SYNCED.json（来源、时间、文件数、文件清单哈希）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const themeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const checkOnly = process.argv.includes('--check');
const [siteArg, themeName = 'yelee-next'] = args;

if (!siteArg) {
  console.error('用法: node tools/sync.mjs <Hexo站点目录> [主题名=yelee-next] [--check]');
  process.exit(1);
}

const siteDir = path.resolve(siteArg);
if (!fs.existsSync(path.join(siteDir, '_config.yml'))) {
  console.error(`✗ ${siteDir} 看起来不是 Hexo 站点（没有 _config.yml）`);
  process.exit(1);
}

const target = path.join(siteDir, 'themes', themeName);
const EXCLUDE = new Set(['.git', 'node_modules', 'public', '.dev', '.DS_Store', 'Thumbs.db', '.wrangler']);

function shouldCopy(src) {
  const rel = path.relative(themeDir, src);
  if (!rel) return true;
  return !rel.split(path.sep).some(part => EXCLUDE.has(part));
}

function listFiles(root) {
  const out = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (!shouldCopy(p)) continue;
      if (entry.isDirectory()) walk(p);
      else out.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  };
  walk(root);
  return out.sort();
}

const srcFiles = listFiles(themeDir);
const hash = crypto.createHash('sha256');
for (const rel of srcFiles) hash.update(rel + '\n' + fs.readFileSync(path.join(themeDir, rel)));
const digest = hash.digest('hex').slice(0, 12);

if (checkOnly) {
  const marker = path.join(target, 'SYNCED.json');
  const prev = fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, 'utf8')) : null;
  const same = prev && prev.digest === digest;
  console.log(`${same ? '✓ 已是最新' : '✗ 需要同步'}  ${target}`);
  console.log(`  源文件数 ${srcFiles.length}，指纹 ${digest}${prev ? `，副本指纹 ${prev.digest}` : '（副本无标记）'}`);
  process.exit(same ? 0 : 1);
}

/* 目标处理：链接先解除，普通目录直接删（它是生成物） */
if (fs.existsSync(target)) {
  const st = fs.lstatSync(target);
  const isLink = st.isSymbolicLink();
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`${isLink ? '· 已解除链接' : '· 已清空旧副本'}：${target}`);
}
fs.mkdirSync(target, { recursive: true });

fs.cpSync(themeDir, target, { recursive: true, filter: shouldCopy });

fs.writeFileSync(
  path.join(target, 'SYNCED.json'),
  JSON.stringify(
    {
      note: '本目录是 hexo-theme-yelee-next 的同步副本，请勿直接修改；改动请到主题仓库后用 node tools/sync.mjs 重新同步。',
      from: themeDir,
      at: new Date().toISOString(),
      digest,
      files: srcFiles.length
    },
    null,
    2
  ) + '\n'
);

console.log(`✓ 已同步 ${srcFiles.length} 个文件 → ${target}`);
console.log(`  指纹 ${digest}`);
console.log('  改主题请到主题仓库改，然后重跑本脚本，再一起提交站点仓库。');
