const assert = require('node:assert');
const test = require('node:test');
const { createAudio, NAMES } = require('../utils/audio');

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
  assert.strictEqual(api.made[0].src, '/assets/audio/tap.wav');
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
