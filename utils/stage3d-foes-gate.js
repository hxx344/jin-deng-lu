// 秘境的对手：纸、盐、墨、窑、陵五处，每处三种。
const L = (s) => (s > 0 ? 'L' : 'R');

// 纸扎人的身子：上窄下宽的纸衣，衣摆一圈折痕。
function paperRobe(k, m, h, r0, r1, col, trim) {
  m.frustum(0, 0, 0, r0, h, r1, 12, col, { smooth: true, capBottom: true });
  m.frustum(0, 0, 0, r0 + 0.005, 0.05, r0 - 0.002, 12, trim, { smooth: true });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    m.box(Math.cos(a) * r0 * 0.97, h * 0.25, Math.sin(a) * r0 * 0.97, 0.008, h * 0.5, 0.01, k.shade(col, 0.85), { ry: -a });
  }
}

module.exports = {
  // ---------- 纸 ----------
  paperboy(k) {
    const { C } = k;
    const paper = k.hex(0xfaf4e8), robe = k.hex(0x5aa0d8), trim = k.hex(0xf2c94c), hair = k.hex(0x1c1a20), red = k.hex(0xd8342c);
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.07, 0.16, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.12, 0], 0.05, 0.045, paper);
      k.ball(m, 0, -0.14, 0.03, 0.055, 0.035, 0.08, hair);
    });
    k.part('body', 'root', [0, 0.16, 0], (m) => {
      paperRobe(k, m, 0.36, 0.22, 0.13, robe, trim);
      m.frustum(0, 0.14, 0, 0.18, 0.18, 0.17, 12, red, { smooth: true });
      k.at(m, 0, 0.26, 0.15, 0, -0.25, 0, () => m.box(0, 0, 0, 0.08, 0.08, 0.01, trim, { rz: 0.78 }));
    });
    k.part('head', 'body', [0, 0.36, 0], (m) => {
      const h = [0, 0.19, 0.01, 0.24, 0.23, 0.22];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], paper, { d: 2 });
      k.ball(m, 0, 0.27, -0.03, 0.245, 0.17, 0.225, hair, { d: 2, keep: (c) => c[1] > 0.1 && !(c[2] > 0.55 && c[1] < 0.75) });
      for (const s of [-1, 1]) k.ball(m, s * 0.17, 0.4, -0.02, 0.09, 0.09, 0.09, hair, { d: 2 });
      for (const s of [-1, 1]) k.ball(m, s * 0.17, 0.4, -0.02, 0.095, 0.03, 0.095, red);
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.5, -0.08, () => k.ball(m, 0, 0, 0, 0.055, 0.055, 0.015, k.hex(0xf06a6a), { d: 1 }), 0.99);
      k.eyes(m, h, { r: 0.05, yaw: 0.3, pitch: 0.06, iris: C.ink });
      k.onHead(m, h, 0, -0.3, () => k.ball(m, 0, 0, 0, 0.025, 0.018, 0.01, red), 0.99);
    });
    k.part('armR', 'body', [-0.15, 0.3, 0], (m) => {
      k.tube(m, [0, 0, 0], [-0.05, -0.12, 0.12], 0.05, 0.045, robe);
      k.ball(m, -0.055, -0.14, 0.15, 0.04, 0.04, 0.04, paper);
      k.at(m, -0.04, -0.12, 0.2, 0, -0.2, 0.1, () => {
        m.box(0, 0, 0, 0.15, 0.1, 0.012, red);
        m.box(0, 0.02, 0.008, 0.04, 0.04, 0.008, trim, { emit: 0.4 });
      });
    });
    k.part('armL', 'body', [0.15, 0.3, 0], (m) => {
      k.tube(m, [0, 0, 0], [0.04, -0.17, 0.02], 0.05, 0.045, robe);
      k.ball(m, 0.045, -0.2, 0.03, 0.04, 0.04, 0.04, paper);
    });
    return { kind: 'biped', hop: true };
  },

  paperbearer(k) {
    const { C } = k;
    const paper = k.hex(0xf7efe0), robe = k.hex(0x5a9a6a), trim = k.hex(0xe8d070), hat = k.hex(0x2a2a2e), red = k.hex(0xd8443a), pole = k.hex(0x9a6a3a);
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.1, 0.28, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.22, 0], 0.06, 0.05, k.hex(0xe8e0d0));
      k.ball(m, 0, -0.25, 0.04, 0.065, 0.04, 0.1, hat);
    });
    k.part('body', 'root', [0, 0.28, 0], (m) => {
      paperRobe(k, m, 0.5, 0.27, 0.17, robe, trim);
      m.frustum(0, 0.18, 0, 0.23, 0.23, 0.22, 12, red, { smooth: true });
      for (const s of [-1, 1]) k.ball(m, s * 0.19, 0.48, 0, 0.08, 0.06, 0.08, robe);
    });
    k.part('pole', 'body', [0, 0.54, 0], (m) => {
      k.tube(m, [0, 0, -0.75], [0, 0, 0.75], 0.035, 0.035, pole);
      for (const z of [-0.75, 0.75]) {
        k.ball(m, 0, 0, z, 0.05, 0.05, 0.05, trim, { emit: 0.2 });
        k.tube(m, [0, 0, z], [0, -0.22, z], 0.008, 0.008, red, { caps: false });
        k.ball(m, 0, -0.27, z, 0.06, 0.08, 0.06, red, { emit: 0.35 });
      }
    });
    k.part('head', 'body', [0, 0.5, 0], (m) => {
      const h = [0, 0.2, 0.01, 0.23, 0.24, 0.22];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], paper, { d: 2 });
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.5, -0.1, () => k.ball(m, 0, 0, 0, 0.06, 0.06, 0.015, k.hex(0xee6666)), 0.99);
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.32, 0.12, () => {
        m.box(-0.022, 0, 0, 0.05, 0.018, 0.02, C.ink, { rz: 0.5 });
        m.box(0.022, 0, 0, 0.05, 0.018, 0.02, C.ink, { rz: -0.5 });
      }, 1.0);
      k.onHead(m, h, 0, -0.3, () => k.mouth(m, 'smile', 0.14), 0.99);
      m.frustum(0, 0.36, 0, 0.36, 0.42, 0.33, 14, hat, { smooth: true, capBottom: true });
      m.frustum(0, 0.42, 0, 0.33, 0.62, 0.0, 14, hat, { smooth: true });
      k.ball(m, 0, 0.62, 0, 0.04, 0.04, 0.04, red);
      for (const s of [-1, 1]) k.tube(m, [s * 0.2, 0.37, 0.05], [s * 0.18, 0.05, 0.12], 0.01, 0.008, red, { caps: false });
    });
    for (const s of [1, -1]) k.part('arm' + L(s), 'body', [s * 0.22, 0.44, 0], (m) => {
      k.tube(m, [0, 0, 0], [s * 0.06, 0.1, 0.05], 0.06, 0.055, robe);
      k.ball(m, s * 0.06, 0.12, 0.06, 0.045, 0.045, 0.045, paper);
    });
    return { kind: 'biped' };
  },

  papercollector(k) {
    const { C } = k;
    const paper = k.hex(0xf8f2e6), robe = k.hex(0xb02a2a), robeD = k.hex(0x7a1c1e), trim = k.hex(0xf0c45a), hat = k.hex(0x1e1c22), wood = k.hex(0x6a4428);
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.1, 0.22, 0], (m) => {
      k.ball(m, 0, -0.18, 0.04, 0.07, 0.045, 0.11, hat);
    });
    k.part('body', 'root', [0, 0.06, 0], (m) => {
      paperRobe(k, m, 0.68, 0.33, 0.2, robe, trim);
      m.frustum(0, 0.3, 0, 0.27, 0.36, 0.26, 12, trim, { smooth: true });
      k.at(m, 0, 0.5, 0.21, 0, -0.2, 0, () => {
        m.box(0, 0, 0, 0.18, 0.18, 0.012, trim);
        m.box(0, 0, 0.008, 0.12, 0.12, 0.01, robeD);
        k.ball(m, 0, 0, 0.012, 0.03, 0.03, 0.01, trim, { emit: 0.5, d: 0 });
      });
      for (const s of [-1, 1]) k.ball(m, s * 0.22, 0.64, 0, 0.1, 0.07, 0.1, robe);
    });
    k.part('head', 'body', [0, 0.68, 0], (m) => {
      const h = [0, 0.2, 0.01, 0.24, 0.25, 0.23];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], paper, { d: 2 });
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.5, -0.1, () => k.ball(m, 0, 0, 0, 0.065, 0.065, 0.015, k.hex(0xee5a5a)), 0.99);
      k.eyes(m, h, { r: 0.052, yaw: 0.33, pitch: 0.06, iris: k.hex(0x2a1a1a), lid: paper, angle: 0.55 });
      k.brow(m, h, 0.33, 0.33, 0.1, 0.5);
      k.onHead(m, h, 0, -0.32, () => k.mouth(m, 'grin', 0.16), 0.99);
      m.frustum(0, 0.36, 0, 0.25, 0.62, 0.27, 14, hat, { smooth: true, capTop: true });
      m.box(0, 0.48, 0.0, 0.2, 0.2, 0.56, hat, { rx: 0 });
      m.box(0, 0.6, -0.02, 0.86, 0.04, 0.08, hat);
      for (const s of [-1, 1]) k.ball(m, s * 0.44, 0.6, -0.02, 0.05, 0.05, 0.05, trim, { emit: 0.25 });
      k.at(m, 0, 0.5, 0.275, 0, 0, 0, () => m.box(0, 0, 0, 0.09, 0.09, 0.012, trim, { emit: 0.3, rz: 0.78 }));
    });
    k.part('armL', 'body', [0.27, 0.6, 0], (m) => {
      k.tube(m, [0, 0, 0], [0.06, -0.2, 0.14], 0.08, 0.1, robe);
      k.ball(m, 0.07, -0.24, 0.18, 0.05, 0.05, 0.05, paper);
      k.at(m, 0.05, -0.22, 0.24, 0, -0.5, 0, () => {
        m.box(0, 0, 0, 0.22, 0.28, 0.04, k.hex(0x3a5a8a));
        m.box(0, 0, 0.022, 0.2, 0.26, 0.01, k.hex(0xf4ead2));
        for (let i = 0; i < 4; i++) m.box(0, 0.08 - i * 0.05, 0.03, 0.14, 0.012, 0.004, C.ink);
      });
    });
    k.part('armR', 'body', [-0.27, 0.6, 0], (m) => {
      k.tube(m, [0, 0, 0], [-0.06, -0.24, 0.08], 0.08, 0.1, robe);
      k.ball(m, -0.07, -0.29, 0.1, 0.05, 0.05, 0.05, paper);
      k.at(m, -0.07, -0.3, 0.18, 0, 0, 0, () => {
        m.box(0, 0, 0, 0.3, 0.16, 0.03, wood);
        m.box(0, 0, 0.0, 0.26, 0.12, 0.035, k.hex(0x2a1a12));
        for (let i = 0; i < 5; i++) {
          k.tube(m, [-0.12 + i * 0.06, -0.06, 0.0], [-0.12 + i * 0.06, 0.06, 0.0], 0.005, 0.005, wood, { caps: false });
          for (let j = 0; j < 3; j++) k.ball(m, -0.12 + i * 0.06, -0.04 + j * 0.035 + (i % 2) * 0.02, 0.0, 0.022, 0.014, 0.022, trim, { d: 0 });
        }
      });
    });
    return { kind: 'biped' };
  },

  // ---------- 盐 ----------
  saltcrab(k) {
    const { C } = k;
    const shell = k.hex(0xd86848), shellD = k.hex(0xa04a32), salt = k.hex(0xf4f6fa), crystal = k.hex(0xcfe8ff);
    k.part('body', 'root', [0, 0.32, 0], (m) => {
      k.ball(m, 0, 0, 0, 0.36, 0.17, 0.27, shell, { d: 2 });
      k.ball(m, 0, -0.08, 0.02, 0.3, 0.1, 0.22, shellD, { keep: (c) => c[1] < -0.2 });
      k.ball(m, 0, 0.13, -0.02, 0.27, 0.1, 0.2, salt, { keep: (c) => c[1] > 0.2, jitter: 0.25, d: 1, flat: true });
      for (let i = 0; i < 6; i++) {
        const a = i * 1.9, r = 0.1 + (i % 3) * 0.05;
        k.at(m, Math.cos(a) * r, 0.17, Math.sin(a) * r * 0.7 - 0.02, a, (i % 2 - 0.5) * 0.5, (i % 3 - 1) * 0.3, () => {
          m.frustum(0, 0, 0, 0.045, 0.14 + (i % 3) * 0.05, 0, 5, crystal, { emit: 0.35, capBottom: true });
        });
      }
    });
    k.part('head', 'body', [0, 0.05, 0.22], (m) => {
      for (const s of [-1, 1]) {
        k.tube(m, [s * 0.08, 0, 0], [s * 0.1, 0.16, 0.03], 0.022, 0.02, shellD);
        k.at(m, s * 0.1, 0.19, 0.04, 0, 0, 0, () => k.eye(m, 0.055, { side: s, iris: C.ink, lid: shell, sleepy: true, angle: 0.0 }));
      }
      k.at(m, 0, -0.02, 0.05, 0, 0, 0, () => k.mouth(m, 'smile', 0.1));
      k.blush(m, [0, -0.02, -0.17, 0.24, 0.1, 0.24], 0.5, 0.2, 0.04);
    });
    for (const s of [1, -1]) {
      const big = s > 0 ? 1.25 : 0.9;
      k.part('arm' + L(s), 'body', [s * 0.3, 0.0, 0.14], (m) => {
        k.chainTube(m, [[0, 0, 0], [s * 0.1, 0.05, 0.08], [s * 0.12, 0.08, 0.18]], 0.045, 0.04, shell);
        k.ball(m, s * 0.13, 0.1, 0.27, 0.1 * big, 0.08 * big, 0.12 * big, shell, { d: 2 });
        k.ball(m, s * 0.13, 0.17 * big, 0.26, 0.05 * big, 0.03, 0.06 * big, salt, { jitter: 0.3, flat: true });
      });
      k.part('pinch' + L(s), 'arm' + L(s), [s * 0.13, 0.07, 0.35 * big], (m) => k.ball(m, 0, -0.02, 0.03, 0.065 * big, 0.035 * big, 0.09 * big, shellD));
    }
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1, z = 0.08 - Math.floor(i / 2) * 0.11;
      k.part('c' + i, 'body', [s * 0.3, -0.03, z], (m) => k.chainTube(m, [[0, 0, 0], [s * 0.16, 0.07, 0], [s * 0.24, -0.29, 0.02]], 0.035, 0.02, shell));
    }
    return { kind: 'crawl' };
  },

  saltfigure(k) {
    const { C } = k;
    const salt = k.hex(0xeef2f6), saltS = k.hex(0xc8d4de), cloth = k.hex(0x8aa4b8), glow = k.hex(0x7ad8ff), crystal = k.hex(0xd8f0ff);
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.1, 0.26, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.22, 0], 0.075, 0.07, saltS);
      k.ball(m, 0, -0.25, 0.04, 0.08, 0.04, 0.11, saltS);
    });
    k.part('body', 'root', [0, 0.26, 0], (m) => {
      m.frustum(0, 0, 0, 0.25, 0.52, 0.2, 12, cloth, { smooth: true, capBottom: true });
      m.frustum(0, 0.3, 0, 0.23, 0.52, 0.2, 12, salt, { smooth: true });
      for (let i = 0; i < 5; i++) k.at(m, Math.cos(i * 1.3) * 0.2, 0.08 + i * 0.08, Math.sin(i * 1.3) * 0.17, i * 1.3, 0.3, 0.4, () => m.frustum(0, 0, 0, 0.04, 0.13, 0, 4, crystal, { emit: 0.3, capBottom: true }));
      k.at(m, 0.0, 0.22, 0.22, 0, 0, 0, () => {
        m.box(0, 0, 0, 0.12, 0.003, 0.003, glow, { emit: 1.5, rz: 0.7 });
        m.box(0.04, -0.03, 0, 0.08, 0.003, 0.003, glow, { emit: 1.5, rz: -0.4 });
      });
      // 背着的包袱
      k.ball(m, 0, 0.3, -0.24, 0.18, 0.16, 0.12, saltS, { d: 2 });
      k.tube(m, [0.15, 0.48, 0.05], [-0.18, 0.12, 0.2], 0.02, 0.02, saltS);
    });
    k.part('head', 'body', [0, 0.52, 0.01], (m) => {
      const h = [0, 0.18, 0.02, 0.22, 0.23, 0.21];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], salt, { d: 2 });
      k.ball(m, 0, 0.26, -0.02, 0.23, 0.16, 0.22, saltS, { d: 2, keep: (c) => c[1] > 0.2 && c[2] < 0.6 });
      k.ball(m, 0, 0.36, -0.12, 0.09, 0.08, 0.09, saltS);
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.34, 0.06, () => {
        k.ball(m, 0, 0, 0, 0.055, 0.04, 0.02, k.hex(0x2a3a4a));
        k.ball(m, 0, -0.005, 0.012, 0.03, 0.02, 0.01, glow, { emit: 1.6 });
      }, 0.97);
      k.onHead(m, h, 0, -0.32, () => k.mouth(m, 'frown', 0.1, { line: k.hex(0x6a7a8a) }), 0.99);
      k.onHead(m, h, -0.55, 0.3, () => {
        m.box(0, 0, 0, 0.004, 0.14, 0.004, k.hex(0x9ab0c0), { rz: 0.4 });
        m.box(0.03, -0.05, 0, 0.004, 0.07, 0.004, k.hex(0x9ab0c0), { rz: -0.4 });
      }, 1.0);
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.5, 0.8, () => m.frustum(0, 0, 0, 0.03, 0.12, 0, 4, crystal, { emit: 0.4, capBottom: true }), 0.9);
    });
    for (const s of [1, -1]) k.part('arm' + L(s), 'body', [s * 0.23, 0.44, 0], (m) => {
      k.tube(m, [0, 0, 0], [s * 0.04, -0.15, 0.06], 0.065, 0.06, cloth);
      k.tube(m, [s * 0.04, -0.15, 0.06], [s * 0.04, -0.27, 0.1], 0.055, 0.05, salt);
      k.ball(m, s * 0.04, -0.3, 0.11, 0.06, 0.06, 0.06, salt);
      k.at(m, s * 0.04, -0.33, 0.12, 0, 0, 0, () => m.frustum(0, 0, 0, 0.04, -0.09, 0, 5, crystal, { emit: 0.35, capBottom: true }));
    });
    return { kind: 'biped' };
  },

  saltferryman(k) {
    const { C } = k;
    const straw = k.hex(0xc8a464), strawD = k.hex(0x8a6a3a), skin = k.hex(0xd8b896), beard = k.hex(0xf2eee4), oar = k.hex(0x7a5232), red = k.hex(0xc8382e), salt = k.hex(0xeef4f8);
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.11, 0.26, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.22, 0], 0.06, 0.05, k.hex(0x4a4038));
      k.ball(m, 0, -0.25, 0.04, 0.07, 0.04, 0.1, strawD);
    });
    k.part('body', 'root', [0, 0.28, 0], (m) => {
      m.frustum(0, 0, 0, 0.22, 0.5, 0.18, 12, k.hex(0x3a4a5a), { smooth: true, capBottom: true });
      // 蓑衣：一层层往下披的草
      for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2 + r * 0.2;
        const rad = 0.24 + r * 0.03, y = 0.5 - r * 0.15;
        k.at(m, Math.cos(a) * (rad - r * 0.03 - 0.05), y, Math.sin(a) * (rad - r * 0.03 - 0.05), Math.PI / 2 - a, 0, 0, () => m.frustum(0, 0, 0, 0.04, -0.25, 0, 3, r % 2 ? straw : strawD, { rot: 0.3 }));
      }
      for (let i = 0; i < 5; i++) k.ball(m, Math.cos(i * 2.1) * 0.24, 0.06 + i * 0.07, Math.sin(i * 2.1) * 0.2, 0.03, 0.025, 0.03, salt, { flat: true, d: 0 });
    });
    k.part('head', 'body', [0, 0.5, 0.02], (m) => {
      const h = [0, 0.16, 0.02, 0.21, 0.2, 0.2];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], skin, { d: 2 });
      k.ball(m, 0, 0.06, 0.08, 0.19, 0.15, 0.16, beard, { d: 2, keep: (c) => c[1] < -0.1 && c[2] > -0.1 });
      k.chainTube(m, [[0, -0.02, 0.18], [0, -0.14, 0.2], [0.02, -0.26, 0.16]], 0.06, 0.02, beard);
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.34, 0.14, () => { m.box(0, 0, 0, 0.055, 0.016, 0.02, C.ink, { rz: s * 0.1 }); }, 1.0);
      k.brow(m, h, 0.34, 0.3, 0.09, -0.3, beard);
      k.onHead(m, h, 0, 0.0, () => k.ball(m, 0, 0, 0.01, 0.04, 0.035, 0.04, k.hex(0xe0a088)), 0.97);
      // 斗笠
      m.frustum(0, 0.28, 0, 0.48, 0.5, 0.0, 16, straw, { capBottom: true, smooth: true });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.tube(m, [Math.cos(a) * 0.46, 0.285, Math.sin(a) * 0.46], [0, 0.49, 0], 0.006, 0.006, strawD, { caps: false }); }
      m.frustum(0, 0.32, 0, 0.36, 0.34, 0.33, 16, red, {});
      for (let i = 0; i < 6; i++) k.ball(m, Math.cos(i) * 0.3, 0.33 + (i % 2) * 0.04, Math.sin(i) * 0.3, 0.04, 0.02, 0.04, salt, { flat: true, d: 0 });
    });
    k.part('armR', 'body', [-0.24, 0.42, 0.02], (m) => {
      k.tube(m, [0, 0, 0], [-0.05, -0.24, 0.1], 0.07, 0.06, straw);
      k.ball(m, -0.05, -0.27, 0.12, 0.05, 0.05, 0.05, skin);
    });
    k.part('oar', 'armR', [-0.05, -0.27, 0.13], (m) => {
      k.tube(m, [0, -0.1, 0], [0, 1.0, 0], 0.025, 0.025, oar, { caps: false });
      k.ball(m, 0, -0.22, 0, 0.08, 0.17, 0.025, oar, { d: 2 });
      k.ball(m, 0, 1.0, 0, 0.04, 0.03, 0.04, oar);
      k.tube(m, [0, 0.82, 0], [0, 0.62, 0.0], 0.006, 0.006, red, { caps: false });
      k.ball(m, 0, 0.58, 0, 0.035, 0.05, 0.035, red, { emit: 0.3 });
    });
    k.part('armL', 'body', [0.24, 0.42, 0.02], (m) => {
      k.tube(m, [0, 0, 0], [0.04, -0.27, 0.06], 0.07, 0.06, straw);
      k.ball(m, 0.04, -0.3, 0.07, 0.05, 0.05, 0.05, skin);
      for (let i = 0; i < 3; i++) m.frustum(0.04, -0.36 - i * 0.012, 0.08, 0.04, -0.35 - i * 0.012, 0.04, 10, k.hex(0xb89040), {});
    });
    return { kind: 'biped' };
  },

  // ---------- 墨 ----------
  inkblot(k) {
    const { C } = k;
    const ink = k.hex(0x221e2e), inkL = k.hex(0x3e3654), shine = k.hex(0x8a80b0), red = k.hex(0xd8342c);
    k.part('body', 'root', [0, 0, 0], (m) => {
      k.ball(m, 0, 0.36, 0, 0.42, 0.38, 0.38, ink, { d: 2 });
      k.ball(m, 0, 0.06, 0, 0.55, 0.08, 0.5, ink, { d: 2 });
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + 0.3;
        k.ball(m, Math.cos(a) * 0.5, 0.03, Math.sin(a) * 0.46, 0.13, 0.05, 0.13, inkL);
      }
      k.ball(m, -0.18, 0.6, 0.22, 0.08, 0.05, 0.04, shine, { emit: 0.25 });
      const h = [0, 0.36, 0, 0.42, 0.38, 0.38];
      k.onHead(m, h, 0, 0.12, () => k.eye(m, 0.13, { iris: k.hex(0xd04a3a) }), 0.93);
      for (const [y, p, r] of [[0.55, 0.45, 0.05], [-0.5, 0.3, 0.06], [0.75, -0.1, 0.045]]) k.onHead(m, h, y, p, () => k.eye(m, r, { iris: k.hex(0xe8a030), lid: ink, angle: 0.3 }), 0.95);
      k.onHead(m, h, 0, -0.3, () => k.mouth(m, 'zig', 0.24), 0.97);
      // 打错的红叉
      k.onHead(m, h, -0.9, 0.0, () => { for (const s of [-1, 1]) m.box(0, 0, 0, 0.22, 0.04, 0.02, red, { rz: s * 0.78, emit: 0.4 }); }, 1.0);
    });
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.8;
      k.part('t' + i, 'body', [Math.cos(a) * 0.38, 0.5, Math.sin(a) * 0.3], (m) => {
        const d = [Math.cos(a), Math.sin(a)];
        k.chainTube(m, [[0, 0, 0], [d[0] * 0.15, 0.12, d[1] * 0.12], [d[0] * 0.22, 0.28, d[1] * 0.15]], 0.07, 0.03, ink);
        k.ball(m, d[0] * 0.22, 0.31, d[1] * 0.15, 0.04, 0.05, 0.04, inkL);
      });
    }
    for (let i = 0; i < 3; i++) k.part('c' + i, 'body', [(i - 1) * 0.25, 0.2, 0.3], (m) => {
      m.frustum(0, 0, 0, 0.04, -0.14, 0.02, 6, ink, { smooth: true });
      k.ball(m, 0, -0.16, 0, 0.035, 0.05, 0.035, ink);
    });
    return { kind: 'blob' };
  },

  inkbrush(k) {
    const { C } = k;
    const bamboo = k.hex(0x8a5a30), band = k.hex(0xd8b048), hair = k.hex(0xd8302a), hairD = k.hex(0x8a1a1a), jade = k.hex(0x58c09a);
    k.part('body', 'root', [0, 0.85, 0], (m) => {
      k.tube(m, [0, -0.25, 0], [0, 0.55, 0], 0.11, 0.09, bamboo, { segs: 12 });
      for (const y of [-0.15, 0.15, 0.42]) m.frustum(0, y, 0, 0.115, y + 0.04, 0.113, 12, k.shade(bamboo, 0.75), { smooth: true });
      m.frustum(0, -0.3, 0, 0.13, -0.18, 0.13, 12, band, { smooth: true, capBottom: true });
      k.ball(m, 0, 0.6, 0, 0.07, 0.05, 0.07, band);
      k.chainTube(m, [[0, 0.62, 0], [0, 0.72, 0], [0.06, 0.78, 0]], 0.012, 0.012, hairD);
      k.ball(m, 0.08, 0.74, 0, 0.04, 0.06, 0.02, jade, { emit: 0.35 });
      const h = [0, 0.15, 0, 0.11, 0.3, 0.11];
      k.at(m, 0, 0.2, 0.1, 0, 0, 0, () => {
        for (const s of [-1, 1]) k.at(m, s * 0.045, 0, 0, 0, 0, 0, () => k.eye(m, 0.04, { side: s, iris: k.hex(0x1a1a1a), lid: bamboo, angle: 0.5 }));
      });
      k.at(m, 0, 0.08, 0.11, 0, 0, 0, () => k.mouth(m, 'frown', 0.08));
      k.at(m, 0, 0.0, 0.11, 0, 0, 0, () => k.ball(m, 0, 0, 0, 0.035, 0.012, 0.01, k.hex(0xf06a6a)));
    });
    k.part('tip', 'body', [0, -0.3, 0], (m) => {
      k.ball(m, 0, -0.12, 0, 0.13, 0.17, 0.13, hair, { d: 2 });
      m.frustum(0, -0.2, 0, 0.11, -0.42, 0, 12, hair, { smooth: true });
      k.ball(m, 0, -0.38, 0, 0.03, 0.05, 0.03, hairD, { emit: 0.3 });
    });
    for (const s of [1, -1]) k.part('arm' + L(s), 'body', [s * 0.12, 0.1, 0], (m) => {
      k.chainTube(m, [[0, 0, 0], [s * 0.1, -0.05, 0.04], [s * 0.15, -0.14, 0.08]], 0.02, 0.016, bamboo);
      k.ball(m, s * 0.16, -0.17, 0.09, 0.035, 0.035, 0.035, bamboo);
    });
    return { kind: 'float', float: 0.15 };
  },

  inkstele(k) {
    const { C } = k;
    const stone = k.hex(0x8a8c90), stoneD = k.hex(0x5c5e64), moss = k.hex(0x5a8a48), gold = k.hex(0xe8c060), glow = k.hex(0x7af0d0);
    k.part('body', 'root', [0, 0.36, 0], (m) => {
      k.ball(m, 0, 0, 0, 0.48, 0.22, 0.55, stoneD, { d: 2, keep: (c) => c[1] > -0.4 });
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        k.ball(m, Math.cos(a) * 0.22, 0.17, Math.sin(a) * 0.26, 0.12, 0.04, 0.12, stone, { flat: true, d: 0 });
      }
      k.ball(m, 0, 0.19, 0, 0.13, 0.05, 0.13, stone, { flat: true, d: 0 });
      for (let i = 0; i < 5; i++) k.ball(m, Math.cos(i * 1.7) * 0.4, 0.06, Math.sin(i * 1.7) * 0.46, 0.08, 0.04, 0.08, moss, { flat: true, d: 1 });
      // 碑
      m.box(0, 0.32, -0.04, 0.5, 0.16, 0.32, stoneD);
      m.box(0, 0.86, -0.04, 0.42, 0.95, 0.15, stone);
      k.ball(m, 0, 1.36, -0.04, 0.25, 0.14, 0.09, stone, { d: 1 });
      for (const s of [-1, 1]) k.chainTube(m, [[s * 0.2, 1.3, 0.04], [s * 0.08, 1.46, 0.05], [s * 0.02, 1.38, 0.06]], 0.035, 0.02, stoneD);
      m.box(0, 0.86, 0.04, 0.3, 0.75, 0.01, k.hex(0x6a6c72));
      for (let i = 0; i < 4; i++) m.box(0, 1.1 - i * 0.16, 0.047, 0.16, 0.022, 0.006, glow, { emit: 1.1 });
      k.at(m, 0, 0.5, 0.05, 0, 0, 0, () => k.eye(m, 0.07, { iris: glow, glow: 1.2, lid: stone, angle: 0, sleepy: true }));
      k.ball(m, 0.15, 1.2, 0.04, 0.06, 0.05, 0.03, moss, { flat: true, d: 1 });
    });
    k.part('head', 'body', [0, 0.02, 0.5], (m) => {
      const h = [0, 0.04, 0.12, 0.16, 0.14, 0.17];
      k.tube(m, [0, 0, -0.05], [0, 0.03, 0.08], 0.11, 0.1, stone);
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], stone, { d: 2 });
      k.eyes(m, h, { r: 0.045, yaw: 0.45, pitch: 0.25, iris: k.hex(0x2a2a2a), lid: stone, sleepy: true, angle: 0.15 });
      k.onHead(m, h, 0, -0.25, () => k.mouth(m, 'smile', 0.12), 0.98);
      for (const s of [-1, 1]) k.at(m, s * 0.08, 0.17, 0.1, 0, -0.4, -s * 0.3, () => k.cone(m, 0, 0, 0, 0.03, 0.08, gold, { segs: 5, emit: 0.2 }));
    });
    for (const [n, x, z] of [['legL', 0.32, 0.3], ['legR', -0.32, 0.3], ['legBL', 0.32, -0.3], ['legBR', -0.32, -0.3]]) k.part(n, 'root', [x, 0.3, z], (m) => {
      k.tube(m, [0, 0, 0], [x > 0 ? 0.06 : -0.06, -0.24, 0.02], 0.09, 0.09, stone);
      k.ball(m, x > 0 ? 0.06 : -0.06, -0.27, 0.05, 0.1, 0.05, 0.12, stoneD);
    });
    k.part('tail', 'body', [0, -0.02, -0.55], (m) => k.chainTube(m, [[0, 0, 0], [0.05, -0.06, -0.12], [0.1, -0.12, -0.16]], 0.06, 0.02, stone));
    return { kind: 'quad' };
  },

  // ---------- 窑 ----------
  kilncrow(k) {
    const { C } = k;
    const feather = k.hex(0x5a5a66), featherD = k.hex(0x3a3a46), belly = k.hex(0x8a8a96), beak = k.hex(0xe8a038), ember = C.ember;
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.08, 0.22, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.2, 0.02], 0.025, 0.02, k.hex(0x3a3434));
      for (const a of [-0.5, 0, 0.5]) k.at(m, 0, -0.21, 0.03, a, Math.PI / 2 - 0.2, 0, () => k.cone(m, 0, 0, 0, 0.015, 0.07, k.hex(0x3a3434), { segs: 4 }));
    });
    k.part('body', 'root', [0, 0.24, 0], (m) => {
      k.ball(m, 0, 0.2, -0.04, 0.24, 0.24, 0.28, feather, { d: 2 });
      k.ball(m, 0, 0.14, 0.08, 0.16, 0.16, 0.16, belly, { keep: (c) => c[2] > 0.1 });
      for (let i = 0; i < 4; i++) k.at(m, (i - 1.5) * 0.05, 0.12, -0.28, (i - 1.5) * 0.2, -1.1, 0, () => m.box(0, 0.12, 0, 0.07, 0.26, 0.02, featherD));
      for (let i = 0; i < 4; i++) k.ball(m, Math.cos(i * 1.6) * 0.2, 0.08 + i * 0.06, Math.sin(i * 1.6) * 0.2 - 0.05, 0.03, 0.02, 0.03, k.hex(0xff6a2a), { emit: 1.2, d: 0 });
    });
    k.part('head', 'body', [0, 0.4, 0.08], (m) => {
      const h = [0, 0.1, 0.04, 0.17, 0.16, 0.16];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], feather, { d: 2 });
      k.at(m, 0, 0.18, -0.06, 0, -0.6, 0, () => { for (let i = -1; i <= 1; i++) k.at(m, i * 0.03, 0, 0, 0, 0, i * 0.4, () => k.cone(m, 0, 0, 0, 0.025, 0.12, featherD, { segs: 4 })); });
      k.at(m, 0, 0.07, 0.17, 0, Math.PI / 2, 0, () => k.cone(m, 0, 0, 0, 0.055, 0.15, beak, { segs: 8 }));
      k.ball(m, 0, 0.05, 0.31, 0.04, 0.04, 0.04, ember, { emit: 1.8 });
      k.eyes(m, h, { r: 0.045, yaw: 0.5, pitch: 0.2, iris: k.hex(0xe8401a), glow: 0.4 });
    });
    for (const s of [1, -1]) k.part('wing' + L(s), 'body', [s * 0.22, 0.28, -0.04], (m) => {
      k.at(m, s * 0.02, -0.1, -0.06, 0, -0.5, s * 0.12, () => {
        k.ball(m, 0, 0, 0, 0.05, 0.16, 0.2, feather, { d: 2 });
        for (let i = 0; i < 4; i++) k.at(m, 0, -0.1 - i * 0.012, -0.08 + i * 0.06, 0, -0.3 + i * 0.12, 0, () => k.ball(m, 0, -0.08, 0, 0.03, 0.12, 0.05, featherD));
      });
      k.ball(m, s * 0.05, -0.28, -0.12, 0.025, 0.025, 0.025, ember, { emit: 1.2, d: 0 });
    });
    return { kind: 'bird', hop: true };
  },

  kilnworker(k) {
    const { C } = k;
    const glaze = k.hex(0x4a7aa8), glazeD = k.hex(0x2e5278), clay = k.hex(0xc87a4a), apron = k.hex(0x6a5040), crack = k.hex(0xffa040), iron = k.hex(0x4a4a50);
    for (const s of [1, -1]) k.part('leg' + L(s), 'root', [s * 0.12, 0.28, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.24, 0], 0.08, 0.075, clay);
      k.ball(m, 0, -0.27, 0.04, 0.085, 0.045, 0.11, glazeD);
    });
    k.part('body', 'root', [0, 0.3, 0], (m) => {
      k.ball(m, 0, 0.26, 0, 0.31, 0.32, 0.26, glaze, { d: 2 });
      m.frustum(0, 0.46, 0, 0.18, 0.56, 0.14, 12, glaze, { smooth: true });
      k.ball(m, 0, 0.2, 0.1, 0.25, 0.26, 0.18, apron, { keep: (c) => c[2] > 0.3 });
      for (const s of [-1, 1]) k.tube(m, [s * 0.16, 0.36, 0.17], [s * 0.1, 0.52, 0.06], 0.012, 0.012, apron);
      // 釉面上裂开的火缝
      const cracks = [[0.2, 0.3, 0.6, 0.5], [-0.15, 0.15, -0.4, 0.7], [0.0, 0.45, 2.6, 0.4]];
      for (const [x, y, ry, rz] of cracks) k.at(m, Math.sin(ry) * 0.29, y, Math.cos(ry) * 0.25, ry, 0, rz, () => { m.box(0, 0, 0, 0.004, 0.14, 0.01, crack, { emit: 1.8 }); m.box(0.025, -0.06, 0, 0.004, 0.08, 0.01, crack, { emit: 1.8, rz: 0.8 }); });
    });
    k.part('head', 'body', [0, 0.56, 0], (m) => {
      const h = [0, 0.17, 0.01, 0.23, 0.22, 0.22];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], glaze, { d: 2 });
      m.frustum(0, 0.3, 0, 0.18, 0.4, 0.12, 12, glazeD, { smooth: true, capTop: true });
      m.frustum(0, 0.38, 0, 0.13, 0.42, 0.15, 12, glazeD, { smooth: true, capTop: true });
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.36, 0.08, () => {
        k.ball(m, 0, 0, 0, 0.05, 0.04, 0.02, k.hex(0x1a1414));
        k.ball(m, 0, 0, 0.012, 0.03, 0.022, 0.01, crack, { emit: 1.8 });
      }, 0.97);
      k.onHead(m, h, 0, -0.32, () => k.mouth(m, 'smile', 0.14, { line: crack }), 0.99);
      k.onHead(m, h, 0.6, 0.3, () => { m.box(0, 0, 0, 0.004, 0.13, 0.01, crack, { emit: 1.8, rz: 0.3 }); m.box(0.02, 0.05, 0, 0.004, 0.06, 0.01, crack, { emit: 1.8, rz: -0.6 }); }, 1.0);
      k.ball(m, -0.1, 0.27, 0.12, 0.05, 0.03, 0.03, k.hex(0x9ac4e8), { emit: 0.3 });
      // 汗巾
      m.frustum(0, 0.08, 0, 0.235, 0.14, 0.232, 14, k.hex(0xe8e0d0), { smooth: true });
      k.tube(m, [0.05, 0.11, -0.22], [0.12, -0.02, -0.28], 0.025, 0.015, k.hex(0xe8e0d0));
    });
    k.part('armR', 'body', [-0.31, 0.42, 0], (m) => {
      k.tube(m, [0, 0, 0], [-0.05, -0.22, 0.08], 0.085, 0.075, glaze);
      k.ball(m, -0.06, -0.26, 0.1, 0.065, 0.065, 0.065, clay);
    });
    k.part('tongs', 'armR', [-0.06, -0.27, 0.12], (m) => {
      for (const s of [-1, 1]) k.chainTube(m, [[0, -0.05, 0], [s * 0.03, 0.4, 0.0], [s * 0.05, 0.75, 0.0], [s * 0.015, 0.85, 0.0]], 0.018, 0.015, iron);
      k.ball(m, 0, 0.84, 0, 0.06, 0.05, 0.05, crack, { emit: 1.6 });
    });
    k.part('armL', 'body', [0.31, 0.42, 0], (m) => {
      k.tube(m, [0, 0, 0], [0.05, -0.27, 0.04], 0.085, 0.075, glaze);
      k.ball(m, 0.06, -0.31, 0.05, 0.065, 0.065, 0.065, clay);
    });
    return { kind: 'biped' };
  },

  kilnfire(k) {
    const { C } = k;
    const outer = k.hex(0xff6a1e), mid = k.hex(0xffa83a), core = k.hex(0xfff0b0), coal = k.hex(0x3a2420), brow = k.hex(0xffe6a0);
    k.part('body', 'root', [0, 0.25, 0], (m) => {
      // 炭盆
      m.frustum(0, 0, 0, 0.3, 0.16, 0.4, 14, coal, { smooth: true, capBottom: true });
      m.frustum(0, 0.16, 0, 0.4, 0.2, 0.42, 14, k.hex(0x5a3a2a), { smooth: true });
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; k.tube(m, [Math.cos(a) * 0.28, 0.02, Math.sin(a) * 0.28], [Math.cos(a) * 0.32, -0.22, Math.sin(a) * 0.32], 0.04, 0.03, coal); }
      for (let i = 0; i < 7; i++) { const a = i * 0.9; k.ball(m, Math.cos(a) * 0.25, 0.2, Math.sin(a) * 0.25, 0.08, 0.05, 0.08, k.hex(0xc0401a), { emit: 1.2, flat: true, d: 0 }); }
    });
    k.part('head', 'body', [0, 0.36, 0], (m) => {
      const h = [0, 0.26, 0.02, 0.32, 0.36, 0.3];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], outer, { d: 2, emit: 1.0 });
      k.ball(m, 0, 0.2, 0.08, 0.24, 0.28, 0.22, mid, { d: 2, emit: 1.1 });
      k.ball(m, 0, 0.14, 0.14, 0.15, 0.17, 0.14, core, { emit: 1.2 });
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.3, 0.12, () => {
        k.ball(m, 0, 0, 0, 0.06, 0.03, 0.03, coal);
      }, 0.98);
      k.brow(m, h, 0.3, 0.32, 0.14, -0.35, brow);
      k.onHead(m, h, 0, -0.25, () => k.mouth(m, 'o', 0.13, { col: coal }), 0.99);
      for (const s of [-1, 1]) k.chainTube(m, [[s * 0.1, 0.0, 0.26], [s * 0.2, -0.05, 0.26], [s * 0.3, 0.08, 0.2]], 0.03, 0.012, brow, { emit: 1.2 });
    });
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.5;
      k.part('flame' + i, 'head', [Math.sin(a) * 0.2, 0.48 - Math.abs(i - 2) * 0.06, Math.cos(a) * 0.02 - 0.05], (m) => {
        k.at(m, 0, 0, 0, 0, 0, -a * 0.4, () => {
          k.cone(m, 0, 0, 0, 0.12, 0.42 - Math.abs(i - 2) * 0.1, outer, { emit: 1.1, segs: 7 });
          k.cone(m, 0, 0, 0.02, 0.07, 0.3 - Math.abs(i - 2) * 0.07, mid, { emit: 1.2, segs: 6 });
        });
      });
    }
    for (const s of [1, -1]) k.part('arm' + L(s), 'head', [s * 0.3, 0.15, 0.05], (m) => {
      k.chainTube(m, [[0, 0, 0], [s * 0.15, -0.05, 0.05], [s * 0.22, 0.05, 0.12]], 0.08, 0.04, outer, { emit: 1.0 });
      k.ball(m, s * 0.23, 0.08, 0.13, 0.05, 0.06, 0.05, mid, { emit: 1.2 });
    });
    return { kind: 'float', float: 0 };
  },

  // ---------- 陵 ----------
  tombbeast(k) {
    const { C } = k;
    const stone = k.hex(0x9a9690), stoneD = k.hex(0x6a6660), moss = k.hex(0x6a9a4a), red = k.hex(0xc03a2e), gold = k.hex(0xe0b850);
    k.part('body', 'root', [0, 0.48, 0], (m) => {
      k.ball(m, 0, 0, -0.04, 0.3, 0.27, 0.4, stone, { d: 2 });
      k.ball(m, 0, 0.12, 0.2, 0.3, 0.26, 0.2, stoneD, { d: 2 });
      for (let i = 0; i < 4; i++) k.ball(m, Math.cos(i * 2.3) * 0.25, 0.15, Math.sin(i * 2.3) * 0.3 - 0.05, 0.08, 0.04, 0.08, moss, { flat: true, d: 1 });
      m.frustum(0, 0.16, 0.2, 0.25, 0.22, 0.24, 12, red, { smooth: true });
      k.ball(m, 0, 0.0, 0.43, 0.06, 0.06, 0.04, gold, { emit: 0.3 });
    });
    k.part('head', 'body', [0, 0.26, 0.3], (m) => {
      const h = [0, 0.08, 0.08, 0.25, 0.23, 0.22];
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.ball(m, Math.cos(a) * 0.24, 0.08 + Math.sin(a) * 0.22, -0.04, 0.09, 0.09, 0.08, stoneD); }
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], stone, { d: 2 });
      k.ball(m, 0, -0.02, 0.26, 0.13, 0.08, 0.08, stone);
      k.ball(m, 0, 0.04, 0.32, 0.05, 0.035, 0.03, stoneD);
      k.eyes(m, h, { r: 0.065, yaw: 0.36, pitch: 0.22, iris: k.hex(0xc0302a), lid: stoneD, angle: 0.45 });
      k.at(m, 0, -0.08, 0.27, 0, 0.3, 0, () => k.mouth(m, 'fang', 0.18));
      for (const s of [-1, 1]) k.at(m, s * 0.18, 0.28, 0.0, 0, -0.3, -s * 0.5, () => k.cone(m, 0, 0, 0, 0.05, 0.12, stoneD, { segs: 5 }));
      k.at(m, 0, 0.32, 0.05, 0, -0.3, 0, () => k.cone(m, 0, 0, 0, 0.04, 0.16, gold, { segs: 6, emit: 0.2 }));
    });
    for (const [n, x, z] of [['legL', 0.17, 0.22], ['legR', -0.17, 0.22], ['legBL', 0.17, -0.26], ['legBR', -0.17, -0.26]]) k.part(n, 'root', [x, 0.36, z], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.28, 0.02], 0.1, 0.09, stone);
      k.ball(m, 0, -0.31, 0.06, 0.1, 0.05, 0.12, stoneD);
      for (let i = -1; i <= 1; i++) k.ball(m, i * 0.045, -0.32, 0.17, 0.025, 0.02, 0.025, k.hex(0xe8e0d0), { d: 0 });
    });
    k.part('tail', 'body', [0, 0.1, -0.42], (m) => {
      k.chainTube(m, [[0, 0, 0], [0, 0.14, -0.08], [0, 0.26, -0.04]], 0.05, 0.035, stone);
      for (let i = 0; i < 3; i++) k.ball(m, (i - 1) * 0.05, 0.3, -0.04 + (i % 2) * 0.03, 0.07, 0.07, 0.07, stoneD);
    });
    return { kind: 'quad' };
  },

  tombthunder(k) {
    const { C } = k;
    const cloud = k.hex(0x5c6280), cloudL = k.hex(0x8a90b0), bolt = k.hex(0xfff070), tear = k.hex(0x8ad8ff), drum = k.hex(0xb83a2a), gold = k.hex(0xe8c050);
    k.part('body', 'root', [0, 1.0, 0], (m) => {
      const h = [0, 0, 0.02, 0.36, 0.28, 0.3];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], cloud, { d: 2 });
      for (const [x, y, z, r] of [[-0.3, 0.05, 0, 0.2], [0.32, 0.02, 0, 0.19], [-0.12, 0.22, -0.05, 0.2], [0.15, 0.2, -0.06, 0.19], [0, -0.14, -0.06, 0.24]]) k.ball(m, x, y, z, r, r * 0.9, r, cloudL, { d: 2 });
      k.ball(m, 0, -0.05, 0.12, 0.26, 0.2, 0.22, cloud, { d: 2 });
      const f = [0, -0.05, 0.12, 0.26, 0.2, 0.22];
      k.eyes(m, f, { r: 0.07, yaw: 0.33, pitch: 0.12, iris: k.hex(0x3a3a6a), lid: cloud, sleepy: true, angle: -0.35 });
      for (const s of [-1, 1]) k.onHead(m, f, s * 0.36, -0.15, () => {
        k.ball(m, 0, 0, 0, 0.025, 0.035, 0.02, tear, { emit: 0.9 });
        k.ball(m, 0, -0.08, 0.01, 0.022, 0.035, 0.02, tear, { emit: 0.9 });
      }, 1.0);
      k.onHead(m, f, 0, -0.42, () => k.mouth(m, 'o', 0.12), 0.97);
    });
    k.part('bob', 'body', [0, 0.05, -0.12], (m) => {
      // 背后一圈小鼓
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.05 + i / 5 * 0.9);
        k.at(m, Math.cos(a) * 0.55, Math.sin(a) * 0.42 - 0.05, 0, 0, Math.PI / 2, 0, () => {
          m.frustum(0, -0.04, 0, 0.09, 0.04, 0.09, 10, drum, { capTop: true, capBottom: true, smooth: true });
          m.frustum(0, 0.035, 0, 0.092, 0.045, 0.06, 10, gold, { capTop: true });
        });
        if (i < 5) k.tube(m, [Math.cos(a) * 0.55, Math.sin(a) * 0.42 - 0.05, -0.02], [Math.cos(a + Math.PI * 0.18) * 0.55, Math.sin(a + Math.PI * 0.18) * 0.42 - 0.05, -0.02], 0.015, 0.015, gold, { caps: false });
      }
    });
    for (const s of [1, -1]) k.part('arm' + L(s), 'body', [s * 0.38, -0.08, 0.06], (m) => {
      const z = [[0, 0, 0], [s * 0.1, -0.12, 0.03], [s * 0.04, -0.2, 0.05], [s * 0.12, -0.34, 0.08]];
      for (let i = 0; i < z.length - 1; i++) m.box((z[i][0] + z[i + 1][0]) / 2, (z[i][1] + z[i + 1][1]) / 2, (z[i][2] + z[i + 1][2]) / 2, 0.05, Math.hypot(z[i + 1][0] - z[i][0], z[i + 1][1] - z[i][1]) + 0.03, 0.03, bolt, { emit: 1.6, rz: Math.atan2(-(z[i + 1][0] - z[i][0]), z[i + 1][1] - z[i][1]) });
    });
    for (let i = 0; i < 4; i++) k.part('t' + i, 'body', [(i - 1.5) * 0.15, -0.26, 0.04], (m) => {
      k.ball(m, 0, -0.08, 0, 0.022, 0.04, 0.022, tear, { emit: 0.7 });
    });
    return { kind: 'float', float: 0.1 };
  },

  tombshadow(k) {
    const { C } = k;
    const shadow = k.hex(0x1e1a2e), shadowL = k.hex(0x3a3256), eye = k.hex(0xf0e0ff), halo = k.hex(0xe8d090), violet = k.hex(0xa080ff);
    k.part('body', 'root', [0, 0.28, 0], (m) => {
      m.frustum(0, 0, 0, 0.45, 0.9, 0.2, 14, shadow, { smooth: true });
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        k.at(m, Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4, -a, 0, 0, () => m.frustum(0, 0, 0, 0.09, -0.2 - (i % 3) * 0.06, 0, 5, shadow, {}));
      }
      m.frustum(0, 0.5, 0, 0.32, 0.92, 0.22, 14, shadowL, { smooth: true });
      for (let i = 0; i < 3; i++) m.box(0, 0.25 + i * 0.18, 0.28 - i * 0.04, 0.12, 0.012, 0.01, violet, { emit: 1.2 });
      for (const s of [-1, 1]) k.ball(m, s * 0.26, 0.86, 0, 0.13, 0.08, 0.13, shadowL);
    });
    k.part('head', 'body', [0, 0.92, 0], (m) => {
      const h = [0, 0.2, 0, 0.26, 0.28, 0.26];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], shadow, { d: 2 });
      k.ball(m, 0, 0.26, -0.04, 0.3, 0.32, 0.29, shadowL, { d: 2, keep: (c) => c[2] < 0.35 || c[1] > 0.55 });
      k.at(m, 0, 0.53, -0.04, 0, -0.5, 0, () => k.cone(m, 0, 0, 0, 0.12, 0.25, shadowL));
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.3, 0.05, () => {
        k.ball(m, 0, 0, 0, 0.065, 0.03, 0.02, eye, { emit: 1.8 });
      }, 0.97);
      k.onHead(m, h, 0, 0.42, () => k.ball(m, 0, 0, 0, 0.035, 0.05, 0.02, violet, { emit: 1.6 }), 0.98);
    });
    k.part('bob', 'head', [0, 0.25, -0.35], (m) => {
      k.at(m, 0, 0, 0, 0, Math.PI / 2, 0, () => {
        for (let i = 0; i < 24; i++) {
          const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2;
          k.tube(m, [Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42], [Math.cos(b) * 0.42, 0, Math.sin(b) * 0.42], 0.02, 0.02, halo, { emit: 1.2, caps: false, segs: 5 });
        }
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m.frustum(Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46, 0.03, 0.0, 0, 3, halo, { emit: 1.2 }); k.ball(m, Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48, 0.03, 0.03, 0.03, halo, { emit: 1.4, d: 0 }); }
      });
    });
    for (const s of [1, -1]) k.part('arm' + L(s), 'body', [s * 0.3, 0.8, 0], (m) => {
      k.tube(m, [0, 0, 0], [s * 0.1, -0.35, 0.1], 0.1, 0.13, shadowL);
      for (let i = -1; i <= 1; i++) k.chainTube(m, [[s * 0.1 + i * 0.03, -0.42, 0.12], [s * 0.12 + i * 0.04, -0.55, 0.16], [s * 0.1 + i * 0.05, -0.62, 0.22]], 0.022, 0.008, shadow);
      k.ball(m, s * 0.1, -0.38, 0.11, 0.07, 0.04, 0.07, violet, { emit: 0.8 });
    });
    return { kind: 'float', float: 0 };
  }
};
