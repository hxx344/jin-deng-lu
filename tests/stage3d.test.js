const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const M = require('../utils/stage3d-mesh.js');
const W = require('../utils/stage3d-world.js');
const H = require('../utils/stage3d-hero.js');
const S = require('../utils/stage3d.js');

const allFinite = (data) => {
  for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i])) return false;
  return true;
};

test('历练之路：每关隔一段，一路往前不折回，同一个种子走出同一条路', () => {
  const a = new W.Path(0.6);
  const b = new W.Path(0.6);
  for (let i = 1; i <= 300; i++) {
    const p = a.point(i);
    const q = a.point(i - 1);
    assert.ok(p[1] < q[1], '第 ' + i + ' 关应该在上一关前面');
    assert.ok(Math.abs(Math.hypot(p[0] - q[0], p[1] - q[1]) - W.STEP) < 1e-9);
    assert.deepStrictEqual(b.point(i), p);
  }
  // 曲线经过每一关的落脚处
  assert.deepStrictEqual(a.at(7).map((v) => +v.toFixed(9)), a.point(7).map((v) => +v.toFixed(9)));
  const n = a.near(a.point(40)[0], a.point(40)[1]);
  assert.strictEqual(n.way, 40);
  assert.ok(n.d < 1e-6);
});

test('地貌：每个墟层每 10 关换一种，循环使用；秘境各有一套', () => {
  assert.strictEqual(W.biomeFor(0, 1), 'pine');
  assert.strictEqual(W.biomeFor(0, 10), 'pine');
  assert.strictEqual(W.biomeFor(0, 11), 'bamboo');
  assert.strictEqual(W.biomeFor(0, 41), 'pine');
  assert.strictEqual(W.biomeFor(1, 21), 'snow');
  assert.strictEqual(W.biomeFor(2, 1), 'wreck');
  for (const list of W.LAYER_BIOMES) list.forEach((name) => assert.ok(W.BIOMES[name], name));
  for (const gate of ['paper', 'salt', 'ink', 'kiln', 'tomb']) assert.ok(W.BIOMES[W.GATE_BIOMES[gate]], gate);
  for (const name in W.BIOMES) {
    W.BIOMES[name].props.forEach((p) => assert.ok(W.PROPS[p[0]], name + ' 用到的 ' + p[0] + ' 没有生成函数'));
  }
});

test('地块：同一处总生成同样的网格，数据完整；三个墟层和五个秘境都能生成', () => {
  const make = (layer) => new W.World({ seed: 100 + layer * 77, pathSeed: 0.6 + layer, camSeed: 1 + layer, biomeAt: (s) => W.biomeFor(layer, s) });
  for (const layer of [0, 1, 2]) {
    const a = make(layer).tile(0, -3);
    const b = make(layer).tile(0, -3);
    assert.ok(a.length > 0 && a.length % M.STRIDE === 0);
    assert.ok(allFinite(a));
    assert.deepStrictEqual(Array.from(a), Array.from(b));
  }
  for (const gate of ['paper', 'salt', 'ink', 'kiln', 'tomb']) {
    const d = new W.World({ seed: 900, pathSeed: 2.1, camSeed: 5, biomeAt: () => gate }).tile(-1, -1);
    assert.ok(d.length > 0 && allFinite(d), gate);
  }
});

test('地块：远处的地块按需生成，坐标再大也不出错', () => {
  const w = new W.World({ seed: 3, pathSeed: 0.6, biomeAt: (s) => W.biomeFor(0, s) });
  const p = w.path.point(2000);
  const d = w.tile(Math.floor(p[0] / W.TILE), Math.floor(p[1] / W.TILE));
  assert.ok(d.length > 0 && allFinite(d));
});

test('镜头：高的东西不长在角色和镜头之间', () => {
  const w = new W.World({ seed: 100, pathSeed: 0.6, camSeed: 1, biomeAt: (s) => W.biomeFor(0, s) });
  for (const i of [3, 5, 12, 40]) {
    const p = w.path.point(i);
    const d = w.camDir(i);
    assert.strictEqual(w.blocked(p[0] + d[0] * 5, p[1] + d[1] * 5, i), true);
    // 通道之外还要留出足够的地方长树。
    let free = 0;
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2;
      if (!w.blocked(p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 5, i)) free += 1;
    }
    assert.ok(free >= 8, '第 ' + i + ' 关周围只剩 ' + free + ' 个方向能长树');
  }
});

test('镜头：每关的角度固定，首领关压低，俯角在合理范围内', () => {
  for (let i = 1; i < 60; i++) {
    const c = S.cameraFor(1, i);
    assert.deepStrictEqual(c, S.cameraFor(1, i));
    assert.ok(c.pitch >= 0.4 && c.pitch <= 0.75);
    if (i % 5 === 0) assert.ok(c.pitch < S.cameraFor(1, i - 1).pitch);
  }
  const mid = S.cameraAt(1, 3.5);
  const a = S.cameraFor(1, 3);
  const b = S.cameraFor(1, 4);
  assert.ok(Math.abs(mid.pitch - (a.pitch + b.pitch) / 2) < 1e-9);
});

test('走路：先站起、匀速走、最后坐下；跳几关走得久一些但有上限', () => {
  const walk = { from: 3, to: 4, at: 1000, ms: S.WALK_MS };
  assert.deepStrictEqual(S.walkProgress(walk, 1000), { p: 0, move: 0, stand: 0 });
  const end = S.walkProgress(walk, 1000 + S.WALK_MS);
  assert.strictEqual(end.move, 1);
  assert.strictEqual(end.stand, 0);
  const mid = S.walkProgress(walk, 1000 + S.WALK_MS / 2);
  assert.ok(Math.abs(mid.move - 0.5) < 1e-9);
  assert.strictEqual(mid.stand, 1);
  assert.strictEqual(S.walkProgress(null, 0), null);
  assert.strictEqual(S.walkMs(3, 4), S.WALK_MS);
  assert.ok(S.walkMs(9, 5) > S.WALK_MS);
  assert.ok(S.walkMs(1, 100) <= 4200);
});

test('角色：页面上每个动作都有姿势，整个动作过程里关节都是有效数', () => {
  const src = fs.readFileSync(path.join(__dirname, '../pages/index/index.js'), 'utf8');
  const block = src.slice(src.indexOf('const ACTIONS = {'), src.indexOf('};', src.indexOf('const ACTIONS = {')));
  const names = (block.match(/^\s+([a-z]+): \{/gm) || []).map((s) => s.trim().split(':')[0]);
  assert.ok(names.length >= 30);
  for (const name of names.concat(['idle', 'ponder', 'brace', 'walk'])) {
    assert.ok(H.ACTION_NAMES.indexOf(name) >= 0, name + ' 没有 3D 姿势');
    for (let k = 0; k <= 1; k += 0.125) {
      const rig = H.rig(H.blendWalk(H.pose(name, k, k * 3), H.pose('walk', 0, k * 6), k));
      for (const part in rig) assert.ok(allFinite(rig[part]), name + ' ' + part + ' @' + k);
    }
  }
});

test('角色：衣着随境界换色，门派色取渐变里的第一个颜色', () => {
  assert.deepStrictEqual(M.hex('linear-gradient(135deg, #8fc7ff, #3d6fd6)'), M.hex(0x8fc7ff));
  const a = H.buildParts({ realm: 0, sash: '#8a6a4a' });
  const b = H.buildParts({ realm: 4, sash: '#8a6a4a', old: true, demon: true });
  assert.notDeepStrictEqual(Array.from(a.torso), Array.from(b.torso));
  for (const k in b) assert.ok(b[k].length > 0 && allFinite(b[k]), k);
  assert.ok(allFinite(H.buildLamp()));
});
