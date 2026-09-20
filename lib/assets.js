'use strict';
/**
 * yelee-next · 站内资源内容指纹
 * ---------------------------------------------------------------------------
 * 为什么需要：静态托管（Cloudflare `_headers`、Netlify 等）普遍把图片设成
 * 长缓存甚至 `immutable`，但图片没有内容指纹 —— 换了头像/图标/配图，浏览器和
 * CDN 还会一直用旧的那份，只能靠手改文件名或手动加 `?v=N`（站点仓库里就曾
 * 因此留下一个手写的 `?v=2`）。
 * 这里在**构建期**按文件内容算出 8 位 md5 拼成 `?v=<hash>`：文件改一个字节，
 * URL 就变，长缓存立刻失效，不用人工维护版本号。
 *
 * 两个容易搞错的点：
 *   1. 站点与主题可能提供**同一路径**的文件，而产物里以**主题那份**为准（实测：
 *      两边放同路径不同内容，构建结果是主题的）。所以查文件也按「主题 → 站点」
 *      的顺序，否则指纹会算到一份根本没被发布的文件上。
 *   2. 哈希按绝对路径缓存，且只在构建期算一次 —— 一个进程内多少页面共用同一份，
 *      不会因为页面多而重复读盘。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fileCache = new Map(); // 相对路径 → 绝对路径 | null
const hashCache = new Map(); // 绝对路径 → 8 位哈希
let roots = [];              // 查找根目录，顺序 = 优先级

/**
 * 注入查找目录（顺序即优先级）。必须由 scripts/ 下的脚本显式调用：
 * `hexo` 全局只有 Hexo 自己加载的脚本（scripts/*.js）能直接看到，
 * 放在 lib/ 里被 require 的模块拿不到 —— 曾经因此 roots 为空、指纹静默失效。
 */
function configure(themeDir, sourceDir) {
  const next = [];
  if (themeDir) next.push(path.join(themeDir, 'source'));
  if (sourceDir) next.push(sourceDir);
  if (next.join('|') !== roots.join('|')) {
    roots = next;
    fileCache.clear();
    hashCache.clear();
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

/** '/img/a.png' 或 'img/a.png' → 实际文件绝对路径；找不到返回 null */
function resolveAsset(rel) {
  const clean = String(rel || '').replace(/^\/+/, '');
  if (!clean) return null;
  if (fileCache.has(clean)) return fileCache.get(clean);
  const found = roots.map(dir => path.join(dir, clean)).find(isFile) || null;
  fileCache.set(clean, found);
  return found;
}

/** 内容指纹（8 位 md5）；文件不存在 / 读不了返回空串 */
function assetHash(rel) {
  const abs = resolveAsset(rel);
  if (!abs) return '';
  if (hashCache.has(abs)) return hashCache.get(abs);
  let hash = '';
  try {
    hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex').slice(0, 8);
  } catch (e) {
    hash = '';
  }
  hashCache.set(abs, hash);
  return hash;
}

/**
 * 给站内资源地址加内容指纹：'/img/a.png' → '/img/a.png?v=1a2b3c4d'
 *   · 外链（http(s):、//）与 data: 原样返回；
 *   · 找不到文件（例如文章资源目录里的图）原样返回，绝不猜；
 *   · 已经带了 ?v= 的会被**覆盖**成内容哈希（手写的版本号不再需要维护）；
 *   · 其它查询参数保留。
 */
function fingerprintSrc(src) {
  const s = String(src || '');
  if (!s || /^(https?:)?\/\//.test(s) || s.startsWith('data:')) return s;
  const m = s.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!m) return s;
  const base = m[1];
  const search = m[2] || '';
  const frag = m[3] || '';
  const hash = assetHash(base);
  if (!hash) return s;
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  params.set('v', hash);
  const qs = params.toString();
  return base + (qs ? '?' + qs : '') + frag;
}

module.exports = { configure, resolveAsset, assetHash, fingerprintSrc };
