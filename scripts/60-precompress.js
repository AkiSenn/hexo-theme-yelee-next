/* eslint-disable */
/**
 * yelee-next · 构建产物预压缩（Brotli，opt-in）
 * ---------------------------------------------------------------------------
 * `performance.precompress: true` 时，生成结束后给 public/ 下的 css / js
 * 各写一份同名的 `.br`（brotli 质量由 `performance.precompress_quality` 控制，默认 11）。
 *
 * 为什么需要它（实测结论，不是推测）：
 *   Cloudflare 对 Worker 静态资产**不会**使用站点里预先放好的同名 `.br` 文件 ——
 *   放了也只在边缘动态压缩（用哨兵内容验证过：/x.txt 带 Accept-Encoding: br 时，
 *   返回的是边缘自己压的原文，不是站点里的 x.txt.br；新开的临时账号行为一致）。
 *   而且它给现代浏览器优先发 **zstd**（实测首屏 47.36KB vs 其动态 brotli 45.12KB）。
 *   所以在 CF 上要吃到 brotli-11 的收益，得自己把 `.br` 发出去：
 *   站点侧加一个 Worker 脚本，用 `env.ASSETS.fetch('/css/x.css.br')` 取出后
 *   带 `Content-Encoding: br` 返回 —— 片段见 docs/caching.md 第五节。
 *
 * 实现方式：往**路由表**里加 `<原路径>.br`，而不是自己去 public/ 写文件。
 *   因为 Hexo 是「先跑完 after_generate 过滤器、再由 CLI 把路由表统一落盘」，
 *   过滤器执行时 public/ 里还没有产物；直接写盘会什么都找不到。
 *   走路由还能天然拿到「Hexo 实际输出的字节」，并随 hexo clean / 增量构建一起管理。
 *
 * 三条边界：
 *   · 只给 css / js 生成（收益最大的两项），HTML 交给边缘动态压缩；
 *   · 压完不比原文件小就不加这条路由（免得让浏览器多下几个字节）；
 *   · 纯构建期行为，不进客户端 JS，零运行时开销。
 *
 * 什么时候**不要**开：托管方不使用同名 `.br` 时（GitHub Pages、没配
 * `brotli_static on` 的 nginx 等），开着只会让部署多几十 KB 死文件。默认关闭。
 */

const path = require('path');
const zlib = require('zlib');

/* 只压这两类：主题产出的 css/theme.css、js/app.js、js/search.js 都在其中 */
const EXTS = new Set(['.css', '.js']);

/** 路由数据可能是 string / Buffer / Stream，统一读成 Buffer */
function readRoute(data) {
  if (data == null) return Promise.resolve(Buffer.alloc(0));
  if (Buffer.isBuffer(data)) return Promise.resolve(data);
  if (typeof data === 'string') return Promise.resolve(Buffer.from(data));
  return new Promise((resolve, reject) => {
    const chunks = [];
    data.on('data', c => chunks.push(Buffer.from(c)));
    data.on('end', () => resolve(Buffer.concat(chunks)));
    data.on('error', reject);
  });
}

hexo.extend.filter.register('after_generate', function () {
  const cfg = (hexo.theme && hexo.theme.config) || {};
  const perf = cfg.performance || {};
  if (!perf.precompress) return;

  const quality = Number(perf.precompress_quality) || 11;
  const routes = hexo.route.list().filter(p => EXTS.has(path.extname(p).toLowerCase()));
  if (!routes.length) {
    hexo.log.warn('[yelee-next] performance.precompress 已开启，但路由表里没有 css/js');
    return;
  }

  const stats = { files: 0, raw: 0, br: 0, skipped: [] };

  return Promise.all(
    routes.map(routePath =>
      readRoute(hexo.route.get(routePath)).then(buf => {
        const packed = zlib.brotliCompressSync(buf, {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality }
        });
        if (packed.length >= buf.length) {
          /* 压不动就别加，留着反而让浏览器多下字节 */
          stats.skipped.push(routePath);
          return;
        }
        hexo.route.set(routePath + '.br', packed);
        stats.files += 1;
        stats.raw += buf.length;
        stats.br += packed.length;
      })
    )
  ).then(() => {
    hexo.log.info(
      '[yelee-next] 预压缩：%d 个文件 %s → %s（省 %s，brotli 质量 %d）',
      stats.files,
      (stats.raw / 1024).toFixed(1) + 'KB',
      (stats.br / 1024).toFixed(1) + 'KB',
      ((stats.raw - stats.br) / 1024).toFixed(1) + 'KB',
      quality
    );
    if (stats.skipped.length) {
      hexo.log.info('[yelee-next] 压不动、已跳过：%s', stats.skipped.join('、'));
    }
  });
});
