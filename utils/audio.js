// 背景音乐和音效。文件由 tools/audio/build.js 合成，放在 assets/audio/。
const NAMES = ['tap', 'pick', 'good', 'qi', 'bad', 'coin', 'up', 'big', 'born', 'lamp', 'die', 'thunder'];
const BGM_VOLUME = 0.4;
const SFX_VOLUME = 0.8;

function src(name) {
  return '/assets/audio/' + name + '.wav';
}

// api 是 wx；单独传进来是为了规则测试里可以换成假的。
function createAudio(api) {
  const sfx = {};
  let bgm = null;
  let muted = false;
  let wantBgm = false;

  function context(name, loop, volume) {
    const ctx = api.createInnerAudioContext();
    ctx.src = src(name);
    ctx.loop = loop;
    ctx.volume = volume;
    return ctx;
  }

  function syncBgm() {
    if (wantBgm && !muted) {
      if (!bgm) bgm = context('bgm', true, BGM_VOLUME);
      bgm.play();
    } else if (bgm) {
      bgm.pause();
    }
  }

  return {
    isMuted() {
      return muted;
    },
    setMuted(value) {
      muted = !!value;
      if (muted) NAMES.forEach((name) => sfx[name] && sfx[name].stop());
      syncBgm();
    },
    startBgm() {
      wantBgm = true;
      syncBgm();
    },
    pauseBgm() {
      wantBgm = false;
      syncBgm();
    },
    play(name) {
      if (muted || NAMES.indexOf(name) < 0) return false;
      if (!sfx[name]) sfx[name] = context(name, false, SFX_VOLUME);
      // 同一个音效连着触发时从头再播。
      sfx[name].stop();
      sfx[name].play();
      return true;
    },
    stop(name) {
      if (sfx[name]) sfx[name].stop();
    }
  };
}

module.exports = { NAMES, createAudio };
