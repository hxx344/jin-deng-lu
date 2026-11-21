// 3D 场景的数学和低多边形网格构建。不依赖微信接口和 WebGL，规则测试可以直接跑。
// 顶点格式：位置 3、法线 3、颜色 3、附加 2（摇摆权重、自发光），共 11 个浮点。
const STRIDE = 11;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 整数格点哈希，坐标很大时也稳定（不用 sin）。
function hash2(x, z, seed) {
  let h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((z | 0) ^ 0x61c88647, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function noise(x, z, seed) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function hex(c) {
  if (typeof c === 'string') {
    const m = /#([0-9a-f]{6})/i.exec(c);
    c = m ? parseInt(m[1], 16) : 0x8a6a4a;
  }
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
const shade = (col, k) => [col[0] * k, col[1] * k, col[2] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function smooth(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
const lerp = (a, b, t) => a + (b - a) * t;
// 角度插值走最短的那一边。
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ---------- 4x4 矩阵，列主序 ----------
function persp(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
function lookAt(e, c, u) {
  const z = norm(sub(e, c));
  const x = norm(cross(u, z));
  const y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
}
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const translate = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const scale = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
function rotX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function rotY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}
function rotZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
// 依次相乘：chain(a, b, c) = a * b * c。
function chain() {
  let m = arguments[0];
  for (let i = 1; i < arguments.length; i++) m = mul(m, arguments[i]);
  return m;
}
function apply(m, p) {
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [
    (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w,
    (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w,
    (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w
  ];
}

// ---------- 网格 ----------
function Mesh() {
  this.d = [];
  this.swayBase = 0;
  this.swayK = 0;
}
// center 给出时，法线朝离开 center 的方向翻转，省得管顶点绕序。
Mesh.prototype.tri = function (a, b, c, col, emit, center) {
  let n = norm(cross(sub(b, a), sub(c, a)));
  if (center) {
    const m = [(a[0] + b[0] + c[0]) / 3 - center[0], (a[1] + b[1] + c[1]) / 3 - center[1], (a[2] + b[2] + c[2]) / 3 - center[2]];
    if (dot(n, m) < 0) n = [-n[0], -n[1], -n[2]];
  }
  const e = emit || 0;
  const pts = [a, b, c];
  for (let i = 0; i < 3; i++) {
    const p = pts[i];
    const sw = this.swayK > 0 ? Math.max(0, p[1] - this.swayBase) * this.swayK : 0;
    this.d.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], sw, e);
  }
};
// 截锥（r1 为 0 时是圆锥）。
Mesh.prototype.frustum = function (x, y0, z, r0, y1, r1, segs, col, opt) {
  opt = opt || {};
  const R = opt.rand || Math.random;
  const j = opt.jitter || 0;
  const rot = opt.rot || 0;
  const center = [x, (y0 + y1) / 2, z];
  const ring = (r, y) => {
    const pts = [];
    for (let i = 0; i < segs; i++) {
      const a = rot + i / segs * Math.PI * 2;
      const rr = r * (1 + (R() - 0.5) * j);
      pts.push([x + Math.cos(a) * rr, y + (R() - 0.5) * j * 0.3 * r, z + Math.sin(a) * rr]);
    }
    return pts;
  };
  const lo = ring(r0, y0);
  const hi = r1 > 0 ? ring(r1, y1) : null;
  const apex = [x + (R() - 0.5) * j * 0.3 * r0, y1, z + (R() - 0.5) * j * 0.3 * r0];
  for (let i = 0; i < segs; i++) {
    const k = (i + 1) % segs;
    const cv = opt.vary ? shade(col, 1 + (R() - 0.5) * opt.vary) : col;
    if (hi) {
      this.tri(lo[i], lo[k], hi[k], cv, opt.emit, center);
      this.tri(lo[i], hi[k], hi[i], cv, opt.emit, center);
      if (opt.capTop) this.tri(hi[i], hi[k], [x, y1, z], opt.capCol || cv, opt.emit, [x, y1 - 1, z]);
    } else {
      this.tri(lo[i], lo[k], apex, cv, opt.emit, center);
    }
    if (opt.capBottom) this.tri(lo[i], lo[k], [x, y0, z], cv, opt.emit, [x, y0 + 1, z]);
  }
};
const IT = (1 + Math.sqrt(5)) / 2;
const ICO_V = [[-1, IT, 0], [1, IT, 0], [-1, -IT, 0], [1, -IT, 0], [0, -1, IT], [0, 1, IT], [0, -1, -IT], [0, 1, -IT], [IT, 0, -1], [IT, 0, 1], [-IT, 0, -1], [-IT, 0, 1]].map(norm);
const ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
// 细分一次的二十面体（80 个面），给头这类要圆一点的东西用。
const ICO = [{ v: ICO_V, f: ICO_F }];
function icoLevel(n) {
  while (ICO.length <= n) {
    const prev = ICO[ICO.length - 1];
    const v = prev.v.slice();
    const f = [];
    const mid = {};
    const m = (a, b) => {
      const k = a < b ? a + ',' + b : b + ',' + a;
      if (mid[k] === undefined) {
        mid[k] = v.length;
        v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2]));
      }
      return mid[k];
    };
    for (let i = 0; i < prev.f.length; i++) {
      const t = prev.f[i];
      const ab = m(t[0], t[1]);
      const bc = m(t[1], t[2]);
      const ca = m(t[2], t[0]);
      f.push([t[0], ab, ca], [t[1], bc, ab], [t[2], ca, bc], [ab, bc, ca]);
    }
    ICO.push({ v: v, f: f });
  }
  return ICO[n];
}
// 低模球：sx、sy、sz 是各轴半径；keep(单位球上的面中心) 决定留哪些面；detail 为 1 时细分一次。
Mesh.prototype.blob = function (x, y, z, sx, sy, sz, col, opt) {
  opt = opt || {};
  const R = opt.rand || Math.random;
  const j = opt.jitter || 0;
  const ico = icoLevel(opt.detail ? 1 : 0);
  const vs = ico.v.map((v) => {
    const k = 1 + (R() - 0.5) * j;
    return [x + v[0] * sx * k, y + v[1] * sy * k, z + v[2] * sz * k];
  });
  for (let i = 0; i < ico.f.length; i++) {
    const f = ico.f[i];
    if (opt.keep) {
      const c = [0, 1, 2].map((a) => (ico.v[f[0]][a] + ico.v[f[1]][a] + ico.v[f[2]][a]) / 3);
      if (!opt.keep(c)) continue;
    }
    const cv = opt.vary ? shade(col, 1 + (R() - 0.5) * opt.vary) : col;
    this.tri(vs[f[0]], vs[f[1]], vs[f[2]], cv, opt.emit, [x, y, z]);
  }
};
// 长方体，可绕 z 再绕 y 转。
Mesh.prototype.box = function (cx, cy, cz, sx, sy, sz, col, opt) {
  opt = opt || {};
  const c = Math.cos(opt.ry || 0), s = Math.sin(opt.ry || 0);
  const cz2 = Math.cos(opt.rz || 0), sz2 = Math.sin(opt.rz || 0);
  const cx2 = Math.cos(opt.rx || 0), sx2 = Math.sin(opt.rx || 0);
  const P = (dx, dy, dz) => {
    const y0 = dy * cx2 - dz * sx2;
    const z0 = dy * sx2 + dz * cx2;
    const x1 = dx * cz2 - y0 * sz2;
    const y1 = dx * sz2 + y0 * cz2;
    return [cx + x1 * c + z0 * s, cy + y1, cz - x1 * s + z0 * c];
  };
  const v = [];
  for (let i = 0; i < 8; i++) v.push(P((i & 1 ? 1 : -1) * sx / 2, (i & 2 ? 1 : -1) * sy / 2, (i & 4 ? 1 : -1) * sz / 2));
  const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  const center = [cx, cy, cz];
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const cv = opt.vary ? shade(col, 1 + ((opt.rand || Math.random)() - 0.5) * opt.vary) : col;
    this.tri(v[f[0]], v[f[1]], v[f[2]], cv, opt.emit, center);
    this.tri(v[f[0]], v[f[2]], v[f[3]], cv, opt.emit, center);
  }
};
Mesh.prototype.data = function () {
  return new Float32Array(this.d);
};

module.exports = {
  STRIDE, rng, hash2, noise, hex, shade, mix, sub, cross, dot, norm, smooth, lerp, lerpAngle,
  persp, lookAt, mul, identity, translate, scale, rotX, rotY, rotZ, chain, apply, Mesh
};
