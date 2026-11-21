// 场景的 3D 渲染：手写 WebGL1，无第三方库、无贴图。
// 页面每帧把角色和历练的状态交给 render()，这里决定角色站在路上哪里、镜头怎么摆、场景长什么样。
// 只依赖 gl 上下文，小程序 <canvas type="webgl"> 和浏览器预览都能用。
const M = require('./stage3d-mesh.js');
const W = require('./stage3d-world.js');
const H = require('./stage3d-hero.js');

// 走一关的时长；页面的“走路”阶段按这个等。
const WALK_MS = 2600;
// 一次退好几关时走得快些，但总时长有个上限。
const WALK_MAX_MS = 4200;
// 角色盘坐时在画面上大约多高（rpx），脚底离场景底边多远（rpx）。
const HERO_RPX = 110;
const FEET_RPX = 70;
// 历练时角色让出右半边，和 wxss 里 .stage-fray .actor 的偏移一致（rpx）。
const FRAY_SHIFT_RPX = 80;
const FOV = 40 * Math.PI / 180;
const TILE_RADIUS = 17;
// 每帧最多新建几个地块；刚进一个场景时多建一些，配合淡入盖住。
const TILE_BUDGET = 2;
const TILE_BUDGET_FRESH = 4;
const TILE_KEEP = 60;
const FADE_MS = 360;

const LIT_VS = [
  'attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute vec2 aExt;',
  'uniform mat4 uVP; uniform mat4 uM; uniform float uTime; uniform vec3 uWorld;',
  'varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vE;',
  'void main(){',
  '  vec4 w = uM * vec4(aPos, 1.0); float s = aExt.x;',
  '  vec3 g = w.xyz + uWorld;',
  '  w.x += sin(uTime*1.1 + g.x*0.7 + g.z*0.4) * s * 0.07;',
  '  w.z += cos(uTime*0.9 + g.x*0.3) * s * 0.035;',
  '  vW = w.xyz; vN = mat3(uM[0].xyz, uM[1].xyz, uM[2].xyz) * aNor; vC = aCol; vE = aExt.y;',
  '  gl_Position = uVP * w;',
  '}'].join('\n');
const LIT_FS = [
  'precision mediump float;',
  'uniform vec3 uCam; uniform vec3 uL0p; uniform vec3 uL0c; uniform vec3 uL1p; uniform vec3 uL1c;',
  'uniform vec3 uMoon; uniform vec3 uMoonC; uniform vec3 uSky; uniform vec3 uLow; uniform vec3 uFog;',
  'uniform vec2 uFogP; uniform vec4 uTint; uniform float uFlash;',
  'varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vE;',
  'vec3 pt(vec3 p, vec3 c, vec3 n){ vec3 L = p - vW; float d2 = dot(L, L); float nd = dot(n, L * inversesqrt(d2 + 0.0001));',
  '  return c * clamp(nd*0.65+0.35, 0.0, 1.0) / (1.0 + d2*0.55); }',
  'void main(){',
  '  vec3 n = normalize(vN);',
  '  vec3 amb = mix(uLow, uSky, n.y*0.5+0.5) * (1.0 + uFlash*2.5);',
  '  float m = smoothstep(0.05, 0.55, dot(n, uMoon));',
  '  vec3 light = amb + uMoonC*m + pt(uL0p, uL0c, n) + pt(uL1p, uL1c, n);',
  '  vec3 base = mix(vC, uTint.rgb, uTint.a);',
  '  vec3 col = base * light + base * vE * 1.5;',
  '  float d = length(vW - uCam);',
  '  float f = 1.0 - exp(-max(d - uFogP.x, 0.0) * uFogP.y);',
  '  col = mix(col, uFog, clamp(f, 0.0, 1.0));',
  '  col = 1.0 - exp(-col * 1.5);',
  '  gl_FragColor = vec4(col, 1.0);',
  '}'].join('\n');
const SPR_VS = [
  'attribute vec3 aCen; attribute vec2 aCor; attribute vec2 aSize; attribute vec4 aCol;',
  'uniform mat4 uVP; uniform vec3 uRight; uniform vec3 uUp;',
  'varying vec2 vUv; varying vec4 vCol;',
  'void main(){ vec3 w = aCen + uRight*aCor.x*aSize.x + uUp*aCor.y*aSize.y; vUv = aCor; vCol = aCol; gl_Position = uVP * vec4(w, 1.0); }'].join('\n');
const SPR_FS = [
  'precision mediump float; varying vec2 vUv; varying vec4 vCol;',
  'void main(){ float a = smoothstep(1.0, 0.0, length(vUv)); a *= a; gl_FragColor = vec4(vCol.rgb * vCol.a * a, vCol.a * a); }'].join('\n');
const FX_VS = 'attribute vec2 aP; varying vec2 vUv; void main(){ vUv = aP*0.5+0.5; gl_Position = vec4(aP, 0.0, 1.0); }';
const FX_FS = [
  'precision mediump float; varying vec2 vUv; uniform float uTime; uniform float uMode; uniform float uAspect; uniform float uK;',
  'void main(){',
  '  if (uMode < 0.5) {',
  '    vec2 p = vec2(vUv.x * uAspect, vUv.y); vec2 o = vec2(0.05 * uAspect, 1.25);',
  '    vec2 dir = normalize(vec2(0.55, -1.0)); vec2 per = vec2(-dir.y, dir.x);',
  '    float ac = dot(p - o, per), al = dot(p - o, dir);',
  '    float st = 0.5 + 0.5*sin(ac*24.0 + sin(ac*9.0 + uTime*0.15)*2.5);',
  '    st = pow(st, 4.0) + 0.35*pow(0.5+0.5*sin(ac*6.0 - uTime*0.1), 6.0);',
  '    float fade = exp(-al*1.3) * smoothstep(0.0, 0.2, al) * smoothstep(0.75, 0.0, abs(ac - 0.25));',
  '    gl_FragColor = vec4(vec3(0.55, 0.72, 0.9) * st * fade * 0.4 * uK, 0.0);',
  '  } else if (uMode < 1.5) {',
  '    vec2 q = (vUv - vec2(0.5, 0.5)) * vec2(1.0, 1.25);',
  '    gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(0.35, 0.85, length(q)) * 0.75);',
  '  } else {',
  '    gl_FragColor = vec4(0.0, 0.0, 0.0, uK);',
  '  }',
  '}'].join('\n');

function compile(gl, vs, fs) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const u = {};
  const a = {};
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < nu; i++) {
    const n = gl.getActiveUniform(p, i).name;
    u[n] = gl.getUniformLocation(p, n);
  }
  for (let i = 0; i < na; i++) {
    const n = gl.getActiveAttrib(p, i).name;
    a[n] = gl.getAttribLocation(p, n);
  }
  return { p: p, u: u, a: a };
}
const LIT_LAYOUT = [['aPos', 3], ['aNor', 3], ['aCol', 3], ['aExt', 2]];
const SPR_LAYOUT = [['aCen', 3], ['aCor', 2], ['aSize', 2], ['aCol', 4]];
function bindAttrs(gl, prog, layout, stride) {
  let off = 0;
  for (let i = 0; i < layout.length; i++) {
    const loc = prog.a[layout[i][0]];
    if (loc !== undefined && loc >= 0) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, layout[i][1], gl.FLOAT, false, stride * 4, off * 4);
    }
    off += layout[i][1];
  }
}
function unbind(gl, prog) {
  for (const k in prog.a) if (prog.a[k] >= 0) gl.disableVertexAttribArray(prog.a[k]);
}

const ease = W.ease;
function approach(cur, target, rate, dt) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

const cameraFor = W.cameraFor;
const cameraAt = W.cameraAt;

// 走路的进度：前后各留一小段站起、坐下，中间匀速走完。
function walkProgress(walk, now) {
  if (!walk) return null;
  const p = Math.max(0, Math.min(1, (now - walk.at) / walk.ms));
  return { p: p, move: ease((p - 0.08) / 0.84), stand: ease(p / 0.08) * (1 - ease((p - 0.92) / 0.08)) };
}
function walkMs(from, to) {
  return Math.min(WALK_MAX_MS, WALK_MS * Math.max(1, Math.sqrt(Math.abs(to - from))));
}

function particleSet(kind, R) {
  const list = [];
  for (let i = 0; i < 44; i++) list.push([(R() - 0.5) * 14, R() * 3, (R() - 0.5) * 14, R() * 6.28, 0.5 + R() * 0.8]);
  return { kind: kind, list: list };
}

function createStage(gl, opts) {
  opts = opts || {};
  const actionMs = opts.actionMs || {};
  const lit = compile(gl, LIT_VS, LIT_FS);
  const spr = compile(gl, SPR_VS, SPR_FS);
  const fx = compile(gl, FX_VS, FX_FS);
  const mkBuf = (data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { buf: b, count: data.length / M.STRIDE };
  };
  const sprBuf = gl.createBuffer();
  const fxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fxBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const worlds = {};
  function worldFor(key) {
    if (!worlds[key]) {
      const gate = key.indexOf('gate:') === 0;
      const layer = gate ? 0 : Number(key.slice(6)) || 0;
      const gb = gate ? W.GATE_BIOMES[key.slice(5)] || 'paper' : '';
      worlds[key] = {
        key: key,
        world: new W.World({ seed: gate ? 900 + gb.length * 31 : 100 + layer * 77, pathSeed: gate ? 2.1 : 0.6 + layer, camSeed: gate ? 5 : 1 + layer, biomeAt: gate ? () => gb : (s) => W.biomeFor(layer, s) }),
        tiles: {},
        count: 0
      };
    }
    return worlds[key];
  }
  function dropWorld(w) {
    for (const k in w.tiles) gl.deleteBuffer(w.tiles[k].buf);
    w.tiles = {};
    w.count = 0;
  }

  let heroKey = '';
  let hero = null;
  const lamp = mkBuf(H.buildLamp());
  let width = 1;
  let height = 1;
  let rpx = 0.5;
  let last = 0;
  let actName = '';
  let actAt = 0;
  let hitMe = 0;
  let hitFoe = 0;
  let hitMeAt = -1e9;
  let hitFoeAt = -1e9;
  let anchorX = 0;
  let heroYaw = null;
  let shown = { key: '', s: 0 };
  let fade = { from: '', to: '', at: -1e9 };
  let particles = null;
  let particleKind = '';
  const R = M.rng(99);

  function heroParts(actor) {
    const key = [actor.realm, actor.sash, actor.old ? 1 : 0, actor.demon ? 1 : 0].join('|');
    if (key !== heroKey) {
      if (hero) for (const k in hero) gl.deleteBuffer(hero[k].buf);
      const parts = H.buildParts({ realm: actor.realm, sash: actor.sash, old: actor.old, demon: actor.demon });
      hero = {};
      for (const k in parts) hero[k] = mkBuf(parts[k]);
      heroKey = key;
    }
    return hero;
  }

  function ensureTiles(w, cx, cz, budget) {
    const t0 = Math.floor((cx - TILE_RADIUS) / W.TILE);
    const t1 = Math.floor((cx + TILE_RADIUS) / W.TILE);
    const u0 = Math.floor((cz - TILE_RADIUS) / W.TILE);
    const u1 = Math.floor((cz + TILE_RADIUS) / W.TILE);
    const want = [];
    for (let tx = t0; tx <= t1; tx++) {
      for (let tz = u0; tz <= u1; tz++) {
        const mx = (tx + 0.5) * W.TILE - cx;
        const mz = (tz + 0.5) * W.TILE - cz;
        const d = Math.hypot(mx, mz);
        if (d > TILE_RADIUS + W.TILE * 0.71) continue;
        want.push([d, tx, tz]);
      }
    }
    want.sort((a, b) => a[0] - b[0]);
    const list = [];
    for (let i = 0; i < want.length; i++) {
      const k = want[i][1] + ',' + want[i][2];
      let tile = w.tiles[k];
      if (!tile && budget > 0) {
        budget -= 1;
        tile = mkBuf(w.world.tile(want[i][1], want[i][2]));
        tile.tx = want[i][1];
        tile.tz = want[i][2];
        w.tiles[k] = tile;
        w.count += 1;
      }
      if (tile) list.push(tile);
    }
    if (w.count > TILE_KEEP) {
      for (const k in w.tiles) {
        const t = w.tiles[k];
        if (Math.hypot((t.tx + 0.5) * W.TILE - cx, (t.tz + 0.5) * W.TILE - cz) > TILE_RADIUS * 2.2) {
          gl.deleteBuffer(t.buf);
          delete w.tiles[k];
          w.count -= 1;
        }
      }
    }
    return list;
  }

  function sprites(list, vp, right, up) {
    if (!list.length) return;
    const C = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    const d = new Float32Array(list.length * 6 * 11);
    let o = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      for (let c = 0; c < 6; c++) {
        d[o++] = s[0]; d[o++] = s[1]; d[o++] = s[2]; d[o++] = C[c][0]; d[o++] = C[c][1];
        d[o++] = s[3]; d[o++] = s[4]; d[o++] = s[5]; d[o++] = s[6]; d[o++] = s[7]; d[o++] = s[8];
      }
    }
    gl.useProgram(spr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
    gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    bindAttrs(gl, spr, SPR_LAYOUT, 11);
    gl.uniformMatrix4fv(spr.u.uVP, false, vp);
    gl.uniform3fv(spr.u.uRight, right);
    gl.uniform3fv(spr.u.uUp, up);
    gl.drawArrays(gl.TRIANGLES, 0, list.length * 6);
    unbind(gl, spr);
  }

  function drawMesh(mesh, model) {
    gl.uniformMatrix4fv(lit.u.uM, false, model);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    bindAttrs(gl, lit, LIT_LAYOUT, M.STRIDE);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  function particleSprites(kind, t, ox, oz, list, origin) {
    const out = [];
    const wrap = (v) => ((v % 14) + 21) % 14 - 7;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      let x = wrap(f[0] - ox);
      let z = wrap(f[2] - oz);
      let y = f[1];
      let col = [0.75, 0.95, 0.5];
      let size = 0.06;
      let halo = 0.3;
      let a = 0.9;
      if (kind === 'firefly' || kind === 'spore' || kind === 'wisp' || kind === 'mote') {
        x += Math.sin(t * 0.3 * f[4] + f[3]) * 0.8;
        y = 0.3 + f[1] * 0.7 + Math.sin(t * 0.7 * f[4] + f[3] * 2) * 0.25;
        z += Math.cos(t * 0.25 * f[4] + f[3]) * 0.8;
        a = Math.max(0, Math.sin(t * 1.3 * f[4] + f[3] * 3));
        if (kind === 'spore') col = [0.4, 0.95, 0.9];
        if (kind === 'mote') { col = [0.85, 0.9, 1]; a *= 0.6; }
        if (kind === 'wisp') { col = [0.65, 0.45, 1]; size = 0.09; halo = 0.45; }
      } else if (kind === 'snow' || kind === 'ash' || kind === 'leaf') {
        y = 4 - ((t * (kind === 'snow' ? 0.5 : 0.3) * f[4] + f[1]) % 4);
        x += Math.sin(t * 0.8 + f[3]) * 0.4;
        col = kind === 'snow' ? [0.9, 0.95, 1] : kind === 'ash' ? [0.6, 0.58, 0.55] : [1, 0.5, 0.2];
        a = kind === 'ash' ? 0.35 : 0.7;
        halo = 0;
        size = kind === 'leaf' ? 0.07 : 0.05;
      } else if (kind === 'ember') {
        y = (t * 0.4 * f[4] + f[1]) % 3.5;
        x += Math.sin(t * 1.5 + f[3]) * 0.2;
        col = [1, 0.5, 0.15];
        a = 1 - y / 3.5;
        size = 0.045;
        halo = 0.2;
      }
      const wx = x + ox - origin[0];
      const wz = z + oz - origin[2];
      if (halo) out.push([wx, y, wz, halo, halo, col[0], col[1], col[2], 0.18 * a]);
      out.push([wx, y, wz, size, size, col[0], col[1], col[2], a]);
    }
    return out;
  }

  // 页面每帧调用。input：actor、bar 是页面数据，place 是角色停在第几关，walk 是 { from, to, at, ms }。
  function render(now, input) {
    const t = now / 1000;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const actor = input.actor || {};
    const bar = input.bar || {};
    const gate = bar.show && bar.scene ? bar.scene : '';
    const key = gate ? 'gate:' + gate : 'train:' + (actor.layer || 0);
    // 换世界（进出秘境、换墟层）时先暗下去再亮起来。
    if (key !== fade.to) {
      // 第一次画时直接从黑幕淡入。
      fade = { from: shown.key || key, to: key, at: shown.key ? now : now - FADE_MS };
    }
    const fk = (now - fade.at) / FADE_MS;
    const activeKey = fk < 1 ? fade.from : fade.to;
    const fadeAlpha = fk < 2 ? 1 - Math.abs(fk - 1) : 0;
    const wd = worldFor(activeKey);
    const world = wd.world;
    const path = world.path;
    for (const k in worlds) if (k !== activeKey && k !== fade.to && worlds[k].count) dropWorld(worlds[k]);

    // 角色在路上的位置
    const walking = !gate && activeKey === key ? walkProgress(input.walk, now) : null;
    let s = gate ? 1 : Math.max(0, input.place || 0);
    let dir = 1;
    if (walking) {
      s = M.lerp(input.walk.from, input.walk.to, walking.move);
      dir = input.walk.to >= input.walk.from ? 1 : -1;
    }
    if (activeKey !== shown.key) heroYaw = null;
    shown = { key: activeKey, s: s };
    const pos = path.at(s);
    const tan = path.tangent(s);
    const heading = Math.atan2(tan[0], tan[1]);
    const cam = cameraAt(world.camSeed, s);
    const az = heading + Math.PI + cam.az;
    const origin = [pos[0], 0, pos[1]];

    // 动作计时
    const action = actor.show ? actor.action || 'idle' : 'idle';
    if (action !== actName) {
      actName = action;
      actAt = now;
    }
    const ms = actionMs[action] || 1200;
    const loop = action === 'idle' || action === 'ponder' || action === 'brace';
    let p = H.pose(action, loop ? 0 : (now - actAt) / ms, t);
    if (bar.meHit !== hitMe) { hitMe = bar.meHit; if (hitMe) hitMeAt = now; }
    if (bar.foeHit !== hitFoe) { hitFoe = bar.foeHit; if (hitFoe) hitFoeAt = now; }
    if (loop) {
      const ka = (now - hitFoeAt) / 320;
      if (ka >= 0 && ka < 1) {
        const a = Math.sin(ka * Math.PI);
        p.armR = [0.6 + 1.0 * a, -0.25 + 0.2 * a, -0.3];
        p.twist = -0.25 * a;
        p.lean = 0.12 * a;
      }
      const kb = (now - hitMeAt) / 300;
      if (kb >= 0 && kb < 1) {
        const b = Math.sin(kb * Math.PI);
        p.lean -= 0.25 * b;
        p.tint = [1, 0.4, 0.4];
        p.tintK = 0.35 * b;
      }
    }
    const stand = walking ? walking.stand : 0;
    if (stand > 0) p = H.blendWalk(p, H.pose('walk', 0, walking.move * 6), stand);
    const rig = H.rig(p);

    // 角色朝向：走路朝前；坐着时朝镜头，历练时偏向右边来敌的方向。
    const faceCam = az + (bar.show ? 0.6 : 0.25);
    const yawTarget = stand > 0.5 ? (dir > 0 ? heading : heading + Math.PI) : faceCam;
    heroYaw = heroYaw === null ? yawTarget : M.lerpAngle(heroYaw, yawTarget, 1 - Math.exp(-8 * dt));
    const heroM = M.chain(M.translate(0, 0, 0), M.rotY(heroYaw));

    // 镜头
    const aspect = width / height;
    const fovF = 1 / Math.tan(FOV / 2);
    const dist = 1.3 * fovF * height / (2 * HERO_RPX * rpx) * cam.dist;
    const target = [0, 0.55, 0];
    const eye = [Math.sin(az) * Math.cos(cam.pitch) * dist, 0.55 + Math.sin(cam.pitch) * dist, Math.cos(az) * Math.cos(cam.pitch) * dist];
    const view = M.lookAt(eye, target, [0, 1, 0]);
    const proj = M.persp(FOV, aspect, 0.3, 80);
    let vp = M.mul(proj, view);
    anchorX = approach(anchorX, bar.show ? -2 * FRAY_SHIFT_RPX * rpx / width : 0, 5, dt || 1);
    const feet = M.apply(vp, [0, 0, 0]);
    const ay = -1 + 2 * FEET_RPX * rpx / height;
    const shift = M.identity();
    shift[12] = anchorX - feet[0];
    shift[13] = ay - feet[1];
    vp = M.mul(shift, vp);

    // 地块：以镜头看向的前方为中心
    const fwd = [-Math.sin(az), -Math.cos(az)];
    const cx = pos[0] + fwd[0] * 7;
    const cz = pos[1] + fwd[1] * 7;
    const tiles = ensureTiles(wd, cx, cz, wd.count < 12 ? TILE_BUDGET_FRESH : TILE_BUDGET);
    const b = world.biome(Math.round(s));

    // 灯：坐下时放在身旁地上，站起时提在左手
    const groundLamp = M.apply(heroM, [-0.62, 0.42, 0.08]);
    const handLamp = M.apply(M.mul(heroM, rig.handL), [0, 0, 0]);
    const lampPos = [M.lerp(groundLamp[0], handLamp[0], stand), M.lerp(groundLamp[1], handLamp[1], stand), M.lerp(groundLamp[2], handLamp[2], stand)];
    const flick = 1 + Math.sin(t * 9.1) * 0.06 + Math.sin(t * 23.7) * 0.04 + Math.sin(t * 3.3) * 0.05;
    const flare = actor.flare ? 1.7 : 1;
    const lampLight = [lampPos[0], lampPos[1] - 0.2, lampPos[2]];
    const accentPos = M.apply(M.rotY(az), [-2.2, 2.4, -2.6]);
    const storm = !!actor.storm;
    const flash = storm ? Math.max(0, Math.sin(((now - actAt) / ms) * Math.PI * 7)) * (((now - actAt) / ms) > 0.6 && ((now - actAt) / ms) < 0.85 ? 0.6 : 0.08) : 0;

    // ---------- 画 ----------
    const fog = b.fog;
    gl.viewport(0, 0, width, height);
    gl.clearColor(fog[0], fog[1], fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(lit.p);
    gl.uniformMatrix4fv(lit.u.uVP, false, vp);
    gl.uniform1f(lit.u.uTime, t);
    gl.uniform3fv(lit.u.uCam, eye);
    gl.uniform3fv(lit.u.uFog, fog);
    gl.uniform2fv(lit.u.uFogP, [dist + 3, b.fogDensity]);
    gl.uniform3fv(lit.u.uSky, M.shade(b.sky, storm ? 0.5 : 1));
    gl.uniform3fv(lit.u.uLow, b.low);
    gl.uniform3fv(lit.u.uMoon, M.norm([-0.55, 0.8, -0.35]));
    gl.uniform3fv(lit.u.uMoonC, M.shade(b.moon, storm ? 0.4 : 0.8));
    gl.uniform3fv(lit.u.uL0p, lampLight);
    gl.uniform3fv(lit.u.uL0c, [2.6 * flick * flare, 1.5 * flick * flare, 0.62 * flick * flare]);
    gl.uniform3fv(lit.u.uL1p, accentPos);
    gl.uniform3fv(lit.u.uL1c, M.shade(b.accent, 0.9));
    gl.uniform1f(lit.u.uFlash, flash);
    gl.uniform4fv(lit.u.uTint, [0, 0, 0, 0]);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const ox = tile.tx * W.TILE - origin[0];
      const oz = tile.tz * W.TILE - origin[2];
      gl.uniform3fv(lit.u.uWorld, [origin[0], 0, origin[2]]);
      drawMesh(tile, M.translate(ox, 0, oz));
    }
    gl.uniform3fv(lit.u.uWorld, [0, 0, 0]);
    // 灯
    const swing = stand * Math.sin(t * 9) * 0.25;
    drawMesh(lamp, M.chain(M.translate(lampPos[0], lampPos[1], lampPos[2]), M.rotY(heroYaw), M.rotX(swing)));
    // 角色
    if (actor.show) {
      const parts = heroParts(actor);
      if (p.tintK > 0 && p.tint) gl.uniform4fv(lit.u.uTint, [p.tint[0], p.tint[1], p.tint[2], Math.min(1, p.tintK)]);
      drawMesh(parts.torso, M.mul(heroM, rig.torso));
      drawMesh(parts.head, M.mul(heroM, rig.head));
      drawMesh(parts.armL, M.mul(heroM, rig.armL));
      drawMesh(parts.armR, M.mul(heroM, rig.armR));
      if (p.sit > 0.5) drawMesh(parts.seat, M.mul(heroM, rig.seat));
      else {
        drawMesh(parts.legL, M.mul(heroM, rig.legL));
        drawMesh(parts.legR, M.mul(heroM, rig.legR));
      }
      if (p.prop && parts[p.prop]) drawMesh(parts[p.prop], M.mul(heroM, M.chain(rig.handR, M.rotX(p.prop === 'sword' ? 0.3 : 0))));
      gl.uniform4fv(lit.u.uTint, [0, 0, 0, 0]);
    }
    unbind(gl, lit);

    // 贴地阴影
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const shadows = [[lampPos[0] + 0.05, 0.03, lampPos[2] + 0.05, 0.28, 0.28, 0, 0, 0, 0.5 * (1 - stand * 0.5)]];
    if (actor.show) shadows.push([0, 0.03, 0, 0.55 * p.shrink, 0.5 * p.shrink, 0, 0, 0, 0.55 * Math.max(0.3, 1 - p.lift)]);
    sprites(shadows, vp, [1, 0, 0], [0, 0, 1]);

    // 发光：灯、角色的灵光、魂火、粒子
    gl.blendFunc(gl.ONE, gl.ONE);
    const right = [view[0], view[4], view[8]];
    const up = [view[1], view[5], view[9]];
    const glow = [];
    const L = [lampPos[0], lampPos[1] - 0.25, lampPos[2]];
    glow.push([L[0], L[1], L[2], 1.8 * flick * flare, 1.8 * flick * flare, 1, 0.55, 0.2, 0.3]);
    glow.push([L[0], L[1], L[2], 0.45, 0.5, 1, 0.78, 0.45, 0.7]);
    if (actor.show && p.glow > 0) {
      const aura = M.hex(actor.sash || '#ffd28a');
      glow.push([0, 0.7 + p.lift, 0, 1.3 * (0.6 + p.glow * 0.5), 1.4 * (0.6 + p.glow * 0.5), M.lerp(aura[0], 1, 0.5), M.lerp(aura[1], 1, 0.5), M.lerp(aura[2], 1, 0.5), Math.min(0.6, p.glow * 0.4)]);
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.35 + i / 8) % 1;
        const a = i * 2.39 + t * 0.5;
        glow.push([Math.cos(a) * 0.5, 0.15 + ph * 1.5, Math.sin(a) * 0.5, 0.06, 0.06, 0.7, 0.95, 1, Math.sin(ph * Math.PI) * p.glow]);
      }
    }
    if (!actor.show && actor.wisp) {
      const wx = L[0] + Math.sin(t * 1.3) * 0.5;
      const wy = 0.9 + Math.sin(t * 2.1) * 0.15;
      const wz = L[2] + Math.cos(t * 1.1) * 0.4;
      glow.push([wx, wy, wz, 0.5, 0.5, 1, 0.7, 0.35, 0.4]);
      glow.push([wx, wy, wz, 0.12, 0.12, 1, 0.95, 0.85, 1]);
    }
    if (particleKind !== b.particle) {
      particleKind = b.particle;
      particles = particleSet(b.particle, R);
    }
    const pg = particleSprites(particleKind, t, origin[0], origin[2], particles.list, origin);
    for (let i = 0; i < pg.length; i++) glow.push(pg[i]);
    sprites(glow, vp, right, up);

    // 全屏：光柱、暗角、换场的暗幕
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(fx.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, fxBuf);
    gl.enableVertexAttribArray(fx.a.aP);
    gl.vertexAttribPointer(fx.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(fx.u.uTime, t);
    gl.uniform1f(fx.u.uAspect, aspect);
    if (b.rays > 0 && !storm) {
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1f(fx.u.uMode, 0);
      gl.uniform1f(fx.u.uK, b.rays);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(fx.u.uMode, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (fadeAlpha > 0) {
      gl.uniform1f(fx.u.uMode, 2);
      gl.uniform1f(fx.u.uK, Math.min(1, fadeAlpha * 1.2));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disableVertexAttribArray(fx.a.aP);
    gl.depthMask(true);
    return { biome: b.name, tiles: tiles.length };
  }

  return {
    resize(w, h, pxPerRpx) {
      width = Math.max(1, Math.floor(w));
      height = Math.max(1, Math.floor(h));
      rpx = pxPerRpx || width / 750;
    },
    render: render,
    dispose() {
      for (const k in worlds) dropWorld(worlds[k]);
      if (hero) for (const k in hero) gl.deleteBuffer(hero[k].buf);
      gl.deleteBuffer(lamp.buf);
      gl.deleteBuffer(sprBuf);
      gl.deleteBuffer(fxBuf);
    }
  };
}

module.exports = { createStage, WALK_MS, walkMs, walkProgress, cameraFor, cameraAt };
