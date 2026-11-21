// 用程序合成背景音乐和音效，输出到 assets/audio/。改了这里之后运行：node tools/audio/build.js
// 全部是确定性的合成，不依赖外部素材，也就没有版权问题。
const fs = require('fs');
const path = require('path');

const RATE = 16000;
const OUT = path.resolve(__dirname, '../../assets/audio');
const TAU = Math.PI * 2;

// 固定种子的随机数，保证每次生成的文件一致。
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const buf = (sec) => new Float32Array(Math.round(sec * RATE));
const hz = (semi) => 146.83 * Math.pow(2, semi / 12); // 以 D3 为基准

// 往 out 里叠一个音。wrap 为真时超出末尾的部分绕回开头，用来做无缝循环。
function tone(out, at, dur, freq, amp, opt) {
  opt = opt || {};
  const harm = opt.harm || [1];
  const attack = opt.attack === undefined ? 0.005 : opt.attack;
  const decay = opt.decay || 4;
  const bend = opt.bend || 0;
  const start = Math.round(at * RATE);
  const n = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = freq * (1 + bend * t / dur);
    phase += TAU * f / RATE;
    let v = 0;
    for (let h = 0; h < harm.length; h++) v += harm[h] * Math.sin(phase * (h + 1));
    const env = Math.min(1, t / attack) * Math.exp(-decay * t) * Math.min(1, (dur - t) / 0.02);
    let k = start + i;
    if (k >= out.length) {
      if (!opt.wrap) break;
      k %= out.length;
    }
    out[k] += v * env * amp;
  }
}

// 低通过的噪声，cutoff 越小越闷。
function noise(out, at, dur, amp, cutoff, env, rand) {
  const start = Math.round(at * RATE);
  const n = Math.round(dur * RATE);
  const a = Math.min(1, TAU * cutoff / RATE);
  let y = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    y += a * ((rand() * 2 - 1) - y);
    out[start + i] += y * amp * env(i / RATE, dur);
  }
}

function write(name, data, peak) {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  const gain = max > 0 ? peak / max : 1;
  const bytes = Buffer.alloc(44 + data.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + data.length * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) bytes.writeInt16LE(Math.round(data[i] * gain * 32767), 44 + i * 2);
  fs.writeFileSync(path.join(OUT, name + '.wav'), bytes);
  console.log(name + '.wav  ' + (data.length / RATE).toFixed(2) + ' 秒  ' + Math.round(bytes.length / 1024) + ' KB');
}

const PLUCK = [1, 0.5, 0.28, 0.12, 0.06];
const BELL = [1, 0, 0.45, 0, 0.2, 0, 0.1];
const SOFT = [1, 0.25];

// 星牌从叩木、击玉到钟磬和声；神品用低锣，道品的尾音逐层散开。
const STAR_CHIMES = [
  { name: 'wood', notes: [2], harm: PLUCK, step: 0, tail: 0.2, decay: 24 },
  { name: 'jade', notes: [24], harm: SOFT, step: 0, tail: 0.38, decay: 10 },
  { name: 'water', notes: [17, 24], harm: BELL, step: 0.09, tail: 0.46, decay: 7 },
  { name: 'violet', notes: [12, 19, 27], harm: PLUCK, step: 0.08, tail: 0.62, decay: 5 },
  { name: 'gold', notes: [7, 19, 24, 31], harm: BELL, step: 0.1, tail: 0.98, decay: 3.4 },
  { name: 'red', notes: [-12, 0, 7, 19], harm: [1, 0.22, 0.55, 0.18], step: 0.065, tail: 1.16, decay: 3 },
  { name: 'dao', notes: [0, 12, 19, 24, 31, 36], harm: BELL, step: 0.1, tail: 1.4, decay: 2.7 }
];

function starChime(chime) {
  const out = buf((chime.notes.length - 1) * chime.step + chime.tail);
  chime.notes.forEach((semi, i) => {
    tone(out, i * chime.step, chime.tail, hz(semi), 0.7, { harm: chime.harm, decay: chime.decay });
  });
  return out;
}

// 背景音乐：D 小调五声，24 秒无缝循环。低音铺底，上面是稀疏的拨弦。
function bgm() {
  const out = buf(24);
  const len = out.length;
  // 铺底：整数个周期的正弦，首尾自然相接。
  [[-12, 0.16], [-5, 0.1], [0, 0.07]].forEach(([semi, amp], idx) => {
    const cycles = Math.round(hz(semi) * 24);
    const lfo = idx + 1;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      out[i] += amp * Math.sin(TAU * cycles * t) * (0.7 + 0.3 * Math.sin(TAU * lfo * t));
    }
  });
  // 每拍 0.75 秒，共 32 拍。数字是相对 D3 的半音，null 是休止。
  const melody = [
    12, null, 15, 17, null, 19, 17, null,
    15, null, 12, null, 10, 12, null, null,
    19, null, 22, 24, null, 22, 19, null,
    17, 15, null, 12, null, 10, 7, null
  ];
  melody.forEach((semi, i) => {
    if (semi === null) return;
    tone(out, i * 0.75, 3.2, hz(semi), 0.22, { harm: PLUCK, decay: 1.6, wrap: true });
    tone(out, i * 0.75 + 0.012, 3.2, hz(semi) * 1.003, 0.08, { harm: SOFT, decay: 1.2, wrap: true });
  });
  // 每 6 秒一声低音拨弦，定住调子。
  [0, 7, 3, -2].forEach((semi, i) => {
    tone(out, i * 6, 5, hz(semi - 12), 0.26, { harm: PLUCK, decay: 0.9, wrap: true });
  });
  return out;
}

function tap() {
  const out = buf(0.12);
  tone(out, 0, 0.12, 620, 0.8, { harm: SOFT, decay: 40, bend: -0.4 });
  return out;
}

function pick() {
  const out = buf(0.3);
  tone(out, 0, 0.1, 240, 0.9, { harm: PLUCK, decay: 45 });
  tone(out, 0.03, 0.27, hz(12), 0.5, { harm: PLUCK, decay: 12 });
  return out;
}

function good() {
  const out = buf(0.8);
  tone(out, 0, 0.6, hz(19), 0.6, { harm: BELL, decay: 6 });
  tone(out, 0.13, 0.67, hz(24), 0.7, { harm: BELL, decay: 5 });
  return out;
}

function qi() {
  const out = buf(1);
  const rand = rng(3);
  noise(out, 0, 1, 0.5, 1400, (t, d) => Math.sin(Math.PI * t / d) ** 2, rand);
  tone(out, 0.1, 0.9, hz(12), 0.25, { harm: SOFT, decay: 2, attack: 0.3, bend: 0.5 });
  return out;
}

function bad() {
  const out = buf(0.5);
  tone(out, 0, 0.5, 190, 0.8, { harm: PLUCK, decay: 7, bend: -0.45 });
  tone(out, 0, 0.5, 201, 0.5, { harm: SOFT, decay: 7, bend: -0.45 });
  return out;
}

function coin() {
  const out = buf(0.6);
  tone(out, 0, 0.3, 1568, 0.5, { harm: SOFT, decay: 14 });
  tone(out, 0.09, 0.5, 2093, 0.6, { harm: SOFT, decay: 9 });
  return out;
}

function up() {
  const out = buf(1.6);
  [12, 15, 17, 19, 24].forEach((semi, i) => {
    tone(out, i * 0.11, 1.5 - i * 0.11, hz(semi), 0.5, { harm: BELL, decay: 3 });
  });
  tone(out, 0.55, 1.05, hz(36), 0.3, { harm: SOFT, decay: 2.5, attack: 0.1 });
  return out;
}

function big() {
  const out = buf(2);
  [0, 7, 12, 19, 24].forEach((semi, i) => {
    tone(out, i * 0.05, 1.9, hz(semi), 0.45, { harm: BELL, decay: 1.8 });
  });
  tone(out, 0, 2, hz(-12), 0.5, { harm: PLUCK, decay: 1.5 });
  return out;
}

function born() {
  const out = buf(1);
  tone(out, 0, 1, hz(12), 0.5, { harm: BELL, decay: 3, attack: 0.08, bend: 0.5 });
  tone(out, 0.3, 0.7, hz(24), 0.4, { harm: BELL, decay: 4 });
  return out;
}

function lamp() {
  const out = buf(1.4);
  tone(out, 0, 1.4, hz(17), 0.7, { harm: BELL, decay: 2.5 });
  tone(out, 0, 1.4, hz(17) * 2.76, 0.18, { harm: SOFT, decay: 5 });
  return out;
}

function die() {
  const out = buf(2.2);
  tone(out, 0, 2.2, 98, 0.9, { harm: PLUCK, decay: 1.6, bend: -0.12 });
  tone(out, 0, 2.2, 98 * 2.4, 0.25, { harm: SOFT, decay: 2.4 });
  tone(out, 0.5, 1.7, hz(5), 0.3, { harm: BELL, decay: 2, bend: -0.2 });
  return out;
}

// 天劫：和页面上 4.2 秒的动画对拍。雨声渐起，1.26 秒、2.02 秒两道雷，2.8 秒正中一道。
function thunder() {
  const out = buf(4.2);
  const rand = rng(11);
  noise(out, 0, 4.2, 0.16, 5000, (t, d) => Math.min(1, t / 0.9) * Math.min(1, (d - t) / 0.7), rand);
  noise(out, 0, 4.2, 0.3, 120, (t, d) => Math.min(1, t / 0.9) * Math.min(1, (d - t) / 0.7), rand);
  const strike = (at, amp, tail) => {
    noise(out, at, 0.09, amp, 6000, (t) => Math.exp(-40 * t), rand);
    noise(out, at + 0.02, tail, amp * 1.4, 260, (t) => Math.exp(-3.2 * t / tail) * (0.6 + 0.4 * Math.sin(TAU * 9 * t)), rand);
    tone(out, at, tail, 52, amp * 0.9, { harm: SOFT, decay: 4 / tail, bend: -0.3 });
  };
  strike(1.26, 0.55, 0.7);
  strike(2.02, 0.65, 0.7);
  strike(2.8, 1, 1.3);
  strike(2.98, 0.6, 0.9);
  return out;
}

fs.mkdirSync(OUT, { recursive: true });
write('bgm', bgm(), 0.7);
write('tap', tap(), 0.5);
write('pick', pick(), 0.6);
write('good', good(), 0.6);
write('qi', qi(), 0.5);
write('bad', bad(), 0.7);
write('coin', coin(), 0.5);
write('up', up(), 0.7);
write('big', big(), 0.8);
write('born', born(), 0.6);
write('lamp', lamp(), 0.6);
write('die', die(), 0.8);
write('thunder', thunder(), 0.95);
STAR_CHIMES.forEach((chime) => write('star-' + chime.name, starChime(chime), 0.6));
