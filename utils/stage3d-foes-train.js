// 历练的对手：尘壤、骸山、枯海各五种，按墟层轮换。每个函数拿到做模型的工具 k，用 k.part 拼部件。
const L = (k, s) => (s > 0 ? 'L' : 'R');

module.exports = {
  // ---------- 尘壤 ----------
  dog(k) {
    const { C } = k;
    const fur = k.hex(0xc68a52), cream = k.hex(0xf6e6c8), dark = k.hex(0x70482e), nose = k.hex(0x2a1c1a);
    k.part('body', 'root', [0, 0.5, 0], (m) => {
      k.ball(m, 0, 0, -0.02, 0.27, 0.25, 0.42, fur, { d: 2 });
      k.ball(m, 0, -0.09, 0.05, 0.2, 0.16, 0.32, cream);
      k.ball(m, 0.13, 0.12, -0.14, 0.13, 0.09, 0.18, dark);
      k.ball(m, -0.12, 0.15, 0.1, 0.08, 0.06, 0.1, dark);
      m.frustum(0, 0.08, 0.3, 0.2, 0.16, 0.19, 12, k.hex(0xc0392b), { smooth: true });
      k.ball(m, 0, 0.0, 0.47, 0.05, 0.05, 0.03, C.gold, { emit: 0.5 });
    });
    k.part('head', 'body', [0, 0.18, 0.34], (m) => {
      const h = [0, 0.1, 0.06, 0.23, 0.21, 0.21];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], fur, { d: 2 });
      k.ball(m, 0, 0.0, 0.24, 0.13, 0.1, 0.13, cream);
      k.ball(m, 0, 0.06, 0.36, 0.055, 0.042, 0.04, nose, { emit: 0.05 });
      k.ball(m, 0.012, 0.075, 0.385, 0.015, 0.01, 0.008, C.white, { emit: 1, d: 0 });
      for (const s of [-1, 1]) k.at(m, s * 0.15, 0.27, -0.01, 0, -0.15, -s * 0.5, () => {
        k.cone(m, 0, 0, 0, 0.09, 0.22, dark, { segs: 6 });
        k.cone(m, 0, 0.02, 0.04, 0.05, 0.14, k.hex(0xeba090), { segs: 5 });
      });
      k.eyes(m, h, { r: 0.058, yaw: 0.42, pitch: 0.2, iris: k.hex(0x5a3418), lid: fur, angle: 0.45 });
      k.at(m, 0, -0.07, 0.31, 0, 0.35, 0, () => k.mouth(m, 'fang', 0.15));
      k.ball(m, 0.05, -0.15, 0.3, 0.025, 0.04, 0.025, C.gold, { emit: 0.7 });
    });
    for (const [n, x, z] of [['legL', 0.14, 0.24], ['legR', -0.14, 0.24], ['legBL', 0.14, -0.24], ['legBR', -0.14, -0.24]]) {
      k.part(n, 'root', [x, 0.36, z], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.28, 0.02], 0.075, 0.065, fur);
        k.ball(m, 0, -0.31, 0.05, 0.08, 0.05, 0.1, cream);
      });
    }
    k.part('tail', 'body', [0, 0.1, -0.4], (m) => {
      k.chainTube(m, [[0, 0, 0], [0, 0.12, -0.1], [0, 0.27, -0.1]], 0.06, 0.035, fur);
      k.ball(m, 0, 0.29, -0.1, 0.05, 0.065, 0.05, cream);
    });
    return { kind: 'quad', hop: true };
  },

  scarecrow(k) {
    const { C } = k;
    const coat = k.hex(0xa0643a), straw = k.hex(0xf2cc72), sack = k.hex(0xdcbc88), wood = k.hex(0x6a4a30), red = k.hex(0xc63a2c);
    k.part('pole', 'root', [0, 0, 0], (m) => k.tube(m, [0, 0, 0], [0, 0.6, 0], 0.045, 0.045, wood));
    k.part('body', 'root', [0, 0.5, 0], (m) => {
      m.frustum(0, 0, 0, 0.3, 0.5, 0.2, 12, coat, { smooth: true, capBottom: true });
      m.frustum(0, 0.08, 0, 0.29, 0.14, 0.28, 12, k.hex(0x6a4224), { smooth: true });
      k.at(m, 0.1, 0.3, 0.235, 0, -0.2, 0.15, () => {
        m.box(0, 0, 0, 0.13, 0.13, 0.02, k.hex(0xe0aa4c));
        for (const s of [-1, 1]) m.box(0, 0, 0.012, 0.14, 0.015, 0.01, C.ink, { rz: s * 0.78 });
      });
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        m.frustum(Math.cos(a) * 0.27, 0.03, Math.sin(a) * 0.27, 0.05, -0.15 - (i % 3) * 0.03, 0, 4, straw, {});
      }
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        m.frustum(Math.cos(a) * 0.15, 0.46, Math.sin(a) * 0.15, 0.04, 0.6, 0, 4, straw, {});
      }
    });
    for (const s of [1, -1]) {
      k.part('arm' + L(k, s), 'body', [s * 0.18, 0.42, 0], (m) => {
        k.tube(m, [0, 0, 0], [s * 0.42, -0.04, 0], 0.1, 0.085, coat);
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2;
          k.at(m, s * 0.48, -0.04 + Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0, 0, -s * Math.PI / 2 + Math.cos(a) * 0.4, () => k.cone(m, 0, 0, 0, 0.035, 0.14, straw, { segs: 4 }));
        }
      });
    }
    k.part('head', 'body', [0, 0.52, 0], (m) => {
      const h = [0, 0.18, 0, 0.23, 0.23, 0.22];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], sack, { d: 2 });
      k.onHead(m, h, -0.36, 0.12, () => {
        k.ball(m, 0, 0, 0, 0.065, 0.065, 0.03, C.ink);
        k.ball(m, 0.02, 0.025, 0.025, 0.018, 0.018, 0.01, C.white, { emit: 1, d: 0 });
      });
      k.onHead(m, h, 0.36, 0.12, () => {
        for (const s of [-1, 1]) m.box(0, 0, 0, 0.11, 0.022, 0.02, C.ink, { rz: s * 0.78 });
      });
      k.onHead(m, h, 0, -0.28, () => {
        m.box(0, 0, 0, 0.2, 0.02, 0.02, C.ink, { rz: 0.06 });
        for (let i = -2; i <= 2; i++) m.box(i * 0.04, 0, 0.005, 0.012, 0.06, 0.012, C.ink);
      });
      m.frustum(0, 0.36, 0, 0.5, 0.39, 0.47, 16, straw, { smooth: true, capTop: true, capBottom: true });
      m.frustum(0, 0.38, 0, 0.24, 0.62, 0.16, 12, straw, { smooth: true, capTop: true });
      m.frustum(0, 0.39, 0, 0.245, 0.45, 0.235, 12, red, { smooth: true });
      // 帽檐上蹲着一只小乌鸦
      k.ball(m, 0.32, 0.47, 0.1, 0.07, 0.07, 0.09, k.hex(0x2a2a34));
      k.ball(m, 0.34, 0.56, 0.15, 0.05, 0.05, 0.05, k.hex(0x2a2a34));
      k.at(m, 0.35, 0.56, 0.19, 0, Math.PI / 2, 0, () => k.cone(m, 0, 0, 0, 0.018, 0.05, k.hex(0xf0a030), { segs: 4 }));
      k.ball(m, 0.37, 0.58, 0.18, 0.012, 0.012, 0.008, C.white, { emit: 1, d: 0 });
    });
    return { kind: 'biped', hop: true };
  },

  debt(k) {
    const { C } = k;
    const paper = k.hex(0xf6e4b4), ink = k.hex(0x221c1e), red = k.hex(0xcc3a2c);
    k.part('body', 'root', [0, 0.8, 0], (m) => {
      m.box(0, 0.16, 0, 0.62, 0.42, 0.06, paper, { rx: -0.07 });
      m.box(0, -0.22, 0.012, 0.62, 0.4, 0.06, paper, { rx: 0.08 });
      for (let i = 0; i < 6; i++) m.frustum(-0.26 + i * 0.104, -0.4, 0.03, 0.055, -0.52 - (i % 2) * 0.04, 0, 3, paper, {});
      m.box(0, 0.4, -0.01, 0.66, 0.1, 0.09, red);
      for (const x of [-0.24, 0.24]) k.ball(m, x, 0.4, 0.045, 0.025, 0.025, 0.01, k.C.gold, { emit: 0.5, d: 0 });
      // 「欠」字
      m.box(-0.12, -0.06, 0.045, 0.05, 0.16, 0.012, ink, { rz: -0.5 });
      m.box(0.03, -0.03, 0.045, 0.26, 0.045, 0.012, ink, { rz: 0.05 });
      m.box(0.15, -0.08, 0.045, 0.045, 0.12, 0.012, ink, { rz: 0.4 });
      m.box(-0.04, -0.25, 0.048, 0.05, 0.3, 0.012, ink, { rz: -0.55 });
      m.box(0.08, -0.28, 0.048, 0.05, 0.26, 0.012, ink, { rz: 0.7 });
      m.box(0.21, -0.36, 0.05, 0.1, 0.1, 0.014, red, { emit: 0.25 });
      for (const s of [1, -1]) k.at(m, s * 0.13, 0.2, 0.035, 0, 0, 0, () => k.eye(m, 0.07, { side: s, lid: paper, angle: 0.5, iris: k.hex(0x7a2a22) }));
      k.at(m, 0, 0.07, 0.04, 0, 0, 0, () => k.mouth(m, 'zig', 0.16));
    });
    for (const s of [1, -1]) {
      k.part('arm' + L(k, s), 'body', [s * 0.31, 0.05, 0], (m) => {
        k.tube(m, [0, 0, 0], [s * 0.14, -0.22, 0.06], 0.025, 0.022, ink);
        k.ball(m, s * 0.16, -0.25, 0.07, 0.05, 0.05, 0.05, ink);
      });
    }
    return { kind: 'float', float: 0.22 };
  },

  waiter(k) {
    const { C } = k;
    const robe = k.hex(0xc0443c), pants = k.hex(0x3a2c2c), metal = k.hex(0xdfe5ec), red = k.hex(0xd8463c);
    for (const s of [1, -1]) {
      k.part('leg' + L(k, s), 'root', [s * 0.12, 0.26, 0], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.2, 0], 0.085, 0.075, pants);
        k.ball(m, 0, -0.23, 0.04, 0.09, 0.05, 0.12, C.ink);
      });
    }
    k.part('body', 'root', [0, 0.28, 0], (m) => {
      k.ball(m, 0, 0.26, 0, 0.34, 0.32, 0.3, robe, { d: 2 });
      k.ball(m, 0, 0.2, 0.06, 0.28, 0.28, 0.25, C.white, { d: 2, keep: (c) => c[2] > 0.3 });
      m.frustum(0, 0.5, 0, 0.18, 0.58, 0.15, 12, C.white, { smooth: true });
      k.ball(m, 0.0, 0.3, 0.33, 0.045, 0.04, 0.02, red, { emit: 0.2 });
    });
    k.part('head', 'body', [0, 0.58, 0], (m) => {
      const h = [0, 0.2, 0.02, 0.27, 0.25, 0.25];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], C.skin, { d: 2 });
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.34, 0.1, () => {
        m.box(-0.022, 0.0, 0, 0.055, 0.02, 0.02, C.ink, { rz: 0.6 });
        m.box(0.022, 0.0, 0, 0.055, 0.02, 0.02, C.ink, { rz: -0.6 });
      }, 1.0);
      k.onHead(m, h, 0, -0.25, () => k.mouth(m, 'grin', 0.2));
      k.blush(m, h, 0.55, -0.08, 0.05);
      for (const s of [-1, 1]) k.ball(m, s * 0.27, 0.18, 0.0, 0.05, 0.07, 0.05, C.skin);
      m.frustum(0, 0.36, 0, 0.235, 0.5, 0.25, 14, C.white, { smooth: true });
      m.frustum(0, 0.39, 0, 0.239, 0.44, 0.243, 14, red, { smooth: true });
      k.ball(m, 0, 0.6, 0, 0.31, 0.15, 0.3, C.white, { d: 2 });
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2 + 0.4;
        k.ball(m, Math.cos(a) * 0.16, 0.68, Math.sin(a) * 0.16, 0.14, 0.1, 0.14, C.white);
      }
    });
    k.part('armR', 'body', [-0.31, 0.46, 0.02], (m) => {
      k.tube(m, [0, 0, 0], [-0.06, -0.17, 0.18], 0.08, 0.07, robe);
      k.ball(m, -0.07, -0.19, 0.22, 0.06, 0.06, 0.06, C.skin);
      m.frustum(-0.1, -0.22, 0.32, 0.25, -0.2, 0.26, 16, metal, { capTop: true, capBottom: true });
      k.ball(m, -0.1, -0.2, 0.32, 0.2, 0.17, 0.2, k.hex(0xcbd3dc), { d: 2, keep: (c) => c[1] > -0.05, emit: 0.1 });
      k.ball(m, -0.1, -0.02, 0.32, 0.035, 0.035, 0.035, k.C.gold, { emit: 0.3 });
    });
    k.part('armL', 'body', [0.31, 0.46, 0], (m) => {
      k.tube(m, [0, 0, 0], [0.05, -0.27, 0.04], 0.08, 0.07, robe);
      k.ball(m, 0.06, -0.31, 0.05, 0.06, 0.06, 0.06, C.skin);
    });
    return { kind: 'biped' };
  },

  scavenger(k) {
    const { C } = k;
    const cloak = k.hex(0x4e5668), cloakD = k.hex(0x383e4c), sack = k.hex(0x9a7a50), wood = k.hex(0x7a5634), skin = k.hex(0x9a9088);
    for (const s of [1, -1]) {
      k.part('leg' + L(k, s), 'root', [s * 0.1, 0.22, 0], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.17, 0], 0.07, 0.065, cloakD);
        k.ball(m, 0, -0.19, 0.04, 0.08, 0.05, 0.11, k.hex(0x3a2a22));
      });
    }
    k.part('body', 'root', [0, 0.3, 0], (m) => {
      m.frustum(0, -0.12, 0, 0.36, 0.62, 0.2, 12, cloak, { smooth: true, capBottom: true });
      m.frustum(0, 0.2, 0, 0.3, 0.25, 0.29, 12, k.hex(0xa08050), { smooth: true });
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        m.box(Math.cos(a) * 0.34, -0.12, Math.sin(a) * 0.34, 0.1, 0.08, 0.02, cloakD, { ry: -a + Math.PI / 2, rz: (i % 2 - 0.5) * 0.4 });
      }
      k.at(m, -0.12, 0.05, 0.3, -0.3, -0.1, 0, () => m.box(0, 0, 0, 0.12, 0.1, 0.02, k.hex(0x7a6a5a)));
    });
    k.part('pack', 'body', [0, 0.42, -0.27], (m) => {
      k.ball(m, 0, 0, 0, 0.31, 0.35, 0.25, sack, { d: 2 });
      k.cone(m, 0, 0.3, 0, 0.1, 0.12, sack);
      m.frustum(0, 0.28, 0, 0.08, 0.32, 0.08, 8, k.hex(0x5a4028), { smooth: true });
      k.at(m, 0.1, -0.05, -0.24, Math.PI + 0.3, 0, 0.2, () => {
        m.box(0, 0, 0, 0.14, 0.13, 0.02, k.hex(0xd8a860));
        for (const s of [-1, 1]) m.box(0, 0, 0.012, 0.15, 0.015, 0.01, C.ink, { rz: s * 0.78 });
      });
      k.tube(m, [-0.12, 0.2, 0.05], [-0.22, 0.48, 0.0], 0.04, 0.035, k.hex(0x4a8a5a), { emit: 0.15 });
    });
    k.part('head', 'body', [0, 0.66, 0.06], (m) => {
      const h = [0, 0.14, 0, 0.26, 0.27, 0.27];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], cloak, { d: 2 });
      k.ball(m, 0, 0.12, 0.1, 0.19, 0.2, 0.18, k.hex(0x13151b), { keep: (c) => c[2] > -0.1 });
      k.ball(m, 0.075, 0.16, 0.25, 0.045, 0.05, 0.03, C.ember, { emit: 1.6 });
      k.ball(m, -0.07, 0.14, 0.25, 0.03, 0.033, 0.02, C.ember, { emit: 1.3 });
      for (let i = -1; i <= 1; i++) k.at(m, i * 0.06, 0.02, 0.22, 0, 0.3, 0, () => k.cone(m, 0, 0, 0, 0.035, -0.12, k.hex(0xc8c4bc), { segs: 4 }));
      k.at(m, 0, 0.33, -0.12, 0, -0.7, 0, () => k.cone(m, 0, 0, 0, 0.11, 0.26, cloak));
    });
    k.part('armL', 'body', [0.27, 0.5, 0.04], (m) => {
      k.tube(m, [0, 0, 0], [0.04, -0.3, 0.06], 0.09, 0.08, cloakD);
      k.ball(m, 0.04, -0.33, 0.07, 0.055, 0.055, 0.055, skin);
    });
    k.part('staff', 'armL', [0.04, -0.33, 0.08], (m) => {
      k.tube(m, [0, -0.45, 0], [0, 0.85, 0], 0.035, 0.03, wood, { caps: false });
      k.chainTube(m, [[0, 0.85, 0], [0, 0.97, 0.06], [0, 0.97, 0.16], [0, 0.88, 0.2]], 0.032, 0.026, wood);
      k.tube(m, [0, 0.88, 0.2], [0, 0.78, 0.2], 0.006, 0.006, C.ink, { caps: false });
      m.frustum(0, 0.66, 0.2, 0.06, 0.78, 0.05, 8, k.hex(0x8a8a90), { capTop: true, capBottom: true });
      k.ball(m, 0, 0.72, 0.2, 0.04, 0.045, 0.04, C.ember, { emit: 1.4 });
    });
    k.part('armR', 'body', [-0.27, 0.5, 0.04], (m) => {
      k.tube(m, [0, 0, 0], [-0.04, -0.28, 0.1], 0.09, 0.08, cloakD);
      k.ball(m, -0.04, -0.31, 0.12, 0.055, 0.055, 0.055, skin);
      for (let i = -1; i <= 1; i++) k.tube(m, [-0.04 + i * 0.03, -0.33, 0.14], [-0.04 + i * 0.035, -0.4, 0.18], 0.015, 0.01, skin);
    });
    return { kind: 'biped' };
  },

  // ---------- 骸山 ----------
  bonehound(k) {
    const { C } = k;
    const bone = C.bone, dark = k.hex(0x241e22), fire = k.hex(0x6fe0ff);
    k.part('body', 'root', [0, 0.52, 0], (m) => {
      k.chainTube(m, [[0, 0.02, -0.36], [0, 0.07, -0.12], [0, 0.07, 0.12], [0, 0.04, 0.3]], 0.05, 0.045, bone);
      for (let i = 0; i < 4; i++) {
        const z = 0.2 - i * 0.1;
        for (const s of [-1, 1]) k.chainTube(m, [[0, 0.06, z], [s * 0.19, -0.02, z], [s * 0.13, -0.18, z + 0.03]], 0.026, 0.018, bone);
      }
      k.tube(m, [0, -0.19, 0.24], [0, -0.17, -0.06], 0.025, 0.02, bone);
      k.ball(m, 0, 0.0, -0.34, 0.14, 0.09, 0.11, bone);
      k.ball(m, 0, -0.04, 0.08, 0.09, 0.09, 0.11, fire, { emit: 1.3 });
    });
    for (const [i, z] of [[0, 0.05], [1, -0.15]]) {
      k.part('flame' + i, 'body', [0, 0.1, z], (m) => {
        k.cone(m, 0, 0, 0, 0.07, 0.22 - i * 0.05, fire, { emit: 1.2, segs: 6 });
        k.cone(m, 0, 0, 0, 0.035, 0.28 - i * 0.05, k.hex(0xdaf8ff), { emit: 1.4, segs: 5 });
      });
    }
    k.part('head', 'body', [0, 0.1, 0.36], (m) => {
      const h = [0, 0.06, 0.05, 0.18, 0.17, 0.19];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], bone, { d: 2 });
      k.ball(m, 0, -0.01, 0.2, 0.1, 0.08, 0.14, bone);
      for (const s of [-1, 1]) {
        k.onHead(m, h, s * 0.4, 0.2, () => {
          k.ball(m, 0, 0, 0, 0.065, 0.06, 0.035, dark);
          k.ball(m, 0, 0, 0.025, 0.028, 0.034, 0.015, fire, { emit: 1.8 });
        }, 0.92);
        k.at(m, s * 0.12, 0.2, -0.04, 0, -0.5, -s * 0.4, () => k.cone(m, 0, 0, 0, 0.04, 0.13, bone, { segs: 5 }));
        for (let i = 0; i < 3; i++) m.frustum(s * 0.075, -0.06, 0.16 + i * 0.06, 0.016, -0.11, 0, 3, C.tooth, {});
      }
      k.ball(m, 0, 0.03, 0.33, 0.035, 0.025, 0.02, dark);
    });
    k.part('jaw', 'head', [0, -0.07, 0.06], (m) => {
      k.ball(m, 0, -0.02, 0.12, 0.08, 0.035, 0.13, bone);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.cone(m, s * 0.055, 0, 0.1 + i * 0.06, 0.014, 0.045, C.tooth, { segs: 3 });
    });
    for (const [n, x, z] of [['legL', 0.13, 0.22], ['legR', -0.13, 0.22], ['legBL', 0.13, -0.3], ['legBR', -0.13, -0.3]]) {
      k.part(n, 'root', [x, 0.42, z], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.18, -0.03], 0.04, 0.03, bone);
        k.tube(m, [0, -0.18, -0.03], [0, -0.36, 0.02], 0.03, 0.025, bone);
        k.ball(m, 0, -0.39, 0.05, 0.05, 0.03, 0.07, bone);
      });
    }
    k.part('tail', 'body', [0, 0.02, -0.42], (m) => {
      for (let i = 0; i < 5; i++) k.ball(m, 0, 0.05 * i, -0.06 * i, 0.035 - i * 0.004, 0.03, 0.035, bone);
    });
    return { kind: 'quad', hop: true };
  },

  skeleton(k) {
    const { C } = k;
    const bone = C.bone, bronze = k.hex(0xb08440), rust = k.hex(0x704e34), red = k.hex(0xc0342a), dark = k.hex(0x221c20), ember = k.hex(0xff5a3a);
    for (const s of [1, -1]) {
      k.part('leg' + L(k, s), 'root', [s * 0.1, 0.42, 0], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.19, 0.01], 0.042, 0.035, bone);
        k.tube(m, [0, -0.2, 0.01], [0, -0.38, 0], 0.035, 0.03, bone);
        m.frustum(0, -0.33, 0.01, 0.07, -0.18, 0.065, 8, bronze, { smooth: true });
        k.ball(m, 0, -0.4, 0.05, 0.05, 0.03, 0.09, bone);
      });
    }
    k.part('body', 'root', [0, 0.44, 0], (m) => {
      k.ball(m, 0, 0, 0, 0.14, 0.07, 0.1, bone);
      m.frustum(0, -0.14, 0, 0.21, 0.04, 0.17, 10, rust, { smooth: true });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        m.box(Math.cos(a) * 0.2, -0.12, Math.sin(a) * 0.2, 0.08, 0.14, 0.02, bronze, { ry: -a + Math.PI / 2 });
      }
      k.tube(m, [0, 0, -0.03], [0, 0.34, -0.03], 0.035, 0.035, bone);
      for (let i = 0; i < 3; i++) {
        const y = 0.18 + i * 0.07;
        m.frustum(0, y, 0, 0.16 - i * 0.015, y + 0.03, 0.16 - i * 0.015, 12, bone, { smooth: true });
      }
      k.ball(m, 0, 0.27, 0.05, 0.19, 0.16, 0.13, bronze, { d: 2, keep: (c) => c[2] > 0.15 });
      k.ball(m, 0, 0.27, 0.17, 0.05, 0.05, 0.02, k.hex(0xe0b860), { emit: 0.2 });
      for (const s of [-1, 1]) k.ball(m, s * 0.2, 0.38, 0, 0.09, 0.06, 0.09, bronze);
    });
    k.part('head', 'body', [0, 0.46, 0], (m) => {
      const h = [0, 0.15, 0.02, 0.2, 0.19, 0.19];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], bone, { d: 2 });
      for (const s of [-1, 1]) k.onHead(m, h, s * 0.36, 0.08, () => {
        k.ball(m, 0, 0, 0, 0.065, 0.06, 0.035, dark);
        k.ball(m, 0, 0, 0.025, 0.024, 0.03, 0.015, ember, { emit: 1.8 });
      }, 0.9);
      k.onHead(m, h, 0, -0.1, () => k.ball(m, 0, 0, 0, 0.03, 0.035, 0.02, dark), 0.95);
      k.onHead(m, h, 0, -0.38, () => { for (let i = -2; i <= 2; i++) m.box(i * 0.032, 0, 0, 0.026, 0.04, 0.02, C.tooth); }, 0.93);
      k.ball(m, 0, 0.22, 0, 0.215, 0.18, 0.21, bronze, { d: 2, keep: (c) => c[1] > 0.12 });
      m.frustum(0, 0.24, 0, 0.225, 0.27, 0.225, 14, k.hex(0x8a6430), { smooth: true });
      k.tube(m, [0, 0.38, 0], [0, 0.46, -0.02], 0.025, 0.02, bronze);
      k.at(m, 0, 0.46, -0.02, 0, -0.9, 0, () => k.cone(m, 0, 0, 0, 0.07, 0.26, red));
    });
    k.part('jaw', 'head', [0, 0.02, 0.06], (m) => {
      k.ball(m, 0, -0.02, 0.04, 0.12, 0.05, 0.1, bone, { keep: (c) => c[1] < 0.4 });
      for (let i = -2; i <= 2; i++) m.box(i * 0.03, 0.02, 0.12, 0.022, 0.035, 0.02, C.tooth);
    });
    k.part('armL', 'body', [0.22, 0.38, 0], (m) => {
      k.tube(m, [0, 0, 0], [0.02, -0.16, 0.02], 0.035, 0.03, bone);
      k.tube(m, [0.02, -0.16, 0.02], [0.03, -0.3, 0.08], 0.03, 0.025, bone);
      k.ball(m, 0.03, -0.32, 0.09, 0.04, 0.04, 0.04, bone);
    });
    k.part('shield', 'armL', [0.08, -0.28, 0.12], (m) => {
      k.at(m, 0, 0, 0, 0.2, Math.PI / 2, 0, () => {
        m.frustum(0, -0.025, 0, 0.27, 0.025, 0.27, 16, rust, { capTop: true, capBottom: true });
        m.frustum(0, 0.024, 0, 0.27, 0.035, 0.24, 16, bronze, {});
        k.ball(m, 0, 0.04, 0, 0.07, 0.04, 0.07, bronze);
      });
    });
    k.part('armR', 'body', [-0.22, 0.38, 0], (m) => {
      k.tube(m, [0, 0, 0], [-0.02, -0.16, 0.02], 0.035, 0.03, bone);
      k.tube(m, [-0.02, -0.16, 0.02], [-0.02, -0.3, 0.06], 0.03, 0.025, bone);
      k.ball(m, -0.02, -0.32, 0.07, 0.04, 0.04, 0.04, bone);
    });
    k.part('spear', 'armR', [-0.02, -0.32, 0.07], (m) => {
      k.tube(m, [0, -0.35, 0], [0, 0.95, 0], 0.025, 0.025, k.hex(0x6a4a30), { caps: false });
      m.frustum(0, 0.95, 0, 0.05, 1.18, 0, 4, k.hex(0xb8c0c8), { emit: 0.15 });
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        m.frustum(Math.cos(a) * 0.03, 0.94, Math.sin(a) * 0.03, 0.025, 0.82, 0, 4, red, {});
      }
    });
    return { kind: 'biped' };
  },

  skullwisp(k) {
    const { C } = k;
    const bone = k.hex(0xf0e8d8), dark = k.hex(0x1e1a24), fire = k.hex(0x8affc8), fire2 = k.hex(0x40c8a0);
    k.part('body', 'root', [0, 0.9, 0], (m) => {
      const h = [0, 0, 0, 0.3, 0.28, 0.3];
      k.ball(m, 0, 0, 0, 0.3, 0.28, 0.3, bone, { d: 2 });
      for (const s of [-1, 1]) {
        k.onHead(m, h, s * 0.38, 0.05, () => {
          k.ball(m, 0, 0, 0, 0.1, 0.09, 0.05, dark);
          k.ball(m, 0, -0.01, 0.035, 0.04, 0.05, 0.02, fire, { emit: 1.8 });
          k.ball(m, 0.012, 0.012, 0.05, 0.012, 0.012, 0.006, C.white, { emit: 1.5, d: 0 });
        }, 0.9);
        k.ball(m, s * 0.2, -0.1, 0.18, 0.07, 0.05, 0.06, bone);
      }
      k.onHead(m, h, 0, -0.22, () => { k.ball(m, -0.02, 0, 0, 0.02, 0.035, 0.02, dark); k.ball(m, 0.02, 0, 0, 0.02, 0.035, 0.02, dark); }, 0.95);
      k.onHead(m, h, 0, -0.5, () => { for (let i = -2; i <= 2; i++) m.box(i * 0.04, 0, 0, 0.032, 0.05, 0.03, C.tooth); }, 0.9);
      k.at(m, 0.12, 0.18, 0.2, 0.3, -0.5, 0.4, () => { m.box(0, 0, 0, 0.012, 0.12, 0.01, dark); m.box(0.03, -0.06, 0, 0.012, 0.06, 0.01, dark, { rz: 0.8 }); });
    });
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.45;
      k.part('flame' + i, 'body', [Math.sin(a) * 0.18, 0.2, -Math.abs(Math.cos(a)) * 0.04 - 0.05], (m) => {
        k.cone(m, 0, 0, 0, 0.09, 0.32 - Math.abs(i - 2) * 0.06, fire2, { emit: 1.1, segs: 6 });
        k.cone(m, 0, 0, 0, 0.045, 0.24 - Math.abs(i - 2) * 0.04, fire, { emit: 1.4, segs: 5 });
      });
    }
    for (let i = 0; i < 3; i++) {
      k.part('t' + i, 'body', [(i - 1) * 0.12, -0.2, -0.05], (m) => {
        m.frustum(0, 0, 0, 0.1, -0.45 + Math.abs(i - 1) * 0.1, 0, 7, fire2, { emit: 0.9 });
      });
    }
    k.part('jaw', 'body', [0, -0.2, 0.06], (m) => {
      k.ball(m, 0, -0.04, 0.08, 0.19, 0.07, 0.16, bone, { keep: (c) => c[1] < 0.3 });
      for (let i = -2; i <= 2; i++) m.box(i * 0.04, 0.01, 0.22, 0.03, 0.045, 0.03, C.tooth);
    });
    for (const s of [1, -1]) {
      k.part('arm' + L(k, s), 'body', [s * 0.45, -0.12, 0.08], (m) => {
        k.ball(m, 0, 0, 0, 0.06, 0.04, 0.07, bone);
        for (let i = -1; i <= 1; i++) k.chainTube(m, [[i * 0.03, -0.02, 0.04], [i * 0.035, -0.08, 0.08], [i * 0.035, -0.12, 0.06]], 0.016, 0.012, bone);
      });
    }
    return { kind: 'float', float: 0.2 };
  },

  snowape(k) {
    const { C } = k;
    const fur = k.hex(0xf2f5fa), furS = k.hex(0xd0dbe8), face = k.hex(0x8a9ab6), ice = k.hex(0xbfe6ff);
    for (const s of [1, -1]) {
      k.part('leg' + L(k, s), 'root', [s * 0.17, 0.3, 0], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.22, 0], 0.12, 0.11, fur);
        k.ball(m, 0, -0.27, 0.05, 0.11, 0.05, 0.15, face);
      });
    }
    k.part('body', 'root', [0, 0.32, 0], (m) => {
      k.ball(m, 0, 0.3, 0, 0.42, 0.4, 0.34, fur, { d: 2 });
      k.ball(m, 0, 0.26, 0.12, 0.27, 0.27, 0.22, furS, { d: 2, keep: (c) => c[2] > 0.1 });
      for (let i = 0; i < 9; i++) {
        const a = -0.4 + i * 0.45;
        const y = 0.45 + (i % 3) * 0.08;
        k.at(m, Math.sin(a) * 0.33, y, -Math.cos(a) * 0.25, Math.PI + a, -0.9, 0, () => k.cone(m, 0, 0, 0, 0.06, 0.16, i % 2 ? fur : furS, { segs: 5 }));
      }
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        k.at(m, s * (0.3 - i * 0.06), 0.62 + i * 0.04, -0.08 - i * 0.04, 0, -0.2, -s * (0.3 + i * 0.2), () => k.cone(m, 0, 0, 0, 0.05, 0.2 - i * 0.04, ice, { emit: 0.35, segs: 5 }));
      }
    });
    k.part('head', 'body', [0, 0.68, 0.08], (m) => {
      const h = [0, 0.1, 0.02, 0.25, 0.23, 0.23];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], fur, { d: 2 });
      k.ball(m, 0, 0.05, 0.13, 0.18, 0.16, 0.13, face, { d: 2 });
      m.box(0, 0.16, 0.22, 0.3, 0.05, 0.08, k.hex(0x6a7892), { rx: 0.2 });
      const f = [0, 0.05, 0.13, 0.18, 0.16, 0.13];
      k.eyes(m, f, { r: 0.045, yaw: 0.4, pitch: 0.38, iris: k.hex(0x3aa0e0), lid: face, angle: 0.5 });
      k.onHead(m, f, 0, 0.0, () => k.ball(m, 0, 0, 0, 0.04, 0.03, 0.025, k.hex(0x3a4258)), 1.0);
      k.onHead(m, f, 0, -0.5, () => k.mouth(m, 'fang', 0.18), 0.98);
      for (const s of [-1, 1]) k.ball(m, s * 0.24, 0.1, 0, 0.05, 0.07, 0.04, face);
    });
    for (const s of [1, -1]) {
      k.part('arm' + L(k, s), 'body', [s * 0.4, 0.52, 0.02], (m) => {
        k.tube(m, [0, 0, 0], [s * 0.06, -0.4, 0.1], 0.13, 0.11, fur);
        k.ball(m, s * 0.07, -0.47, 0.12, 0.12, 0.11, 0.12, face);
      });
    }
    return { kind: 'biped' };
  },

  vulture(k) {
    const { C } = k;
    const feather = k.hex(0x4e3c36), featherD = k.hex(0x34262a), head = k.hex(0xdc8e7e), ruff = k.hex(0xf2eae0), beak = k.hex(0xdacba4), legc = k.hex(0x8a8078);
    for (const s of [1, -1]) {
      k.part('leg' + L(k, s), 'root', [s * 0.1, 0.32, 0], (m) => {
        k.tube(m, [0, 0, 0], [0, -0.3, 0.02], 0.04, 0.03, legc);
        for (const a of [-0.5, 0, 0.5]) k.at(m, 0, -0.31, 0.03, a, Math.PI / 2 - 0.2, 0, () => k.cone(m, 0, 0, 0, 0.018, 0.1, k.hex(0x3a3434), { segs: 4 }));
      });
    }
    k.part('body', 'root', [0, 0.34, 0], (m) => {
      k.ball(m, 0, 0.22, -0.05, 0.3, 0.32, 0.3, feather, { d: 2 });
      k.ball(m, 0, 0.16, 0.08, 0.2, 0.22, 0.2, k.hex(0x6e5650), { keep: (c) => c[2] > 0.1 });
      for (let i = 0; i < 5; i++) k.at(m, (i - 2) * 0.05, 0.04, -0.3, (i - 2) * 0.25, -0.9, 0, () => m.box(0, 0.12, 0, 0.08, 0.28, 0.02, featherD));
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        k.ball(m, Math.cos(a) * 0.17, 0.5, Math.sin(a) * 0.15 + 0.03, 0.08, 0.07, 0.08, ruff);
      }
    });
    k.part('head', 'body', [0, 0.52, 0.06], (m) => {
      k.tube(m, [0, 0, 0], [0, 0.14, 0.08], 0.07, 0.06, head);
      const h = [0, 0.2, 0.12, 0.13, 0.12, 0.13];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], head, { d: 2 });
      k.tube(m, [0, 0.18, 0.22], [0, 0.16, 0.35], 0.05, 0.035, beak);
      k.at(m, 0, 0.16, 0.35, 0, Math.PI - 0.5, 0, () => k.cone(m, 0, 0, 0, 0.035, 0.07, k.hex(0x3a3434), { segs: 5 }));
      k.eyes(m, h, { r: 0.04, yaw: 0.55, pitch: 0.18, iris: k.hex(0xe8b030), lid: head, angle: 0.55 });
      for (const s of [-1, 1]) k.ball(m, s * 0.1, 0.28, 0.08, 0.04, 0.025, 0.05, k.hex(0xc87666));
    });
    for (const s of [1, -1]) {
      k.part('wing' + L(k, s), 'body', [s * 0.27, 0.38, -0.02], (m) => {
        k.at(m, s * 0.03, -0.12, -0.06, 0, -0.45, s * 0.12, () => {
          k.ball(m, 0, 0, 0, 0.06, 0.2, 0.25, feather, { d: 2 });
          for (let i = 0; i < 5; i++) k.at(m, 0, -0.12 - i * 0.015, -0.12 + i * 0.06, 0, -0.35 + i * 0.12, 0, () => k.ball(m, 0, -0.1, 0, 0.035, 0.16, 0.06, i % 2 ? featherD : k.hex(0x2a1e22)));
        });
      });
    }
    return { kind: 'bird' };
  },

  // ---------- 枯海 ----------
  leapfish(k) {
    const { C } = k;
    const skin = k.hex(0x6aa8a4), spot = k.hex(0x3c6c74), belly = k.hex(0xf2e8d0), fin = k.hex(0xf4904c);
    k.part('body', 'root', [0, 0.42, 0], (m) => {
      k.ball(m, 0, 0, -0.06, 0.26, 0.26, 0.42, skin, { d: 2 });
      k.ball(m, 0, -0.1, 0.0, 0.2, 0.16, 0.34, belly, { keep: (c) => c[1] < 0.1 });
      for (let i = 0; i < 7; i++) {
        const a = i * 2.3;
        k.onHead(m, [0, 0, -0.06, 0.26, 0.26, 0.42], Math.cos(a) * 1.4, 0.5 + (i % 3) * 0.2, () => k.ball(m, 0, 0, 0, 0.04, 0.04, 0.012, spot, { d: 0 }), 0.99);
      }
      for (let i = 0; i < 4; i++) k.at(m, 0, 0.22, 0.05 - i * 0.1, 0, -0.3 - i * 0.12, 0, () => m.box(0, 0.08, 0, 0.02, 0.2 - i * 0.03, 0.1, fin));
    });
    k.part('head', 'body', [0, 0.04, 0.32], (m) => {
      const h = [0, 0.03, 0.08, 0.24, 0.22, 0.22];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], skin, { d: 2 });
      k.ball(m, 0, -0.06, 0.12, 0.2, 0.12, 0.18, belly, { keep: (c) => c[1] < -0.2 });
      k.onHead(m, h, 0, -0.25, () => k.mouth(m, 'zig', 0.26), 0.98);
      for (const s of [-1, 1]) {
        k.ball(m, s * 0.1, 0.23, 0.1, 0.085, 0.085, 0.085, skin);
        k.at(m, s * 0.1, 0.25, 0.16, s * 0.2, 0, 0, () => k.eye(m, 0.065, { side: s, iris: k.hex(0xe0c040), lid: skin, angle: 0.45 }));
      }
    });
    for (const s of [1, -1]) {
      k.part('leg' + L(k, s), 'root', [s * 0.2, 0.32, 0.2], (m) => {
        k.tube(m, [0, 0, 0], [s * 0.06, -0.24, 0.06], 0.06, 0.04, skin);
        k.ball(m, s * 0.07, -0.29, 0.1, 0.08, 0.025, 0.11, fin);
      });
    }
    k.part('tail', 'body', [0, 0.0, -0.44], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.1, -0.24], 0.15, 0.06, skin);
      for (const s of [-1, 1]) k.at(m, 0, -0.1, -0.26, 0, -0.5 + s * 0.5, 0, () => m.box(0, 0, -0.1, 0.02, 0.1, 0.2, fin));
    });
    return { kind: 'quad', hop: true };
  },

  hermit(k) {
    const { C } = k;
    const wood = k.hex(0x96643c), woodD = k.hex(0x5e3e26), sail = k.hex(0xece0c4), crab = k.hex(0xe8703e), crabD = k.hex(0xb04c2a);
    k.part('body', 'root', [0, 0.46, -0.12], (m) => {
      k.ball(m, 0, -0.04, 0, 0.44, 0.3, 0.38, wood, { flat: true, keep: (c) => c[1] < 0.35 });
      for (let i = 0; i < 3; i++) m.frustum(0, -0.18 + i * 0.1, 0, 0.36 + i * 0.03, -0.16 + i * 0.1, 0.37 + i * 0.03, 10, woodD, {});
      m.box(0, 0.22, -0.04, 0.38, 0.26, 0.3, woodD);
      m.box(0, 0.37, -0.04, 0.46, 0.05, 0.38, k.hex(0x4a3020));
      m.box(0, 0.24, 0.115, 0.1, 0.09, 0.01, k.hex(0xffd070), { emit: 1.2 });
      k.tube(m, [0.1, 0.38, -0.08], [0.1, 0.9, -0.08], 0.025, 0.02, woodD);
      m.box(0.1, 0.68, -0.02, 0.3, 0.36, 0.01, sail, { ry: 0.2, rz: 0.05 });
      for (let i = 0; i < 6; i++) k.ball(m, Math.cos(i * 1.7) * 0.36, -0.1 + (i % 3) * 0.08, Math.sin(i * 1.7) * 0.3, 0.035, 0.03, 0.035, k.hex(0xc8c4b8));
    });
    k.part('head', 'root', [0, 0.3, 0.22], (m) => {
      k.ball(m, 0, 0, 0.04, 0.22, 0.15, 0.16, crab, { d: 2 });
      for (const s of [-1, 1]) {
        k.tube(m, [s * 0.07, 0.08, 0.1], [s * 0.1, 0.24, 0.12], 0.025, 0.022, crabD);
        k.at(m, s * 0.1, 0.27, 0.13, 0, 0, 0, () => k.eye(m, 0.05, { side: s, iris: k.hex(0x222222) }));
      }
      k.at(m, 0, -0.03, 0.19, 0, 0, 0, () => k.mouth(m, 'frown', 0.1));
    });
    for (const s of [1, -1]) {
      const big = s < 0 ? 1.3 : 0.9;
      k.part('arm' + L(k, s), 'root', [s * 0.24, 0.28, 0.26], (m) => {
        k.tube(m, [0, 0, 0], [s * 0.08, 0.04, 0.16], 0.05, 0.045, crab);
        k.ball(m, s * 0.1, 0.06, 0.27, 0.11 * big, 0.09 * big, 0.13 * big, crab, { d: 2 });
        for (let i = 0; i < 3; i++) k.ball(m, s * 0.1 + (i - 1) * 0.04, 0.12 * big, 0.25, 0.02, 0.015, 0.02, crabD, { d: 0 });
      });
      k.part('pinch' + L(k, s), 'arm' + L(k, s), [s * 0.1, 0.02, 0.36 * big], (m) => {
        k.ball(m, 0, -0.03, 0.04, 0.07 * big, 0.04 * big, 0.1 * big, crabD);
      });
    }
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1;
      const z = 0.12 - Math.floor(i / 2) * 0.16;
      k.part('c' + i, 'root', [s * 0.28, 0.26, z], (m) => {
        k.chainTube(m, [[0, 0, 0], [s * 0.17, 0.08, 0], [s * 0.27, -0.24, 0.02]], 0.04, 0.025, crab);
      });
    }
    return { kind: 'crawl' };
  },

  jelly(k) {
    const { C } = k;
    const bell = k.hex(0xeaa2dc), inner = k.hex(0xffe2f6), frill = k.hex(0xc87ac8), tent = k.hex(0xf4bce8);
    k.part('body', 'root', [0, 0.98, 0], (m) => {
      const h = [0, 0, 0, 0.38, 0.3, 0.38];
      k.ball(m, 0, 0, 0, 0.38, 0.3, 0.38, bell, { d: 2, keep: (c) => c[1] > -0.25, emit: 0.35 });
      k.ball(m, 0, -0.04, 0, 0.2, 0.15, 0.2, inner, { emit: 0.8 });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + 0.3;
        k.ball(m, Math.cos(a) * 0.2, 0.22, Math.sin(a) * 0.2, 0.05, 0.03, 0.05, inner, { emit: 0.6, d: 0 });
      }
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2;
        k.ball(m, Math.cos(a) * 0.36, -0.07, Math.sin(a) * 0.36, 0.06, 0.04, 0.06, frill, { emit: 0.3 });
      }
      k.eyes(m, h, { r: 0.06, yaw: 0.3, pitch: 0.1, iris: k.hex(0x6a2a7a), lid: bell, sleepy: true, angle: 0.2 });
      k.onHead(m, h, 0, -0.18, () => k.mouth(m, 'frown', 0.1), 0.98);
      k.blush(m, h, 0.55, -0.08, 0.045);
    });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.5;
      k.part('t' + i, 'body', [Math.cos(a) * 0.26, -0.08, Math.sin(a) * 0.26], (m) => {
        const pts = [];
        for (let j = 0; j <= 5; j++) pts.push([Math.sin(j * 1.3 + i) * 0.05, -j * 0.14, Math.cos(j * 1.1 + i) * 0.04]);
        k.chainTube(m, pts, 0.035, 0.012, tent, { emit: 0.3 });
      });
    }
    for (const s of [1, -1]) {
      k.part('arm' + L(k, s), 'body', [s * 0.1, -0.1, 0.1], (m) => {
        const pts = [];
        for (let j = 0; j <= 4; j++) pts.push([s * (0.04 + Math.sin(j * 1.2) * 0.05), -j * 0.13, 0.04 * j]);
        k.chainTube(m, pts, 0.06, 0.025, frill, { emit: 0.25 });
      });
    }
    return { kind: 'float', float: 0.1 };
  },

  drowned(k) {
    const { C } = k;
    const skin = k.hex(0xa2c2ba), shirtW = k.hex(0xeeeee6), shirtB = k.hex(0x3a5a8e), pants = k.hex(0x5a4a3a), red = k.hex(0xc63a2e), weed = k.hex(0x4e8a42), beard = k.hex(0xdcd8cc), iron = k.hex(0x6a6e74);
    k.part('legL', 'root', [0.11, 0.3, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.24, 0], 0.085, 0.075, pants);
      k.ball(m, 0, -0.27, 0.04, 0.09, 0.05, 0.12, k.hex(0x2e2422));
    });
    k.part('legR', 'root', [-0.11, 0.3, 0], (m) => {
      k.tube(m, [0, 0, 0], [0, -0.1, 0], 0.085, 0.07, pants);
      k.tube(m, [0, -0.1, 0], [0, -0.3, 0], 0.04, 0.03, k.hex(0x8a6440));
    });
    k.part('body', 'root', [0, 0.32, 0], (m) => {
      for (let i = 0; i < 6; i++) m.frustum(0, i * 0.08, 0, 0.26 - i * 0.008, (i + 1) * 0.08, 0.26 - (i + 1) * 0.008, 12, i % 2 ? shirtB : shirtW, { smooth: true, capBottom: i === 0 });
      k.ball(m, 0, 0.48, 0, 0.21, 0.08, 0.2, skin);
      m.frustum(0, 0.02, 0, 0.27, 0.08, 0.27, 12, k.hex(0x4a3020), { smooth: true });
      m.box(0, 0.05, 0.27, 0.07, 0.06, 0.02, k.C.gold, { emit: 0.2 });
      for (let i = 0; i < 3; i++) k.chainTube(m, [[0.12 + i * 0.04, 0.48, 0.1 - i * 0.06], [0.2 + i * 0.03, 0.3, 0.2 - i * 0.05], [0.22, 0.15, 0.18 - i * 0.06]], 0.02, 0.012, weed);
    });
    k.part('head', 'body', [0, 0.52, 0.02], (m) => {
      const h = [0, 0.18, 0.02, 0.22, 0.21, 0.21];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], skin, { d: 2 });
      k.ball(m, 0, 0.22, 0, 0.23, 0.2, 0.22, red, { d: 2, keep: (c) => c[1] > 0.3 });
      k.ball(m, 0, 0.3, -0.22, 0.05, 0.05, 0.04, red);
      for (const s of [-1, 1]) m.box(s * 0.04, 0.22, -0.28, 0.04, 0.14, 0.02, red, { rz: s * 0.3, rx: 0.3 });
      k.ball(m, 0, 0.06, 0.08, 0.2, 0.15, 0.17, beard, { d: 2, keep: (c) => c[1] < -0.05 && c[2] > -0.2 });
      k.tube(m, [0, -0.06, 0.18], [0, -0.2, 0.14], 0.04, 0.02, beard);
      k.onHead(m, h, -0.36, 0.12, () => k.eye(m, 0.05, { side: 1, iris: k.hex(0x9ab8c8), lid: skin, sleepy: true, angle: 0.1 }));
      k.onHead(m, h, 0.36, 0.12, () => { k.ball(m, 0, 0, 0, 0.06, 0.055, 0.02, C.ink); }, 0.98);
      m.box(0, 0.32, 0.1, 0.46, 0.02, 0.02, C.ink, { rz: -0.35 });
      k.onHead(m, h, 0, -0.05, () => k.ball(m, 0, 0, 0.02, 0.05, 0.045, 0.05, k.hex(0x8eb0a8)), 0.98);
      k.onHead(m, h, 0.9, 0.4, () => {
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.at(m, 0, 0, 0, 0, 0, a, () => m.box(0, 0.035, 0, 0.03, 0.07, 0.02, k.hex(0xf08a3a))); }
      }, 1.0);
    });
    k.part('armL', 'body', [0.29, 0.42, 0], (m) => {
      k.tube(m, [0, 0, 0], [0.03, -0.16, 0.02], 0.075, 0.065, shirtW);
      k.tube(m, [0.03, -0.16, 0.02], [0.04, -0.28, 0.06], 0.06, 0.05, skin);
      k.tube(m, [0.04, -0.28, 0.06], [0.04, -0.34, 0.07], 0.02, 0.02, iron);
      k.chainTube(m, [[0.04, -0.34, 0.07], [0.04, -0.42, 0.08], [0.04, -0.44, 0.14], [0.04, -0.4, 0.17]], 0.016, 0.01, iron);
    });
    k.part('armR', 'body', [-0.29, 0.42, 0], (m) => {
      k.tube(m, [0, 0, 0], [-0.03, -0.16, 0.02], 0.075, 0.065, shirtW);
      k.tube(m, [-0.03, -0.16, 0.02], [-0.04, -0.28, 0.06], 0.06, 0.05, skin);
      k.ball(m, -0.04, -0.31, 0.07, 0.055, 0.055, 0.055, skin);
    });
    k.part('anchor', 'armR', [-0.04, -0.32, 0.09], (m) => {
      const rust = k.hex(0x7a5a46);
      k.tube(m, [0, -0.4, 0], [0, 0.12, 0], 0.03, 0.03, rust);
      m.box(0, 0.06, 0, 0.22, 0.04, 0.04, rust);
      k.chainTube(m, [[-0.18, -0.28, 0], [-0.12, -0.38, 0], [0, -0.42, 0], [0.12, -0.38, 0], [0.18, -0.28, 0]], 0.028, 0.028, rust);
      for (const s of [-1, 1]) k.at(m, s * 0.18, -0.28, 0, 0, 0, -s * 0.4, () => k.cone(m, 0, 0, 0, 0.05, 0.1, rust, { segs: 4 }));
    });
    return { kind: 'biped' };
  },

  octopus(k) {
    const { C } = k;
    const skin = k.hex(0xc0547e), spot = k.hex(0xe692b0), under = k.hex(0xf4ccc0), tin = k.hex(0x9aa0a8);
    k.part('body', 'root', [0, 0.56, 0], (m) => {
      const h = [0, 0.16, -0.04, 0.34, 0.38, 0.34];
      k.ball(m, h[0], h[1], h[2], h[3], h[4], h[5], skin, { d: 2 });
      for (let i = 0; i < 8; i++) k.onHead(m, h, i * 0.8 + 2.4, 0.3 + (i % 3) * 0.2, () => k.ball(m, 0, 0, 0, 0.05, 0.05, 0.012, spot, { d: 0 }), 0.99);
      k.eyes(m, h, { r: 0.08, yaw: 0.32, pitch: -0.12, iris: k.hex(0xf0c030), pupil: C.ink, lid: skin, angle: 0.45 });
      k.onHead(m, h, 0, -0.45, () => k.mouth(m, 'o', 0.12), 0.97);
      m.frustum(0, 0.46, -0.04, 0.22, 0.62, 0.24, 12, tin, { capTop: true, smooth: true });
      k.chainTube(m, [[-0.24, 0.6, -0.04], [-0.3, 0.68, -0.04], [-0.38, 0.64, -0.04]], 0.02, 0.02, k.hex(0x5a5048));
      k.ball(m, 0.1, 0.62, 0.12, 0.05, 0.02, 0.05, k.hex(0x7a8088), { flat: true });
    });
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + (i - 2.5) * 0.85 + Math.PI;
      const d = [Math.cos(a), Math.sin(a)];
      k.part('t' + i, 'body', [d[0] * 0.22, -0.2, d[1] * 0.22], (m) => {
        const pts = [[0, 0, 0], [d[0] * 0.14, -0.16, d[1] * 0.14], [d[0] * 0.32, -0.28, d[1] * 0.32], [d[0] * 0.46, -0.24, d[1] * 0.46], [d[0] * 0.5, -0.14, d[1] * 0.5]];
        k.chainTube(m, pts, 0.09, 0.025, skin);
        for (let j = 1; j < 4; j++) k.ball(m, pts[j][0], pts[j][1] - 0.06, pts[j][2], 0.03, 0.015, 0.03, under, { d: 0 });
      });
    }
    for (const s of [1, -1]) {
      k.part('arm' + L(k, s), 'body', [s * 0.28, -0.08, 0.1], (m) => {
        k.chainTube(m, [[0, 0, 0], [s * 0.12, 0.05, 0.06], [s * 0.18, 0.2, 0.1], [s * 0.15, 0.32, 0.12]], 0.08, 0.035, skin);
        if (s > 0) {
          k.tube(m, [s * 0.15, 0.3, 0.14], [s * 0.15, 0.5, 0.14], 0.055, 0.05, k.hex(0x58b878), { emit: 0.25, caps: false });
          k.tube(m, [s * 0.15, 0.5, 0.14], [s * 0.15, 0.6, 0.14], 0.03, 0.025, k.hex(0x58b878), { emit: 0.25 });
          k.ball(m, s * 0.15, 0.62, 0.14, 0.03, 0.02, 0.03, k.hex(0x8a6a40));
        } else {
          m.frustum(s * 0.15, 0.33, 0.13, 0.1, 0.48, 0.08, 10, k.hex(0x8a4a2a), { capTop: true, capBottom: true, smooth: true });
          k.tube(m, [s * 0.04, 0.42, 0.13], [s * 0.0, 0.47, 0.13], 0.02, 0.018, k.hex(0x8a4a2a));
          k.ball(m, s * 0.15, 0.5, 0.13, 0.03, 0.02, 0.03, k.hex(0x8a4a2a));
        }
      });
    }
    return { kind: 'blob' };
  }
};
