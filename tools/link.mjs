#!/usr/bin/env node
/**
 * 把本主题挂到一个 Hexo 站点的 themes/ 下（Windows 用目录 junction，其它平台用 symlink）。
 * 主题代码始终留在本仓库里，站点目录里只多一个链接，`hexo g` 直接生效。
 *
 *   node tools/link.mjs E:\hexo                 # 挂成 E:\hexo\themes\yelee-next
 *   node tools/link.mjs E:\hexo yelee-next      # 指定主题名
 *   node tools/link.mjs E:\hexo --unlink        # 移除链接
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const themeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter(a => a !== '--unlink');
const unlink = process.argv.includes('--unlink');
const [siteDirArg, themeName = 'yelee-next'] = args;

if (!siteDirArg) {
  console.error('用法: node tools/link.mjs <hexo站点目录> [主题名=yelee-next] [--unlink]');
  process.exit(1);
}

const siteDir = path.resolve(siteDirArg);
if (!fs.existsSync(path.join(siteDir, '_config.yml'))) {
  console.error(`✗ ${siteDir} 看起来不是 Hexo 站点（找不到 _config.yml）`);
  process.exit(1);
}

const target = path.join(siteDir, 'themes', themeName);

if (unlink) {
  if (!fs.existsSync(target)) {
    console.log(`· ${target} 不存在，无需处理`);
    process.exit(0);
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`✓ 已移除 ${target}`);
  process.exit(0);
}

fs.mkdirSync(path.join(siteDir, 'themes'), { recursive: true });

if (fs.existsSync(target)) {
  const stat = fs.lstatSync(target);
  const real = stat.isSymbolicLink() ? fs.realpathSync(target) : target;
  if (path.resolve(real) === themeDir) {
    console.log(`· 已经链接好了：${target} → ${themeDir}`);
  } else {
    console.error(`✗ ${target} 已存在（${real}），先移除或换一个主题名：--unlink`);
    process.exit(1);
  }
} else if (process.platform === 'win32') {
  execFileSync('cmd', ['/c', 'mklink', '/J', target, themeDir], { stdio: 'inherit' });
  console.log(`✓ 已创建目录 junction：${target} → ${themeDir}`);
} else {
  fs.symlinkSync(themeDir, target, 'dir');
  console.log(`✓ 已创建软链接：${target} → ${themeDir}`);
}

console.log(`
接下来在站点 _config.yml 里设置：
  theme: ${themeName}

然后：
  hexo clean && hexo g && hexo s
`);
