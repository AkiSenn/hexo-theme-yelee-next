#!/usr/bin/env node
/**
 * CI 用：对生成产物做关键签名检查（比 check.mjs 更严格，缺一即失败）。
 *   node tools/ci-signature-check.mjs <public 目录>
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.ci/public');
const read = rel => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};

const index = read('index.html');
const post = fs
  .readdirSync(path.join(root, 'post'))
  .filter(f => f.endsWith('.html'))
  .map(f => read('post/' + f))
  .join('\n');

const checks = {
  '首页生成': index.includes('<html') && index.includes('data-animate='),
  '文章页生成': post.includes('post__content'),
  '归档页生成': read('archives/index.html').includes('archive-list'),
  '标签页生成': read('tags/index.html').includes('taxonomy'),
  '分类页生成': read('categories/index.html').includes('<html'),
  '搜索索引生成': fs.existsSync(path.join(root, 'search.json')),
  '搜索索引可解析': (() => {
    try {
      return Array.isArray(JSON.parse(read('search.json')));
    } catch (e) {
      return false;
    }
  })(),
  '关键 CSS 内联': index.includes('--sidebar-w'),
  '主样式表异步加载': !/<link rel="stylesheet"/.test(index.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '')) &&
    index.includes("rel='stylesheet'"),
  '无 jQuery / require.js': !/jquery|require\.js/i.test(index),
  '页脚署名（写死）': index.includes('AkiSenn') && index.includes('MOxFIVE'),
  '文章页代码块增强': post.includes('codeblock'),
  /* 高亮器是 Prism（见 check.yml 站点配置）：语言标签必须取 language-xxx，
     不能被 Prism 的 line-numbers 类名顶掉（曾出现 data-lang="line-numbers language-js"）；
     行号容器 .line-numbers-rows 也必须存在，否则行号是空的不可见 span。 */
  '代码块语言标签（Prism）': /data-lang="(js|javascript)"/.test(post) && !/data-lang="line-numbers/.test(post),
  'Prism 行号容器': post.includes('line-numbers-rows'),
  '文章页表格包裹': post.includes('table-wrap'),
  '正文首图 eager（LCP 优化）': /fetchpriority="high"/.test(post) && /loading="eager"/.test(post),
  '正文次图 lazy': /loading="lazy"/.test(post),
  '文章页目录生成': post.includes('toc-link'),
  '公式按文章 opt-in': post.includes('MathJax') && !index.includes('MathJax'),
  '评论默认关闭': !index.includes('id="comments"') && !post.includes('id="comments"'),
  /* 站点图标：CI 站点配了 ['/img/favicon.svg', '/img/favicon.png']，
     两行 link 都要在，且 type/sizes 按扩展名自动补（浏览器据此直接挑合适的，
     不必先把文件下回来再猜格式）。 */
  /* 站点图标：CI 站点配了 ['/img/favicon.svg', '/img/favicon.png']，
     两行 link 都要在，且 type/sizes 按扩展名自动补；两个文件都能在 source 里
     定位到，所以必须带上内容指纹 ?v=<8 位哈希>。 */
  '站点图标 SVG 声明': /<link rel="icon" type="image\/svg\+xml" sizes="any" href="\/img\/favicon\.svg\?v=[0-9a-f]{8}">/.test(index),
  '站点图标 PNG 兜底声明': /<link rel="icon" type="image\/png" href="\/img\/favicon\.png\?v=[0-9a-f]{8}">/.test(index),
  /* 图片内容指纹：头像 / 图标这类图片也要带 ?v=<8 位哈希>，
     否则长缓存（Cloudflare _headers 里 /img/* 是一年 immutable）会让换图永远不生效。 */
  '图片内容指纹（头像）': /\/img\/avatar\.png\?v=[0-9a-f]{8}/.test(index),
  '图片内容指纹（图标）': /\/img\/favicon\.png\?v=[0-9a-f]{8}/.test(index),
  /* 首页必须有且只有一个 h1（站点名，视觉隐藏）—— 缺了的话大纲会从 h2 起步 */
  '首页 h1（视觉隐藏）': (index.match(/<h1[\s>]/g) || []).length === 1 && /<h1 class="visually-hidden">/.test(index),
  /* 中英文之间自动补空格：CI 文章里写了「用Hexo写博客」，产物应是「用 Hexo 写博客」 */
  '中英文间隙（盘古之白）': index.includes('用 Hexo 写博客') && !index.includes('用Hexo写博客'),
  /* 摘要按段落抽：excerpt-test 那篇开头是 h2，标题与代码块都不该混进首页摘要 */
  '摘要按段落抽取': index.includes('这是第一段正文') &&
    !index.includes('这是小标题不该进摘要') && !index.includes('shouldNotAppear')
};

let bad = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log((ok ? '✓ ' : '✗ ') + name);
  if (!ok) bad++;
}
if (bad) {
  console.error(`\n${bad} 项签名检查未通过`);
  process.exit(1);
}
console.log('\n全部签名检查通过');
