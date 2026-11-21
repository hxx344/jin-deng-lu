const assert = require('node:assert');
const test = require('node:test');
const { createAudio, NAMES, STAR_SOUNDS } = require('../utils/audio');

// 假的 wx：记下每个音频上发生过什么。
function fakeApi() {
  const made = [];
  return {
    made: made,
    createInnerAudioContext() {
      const ctx = { calls: [], play() { this.calls.push('play'); }, pause() { this.calls.push('pause'); }, stop() { this.calls.push('stop'); } };
      made.push(ctx);
      return ctx;
    }
  };
}

test('音效：按名字播放，同一个音效复用同一个播放器，不认识的名字不出声', () => {
  const api = fakeApi();
  const audio = createAudio(api);
  assert.strictEqual(audio.play('tap'), true);
  assert.strictEqual(audio.play('tap'), true);
  assert.strictEqual(audio.play('nope'), false);
  assert.strictEqual(api.made.length, 1);
  assert.strictEqual(api.made[0].src, '/assets/audio/tap.mp3');
  assert.strictEqual(api.made[0].loop, false);
  assert.deepStrictEqual(api.made[0].calls, ['stop', 'play', 'stop', 'play']);
  assert.ok(NAMES.indexOf('thunder') >= 0);
});

test('背景音乐：循环播放，离开页面暂停，回来接着放', () => {
  const api = fakeApi();
  const audio = createAudio(api);
  audio.pauseBgm();
  assert.strictEqual(api.made.length, 0);
  audio.startBgm();
  audio.pauseBgm();
  audio.startBgm();
  assert.strictEqual(api.made.length, 1);
  assert.strictEqual(api.made[0].src, '/assets/audio/bgm.wav');
  assert.strictEqual(api.made[0].loop, true);
  assert.deepStrictEqual(api.made[0].calls, ['play', 'pause', 'play']);
});

test('静音：停掉音乐和正在响的音效，之后不再出声；取消静音后音乐恢复', () => {
  const api = fakeApi();
  const audio = createAudio(api);
  audio.startBgm();
  audio.play('thunder');
  audio.setMuted(true);
  assert.strictEqual(audio.isMuted(), true);
  const [bgm, thunder] = api.made;
  assert.deepStrictEqual(bgm.calls, ['play', 'pause']);
  assert.deepStrictEqual(thunder.calls, ['stop', 'play', 'stop']);
  assert.strictEqual(audio.play('tap'), false);
  assert.strictEqual(api.made.length, 2);
  audio.setMuted(false);
  assert.deepStrictEqual(bgm.calls, ['play', 'pause', 'play']);
  // 静音时离开页面，再取消静音也不该在后台响起来
  audio.setMuted(true);
  audio.pauseBgm();
  audio.setMuted(false);
  assert.strictEqual(bgm.calls[bgm.calls.length - 1], 'pause');
});

test('七品星牌各有独立音色，揭牌沿用全局静音', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const api = fakeApi();
  const audio = createAudio(api);
  assert.strictEqual(new Set(STAR_SOUNDS).size, 7);
  const samples = STAR_SOUNDS.map((name) => {
    assert.ok(audio.play(name));
    const mp3 = fs.readFileSync(path.join(__dirname, '../assets/audio', name + '.mp3'));
    // MPEG 帧同步字：11 个连续的 1。
    assert.strictEqual(mp3.readUInt16BE(0) & 0xffe0, 0xffe0);
    return mp3.toString('base64');
  });
  assert.strictEqual(new Set(samples).size, 7);
  audio.setMuted(true);
  STAR_SOUNDS.forEach((name) => assert.strictEqual(audio.play(name), false));
});

test('仙品金光从牌背绘出后等待 600 毫秒，重复点按和退场回调不会提前揭牌', (t) => {
  const game = require('../utils/game');
  const scene = require('../pages/index/star')(createAudio(fakeApi()));
  scene.state = game.createState(0, () => 0);
  game.chooseRoot(scene.state, scene.state.run.rootChoices[0], 0, () => 0);
  scene.state.run.incense = 10;
  game.starDraw(scene.state, 1, () => 0.98);
  scene.data = {};
  scene.setData = (patch, ready) => { Object.assign(scene.data, patch); scene.painted = ready; };
  scene.save = () => {};
  const timers = [];
  t.mock.method(global, 'setTimeout', (fire, ms) => { timers.push({ fire, ms }); });
  scene.onStarOpen();
  const tap = { currentTarget: { dataset: { index: 0 } } };
  scene.onStarFlip(tap);
  const oldPaint = scene.painted;
  scene.cancelStarTurn();
  oldPaint();
  assert.strictEqual(timers.length, 0);
  scene.onStarFlip(tap);
  scene.painted();
  scene.onStarFlip(tap);
  assert.deepStrictEqual(timers.map((timer) => timer.ms), [600]);
  assert.strictEqual(scene.data.star.cards[0].light, 4);
  assert.strictEqual(scene.data.star.cards[0].name, undefined);
  assert.strictEqual(scene.state.run.starCards[0].shown, false);
  timers[0].fire();
  assert.strictEqual(scene.data.star.selected.grade, '仙品');
  assert.strictEqual(scene.data.star.done, true);
});
