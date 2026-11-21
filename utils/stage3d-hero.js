// 3D 场景里的角色：Q 版低模，分躯干、头、双臂、双腿、盘腿几块，按姿势拼起来。
// pose(name, k, t) 把页面的动作名翻成各关节角度；不依赖 WebGL，规则测试可以逐个动作检查。
const M = require('./stage3d-mesh.js');

const hex = M.hex;
const SKIN = hex(0xf4d2b0);
const HAIR = hex(0x2b2420);
const HAIR_OLD = hex(0xe6e2da);
const EYE = hex(0x2a1e1a);
const EYE_DEMON = hex(0xe0402f);
const BLUSH = hex(0xf09080);
const GOLD = hex(0xe8b84a);
const COLLAR = hex(0xf3ede2);

// 衣着按境界换色，和原来 2D 小人的配色一致：[裤腿, 衣身, 袖子]。
const ROBES = [
  [0x6b5c4f, 0x8a7868, 0x9a8878],
  [0x4a6585, 0x6a8cb2, 0x7b9dc2],
  [0x25705f, 0x3a9a84, 0x4fae98],
  [0xc09a45, 0xf2e4bc, 0xf7edd2],
  [0x416894, 0xb5d6ec, 0xd9f0f7]
].map((r) => r.map(hex));

// 关节位置（角色局部坐标，脚底为原点，面朝 +z）。
const HIP_STAND = 0.44;
const HIP_SIT = 0.16;
const SHOULDER = [0.2, 0.36];
const NECK = 0.42;

function buildParts(look) {
  const robe = ROBES[Math.max(0, Math.min(ROBES.length - 1, look.realm || 0))];
  const sash = hex(look.sash || '#8a6a4a');
  const hair = look.old ? HAIR_OLD : HAIR;
  const eye = look.demon ? EYE_DEMON : EYE;
  const R = M.rng(11);
  const parts = {};
  // 躯干：以胯为原点
  let m = new M.Mesh();
  m.frustum(0, -0.2, 0, 0.3, 0.06, 0.24, 8, M.shade(robe[1], 0.92), { rand: R, vary: 0.06, capBottom: true });
  m.frustum(0, 0.04, 0, 0.245, 0.42, 0.17, 8, robe[1], { rand: R, vary: 0.05, capTop: true });
  m.frustum(0, 0.03, 0, 0.255, 0.12, 0.24, 8, sash, { rand: R });
  m.frustum(0, 0.36, 0, 0.17, 0.44, 0.12, 8, COLLAR, { rand: R });
  m.box(0, 0.25, 0.2, 0.06, 0.2, 0.04, M.shade(robe[1], 0.75), { rx: -0.25 });
  parts.torso = m.data();
  // 头：以脖子为原点
  m = new M.Mesh();
  m.frustum(0, -0.04, 0, 0.07, 0.08, 0.07, 6, SKIN, { rand: R });
  m.blob(0, 0.27, 0.02, 0.27, 0.26, 0.25, SKIN, { rand: R, detail: 1 });
  m.blob(0, 0.29, 0, 0.29, 0.28, 0.28, hair, { rand: R, detail: 1, keep: (c) => c[1] > 0.3 || c[2] < -0.12 || (Math.abs(c[0]) > 0.72 && c[1] > -0.4) });
  m.blob(0, 0.6, -0.06, 0.12, 0.1, 0.12, hair, { rand: R });
  m.box(0, 0.6, -0.06, 0.36, 0.03, 0.03, GOLD, { ry: 0.3, emit: 0.2 });
  for (const sx of [-1, 1]) {
    m.blob(sx * 0.1, 0.24, 0.25, 0.04, 0.058, 0.025, eye, { rand: R, emit: look.demon ? 0.8 : 0 });
    m.blob(sx * 0.108, 0.262, 0.272, 0.013, 0.015, 0.008, hex(0xffffff), { rand: R, emit: 0.5 });
    m.blob(sx * 0.17, 0.17, 0.195, 0.045, 0.025, 0.02, BLUSH, { rand: R });
    m.box(sx * 0.1, 0.325, 0.25, 0.08, 0.018, 0.02, hair, { rz: sx * (look.demon ? 0.35 : -0.08) });
  }
  m.box(0, 0.15, 0.24, 0.05, 0.014, 0.02, hex(0xb05a4a));
  if (look.old) m.frustum(0, 0.02, 0.2, 0.08, 0.14, 0.11, 6, HAIR_OLD, { rand: R, rot: Math.PI / 2 });
  parts.head = m.data();
  // 手臂：以肩为原点，自然下垂
  for (const side of ['L', 'R']) {
    m = new M.Mesh();
    m.frustum(0, -0.3, 0, 0.09, 0.02, 0.065, 6, robe[2], { rand: R, capBottom: true });
    m.blob(0, -0.34, 0.01, 0.055, 0.055, 0.055, SKIN, { rand: R });
    parts['arm' + side] = m.data();
  }
  // 站立的腿：以胯关节为原点
  for (const side of ['L', 'R']) {
    m = new M.Mesh();
    m.frustum(0, -0.36, 0, 0.075, 0.0, 0.085, 6, robe[0], { rand: R });
    m.box(0, -0.4, 0.04, 0.12, 0.07, 0.2, hex(0x2a2220));
    parts['leg' + side] = m.data();
  }
  // 盘腿：以胯为原点
  m = new M.Mesh();
  m.box(-0.15, -0.08, 0.12, 0.42, 0.13, 0.16, robe[0], { ry: -0.45 });
  m.box(0.15, -0.08, 0.12, 0.42, 0.13, 0.16, M.shade(robe[0], 0.92), { ry: 0.45 });
  m.box(-0.2, -0.06, 0.26, 0.12, 0.08, 0.16, hex(0x2a2220), { ry: 0.5 });
  m.box(0.2, -0.06, 0.26, 0.12, 0.08, 0.16, hex(0x2a2220), { ry: -0.5 });
  parts.seat = m.data();
  // 道具，以手心为原点
  m = new M.Mesh();
  m.box(0, 0.0, 0.0, 0.04, 0.14, 0.04, hex(0x5a3a2a));
  m.box(0, 0.08, 0.0, 0.16, 0.03, 0.05, GOLD, { emit: 0.2 });
  m.box(0, 0.42, 0.0, 0.05, 0.62, 0.015, hex(0xdfe8f0), { emit: 0.35 });
  parts.sword = m.data();
  m = new M.Mesh();
  m.blob(0, 0.04, 0.03, 0.05, 0.05, 0.05, hex(0x7fe0a8), { rand: R, emit: 0.7 });
  parts.pill = m.data();
  m = new M.Mesh();
  m.box(0, 0.12, 0.04, 0.12, 0.24, 0.008, hex(0xf0d060), { emit: 0.3 });
  m.box(0, 0.12, 0.046, 0.03, 0.16, 0.004, hex(0xc03028), { emit: 0.3 });
  parts.talisman = m.data();
  m = new M.Mesh();
  m.frustum(0, 0.0, 0.03, 0.06, 0.015, 0.06, 8, GOLD, { rand: R, emit: 0.4, capTop: true, capBottom: true });
  parts.coin = m.data();
  return parts;
}

// 提灯：以提手为原点，灯身挂在下面。
function buildLamp() {
  const m = new M.Mesh();
  const R = M.rng(3);
  const wood = hex(0x4a3022);
  m.box(0, -0.02, 0, 0.02, 0.06, 0.02, wood);
  m.frustum(0, -0.12, 0, 0.16, -0.04, 0, 4, wood, { rand: R, rot: Math.PI / 4, capBottom: true });
  m.box(0, -0.25, 0, 0.17, 0.22, 0.17, hex(0xffb35c), { emit: 1.3 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    m.box(Math.cos(a) * 0.12, -0.25, Math.sin(a) * 0.12, 0.022, 0.25, 0.022, wood);
  }
  m.box(0, -0.38, 0, 0.2, 0.035, 0.2, wood);
  return m.data();
}

// ---------- 姿势 ----------
// 关节量都是弧度。sit 为 1 时盘坐，0 时站着。手臂是 [前抬, 外展, 备用]：左臂外展取正，右臂外展取负。
function basePose() {
  return {
    sit: 1, lift: 0, lean: 0, roll: 0, twist: 0, squash: 1,
    headYaw: 0, headPitch: 0, headRoll: 0,
    armL: [0.55, 0.25, 0.3], armR: [0.55, -0.25, -0.3],
    legL: 0, legR: 0, fall: 0, sink: 0, shrink: 1,
    prop: '', propK: 0, glow: 0, tint: null, tintK: 0, lampLift: 0
  };
}

const ease = (x) => x * x * (3 - 2 * x);
const pulse = (k, a, b) => (k < a || k > b ? 0 : Math.sin((k - a) / (b - a) * Math.PI));
const wobble = (t, f) => Math.sin(t * f * Math.PI * 2);

// 双臂伸到身前（结印、捧东西）。
function armsForward(p, amt, spread) {
  p.armL = [0.55 + amt, 0.25 - (spread || 0.3), 0.3];
  p.armR = [0.55 + amt, -0.25 + (spread || 0.3), -0.3];
}

const ACTIONS = {
  idle(p, k, t) {
    p.lean = 0.04 * Math.sin(t * 1.6);
    p.squash = 1 + 0.02 * Math.sin(t * 1.6);
  },
  ponder(p, k, t) {
    p.armR = [1.9, 0.45, -0.2];
    p.headRoll = 0.18;
    p.headPitch = -0.08 + 0.04 * Math.sin(t * 1.2);
  },
  brace(p, k, t) {
    p.armL = [1.3, -0.5, 0.2];
    p.armR = [1.3, 0.5, -0.2];
    p.lean = 0.15;
    p.squash = 0.96 + 0.01 * wobble(t, 6);
  },
  walk(p, k, t) {
    const w = Math.sin(t * 9);
    p.sit = 0;
    p.legL = w * 0.6;
    p.legR = -w * 0.6;
    p.armL = [-w * 0.35 + 0.1, 0.15, 0];
    p.armR = [w * 0.5 + 0.1, -0.12, 0];
    p.lift = Math.abs(Math.cos(t * 9)) * 0.05;
    p.lean = 0.08;
    p.twist = w * 0.08;
  },
  notice(p, k) {
    p.lift = pulse(k, 0, 0.6) * 0.12;
    p.headPitch = -0.25 * pulse(k, 0, 1);
  },
  born(p, k) {
    p.shrink = 0.4 + 0.6 * ease(Math.min(1, k * 1.6)) + pulse(k, 0.55, 1) * 0.08;
    p.glow = 1 - k;
    p.lift = pulse(k, 0.3, 0.8) * 0.15;
  },
  slash(p, k) {
    p.prop = 'sword';
    p.propK = 1;
    const up = ease(Math.min(1, k / 0.35));
    const down = ease(Math.max(0, Math.min(1, (k - 0.35) / 0.2)));
    p.armR = [0.4 + up * 2.4 - down * 2.9, -0.2 - up * 0.2, -0.2];
    p.twist = -0.3 * up + 0.5 * down;
    p.lean = 0.12 * down;
    p.armL = [0.4, 0.5, 0.3];
  },
  sharpen(p, k, t) {
    p.prop = 'sword';
    p.propK = 1;
    p.armR = [1.5, 0.1, -0.2];
    p.armL = [1.3 + 0.2 * wobble(t, 4), -0.3, 0.2];
    p.headPitch = 0.2;
    p.glow = pulse(k, 0.5, 1) * 0.6;
  },
  pill(p, k) {
    p.prop = k < 0.6 ? 'pill' : '';
    p.propK = 1;
    const up = ease(Math.min(1, k / 0.4));
    p.armR = [0.5 + up * 1.9, -0.25 + up * 0.65, -0.3];
    p.headPitch = -0.3 * pulse(k, 0.4, 0.9);
    p.squash = 1 + 0.06 * pulse(k, 0.6, 0.9);
  },
  renew(p, k, t) {
    armsForward(p, 0.6, 0.15);
    p.glow = 0.4 + 0.5 * pulse(k, 0, 1);
    p.tint = [0.5, 1, 0.6];
    p.tintK = 0.25 * pulse(k, 0, 1);
    p.lean = 0.03 * Math.sin(t * 3);
  },
  talisman(p, k, t) {
    p.prop = 'talisman';
    p.propK = 1;
    p.armR = [1.1 + 0.9 * pulse(k, 0.2, 0.7), -0.1, -0.2];
    p.armL = [1.0, -0.4, 0.2];
    p.glow = pulse(k, 0.4, 1) * 0.7;
    p.twist = -0.15 + 0.03 * wobble(t, 8) * pulse(k, 0, 0.5);
  },
  divine(p, k, t) {
    p.prop = 'coin';
    p.propK = 1;
    armsForward(p, 0.5, 0.25);
    p.armR[0] += 0.3 * wobble(t, 3);
    p.headPitch = 0.25;
  },
  karma(p, k, t) {
    armsForward(p, 0.9, 0.5);
    p.headPitch = 0.15;
    p.glow = 0.3 + 0.4 * pulse(k, 0.2, 1);
    p.twist = 0.1 * Math.sin(t * 2.5);
  },
  flex(p, k, t) {
    const a = ease(Math.min(1, k / 0.25));
    p.armL = [0.2, 1.6 * a, 0.3];
    p.armR = [0.2, -1.6 * a, -0.3];
    p.squash = 1 + 0.06 * pulse(k, 0.25, 0.9) * (1 + 0.5 * wobble(t, 5));
    p.glow = pulse(k, 0.3, 1) * 0.4;
  },
  cheer(p, k, t) {
    const a = ease(Math.min(1, k / 0.25));
    p.armL = [2.9 * a, 0.3, 0.2];
    p.armR = [2.9 * a, -0.3, -0.2];
    p.lift = Math.abs(Math.sin(k * Math.PI * 2)) * 0.16;
    p.headPitch = -0.15;
  },
  lucky(p, k) {
    p.prop = k < 0.45 ? 'coin' : '';
    p.propK = 1;
    p.armR = [0.4 + 2.3 * pulse(k, 0, 0.6), -0.2, -0.2];
    p.headPitch = -0.4 * pulse(k, 0.2, 1);
    p.lift = pulse(k, 0.6, 0.9) * 0.08;
  },
  toss(p, k) {
    p.armR = [0.4 + 1.8 * pulse(k, 0, 0.5), -0.6 * pulse(k, 0, 0.5), -0.2];
    p.headYaw = -0.3 * pulse(k, 0.2, 1);
  },
  reap(p, k) {
    p.armR = [0.6 + 1.2 * pulse(k, 0, 0.5), -0.3, -0.2];
    p.armL = [0.6 + 1.0 * pulse(k, 0.1, 0.6), 0.3, 0.2];
    p.headPitch = 0.2;
    p.lean = 0.12 * pulse(k, 0.4, 1);
  },
  absorb(p, k, t) {
    ACTIONS.idle(p, k, t);
    p.glow = 0.3 + 0.6 * pulse(k, 0, 1);
    p.lift = 0.06 * pulse(k, 0, 1);
  },
  seclude(p, k, t) {
    ACTIONS.idle(p, k, t);
    p.headPitch = 0.3;
    p.glow = 0.5 * pulse(k, 0, 1);
    p.lean = 0.1;
  },
  calm(p, k, t) {
    p.squash = 1 + 0.05 * Math.sin(k * Math.PI * 2);
    p.headPitch = -0.12 * Math.sin(k * Math.PI);
    p.glow = 0.3 * pulse(k, 0, 1);
  },
  focus(p, k) {
    armsForward(p, 0.7, 0.05);
    p.glow = 0.6 * pulse(k, 0.2, 1);
    p.headPitch = 0.05;
  },
  enlighten(p, k) {
    p.headPitch = -0.35 * pulse(k, 0, 1);
    p.glow = 0.9 * pulse(k, 0.1, 1);
    p.lift = 0.1 * pulse(k, 0.2, 1);
  },
  demon(p, k, t) {
    p.headPitch = 0.35;
    p.roll = 0.08 * wobble(t, 9) * pulse(k, 0, 1);
    p.tint = [1, 0.2, 0.2];
    p.tintK = 0.45 * pulse(k, 0, 1);
  },
  hurt(p, k, t) {
    p.lean = -0.35 * pulse(k, 0, 0.6);
    p.squash = 1 - 0.08 * pulse(k, 0, 0.4);
    p.roll = 0.06 * wobble(t, 12) * pulse(k, 0, 0.6);
    p.tint = [1, 0.4, 0.4];
    p.tintK = 0.4 * pulse(k, 0, 0.5);
  },
  cough(p, k) {
    const c = Math.abs(Math.sin(k * Math.PI * 4));
    p.lean = 0.25 * c;
    p.armR = [2.0, 0.4, -0.2];
    p.headPitch = 0.2 * c;
  },
  shake(p, k, t) {
    p.headYaw = 0.35 * wobble(t, 3) * pulse(k, 0, 1);
    p.headPitch = 0.15;
  },
  shrug(p, k) {
    const a = pulse(k, 0, 1);
    p.armL = [0.6, 0.9 * a + 0.2, 0.8];
    p.armR = [0.6, -0.9 * a - 0.2, -0.8];
    p.headRoll = 0.2 * a;
    p.squash = 1 + 0.04 * a;
  },
  breakthrough(p, k, t) {
    p.lift = 0.5 * ease(Math.min(1, k / 0.4)) * (1 - ease(Math.max(0, (k - 0.75) / 0.25)));
    p.glow = 1.2 * pulse(k, 0, 1);
    armsForward(p, 0.3 + 0.8 * pulse(k, 0.2, 0.9), 0.6);
    p.twist = 0.25 * Math.sin(t * 4) * pulse(k, 0.2, 0.9);
  },
  ascend(p, k) {
    p.lift = 1.0 * ease(Math.min(1, k / 0.6)) * (1 - ease(Math.max(0, (k - 0.8) / 0.2)));
    p.glow = 1.5 * pulse(k, 0, 1);
    p.armL = [2.6 * pulse(k, 0.2, 0.9), 0.5, 0.2];
    p.armR = [2.6 * pulse(k, 0.2, 0.9), -0.5, -0.2];
  },
  resonate(p, k, t) {
    const a = pulse(k, 0, 1);
    p.armL = [0.4, 1.3 * a, 0.3];
    p.armR = [0.4, -1.3 * a, -0.3];
    p.glow = 0.5 + 0.7 * a * (0.7 + 0.3 * Math.sin(t * 10));
    p.lift = 0.12 * a;
  },
  bow(p, k) {
    const a = pulse(k, 0, 1);
    p.lean = 0.55 * a;
    armsForward(p, 0.8, 0);
    p.headPitch = 0.2 * a;
    p.glow = 0.4 * a;
  },
  thunder(p, k, t) {
    ACTIONS.brace(p, k, t);
    // 第三道雷在 2.8 / 4.2 秒落下。
    const hit = pulse(k, 0.64, 0.8);
    p.lean = 0.15 - 0.45 * hit;
    p.glow = hit * 1.4;
    p.tint = [0.7, 0.85, 1];
    p.tintK = hit * 0.6;
    p.roll = 0.05 * wobble(t, 10) * (0.3 + hit);
  },
  die(p, k) {
    const a = ease(Math.min(1, k / 0.7));
    p.lean = 0.3 * pulse(k, 0, 0.4);
    p.fall = 1.35 * a;
    p.headPitch = 0.3 * a;
    p.armL = [0.2, 0.6 * a, 0.3];
    p.armR = [0.2, -0.3, -0.3];
  },
  possess(p, k, t) {
    ACTIONS.die(p, Math.max(0, (k - 0.35) / 0.65), t);
    p.tint = [0.9, 0.1, 0.15];
    p.tintK = 0.6 * Math.min(1, k * 2);
    p.roll += 0.1 * wobble(t, 11) * (1 - k);
  },
  fade(p, k) {
    p.lift = 0.6 * ease(k);
    p.shrink = 1 - ease(Math.max(0, (k - 0.3) / 0.7));
    p.glow = 1.2 * k;
    p.tint = [1, 1, 1];
    p.tintK = 0.6 * k;
  },
  ash(p, k) {
    p.tint = [0.15, 0.13, 0.12];
    p.tintK = Math.min(1, k * 1.8);
    p.sink = 0.5 * ease(Math.max(0, (k - 0.4) / 0.6));
    p.shrink = 1 - 0.7 * ease(Math.max(0, (k - 0.5) / 0.5));
  },
  yawn(p, k) {
    const a = pulse(k, 0.1, 0.8);
    p.headPitch = -0.35 * a;
    p.armR = [0.55 + 1.6 * a, -0.25 + 0.6 * a, -0.3];
    p.armL = [0.55 + 0.6 * a, 0.25 + 0.6 * a, 0.3];
  },
  look(p, k) {
    p.headYaw = 0.6 * Math.sin(k * Math.PI * 2);
    p.twist = 0.12 * Math.sin(k * Math.PI * 2);
  },
  doze(p, k, t) {
    p.headPitch = 0.35 * ease(Math.min(1, k * 2)) - 0.25 * pulse(k, 0.8, 0.95);
    p.lean = 0.12 * Math.min(1, k * 2) + 0.03 * Math.sin(t * 2);
  },
  scratch(p, k, t) {
    p.armR = [2.7, -0.4, -0.3 + 0.2 * wobble(t, 4) * pulse(k, 0.1, 0.9)];
    p.headRoll = -0.15 * pulse(k, 0, 1);
  },
  wave(p, k, t) {
    p.armR = [0.6, -2.5 + 0.35 * wobble(t, 2.5), -0.4];
    p.headRoll = 0.12;
    p.lift = 0.05 * Math.abs(wobble(t, 2.5));
  },
  stretch(p, k) {
    const a = pulse(k, 0, 1);
    p.armL = [0.55 + 2.4 * a, 0.25, 0.3];
    p.armR = [0.55 + 2.4 * a, -0.25, -0.3];
    p.lean = -0.18 * a;
    p.squash = 1 + 0.05 * a;
  }
};

// name 是页面的动作名（含 idle、ponder、brace），k 是这个动作播到的比例，t 是全局秒数。
function pose(name, k, t) {
  const p = basePose();
  const fn = ACTIONS[name] || ACTIONS.idle;
  fn(p, Math.max(0, Math.min(1, k || 0)), t || 0);
  return p;
}

// 站起和盘坐之间的过渡：腿和手臂跟着 sit 插值，动作的上半身照旧。
function blendWalk(p, walkPose, w) {
  if (w <= 0) return p;
  const mixArm = (a, b) => [M.lerp(a[0], b[0], w), M.lerp(a[1], b[1], w), M.lerp(a[2], b[2], w)];
  p.sit = M.lerp(p.sit, 0, w);
  p.legL = M.lerp(p.legL, walkPose.legL, w);
  p.legR = M.lerp(p.legR, walkPose.legR, w);
  p.lift = Math.max(p.lift, walkPose.lift * w);
  p.lean = M.lerp(p.lean, walkPose.lean, w * 0.5);
  // 走路时左手提灯，不跟着动作甩。
  p.armL = mixArm(p.armL, [0.25 + walkPose.armL[0] * 0.3, 0.12, 0], w);
  if (!p.prop) p.armR = mixArm(p.armR, walkPose.armR, w);
  return p;
}

// 按姿势算出每一块的模型矩阵（角色局部坐标）。
function rig(p) {
  const hipY = M.lerp(HIP_STAND, HIP_SIT, p.sit) + p.lift - p.sink;
  const root = M.chain(
    M.rotZ(p.fall * 0.9 * (p.fall > 0 ? 1 : 0)),
    M.translate(0, hipY * (1 - p.fall * 0.35), 0),
    M.rotX(p.fall * 0.4),
    M.scale(p.shrink, p.shrink * p.squash, p.shrink)
  );
  const torso = M.chain(root, M.rotY(p.twist), M.rotX(p.lean), M.rotZ(p.roll));
  const head = M.chain(torso, M.translate(0, NECK, 0), M.rotY(p.headYaw), M.rotX(p.headPitch), M.rotZ(p.headRoll));
  const armL = M.chain(torso, M.translate(-SHOULDER[0], SHOULDER[1], 0), M.rotX(-p.armL[0]), M.rotZ(-p.armL[1]));
  const armR = M.chain(torso, M.translate(SHOULDER[0], SHOULDER[1], 0), M.rotX(-p.armR[0]), M.rotZ(-p.armR[1]));
  const legBase = M.chain(root, M.translate(0, 0, 0));
  const legL = M.chain(legBase, M.translate(-0.1, 0, 0), M.rotX(-p.legL));
  const legR = M.chain(legBase, M.translate(0.1, 0, 0), M.rotX(-p.legR));
  const handL = M.chain(armL, M.translate(0, -0.36, 0.02));
  const handR = M.chain(armR, M.translate(0, -0.36, 0.02));
  return { root, torso, head, armL, armR, legL, legR, seat: root, handL, handR };
}

module.exports = { ROBES, buildParts, buildLamp, pose, blendWalk, rig, ACTION_NAMES: Object.keys(ACTIONS) };
