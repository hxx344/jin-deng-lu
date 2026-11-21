// 做对手模型用的小工具：圆滚滚的球、管子、锥子，以及眼睛、嘴、眉这些五官。
const M = require('./stage3d-mesh.js');

const hex = M.hex;
const C = {
  white: hex(0xfbf7ef),
  ink: hex(0x1b1619),
  pupil: hex(0x120d10),
  skin: hex(0xf6d3b3),
  pale: hex(0xeee8de),
  blush: hex(0xf4868a),
  mouth: hex(0x5a1e22),
  tongue: hex(0xe0606a),
  tooth: hex(0xfffaf0),
  gold: hex(0xf0c050),
  ember: hex(0xff8a3a),
  bone: hex(0xece2cc)
};

function makeKit(parts, R) {
  const kit = {
    C: C,
    hex: hex,
    shade: M.shade,
    mix: M.mix,
    R: R,
    M: M,
    // 一个部件：挂在 parent 的关节上，joint 是关节在父部件里的位置，fn(m) 在关节坐标里画。
    part(name, parent, joint, fn) {
      const m = new M.Mesh();
      fn(m);
      parts.push({ name: name, parent: parent, joint: joint, data: m.data() });
    },
    // 平滑的椭球；d 是细分次数（默认 1，大块头用 2）。
    ball(m, x, y, z, rx, ry, rz, col, o) {
      o = o || {};
      m.blob(x, y, z, rx, ry, rz, col, { smooth: o.flat ? false : true, detail: o.d === undefined ? 1 : o.d, emit: o.emit, keep: o.keep, jitter: o.jitter, rand: R, vary: o.vary });
    },
    tube(m, a, b, r0, r1, col, o) {
      m.tube(a, b, r0, r1, col, Object.assign({ segs: 8 }, o || {}));
    },
    // 一串首尾相接的管子（尾巴、触手、钩子）。
    chainTube(m, pts, r0, r1, col, o) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = M.lerp(r0, r1, i / (pts.length - 1));
        const b = M.lerp(r0, r1, (i + 1) / (pts.length - 1));
        m.tube(pts[i], pts[i + 1], a, b, col, Object.assign({ segs: 7 }, o || {}));
      }
    },
    cone(m, x, y, z, r, h, col, o) {
      o = o || {};
      m.frustum(x, y, z, r, y + h, 0, o.segs || 8, col, { rand: R, emit: o.emit, rot: o.rot, capBottom: o.cap });
    },
    // 在 [x,y,z] 处、先绕 y 转 ry、再绕 x 转 rx、再绕 z 转 rz，然后画 fn 里的东西。
    at(m, x, y, z, ry, rx, rz, fn) {
      m.at(M.chain(M.translate(x, y, z), M.rotY(ry || 0), M.rotX(rx || 0), M.rotZ(rz || 0)), fn);
    },
    // 头（椭球 h = [cx, cy, cz, rx, ry, rz]）表面上朝外的一个位置：yaw 左右，pitch 上下。
    onHead(m, h, yaw, pitch, fn, inset) {
      const d = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
      const k = inset === undefined ? 0.95 : inset;
      m.at(M.chain(M.translate(h[0] + d[0] * h[3] * k, h[1] + d[1] * h[4] * k, h[2] + d[2] * h[5] * k), M.rotY(yaw), M.rotX(-pitch)), fn);
    },
    // 一只眼睛，局部坐标朝 +z。o：iris 虹膜色，glow 发光，lid 上眼皮颜色（有就画怒眼），angle 眼皮倾角，side 左 1 右 -1，sleepy 半闭。
    eye(m, r, o) {
      o = o || {};
      const sd = o.side || 1;
      kit.ball(m, 0, 0, 0, r, r * 1.12, r * 0.55, o.sclera || C.white, { emit: o.glow ? 0.5 : 0.12 });
      kit.ball(m, 0, -r * 0.1, r * 0.3, r * 0.68, r * 0.78, r * 0.34, o.iris || hex(0x3a2a24), { emit: o.glow || 0 });
      kit.ball(m, 0, -r * 0.12, r * 0.45, r * 0.4, r * 0.48, r * 0.22, o.pupil || C.pupil, { emit: o.glow ? o.glow * 0.4 : 0 });
      kit.ball(m, sd * r * 0.25, r * 0.3, r * 0.6, r * 0.2, r * 0.22, r * 0.1, C.white, { emit: 1.2, d: 0 });
      kit.ball(m, -sd * r * 0.2, -r * 0.35, r * 0.6, r * 0.09, r * 0.09, r * 0.05, C.white, { emit: 1, d: 0 });
      if (o.lid) m.box(0, r * (o.sleepy ? 0.45 : 0.82), r * 0.25, r * 2.5, r * (o.sleepy ? 1.0 : 0.62), r * 0.75, o.lid, { rz: sd * (o.angle === undefined ? 0.4 : o.angle) });
    },
    // 一对眼睛贴在头上。
    eyes(m, h, o) {
      o = o || {};
      for (const sd of [1, -1]) {
        kit.onHead(m, h, -sd * (o.yaw || 0.36), o.pitch || 0.1, () => kit.eye(m, o.r || 0.06, Object.assign({}, o, { side: -sd })), o.inset);
      }
    },
    // 嘴，局部坐标朝 +z。type：smile 笑、frown 撇嘴、grin 咧嘴露牙、fang 獠牙、o 张圆嘴、zig 锯齿牙、cat 猫嘴。
    mouth(m, type, w, o) {
      o = o || {};
      const dark = o.col || C.mouth;
      const arc = (curve) => {
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) / 2 * w * 0.5;
          const y = curve * (x * x) / (w * 0.25) - curve * w * 0.12;
          const ang = Math.atan(2 * curve * x / (w * 0.25));
          m.box(x, y, 0, w * 0.28, w * 0.09, w * 0.1, o.line || C.ink, { rz: ang });
        }
      };
      if (type === 'smile') arc(1);
      else if (type === 'frown') arc(-1);
      else if (type === 'o') kit.ball(m, 0, 0, 0, w * 0.32, w * 0.4, w * 0.12, dark);
      else if (type === 'cat') {
        for (const s of [-1, 1]) m.box(s * w * 0.14, 0, 0, w * 0.3, w * 0.08, w * 0.1, C.ink, { rz: -s * 0.5 });
      } else {
        kit.ball(m, 0, 0, -w * 0.02, w * 0.5, w * (type === 'grin' ? 0.28 : 0.24), w * 0.12, dark, { keep: type === 'grin' ? (c) => c[1] < 0.35 : null });
        if (type === 'grin') {
          m.box(0, w * 0.06, w * 0.05, w * 0.82, w * 0.12, w * 0.06, C.tooth);
          kit.ball(m, 0, -w * 0.12, w * 0.04, w * 0.22, w * 0.08, w * 0.05, C.tongue);
        } else if (type === 'fang') {
          for (const s of [-1, 1]) m.frustum(s * w * 0.28, w * 0.12, w * 0.06, w * 0.09, -w * 0.12, 0, 4, C.tooth, { capBottom: true });
        } else if (type === 'zig') {
          for (let i = 0; i < 5; i++) {
            const x = (i - 2) * w * 0.18;
            m.frustum(x, w * 0.16, w * 0.06, w * 0.07, w * 0.0, 0, 3, C.tooth, {});
            if (i < 4) m.frustum(x + w * 0.09, -w * 0.16, w * 0.06, w * 0.06, -w * 0.02, 0, 3, C.tooth, {});
          }
        }
      }
    },
    // 两团腮红。
    blush(m, h, yaw, pitch, r) {
      for (const sd of [1, -1]) kit.onHead(m, h, sd * yaw, pitch, () => kit.ball(m, 0, 0, 0, r, r * 0.6, r * 0.25, C.blush, { d: 1 }), 0.98);
    },
    // 一道眉毛（局部坐标朝 +z）。
    brow(m, h, yaw, pitch, w, tilt, col) {
      for (const sd of [1, -1]) kit.onHead(m, h, -sd * yaw, pitch, () => m.box(0, 0, 0, w, w * 0.28, w * 0.25, col || C.ink, { rz: -sd * tilt }), 1.0);
    }
  };
  return kit;
}

module.exports = { makeKit, C };
