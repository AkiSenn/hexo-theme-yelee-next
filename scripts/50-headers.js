/* eslint-disable */
/**
 * yelee-next · Cloudflare / Netlify 风格 _headers
 * ---------------------------------------------------------------------------
 * 只在 performance.generate_headers: true 且站点 source 目录里没有 _headers 时生效。
 * 目的：给「带内容指纹」的静态资源开一年不可变缓存，同时让 HTML 保持协商缓存，
 * 这样发文后刷新生效、资源却不用重复下载。
 *
 * 如果你用的是 Hexo 站点自带的 source/_headers（本项目里的博客就是这样），
 * 主题不会覆盖它，只会提示你手动补规则。
 */

const fs = require('fs');
const path = require('path');

function buildHeaders(cfg) {
  const fingerprint = !cfg.assets || cfg.assets.fingerprint !== false;
  const assetCache = fingerprint
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=604800, stale-while-revalidate=86400';

  const lines = [
    '# 由 yelee-next 生成（performance.generate_headers: true）',
    '# HTML 走协商缓存：发文后刷新即可见；带指纹的静态资源走一年不可变缓存。',
    '',
    '/*.html',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '',
    '/css/*',
    `  Cache-Control: ${assetCache}`,
    '',
    '/js/*',
    `  Cache-Control: ${assetCache}`,
    '',
    '/img/*',
    '  Cache-Control: public, max-age=2592000',
    '',
    '/background/*',
    '  Cache-Control: public, max-age=2592000',
    '',
    '/fonts/*',
    '  Cache-Control: public, max-age=2592000',
    '',
    '/search.json',
    '  Cache-Control: public, max-age=3600, stale-while-revalidate=86400',
    '',
    '/apple-touch-icon.png',
    '  Cache-Control: public, max-age=2592000',
    '',
    '/favicon.ico',
    '  Cache-Control: public, max-age=2592000',
    ''
  ];
  return lines.join('\n');
}

hexo.extend.generator.register('yelee_headers', function () {
  const cfg = (this.theme && this.theme.config) || {};
  const perf = cfg.performance || {};
  if (!perf.generate_headers) return;

  const siteHeaders = path.join(this.source_dir, '_headers');
  if (fs.existsSync(siteHeaders)) {
    this.log.info(
      '[yelee-next] 站点已有 source/_headers，跳过生成；可把主题 docs/caching.md 里的规则合并过去'
    );
    return;
  }
  return { path: '_headers', data: buildHeaders(cfg) };
});

module.exports = { buildHeaders };
