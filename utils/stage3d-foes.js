// 历练和秘境的对手：照 assets/foes/ 里的图做成低多边形模型。
// 坐标以脚底为原点、面朝 +z，普通身形高约 1.4（角色站着约 1.5），小动物矮一些。
const M = require('./stage3d-mesh.js');

const hex = M.hex;
const WHITE = hex(0xf6f2ea);
const INK = hex(0x1e1a1c);
const SKIN = hex(0xf4d2b0);
const PALE = hex(0xe8e4dc);
const BLUSH = hex(0xf09080);
const EMBER = hex(0xff8a3a);

// 一对眼睛：眼白、眼珠、高光；brow 给出眉毛的倾角（正数是怒眉）。
function eyes(m, R, x, y, z, o) {
  o = o || {};
  const sep = o.sep || 0.09;
  const r = o.r || 0.05;
  for (const sx of [-1, 1]) {
    const ex = x + sx * sep;
    if (o.white !== false) m.blob(ex, y, z, r, r * 1.1, r * 0.5, o.whiteCol || WHITE, { rand: R, emit: o.glow ? 0.6 : 0.15 });
    m.blob(ex + sx * r * 0.1, y - r * 0.1, z + r * 0.35, r * 0.55, r * 0.62, r * 0.3, o.pupil || INK, { rand: R, emit: o.glow || 0 });
    if (o.brow !== undefined) m.box(ex, y + r * 1.5, z + r * 0.2, r * 2, r * 0.45, r * 0.4, o.browCol || INK, { rz: -sx * o.brow });
  }
}

// 闭着眼笑或哭：两道弯。
function shut(m, x, y, z, sep, col, tilt) {
  for (const sx of [-1, 1]) m.box(x + sx * sep, y, z, 0.07, 0.018, 0.02, col || INK, { rz: sx * (tilt || 0.3) });
}

function limb(m, x0, y0, z0, x1, y1, z1, w, col) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz);
  const ry = Math.atan2(dx, dz);
  const rx = Math.atan2(Math.hypot(dx, dz), dy);
  // box 先绕 x 再绕 z 再绕 y：这里只用 x、y 两个角把竖着的长条掰到 (dx, dy, dz) 方向。
  m.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, w, len, w, col, { rx: rx, ry: ry });
}

const FOES = {
  dog(m, R) {
    const fur = hex(0xa8794e);
    const dark = hex(0x6e4a2e);
    m.blob(0, 0.5, -0.05, 0.24, 0.22, 0.4, fur, { rand: R, detail: 1 });
    for (const z of [-0.2, 0.02, 0.22]) m.box(0, 0.68, z, 0.3, 0.05, 0.06, dark, { rx: 0.1 });
    for (const sx of [-1, 1]) for (const z of [-0.28, 0.18]) {
      m.box(sx * 0.13, 0.22, z, 0.1, 0.4, 0.11, fur);
      m.box(sx * 0.13, 0.03, z + 0.02, 0.12, 0.06, 0.15, hex(0x5a3a26));
    }
    m.blob(0, 0.78, 0.36, 0.2, 0.19, 0.19, fur, { rand: R, detail: 1 });
    m.blob(0, 0.72, 0.53, 0.11, 0.08, 0.1, hex(0xe8d2b4), { rand: R });
    m.blob(0, 0.76, 0.63, 0.04, 0.03, 0.03, INK, { rand: R });
    for (const sx of [-1, 1]) m.frustum(sx * 0.13, 0.9, 0.3, 0.07, 1.08, 0, 4, dark, { rand: R });
    eyes(m, R, 0, 0.84, 0.52, { sep: 0.075, r: 0.04, brow: 0.45 });
    m.box(0, 0.62, 0.55, 0.05, 0.07, 0.02, hex(0xe8b84a), { emit: 0.5 });
    limb(m, 0, 0.6, -0.4, 0, 0.95, -0.55, 0.06, fur);
    return 'hop';
  },
  scarecrow(m, R) {
    const coat = hex(0x8a5a3a);
    const straw = hex(0xe0b860);
    m.box(0, 0.25, 0, 0.06, 0.5, 0.06, hex(0x5a3e2a));
    m.frustum(0, 0.42, 0, 0.3, 1.05, 0.2, 7, coat, { rand: R, vary: 0.1, capBottom: true, capTop: true });
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      m.frustum(Math.cos(a) * 0.26, 0.5, Math.sin(a) * 0.26, 0.04, 0.3, 0, 3, straw, { rand: R });
    }
    m.box(0, 0.95, 0, 1.0, 0.07, 0.07, hex(0x5a3e2a));
    for (const sx of [-1, 1]) {
      m.box(sx * 0.32, 0.95, 0, 0.3, 0.16, 0.16, M.shade(coat, 0.9));
      m.frustum(sx * 0.52, 0.95, 0, 0.06, 0.82, 0, 3, straw, { rand: R });
    }
    m.box(0.1, 0.7, 0.22, 0.12, 0.12, 0.02, hex(0xc8a050), { rz: 0.2 });
    m.blob(0, 1.25, 0, 0.21, 0.22, 0.2, hex(0xc8a26a), { rand: R, detail: 1 });
    for (const sx of [-1, 1]) {
      m.box(sx * 0.08, 1.28, 0.19, 0.08, 0.02, 0.02, INK, { rz: 0.8 });
      m.box(sx * 0.08, 1.28, 0.19, 0.08, 0.02, 0.02, INK, { rz: -0.8 });
    }
    m.box(0, 1.17, 0.19, 0.12, 0.015, 0.02, INK);
    m.frustum(0, 1.38, 0, 0.5, 1.4, 0.48, 10, straw, { rand: R, capTop: true, capBottom: true });
    m.frustum(0, 1.4, 0, 0.2, 1.62, 0, 8, straw, { rand: R });
    m.frustum(0, 1.4, 0, 0.21, 1.46, 0.205, 8, hex(0xa83a2c), { rand: R });
    return 'sway';
  },
  debt(m, R) {
    const paper = hex(0xf0dcaa);
    m.box(0, 0.85, 0, 0.62, 0.95, 0.08, paper, { rz: 0.06 });
    m.box(0, 1.33, 0, 0.66, 0.08, 0.1, hex(0xc84a3a), { rz: 0.06 });
    // 「欠」字的几笔
    m.box(-0.08, 0.8, 0.045, 0.06, 0.32, 0.01, INK, { rz: 0.4 });
    m.box(0.02, 0.86, 0.045, 0.28, 0.05, 0.01, INK, { rz: 0.1 });
    m.box(0.08, 0.66, 0.045, 0.06, 0.3, 0.01, INK, { rz: -0.5 });
    m.box(-0.06, 0.64, 0.045, 0.05, 0.22, 0.01, INK, { rz: 0.7 });
    m.box(0.2, 0.5, 0.045, 0.1, 0.1, 0.01, hex(0xc8382c), { emit: 0.2 });
    eyes(m, R, 0, 1.12, 0.05, { sep: 0.13, r: 0.06, brow: 0.5 });
    m.box(0, 1.0, 0.045, 0.14, 0.03, 0.01, INK, { rz: -0.1 });
    for (const sx of [-1, 1]) {
      limb(m, sx * 0.3, 0.95, 0, sx * 0.5, 0.75, 0.1, 0.035, INK);
      limb(m, sx * 0.12, 0.38, 0, sx * 0.18, 0.04, 0.02, 0.035, INK);
    }
    return 'float';
  },
  waiter(m, R) {
    const robe = hex(0xa83a34);
    m.frustum(0, 0, 0, 0.36, 0.78, 0.26, 9, robe, { rand: R, capBottom: true, capTop: true });
    m.box(0, 0.4, 0.2, 0.36, 0.6, 0.12, hex(0xf3ede2), { rx: 0.18 });
    m.blob(0, 0.5, 0.29, 0.06, 0.05, 0.02, hex(0xd06a6a), { rand: R });
    m.blob(0, 1.0, 0.02, 0.26, 0.25, 0.24, SKIN, { rand: R, detail: 1 });
    shut(m, 0, 1.06, 0.24, 0.1, INK, -0.35);
    m.box(0, 0.93, 0.235, 0.18, 0.06, 0.03, WHITE, { emit: 0.15 });
    m.box(0, 0.9, 0.235, 0.2, 0.015, 0.035, INK);
    for (const sx of [-1, 1]) m.blob(sx * 0.17, 0.96, 0.18, 0.05, 0.03, 0.02, BLUSH, { rand: R });
    m.frustum(0, 1.18, 0, 0.21, 1.32, 0.23, 8, WHITE, { rand: R });
    m.frustum(0, 1.19, 0, 0.215, 1.24, 0.218, 8, hex(0xc84a3a), { rand: R });
    m.blob(0, 1.38, 0, 0.25, 0.12, 0.25, WHITE, { rand: R, detail: 1 });
    // 托盘：右手平端一只罩着盖子的盘子
    m.box(0.36, 0.72, 0.1, 0.12, 0.14, 0.12, robe);
    m.frustum(0.52, 0.8, 0.22, 0.24, 0.82, 0.24, 10, hex(0xd8dde2), { rand: R, capTop: true, capBottom: true });
    m.blob(0.52, 0.82, 0.22, 0.19, 0.16, 0.19, hex(0xc8ccd2), { rand: R, detail: 1, keep: (c) => c[1] > 0, emit: 0.1 });
    m.blob(0.52, 1.0, 0.22, 0.03, 0.03, 0.03, hex(0xe8b84a), { rand: R });
    m.box(-0.33, 0.55, 0.05, 0.12, 0.3, 0.12, robe, { rz: -0.2 });
    return 'stomp';
  },
  scavenger(m, R) {
    const cloak = hex(0x3a4250);
    m.blob(0.05, 0.7, -0.3, 0.32, 0.38, 0.26, hex(0x7a6448), { rand: R, detail: 1 });
    m.box(0.05, 0.75, -0.53, 0.16, 0.16, 0.02, hex(0xc89a5a), { rz: 0.3 });
    m.frustum(0, 0, 0, 0.36, 1.05, 0.16, 8, cloak, { rand: R, vary: 0.12, capBottom: true, jitter: 0.15 });
    m.blob(0, 1.12, 0, 0.24, 0.25, 0.24, cloak, { rand: R, detail: 1 });
    m.blob(0, 1.1, 0.09, 0.17, 0.18, 0.15, hex(0x1a1c22), { rand: R });
    m.blob(0.06, 1.13, 0.22, 0.045, 0.045, 0.03, EMBER, { rand: R, emit: 1.4 });
    m.blob(-0.07, 1.12, 0.22, 0.02, 0.02, 0.02, hex(0x8a8a8a), { rand: R, emit: 0.3 });
    m.box(-0.36, 0.75, 0.15, 0.05, 1.5, 0.05, hex(0x6a4a2e));
    limb(m, -0.36, 1.5, 0.15, -0.24, 1.62, 0.15, 0.05, hex(0x6a4a2e));
    limb(m, -0.24, 1.62, 0.15, -0.2, 1.5, 0.15, 0.05, hex(0x6a4a2e));
    m.box(-0.24, 0.75, 0.15, 0.2, 0.12, 0.12, cloak);
    return 'sway';
  },
  inkblot(m, R) {
    const ink = hex(0x2e3550);
    m.blob(0, 0.55, 0, 0.42, 0.34, 0.36, ink, { rand: R, detail: 1, jitter: 0.25, vary: 0.15 });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3;
      m.blob(Math.cos(a) * 0.36, 0.75 + (i % 2) * 0.1, Math.sin(a) * 0.3, 0.14, 0.12, 0.13, M.shade(ink, 1.1), { rand: R, jitter: 0.3 });
      limb(m, Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.25, Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.5, 0.04, M.shade(ink, 0.8));
    }
    eyes(m, R, 0, 0.62, 0.32, { sep: 0.13, r: 0.085 });
    m.box(0, 0.42, 0.34, 0.14, 0.025, 0.02, WHITE, { rz: 0.15 });
    m.blob(0.5, 1.1, 0.1, 0.05, 0.07, 0.05, ink, { rand: R });
    m.blob(-0.45, 1.0, 0.2, 0.04, 0.05, 0.04, ink, { rand: R });
    return 'hop';
  },
  inkbrush(m, R) {
    const shaft = hex(0x6a5a7a);
    m.frustum(0, 0.16, 0, 0.17, 0.95, 0.16, 8, shaft, { rand: R, capBottom: true });
    for (const y of [0.3, 0.88]) m.frustum(0, y, 0, 0.18, y + 0.05, 0.18, 8, hex(0x3a2e44), { rand: R });
    m.frustum(0, 0.95, 0, 0.2, 1.18, 0.12, 8, WHITE, { rand: R, vary: 0.08 });
    // 笔尖蘸着朱砂，像一簇火苗往上弯
    m.swayBase = 1.1;
    m.swayK = 0.6;
    m.frustum(0.02, 1.15, 0, 0.13, 1.75, 0, 7, hex(0xd8d0c8), { rand: R, vary: 0.1 });
    m.frustum(0.06, 1.45, 0.02, 0.07, 1.85, 0, 6, hex(0xc8322a), { rand: R, emit: 0.4 });
    m.swayK = 0;
    eyes(m, R, 0, 0.72, 0.16, { sep: 0.07, r: 0.045, brow: 0.6 });
    m.box(0, 0.58, 0.165, 0.1, 0.03, 0.02, WHITE);
    for (const sx of [-1, 1]) {
      limb(m, sx * 0.16, 0.6, 0, sx * 0.34, 0.75, 0.08, 0.03, INK);
      limb(m, sx * 0.07, 0.17, 0, sx * 0.11, 0.0, 0.03, 0.04, INK);
    }
    return 'sway';
  },
  inkstele(m, R) {
    const stone = hex(0x8a8a96);
    for (const sx of [-1, 1]) m.box(sx * 0.17, 0.14, 0, 0.2, 0.28, 0.24, M.shade(stone, 0.8));
    m.box(0, 0.68, 0, 0.66, 0.82, 0.36, stone, { vary: 0.1, rand: R });
    m.box(0, 0.68, 0.17, 0.44, 0.56, 0.04, hex(0xb0b0b8));
    for (let i = 0; i < 4; i++) m.box(-0.12 + i * 0.08, 0.68, 0.195, 0.025, 0.4, 0.01, hex(0x4a4a56), { rz: (R() - 0.5) * 0.6 });
    m.box(0, 1.22, 0, 0.5, 0.3, 0.34, M.shade(stone, 1.05));
    for (const sx of [-1, 1]) m.frustum(sx * 0.2, 1.36, 0, 0.07, 1.6, 0, 4, M.shade(stone, 0.85), { rand: R });
    eyes(m, R, 0, 1.24, 0.17, { sep: 0.1, r: 0.05, brow: 0.5, browCol: hex(0x3a3a44) });
    m.box(0, 1.12, 0.17, 0.16, 0.03, 0.02, hex(0x2a2a30));
    m.frustum(-0.45, 0.85, 0.05, 0.13, 0.85, 0.13, 8, M.shade(stone, 0.9), { rand: R });
    m.box(-0.42, 0.85, 0.12, 0.2, 0.2, 0.32, M.shade(stone, 0.9));
    m.frustum(-0.42, 0.85, 0.3, 0.1, 0.85, 0.1, 6, hex(0x3a3a44), { rand: R });
    m.box(0.42, 0.75, 0.05, 0.18, 0.4, 0.2, M.shade(stone, 0.9));
    return 'stomp';
  },
  kilncrow(m, R) {
    const feather = hex(0x7a7a82);
    m.blob(0, 0.55, -0.05, 0.26, 0.24, 0.34, feather, { rand: R, detail: 1, vary: 0.08 });
    for (const sx of [-1, 1]) m.blob(sx * 0.24, 0.55, -0.08, 0.06, 0.18, 0.28, M.shade(feather, 0.8), { rand: R });
    m.box(0, 0.5, -0.45, 0.24, 0.05, 0.28, M.shade(feather, 0.7), { rx: -0.4 });
    m.blob(0, 0.86, 0.2, 0.17, 0.16, 0.17, feather, { rand: R, detail: 1 });
    m.frustum(0, 0.82, 0.33, 0.06, 0.82, 0, 4, hex(0xd8a040), { rand: R });
    eyes(m, R, 0, 0.9, 0.33, { sep: 0.07, r: 0.035, brow: 0.5 });
    m.blob(0, 0.82, 0.5, 0.045, 0.045, 0.045, EMBER, { rand: R, emit: 1.6 });
    for (const sx of [-1, 1]) {
      limb(m, sx * 0.08, 0.35, 0, sx * 0.1, 0.0, 0.03, 0.03, hex(0xd8a040));
      limb(m, sx * 0.18, 0.62, 0.15, sx * 0.24, 0.42, 0.05, 0.015, EMBER);
    }
    return 'hop';
  },
  kilnfire(m, R) {
    const brick = hex(0x7a4a32);
    m.frustum(0, 0, 0, 0.42, 0.62, 0.48, 4, brick, { rand: R, rot: Math.PI / 4, capBottom: true, vary: 0.1 });
    m.frustum(0, 0.6, 0, 0.5, 0.68, 0.52, 4, M.shade(brick, 0.7), { rand: R, rot: Math.PI / 4, capTop: true });
    m.box(0, 0.22, 0.31, 0.2, 0.26, 0.04, EMBER, { emit: 1.5 });
    m.box(0, 0.1, 0.31, 0.24, 0.04, 0.05, hex(0x3a2418));
    m.box(0.16, 0.42, 0.31, 0.12, 0.02, 0.01, EMBER, { emit: 1, rz: 0.5 });
    m.swayBase = 0.6;
    m.swayK = 0.5;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      m.frustum(Math.cos(a) * 0.28, 0.66, Math.sin(a) * 0.24, 0.13, 1.25 + R() * 0.3, 0, 5, hex(0xff7a2a), { rand: R, emit: 1.1 });
    }
    m.frustum(0, 0.66, 0, 0.3, 1.55, 0, 7, hex(0xffb040), { rand: R, emit: 1.2 });
    m.swayK = 0;
    m.blob(0, 0.9, 0.12, 0.2, 0.2, 0.16, hex(0xffd070), { rand: R, emit: 1.3 });
    eyes(m, R, 0, 0.96, 0.26, { sep: 0.08, r: 0.045, brow: 0.6, browCol: hex(0x8a2a10), pupil: hex(0x6a1a0a) });
    m.box(0, 0.83, 0.27, 0.14, 0.035, 0.02, hex(0x8a2a10));
    return 'flicker';
  },
  kilnworker(m, R) {
    const cloth = hex(0x3e3430);
    const skin = hex(0xb07850);
    for (const sx of [-1, 1]) m.box(sx * 0.11, 0.25, 0, 0.14, 0.5, 0.16, hex(0x2a2220));
    m.frustum(0, 0.45, 0, 0.27, 1.05, 0.22, 8, cloth, { rand: R, capTop: true, capBottom: true });
    m.box(0, 0.55, 0, 0.56, 0.06, 0.46, hex(0x6a2e22));
    m.box(0.13, 0.8, 0.2, 0.2, 0.36, 0.04, hex(0x8a5236));
    m.box(0.15, 0.78, 0.225, 0.02, 0.24, 0.01, EMBER, { emit: 1.2, rz: 0.4 });
    m.blob(0, 1.24, 0, 0.19, 0.21, 0.19, skin, { rand: R, detail: 1 });
    m.box(0.08, 1.24, 0.17, 0.015, 0.2, 0.02, EMBER, { emit: 1.2, rz: -0.3 });
    m.blob(0, 1.36, -0.02, 0.2, 0.12, 0.2, hex(0x2a2220), { rand: R, keep: (c) => c[1] > -0.1 });
    m.frustum(0, 1.32, 0, 0.2, 1.37, 0.2, 8, hex(0xc8322a), { rand: R });
    eyes(m, R, 0, 1.25, 0.17, { sep: 0.07, r: 0.035, brow: 0.5 });
    m.blob(0.07, 1.25, 0.2, 0.02, 0.02, 0.01, EMBER, { rand: R, emit: 1.5 });
    m.box(-0.33, 0.85, 0.08, 0.13, 0.38, 0.13, cloth, { rz: -0.2 });
    m.box(-0.36, 0.85, 0.15, 0.035, 1.7, 0.035, hex(0x4a4a50), { rx: 0.1 });
    m.blob(-0.36, 1.7, 0.24, 0.05, 0.06, 0.05, EMBER, { rand: R, emit: 1.6 });
    m.box(0.33, 0.85, 0, 0.13, 0.38, 0.13, cloth, { rz: 0.15 });
    return 'stomp';
  },
  paperbearer(m, R) {
    const robe = hex(0x4a6898);
    for (const sx of [-1, 1]) {
      m.box(sx * 0.1, 0.22, 0, 0.13, 0.44, 0.14, hex(0xe8e0cc));
      m.box(sx * 0.1, 0.03, 0.02, 0.14, 0.06, 0.2, INK);
    }
    m.box(0, 0.7, 0, 0.5, 0.56, 0.32, robe);
    m.box(0, 0.45, 0.01, 0.52, 0.06, 0.34, hex(0xc8a868));
    m.box(0.07, 0.76, 0.165, 0.1, 0.1, 0.01, INK, { rz: 0.78 });
    m.blob(0, 1.18, 0, 0.21, 0.22, 0.2, PALE, { rand: R, detail: 1 });
    for (const sx of [-1, 1]) m.blob(sx * 0.12, 1.12, 0.16, 0.04, 0.025, 0.02, BLUSH, { rand: R });
    eyes(m, R, 0, 1.2, 0.18, { sep: 0.07, r: 0.03, white: false, brow: 0.4 });
    m.box(0, 1.08, 0.19, 0.06, 0.015, 0.02, hex(0xa83a34));
    m.frustum(0, 1.3, 0, 0.21, 1.42, 0.17, 8, INK, { rand: R, capTop: true });
    m.blob(0, 1.45, 0, 0.04, 0.04, 0.04, hex(0xc8322a), { rand: R });
    // 扛在肩上的竹竿，后头挑着一座纸扎的小楼
    m.box(0.15, 0.98, -0.05, 0.05, 0.05, 1.3, hex(0x8a6a3a), { ry: 0.35 });
    m.box(0.36, 0.9, -0.62, 0.28, 0.5, 0.24, hex(0xb83228));
    m.box(0.36, 1.2, -0.62, 0.36, 0.06, 0.32, hex(0x5a1a14));
    for (const dy of [-0.1, 0.1]) m.box(0.36, 0.9 + dy, -0.495, 0.18, 0.04, 0.01, hex(0xe8b84a), { emit: 0.3 });
    m.box(0.3, 0.86, 0.12, 0.12, 0.3, 0.12, robe, { rx: 0.8 });
    m.box(-0.3, 0.6, 0, 0.12, 0.32, 0.12, robe, { rz: -0.15 });
    return 'stomp';
  },
  paperboy(m, R) {
    const robe = hex(0x5aa080);
    m.frustum(0, 0.05, 0, 0.3, 0.75, 0.18, 8, robe, { rand: R, capBottom: true, capTop: true });
    m.frustum(0, 0.6, 0, 0.19, 0.78, 0.15, 8, hex(0xf0e8d8), { rand: R });
    for (const sx of [-1, 1]) m.box(sx * 0.08, 0.03, 0.04, 0.1, 0.06, 0.16, INK);
    m.blob(0, 1.0, 0, 0.23, 0.24, 0.22, PALE, { rand: R, detail: 1 });
    m.blob(0, 1.06, -0.03, 0.24, 0.2, 0.22, INK, { rand: R, detail: 1, keep: (c) => c[1] > 0.25 || c[2] < -0.2 });
    for (const sx of [-1, 1]) {
      m.blob(sx * 0.2, 1.22, -0.02, 0.09, 0.09, 0.09, INK, { rand: R });
      m.blob(sx * 0.13, 0.94, 0.19, 0.05, 0.035, 0.02, hex(0xe8686a), { rand: R });
    }
    eyes(m, R, 0, 1.0, 0.2, { sep: 0.075, r: 0.035, white: false });
    m.box(0, 0.9, 0.21, 0.04, 0.02, 0.02, hex(0xc8322a));
    m.box(-0.28, 0.62, 0.12, 0.1, 0.25, 0.1, robe, { rx: 0.9 });
    m.box(-0.3, 0.72, 0.3, 0.16, 0.22, 0.02, hex(0xd8322a), { emit: 0.2 });
    m.box(-0.3, 0.74, 0.312, 0.06, 0.06, 0.01, hex(0xe8b84a), { emit: 0.4 });
    m.box(0.27, 0.5, 0, 0.1, 0.25, 0.1, robe, { rz: 0.2 });
    return 'hop';
  },
  papercollector(m, R) {
    const robe = hex(0x2e2a3a);
    for (const sx of [-1, 1]) m.box(sx * 0.1, 0.03, 0.03, 0.13, 0.06, 0.2, INK);
    m.frustum(0, 0.05, 0, 0.3, 1.0, 0.22, 8, robe, { rand: R, capTop: true, capBottom: true });
    for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.45;
      m.box(Math.sin(a) * 0.27, 0.35 + (i % 2) * 0.3, Math.cos(a) * 0.25, 0.12, 0.15, 0.01, hex(0xf0e0b0), { ry: a, rz: (R() - 0.5) * 0.4 });
    }
    m.blob(0, 1.2, 0, 0.2, 0.21, 0.19, PALE, { rand: R, detail: 1 });
    eyes(m, R, 0, 1.22, 0.17, { sep: 0.07, r: 0.03, white: false, brow: 0.5 });
    for (const sx of [-1, 1]) m.box(sx * 0.05, 1.11, 0.18, 0.09, 0.025, 0.02, INK, { rz: sx * 0.35 });
    m.box(0, 1.03, 0.17, 0.03, 0.08, 0.02, hex(0xa83a34));
    m.blob(0, 1.33, 0, 0.2, 0.1, 0.2, INK, { rand: R, keep: (c) => c[1] > -0.2 });
    m.blob(0, 1.44, 0, 0.035, 0.035, 0.035, hex(0xc8322a), { rand: R });
    // 左手托着算盘
    m.box(-0.38, 0.75, 0.22, 0.32, 0.2, 0.04, hex(0x5a3422));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) m.blob(-0.5 + c * 0.06, 0.69 + r * 0.06, 0.25, 0.022, 0.022, 0.022, hex(0xe8b84a), { rand: R });
    m.box(-0.28, 0.72, 0.1, 0.11, 0.3, 0.11, robe, { rx: 0.8 });
    m.box(0.3, 0.6, 0, 0.11, 0.32, 0.11, robe, { rz: 0.15 });
    return 'stomp';
  },
  saltcrab(m, R) {
    const shell = hex(0xb8584a);
    m.blob(0, 0.35, 0, 0.42, 0.18, 0.32, shell, { rand: R, detail: 1, vary: 0.08 });
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = -0.18 + i * 0.16;
        limb(m, sx * 0.34, 0.32, z, sx * 0.6, 0.3, z - 0.05, 0.05, M.shade(shell, 0.85));
        limb(m, sx * 0.6, 0.3, z - 0.05, sx * 0.72, 0.0, z - 0.08, 0.04, M.shade(shell, 0.85));
      }
      limb(m, sx * 0.3, 0.38, 0.22, sx * 0.48, 0.48, 0.48, 0.07, shell);
      m.blob(sx * 0.5, 0.52, 0.58, 0.14, 0.11, 0.12, shell, { rand: R, detail: 1 });
      m.frustum(sx * 0.48, 0.55, 0.66, 0.06, 0.62, 0, 4, M.shade(shell, 1.15), { rand: R });
      limb(m, sx * 0.08, 0.45, 0.25, sx * 0.1, 0.62, 0.28, 0.03, shell);
    }
    eyes(m, R, 0, 0.65, 0.29, { sep: 0.1, r: 0.045 });
    // 背上的盐晶
    const salt = [hex(0xe4f0f6), hex(0xc8dcea), hex(0xf6fbff)];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const rr = i % 2 ? 0.14 : 0.08;
      m.frustum(Math.cos(a) * rr, 0.45, Math.sin(a) * rr - 0.05, 0.08 + R() * 0.04, 0.85 + R() * 0.3, 0, 4, salt[i % 3], { rand: R, emit: 0.25 });
    }
    return 'hop';
  },
  saltferryman(m, R) {
    const cloak = hex(0x55604e);
    m.box(0.36, 0.8, -0.2, 0.12, 1.6, 0.08, hex(0x6a4a30), { rz: -0.15 });
    m.box(0.48, 1.45, -0.2, 0.22, 0.4, 0.06, hex(0x7a5a3a), { rz: -0.15 });
    m.frustum(0, 0, 0, 0.4, 1.0, 0.18, 9, cloak, { rand: R, vary: 0.15, jitter: 0.2, capBottom: true });
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      m.box(Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.38, 0.1, 0.12, 0.02, M.shade(cloak, 0.8), { ry: -a + Math.PI / 2 });
    }
    m.blob(0, 1.1, 0.02, 0.17, 0.18, 0.16, hex(0xb8c8c0), { rand: R, detail: 1 });
    eyes(m, R, 0, 1.12, 0.15, { sep: 0.06, r: 0.025, white: false, pupil: hex(0x2a3a34) });
    m.frustum(0, 1.04, 0.1, 0.12, 0.82, 0, 6, hex(0xdde4e0), { rand: R, jitter: 0.3 });
    m.frustum(0, 1.24, 0, 0.62, 1.48, 0, 12, hex(0xc8b080), { rand: R, vary: 0.08, capBottom: true });
    m.box(-0.38, 0.8, 0.15, 0.04, 1.6, 0.04, hex(0x6a4a30));
    m.blob(-0.38, 1.62, 0.15, 0.07, 0.1, 0.07, hex(0x8a6a40), { rand: R });
    m.box(-0.26, 0.85, 0.12, 0.16, 0.12, 0.12, cloak);
    return 'sway';
  },
  saltfigure(m, R) {
    const salt = hex(0xc8dcea);
    const hi = hex(0xeef6fb);
    for (const sx of [-1, 1]) m.box(sx * 0.15, 0.22, 0, 0.2, 0.44, 0.22, M.shade(salt, 0.9), { rand: R, vary: 0.1 });
    m.blob(0, 0.78, 0, 0.36, 0.38, 0.26, salt, { rand: R, jitter: 0.2, vary: 0.12, emit: 0.1 });
    m.blob(0, 1.25, 0.02, 0.22, 0.24, 0.2, hi, { rand: R, jitter: 0.25, vary: 0.1, emit: 0.1 });
    for (const sx of [-1, 1]) {
      m.blob(sx * 0.42, 0.75, 0.05, 0.14, 0.3, 0.14, salt, { rand: R, jitter: 0.3, vary: 0.1 });
      m.blob(sx * 0.46, 0.42, 0.1, 0.13, 0.12, 0.13, hi, { rand: R, jitter: 0.3 });
    }
    for (let i = 0; i < 5; i++) m.frustum((R() - 0.5) * 0.5, 0.9 + R() * 0.4, -0.15, 0.05, 1.1 + R() * 0.4, 0, 4, hi, { rand: R, emit: 0.2 });
    eyes(m, R, 0, 1.27, 0.2, { sep: 0.08, r: 0.03, white: false, pupil: hex(0x3a4a5a), brow: -0.3, browCol: hex(0x8aa0b4) });
    m.box(0, 1.14, 0.2, 0.1, 0.02, 0.02, hex(0x4a5a6a), { rz: 0.1 });
    return 'stomp';
  },
  tombbeast(m, R) {
    const stone = hex(0x7e867a);
    const moss = hex(0x5a8a4a);
    m.box(0, 0.12, 0, 0.6, 0.24, 0.7, M.shade(stone, 0.75));
    m.blob(0, 0.55, -0.05, 0.28, 0.32, 0.28, stone, { rand: R, detail: 1, vary: 0.1 });
    for (const sx of [-1, 1]) {
      m.box(sx * 0.17, 0.42, 0.18, 0.13, 0.4, 0.13, M.shade(stone, 0.95));
      m.blob(sx * 0.17, 0.25, 0.27, 0.09, 0.05, 0.09, M.shade(stone, 0.9), { rand: R });
    }
    m.blob(0, 0.98, 0.1, 0.32, 0.3, 0.26, M.shade(stone, 0.9), { rand: R, jitter: 0.3, vary: 0.15 });
    m.blob(0, 0.95, 0.2, 0.22, 0.2, 0.2, stone, { rand: R, detail: 1 });
    m.blob(0, 0.86, 0.38, 0.12, 0.08, 0.06, M.shade(stone, 1.1), { rand: R });
    for (const sx of [-1, 1]) m.frustum(sx * 0.06, 0.82, 0.42, 0.025, 0.74, 0, 3, WHITE, { rand: R });
    eyes(m, R, 0, 1.0, 0.36, { sep: 0.085, r: 0.04, brow: 0.6, browCol: hex(0x4a5248) });
    m.blob(0.15, 1.18, 0.05, 0.1, 0.05, 0.1, moss, { rand: R, jitter: 0.4 });
    m.blob(-0.2, 0.6, 0.18, 0.08, 0.1, 0.06, moss, { rand: R, jitter: 0.4 });
    m.blob(0.25, 0.25, -0.1, 0.1, 0.06, 0.12, moss, { rand: R, jitter: 0.4 });
    m.box(0.12, 0.65, 0.24, 0.01, 0.2, 0.02, hex(0x3a3a34), { rz: 0.4 });
    return 'stomp';
  },
  tombshadow(m, R) {
    const robe = hex(0x3a2e6a);
    m.frustum(0, 0, 0, 0.42, 1.25, 0.12, 9, robe, { rand: R, vary: 0.15, jitter: 0.25, capBottom: true });
    m.blob(0, 1.35, 0, 0.26, 0.32, 0.26, robe, { rand: R, detail: 1 });
    m.blob(0, 1.3, 0.1, 0.18, 0.24, 0.17, hex(0x120e22), { rand: R });
    m.blob(0, 1.32, 0.25, 0.07, 0.1, 0.03, hex(0xffe060), { rand: R, emit: 1.6 });
    m.blob(0, 1.32, 0.275, 0.025, 0.06, 0.01, hex(0x4a2a00), { rand: R });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      m.box(Math.cos(a) * 0.34, 1.4 + Math.sin(a) * 0.36, -0.08, 0.05, 0.05, 0.02, hex(0xe8c860), { rz: a, emit: 1.0 });
    }
    for (const sx of [-1, 1]) {
      limb(m, sx * 0.25, 0.95, 0.05, sx * 0.55, 0.7, 0.2, 0.08, robe);
      for (let i = 0; i < 3; i++) limb(m, sx * 0.55, 0.7, 0.2, sx * (0.66 + i * 0.03), 0.55 + i * 0.08, 0.28, 0.02, hex(0xb8a8f0));
    }
    return 'float';
  },
  tombthunder(m, R) {
    const cloud = hex(0x3a4670);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      m.blob(Math.cos(a) * 0.32, 1.05 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.2, 0.22, 0.18, 0.2, M.shade(cloud, 0.9 + (i % 3) * 0.1), { rand: R, detail: 1 });
    }
    m.blob(0, 1.2, 0, 0.36, 0.26, 0.3, M.shade(cloud, 1.15), { rand: R, detail: 1 });
    m.blob(0, 1.38, -0.05, 0.42, 0.12, 0.26, hex(0xd8dce8), { rand: R, detail: 1, keep: (c) => c[1] > -0.2 });
    shut(m, 0, 1.15, 0.3, 0.1, hex(0xd8e4ff), -0.2);
    for (const sx of [-1, 1]) m.box(sx * 0.12, 1.02, 0.29, 0.03, 0.12, 0.02, hex(0x7ab8ff), { emit: 0.8 });
    m.box(0, 1.0, 0.31, 0.1, 0.02, 0.02, hex(0x1a2240), { rz: 0.1 });
    // 云下挂的雷：三折的黄光
    const bolt = hex(0xffd84a);
    for (const bx of [-0.3, 0.05, 0.35]) {
      let x = bx, y = 0.82;
      for (let k = 0; k < 3; k++) {
        const nx = x + (k % 2 ? -0.08 : 0.08);
        const ny = y - 0.2;
        limb(m, x, y, 0.12, nx, ny, 0.12, 0.04, bolt);
        x = nx;
        y = ny;
      }
      m.box(x, y, 0.12, 0.03, 0.03, 0.03, bolt, { emit: 1.5 });
    }
    m.box(0.45, 1.1, 0.05, 0.04, 0.9, 0.02, hex(0xe8ecf4), { rz: -0.4, emit: 0.4 });
    return 'float';
  }
};

// 页面上的 sprite 名 → { data, style }。style 决定待机的动法：hop 蹦、sway 摇、float 飘、stomp 顿、flicker 火苗。
const cache = {};
function buildFoe(sprite) {
  if (!cache[sprite]) {
    const m = new M.Mesh();
    const fn = FOES[sprite] || FOES.inkblot;
    const style = fn(m, M.rng(sprite.length * 131 + sprite.charCodeAt(0)));
    cache[sprite] = { data: m.data(), style: style };
  }
  return cache[sprite];
}

module.exports = { FOE_NAMES: Object.keys(FOES), buildFoe };
