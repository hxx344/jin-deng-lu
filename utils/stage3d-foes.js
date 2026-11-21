// 历练和秘境的对手：分部件的低多边形模型，按身形摆动作。
// 模型以脚底为原点、面朝 +z；人形高约 1.3～1.6（角色站着约 1.5），小动物矮一些。
// 每个对手由若干部件组成，部件挂在父部件的关节上；动作只转关节，所以出手、挨打时手脚头各动各的。
const M = require('./stage3d-mesh.js');
const K = require('./stage3d-foes-kit.js');

const MODELS = Object.assign({}, require('./stage3d-foes-train.js'), require('./stage3d-foes-gate.js'));

// sprite → { kind, parts: [{ name, parent, joint, data }] }。kind 决定动作：
// biped 人形、quad 四足、bird 鸟、float 飘、crawl 横爬、blob 软团。
const cache = {};
function buildFoe(sprite) {
  if (!cache[sprite]) {
    const fn = MODELS[sprite] || MODELS.inkblot;
    const parts = [];
    const kit = K.makeKit(parts, M.rng(sprite.length * 131 + sprite.charCodeAt(0)));
    const spec = fn(kit) || {};
    cache[sprite] = { kind: spec.kind || 'biped', hop: !!spec.hop, float: spec.float || 0, parts: parts };
  }
  return cache[sprite];
}

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// 出手的节奏：先蓄力（wind 0→1），再打出去（strike 0→1），最后收回。a 是出手进度 0～1，没在出手时传负数。
function attackCurve(a) {
  if (a < 0 || a >= 1) return { wind: 0, strike: 0 };
  if (a < 0.25) return { wind: ease(a / 0.25), strike: 0 };
  if (a < 0.4) return { wind: 1 - ease((a - 0.25) / 0.15), strike: ease((a - 0.25) / 0.15) };
  return { wind: 0, strike: 1 - ease((a - 0.4) / 0.6) };
}

// 每个关节的 [rx, ry, rz, dx, dy, dz, 伸缩]。
function jointPose(kind, name, t, wind, strike, hit) {
  const S = Math.sin;
  const out = [0, 0, 0, 0, 0, 0, 1];
  const side = /L$/.test(name) ? 1 : -1;
  if (name === 'body') {
    out[4] = 0.012 * S(t * 3);
    out[6] = 1 + 0.025 * S(t * 3);
    if (kind === 'blob') { out[6] = 1 + 0.07 * S(t * 3) - 0.22 * wind + 0.25 * strike; }
    if (kind === 'float') { out[2] = 0.05 * S(t * 1.3); out[4] = 0.05 * S(t * 2.2); }
    out[0] = -0.12 * wind + 0.28 * strike - 0.25 * hit;
    out[1] = kind === 'biped' ? -0.3 * wind + 0.35 * strike : 0;
    return out;
  }
  if (name === 'head') {
    out[1] = 0.18 * S(t * 0.9);
    out[0] = 0.05 * S(t * 3 + 1) - 0.3 * hit;
    if (kind === 'quad' || kind === 'bird') out[0] += -0.35 * wind + 0.55 * strike;
    return out;
  }
  if (name === 'jaw') { out[0] = 0.15 + 0.5 * wind - 0.15 * strike + 0.08 * S(t * 4); return out; }
  if (name === 'armL' || name === 'armR') {
    const right = name === 'armR';
    let fwd = 0.12 + 0.1 * S(t * 3 + (right ? 0 : Math.PI));
    if (kind === 'float') fwd = 0.35 + 0.15 * S(t * 2 + (right ? 0 : 1.5));
    if (right || kind === 'float' || kind === 'crawl') fwd += 2.5 * wind + 1.1 * strike;
    else fwd += 0.4 * strike;
    if (kind === 'crawl') fwd = 0.15 + 0.12 * S(t * 4 + (right ? 0 : 1)) + 0.9 * wind + 0.2 * strike;
    out[0] = -fwd;
    out[2] = side * (0.12 + 0.6 * hit);
    return out;
  }
  if (name === 'pinchL' || name === 'pinchR') { out[0] = -(0.1 + 0.5 * wind + 0.08 * S(t * 5)); return out; }
  if (name === 'wingL' || name === 'wingR') {
    out[2] = side * (0.1 * S(t * 2) + 1.2 * wind - 0.4 * strike + 0.8 * hit);
    return out;
  }
  if (/^leg/.test(name)) {
    const back = /^legB/.test(name);
    const ph = (side > 0) !== back ? 0 : Math.PI;
    if (kind === 'quad') out[0] = 0.12 * S(t * 5 + ph) - (back ? 0 : 0.45 * strike);
    else out[0] = 0.06 * S(t * 3 + ph) + (side > 0 ? -0.4 : 0.3) * strike;
    return out;
  }
  if (/^c\d/.test(name)) {
    const i = +name.slice(1);
    out[2] = (i % 2 ? 1 : -1) * 0.18 * S(t * 8 + i);
    out[0] = 0.1 * S(t * 8 + i * 1.7);
    return out;
  }
  if (/^t\d/.test(name)) {
    const i = +name.slice(1);
    out[0] = 0.22 * S(t * 2.2 + i * 1.1) - 0.5 * strike;
    out[2] = 0.18 * S(t * 1.7 + i * 0.8);
    return out;
  }
  if (name === 'tail') {
    out[1] = 0.5 * S(t * 6);
    out[0] = 0.1 * S(t * 3);
    return out;
  }
  if (/^flame/.test(name)) {
    const i = +name.slice(5) || 0;
    out[6] = 1 + 0.12 * S(t * 9 + i * 2) + 0.06 * S(t * 23 + i);
    out[2] = 0.08 * S(t * 5 + i);
    return out;
  }
  if (name === 'bob') { out[4] = 0.04 * S(t * 2.4); out[1] = 0.3 * S(t * 0.8); return out; }
  return out;
}

// 部件矩阵：a 是出手进度（负数表示没在出手），hit 是挨打进度 0～1 的弹性量。
function rigFoe(foe, t, a, hit) {
  const c = attackCurve(a);
  const mats = { root: M.identity() };
  const list = [];
  for (let i = 0; i < foe.parts.length; i++) {
    const p = foe.parts[i];
    const j = jointPose(foe.kind, p.name, t, c.wind, c.strike, hit);
    const k = j[6];
    const local = M.chain(
      M.translate(p.joint[0] + j[3], p.joint[1] + j[4], p.joint[2] + j[5]),
      M.rotY(j[1]), M.rotX(j[0]), M.rotZ(j[2]),
      k === 1 ? M.identity() : M.scale(1 / Math.sqrt(k), k, 1 / Math.sqrt(k))
    );
    const m = M.mul(mats[p.parent] || mats.root, local);
    mats[p.name] = m;
    list.push([p, m]);
  }
  return list;
}

module.exports = { FOE_NAMES: Object.keys(MODELS), buildFoe, rigFoe, attackCurve };
