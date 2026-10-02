<p align="right"><strong>English</strong> · <a href="./caching.md">简体中文</a></p>

# Caching

## Asset fingerprinting

The theme appends a content fingerprint to CSS and JavaScript URLs, for example css/theme.css?v=HASH. When a file changes, its URL changes too, so browsers and CDNs fetch the new version. Unchanged files can use long-lived caching.

Fingerprints are also added to the theme avatar, icons, backgrounds, social sharing image and article images that resolve to local files. External URLs, data URLs, unresolved paths and images in post asset folders are left unchanged.

- After changing an image, run hexo clean before rebuilding so incremental generation does not reuse old HTML.
- Set assets.fingerprint: false to disable all fingerprints.
- assets.cdn applies only to theme CSS and JavaScript. Images remain served by the site.

## Stylesheet loading

Critical first-screen CSS is inlined in the HTML. The full stylesheet loads asynchronously. Set assets.critical_css: false to disable critical CSS inlining.

## Cloudflare cache headers

Add rules like these to source/_headers in your site:

~~~text
/*.html
  Cache-Control: public, max-age=0, must-revalidate

/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=31536000, immutable

/background/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/search.json
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
~~~

Avoid a catch-all Cache-Control rule. Cloudflare may combine values from matching rules and produce an invalid response header.

You can also set performance.generate_headers: true to generate source/_headers. The theme does not overwrite an existing file.

## Optional Brotli precompression

Set performance.precompress: true to generate .br files for CSS and JavaScript. Enable it only if your host serves those files directly, for example with Nginx brotli_static or a custom Worker.

Cloudflare Workers static assets and GitHub Pages do not automatically use sibling .br files. Enabling precompression alone does not reduce transfer size on those platforms.

## Check the build output

~~~bash
node tools/check.mjs /path/to/hexo-site/public
~~~

This command checks for missing local assets, render-blocking stylesheets and leftover legacy dependencies.
