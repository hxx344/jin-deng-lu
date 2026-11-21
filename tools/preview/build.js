// 把小程序页面打包成一个可在普通浏览器里打开的预览页（tools/preview/index.html）。
// 只用于开发时快速看界面，渲染结果与真机可能有细微差别。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const inline = (s) => s.replace(/<\/script/gi, '<\\/script');

function expand(p, pattern) {
  return read(p).replace(pattern, (_, file) => expand(path.join(path.dirname(p), file), pattern));
}

const cssImport = /@import\s+["']([^"']+)["'];/g;
const wxmlInclude = /<include\s+src=["']([^"']+)["']\s*\/>/g;
const css = (read('app.wxss') + '\n' + expand('pages/index/index.wxss', cssImport))
  .replace(/(-?\d*\.?\d+)rpx/g, 'calc($1 * var(--rpx))')
  .replace(/(^|\})\s*page\s*\{/g, '$1\nbody {');

// 收入规则和本页的场景模块。
const modules = ['utils', 'pages/index'].flatMap((dir) =>
  fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.js')).map((f) => dir + '/' + f))
  .map((p) => '__modules[' + JSON.stringify(path.basename(p, '.js')) + '] = function (module, exports, require) {\n' + read(p) + '\n};')
  .join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>烬灯录 预览</title>
<base href="../../">
<style>
:root { --rpx: calc(min(100vw, 430px) / 750); }
html, body { margin: 0; height: 100%; }
html { background: #000; }
body { max-width: 430px; margin: 0 auto; overflow: hidden; }
view, scroll-view { display: block; }
text { display: inline; }
img { display: inline-block; object-fit: contain; }
scroll-view { overflow-y: auto; scrollbar-width: none; }
scroll-view::-webkit-scrollbar { display: none; }
view, text, img { -webkit-tap-highlight-color: transparent; user-select: none; }
${css}
</style>
</head>
<body>
<div id="app"></div>
<script type="text/wxml" id="wxml">${inline(expand('pages/index/index.wxml', wxmlInclude))}</script>
<script>
${inline(read('tools/preview/runtime.js'))}
${inline(modules)}
__boot('index');
</script>
</body>
</html>
`;

const out = path.join(__dirname, 'index.html');
fs.writeFileSync(out, html);
console.log('已生成 ' + out);
