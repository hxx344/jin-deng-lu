// 3D 场景的地貌：历练之路、按墟层和关卡换的地貌、按地块生成的低多边形网格。
// 只产出顶点数据，不碰 WebGL；同一个种子和坐标总生成同样的东西。
const M = require('./stage3d-mesh.js');

const hex = M.hex;
// 相邻两关在路上隔多远，地块边长，地块里地面分几格。
const STEP = 7;
const TILE = 8;
const CELLS = 12;
// 路宽和每关落脚处空出来的空地半径。
const PATH_HALF = 0.8;
const CLEAR_R = 2.6;

// 地貌：地面三色、路、空地、雾、天光、地光、月光、雾浓度、光柱强度、点缀光，以及长什么东西。
// props 是 [名字, 权重]，density 是每个地块尝试放多少件。
function biome(o) {
  return {
    ground: o.ground.map(hex), dirt: hex(o.dirt), clear: hex(o.clear), fog: hex(o.fog),
    sky: hex(o.sky), low: hex(o.low), moon: hex(o.moon), fogDensity: o.fogDensity || 0.07,
    rays: o.rays === undefined ? 0.8 : o.rays, accent: hex(o.accent), props: o.props, density: o.density || 14,
    grass: o.grass || 0, grassCol: hex(o.grassCol || 0x58805a), flowers: (o.flowers || []).map(hex),
    particle: o.particle || 'firefly', rough: o.rough === undefined ? 1 : o.rough, ponds: o.ponds || 0,
    water: hex(o.water || 0x1d3b52), stone: hex(o.stone || 0x4c5866), moss: hex(o.moss || 0x3d5a44),
    wood: hex(o.wood || 0x3b2a22), leaf: (o.leaf || [0x1c3a3c, 0x234848, 0x1a3138]).map(hex), name: o.name
  };
}

const BIOMES = {
  pine: biome({ name: '夜松林', ground: [0x24403e, 0x2c4a40, 0x3b5f48], dirt: 0x5b4c3e, clear: 0x6e5c48, fog: 0x0c151c,
    sky: 0x2b4058, low: 0x0d1214, moon: 0x384f7a, accent: 0x8c5cff,
    props: [['pine', 1], ['rock', 0.14], ['crystal', 0.025]], grass: 0.9, flowers: [0xd8503a, 0xf08a3c], particle: 'firefly', rays: 0.9 }),
  bamboo: biome({ name: '竹海', ground: [0x2f4a32, 0x3d5c38, 0x4c6c40], dirt: 0x5e5440, clear: 0x726650, fog: 0x1a2b28,
    sky: 0x3c5a50, low: 0x121a16, moon: 0x4a6a60, accent: 0x6fe0b0, fogDensity: 0.09,
    props: [['bamboo', 1], ['rock', 0.12]], grass: 1, grassCol: 0x6a9a5a, flowers: [0xe8e0c0], particle: 'firefly', rays: 1.2,
    leaf: [0x4a7a3a, 0x5a8a40, 0x3a6a32] }),
  maple: biome({ name: '枫谷', ground: [0x4a3a2a, 0x5a452e, 0x6a5232], dirt: 0x6a5440, clear: 0x7a6248, fog: 0x1c1418,
    sky: 0x5a4050, low: 0x181010, moon: 0x6a5070, accent: 0xff8a3c,
    props: [['maple', 1], ['pine', 0.2], ['rock', 0.15]], grass: 0.5, grassCol: 0x8a7a40, flowers: [0xe05a2a, 0xf0a030], particle: 'leaf',
    leaf: [0xc8502a, 0xe07a30, 0xa83a2a] }),
  marsh: biome({ name: '灵沼', ground: [0x1e3a38, 0x24463f, 0x2c5046], dirt: 0x4a4a3a, clear: 0x5a5a48, fog: 0x0a1a1c,
    sky: 0x2a4a52, low: 0x0a1414, moon: 0x305a6a, accent: 0x4fe0d0, rough: 0.35, ponds: 2,
    props: [['mushroom', 0.6], ['deadTree', 0.3], ['pine', 0.35], ['rock', 0.1]], grass: 0.8, grassCol: 0x4a7a5a, particle: 'spore',
    water: 0x1a4a58 }),
  bone: biome({ name: '骨岭', ground: [0x4a4844, 0x57544e, 0x63605a], dirt: 0x6e6658, clear: 0x7a7264, fog: 0x14141a,
    sky: 0x3c4250, low: 0x121214, moon: 0x505a70, accent: 0xd8c8a0, rough: 1.4,
    props: [['rib', 0.3], ['deadTree', 0.45], ['rock', 0.35], ['bones', 0.3]], grass: 0.25, grassCol: 0x7a7458, particle: 'ash',
    stone: 0x5a5a5e, moss: 0x6a6656 }),
  pillar: biome({ name: '石林', ground: [0x3c4048, 0x464a52, 0x50545a], dirt: 0x60605a, clear: 0x6e6c66, fog: 0x10121a,
    sky: 0x3a4460, low: 0x101218, moon: 0x4a5a80, accent: 0x9ab0d8, rough: 1.2,
    props: [['pillar', 0.7], ['rock', 0.45], ['deadTree', 0.15]], grass: 0.3, grassCol: 0x5a6a5a, particle: 'mote',
    stone: 0x5c6470, moss: 0x4a5a50 }),
  snow: biome({ name: '雪岭', ground: [0xb8c2cc, 0xc8d0d8, 0xd8e0e8], dirt: 0x8a8a8a, clear: 0x9a9a98, fog: 0x1a2230,
    sky: 0x5a6a88, low: 0x2a3040, moon: 0x7080a8, accent: 0xa8c8ff,
    props: [['snowPine', 1], ['rock', 0.2]], particle: 'snow', rays: 0.6, stone: 0x6a7480, moss: 0xd8e0e8 }),
  wreck: biome({ name: '沉舟滩', ground: [0x3c5258, 0x46606a, 0x506a70], dirt: 0x6a6a5a, clear: 0x76766a, fog: 0x0e1a20,
    sky: 0x34505c, low: 0x0e1418, moon: 0x406070, accent: 0x7fd8d8, rough: 0.6,
    props: [['wreck', 0.22], ['saltCrystal', 0.3], ['bones', 0.3], ['rock', 0.25]], grass: 0.15, grassCol: 0x5a7a70, particle: 'mote',
    wood: 0x4a3a30, stone: 0x50606a, moss: 0x5a6a60 }),
  saltflat: biome({ name: '盐晶原', ground: [0x98a29e, 0xa8b0ac, 0xb8c0bc], dirt: 0x8a8a80, clear: 0x969688, fog: 0x18222a,
    sky: 0x4a5a68, low: 0x1a2024, moon: 0x5a7080, accent: 0xc0f0ff, rough: 0.4,
    props: [['saltCrystal', 0.8], ['bones', 0.25], ['rock', 0.1]], particle: 'mote', rays: 0.6, stone: 0x8a9496 }),
  tide: biome({ name: '潮痕', ground: [0x2c4450, 0x34505a, 0x3c5a64], dirt: 0x5a5a50, clear: 0x666658, fog: 0x0a1820,
    sky: 0x2a4a5a, low: 0x0a1218, moon: 0x305a70, accent: 0x5fc8e8, rough: 0.5, ponds: 2,
    props: [['rock', 0.5], ['wreck', 0.12], ['deadTree', 0.25], ['bones', 0.15]], grass: 0.2, grassCol: 0x4a6a6a, particle: 'spore',
    water: 0x1a3a50 }),
  // 秘境
  paper: biome({ name: '纸人巷', ground: [0x5a5650, 0x67625a, 0x726c62], dirt: 0x7a7468, clear: 0x868074, fog: 0x161416,
    sky: 0x4a4650, low: 0x141214, moon: 0x5a5868, accent: 0xfff0d0,
    density: 30, props: [['lanternPole', 0.5], ['deadTree', 0.3], ['stele', 0.3], ['mound', 0.15]], grass: 0.2, grassCol: 0x6a6a58, particle: 'ash', rays: 0.4 }),
  salt: biome({ name: '盐骨滩', ground: [0x98a29e, 0xa8b0ac, 0xb8c0bc], dirt: 0x8a8a80, clear: 0x969688, fog: 0x18222a,
    sky: 0x4a5a68, low: 0x1a2024, moon: 0x5a7080, accent: 0xc0f0ff, rough: 0.4,
    density: 30, props: [['rib', 0.35], ['saltCrystal', 0.5], ['bones', 0.4]], particle: 'mote', rays: 0.6, stone: 0x8a9496 }),
  ink: biome({ name: '无字城', ground: [0x1c1c22, 0x24242a, 0x2c2c34], dirt: 0x3a3a40, clear: 0x46464c, fog: 0x08080c,
    sky: 0x2a2a3a, low: 0x0a0a0e, moon: 0x3a3a5a, accent: 0x8890b0,
    density: 30, props: [['stele', 0.8], ['rock', 0.2], ['deadTree', 0.15]], particle: 'ash', rays: 0.5, stone: 0x30303a }),
  kiln: biome({ name: '涅火窑', ground: [0x4a2a22, 0x5a3226, 0x6a3a2a], dirt: 0x6a4a3a, clear: 0x7a5440, fog: 0x1a0c0a,
    sky: 0x5a3028, low: 0x1a0a08, moon: 0x6a3a30, accent: 0xff6a2a, rough: 1.1,
    density: 30, props: [['kiln', 0.5], ['pillar', 0.3], ['rock', 0.3], ['crystal', 0.08]], particle: 'ember', rays: 0.3, stone: 0x5a3a32 }),
  tomb: biome({ name: '天道坟', ground: [0x2a2434, 0x342c40, 0x3c3448], dirt: 0x4a4250, clear: 0x56505c, fog: 0x0c0a12,
    sky: 0x3a3050, low: 0x0e0a14, moon: 0x4a3a6a, accent: 0xa070ff,
    density: 30, props: [['mound', 0.55], ['stele', 0.3], ['deadTree', 0.25]], grass: 0.3, grassCol: 0x4a4a5a, particle: 'wisp', rays: 0.5,
    stone: 0x484258 })
};

// 三个墟层各自的地貌，每 10 关换一种。
const LAYER_BIOMES = [['pine', 'bamboo', 'maple', 'marsh'], ['bone', 'pillar', 'snow'], ['wreck', 'saltflat', 'tide']];
const GATE_BIOMES = { paper: 'paper', salt: 'salt', ink: 'ink', kiln: 'kiln', tomb: 'tomb' };
const BIOME_SPAN = 10;

function biomeFor(layer, stage) {
  const list = LAYER_BIOMES[layer] || LAYER_BIOMES[0];
  return list[Math.floor((Math.max(1, stage) - 1) / BIOME_SPAN) % list.length];
}

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// 每一关的镜头：绕路的偏角、俯角、远近。首领关压低一点、离远一点。
function cameraFor(seed, i) {
  const r1 = M.hash2(i, 17, seed);
  const r2 = M.hash2(i, 29, seed);
  const r3 = M.hash2(i, 41, seed);
  if (i > 0 && i % 5 === 0) return { az: (r1 < 0.5 ? -1 : 1) * 0.95, pitch: 0.42, dist: 1.15 };
  return { az: (r1 < 0.5 ? -1 : 1) * (0.25 + r2 * 0.55), pitch: 0.5 + r3 * 0.24, dist: 0.95 + r2 * 0.2 };
}
// 对手站在角色右手边（画面上），离角色 FOE_GAP × 镜头远近。
const FOE_GAP = 4.7;
// 带小数的关数上插值镜头参数。
function cameraAt(seed, s) {
  const i = Math.floor(s);
  const a = cameraFor(seed, i);
  const b = cameraFor(seed, i + 1);
  const t = ease(s - i);
  return { az: M.lerp(a.az, b.az, t), pitch: M.lerp(a.pitch, b.pitch, t), dist: M.lerp(a.dist, b.dist, t) };
}

// ---------- 历练之路 ----------
// 第 i 关落脚在 pts[i]；路大体朝 -z 走，左右摆动，所以 z 随 i 单调减小。
function Path(seed) {
  this.seed = seed;
  this.pts = [[0, 0]];
}
Path.prototype.heading = function (i) {
  const s = this.seed;
  return 0.75 * Math.sin(i * 0.37 + s) + 0.35 * Math.sin(i * 0.91 + 1.3 + s * 2);
};
Path.prototype.point = function (i) {
  i = Math.max(0, Math.floor(i));
  while (this.pts.length <= i) {
    const n = this.pts.length;
    const p = this.pts[n - 1];
    const h = this.heading(n);
    this.pts.push([p[0] + Math.sin(h) * STEP, p[1] - Math.cos(h) * STEP]);
  }
  return this.pts[i];
};
// 第 i 关到第 i+1 关之间，t 从 0 到 1 的 Catmull-Rom 曲线。
Path.prototype.sample = function (i, t) {
  i = Math.max(0, Math.floor(i));
  const p0 = this.point(Math.max(0, i - 1));
  const p1 = this.point(i);
  const p2 = this.point(i + 1);
  const p3 = this.point(i + 2);
  const q = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [q(p0[0], p1[0], p2[0], p3[0]), q(p0[1], p1[1], p2[1], p3[1])];
};
// s 是带小数的关数。
Path.prototype.at = function (s) {
  const i = Math.floor(s);
  return this.sample(i, s - i);
};
Path.prototype.tangent = function (s) {
  const a = this.at(Math.max(0, s - 0.02));
  const b = this.at(s + 0.02);
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
};
// 离 (x, z) 最近的那段路：返回到路的距离、最近落脚处的序号和距离，以及沿路的关数（带小数）。
Path.prototype.near = function (x, z) {
  // 往前补到 z 之外，再二分出 z 附近的几关。
  while (this.point(this.pts.length - 1)[1] > z - STEP * 3) this.point(this.pts.length);
  let lo = 0;
  let hi = this.pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (this.pts[mid][1] > z) lo = mid + 1;
    else hi = mid;
  }
  const from = Math.max(0, lo - 3);
  const to = lo + 2;
  let best = 1e9;
  let bestS = 0;
  let way = -1;
  let wayD = 1e9;
  for (let i = from; i <= to; i++) {
    const w = this.point(i);
    const dw = Math.hypot(w[0] - x, w[1] - z);
    if (dw < wayD) { wayD = dw; way = i; }
    let prev = this.sample(i, 0);
    for (let k = 1; k <= 6; k++) {
      const cur = this.sample(i, k / 6);
      const ex = cur[0] - prev[0];
      const ez = cur[1] - prev[1];
      const l2 = ex * ex + ez * ez || 1;
      const u = Math.max(0, Math.min(1, ((x - prev[0]) * ex + (z - prev[1]) * ez) / l2));
      const d = Math.hypot(prev[0] + ex * u - x, prev[1] + ez * u - z);
      if (d < best) { best = d; bestS = i + (k - 1 + u) / 6; }
      prev = cur;
    }
  }
  return { d: best, s: bestS, way: way, wayD: wayD };
};

// ---------- 地貌里的东西 ----------
function pine(m, R, x, y, z, s, b, snow) {
  const hue = b.leaf[Math.floor(R() * b.leaf.length)];
  m.frustum(x, y - 0.1, z, 0.12 * s, y + 0.9 * s, 0.08 * s, 5, b.wood, { rand: R });
  const layers = 3 + Math.floor(R() * 2);
  m.swayBase = y + 0.6 * s;
  m.swayK = 0.35 / s;
  for (let l = 0; l < layers; l++) {
    const t = l / layers;
    const yb = y + (0.55 + t * 2.2) * s;
    const r = (1.15 - t * 0.7) * s;
    const h = (1.5 - t * 0.35) * s;
    m.frustum(x, yb, z, r, yb + h, 0, 7, M.shade(hue, 0.8 + t * 0.35), { rand: R, jitter: 0.25, vary: 0.18, rot: R() * 6, capBottom: true });
    if (snow) m.frustum(x, yb + h * 0.55, z, r * 0.47, yb + h + 0.02, 0, 7, hex(0xe6eef4), { rand: R, jitter: 0.2, vary: 0.08, rot: R() * 6 });
  }
  m.swayK = 0;
  return 1.1 * s;
}
function bamboo(m, R, x, y, z, s, b) {
  const n = 4 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const bx = x + (R() - 0.5) * 1.2 * s;
    const bz = z + (R() - 0.5) * 1.2 * s;
    const h = (3 + R() * 1.8) * s;
    const lean = (R() - 0.5) * 0.3;
    const col = b.leaf[Math.floor(R() * b.leaf.length)];
    m.swayBase = y;
    m.swayK = 0.18 / s;
    const segs = 5;
    for (let k = 0; k < segs; k++) {
      const y0 = y + h * k / segs;
      const y1 = y + h * (k + 1) / segs - 0.04;
      const ox0 = lean * (y0 - y);
      const ox1 = lean * (y1 - y);
      m.frustum(bx + ox0, y0, bz, 0.07 * s, y1, 0.065 * s, 5, M.shade(col, 0.9 + k * 0.05), { rand: R });
      m.frustum(bx + ox1, y1 - 0.02, bz, 0.085 * s, y1 + 0.04, 0.085 * s, 5, M.shade(col, 1.2), { rand: R });
    }
    for (let k = 0; k < 4; k++) {
      const ly = y + h * (0.65 + R() * 0.35);
      const a = R() * 6.28;
      const lx = bx + lean * (ly - y);
      const len = 0.55 * s;
      m.tri([lx, ly, bz], [lx + Math.cos(a) * len, ly - 0.15, bz + Math.sin(a) * len], [lx + Math.cos(a + 0.35) * len * 0.8, ly - 0.05, bz + Math.sin(a + 0.35) * len * 0.8], M.shade(col, 1.15), 0, [lx, ly - 1, bz]);
    }
    m.swayK = 0;
  }
  return 0.7 * s;
}
function maple(m, R, x, y, z, s, b) {
  m.frustum(x, y - 0.1, z, 0.13 * s, y + 1.3 * s, 0.08 * s, 5, b.wood, { rand: R, jitter: 0.2 });
  m.swayBase = y + 1 * s;
  m.swayK = 0.3 / s;
  const n = 3 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28;
    const r = i ? 0.45 * s : 0;
    const col = b.leaf[Math.floor(R() * b.leaf.length)];
    m.blob(x + Math.cos(a) * r, y + (1.7 + R() * 0.6) * s, z + Math.sin(a) * r, 0.75 * s, 0.6 * s, 0.75 * s, col, { rand: R, jitter: 0.35, vary: 0.2 });
  }
  m.swayK = 0;
  return 1.0 * s;
}
function deadTree(m, R, x, y, z, s, b) {
  const col = M.mix(b.wood, b.stone, 0.4);
  m.frustum(x, y - 0.1, z, 0.12 * s, y + 1.6 * s, 0.05 * s, 5, col, { rand: R, jitter: 0.2 });
  for (let i = 0; i < 3; i++) {
    const a = R() * 6.28;
    const by = y + (0.8 + R() * 0.6) * s;
    const len = (0.5 + R() * 0.4) * s;
    m.box(x + Math.cos(a) * len * 0.45, by + len * 0.3, z - Math.sin(a) * len * 0.45, len, 0.06 * s, 0.06 * s, col, { ry: a, rz: 0.6 });
  }
  return 0.4 * s;
}
function rock(m, R, x, y, z, s, b) {
  m.blob(x, y + 0.1 * s, z, 0.5 * s, 0.32 * s, 0.42 * s, b.stone, { rand: R, jitter: 0.4, vary: 0.25 });
  m.blob(x, y + 0.27 * s, z, 0.42 * s, 0.12 * s, 0.36 * s, b.moss, { rand: R, jitter: 0.3, vary: 0.2, keep: (c) => c[1] > 0.5 });
  return 0.55 * s;
}
function crystal(m, R, x, y, z, s, b, col) {
  col = col || b.accent;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const rr = i ? 0.26 * s : 0;
    const h = (i ? 0.5 + R() * 0.3 : 1.1) * s;
    const w = (i ? 0.11 : 0.18) * s;
    const cx = x + Math.cos(a) * rr;
    const cz = z + Math.sin(a) * rr;
    m.frustum(cx, y - 0.05, cz, w, y + h * 0.75, w * 1.1, 5, M.shade(col, 0.8), { rand: R, emit: 0.55, rot: a });
    m.frustum(cx, y + h * 0.75, cz, w * 1.1, y + h, 0, 5, col, { rand: R, emit: 0.8, rot: a });
  }
  return 0.5 * s;
}
function mushroom(m, R, x, y, z, s, b) {
  const n = 2 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const mx = x + (R() - 0.5) * 0.8 * s;
    const mz = z + (R() - 0.5) * 0.8 * s;
    const h = (0.25 + R() * 0.45) * s;
    m.frustum(mx, y - 0.02, mz, 0.05 * s, y + h, 0.04 * s, 5, hex(0xd8d0c0), { rand: R });
    m.blob(mx, y + h, mz, 0.2 * s, 0.1 * s, 0.2 * s, b.accent, { rand: R, emit: 0.6, keep: (c) => c[1] > -0.2 });
  }
  return 0.4 * s;
}
function pillar(m, R, x, y, z, s, b) {
  const h = (2.2 + R() * 2.2) * s;
  const n = 4;
  let r = (0.55 + R() * 0.25) * s;
  for (let k = 0; k < n; k++) {
    const y0 = y - 0.2 + h * k / n;
    const r1 = r * (0.75 + R() * 0.2);
    m.frustum(x + (R() - 0.5) * 0.1, y0, z + (R() - 0.5) * 0.1, r, y0 + h / n + 0.05, r1, 6, M.shade(b.stone, 0.85 + R() * 0.3), { rand: R, jitter: 0.2, vary: 0.15, capTop: k === n - 1 });
    r = r1;
  }
  return 0.7 * s;
}
function rib(m, R, x, y, z, s, b) {
  const a0 = R() * Math.PI;
  const rad = (2 + R() * 1.2) * s;
  const col = hex(0xd8d0bc);
  const segs = 8;
  for (let k = 0; k < segs; k++) {
    const t0 = k / segs * Math.PI;
    const t1 = (k + 1) / segs * Math.PI;
    const p = (t) => [Math.cos(t) * rad, Math.sin(t) * rad * 1.2];
    const q0 = p(t0);
    const q1 = p(t1);
    const mx = (q0[0] + q1[0]) / 2;
    const my = (q0[1] + q1[1]) / 2;
    const len = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) + 0.05;
    const ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
    const th = 0.22 * s * (1 - Math.abs(k - segs / 2) / segs);
    m.box(x + mx * Math.cos(a0), y - 0.3 + my, z - mx * Math.sin(a0), len, th + 0.08 * s, th + 0.08 * s, M.shade(col, 0.9 + R() * 0.15), { ry: a0, rz: ang });
  }
  return 0.6 * s;
}
function bones(m, R, x, y, z, s) {
  const col = hex(0xd8d0bc);
  for (let i = 0; i < 4; i++) {
    m.box(x + (R() - 0.5) * 0.8 * s, y + 0.04, z + (R() - 0.5) * 0.8 * s, 0.45 * s, 0.07 * s, 0.07 * s, M.shade(col, 0.85 + R() * 0.2), { ry: R() * 6.28 });
  }
  m.blob(x, y + 0.1 * s, z, 0.14 * s, 0.12 * s, 0.16 * s, col, { rand: R, jitter: 0.2 });
  return 0;
}
function stele(m, R, x, y, z, s, b) {
  const h = (1 + R() * 0.8) * s;
  m.box(x, y + h / 2 - 0.1, z, 0.55 * s, h, 0.18 * s, M.shade(b.stone, 0.9 + R() * 0.2), { ry: R() * 6.28, rz: (R() - 0.5) * 0.25 });
  m.box(x, y + 0.02, z, 0.8 * s, 0.14, 0.4 * s, M.shade(b.stone, 0.7), { ry: R() * 6.28 });
  return 0.4 * s;
}
function lanternPole(m, R, x, y, z, s, b) {
  m.frustum(x, y - 0.1, z, 0.05 * s, y + 1.8 * s, 0.04 * s, 5, b.wood, { rand: R });
  m.box(x + 0.25 * s, y + 1.75 * s, z, 0.55 * s, 0.05 * s, 0.05 * s, b.wood);
  m.swayBase = y + 1.7 * s;
  m.swayK = 0.6;
  m.blob(x + 0.45 * s, y + 1.45 * s, z, 0.14 * s, 0.2 * s, 0.14 * s, hex(0xf4ecd8), { rand: R, emit: 0.9 });
  m.swayK = 0;
  return 0.3 * s;
}
function mound(m, R, x, y, z, s, b) {
  m.blob(x, y - 0.1, z, 0.9 * s, 0.5 * s, 0.75 * s, M.mix(b.ground[1], b.stone, 0.3), { rand: R, jitter: 0.3, vary: 0.2, keep: (c) => c[1] > -0.3 });
  m.box(x, y + 0.45 * s, z + 0.7 * s, 0.4 * s, 0.7 * s, 0.12 * s, M.shade(b.stone, 1.1), { rz: (R() - 0.5) * 0.2 });
  return 0.9 * s;
}
function kiln(m, R, x, y, z, s, b) {
  m.blob(x, y - 0.1, z, 1.0 * s, 0.9 * s, 1.0 * s, M.shade(b.stone, 1.1), { rand: R, jitter: 0.15, vary: 0.15, keep: (c) => c[1] > -0.2 });
  const a = R() * 6.28;
  m.box(x + Math.sin(a) * 0.92 * s, y + 0.25 * s, z + Math.cos(a) * 0.92 * s, 0.45 * s, 0.4 * s, 0.2 * s, hex(0xff8a3a), { ry: a, emit: 1.4 });
  m.frustum(x, y + 0.7 * s, z, 0.18 * s, y + 1.3 * s, 0.14 * s, 6, M.shade(b.stone, 0.8), { rand: R });
  return 1.0 * s;
}
function wreck(m, R, x, y, z, s, b) {
  const a0 = R() * 6.28;
  const c = Math.cos(a0), sn = Math.sin(a0);
  const P = (u, v) => [x + u * c + v * sn, z - u * sn + v * c];
  for (let k = 0; k < 7; k++) {
    const u = (k - 3) * 0.4 * s;
    for (const side of [-1, 1]) {
      const p = P(u, side * 0.7 * s);
      m.box(p[0], y + 0.35 * s, p[1], 0.12 * s, 0.9 * s, 0.1 * s, M.shade(b.wood, 0.8 + R() * 0.4), { ry: a0, rx: side * 0.5, rz: (R() - 0.5) * 0.3 });
    }
  }
  const keel = P(0, 0);
  m.box(keel[0], y + 0.02, keel[1], 2.8 * s, 0.12 * s, 0.25 * s, b.wood, { ry: a0 });
  const mast = P(0.3 * s, 0);
  m.box(mast[0], y + 1.1 * s, mast[1], 0.1 * s, 2.4 * s, 0.1 * s, b.wood, { ry: a0, rz: 0.35 });
  return 1.1 * s;
}
function saltCrystal(m, R, x, y, z, s, b) {
  return crystal(m, R, x, y, z, s * 0.8, b, hex(0xdff4f4));
}

const PROPS = {
  pine: (m, R, x, y, z, s, b) => pine(m, R, x, y, z, s * (0.9 + R() * 0.8), b, false),
  snowPine: (m, R, x, y, z, s, b) => pine(m, R, x, y, z, s * (0.9 + R() * 0.8), b, true),
  bamboo, maple, deadTree, rock, crystal, mushroom, pillar, rib, bones, stele, lanternPole, mound, kiln, wreck, saltCrystal
};

// 会挡住镜头的高个子。
const TALL = { pine: 1, snowPine: 1, bamboo: 1, maple: 1, deadTree: 1, pillar: 1, rib: 1, lanternPole: 1, wreck: 1, kiln: 1, stele: 1 };

function pick(R, list) {
  let total = 0;
  for (let i = 0; i < list.length; i++) total += list[i][1];
  let r = R() * total;
  for (let i = 0; i < list.length; i++) {
    r -= list[i][1];
    if (r <= 0) return list[i][0];
  }
  return list[list.length - 1][0];
}

// ---------- 世界 ----------
// biomeAt(stage) 给出某一关的地貌名；关隘秘境用固定地貌。
function World(opts) {
  this.seed = opts.seed || 1;
  this.path = new Path(opts.pathSeed === undefined ? 0.6 : opts.pathSeed);
  this.biomeAt = opts.biomeAt;
  this.camSeed = opts.camSeed || 1;
  this.dirs = {};
}
// 镜头在角色哪个方向（水平单位向量）。
World.prototype.camDir = function (s) {
  if (!this.dirs[s]) {
    const t = this.path.tangent(s);
    const az = Math.atan2(t[0], t[1]) + Math.PI + cameraAt(this.camSeed, s).az;
    this.dirs[s] = [Math.sin(az), Math.cos(az)];
  }
  return this.dirs[s];
};
// 第 i 关对手站的地方：镜头右方。
World.prototype.foeSpot = function (i) {
  const p = this.path.point(i);
  const d = this.camDir(i);
  const gap = FOE_GAP * cameraFor(this.camSeed, i).dist;
  return [p[0] + d[1] * gap, p[1] - d[0] * gap];
};
// 对手站的地方不放东西；r 是东西自身的大小。
World.prototype.nearFoe = function (x, z, way, r) {
  for (let i = Math.max(0, way - 1); i <= way + 1; i++) {
    const f = this.foeSpot(i);
    if (Math.hypot(x - f[0], z - f[1]) < 1.3 + r) return true;
  }
  return false;
};
// 高的东西不能挡在角色和镜头之间：落脚处和走到一半时，往镜头方向留一条渐宽的通道。
World.prototype.blocked = function (x, z, way) {
  for (let i = Math.max(0, way - 1); i <= way + 1; i++) {
    for (let h = -0.5; h <= 0.5; h += 0.5) {
      const s = i + h;
      if (s < 0) continue;
      const p = this.path.at(s);
      const d = this.camDir(s);
      const vx = x - p[0];
      const vz = z - p[1];
      const along = vx * d[0] + vz * d[1];
      if (along < 0.5 || along > 10) continue;
      if (Math.abs(vx * d[1] - vz * d[0]) < 1.1 + along * 0.14) return true;
    }
  }
  return false;
};
World.prototype.biome = function (stage) {
  return BIOMES[this.biomeAt(Math.max(0, Math.round(stage)))] || BIOMES.pine;
};
// 地面高度：路和落脚处压平，远处起伏。
World.prototype.height = function (x, z, info) {
  const n = info || this.path.near(x, z);
  const b = this.biome(n.way);
  const flat = Math.min(M.smooth(PATH_HALF + 0.2, PATH_HALF + 2.2, n.d), M.smooth(CLEAR_R - 0.4, CLEAR_R + 2, n.wayD));
  return (M.noise(x * 0.3, z * 0.3, this.seed) - 0.5) * 0.9 * b.rough * flat + M.smooth(1, 6, n.d) * 0.25 * b.rough;
};
// 一个地块的网格，坐标相对地块原点（tx * TILE, tz * TILE）。
World.prototype.tile = function (tx, tz) {
  const ox = tx * TILE;
  const oz = tz * TILE;
  const R = M.rng(M.hash2(tx, tz, this.seed) * 4294967296);
  const m = new M.Mesh();
  const step = TILE / CELLS;
  // 先放东西，地面再按东西的位置压暗一圈当作阴影。
  const occ = [];
  const center = this.path.near(ox + TILE / 2, oz + TILE / 2);
  const tb = this.biome(center.way);
  const tries = tb.density;
  for (let i = 0; i < tries; i++) {
    const x = ox + R() * TILE;
    const z = oz + R() * TILE;
    const n = this.path.near(x, z);
    const b = this.biome(n.way);
    const name = pick(R, b.props);
    const big = name === 'rib' || name === 'wreck' || name === 'kiln' || name === 'pillar';
    if (n.d < PATH_HALF + (big ? 2.6 : 1.1) || n.wayD < CLEAR_R + (big ? 2.5 : 0.8)) continue;
    if (occ.some((o) => Math.hypot(o[0] - x, o[1] - z) < (big ? 2.2 : 1.3))) continue;
    if (TALL[name] && this.blocked(x, z, n.way)) continue;
    if (this.nearFoe(x, z, n.way, big ? 1.4 : 0.5)) continue;
    const y = this.height(x, z, n);
    const r = PROPS[name](m, R, x - ox, y, z - oz, 1 + M.smooth(3, 12, n.d) * 0.3, b);
    occ.push([x, z, r]);
  }
  // 草、花和水洼
  for (let i = 0; i < 26; i++) {
    const x = ox + R() * TILE;
    const z = oz + R() * TILE;
    const n = this.path.near(x, z);
    const b = this.biome(n.way);
    if (R() > b.grass || n.d < PATH_HALF * 0.8 || n.wayD < 1.4) continue;
    const y = this.height(x, z, n) - 0.02;
    const col = M.shade(M.mix(b.grassCol, b.ground[2], R() * 0.5), 0.85 + R() * 0.3);
    m.swayBase = y;
    m.swayK = 1.2;
    for (let k = 0; k < 3; k++) {
      const a = R() * 6.28;
      const h = 0.18 + R() * 0.25;
      const bx = x - ox + (R() - 0.5) * 0.25;
      const bz = z - oz + (R() - 0.5) * 0.25;
      m.tri([bx - Math.cos(a) * 0.05, y, bz - Math.sin(a) * 0.05], [bx + Math.cos(a) * 0.05, y, bz + Math.sin(a) * 0.05], [bx + (R() - 0.5) * 0.12, y + h, bz + (R() - 0.5) * 0.12], col, 0, [bx, y + h * 0.5, bz - 1]);
    }
    m.swayK = 0;
    if (b.flowers.length && R() < 0.35) {
      for (let k = 0; k < 4; k++) {
        const fx = x - ox + (R() - 0.5) * 0.7;
        const fz = z - oz + (R() - 0.5) * 0.7;
        m.blob(fx, y + 0.12 + R() * 0.1, fz, 0.07, 0.04, 0.07, b.flowers[Math.floor(R() * b.flowers.length)], { rand: R, emit: 0.25 });
      }
    }
  }
  const ponds = [];
  if (tb.ponds) {
    for (let i = 0; i < tb.ponds; i++) {
      const x = ox + 1.5 + R() * (TILE - 3);
      const z = oz + 1.5 + R() * (TILE - 3);
      const n = this.path.near(x, z);
      if (n.d < PATH_HALF + 1.8 || n.wayD < CLEAR_R + 1) continue;
      ponds.push([x, z, 0.9 + R() * 0.8]);
    }
  }
  // 地面：全局格点上的顶点，相邻地块严丝合缝。
  const verts = [];
  for (let a = 0; a <= CELLS; a++) {
    const row = [];
    for (let k = 0; k <= CELLS; k++) {
      const gi = tx * CELLS + k;
      const gk = tz * CELLS + a;
      const x = gi * step + (M.hash2(gi, gk, 7) - 0.5) * step * 0.5;
      const z = gk * step + (M.hash2(gk, gi, 9) - 0.5) * step * 0.5;
      let y = this.height(x, z);
      for (let p = 0; p < ponds.length; p++) {
        const pd = Math.hypot(ponds[p][0] - x, ponds[p][1] - z);
        y -= 0.35 * (1 - M.smooth(ponds[p][2] * 0.6, ponds[p][2] + 0.4, pd));
      }
      row.push([x - ox, y, z - oz]);
    }
    verts.push(row);
  }
  const below = [0, -50, 0];
  const groundCol = (p) => {
    const x = p[0] + ox;
    const z = p[2] + oz;
    const n = this.path.near(x, z);
    const b = this.biome(n.way);
    const g = M.noise(x * 0.25, z * 0.25, this.seed + 3);
    const g2 = M.noise(x * 0.9, z * 0.9, this.seed + 5);
    let col = M.mix(M.mix(b.ground[0], b.ground[1], g), b.ground[2], M.smooth(0.55, 0.85, g2) * 0.6);
    col = M.mix(col, b.dirt, (1 - M.smooth(PATH_HALF * 0.7, PATH_HALF * 1.4, n.d + (g2 - 0.5) * 0.5)) * 0.85);
    col = M.mix(col, b.clear, (1 - M.smooth(1.2, CLEAR_R, n.wayD + (g2 - 0.5) * 0.6)) * 0.8);
    let dark = 0;
    for (let i = 0; i < occ.length; i++) {
      const o = occ[i];
      if (!o[2]) continue;
      const d = Math.hypot(o[0] + o[2] * 0.3 - x, o[1] + o[2] * 0.2 - z);
      dark = Math.max(dark, 1 - M.smooth(o[2] * 0.4, o[2] * 1.5, d));
    }
    return M.shade(col, (0.92 + R() * 0.16) * (1 - dark * 0.45));
  };
  for (let a = 0; a < CELLS; a++) {
    for (let k = 0; k < CELLS; k++) {
      const p00 = verts[a][k];
      const p01 = verts[a][k + 1];
      const p10 = verts[a + 1][k];
      const p11 = verts[a + 1][k + 1];
      const c3 = (u, v, w) => [(u[0] + v[0] + w[0]) / 3, 0, (u[2] + v[2] + w[2]) / 3];
      if ((tx * CELLS + k + tz * CELLS + a) % 2) {
        m.tri(p00, p01, p10, groundCol(c3(p00, p01, p10)), 0, below);
        m.tri(p01, p11, p10, groundCol(c3(p01, p11, p10)), 0, below);
      } else {
        m.tri(p00, p01, p11, groundCol(c3(p00, p01, p11)), 0, below);
        m.tri(p00, p11, p10, groundCol(c3(p00, p11, p10)), 0, below);
      }
    }
  }
  for (let p = 0; p < ponds.length; p++) {
    const pd = ponds[p];
    const b = this.biome(this.path.near(pd[0], pd[1]).way);
    const segs = 9;
    const cx = pd[0] - ox;
    const cz = pd[1] - oz;
    const y = this.height(pd[0], pd[1]) - 0.12;
    for (let k = 0; k < segs; k++) {
      const a0 = k / segs * 6.283;
      const a1 = (k + 1) / segs * 6.283;
      const r0 = pd[2] * (0.9 + M.hash2(k, p, 3) * 0.2);
      const r1 = pd[2] * (0.9 + M.hash2((k + 1) % segs, p, 3) * 0.2);
      m.tri([cx, y, cz], [cx + Math.cos(a0) * r0, y, cz + Math.sin(a0) * r0], [cx + Math.cos(a1) * r1, y, cz + Math.sin(a1) * r1], M.shade(b.water, 0.95 + R() * 0.1), 0.2, [cx, y - 1, cz]);
    }
  }
  // 落脚处：每 5 关的首领关立一座石门，其余放一个石堆当路标。
  for (let i = Math.max(1, center.way - 2); i <= center.way + 2; i++) {
    const w = this.path.point(i);
    if (w[0] < ox || w[0] >= ox + TILE || w[1] < oz || w[1] >= oz + TILE) continue;
    const b = this.biome(i);
    const t = this.path.tangent(i);
    const side = [-t[1], t[0]];
    const WR = M.rng(i * 7919 + this.seed);
    if (i % 5 === 0) {
      for (const sgn of [-1, 1]) {
        const px = w[0] + side[0] * sgn * 1.6 + t[0] * 1.8 - ox;
        const pz = w[1] + side[1] * sgn * 1.6 + t[1] * 1.8 - oz;
        m.frustum(px, -0.1, pz, 0.2, 2.3, 0.16, 6, M.shade(b.stone, 1.1), { rand: WR, vary: 0.1, capTop: true });
        m.box(px, 1.7, pz, 0.08, 0.7, 0.3, hex(0xa8382c), { ry: Math.atan2(t[0], t[1]), emit: 0.15 });
      }
      const gx = w[0] + t[0] * 1.8 - ox;
      const gz = w[1] + t[1] * 1.8 - oz;
      m.box(gx, 2.35, gz, 4.0, 0.18, 0.3, M.shade(b.stone, 0.9), { ry: Math.atan2(t[0], t[1]) + Math.PI / 2 });
    } else {
      const px = w[0] + side[0] * 1.5 - ox;
      const pz = w[1] + side[1] * 1.5 - oz;
      m.blob(px, 0.12, pz, 0.32, 0.18, 0.3, b.stone, { rand: WR, jitter: 0.3, vary: 0.2 });
      m.blob(px, 0.36, pz, 0.22, 0.12, 0.2, M.shade(b.stone, 1.1), { rand: WR, jitter: 0.3 });
      m.blob(px, 0.52, pz, 0.12, 0.08, 0.12, M.shade(b.stone, 1.2), { rand: WR, jitter: 0.3 });
    }
  }
  return m.data();
};

module.exports = { ease, cameraFor, cameraAt, FOE_GAP, STEP, TILE, CELLS, BIOMES, LAYER_BIOMES, GATE_BIOMES, BIOME_SPAN, biomeFor, Path, World, PROPS };
