const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
// 微信主包上限 2 MB（2097152 字节），超了体验版和正式版都发不出去。发布时代码会压缩，但还要
// 打进约 170 KB 的云 SDK，两者大致抵消，所以直接量源文件，并留出约 190 KB 余量。
const BUDGET = 1900000;

function packedFiles() {
  const ignore = require('../project.config.json').packOptions.ignore.map((item) => item.value);
  const files = [];
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((entry) => {
      const rel = dir ? dir + '/' + entry.name : entry.name;
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'miniprogram_npm') return;
      if (ignore.indexOf(rel) >= 0) return;
      if (entry.isDirectory()) walk(rel);
      else files.push({ rel: rel, size: fs.statSync(path.join(ROOT, rel)).size });
    });
  })('');
  return files;
}

test('进小程序包的文件总量留在主包上限以内', () => {
  const files = packedFiles();
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const biggest = files.sort((a, b) => b.size - a.size).slice(0, 5)
    .map((file) => file.rel + ' ' + Math.round(file.size / 1024) + ' KB').join('、');
  assert.ok(files.some((file) => file.rel === 'app.json'));
  assert.ok(!files.some((file) => file.rel.startsWith('tests/')));
  assert.ok(total <= BUDGET, '包内文件共 ' + total + ' 字节，超出预算 ' + BUDGET + '。最大的几个：' + biggest);
});
