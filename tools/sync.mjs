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
 *   · 要复制哪些文件由 git 说了算：`git ls-files --cached --others --exclude-standard`
 *     （即「git 已跟踪 + 未被 .gitignore 忽略的未跟踪文件」）。
 *     为什么不用硬编码排除清单：那样等于把 .gitignore 抄了第二遍，两边必然漂移 ——
 *     曾经就因为漏了 .ci/（local-ci.mjs 生成的临时站点）和 .handoff.md，
 *     导致跑完本地 CI 再同步时会把 76 个临时文件塞进博客仓库。
 *     git 不可用时退回内置清单（见 FALLBACK_EXCLUDE）。
 *   · 指纹与复制用同一份文件清单，保证「--check 说一致」和「复制出来的内容」不可能对不上
 *   · 复制完写一份 SYNCED.json（来源、时间、文件数、文件清单哈希）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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

/* 仅当 git 不可用时才用的兜底清单（正常情况下由 .gitignore 决定） */
const FALLBACK_EXCLUDE = new Set(['.git', 'node_modules', 'public', '.dev', '.vscode', '.idea', '.ci', '.handoff.md', 'package-lock.json', '.DS_Store', 'Thumbs.db', '.wrangler']);

/** 用 git 求「这个仓库里该被分发出去的文件」，顺带自动继承 .gitignore */
function listFilesViaGit() {
  try {
    const out = execFileSync(
      'git',
      ['-C', themeDir, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return [...new Set(out.split('\0').filter(Boolean).map(p => p.replace(/\\/g, '/')))];
  } catch {
    return null; // 不是 git 仓库 / 没装 git → 交给兜底清单，不因此中断同步
  }
}

/** 兜底：自己走目录，按 FALLBACK_EXCLUDE 逐个路径段排除 */
function listFilesByWalk() {
  const out = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (FALLBACK_EXCLUDE.has(entry.name)) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.push(path.relative(themeDir, p).replace(/\\/g, '/'));
    }
  };
  walk(themeDir);
  return out;
}

const viaGit = listFilesViaGit();
// 过滤掉「索引里有、工作区已删」的路径，避免下面读文件时炸掉
const srcFiles = (viaGit ?? listFilesByWalk())
  .filter(rel => fs.existsSync(path.join(themeDir, rel)))
  .sort();
console.log(`· 文件清单来源：${viaGit ? 'git（继承 .gitignore）' : '内置兜底清单（未检测到 git）'}`);

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

// 逐个文件复制（而不是 fs.cpSync + filter）：复制用的就是算指纹的那份清单，
// 杜绝「指纹算的文件」和「实际拷过去的文件」两套判断再次分叉。
for (const rel of srcFiles) {
  const dst = path.join(target, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(themeDir, rel), dst);
}

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
