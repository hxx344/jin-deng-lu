const game = require('../../utils/game');
const audio = require('../../utils/audio').createAudio(wx);
const starScene = require('./star');
const cloudSync = require('../../utils/cloud-sync');
const { scoreOf, scoreKey, autoDaoName, cleanDaoName, preferCloudProgress, pickSave, friendlyError } = require('../../utils/cloud-score');

const SAVE_KEY = 'jindeng_save_v1';
const SAVE_META_KEY = 'jindeng_save_meta_v1';
const DAO_NAME_KEY = 'jindeng_dao_name_v1';
const BOARD_KEY = 'jindeng_board_v1';
const CLOUD_PUSH_INTERVAL_MS = 30000;
const TICK_MS = 250;
const SAVE_INTERVAL_MS = 10000;
const OFFLINE_NOTICE_SEC = 60;
const BANNER_MS = 2400;
const HIDDEN_MODAL = { show: false, title: '', content: '', highlight: '', confirmText: '确定', cancelText: '', danger: false };
const HIDDEN_SHEET = { kind: '' };
const TIP_KEY = 'jindeng_tip_v1';
const TIP_INFO = [
  { at: 'hud', text: '寿元只在做选择时流逝，放着不动不会少；灵气和机缘跟着耗掉的寿元涨。寿元耗尽就身死，带着灯芯重来。' },
  { at: 'tabs', text: '学到的功法、羁绊和属性都在这几页里。灵气攒满后要渡劫，考的属性会在“功法”页标出来。' },
  { at: 'help', text: '规则记不清的时候，点右上角的“?”看游戏指南。' }
];
const DEFAULT_SASH = '#8a6a4a';
// 每个临时动作的时长要盖住 wxss 里对应动画的时长，播完才回到常态。
const ACTIONS = {
  notice: { ms: 500, bubble: '？' },
  born: { ms: 900, bubble: '哇' },
  slash: { ms: 1100, bubble: '剑来' },
  pill: { ms: 1300, bubble: '嗝' },
  talisman: { ms: 1300, bubble: '敕' },
  flex: { ms: 1300, bubble: '喝' },
  lucky: { ms: 1200, bubble: '嘿' },
  absorb: { ms: 1300, bubble: '' },
  seclude: { ms: 1500, bubble: '闭关' },
  calm: { ms: 1400, bubble: '呼' },
  karma: { ms: 1500, bubble: '因果' },
  demon: { ms: 1400, bubble: '……' },
  hurt: { ms: 900, bubble: '疼' },
  breakthrough: { ms: 1700, bubble: '破', flare: true },
  thunder: { ms: 4200, bubble: '', flare: true },
  die: { ms: 1600, bubble: '', flare: true },
  possess: { ms: 1600, bubble: '', flare: true },
  fade: { ms: 1600, bubble: '', flare: true },
  ash: { ms: 1600, bubble: '', flare: true },
  yawn: { ms: 1500, bubble: '哈——' },
  look: { ms: 1700, bubble: '' },
  doze: { ms: 2300, bubble: 'Zzz' },
  scratch: { ms: 1300, bubble: '' },
  wave: { ms: 1300, bubble: '机缘到了' },
  shake: { ms: 800, bubble: '唉' },
  shrug: { ms: 1100, bubble: '灵气不够' },
  divine: { ms: 1300, bubble: '再算一卦' },
  enlighten: { ms: 1300, bubble: '悟了' },
  resonate: { ms: 1500, bubble: '成势', flare: true },
  toss: { ms: 1100, bubble: '舍' },
  sharpen: { ms: 1000, bubble: '锐' },
  focus: { ms: 1300, bubble: '明' },
  renew: { ms: 1300, bubble: '回春' },
  cough: { ms: 1100, bubble: '咳咳' },
  cheer: { ms: 1100, bubble: '成了' },
  brace: { ms: 0, bubble: '' },
  ascend: { ms: 1900, bubble: '', flare: true },
  stretch: { ms: 1400, bubble: '回来了' },
  bow: { ms: 1300, bubble: '谢灯', flare: true },
  reap: { ms: 1400, bubble: '果然' }
};
const DEATH_ACTIONS = { demon: 'possess', trib: 'ash', retire: 'fade', age: 'die' };
const MUTE_KEY = 'jindeng_mute_v1';
const AUTO_KEY = 'jindeng_auto_v1';
// 自动机缘两步之间的间隔，要够角色把上一个动作演完。
const AUTO_STEP_MS = 1800;
// 角色做某个动作时配的音效；没列出的动作不出声。
const SOUNDS = {
  notice: 'pick', wave: 'pick', born: 'born',
  slash: 'good', pill: 'good', talisman: 'good', flex: 'good', enlighten: 'good', sharpen: 'good', focus: 'good', renew: 'good', cheer: 'good',
  absorb: 'qi', seclude: 'qi', calm: 'qi',
  lucky: 'coin', karma: 'coin', divine: 'coin', reap: 'coin',
  demon: 'bad', hurt: 'bad', shake: 'bad', shrug: 'bad', cough: 'bad',
  breakthrough: 'up', ascend: 'up', resonate: 'big', bow: 'lamp', toss: 'tap',
  thunder: 'thunder', die: 'die', possess: 'die', fade: 'die', ash: 'die'
};
// 天劫动画里第三道雷落下的时刻，和 wxss 里 storm-* 动画的 67% 对应。
const STORM_HIT_MS = 2800;
// 逐道雷：点下“接”到揭晓之间停这么久。
const BOLT_FALL_MS = 700;
// 场景里的历练：每隔这么久推进 0.1 秒战斗时间。后面几个是各段停留的拍数：敌人入场、倒下、两场之间、败后调息。
const FRAY_STEP_MS = 100;
const FRAY_ENTER = 7;
const FRAY_FALL = 7;
const FRAY_GAP = 5;
const FRAY_REST = 40;
// 秘境里败了之后停这么多拍再出结算。
const FRAY_GATE_LOSE = 12;
const FRAY_POPS = 5;
const FRAY_MY_HITS = ['hit', 'crit', 'double', 'extra', 'execute', 'thorns'];
const HIDDEN_BAR = { show: false };
const TRIB_CHANCE_TEXT = '机缘恢复上限的 ' + Math.round(game.TRIB_CHANCE_SHARE * 100) + '%';

// 渡劫面板里提一句装备分不够扣了多少、富余加了多少；刚好够就不提。
const gearShortText = (g) => (g.short ? '装备分 ' + g.score + ' / ' + g.need + '，成功率 −' + percent(g.penalty) + '%。'
  : (g.bonus >= 0.005 ? '装备分 ' + g.score + ' / ' + g.need + '，成功率 +' + percent(g.bonus) + '%。' : ''));
const scatterDesc = (info) => '折寿 ' + info.scatterYears + ' 年，不涨心魔，灵气固定保住一半；' +
  (info.scatterAttr ? '散去的修为淬进肉身：' + info.scatterText + '（本境界还能淬 ' + info.scatterLeft + ' 次）。' : '本境界已淬满 ' + game.SCATTER_MAX + ' 次，再散功不加属性。');
const FIDGETS = ['yawn', 'look', 'doze', 'scratch'];
const FIDGET_MIN_MS = 7000;
const FIDGET_SPAN_MS = 8000;
const SKILL_ACTIONS = { sword: 'slash', pill: 'pill', talisman: 'talisman', body: 'flex', luck: 'lucky' };

function yearsText(years) {
  return String(Math.round(years * 10) / 10);
}

// 一次结算可能同时发生好几件事，只演最要紧的那一件。
function actionForTags(tags) {
  const has = (t) => tags.indexOf(t) >= 0;
  if (has('lose')) return has('life-') ? 'hurt' : (has('demon+') ? 'demon' : 'shake');
  if (has('life-')) return 'cough';
  if (has('stageup')) return 'breakthrough';
  if (has('insight')) return 'resonate';
  if (has('big')) return 'resonate';
  if (has('bigup')) return 'cheer';
  if (has('bond')) return 'resonate';
  if (has('upgrade')) return 'enlighten';
  for (let i = 0; i < tags.length; i += 1) {
    if (tags[i].indexOf('skill:') === 0) return SKILL_ACTIONS[tags[i].slice(6)] || 'absorb';
  }
  if (has('demon+')) return 'demon';
  if (has('fruit')) return 'reap';
  if (has('win')) return 'cheer';
  if (has('body')) return 'flex';
  if (has('edge')) return 'sharpen';
  if (has('mind')) return 'focus';
  if (has('life+')) return 'renew';
  if (has('karma') || has('mark')) return 'karma';
  if (has('chance')) return 'lucky';
  if (has('demon-')) return 'calm';
  if (has('seclude')) return 'seclude';
  return 'absorb';
}

function percent(value) {
  return Math.round(value * 100);
}

// 同步时间只显示到秒，够用且不占地方。
function clockText(ts) {
  const d = new Date(ts);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function wrapChars(text, width, maxLines) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  for (let i = 0; i < chars.length && lines.length < maxLines; i += width) {
    lines.push(chars.slice(i, i + width).join(''));
  }
  if (chars.length > width * maxLines && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, Math.max(1, width - 1)) + '…';
  }
  return lines.length ? lines : [''];
}

function chronicleLayout(data) {
  const layout = { width: 750, height: 380, intro: wrapChars(data.intro, 27, 2), rows: [] };
  data.rows.forEach((row) => {
    const item = {
      age: row.age === null ? '年岁未记' : row.age + ' 岁',
      title: row.title,
      lines: wrapChars(row.text, 25, 2),
      detail: row.detail ? wrapChars(row.detail, 29, 1) : []
    };
    item.height = 72 + item.lines.length * 38 + item.detail.length * 32 + 26;
    layout.rows.push(item);
    layout.height += item.height;
  });
  layout.height += layout.intro.length * 36 + 100;
  return layout;
}

function drawChronicle(ctx, data, layout) {
  ctx.fillStyle = '#141116';
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#f5e7ce';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(data.title, 48, 78);
  ctx.fillStyle = '#d7a760';
  ctx.font = '28px sans-serif';
  ctx.fillText(data.subtitle, 48, 128);
  ctx.fillStyle = '#b9ae9f';
  ctx.font = '25px sans-serif';
  let y = 180;
  layout.intro.forEach((line) => {
    ctx.fillText(line, 48, y);
    y += 36;
  });
  y += 30;
  ctx.strokeStyle = '#5b4430';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, y);
  ctx.lineTo(702, y);
  ctx.stroke();
  y += 44;
  layout.rows.forEach((row) => {
    ctx.fillStyle = '#2a211e';
    ctx.fillRect(48, y - 30, 112, 42);
    ctx.fillStyle = '#e9bd7d';
    ctx.font = '22px sans-serif';
    ctx.fillText(row.age, 58, y);
    ctx.fillStyle = '#f0dfc5';
    ctx.font = 'bold 29px sans-serif';
    ctx.fillText(row.title, 180, y);
    y += 42;
    ctx.fillStyle = '#c8bcac';
    ctx.font = '26px sans-serif';
    row.lines.forEach((line) => {
      ctx.fillText(line, 60, y);
      y += 38;
    });
    ctx.fillStyle = '#85bda9';
    ctx.font = '22px sans-serif';
    row.detail.forEach((line) => {
      ctx.fillText(line, 60, y);
      y += 32;
    });
    y += 26;
  });
  ctx.fillStyle = '#75695d';
  ctx.font = '22px sans-serif';
  ctx.fillText('烬灯录 · 一世见闻，尽在此灯', 48, layout.height - 42);
}

Page(Object.assign(starScene(audio), {
  data: {
    sparks: Array.from({ length: game.LAMP_INSIGHT }, (_, i) => i + 1),
    hud: {},
    hero: {},
    actor: {},
    bar: HIDDEN_BAR,
    bag: { text: '', full: false },
    gear: { worn: [], pack: [] },
    gearDot: false,
    tip: { at: '', text: '', next: '' },
    tab: 'skill',
    alive: false,
    dead: false,
    attrs: [],
    powerSources: [],
    sets: [],
    skills: [],
    skillCount: '',
    karma: [],
    marks: [],
    muted: false,
    auto: false,
    autoUnlocked: false,
    autoCost: game.AUTO_LAMP.cost,
    logs: [],
    lamps: [],
    tomeTiers: [],
    tomes: [],
    tomeCount: '',
    stats: [],
    epitaphs: [],
    sheet: HIDDEN_SHEET,
    star: {},
    mountainName: '',
    banner: '',
    modal: HIDDEN_MODAL,
    chronicleCanvas: { show: false, width: 750, height: 1000 },
    cloud: {
      state: 'checking',
      text: '正在连接云端…',
      lastSync: '',
      signedIn: false,
      daoName: '未设置',
      editing: false,
      nameDraft: '',
      rows: [],
      myRank: 0,
      boardLoading: false,
      boardError: ''
    }
  },

  onLoad() {
    let raw = null;
    try {
      raw = wx.getStorageSync(SAVE_KEY);
    } catch (e) {
      raw = null;
    }
    const now = Date.now();
    this.state = game.normalizeState(raw, now);
    this.lastSave = now;
    this.result = null;
    this.lampOpen = false;
    this.act = '';
    this.replaceHidden = false;
    this.guideOpen = false;
    this.tipStep = 0;
    let tipSeen = false;
    try {
      tipSeen = !!wx.getStorageSync(TIP_KEY);
    } catch (e) {
      tipSeen = false;
    }
    // 已经玩过的存档不再弹指引。
    this.tipDone = tipSeen || this.state.lives > 0 || this.state.run.choices > 0;
    this.holdRealm = null;
    this.bracing = false;
    this.wasFull = false;
    this.nextFidget = now + FIDGET_MIN_MS;
    this.eventOpen = false;
    this.seaOpen = false;
    this.mountainPanel = '';
    this.tribOpen = false;
    this.mergeOpen = false;
    this.mergeSource = '';
    this.chronicleOpen = false;
    this.chronicleBusy = false;
    this.chronicleError = '';
    this.chronicleToken = 0;
    this.shareImage = '';
    this.deadOpen = this.state.run.phase === 'dead';
    this.cloudOpen = false;
    this.arenaOpen = false;
    this.trainOpen = false;
    this.trainCache = null;
    this.starOpen = false;
    this.gateOpen = false;
    this.gateCache = null;
    this.fray = null;
    this.pausedFray = null;
    this.frayTimer = null;
    this.cloudSyncing = false;
    this.cloudLoggingIn = false;
    this.cloudUid = null;
    this.cloudSaveId = null;
    this.lastCloudPush = 0;
    this.lastCloudSync = 0;
    this.lastCloudAttempt = 0;
    this.lastScoreKey = '';
    this.syncQueued = false;
    let meta = null;
    try {
      meta = wx.getStorageSync(SAVE_META_KEY);
    } catch (e) {
      meta = null;
    }
    // 旧存档没有同步时间戳，用规则层的 lastTime 兜底，避免被旧云存档误覆盖。
    this.localSavedAt = meta && Number(meta.savedAt) > 0
      ? Number(meta.savedAt)
      : (raw && Number(raw.lastTime) > 0 ? Number(raw.lastTime) : 0);
    let daoName = '';
    try {
      daoName = wx.getStorageSync(DAO_NAME_KEY) || '';
    } catch (e) {
      daoName = '';
    }
    this.daoName = String(daoName).slice(0, 12);
    // 上次读到的榜单留在本机：云端一时连不上，竞技场也还有对手可打。
    let board = null;
    try {
      board = wx.getStorageSync(BOARD_KEY);
    } catch (e) {
      board = null;
    }
    this.boardData = Array.isArray(board) ? board.filter((row) => row && typeof row === 'object') : [];
    if (this.boardData.length) this.patchCloud({ rows: this.boardRows(this.boardData) });
    let muted = false;
    try {
      muted = !!wx.getStorageSync(MUTE_KEY);
    } catch (e) {
      muted = false;
    }
    audio.setMuted(muted);
    this.auto = false;
    try {
      this.auto = !!wx.getStorageSync(AUTO_KEY);
    } catch (e) {
      this.auto = false;
    }
    this.autoStuck = false;
    this.nextAuto = 0;
    this.setData({ muted: muted, auto: this.auto });
    this.refresh();
    this.initCloud();
  },

  onShow() {
    const result = game.advance(this.state, Date.now());
    if (result.elapsed >= OFFLINE_NOTICE_SEC && result.oil > 0) {
      this.openModal({
        title: '你回到灯前',
        content: '你离开了 ' + game.formatDuration(result.elapsed) + '。灯里现在有 ' + Math.floor(this.state.oil) + ' / ' + game.OIL_MAX +
          ' 滴灯油，一滴能在机缘面板上换一个机缘。这一世的灵气、机缘和寿元不随现实时间变，接着走就行。',
        highlight: '灯油 +' + result.oil,
        confirmText: '知道了'
      });
      if (this.state.run.phase === 'alive') this.play('stretch');
    }
    this.wasFull = Math.floor(this.state.run.chance) >= game.maxChance(this.state);
    if (this.starOpen) this.renderStar();
    this.refresh();
    this.startLoop();
    audio.startBgm();
    // 回到前台时拉一次云端最新存档；initCloud 还没拿到会话时由它自己触发。
    if (this.cloudUid && Date.now() - this.lastCloudSync > 10000) this.syncCloud();
  },

  onHide() {
    audio.pauseBgm();
    this.stopLoop();
    this.stopAct();
    this.save();
  },

  onUnload() {
    audio.pauseBgm();
    this.stopLoop();
    this.stopAct();
    this.save();
  },

  startLoop() {
    this.stopLoop();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.frayTimer = setInterval(() => this.frayTick(), FRAY_STEP_MS);
  },

  stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    clearInterval(this.frayTimer);
    this.frayTimer = null;
  },

  tick() {
    const now = Date.now();
    game.advance(this.state, now);
    this.autoTick(now);
    this.idleTick(now);
    this.refresh();
    if (now - this.lastSave >= SAVE_INTERVAL_MS) this.save();
  },

  save() {
    const now = Date.now();
    this.lastSave = now;
    try {
      wx.setStorageSync(SAVE_KEY, this.state);
      wx.setStorageSync(SAVE_META_KEY, { savedAt: now });
    } catch (e) {
      console.error('保存存档失败', e);
    }
    this.localSavedAt = now;
    this.scheduleCloudSync();
  },

  // 自动同步：本地存档照常每 10 秒落盘，云端写入最快每 30 秒一次，避免频繁请求。
  // 名次或灯芯变了（身死、投胎）就不再排队，立刻同步一次，免得榜上数据落后一整轮。
  scheduleCloudSync() {
    if (!this.cloudUid || !cloudSync.isAvailable()) return;
    if (this.cloudSyncing) return;
    if (Date.now() - this.lastCloudAttempt < 10000) return;
    const urgent = this.scoreKeyNow() !== this.lastScoreKey;
    if (!urgent && Date.now() - this.lastCloudPush < CLOUD_PUSH_INTERVAL_MS) return;
    this.syncCloud();
  },

  patchCloud(patch) {
    this.setData({ cloud: Object.assign({}, this.data.cloud, patch) });
  },

  scoreKeyNow() {
    const name = cleanDaoName(this.daoName) || (this.cloudUid ? autoDaoName(this.cloudUid) : '');
    return scoreKey(scoreOf(this.state), name);
  },

  // 启动时确认云端可用性与登录态；拿不到会话就当游客，不阻塞游戏本身。
  initCloud() {
    if (!cloudSync.isAvailable()) {
      this.patchCloud({ state: 'off', text: cloudSync.unavailableReason || '当前环境不支持云服务' });
      return;
    }
    this.patchCloud({ state: 'checking', text: '正在连接云端…' });
    const app = typeof getApp === 'function' ? getApp() : null;
    const ready = app && typeof app.ensureSession === 'function'
      ? app.ensureSession()
      : Promise.resolve({ data: null, error: null });
    Promise.resolve(ready).then((res) => {
      // 会话检查是异步的：期间用户可能已经手动登录，别拿旧结果覆盖。
      if (this.cloudUid) return;
      const session = res && res.data;
      const uid = session && session.user ? session.user.id : '';
      if (!uid) {
        this.applySession('');
        this.patchCloud({ state: 'guest', text: '未登录：进度只存在这台设备' });
        return;
      }
      this.applySession(uid);
      this.syncCloud();
    }).catch((e) => {
      if (this.cloudUid) return;
      this.applySession('');
      this.patchCloud({ state: 'error', text: friendlyError(e) });
    });
  },

  applySession(uid) {
    this.cloudUid = uid || '';
    const saved = cleanDaoName(this.daoName);
    const name = saved || (uid ? autoDaoName(uid) : '');
    this.patchCloud({
      signedIn: !!uid,
      daoName: name || '未设置',
      nameDraft: name,
      editing: false,
      myRank: 0,
      rows: this.boardRows(this.boardData)
    });
  },

  // 一次同步 = 先比对云端存档决定谁是新版，再上报成绩。
  // 云端更新就用云端的；本地更新或两边一样就回写，避免两台设备来回覆盖。
  async syncCloud(options) {
    const force = !!(options && options.force);
    if (!cloudSync.isAvailable() || !this.cloudUid) return false;
    if (this.cloudSyncing) {
      this.syncQueued = true;
      return false;
    }
    this.cloudSyncing = true;
    this.lastCloudAttempt = Date.now();
    this.patchCloud({ state: 'syncing', text: '正在同步…' });
    let ok = false;
    try {
      const pulled = await cloudSync.pullSave();
      if (pulled.error) throw pulled.error;
      const row = pulled.data;
      // 云端已有这一行就要记住它的 id，否则回写会走成新建，撞 owner_id 唯一约束。
      if (row && row.id) this.cloudSaveId = row.id;
      if (row && pickSave(this.localSavedAt, row.savedAt, preferCloudProgress(this.state, row.state)) === 'cloud') {
        if (!this.adoptCloud(row)) throw { code: 'BAD_SAVE', message: '云端存档已损坏，本地进度未动' };
        ok = true;
      } else if (row && !force && Number(row.savedAt) === Number(this.localSavedAt)) {
        ok = true;
      } else {
        ok = await this.pushCloud();
      }
      if (ok) {
        this.lastCloudSync = Date.now();
        this.patchCloud({ state: 'ok', text: '已同步到云端', lastSync: clockText(this.lastCloudSync) });
        try {
          await this.publishScore();
        } catch (e) {
          this.patchCloud({ boardError: friendlyError(e) });
        }
        if (this.cloudOpen) this.refreshBoard();
      }
    } catch (e) {
      this.patchCloud({ state: 'error', text: friendlyError(e) });
    } finally {
      this.cloudSyncing = false;
      if (this.syncQueued) {
        this.syncQueued = false;
        this.syncCloud();
      }
    }
    return ok;
  },

  async pushCloud() {
    this.lastCloudPush = Date.now();
    const res = await cloudSync.pushSave(this.state, this.localSavedAt, this.cloudSaveId);
    if (res.error) throw res.error;
    if (res.data && res.data.id) this.cloudSaveId = res.data.id;
    return true;
  },

  // 云端存档更新：整份替换并落到本地，不把这份旧档再推回去。
  // 云端内容坏掉时宁可报错也不能拿一份空状态覆盖本地进度。
  adoptCloud(row) {
    if (!row || !row.state || typeof row.state !== 'object') return false;
    const state = game.normalizeState(row.state, Date.now());
    const savedAt = Number(row.savedAt) || 0;
    this.state = state;
    this.localSavedAt = savedAt;
    this.lastCloudPush = Date.now();
    this.cloudSaveId = row.id || this.cloudSaveId;
    this.result = null;
    this.lampOpen = false;
    this.clearScenes();
    this.eventOpen = false;
    this.seaOpen = false;
    this.mountainPanel = '';
    this.tribOpen = false;
    this.mergeOpen = false;
    this.chronicleOpen = false;
    this.chronicleBusy = false;
    this.chronicleError = '';
    this.shareImage = '';
    this.chronicleToken++;
    this.setData({ mountainName: '', chronicleCanvas: { show: false, width: 750, height: 1000 } });
    this.deadOpen = state.run.phase === 'dead';
    this.replaceHidden = false;
    this.stopAct();
    try {
      wx.setStorageSync(SAVE_KEY, state);
      wx.setStorageSync(SAVE_META_KEY, { savedAt: savedAt });
    } catch (e) {
      console.error('写入云端存档失败', e);
    }
    this.refresh();
    this.showBanner('已载入云端存档');
    return true;
  },

  async publishScore() {
    if (!this.cloudUid) return;
    const key = this.scoreKeyNow();
    if (key === this.lastScoreKey) return;
    const name = cleanDaoName(this.daoName) || autoDaoName(this.cloudUid);
    const payload = Object.assign({ dao_name: name }, scoreOf(this.state));
    const res = await cloudSync.submitScore(this.cloudUid, payload);
    if (res.error) throw res.error;
    this.lastScoreKey = key;
  },

  onCloud() {
    if (this.act === 'thunder') return;
    audio.play('tap');
    this.guideOpen = false;
    this.arenaOpen = false;
    this.tribOpen = false;
    this.mergeOpen = false;
    this.chronicleOpen = false;
    this.cloudOpen = true;
    this.refresh();
    this.refreshBoard();
  },

  onCloudClose() {
    audio.play('tap');
    this.cloudOpen = false;
    this.refresh();
  },

  onCloudSync() {
    if (this.cloudSyncing) return;
    audio.play('tap');
    this.syncCloud({ force: true });
  },

  onCloudRefresh() {
    if (this.data.cloud.boardLoading) return;
    audio.play('tap');
    this.refreshBoard();
  },

  async onCloudLogin() {
    if (this.cloudLoggingIn) return;
    if (!cloudSync.isAvailable()) {
      this.showBanner(friendlyError({ code: 'CLOUD_UNAVAILABLE', message: cloudSync.unavailableReason }));
      return;
    }
    this.cloudLoggingIn = true;
    audio.play('tap');
    this.patchCloud({ state: 'checking', text: '正在登录…' });
    const res = await cloudSync.signInWithWechat();
    this.cloudLoggingIn = false;
    const session = res && res.data;
    const uid = session && session.user ? session.user.id : '';
    if (!uid) {
      this.patchCloud({ state: 'guest', text: friendlyError(res && res.error) });
      return;
    }
    const app = typeof getApp === 'function' ? getApp() : null;
    if (app && typeof app.resetSession === 'function') app.resetSession();
    this.applySession(uid);
    this.showBanner('已登录，正在同步');
    await this.syncCloud({ force: true });
    this.refreshBoard();
  },

  onCloudLogout() {
    audio.play('tap');
    this.cloudLoggingIn = false;
    cloudSync.signOut();
    const app = typeof getApp === 'function' ? getApp() : null;
    if (app && typeof app.resetSession === 'function') app.resetSession();
    // 换账号后旧的行 id 与成绩都不能复用，否则会被 RLS 拦下。
    this.cloudSaveId = null;
    this.lastScoreKey = '';
    this.applySession('');
    this.patchCloud({ state: 'guest', text: '已退出登录：进度只存在这台设备', lastSync: '', myRank: 0, boardError: '' });
  },

  onCloudNameEdit() {
    audio.play('tap');
    const current = this.data.cloud.daoName === '未设置' ? '' : this.data.cloud.daoName;
    this.patchCloud({ editing: true, nameDraft: current });
  },

  onCloudNameInput(e) {
    // 用整对象 patch 而不是 'cloud.nameDraft' 路径写法：浏览器预览的 setData 是浅合并。
    this.patchCloud({ nameDraft: e.detail.value });
  },

  onCloudNameSave() {
    const name = cleanDaoName(this.data.cloud.nameDraft);
    if (!name) {
      this.showBanner('道号不能为空');
      return;
    }
    audio.play('tap');
    this.daoName = name;
    try {
      wx.setStorageSync(DAO_NAME_KEY, name);
    } catch (e) {
      console.error('保存道号失败', e);
    }
    // 名字变了要让成绩重新上报一次。
    this.lastScoreKey = '';
    this.patchCloud({ daoName: name, nameDraft: name, editing: false });
    this.publishScore().catch((err) => this.patchCloud({ boardError: friendlyError(err) }));
  },

  // 排行榜：公开可读，未登录也能看；名次只在登录后算。
  async refreshBoard() {
    if (!cloudSync.isAvailable()) {
      this.patchCloud({ boardLoading: false, boardError: cloudSync.unavailableReason || '当前环境不支持云服务' });
      return;
    }
    this.patchCloud({ boardLoading: true, boardError: '' });
    let board;
    try {
      board = await cloudSync.fetchBoard();
    } catch (e) {
      board = { data: [], error: e };
    }
    if (board.error) {
      // 读不到新榜单时留着上次的，不清空。
      this.patchCloud({
        boardLoading: false,
        boardError: friendlyError(board.error) + (this.boardData.length ? '。下面是上次读到的榜单' : '')
      });
      return;
    }
    this.boardData = board.data;
    try {
      wx.setStorageSync(BOARD_KEY, board.data);
    } catch (e) {
      console.error('保存榜单失败', e);
    }
    this.patchCloud({ rows: this.boardRows(board.data), boardLoading: false });
    if (!this.cloudUid) return;
    let rank;
    try {
      rank = await cloudSync.fetchMyRank(scoreOf(this.state));
    } catch (e) {
      return;
    }
    if (!rank.error) this.patchCloud({ myRank: rank.data || 0 });
  },

  boardRows(data) {
    return data.map((row, i) => ({
      id: String(row.owner_id),
      rank: i + 1,
      name: row.dao_name || '无名',
      realm: row.realm_name || '尚未投胎',
      wick: game.formatNumber(Number(row.total_wick) || 0),
      realmIndex: Number(row.realm_index),
      totalWick: Number(row.total_wick) || 0,
      mine: !!this.cloudUid && row.owner_id === this.cloudUid
    }));
  },

  showBanner(text) {
    clearTimeout(this.bannerTimer);
    this.setData({ banner: text });
    this.bannerTimer = setTimeout(() => this.setData({ banner: '' }), BANNER_MS);
  },

  openModal(options, action) {
    this.modalAction = action || null;
    this.setData({ modal: Object.assign({}, HIDDEN_MODAL, options, { show: true }) });
  },

  closeModal() {
    this.modalAction = null;
    this.bracing = false;
    this.setData({ modal: HIDDEN_MODAL });
  },

  onModalConfirm() {
    audio.play('tap');
    const action = this.modalAction;
    this.closeModal();
    if (action) action.call(this);
  },

  onModalCancel() {
    audio.play('tap');
    this.closeModal();
    this.refresh();
  },

  onMute() {
    const muted = !audio.isMuted();
    audio.setMuted(muted);
    try {
      wx.setStorageSync(MUTE_KEY, muted ? 1 : 0);
    } catch (e) {
      console.error('保存静音设置失败', e);
    }
    this.setData({ muted: muted });
    audio.play('tap');
  },

  onAuto() {
    if (!game.autoUnlocked(this.state)) {
      audio.play('tap');
      this.setData({ tab: 'lamp' });
      this.showBanner('花 ' + game.AUTO_LAMP.cost + ' 灯芯点亮「自动机缘」');
      this.refresh();
      return;
    }
    this.auto = !this.auto;
    this.autoStuck = false;
    this.nextAuto = Date.now() + 600;
    try {
      wx.setStorageSync(AUTO_KEY, this.auto ? 1 : 0);
    } catch (e) {
      console.error('保存自动机缘设置失败', e);
    }
    audio.play('tap');
    this.setData({ auto: this.auto });
    this.showBanner(this.auto ? '自动机缘已开启：他会自己翻机缘、做选择、取舍功法' : '自动机缘已关闭');
  },

  // 自动机缘：每隔一阵替玩家走一步。渡劫、坐化和投胎仍由玩家决定；会致命的选项不选。
  autoTick(now) {
    if (this.starOpen || !this.auto || !game.autoUnlocked(this.state) || now < this.nextAuto) return;
    const run = this.state.run;
    if (run.phase !== 'alive') {
      this.autoStuck = false;
      return;
    }
    if (this.act === 'thunder' || this.bracing || this.data.modal.show || this.result || this.lampOpen || this.guideOpen || this.cloudOpen || this.arenaOpen || this.trainOpen || this.gateOpen || (this.fray && this.fray.gate) || this.seaOpen || this.mountainPanel || this.tribOpen || this.mergeOpen || this.chronicleOpen) return;
    // 没有稳妥选项的机缘留给玩家，等他处理完再接着走。
    if (this.autoStuck && run.event) return;
    this.autoStuck = false;
    const step = game.autoStep(this.state, Math.random);
    if (!step) return;
    this.nextAuto = now + AUTO_STEP_MS;
    if (step.stuck) {
      this.autoStuck = true;
      this.showBanner('没有稳妥的选项，这一回留给你决定');
      this.afterAction();
      return;
    }
    const r = step.result;
    if (r && r.dead) {
      this.finishChoice(r);
      return;
    }
    this.eventOpen = false;
    this.replaceHidden = false;
    this.showBanner((r ? r.title + '：' + r.label : '') + (r && step.replaced ? '；' : '') + step.replaced);
    this.play(r ? actionForTags(r.tags) : 'toss');
    this.afterAction();
  },

  noop() {},

  // quiet 为真时只做动作不出声，用于闲着时的小动作。
  play(name, next, quiet) {
    clearTimeout(this.actTimer);
    this.act = name;
    if (!quiet && SOUNDS[name]) audio.play(SOUNDS[name]);
    this.nextFidget = Date.now() + FIDGET_MIN_MS + Math.random() * FIDGET_SPAN_MS;
    this.actTimer = setTimeout(() => {
      this.act = '';
      this.holdRealm = null;
      if (next) this.play(next);
      this.refresh();
    }, ACTIONS[name].ms);
  },

  stopAct() {
    this.cancelStarTurn();
    clearTimeout(this.actTimer);
    clearTimeout(this.stormTimer);
    clearTimeout(this.boltTimer);
    this.boltFalling = false;
    audio.stop('thunder');
    this.act = '';
    this.holdRealm = null;
  },

  deathAct() {
    return DEATH_ACTIONS[this.state.run.death.cause] || 'die';
  },

  // 闲着的时候隔一阵做个小动作；机缘刚攒满时招手提醒。
  idleTick(now) {
    const s = this.state;
    const run = s.run;
    if (run.phase !== 'alive') return;
    const full = Math.floor(run.chance) >= game.maxChance(s);
    const becameFull = full && !this.wasFull;
    this.wasFull = full;
    if (this.act || this.bracing || this.data.sheet.kind || this.data.modal.show) return;
    if (becameFull) {
      this.play('wave');
      return;
    }
    if (now < this.nextFidget) return;
    const pool = game.yearsLeft(s) <= 10 ? FIDGETS.concat('cough') : FIDGETS;
    this.play(pool[Math.floor(Math.random() * pool.length)], null, true);
  },

  actorView() {
    const s = this.state;
    const run = s.run;
    const act = this.act;
    const alive = run.phase === 'alive';
    // 身死那一刻角色还要把倒下的动作演完，之后才只剩魂火。
    const show = alive || (run.phase === 'dead' && act === this.deathAct());
    const view = { show: show, wisp: !show, layer: 0, realm: 0, action: 'idle', old: false, demon: false, devil: false, ready: false, sash: DEFAULT_SASH, bubble: '', flare: !!(act && ACTIONS[act].flare), storm: act === 'thunder' };
    if (!show) return view;
    const counts = game.setCounts(run);
    let top = '';
    game.SCHOOL_IDS.forEach((id) => {
      if (counts[id] > (top ? counts[top] : 0)) top = id;
    });
    const info = alive ? game.tribulationInfo(s) : null;
    const yuan = alive ? game.yuanTrialView(s) : null;
    // 渡劫成功时境界已经变了，但要等雷劈完才换上新衣。
    const realm = this.holdRealm === null ? run.realm : this.holdRealm;
    view.layer = (yuan && this.tribOpen) || (act === 'thunder' && this.result && this.result.yuan)
      ? game.REALMS[game.SEA_REALM + 1].layer
      : (realm === run.realm ? game.layerIndex(run) : game.REALMS[realm].layer);
    // 衣着只画到元婴，之后的境界沿用元婴的样子。
    view.realm = Math.min(realm, game.SEA_REALM + 1);
    view.action = act || (this.bracing ? 'brace' : (alive && run.event && this.eventOpen ? 'ponder' : 'idle'));
    view.old = alive && game.yearsLeft(s) <= 10;
    view.demon = run.demon >= 50;
    view.devil = run.mode === 'demon';
    view.ready = !!((info && info.ready) || (yuan && yuan.ready));
    if (top) view.sash = game.SCHOOLS[top].color;
    view.bubble = act ? ACTIONS[act].bubble : '';
    return view;
  },

  hudView(power) {
    const s = this.state;
    const run = s.run;
    const cap = game.qiCap(s);
    const left = game.yearsLeft(s);
    const born = run.phase !== 'root';
    return {
      powerValue: power,
      realm: born ? game.realmText(run) : '尚未投胎',
      where: (born ? game.layerName(run) + ' · ' : '') + '第 ' + (s.lives + (run.phase === 'dead' ? 0 : 1)) + ' 世',
      wick: game.formatNumber(s.wick),
      qi: game.formatNumber(Math.floor(run.qi)),
      cap: game.formatNumber(cap),
      power: born ? game.formatNumber(power) : '—',
      qiPct: Math.min(100, Math.floor(run.qi / cap * 100)),
      rate: game.formatNumber(game.qiRate(s) * game.YEAR_SECONDS),
      oil: Math.floor(s.oil) + ' / ' + game.OIL_MAX,
      years: run.phase === 'alive' ? left : '-',
      lifeLow: run.phase === 'alive' && left <= 10,
      demon: run.demon + ' / ' + game.MAX_DEMON,
      demonHigh: run.demon >= 50,
      big: s.bigCount + ' / ' + game.BIG_EVERY,
      mode: run.phase === 'alive' && run.mode === 'demon' ? '魔修' : '',
      chance: born ? Math.floor(run.chance) + ' / ' + game.maxChance(s) : '-',
      aftermath: run.phase === 'alive' ? game.aftermathText(s) : ''
    };
  },

  heroView() {
    const s = this.state;
    const run = s.run;
    if (run.phase === 'root') return { line: '灯在等你。', title: '投胎', sub: '挑一副根骨', off: false, trib: '', tribSub: '', big: '' };
    if (run.phase === 'dead') return { line: run.death.text, title: '再入轮回', sub: '上一世得灯芯 +' + run.death.wick, off: false, trib: '', tribSub: '', big: '' };
    const info = game.tribulationInfo(s);
    const yuan = game.yuanTrialView(s);
    const boarding = game.atSea(run);
    const seaEntry = !run.sea && game.seaView(s);
    const full = game.isFull(s);
    let line;
    if (run.mode === 'demon' && !(info && info.demonOk)) {
      line = '魔修：灵气产出 ×' + (1 + game.MAX_DEMON * game.DEMON_QI_RATE) + '，不能渡劫。普通延寿无效，只能服散续命。';
    } else if (info) {
      line = info.name + (info.aspect ? '「' + info.aspect + '」' : '') + ' · 考' + info.tests.map((k) => game.ATTR_NAMES[k]).join('、') + (info.tests.length > 1 ? '各 ' : ' ') + info.req +
        (info.gear.short ? ' · 装备分 ' + info.gear.score + '/' + info.gear.need : '') + (info.gate && info.gate.short ? ' · ' + info.gate.material + ' ' + info.gate.have + '/' + info.gate.need : '') + ' · 成功率 ' + percent(info.chance) + '%';
    } else if (boarding) {
      line = '枯海沉舟 · 潮位 ' + run.sea.tide + ' / ' + game.SEA_TIDE_LIMIT;
    } else if (yuan) {
      line = yuan.ready ? '元婴劫 · ' + yuan.name + (yuan.gear.short ? ' · 装备分 ' + yuan.gear.score + '/' + yuan.gear.need : '') : (yuan.gate && yuan.gate.short ? '元婴劫要先凑齐' + yuan.gate.material + '（' + yuan.gate.have + '/' + yuan.gate.need + '），去' + yuan.gate.scene + '打。' : (full ? '了结手中的机缘或功法，然后再渡元婴劫。' : '休养回满灵气，再渡元婴劫。'));
    } else if (run.realm === game.SEA_REALM) {
      line = full ? (seaEntry ? '金丹圆满。烬灯照出一条通往枯海的航路。' : '金丹圆满。了结手中的机缘或功法，然后入枯海。') : '金丹后期灵气圆满后，可入枯海。';
    } else {
      const top = game.REALMS[run.realm].name;
      line = run.ascended ? top + '圆满，前面没有路了。可继续修行，或在轮回页坐化。' : top + '已成，继续修行可达圆满。';
    }
    const max = game.maxChance(s);
    const count = Math.floor(run.chance);
    let title;
    let sub;
    let off = false;
    if (boarding) {
      title = '继续沉舟探索';
      sub = '查看本章与返航选项';
    } else if (run.trib) {
      title = '天劫未了';
      sub = info && info.bolts && info.bolts.extra ? '劫云未散：收劫，或再引余雷' : '下一道雷在等你';
    } else if (run.pending) {
      title = '取舍功法';
      sub = '新功法还在等你决定';
    } else if (run.event) {
      title = '继续机缘';
      sub = '还有一件事等你决定';
    } else if (count >= 1) {
      title = '翻开机缘';
      sub = '已攒 ' + count + ' / ' + max + ' 次 · 每 ' + yearsText(game.chanceYears(s)) + ' 年 +1';
    } else {
      const years = game.meditateYears(s);
      title = '静坐';
      sub = '机缘用尽 · 耗 ' + years + ' 年寿元等它回来';
      off = years >= game.yearsLeft(s);
    }
    let tribSub = '';
    if (yuan && yuan.ready) tribSub = yuan.name + ' ' + yuan.step + ' / 2';
    else if (info && info.ready && info.bolts) {
      tribSub = info.bolts.extra ? '余雷第 ' + info.bolts.index + ' 道 · ' + percent(info.bolts.chance) + '%'
        : (info.bolts.active ? '第 ' + info.bolts.index + ' / ' + info.bolts.total + ' 道雷 · ' + percent(info.bolts.chance) + '%' : info.bolts.total + ' 道雷 · 全过的把握 ' + percent(info.chance) + '%');
    } else if (info && info.ready) tribSub = '成功率 ' + percent(info.chance) + '%';
    if (tribSub && run.tribBoon) tribSub += ' · 有雷相助';
    const powder = game.powderInfo(s);
    const mountain = game.mountainReady(s);
    const quest = run.sect && run.sect.quest;
    const mountainNotice = s.mountainLegacy ? '旧山门来信 · 可回山' :
      (quest && quest.outcome && !quest.after && quest.due <= run.mountainChoices ? '寒潮退去 · 弟子来报' :
        (run.sect && run.sect.world.event ? '山外有事 · 待决断' :
          (run.cave && run.cave.fruit && run.mode !== 'demon' ? '仙果熟了 · 可服用' : '')));
    const term = game.tribTerm(s);
    const path = !boarding && game.pathReady(s);
    const gate = !boarding && !run.trib ? game.tribGate(s) : null;
    const lamp = run.lamp;
    const ready = game.lampReady(s);
    const lampName = lamp.school ? game.SCHOOLS[lamp.school].name + '卷' : '灯传';
    return {
      lamp: !lamp.spent && !boarding && !run.trib,
      lampName: lampName,
      sparks: lamp.sparks,
      hasScroll: !!lamp.school,
      lampAction: ready === 'open' ? '开卷选招' : (ready === 'insight' ? '点灯顿悟' : ''),
      lampHint: !lamp.school || lamp.sparks === game.LAMP_INSIGHT ? '先了结手中事' : '再历 ' + (game.LAMP_INSIGHT - lamp.sparks) + ' 次机缘可顿悟',
      trialWon: run.realm === 0 && run.battle.cleared > 0,
      gate: gate && gate.short ? gate.scene : '',
      gateSub: gate ? gate.material + ' ' + gate.have + ' / ' + gate.need : '',
      term: run.mode === 'demon' ? '' : (term.overdue ? '劫期已过 ' + (term.used - term.term) + ' 次：每次机缘多折 ' + term.years + ' 年寿元' : '劫期：这一境界还能从容做 ' + term.left + ' 次机缘'),
      termOver: term.overdue,
      path: path ? '择道' : '',
      pathSub: '定下这一世主修哪一系',
      line: line,
      title: title,
      sub: sub,
      off: off,
      sea: seaEntry ? '进入枯海' : '',
      trib: yuan && yuan.ready ? '渡元婴劫' : (info && info.ready ? '渡' + info.name : ''),
      tribSub: tribSub,
      big: !boarding && s.big > 0 ? '大机缘' : '',
      bigSub: '可用 ' + s.big + ' 次',
      mountainTitle: mountain ? (run.sect ? run.sect.name : (run.cave ? '洞府与山门' : '洞府')) : '',
      mountainSub: mountain ? (mountainNotice || (run.sect ? '灵材 ' + run.materials + ' · 管理宗门' : '筑石 ' + run.stone + (run.cave ? ' · 修建设施' : ' · 开辟洞府'))) : '',
      powder: powder.visible ? '服散续命' : '',
      powderSub: powder.visible ? (powder.left ? '耗 ' + game.formatNumber(powder.cost) + ' 灵气，燃寿 +' + powder.years + ' 年，还能服 ' + powder.left + ' 次' : '这一世已经服不动了') : '',
      powderOff: !powder.ready
    };
  },

  // 初次游戏的点击指引：不遮挡界面，气泡指着该点的地方，玩家点了真的按钮才往下走。
  tipView() {
    const none = { at: '', text: '', next: '' };
    const s = this.state;
    const run = s.run;
    if (this.tipDone || this.guideOpen || this.data.modal.show) return none;
    if (run.phase === 'root') {
      return { at: 'sheet', text: '欢迎。先挑一副这一世的根骨，点下面任意一项。', next: '' };
    }
    if (run.phase !== 'alive' || run.pending) return none;
    if (this.result || this.lampOpen || this.fray && this.fray.stage === 1) return none;
    if (run.event && this.eventOpen) {
      return run.choices === 0 ? { at: 'sheet', text: '右边是要花的寿元。亲历一项，灯就亮一点。闭关不添火。', next: '' } : none;
    }
    if (run.choices === 0) {
      return { at: 'main', text: '翻开一桩机缘，选一条愿意花寿元走的路。', next: '' };
    }
    const info = TIP_INFO[this.tipStep];
    return { at: info.at, text: info.text, next: this.tipStep === TIP_INFO.length - 1 ? '开始修行' : '下一步' };
  },

  finishTip() {
    this.tipDone = true;
    try {
      wx.setStorageSync(TIP_KEY, 1);
    } catch (e) {
      console.error('保存指引进度失败', e);
    }
    this.refresh();
  },

  onTipNext() {
    audio.play('tap');
    if (this.tipStep >= TIP_INFO.length - 1) {
      this.finishTip();
      return;
    }
    this.tipStep++;
    this.refresh();
  },

  onTipSkip() {
    this.finishTip();
  },

  guideView() {
    const s = this.state;
    const run = s.run;
    // 标题和正文排成一个单层列表，模板里不用嵌套循环。
    const sec = (title, lines) => [{ head: true, text: title }].concat(lines.map((text) => ({ head: false, text: text })));
    const rows = [].concat(
        sec('怎么玩', [
          '灵气和机缘跟着年岁涨：每耗掉 1 年寿元，灵气和机缘就各涨一截。一世之内不用等，想走多快走多快。',
          '选根骨后，挑一卷灯传功法，再用它试招。往后亲历三次机缘便能顿悟，精进旧法、合参同门，也可以把灯火拿来冲脉。闭关不添火。每个大境界能悟一次，未用的火可留到下一境。',
          '普通机缘会记住你选过的路，下一次就能看见它的具体收益。',
          '寿元只在做选择和静坐时流逝，放着不动、离线都不扣。寿元耗尽就身死，然后带着灯芯重来。'
        ]),
        sec('机缘', [
          '翻一次机缘耗 1 次。每过 ' + yearsText(game.chanceYears(s)) + ' 年寿元攒回 1 次，最多存 ' + game.maxChance(s) + ' 次。投胎时只带上限的三分之一，境界越高攒得越慢，元婴之后尤其慢。',
          '机缘用尽时主按钮变成“静坐”：一直坐到下一次机缘回来，按钮上写着要耗多少年寿元，灵气跟着涨。所以机缘别乱花，借势、枯海和元婴劫的准备也要用它。',
          '灯油：现实时间每 ' + game.formatDuration(game.OIL_INTERVAL_SEC) + '攒 1 滴，离线也攒，最多 ' + game.OIL_MAX + ' 滴，换一世也带着。机缘不合心意时，可以在机缘面板上用 1 滴换一个。',
          '传承：学功法或升品。奇遇：有风险的交易，成功率写在选项上。因果：现在种因，几次选择之后结果。闲事：小得小失。',
          '手上功法越多，传承、能得功法的事件和给功法的大机缘越少遇到。' + (run.phase === 'root' ? '' : '你现在有 ' + run.skills.length + ' 门，翻到传承的机会约 ' + Math.round(game.legacyShare(s) * 100) + '%。'),
          '拿不准可以选“闭关不理”，耗 1 年寿元：多半能换一点灵气，也可能一无所获，偶尔还会岔气，散掉一些灵气、涨一点心魔，几率都写在选项上。也可以点“稍后再选”先收起来。',
          '懒得点就打开主按钮上方的“自动机缘”：开着页面时，他会自己翻开机缘、挑选项、取舍功法。会致命的选项他不碰，没见过后果的选项他也不碰（只会闭关）；择道、渡劫、坐化和投胎仍由你决定。',
          '有些事件会直接给机缘次数，或提高这一世的机缘积攒速度；当前速度显示在顶部和“轮回”页。',
          '每做完 ' + game.BIG_EVERY + ' 次机缘得 1 次大机缘：没有选项，点了当场随机落下一件事，不耗寿元。可能是好事（一门功法直接练到天品、灯芯自己长一截、年轻十岁、下一场天劫多两成把握），可能说不准（锋躯神换位置、命格被换、一梦十年），也可能是坏事（功法跌一品、机缘少一半、多一张丹盟的欠条），但不会直接寿尽或入魔。进度和次数跨世保留。'
        ]),
        sec('机缘之间的联动', [
          '余势：上一回的结果会影响紧接着的下一回，机缘面板上会写明。上一回成了，这一回成功率 +10%；没成，这一回折寿减半；闭关了，这一回少耗 1 年。',
          '功法：同一系凑到 2 门后，不少机缘会多出这一系才有的选项，前面标着“因某系 2 门”，通常比原有选项划算。',
          '有些选择会记下一段经历，比如入了守骸宗、欠了丹盟的账、养了一个字。经历列在“见闻”页。',
          '经历会带出后续的故事章节，也会让别处的机缘多出或少掉选项。多出来的选项前面标着“因【某经历】”。',
          '几条线会互相牵扯：同一件事，守骸宗弟子和食仙教徒能做的选择不一样。经历只管这一世，轮回后清空。'
        ]),
        sec('突发与余波', [
          '筑基后的主动小境界突破、渡劫成功和秘法合成，可能分别引出经脉错乱、天劫余波和功法反噬；大机缘、机缘接近存满或经历累积，也可能引出福极生变与旧债上门。',
          '每段经历分“征兆”和“突发”两回机缘，不能重抽。处理突发后，余波影响接下来的三次普通机缘；征兆和突发本身不计入这三次。',
          '余波包括事件灵气奖励 -30%、概率成功率 -10%、秘法暂时失效、机缘间隔 ×1.5，或锋躯神 -10%。顶部和机缘面板会显示剩余次数。',
          '每世最多三段突发，每段结束后隔四次普通机缘才可再触发。突发链优先于大机缘，大机缘不减少余波和冷却。离线不会新增突发，自动机缘仍会避开致命或入魔选项。'
        ]),
        sec('功法与羁绊', [
          '剑、丹、符、体、运五系，分凡、灵、玄、天四品。重复选中同一门就升品。',
          '不少功法除了加属性还带特殊效果，比如按心魔加锋、折寿后涨躯、存着机缘不用就变强，说明里都写着。',
          '同一系凑到 2 门、4 门各触发一条羁绊，效果写在“功法”页。',
          '一世最多持有 ' + game.maxSkills(s) + ' 门，点亮灯纹“博闻”可以再加；偶尔遇到的“奇缘”也能给这一世加，最多 ' + game.MAX_EXTRA_SLOTS + ' 门。满了再学要换掉一门，可以先收起面板看看羁绊再决定。',
          '同系两门天品可以在功法卡上合成一门秘法：只占 1 格，全部数值效果约为两者之和的 1.2 倍，不能拆分。',
          '建议主修一两系凑羁绊，比每系都学一点强。',
          '择道：引气之后可以定一系主修。主修一系的功法效果 ×' + game.PATH_MAIN + '，被它克制的一系 ×' + game.PATH_WEAK + '（剑克符、符克体、体克运、运克丹、丹克剑），传承里主修的功法也更常见。定了这一世不能改，所以要看这一世天劫考什么再定。'
        ]),
        sec('境界与渡劫', [
          '凡胎、引气、筑基、金丹、元婴，各分前、中、后期。小境界灵气满了自动突破。',
          '元婴不是头。往后是化神、婴变、问鼎，再是阴虚、阳实、窥涅、净涅、碎涅，再是空涅、空灵、空玄、空劫，最后是踏天，一共 ' + (game.REALMS.length - 1) + ' 个境界。这些境界的天劫照旧考锋、躯、神，但更看装备分，越往后越是这样。',
          '阴虚劫、空涅劫、踏天劫是三道大关：不看劫相，锋、躯、神三项全考，属性和装备分的要求比前后的天劫高出一截，失败折的寿元也重得多。踏天后期灵气满了还有一场终劫，同样三项全考，渡过才算踏天圆满。',
          '前三场天劫每一世的“劫相”都不同：有的考两项，有的只考一项但要求高出三成多。主界面和“功法”页会标出这一场考什么、需要多少。',
          '劫期：每个境界只能从容做一定次数的机缘（主界面写着还剩几次）。过了劫期，每次机缘都多折寿元，越拖越重；多折的寿元是白折的，不涨灵气也不攒机缘。所以不能无限攒属性，要估着劫期决定什么时候渡劫。',
          '渡劫成功，' + TRIB_CHANCE_TEXT + '，补到上限为止；失败和散功不恢复。',
          '羁绊、灯纹、功法、大机缘的雷、宗门护阵和装备分富余这些加成，按被考属性的达标程度打折：属性只到要求的一半，这些加成也只算一半。属性堆上去，加成才管用。',
          '引气劫要一道雷一道雷地接。必接的雷有 3 道，一道比一道难，每道落下前可以硬接、耗 10 次机缘借势（这一道 +10%），或散功。一道没接住，整场就败。',
          '3 道全过后劫云不会马上散：可以收劫破境，也可以再引余雷淬体，最多 2 道。接住的余雷在收劫时兑成属性、寿元上限或灯芯；没接住照样破境，但淬体所得全丢，还要折寿、涨心魔。贪不贪由你。',
          '筑基劫、金丹劫和化神起的天劫可选硬抗、耗 30 次机缘借势（成功率 +15%），或散功。化神起装备不足也会削弱这 15% 的借势加成，零装备时硬抗和借势都不会成功。',
          '散功必定失败，但不会身死、不涨心魔：折寿 ' + game.SCATTER_YEARS + ' 年，灵气保住一半，散去的修为淬进这场天劫考的每项属性里，各加要求值的 ' + Math.round(game.SCATTER_ATTR * 100) + '%（至少 1）。每个大境界只淬 ' + game.SCATTER_MAX + ' 次，之后再散功不加属性。',
          '成功率低就先别渡，多翻几次机缘把被考的属性堆上去；机缘翻不出想要的属性、劫期又快到时，可以散功拿寿元换属性。'
        ]),
        sec('枯海与元婴劫', [
          '金丹圆满后可登上枯海沉舟。守骸宗、食仙教和缄默书院各有一条航线，此前相应的经历能打开新选项。',
          '每次选择涨一格潮。第三格结算后返航，途中也可携带已有收获返航。稍后再探会保留所在章节。',
          '返航后渡元婴劫。盐骨关考锋或躯，问名关考神；枯海所得、逃字和丹修各有用处。失败后休养至灵气圆满即可重试。'
        ]),
        sec('洞府与宗门', [
          '筑基后期起可以开辟洞府。开府和修建、扩建聚灵阵、灵田、藏经室、仙树，耗的是历练得来的筑石，外加灵气和少量寿元。',
          '设施的等级上限跟着大境界走：筑基最高 2 级，每破一个大境界多开一级，至多 8 级。越往上扩建越费筑石，效果也越强。',
          '仙树要用玉露浇灌：浇一次耗 2 滴，再做 2 次普通机缘结一颗仙果。服下仙果寿元上限 +8 年，仙树每扩建一级再多 4 年；魔修吃了没用。',
          '洞府开放后，每次普通机缘产出灵材，留给立宗、收徒和山门事务用。',
          '元婴后可在洞府立宗，招收弟子、提升修为、传授本世功法，并派人巡山或应对寒潮。弟子修为、特长和所学功法会影响结果。',
          '宗门每阶反哺本世灵气 +8%、渡劫 +2%：守骨每阶渡劫再 +1%，取骸每阶灵气再 +4%，济人每阶机缘积攒 +5%。山外每块领地另使灵气 +2%、渡劫 +1%，失去领地即收回。',
          '立宗后多出「山外」一页。门人、库藏和山外的小事随每次普通机缘自行增减：声望高、占着盐滩村，门人来得快；门人多、领地多，库藏涨得快；库藏见底门人就不再来。每 4 次机缘门中送一份月例灵材。',
          '扩张、战役和升阶是送上山的大事，每件给两三个选项：占下无主之地，守住或攻打食仙教的据点，声望、领地和门人够了就立碑升阶。战役比的是宗门战力（品阶、弟子修为与所学、领地、门人），亲自出阵按你的战力再加一截。山门分草庐、山门、宗门、大宗四阶，每升一阶多收一名弟子，弟子修为上限 +1。',
          '二级藏经室可传授秘法。可以选一位弟子托付传承，下一世洞府开放后（筑基后期）回山取回他保管的功法或秘法。'
        ]),
        sec('心魔', [
          '贪心的选项会涨心魔。每 10 点心魔降低 3% 渡劫成功率。',
          '满 ' + game.MAX_DEMON + ' 不再立即身死，而是转魔修：灵气产出 ×5，不能渡劫，普通延寿无效，只能耗灵气服散续命（每次 +3 年，一世最多 3 次）。十年后魔躯燃尽，身死灯芯仍 ×1.5。',
          '有些闲事和因果能降心魔，别全跳过。'
        ]),
        sec('战力与竞技场', [
          '主界面显示当前战力，“功法”页可以查看来源。境界、锋躯神、功法品级、流派羁绊和装备按当前境界的典型构筑校准，五项都达标时贡献相同。单项属性过高后增幅会放缓，三项兼修会加分。',
          '每渡过一场天劫、破一个大境界，各来源都再乘 ' + game.REALM_POWER_GROWTH + '，一层层叠上去，不再单列一项破境战力；历练里的攻击和气血也跟着乘。',
          '“轮回”页里的“竞技场”可以挑战榜上玩家。对手战力按历史最高境界和累计灯芯估算，胜率写在按钮上。',
          '胜了积累论道积分，解锁竞技场称号。对手越强，积分越多。败了折损 3 年寿元。',
          '对战次数每小时回 1 次，最多存 ' + game.ARENA_MAX + ' 次，换一世也带着。同一个人可以反复打；“连战”会把剩下的次数一口气用完。'
        ]),
        sec('历练', [
          '开卷后就能在灯前试招。第一关只有一只叼刀的野狗，打赢必得兵器；引气之后继续推关。左上角是你的气血和关数，右上角是对手的气血。',
          '历练不耗寿元和机缘，也不算进劫期。关卡没有尽头，越往后越硬：寻常的关连打 ' + game.TRAIN_MOBS + ' 只小的，每 ' + game.TRAIN_BOSS_EVERY + ' 关是一个首领。败了调息一阵，退回 ' + game.TRAIN_RETREAT + ' 关再一关一关打回来；重打的关不再掉装备，储物袋也不会因此变慢。',
          '每过一关，储物袋攒灵气就快一档，过首领关涨得更多。储物袋跟着现实时间攒，关掉游戏也在攒，最多存 ' + game.TRAIN_BAG_HOURS + ' 小时的量；点场景上方的“储物袋”把灵气收进丹田。',
          '每过一关得 ' + game.TRAIN_STONE + ' 块筑石，过首领关得 ' + game.TRAIN_BOSS_STONE + ' 块筑石和 ' + game.TRAIN_BOSS_DEW + ' 滴玉露；储物袋里每攒一件装备也带 1 块筑石。筑石修洞府，玉露浇仙树，筑基后期洞府开放后用得上。',
          '锋定攻击，躯定气血和减伤，神定出手快慢和暴击。五系功法各有打法：剑系追加一剑，丹系回血，符系开场贴符，体系反伤，运系偶尔一下算两下；同系凑到 2 门、4 门还有加成。心魔越重，打人越疼，挨打也越疼。',
          '点左上角的关数可以看眼前这一关和下一个首领的胜率。关卡和储物袋只管这一世，换一世从第 1 关打起。'
        ]),
        sec('关隘与秘境', [
          '有五场天劫要先凑齐材料才肯落下来：' + game.GATES.map((gate) => game.TRIBS[gate.trib].name + '要' + gate.material + ' ' + gate.need + ' 份（' + gate.scene + '）').join('，') + '。材料没凑齐，灵气圆满了也渡不了劫。',
          '人到了那个境界，主按钮旁边会多出秘境的入口。每个秘境有下品、中品、上品三个对手，越往上越难打，打赢给的材料也越多（1、2、3 份）；面板上写着各自的数值和胜率。',
          '每打一场耗 ' + game.GATE_COST + ' 次机缘，不耗寿元，也不算进劫期。打的时候场景会换成秘境，用的是历练里的那套数值：锋躯神、功法和身上的装备。',
          '输了什么也拿不到，但那个秘境里的对手会让一步：气血和攻击各降 ' + Math.round(game.GATE_YIELD * 100) + '%，最多让 ' + game.GATE_YIELD_MAX + ' 步。机缘不够打一场时，可以在秘境面板里静坐着攒。',
          '材料凑齐就一直算数，渡劫失败不用重凑；换一世要从头凑起。'
        ]),
        sec('装备', [
          '历练掉装备：寻常的关过关时有三成机会掉一件，连着 ' + game.TRAIN_DROP_PITY + ' 关没掉下一关必掉；首领关必掉，品级更好。储物袋另外每 20 分钟攒一件，卡关时也有东西拿。',
          '机缘里也能得装备：铁匠铺、战场、当铺这类奇遇有的选项给一件，补的是身上装备分最低的那个槽位，阶比历练眼下掉的高，品级也更好；“上好的装备”还要再好一截。有的选项给锻材。',
          '装备分兵、衣、冠、靴、佩、戒六个槽位：兵加攻击，衣加气血，冠加气血和减伤，靴加气血和出手速度，佩攻击气血都加一点并加暴击，戒加攻击和暴击伤害。',
          '品级有凡、灵、玄、天、仙、神、道七档，品级越高带的词条越多（道品 6 条）；仙品要过了 11 关才会掉，神品 34 关，道品 76 关。越靠后的关掉的装备“阶”越高，数值越大。',
          '词条有十三种：攻击、气血、暴击、暴击伤害、减伤、出手加快、吸血、反伤、回血、开场护盾、破甲、招式减伤、连击。',
          '装备的数值只在历练的战斗里起作用，不改锋躯神；装备分会算进战力。',
          '装备分看品级、强化、词条，也看阶：越靠后的关掉的装备，装备分越高，到了后期每高一阶涨得更多。',
          '往后的天劫要装备分撑着，前松后紧：筑基劫要 ' + game.TRIBS[1].gear + '，金丹劫要 ' + game.TRIBS[2].gear + '，元婴劫要 ' + game.TRIBS[3].gear + '，化神劫要 ' + game.TRIBS[4].gear + '，往后一路往上加，大关要得格外多（' + game.TRIBS.filter((t) => t.wall).map((t) => t.name + ' ' + t.gear).join('、') + '）；每高一重天再多 ' + Math.round(game.GEAR_HEAVEN * 100) + '%。不够的话成功率按差的比例往下扣：筑基劫一件不穿扣 ' + Math.round(game.GEAR_TRIB_MAX * 100) + '%，金丹劫 ' + Math.round(game.TRIBS[2].gearCut * 100) + '%，元婴劫 ' + Math.round(game.TRIBS[3].gearCut * 100) + '%，化神劫起差多少扣多少；够了就不扣。超过要求还能再加一点成功率：最多 ' + Math.round(game.GEAR_TRIB_BONUS * 100) + '%，每多出要求的 ' + Math.round(game.GEAR_TRIB_HALF * 100) + '%，离这个上限的差距减半，越往上加得越少。所以后面的境界急不来，得先把历练的关往后推、把装备换上去。元婴劫问名关里事先备好的办法不受影响。“装备”页顶上写着眼下这一场要多少。',
          '在“装备”页换装、强化和分解。强化耗锻材，最高 +' + game.GEAR_MAX_LEVEL + '，不会失败；锻材靠分解用不上的装备得来。背包最多 ' + game.GEAR_PACK_MAX + ' 件，满了之后新掉的直接分解。',
          '背包里标“更好”的，是战斗数值比身上的高、装备分也不比身上低的；“换上更好的”只换这些，“分解用不上的”只分解两样都不比身上高的。高几阶的新装备数值更高、装备分却不如强化过的旧装备时，两边都不算，要换就自己点“换上”再强化。',
          '装备和锻材只管这一世。'
        ]),
        sec('身死与轮回', [
          '身死后按境界、羁绊和死法结算灯芯。境界越高越多。',
          '灯芯用来点亮“灯纹”页里永久生效的加成，然后重新投胎，挑一副根骨。',
          '“灯纹”页底部的藏经阁可以花灯芯请出仙、神、道品功法，品级随机。它们不加数值，而是各改一条规则，品级越高改得越狠。请出后，往后每一世的传承里都可能遇到它。',
          '每次投胎还会抽一张有得有失的命格：早慧、灯下黑或薄命。换一批只换根骨，不换命格。',
          '根骨分凡、良、珍、绝、仙、神六档，底色各不相同。两到五种根骨可能长在同一个人身上，加成相加，种数越多越稀有；另有几副不靠拼凑的稀有根骨。',
          '投胎时对候选不满意，可以点“换一批”整批重新随机，每一世 ' + game.ROOT_REROLLS + ' 次。',
          '寿元快到头又渡不过劫时，可以在“轮回”页主动坐化，直接结算。',
          '前几世死得早是正常的，灯纹点起来之后会越走越远。身死面板可以查看带年表的本纪，并生成长图直接转发。',
          '重天：在已开的最高一重天渡过终劫、修到踏天圆满再身死（坐化也算），就开出下一重天，共 ' + game.HEAVEN_MAX + ' 重。每高一重：' + game.heavenText(1) + '；枯海里备下的稳妥渡法也不再必过。每开一重，灯纹“' + game.DEEP_LAMPS.map((id) => game.LAMPS.filter((l) => l.id === id)[0].name).join('、') + '”的上限 +1；第一次到' + game.DEEP_REALMS.map((realm) => game.REALMS[realm].name).join('、') + '也各 +1。首次到化神后开放“铸胚、渡厄、随葬”。投胎时可以选去哪一重。'
        ]),
        sec('角色在干什么', [
          '中间的小人是你这一世的肉身。衣服颜色跟境界走，腰带颜色是你主修的那一系。',
          '白头发说明寿元不到 10 年了；红眼说明心魔过半；头顶有乌云说明可以渡劫了。',
          '它朝你招手，是机缘攒满了。',
          '嫌吵的话，点右上角的“♪”关掉音乐和音效。'
        ])
    );
    return { kind: 'guide', rows: rows.map((row, i) => ({ key: i, head: row.head, text: row.text })) };
  },

  onGuide() {
    if (this.act === 'thunder') return;
    audio.play('tap');
    this.cloudOpen = false;
    this.arenaOpen = false;
    this.tribOpen = false;
    this.mergeOpen = false;
    this.chronicleOpen = false;
    this.guideOpen = true;
    this.refresh();
  },

  onGuideClose() {
    audio.play('tap');
    this.guideOpen = false;
    this.refresh();
  },

  // 竞技场：对手就是排行榜上的人，榜单数据沿用云面板拉回来的那一份。
  arenaView(power) {
    const s = this.state;
    const cloud = this.data.cloud;
    const left = Math.floor(s.arena);
    const wait = game.arenaWait(s);
    const standing = game.arenaStanding(s);
    return {
      kind: 'arena',
      power: game.formatNumber(power),
      left: left + ' / ' + game.ARENA_MAX,
      batch: left >= 2 ? left : 0,
      standing: standing.title + ' · 论道积分 ' + game.formatNumber(standing.points),
      nextRank: standing.next ? '再得 ' + game.formatNumber(standing.next.points - standing.points) + ' 积分可获「' + standing.next.title + '」' : '',
      waitText: '对战次数每小时回 1 次，最多存 ' + game.ARENA_MAX + ' 次' + (wait ? '，下一次还要 ' + game.formatDuration(wait) : '') + '。',
      loading: cloud.boardLoading,
      error: cloud.boardError,
      rows: cloud.rows.map((row) => {
        const info = game.arenaInfo(s, row, power);
        return {
          id: row.id,
          rank: row.rank,
          name: row.name,
          realm: row.mine ? game.realmText(s.run) : row.realm,
          mine: row.mine,
          power: game.formatNumber(row.mine ? power : info.power),
          pct: percent(info.chance),
          gain: '胜：论道积分 +' + info.win + ' · 败：折寿 ' + info.years + ' 年',
          off: !!info.reason
        };
      })
    };
  },

  onArena() {
    if (this.act === 'thunder' || this.state.run.phase !== 'alive') return;
    audio.play('tap');
    this.guideOpen = false;
    this.cloudOpen = false;
    this.tribOpen = false;
    this.mergeOpen = false;
    this.arenaOpen = true;
    this.refresh();
    this.refreshBoard();
  },

  onArenaClose() {
    audio.play('tap');
    this.arenaOpen = false;
    this.refresh();
  },

  onArenaFight(e) {
    const id = e.currentTarget.dataset.id;
    const row = this.data.cloud.rows.filter((r) => r.id === id)[0];
    if (!row || row.mine) return;
    const info = game.arenaInfo(this.state, row);
    if (info.reason) {
      audio.play('bad');
      this.showBanner(info.reason);
      return;
    }
    const r = game.arenaFight(this.state, row, Math.random, e.currentTarget.dataset.all ? game.ARENA_MAX : 1);
    if (!r) return;
    this.result = { title: r.title, label: r.label, lines: r.lines, dead: r.dead, arena: true };
    if (r.dead) wx.vibrateShort({ type: 'heavy' });
    this.play(r.dead ? this.deathAct() : actionForTags(r.tags));
    this.afterAction();
  },

  // 历练面板：眼前这一关和下一个首领的胜率、储物袋。胜率要跑几十场模拟，结果缓存到下一次状态变化。
  trainSheet() {
    const s = this.state;
    if (!this.trainCache) this.trainCache = game.trainView(s);
    const v = this.trainCache;
    const me = v.me;
    const bag = game.trainBag(s);
    const stages = v.stages.map((stage) => ({
      stage: stage.stage,
      name: stage.name,
      tag: stage.boss ? '首领' : '连打 ' + stage.waves + ' 只',
      now: stage.now,
      text: stage.text,
      sub: '气血 ' + game.formatNumber(stage.hp) + ' · 攻击 ' + game.formatNumber(stage.atk) + (stage.skill ? ' · 会使「' + stage.skill + '」' : ''),
      pct: percent(stage.chance)
    }));
    return {
      kind: 'train',
      title: v.open ? '历练 · 第 ' + v.stage + ' 关' : '历练',
      text: v.open
        ? '他坐在灯前自己打，不耗寿元和机缘。关卡没有尽头，每 ' + v.bossEvery + ' 关一个首领；败了调息一阵，退回 ' + game.TRAIN_RETREAT + ' 关再打，重打的关不再掉东西。这一世最远过了 ' + v.cleared + ' 关，历来最远 ' + v.best + ' 关。头一回过关得筑石，过首领关另得玉露，留着修洞府：手里有筑石 ' + s.run.stone + ' 块、玉露 ' + s.run.dew + ' 滴。'
        : v.reason,
      me: me ? '气血 ' + game.formatNumber(me.hp) + ' · 攻击 ' + game.formatNumber(me.atk) + ' · 每 ' + me.interval.toFixed(2) + ' 秒出手 · 减伤 ' + percent(me.reduce) + '% · 暴击 ' + percent(me.crit) + '%' : '',
      bagTitle: '储物袋 · 灵气 ' + game.formatNumber(bag.qi) + ' / ' + game.formatNumber(bag.max) + ' · 装备 ' + bag.gear + ' / ' + bag.gearMax,
      bagText: bag.perHour
        ? '每小时攒灵气 ' + game.formatNumber(bag.perHour) + '，每 ' + bag.gearMinutes + ' 分钟攒一件装备、一块筑石和 ' + game.STAR.clearIncense + ' 香火，最多存 ' + bag.hours + ' 小时的量，离开时也在攒。再过一关每小时灵气 ' + game.formatNumber(v.nextPerHour) + '。'
        : '过了第 1 关才开始攒。每过一关攒得更快，过首领关涨得更多。',
      bagOff: bag.qi < 1 && bag.gear < 1,
      incense: s.run.incense,
      stages: stages
    };
  },

  onTrain() {
    const run = this.state.run;
    if (this.act === 'thunder' || run.phase !== 'alive') return;
    audio.play('tap');
    this.guideOpen = false;
    this.cloudOpen = false;
    this.arenaOpen = false;
    this.tribOpen = false;
    this.mergeOpen = false;
    this.gateOpen = false;
    this.trainCache = null;
    this.trainOpen = true;
    this.refresh();
  },

  onTrainClose() {
    audio.play('tap');
    this.trainOpen = false;
    this.refresh();
  },

  // 秘境面板：材料凑了多少、三个对手的数值和胜率。胜率要跑几十场模拟，结果缓存到下一次状态变化。
  gateSheet() {
    const s = this.state;
    if (!this.gateCache) this.gateCache = game.gateView(s);
    const v = this.gateCache;
    if (!v) return null;
    const playing = !!(this.fray && this.fray.gate);
    return {
      kind: 'gate',
      title: v.scene + ' · ' + v.material + ' ' + v.have + ' / ' + v.need,
      text: v.text,
      note: (v.done ? v.material + '已经凑齐，' + v.trib + '可以落下来了。' : v.trib + '要先凑齐 ' + v.need + ' 份' + v.material + '才肯落下来，渡劫失败不用重凑。') +
        '每打一场耗 ' + v.cost + ' 次机缘，不耗寿元，也不算进劫期；输了什么也拿不到，但这里的对手会让一步（气血和攻击各 −' + percent(v.yieldStep) + '%，最多让 ' + v.yieldMax + ' 步' +
        (v.yielded ? '，已让 ' + v.yielded + ' 步' : '') + '）。眼下有机缘 ' + Math.floor(s.run.chance) + ' 次。',
      sit: v.saving ? '机缘不够打一场。静坐 ' + v.saveYears + ' 年，等下一次机缘回来。' : '',
      sitOff: v.saveYears >= game.yearsLeft(s),
      off: !!v.reason || playing,
      reason: playing ? '这一场还没打完' : v.reason,
      foes: v.foes.map((foe) => ({
        id: foe.id,
        name: foe.name,
        tier: foe.tier,
        text: foe.text,
        sub: '气血 ' + game.formatNumber(foe.hp) + ' · 攻击 ' + game.formatNumber(foe.atk) + ' · 会使「' + foe.skill + '」 · 相当于历练第 ' + foe.stage + ' 关的首领',
        gain: '打赢得' + v.material + ' ' + foe.gain + ' 份',
        pct: percent(foe.chance)
      }))
    };
  },

  // 换档或重开时，收起旧那一世的场景和战斗。
  clearScenes() {
    this.cancelStarTurn();
    this.starOpen = false;
    this.gateOpen = false;
    this.gateCache = null;
    this.pausedFray = null;
    this.fray = null;
    this.setData({ bar: HIDDEN_BAR });
  },

  onGate() {
    const run = this.state.run;
    if (this.act === 'thunder' || run.phase !== 'alive' || !game.tribGate(this.state)) return;
    audio.play('tap');
    this.guideOpen = false;
    this.cloudOpen = false;
    this.arenaOpen = false;
    this.trainOpen = false;
    this.tribOpen = false;
    this.bracing = false;
    this.mergeOpen = false;
    this.eventOpen = false;
    this.gateCache = null;
    this.gateOpen = true;
    this.refresh();
  },

  onGateClose() {
    audio.play('tap');
    this.gateOpen = false;
    this.refresh();
  },

  // 机缘不够打一场时，在秘境面板里静坐着攒。
  onGateSit() {
    const sat = game.meditate(this.state);
    if (!sat) {
      audio.play('bad');
      return;
    }
    if (sat.dead) {
      this.gateOpen = false;
      this.finishChoice(sat);
      return;
    }
    this.play('seclude');
    this.afterAction();
  },

  // 进秘境打一场：规则层当场算完，这里收起面板，把场景换成秘境，按时间轴演完再出结算。
  onGateFight(e) {
    if (this.act === 'thunder') return;
    if (this.fray && this.fray.gate) {
      this.showBanner('这一场还没打完');
      return;
    }
    const r = game.gateFight(this.state, e.currentTarget.dataset.id, Math.random);
    if (!r) {
      audio.play('bad');
      this.showBanner(game.gateReason(this.state) || '眼下打不了');
      return;
    }
    audio.play('tap');
    const fight = r.fight;
    this.gateOpen = false;
    this.pausedFray = this.fray;
    this.fray = {
      gate: fight.gate, scene: fight.scene, result: r, stage: 0, wave: 0, waves: 1, phase: 'enter', wait: FRAY_ENTER, fight: fight, next: 0, step: 0,
      me: fight.me.max, max: fight.me.max, foe: fight.foe.max, shield: 0, pops: [], key: 0, meHit: 0, foeHit: 0, foeAct: 0, shot: 0, shotKind: 'hit'
    };
    this.setData({ bar: this.barView(this.fray) });
    this.afterAction();
  },

  // 秘境里的一场：入场、照时间轴打完、倒下或败退，然后出结算，场景回到历练。
  gateTick(f) {
    let dirty = false;
    if (f.phase === 'fight') {
      const timeline = f.fight.timeline;
      f.step += 1;
      while (f.next < timeline.length && timeline[f.next].t * 10 <= f.step + 1e-6) {
        this.frayEvent(f, timeline[f.next++]);
        dirty = true;
      }
      if (f.next >= timeline.length) {
        dirty = true;
        f.phase = f.fight.win ? 'fall' : 'rest';
        f.wait = f.fight.win ? FRAY_FALL : FRAY_GATE_LOSE;
      }
    } else {
      f.wait -= 1;
      if (f.wait <= 0) {
        if (f.phase !== 'enter') {
          this.gateDone(f);
          return;
        }
        f.phase = 'fight';
        dirty = true;
      }
    }
    if (dirty) this.setData({ bar: this.barView(f) });
  },

  gateDone(f) {
    const r = f.result;
    const paused = this.pausedFray;
    this.pausedFray = null;
    if (this.state.run.phase !== 'alive' || this.act === 'thunder') {
      this.fray = null;
      this.setData({ bar: HIDDEN_BAR });
      return;
    }
    this.fray = paused || null;
    this.setData({ bar: this.fray ? this.barView(this.fray) : HIDDEN_BAR });
    const more = game.tribGate(this.state);
    this.result = { title: r.title, label: r.label, text: r.text, lines: r.lines, dead: false, gate: true, nextGate: more && more.short ? '回' + f.scene : '' };
    this.eventOpen = false;
    this.play(r.win ? 'cheer' : 'hurt');
    this.afterAction();
  },
  // 场景里的历练。规则层一次算完一场，这里按时间轴演出来；渡劫的雷落完之前先停着。
  frayTick() {
    if (this.fray && this.fray.gate) {
      // 打到一半渡劫或身死：这一场已经结算过，不再演。
      if (this.act === 'thunder' || this.state.run.phase !== 'alive') {
        this.pausedFray = null;
        this.fray = null;
        this.setData({ bar: HIDDEN_BAR });
      } else {
        this.gateTick(this.fray);
      }
      return;
    }
    const stage = game.trainStage(this.state);
    if (!stage || this.act === 'thunder') {
      if (this.fray || this.data.bar.show) {
        this.fray = null;
        this.setData({ bar: HIDDEN_BAR });
      }
      return;
    }
    let f = this.fray;
    let dirty = false;
    // 败了当场就退关，调息那一阵还照原来这一关演完。
    if (!f || (f.stage !== stage && f.phase !== 'rest')) {
      f = this.fray = {
        stage: stage, wave: 0, waves: game.trainWaves(stage), phase: 'gap', wait: FRAY_GAP, fight: null, next: 0, step: 0,
        me: 1, max: 1, foe: 0, shield: 0, pops: [], key: 0, meHit: 0, foeHit: 0, foeAct: 0, shot: 0, shotKind: 'hit'
      };
      dirty = true;
    }
    if (f.phase === 'fight') {
      const timeline = f.fight.timeline;
      f.step += 1;
      while (f.next < timeline.length && timeline[f.next].t * 10 <= f.step + 1e-6) {
        this.frayEvent(f, timeline[f.next++]);
        dirty = true;
      }
      if (f.next >= timeline.length) {
        dirty = true;
        if (f.fight.win) {
          f.phase = 'fall';
          f.wait = FRAY_FALL;
        } else {
          f.phase = 'rest';
          f.wait = FRAY_REST;
          const lost = game.trainLose(this.state, f.stage);
          f.back = lost && lost.stage < f.stage ? lost.stage : 0;
          if (!this.act && !this.data.sheet.kind) this.play('hurt', null, true);
          this.afterAction();
        }
      }
    } else {
      f.wait -= 1;
      if (f.wait <= 0) {
        dirty = true;
        if (f.phase === 'enter') {
          f.phase = 'fight';
        } else if (f.phase === 'fall' && f.fight.last) {
          this.frayClear(f);
          return;
        } else if (f.phase === 'gap') {
          this.frayNext(f);
        } else if (f.phase === 'rest' && f.stage !== stage) {
          this.fray = null;
          return;
        } else {
          f.wave = f.phase === 'fall' ? f.wave + 1 : 0;
          f.phase = 'gap';
          f.wait = FRAY_GAP;
          f.fight = null;
          f.pops = [];
        }
      }
    }
    if (dirty) this.setData({ bar: this.barView(f) });
  },

  frayNext(f) {
    const fight = game.trainEncounter(this.state, f.wave, Math.random);
    if (!fight) {
      this.fray = null;
      return;
    }
    f.fight = fight;
    f.next = 0;
    f.step = 0;
    f.me = fight.me.max;
    f.max = fight.me.max;
    f.foe = fight.foe.max;
    f.shield = 0;
    f.pops = [];
    f.phase = 'enter';
    f.wait = FRAY_ENTER;
  },

  // 这一关最后一个倒下了：记过关，下一拍换下一关。
  frayClear(f) {
    const r = game.trainClear(this.state, f.stage, Math.random);
    this.fray = null;
    if (!r) return;
    if (r.again) {
      this.save();
      return;
    }
    if (this.starOpen) {
      this.afterAction();
      return;
    }
    const drop = r.drop ? this.dropText(r.drop) : '';
    const incense = ' · 香火 +' + r.incense;
    if (r.boss) {
      audio.play('good');
      this.showBanner('第 ' + r.stage + ' 关 · 打赢了' + r.name + incense + (drop ? ' · ' + drop : '') + (r.stone ? ' · 筑石 +' + r.stone : '') + (r.dew ? ' · 玉露 +' + r.dew : '') + ' · 储物袋每小时 +' + game.formatNumber(r.perHour));
      if (!this.act && !this.data.sheet.kind) this.play('cheer', null, true);
    } else {
      if (drop) audio.play('coin');
      this.showBanner((r.stage === 1 ? '试招取胜' : '第 ' + r.stage + ' 关') + incense + (drop ? ' · ' + drop : ''));
    }
    this.afterAction();
  },

  dropText(drop) {
    const name = '掉了' + drop.item.grade + drop.item.name;
    if (drop.worn) return name + '，已穿上';
    if (drop.scrapped) return name + '，背包满了，分解成锻材 +' + drop.scrapped;
    return name + (drop.better ? '，比身上的好' : '');
  },

  onBag() {
    const r = game.trainCollect(this.state, Math.random);
    if (!r) {
      audio.play('tap');
      this.showBanner(game.trainBag(this.state).perHour ? '储物袋还是空的，等它攒一会儿' : '过了第 1 关，储物袋才开始攒东西');
      return;
    }
    const better = r.drops.filter((drop) => drop.better || drop.worn).length;
    this.showBanner('收了储物袋：' + r.lines.join('，') + (better ? '（' + better + ' 件比身上的好）' : ''));
    if (!this.act) this.play(r.qi ? actionForTags(r.tags) : 'lucky');
    else audio.play('qi');
    this.afterAction();
  },

  // 装备页。
  gearPanel() {
    const v = game.gearView(this.state);
    return {
      score: v.score,
      bonus: v.bonus || '身上还没有装备',
      forge: v.forge + ' / ' + v.forgeMax,
      need: v.trib.need ? v.trib.name + '要装备分 ' + v.trib.need + (v.trib.short ? '，还差 ' + (v.trib.need - v.trib.score) + '：渡劫成功率 −' + percent(v.trib.penalty) + '%' : '，已经够了' + (v.trib.bonus >= 0.005 ? '：渡劫成功率 +' + percent(v.trib.bonus) + '%' : '')) : '',
      needShort: v.trib.short,
      worn: v.worn.map((entry) => ({
        slot: entry.slot,
        slotName: entry.slotName,
        item: entry.item,
        max: !!entry.item && !entry.cost,
        cost: entry.cost,
        off: !entry.canEnhance
      })),
      pack: v.pack,
      packCount: v.pack.length + ' / ' + v.packMax,
      hasBetter: v.hasBetter,
      hasSpare: v.hasSpare
    };
  },

  onGearEquip(e) {
    if (!game.gearEquip(this.state, Number(e.currentTarget.dataset.uid))) return;
    audio.play('pick');
    this.afterAction();
  },

  onGearBest() {
    const count = game.gearEquipBest(this.state);
    if (!count) return;
    audio.play('pick');
    this.showBanner('换上了 ' + count + ' 件更好的');
    this.afterAction();
  },

  onGearEnhance(e) {
    if (!game.gearEnhance(this.state, e.currentTarget.dataset.slot)) {
      audio.play('bad');
      this.showBanner('锻材不够，分解用不上的装备可以得锻材');
      return;
    }
    audio.play('up');
    this.afterAction();
  },

  onGearScrap(e) {
    const value = game.gearScrap(this.state, Number(e.currentTarget.dataset.uid));
    if (!value) return;
    audio.play('tap');
    this.showBanner('分解：锻材 +' + value);
    this.afterAction();
  },

  onGearSpare() {
    const r = game.gearScrapSpare(this.state);
    if (!r.count) return;
    audio.play('tap');
    this.showBanner('分解了 ' + r.count + ' 件：锻材 +' + r.forge);
    this.afterAction();
  },

  // 把时间轴上的一件事演出来：改气血、飘一个数字、触发一次出手或受击的动画。
  // 同一个动画连着触发时要在 1 和 2 之间来回切，才能重新播放。
  frayEvent(f, e) {
    const flip = (value) => (value === 1 ? 2 : 1);
    const pop = (side, text, tone) => {
      f.pops = f.pops.concat({ key: ++f.key, side: side, text: text, tone: tone, dx: Math.round(Math.random() * 60 - 30) }).slice(-FRAY_POPS);
    };
    const quoted = /「(.+?)」/.exec(e.text || '');
    if (e.who === 'me' && FRAY_MY_HITS.indexOf(e.kind) >= 0) {
      const heavy = e.kind === 'crit' || e.kind === 'execute';
      f.foeHit = flip(f.foeHit);
      if (e.kind !== 'thorns') {
        f.shot = flip(f.shot);
        f.shotKind = heavy ? 'crit' : (e.kind === 'extra' ? 'extra' : 'hit');
      }
      pop('foe', '-' + e.value, heavy ? 'crit' : (e.kind === 'thorns' ? 'thorns' : 'hit'));
    } else if (e.who === 'foe' && (e.kind === 'hit' || e.kind === 'skill')) {
      f.meHit = flip(f.meHit);
      f.foeAct = flip(f.foeAct);
      if (e.kind === 'skill' && quoted) pop('foe', quoted[1], 'call');
      pop('me', '-' + e.value, e.kind === 'skill' ? 'crit' : 'hurt');
    } else if (e.kind === 'heal' || e.kind === 'revive') {
      pop('me', '+' + e.value, 'heal');
    } else if (e.kind === 'shield') {
      pop('me', '护盾', 'heal');
    } else if (e.kind === 'curse' && quoted) {
      f.shot = flip(f.shot);
      f.shotKind = 'charm';
      pop('foe', quoted[1], 'call');
    } else if (e.kind === 'resist') {
      pop('foe', '抖掉了', 'call');
    } else if (e.kind === 'sealed') {
      pop('foe', '封', 'call');
    }
    f.me = e.me;
    f.foe = e.foe;
    f.shield = e.shield;
  },

  barView(f) {
    const fight = f.fight;
    const pct = (value, max) => Math.max(0, Math.min(100, Math.round(100 * value / max)));
    const boss = f.waves === 1;
    const pips = [];
    for (let i = 0; i < f.waves; i += 1) {
      pips.push({ key: i, on: i < f.wave || (i === f.wave && f.phase === 'fall'), now: i === f.wave && f.phase !== 'fall', boss: boss });
    }
    const rest = f.phase === 'rest';
    return {
      show: true,
      scene: f.gate || '',
      title: f.gate ? f.scene : (f.stage === 1 ? '试招' : '第 ' + f.stage + ' 关'),
      pips: f.gate ? [] : pips,
      rest: rest,
      note: rest ? (f.gate ? '没打过' : '败了一阵 · ' + (f.back ? '退回第 ' + f.back + ' 关' : '调息中')) : '',
      mePct: rest ? 100 : pct(f.me, f.max),
      shield: rest ? 0 : pct(f.shield, f.max),
      foe: fight ? {
        name: fight.foe.name,
        sprite: fight.sprite,
        boss: fight.boss,
        tag: f.gate ? fight.tier : (fight.boss ? '首领' : ''),
        pct: pct(f.foe, fight.foe.max),
        state: { enter: 'in', fight: 'on', fall: 'out', rest: 'away' }[f.phase]
      } : null,
      meHit: f.meHit,
      foeHit: f.foeHit,
      foeAct: f.foeAct,
      shot: f.phase === 'fight' || f.phase === 'fall' ? f.shot : 0,
      shotKind: f.shotKind,
      pops: f.pops
    };
  },
  tribulationView() {
    const yuan = game.yuanTrialView(this.state);
    if (yuan) {
      const penalty = '失败时折寿 ' + yuan.failYears + ' 年，心魔 +' + yuan.failDemon + '，' + yuan.keepText + '。回满灵气可从盐骨关重试，枯海所得保留。';
      return {
        kind: 'yuan',
        step: yuan.step,
        title: yuan.name,
        text: yuan.text,
        note: '先过盐骨关（锋或躯），再过问名关（神或事先准备）。' + penalty + gearShortText(yuan.gear),
        options: yuan.options.map((option) => ({
          ...option, rate: option.chance === 1 ? '必过' : percent(option.chance) + '%'
        }))
      };
    }
    const info = game.tribulationInfo(this.state);
    if (!info) return HIDDEN_SHEET;
    if (info.bolts) return this.boltView(info);
    return {
      kind: 'trib',
      title: info.name,
      text: (info.wall ? '这是一道大关，失败折的寿元比寻常天劫重得多。' : '') + (info.aspect ? '这一世的劫相是「' + info.aspect + '」：' : '') + '考' + info.tests.map((k) => game.ATTR_NAMES[k]).join('、') + (info.tests.length > 1 ? '，各需 ' : '，需 ') + info.req + '。' + gearShortText(info.gear) + '选一种渡法，选定即引下天雷。',
      options: [
        {
          id: 'endure',
          label: '硬抗 · 成功率 ' + percent(info.chance) + '%',
          desc: '成功：' + (info.final ? game.REALMS[this.state.run.realm].name + '圆满' : (info.demonOk ? '只升境界，不加寿元' : '寿元上限 +' + info.lifeGain + ' 年')) + '，' + TRIB_CHANCE_TEXT + '；失败：折寿 ' + info.failYears + ' 年，心魔 +' + info.failDemon + '，' + info.keepText + '。',
          disabled: false
        },
        {
          id: 'borrow',
          label: '借势 · 成功率 ' + percent(info.borrowChance) + '%',
          desc: '先耗 ' + info.borrowCost + ' 次机缘，成功率 +' + percent(Math.max(0, info.borrowChance - info.chance)) + '%（装备不足会压低借势）；其余成败结果与硬抗相同。',
          disabled: !info.borrowReady,
          note: info.borrowReady ? '当前机缘 ' + Math.floor(this.state.run.chance) + ' 次' : '机缘不足 ' + info.borrowCost + ' 次'
        },
        {
          id: 'scatter',
          label: '散功 · 必定失败，不会身死',
          desc: scatterDesc(info),
          disabled: false
        }
      ]
    };
  },

  // 逐道雷的天劫：一排雷的进度、成功率的来历，和这一道怎么接。
  boltView(info) {
    const bolts = info.bolts;
    const chance = Math.floor(this.state.run.chance);
    const fail = '折寿 ' + info.failYears + ' 年，心魔 +' + info.failDemon;
    const borrowNote = info.borrowReady ? '当前机缘 ' + chance + ' 次' : '机缘不足 ' + info.borrowCost + ' 次';
    const pips = [];
    for (let i = 0; i < bolts.total + bolts.extraTotal; i++) {
      const extra = i >= bolts.total;
      const passed = extra ? i - bolts.total < bolts.gains : i < bolts.passed;
      const now = !passed && (extra ? bolts.extra && i - bolts.total === bolts.gains : i === bolts.passed);
      pips.push({ key: i, text: extra ? '余' : String(i + 1), state: passed ? 'done' : (now ? 'now' : 'wait'), extra: extra });
    }
    const broke = (info.demonOk ? '只升境界，不加寿元' : '寿元上限 +' + info.lifeGain + ' 年') + '，' + TRIB_CHANCE_TEXT;
    const options = bolts.extra ? [
      {
        id: 'settle',
        label: '收劫 · 破境',
        desc: broke + (bolts.held.length ? '；带走淬体所得：' + bolts.held.join('；') : '') + '。',
        disabled: false
      },
      {
        id: 'endure',
        label: '再引一道余雷 · ' + percent(bolts.chance) + '%',
        desc: '接住：' + bolts.reward + '（收劫时到手）。没接住：照样破境，但淬体所得尽失，' + fail + '。',
        disabled: false
      },
      {
        id: 'borrow',
        label: '借势引余雷 · ' + percent(bolts.borrowChance) + '%',
        desc: '先耗 ' + info.borrowCost + ' 次机缘，这一道成功率 +10%；其余同上。',
        disabled: !info.borrowReady,
        note: borrowNote
      }
    ] : [
      {
        id: 'endure',
        label: '硬接 · 这一道 ' + percent(bolts.chance) + '%',
        desc: '接住就轮到下一道。没接住整场失败：' + fail + '，' + info.keepText + '。',
        disabled: false
      },
      {
        id: 'borrow',
        label: '借势 · 这一道 ' + percent(bolts.borrowChance) + '%',
        desc: '先耗 ' + info.borrowCost + ' 次机缘，这一道成功率 +10%；成败结果与硬接相同。',
        disabled: !info.borrowReady,
        note: borrowNote
      },
      {
        id: 'scatter',
        label: '散功 · 不接了，不会身死',
        desc: scatterDesc(info),
        disabled: false
      }
    ];
    return {
      kind: 'bolt',
      title: info.name + (info.aspect ? '「' + info.aspect + '」' : ''),
      step: bolts.extra ? '余雷 第 ' + bolts.index + ' / ' + bolts.extraTotal + ' 道' : '第 ' + bolts.index + ' / ' + bolts.total + ' 道雷',
      text: '考' + info.tests.map((k) => game.ATTR_NAMES[k]).join('、') + (info.tests.length > 1 ? '，各需 ' : '，需 ') + info.req +
        (bolts.extra ? '。必接的雷已经过了，劫云还没散。' : '。必接的雷一道比一道难，剩下的全过的把握是 ' + percent(info.chance) + '%。'),
      pips: pips,
      parts: info.parts.map((part, i) => ({ key: i, label: part.label, value: (part.value > 0 ? '+' : '') + Math.round(part.value * 100) + '%', bad: part.value < 0 })),
      last: this.boltLast || '',
      falling: !!this.boltFalling,
      options: options
    };
  },

  mergeView() {
    const source = game.skillInfo(this.mergeSource);
    const options = game.mergeOptions(this.state, this.mergeSource).map((option) => ({
      id: option.second,
      name: '《' + game.skillInfo(option.second).name + '》',
      arcane: '《' + option.arcane.name + '》',
      desc: game.skillDesc(option.arcane, 1)
    }));
    return {
      kind: 'merge',
      title: '以《' + source.name + '》合秘法',
      text: '同系两门天品归一，合成后只占 1 格，全部数值效果约为两者之和的 1.2 倍。秘法不能拆分，也不会再出现在普通传承里。',
      options: options
    };
  },

  chronicleView() {
    const data = game.chronicle(this.state);
    return {
      kind: 'chronicle',
      title: data.title,
      subtitle: data.subtitle,
      intro: data.intro,
      rows: data.rows.map((row, i) => ({
        key: i,
        age: row.age === null ? '年岁未记' : row.age + ' 岁',
        title: row.title,
        text: row.text,
        detail: row.detail
      })),
      busy: this.chronicleBusy,
      ready: !!this.shareImage && !this.chronicleBusy,
      error: this.chronicleError
    };
  },

  onPowder() {
    if (this.act === 'thunder') return;
    this.finishChoice(game.takePowder(this.state));
  },

  onMerge(e) {
    if (this.act === 'thunder' || this.state.run.pending) return;
    const id = e.currentTarget.dataset.id;
    if (!game.mergeOptions(this.state, id).length) return;
    audio.play('tap');
    this.mergeSource = id;
    this.mergeOpen = true;
    this.eventOpen = false;
    this.refresh();
  },

  onMergePick(e) {
    const first = this.mergeSource;
    const second = e.currentTarget.dataset.id;
    const option = game.mergeOptions(this.state, first).filter((item) => item.second === second)[0];
    if (!option) return;
    audio.play('tap');
    this.openModal({
      title: '炼成《' + option.arcane.name + '》',
      content: game.skillDesc(option.arcane, 1) + '。两门天品功法将消失，合成不可撤销。',
      highlight: '两门归一 · 功法位 -1',
      confirmText: '合成秘法',
      cancelText: '再想想'
    }, function () {
      this.mergeOpen = false;
      this.finishChoice(game.mergeSkills(this.state, first, second, Math.random));
    });
  },

  onChronicle() {
    if (this.state.run.phase !== 'dead') return;
    audio.play('tap');
    this.deadOpen = false;
    this.chronicleOpen = true;
    this.shareImage = '';
    this.chronicleError = '';
    this.generateChronicleImage();
  },

  onChronicleClose() {
    audio.play('tap');
    this.chronicleOpen = false;
    this.chronicleBusy = false;
    this.chronicleToken++;
    this.shareImage = '';
    this.deadOpen = true;
    this.setData({ chronicleCanvas: { show: false, width: 750, height: 1000 } });
    this.refresh();
  },

  onChronicleShare() {
    if (this.shareImage || this.chronicleBusy) return;
    this.generateChronicleImage();
  },

  generateChronicleImage() {
    if (!this.chronicleOpen || this.state.run.phase !== 'dead') return;
    const data = game.chronicle(this.state);
    const layout = chronicleLayout(data);
    const token = ++this.chronicleToken;
    this.chronicleBusy = true;
    this.chronicleError = '';
    this.shareImage = '';
    this.refresh();
    this.setData({ chronicleCanvas: { show: true, width: layout.width, height: layout.height } }, () => {
      if (token !== this.chronicleToken) return;
      wx.createSelectorQuery().in(this).select('#chronicleCanvas').fields({ node: true, size: true }).exec((res) => {
        const canvas = res && res[0] && res[0].node;
        if (!canvas) {
          this.failChronicle(token, '当前环境无法创建长图画布');
          return;
        }
        try {
          let ratio = 1;
          if (typeof wx.getWindowInfo === 'function') ratio = wx.getWindowInfo().pixelRatio || 1;
          const dpr = Math.min(2, Math.max(1, ratio));
          canvas.width = layout.width * dpr;
          canvas.height = layout.height * dpr;
          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          drawChronicle(ctx, data, layout);
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: (out) => {
              if (token !== this.chronicleToken) return;
              this.chronicleBusy = false;
              this.shareImage = out.tempFilePath;
              this.refresh();
            },
            fail: () => this.failChronicle(token, '长图生成失败，请重试')
          }, this);
        } catch (e) {
          this.failChronicle(token, '长图生成失败，请重试');
        }
      });
    });
  },

  failChronicle(token, message) {
    if (token !== this.chronicleToken) return;
    this.chronicleBusy = false;
    this.chronicleError = message;
    this.shareImage = '';
    this.refresh();
  },

  onShareAppMessage() {
    const run = this.state.run;
    if (run.phase === 'dead' && this.chronicleOpen) {
      const share = { title: game.chronicle(this.state).title + ' · 烬灯录', path: '/pages/index/index' };
      if (this.shareImage) share.imageUrl = this.shareImage;
      return share;
    }
    return { title: '烬灯录 · 天道已死，灯火未灭', path: '/pages/index/index' };
  },

  sheetView(power) {
    const s = this.state;
    const run = s.run;
    if (this.cloudOpen) return { kind: 'cloud' };
    if (this.guideOpen) return this.guideView();
    if (this.chronicleOpen && run.phase === 'dead') return this.chronicleView();
    if (run.phase === 'root') {
      const fate = game.FATES.filter((item) => item.id === run.fate)[0];
      return {
        fate: fate ? { name: fate.name, desc: fate.desc, text: fate.text } : null,
        kind: 'root',
        heavens: s.heavenMax ? Array.from({ length: s.heavenMax + 1 }, (_, i) => ({ level: i, name: i ? '第 ' + i + ' 重天' : '凡天', on: run.heaven === i })) : [],
        heavenText: game.heavenText(run.heaven),
        title: s.lives ? '你又在灯旁醒来' : '你在一盏灯旁醒来',
        text: '又是一个刚出生的人。挑一副这一世的根骨，底色越亮越稀有。不满意可以换一批：',
        rolls: run.rootRolls,
        rollText: run.rootRolls > 0 ? '换一批（还能换 ' + run.rootRolls + ' 次）' : '换一批的次数用完了',
        options: run.rootChoices.map((id) => {
          const root = game.rootInfo(id);
          const perks = [];
          game.ATTRS.forEach((k) => {
            if (root[k]) perks.push(game.ATTR_NAMES[k] + ' +' + root[k]);
          });
          if (root.qi) perks.push('灵气产出 +' + percent(root.qi) + '%');
          if (root.life) perks.push('寿元上限 +' + root.life + ' 年');
          if (root.chance) perks.push('机缘上限 +' + root.chance);
          perks.push(root.schools.length === game.SCHOOL_IDS.length
            ? '五系功法都更容易遇到'
            : '更容易遇到' + root.schools.map((k) => game.SCHOOLS[k].name).join('、') + '系功法');
          return { id: id, name: root.name, text: root.text, desc: perks.join('，'), rarity: root.rarity, rarityName: game.ROOT_RARITIES[root.rarity].name + '骨' };
        })
      };
    }
    if (this.result) {
      const r = this.result;
      let nextText = '';
      if (!r.dead) {
        if (r.nextTrib) nextText = r.nextTrib;
        else if (r.gate) nextText = r.nextGate;
        else if (r.nextMountain && !run.pending && game.mountainReady(s)) nextText = '返回山门';
        else if (r.voyage && game.atSea(run)) nextText = '继续探索';
        else if (r.fromEvent && game.lampReady(s) === 'insight') nextText = '点灯顿悟';
        else if (!r.nextMountain && !r.voyage && !r.yuan && !r.arena && !run.pending && game.canDraw(s)) nextText = '下一个机缘（剩 ' + Math.floor(run.chance) + '）';
        else if (!r.nextMountain && !r.voyage && !r.yuan && !r.arena && game.canMeditate(s) && game.meditateYears(s) < game.yearsLeft(s)) nextText = '再静坐一阵';
      }
      return {
        kind: 'result',
        title: r.title,
        label: r.label,
        text: r.text || '',
        lines: r.lines.map((text, i) => ({ key: i, text: text })),
        impact: r.impact || '',
        lampProgress: r.fromEvent && run.phase === 'alive' && run.lamp.school && !run.lamp.spent && run.lamp.sparks < game.LAMP_INSIGHT,
        okText: r.dead ? '……' : (run.pending ? '取舍功法' : '收起'),
        nextText: nextText
      };
    }
    if (this.lampOpen) {
      const view = game.lampView(s);
      if (view) {
        const opening = view.kind === 'open';
        return {
          kind: 'lamp', stamp: view.stamp, opening: opening,
          title: opening ? '从灯里取一卷功法' : game.SCHOOLS[run.lamp.school].name + '卷顿悟',
          text: opening ? '灯照出三行字。你选的那一行，会成为这一世的灯传。' : '三点火照亮残页。选一条路，这一境的灯火便用尽了。',
          options: view.options.map((o) => Object.assign({ glyph: o.school ? game.SCHOOLS[o.school].name : (o.id === 'channel' ? '气' : '芯') }, o))
        };
      }
    }
    if (this.arenaOpen && run.phase === 'alive') return this.arenaView(power);
    if (this.trainOpen && run.phase === 'alive') return this.trainSheet();
    if (this.gateOpen && run.phase === 'alive') {
      const gate = this.gateSheet();
      if (gate) return gate;
    }
    if (this.seaOpen) {
      const sea = game.seaView(s);
      if (sea) return Object.assign({ kind: 'sea' }, sea);
    }
    if (this.mountainPanel) {
      const mountain = game.mountainView(s, this.mountainPanel, this.mountainMember);
      if (mountain) return Object.assign({ kind: 'mountain' }, mountain);
    }
    if (this.tribOpen && run.phase === 'alive') return this.tribulationView();
    if (this.pathOpen) {
      const path = game.pathView(s);
      if (path) {
        const plan = game.tribPlan(s).slice(run.realm).map((t) => t.name + (t.aspect ? '「' + t.aspect + '」' : '') + '考' + t.tests.map((k) => game.ATTR_NAMES[k]).join('') + ' ' + t.req).join('；');
        return Object.assign({ kind: 'path', plan: '这一世剩下的天劫：' + plan }, path);
      }
    }
    if (this.mergeOpen && run.phase === 'alive') return this.mergeView();
    if (run.pending && !this.replaceHidden) {
      const skill = game.skillInfo(run.pending.id);
      return {
        kind: 'replace',
        title: game.skillTitle(skill, run.pending.level),
        text: game.skillDesc(skill, run.pending.level),
        max: game.maxSkills(s),
        options: this.skillViews().map((v) => ({ id: v.id, name: '《' + v.name + '》（' + v.school + '·' + v.grade + '）', desc: v.desc }))
      };
    }
    if (run.phase === 'alive' && run.event && this.eventOpen) {
      return Object.assign({ kind: 'event' }, game.eventView(s));
    }
    if (run.phase === 'dead' && this.deadOpen) {
      return {
        kind: 'dead',
        text: run.death.text,
        wick: run.death.wick,
        carry: game.canCarry(s) ? this.skillViews().filter((v) => !v.arcane && !v.tome).map((v) => ({ id: v.id, name: v.name, on: s.carry === v.id })) : []
      };
    }
    return HIDDEN_SHEET;
  },

  skillViews() {
    return this.state.run.skills.map((entry) => {
      const skill = game.skillInfo(entry.id);
      const school = game.SCHOOLS[skill.school];
      return {
        id: skill.id,
        name: skill.name,
        school: school.name,
        color: school.color,
        grade: skill.arcane ? '秘法' : game.gradeName(entry.level) + '品',
        arcane: !!skill.arcane,
        tome: !!skill.tome,
        suppressed: !!(skill.arcane && this.state.run.aftermath && this.state.run.aftermath.id === 'backlash'),
        canMerge: !skill.arcane && entry.level === game.GRADES.length && game.mergeOptions(this.state, skill.id).length > 0,
        desc: game.skillDesc(skill, entry.level)
      };
    });
  },

  // 每秒都会重算一次面板，玩家点开的「详情」要留住，不然刚展开就被收回。
  keepOpen(next) {
    const cur = this.data.sheet;
    if (!cur || !next || !cur.options || !next.options || cur.title !== next.title) return next;
    next.options = next.options.map((item) => {
      const old = cur.options.filter((o) => o.label === item.label)[0];
      return old && old.open ? Object.assign({}, item, { open: true }) : item;
    });
    return next;
  },

  refresh() {
    const s = this.state;
    const run = s.run;
    if (this.starOpen && run.phase === 'alive') {
      if (this.data.star.incense !== run.incense) this.renderStar();
      return;
    }
    // 天劫动画播完之前不揭晓结果：境界、寿元和结算面板都先不更新。
    if (this.act === 'thunder') {
      // 只在开始时设一次，之后不再触碰节点，免得动画被打断。
      if (!this.data.actor.storm) this.setData({ actor: this.actorView(), sheet: HIDDEN_SHEET });
      return;
    }
    const tab = this.data.tab;
    const a = run.phase !== 'root' || tab === 'skill' ? game.attrs(s) : null;
    const power = game.combatPowerDetails(s, a);
    const pouch = run.phase === 'alive' ? game.trainBag(s) : null;
    const patch = {
      bag: { text: pouch && pouch.perHour ? '储物袋 ' + game.formatNumber(pouch.qi) + (pouch.gear ? ' · 装备 ' + pouch.gear : '') : '储物袋', full: !!(pouch && pouch.full) },
      hud: this.hudView(power.total),
      hero: this.heroView(),
      actor: this.actorView(),
      tip: this.tipView(),
      sheet: this.keepOpen(this.sheetView(power.total)),
      autoUnlocked: game.autoUnlocked(s),
      gearDot: run.phase === 'alive' && game.gearHasBetter(s),
      alive: run.phase === 'alive',
      dead: run.phase === 'dead'
    };
    if (tab === 'gear') patch.gear = this.gearPanel();
    if (tab === 'skill') {
      const info = run.phase === 'alive' ? game.tribulationInfo(s) : null;
      const yuan = run.phase === 'alive' && run.realm === game.SEA_REALM ? game.TRIBS[run.realm] : null;
      const counts = game.setCounts(run);
      patch.powerSources = power.sources.map((source) => ({
        id: source.id,
        label: source.label,
        value: (source.value < 0 ? '−' : '+') + game.formatNumber(Math.abs(source.value))
      }));
      patch.attrs = game.ATTRS.map((k) => ({
        name: game.ATTR_NAMES[k],
        value: a[k],
        need: info ? (info.tests.indexOf(k) >= 0 ? info.req : 0) : (yuan ? game.tribPlan(s)[run.realm].req : 0)
      }));
      patch.sets = game.SCHOOL_IDS.map((id) => {
        const school = game.SCHOOLS[id];
        return {
          id: id,
          name: school.name,
          color: school.color,
          count: counts[id],
          set2: school.set2,
          set4: school.set4,
          on2: counts[id] >= 2,
          on4: counts[id] >= 4
        };
      });
      patch.skills = this.skillViews();
      patch.skillCount = run.skills.length + ' / ' + game.maxSkills(s);
    } else if (tab === 'log') {
      patch.karma = run.karma.map((k) => ({ name: game.KARMA[k.id] }));
      patch.marks = run.marks.map((m) => ({ name: game.MARKS[m] }));
      patch.logs = run.log.map((l, i) => ({ key: i, title: l.title, text: l.text, detail: l.detail || '' })).reverse();
    } else if (tab === 'lamp') {
      patch.lamps = game.LAMPS.map((lamp) => {
        const open = game.lampOpen(s, lamp.id);
        const maxed = game.lampMaxed(s, lamp.id);
        const cost = game.lampCost(s, lamp.id);
        return {
          id: lamp.id,
          branch: lamp.branch,
          name: lamp.name,
          desc: (open || !lamp.need ? '' : '首次到' + game.REALMS[lamp.need].name + '后开放。') + lamp.desc + (lamp.max > 1 ? '（每级）' : ''),
          levelText: open ? game.lampLevel(s, lamp.id) + ' / ' + game.lampMax(s, lamp.id) : '未开放',
          locked: !open,
          maxed: open && maxed,
          costText: game.formatNumber(cost),
          affordable: open && !maxed && s.wick >= cost
        };
      });
      const gradeText = (odds) => odds.map((p, i) => (p ? game.gradeName(game.GRADES.length + 1 + i) + '品 ' + Math.round(p * 100) + '%' : '')).filter(Boolean).join(' · ');
      patch.tomeTiers = game.TOME_TIERS.map((tier) => {
        const open = game.tomeTierOpen(s, tier.id);
        return {
          id: tier.id,
          name: tier.name,
          desc: open ? gradeText(game.tomeOdds(s, tier.id)) : '这一档能请出的品级都已收齐',
          open: open,
          costText: game.formatNumber(tier.cost),
          affordable: open && s.wick >= tier.cost
        };
      });
      const owned = game.TOMES.filter((tome) => game.tomeLevel(s, tome.id) > 0);
      patch.tomeCount = owned.length + ' / ' + game.TOMES.length;
      patch.tomes = owned.map((tome) => {
        const school = game.SCHOOLS[tome.school];
        const level = game.tomeLevel(s, tome.id);
        return { id: tome.id, name: tome.name, school: school.name, color: school.color, grade: game.gradeName(level) + '品', desc: game.skillDesc(tome, level) };
      });
    } else {
      const seen = game.knownProgress(s);
      const best = s.best < 0 ? '无' : game.REALMS[Math.floor(s.best / game.STAGES.length)].name + game.STAGES[s.best % game.STAGES.length].name;
      patch.stats = [
        { label: '已经历', value: s.lives + ' 世' },
        { label: '身死时的最高境界', value: best },
        { label: '累计灯芯', value: game.formatNumber(s.totalWick) },
        { label: '重天', value: (run.heaven ? '这一世在第 ' + run.heaven + ' 重天' : '这一世在凡天') + '，已开到第 ' + s.heavenMax + ' / ' + game.HEAVEN_MAX + ' 重' },
        { label: '见闻', value: '机缘选项已见过 ' + seen.known + ' / ' + seen.total + ' 个' },
        { label: '这一世的主修', value: run.path ? game.SCHOOLS[run.path].name + '系（克' + game.SCHOOLS[game.PATH_COUNTER[run.path]].name + '系）' : (run.phase === 'alive' && run.realm >= 1 ? '还没择道' : '-') },
        { label: '这一世的根骨', value: run.phase === 'root' ? '-' : game.rootInfo(run.root).name + '（' + game.ROOT_RARITIES[game.rootInfo(run.root).rarity].name + '骨）' },
        { label: '这一世的命格', value: run.phase === 'root' ? '-' : (game.FATES.filter((f) => f.id === run.fate)[0] || { name: '无（旧世）' }).name },
        { label: '这一世的道路', value: run.phase === 'root' ? '-' : (run.mode === 'demon' ? '魔修' : '常规修行') },
        { label: '机缘积攒', value: run.phase === 'root' ? '-' : '每过 ' + yearsText(game.chanceYears(s)) + ' 年寿元 1 次' },
        { label: '灯油', value: Math.floor(s.oil) + ' / ' + game.OIL_MAX + ' 滴，每 ' + game.formatDuration(game.OIL_INTERVAL_SEC) + ' 1 滴' },
        { label: '这一世的年岁', value: run.phase === 'root' ? '-' : run.age + ' / ' + game.maxLife(s) + ' 岁' },
        { label: '这一世做过的选择', value: run.choices + ' 个' }
      ];
      patch.epitaphs = s.epitaphs.map((text, i) => ({ key: i, text: text }));
    }
    this.setData(patch);
  },

  afterAction() {
    this.trainCache = null;
    this.gateCache = null;
    this.refresh();
    this.save();
  },

  onMain() {
    const s = this.state;
    const run = s.run;
    if (this.act === 'thunder') return;
    if (run.phase === 'dead') {
      this.onReborn();
      return;
    }
    if (run.phase !== 'alive') return;
    if (game.atSea(run)) {
      this.onSea();
      return;
    }
    if (run.pending) {
      audio.play('tap');
      this.replaceHidden = false;
      this.refresh();
      return;
    }
    if (run.trib) {
      this.onTrib();
      return;
    }
    if (!run.event) {
      if (!game.drawEvent(s, Math.random)) {
        const sat = game.meditate(s);
        if (sat) {
          this.finishChoice(sat);
          return;
        }
        this.showBanner('眼下翻不了机缘');
        this.play('shake');
        this.refresh();
        return;
      }
      this.play('notice');
    } else {
      audio.play('tap');
    }
    this.eventOpen = true;
    this.afterAction();
  },

  onBig() {
    const s = this.state;
    const run = s.run;
    if (run.phase !== 'alive' || this.act === 'thunder') return;
    const result = game.drawBig(s, Math.random);
    if (!result) {
      audio.play('bad');
      this.showBanner(run.pending ? '先把功法取舍了' : (run.event ? '先把眼前的机缘了结' : '突发未了，大机缘先留着'));
      return;
    }
    this.finishChoice(result);
  },

  onPath() {
    if (this.act === 'thunder' || !game.pathReady(this.state)) return;
    audio.play('tap');
    this.pathOpen = true;
    this.eventOpen = false;
    this.refresh();
  },

  onPathPick(e) {
    const result = game.choosePath(this.state, e.currentTarget.dataset.id);
    if (!result) return;
    this.pathOpen = false;
    this.finishChoice(result);
  },

  onHeaven(e) {
    if (!game.setHeaven(this.state, Number(e.currentTarget.dataset.level))) return;
    audio.play('tap');
    this.afterAction();
  },

  onRoot(e) {
    if (!game.chooseRoot(this.state, e.currentTarget.dataset.id, Date.now(), Math.random)) return;
    this.lampOpen = true;
    this.play('born');
    this.afterAction();
  },

  onLamp() {
    if (this.act === 'thunder' || this.fray && this.fray.gate || !game.lampReady(this.state)) return;
    this.lampOpen = true;
    audio.play('pick');
    this.refresh();
  },

  onLampPick(e) {
    if (!this.lampOpen || this.data.sheet.kind !== 'lamp') return;
    const data = e.currentTarget.dataset;
    const opening = this.data.sheet.opening;
    const result = game.chooseLamp(this.state, data.stamp, data.id, Math.random);
    if (!result) return;
    this.lampOpen = false;
    if (!opening || this.state.run.pending || result.dead) {
      this.finishChoice(result);
      return;
    }
    const impact = this.powerChange();
    this.showBanner('开卷 · ' + game.skillInfo(data.id).name + (impact ? '　' + impact : ''));
    this.play(actionForTags(result.tags));
    this.afterAction();
  },

  onRootReroll() {
    if (!game.rerollRoots(this.state, Math.random)) return;
    audio.play('tap');
    this.save();
    this.refresh();
  },

  onSea() {
    if (this.act === 'thunder' || !game.seaView(this.state)) return;
    audio.play('tap');
    this.seaOpen = true;
    this.refresh();
  },

  onMountain(e) {
    if (this.act === 'thunder' || this.result || !game.mountainReady(this.state)) return;
    this.mountainPanel = e && e.currentTarget.dataset.page || (this.state.mountainLegacy ? 'return' : (this.state.run.sect ? (this.state.run.sect.world.event ? 'world' : 'sect') : 'cave'));
    this.mountainMember = '';
    audio.play('tap');
    this.refresh();
  },

  onMountainMember(e) {
    this.mountainMember = e.currentTarget.dataset.id || '';
    audio.play('tap');
    this.refresh();
  },

  onMountainName(e) {
    this.setData({ mountainName: e.detail.value });
  },

  onMountainAction(e) {
    if (!this.mountainPanel || this.result) return;
    const data = e.currentTarget.dataset;
    const result = game.chooseMountain(this.state, data.page, data.member || '', data.stamp, data.id, this.data.mountainName);
    if (!result) return;
    this.mountainPanel = '';
    this.mountainMember = '';
    if (this.state.run.sect && this.data.mountainName) this.setData({ mountainName: '' });
    this.finishChoice(result, { nextMountain: data.page === 'return' ? 'cave' : data.page, nextMember: data.member || '' });
  },

  onSeaOption(e) {
    const data = e.currentTarget.dataset;
    const result = game.chooseSea(this.state, data.id, Number(data.tide));
    if (result) this.finishSea(result);
  },

  onSeaRetreat() {
    const result = game.retreatSea(this.state);
    if (result) this.finishSea(result);
  },

  finishSea(result) {
    this.seaOpen = false;
    const yuan = game.yuanTrialView(this.state);
    this.finishChoice(result, { voyage: true, nextTrib: yuan && yuan.ready ? '渡元婴劫' : '' });
  },

  powerChange() {
    const before = this.data.hud.powerValue;
    const after = game.combatPowerDetails(this.state).total;
    if (before === undefined || before === after) return '';
    return '战力 ' + game.formatNumber(before) + ' → ' + game.formatNumber(after);
  },

  finishChoice(result, context) {
    if (!result) {
      this.showBanner('灵气不足，选不了这一项');
      this.play('shrug');
      this.refresh();
      return;
    }
    this.result = Object.assign({ title: result.title, label: result.label, text: result.text || '', lines: result.lines,
      impact: result.dead ? '' : this.powerChange(), dead: result.dead }, context);
    this.eventOpen = false;
    this.replaceHidden = false;
    if (result.dead) wx.vibrateShort({ type: 'heavy' });
    else if (result.tags.includes('bond') || result.tags.includes('insight')) wx.vibrateShort({ type: 'light' });
    this.play(result.dead ? this.deathAct() : actionForTags(result.tags));
    this.afterAction();
  },

  onOption(e) {
    this.finishChoice(game.choose(this.state, Number(e.currentTarget.dataset.index), Math.random), { fromEvent: true });
  },

  // 卡面只写最要紧的几笔，其余收在「详情」里，由玩家自己展开。
  onOptionMore(e) {
    const index = Number(e.currentTarget.dataset.index);
    const options = (this.data.sheet.options || []).map((item, i) => (i === index ? Object.assign({}, item, { open: !item.open }) : item));
    this.setData({ sheet: Object.assign({}, this.data.sheet, { options: options }) });
  },

  onFallback() {
    this.finishChoice(game.choose(this.state, -1, Math.random), { fromEvent: true });
  },

  onReroll() {
    if (!game.rerollEvent(this.state, Math.random)) return;
    this.play('divine');
    this.afterAction();
  },

  onSheetClose() {
    audio.play('tap');
    this.lampOpen = false;
    this.eventOpen = false;
    this.seaOpen = false;
    this.mountainPanel = '';
    this.tribOpen = false;
    this.pathOpen = false;
    this.mergeOpen = false;
    this.bracing = false;
    if (this.state.run.pending) this.replaceHidden = true;
    this.refresh();
  },

  onResultOk() {
    audio.play('tap');
    const dead = this.result && this.result.dead;
    this.result = null;
    if (dead) this.deadOpen = true;
    this.refresh();
  },

  onResultNext() {
    const result = this.result;
    this.result = null;
    if (result && result.nextMountain && game.mountainReady(this.state)) {
      this.mountainPanel = result.nextMountain;
      this.mountainMember = result.nextMember;
      audio.play('tap');
      this.refresh();
    } else if (result && result.nextTrib) this.onTrib();
    else if (result && result.gate) this.onGate();
    else if (result && result.fromEvent && game.lampReady(this.state) === 'insight') this.onLamp();
    else this.onMain();
  },

  onReplace(e) {
    if (!game.resolveReplace(this.state, Number(e.currentTarget.dataset.index))) return;
    if (this.state.run.phase === 'dead') {
      this.deadOpen = true;
      this.play(this.deathAct());
    } else {
      this.play('toss');
    }
    this.afterAction();
  },

  onTrib() {
    const info = game.yuanTrialView(this.state) || game.tribulationInfo(this.state);
    if (!info || !info.ready || this.act === 'thunder') return;
    audio.play('tap');
    this.tribOpen = true;
    this.bracing = true;
    this.eventOpen = false;
    this.refresh();
  },

  onTribMethod(e) {
    const method = e.currentTarget.dataset.method;
    if (this.boltFalling) return;
    const info = game.tribulationInfo(this.state);
    // 逐道雷：接雷之前先停一拍再揭晓。
    if (info && info.ready && info.bolts && (method === 'endure' || (method === 'borrow' && info.borrowReady))) {
      this.boltFalling = true;
      this.boltLast = '';
      audio.play('tap');
      this.refresh();
      this.boltTimer = setTimeout(() => {
        this.boltFalling = false;
        if (this.tribOpen) this.resolveTrib(method);
        else this.refresh();
      }, BOLT_FALL_MS);
      return;
    }
    this.resolveTrib(method);
  },

  resolveTrib(method) {
    const before = this.state.run.realm;
    const result = game.attemptTribulation(this.state, Math.random, method);
    if (!result) {
      this.showBanner(method === 'borrow' ? '机缘不足，借不了这一股势' : '现在还不能渡劫');
      return;
    }
    if (!result.done) {
      this.boltLast = result.lines.join('。');
      wx.vibrateShort({ type: 'heavy' });
      audio.play('up');
      this.afterAction();
      return;
    }
    this.boltLast = '';
    let label = result.broke ? '雷散了，你还站着' : (method === 'scatter' ? '修为散了，命还在' : '你被劈了下来');
    if (result.broke && result.extra && !result.success) label = '余雷没接住，但境界已经破了';
    this.playTribulation({
      title: result.name,
      label: label,
      lines: result.lines,
      dead: result.dead
    }, before, result.broke && (!result.extra || result.success) ? 'ascend' : (result.dead ? this.deathAct() : 'hurt'));
  },

  onYuanMethod(e) {
    const data = e.currentTarget.dataset;
    const before = this.state.run.realm;
    const result = game.attemptYuanTrial(this.state, Math.random, data.id, Number(data.step));
    if (!result) return;
    this.playTribulation({
      title: result.title, label: result.label, lines: result.lines, dead: result.dead, yuan: true,
      nextTrib: result.success && !result.advanced ? '前往问名关' : ''
    }, before, result.advanced ? 'ascend' : (result.success ? 'focus' : (result.dead ? this.deathAct() : 'hurt')));
  },

  playTribulation(result, before, nextAct) {
    this.tribOpen = false;
    this.bracing = false;
    this.result = result;
    this.stormTimer = setTimeout(() => wx.vibrateShort({ type: 'heavy' }), STORM_HIT_MS);
    this.play('thunder', nextAct);
    this.holdRealm = before;
    this.afterAction();
  },

  onCarry(e) {
    if (!game.setCarry(this.state, e.currentTarget.dataset.id)) return;
    audio.play('tap');
    this.afterAction();
  },

  onDeadLamp() {
    audio.play('tap');
    this.deadOpen = false;
    this.setData({ tab: 'lamp' });
    this.refresh();
  },

  onReborn() {
    if (!game.reincarnate(this.state, Date.now(), Math.random)) return;
    audio.play('tap');
    this.stopAct();
    this.clearScenes();
    this.deadOpen = false;
    this.seaOpen = false;
    this.mountainPanel = '';
    this.chronicleOpen = false;
    this.chronicleBusy = false;
    this.shareImage = '';
    this.chronicleToken++;
    this.setData({ tab: 'skill', mountainName: '', chronicleCanvas: { show: false, width: 750, height: 1000 } });
    this.afterAction();
  },

  onTab(e) {
    if (this.act === 'thunder') return;
    audio.play('tap');
    this.setData({ tab: e.currentTarget.dataset.tab });
    this.refresh();
  },

  onBuyLamp(e) {
    const id = e.currentTarget.dataset.id;
    if (!game.lampOpen(this.state, id) || game.lampMaxed(this.state, id)) return;
    if (game.buyLamp(this.state, id)) {
      this.play('bow');
      this.afterAction();
    } else {
      audio.play('bad');
      this.showBanner('灯芯不足');
    }
  },

  onDrawTome(e) {
    const id = e.currentTarget.dataset.id;
    if (!game.tomeTierOpen(this.state, id)) return;
    const got = game.drawTome(this.state, id, Math.random);
    if (!got) {
      audio.play('bad');
      this.showBanner('灯芯不足');
      return;
    }
    const tome = game.skillInfo(got.id);
    this.play('bow');
    this.afterAction();
    this.showBanner(got.before
      ? '《' + tome.name + '》由' + game.gradeName(got.before) + '品升为' + game.gradeName(got.level) + '品'
      : '请出' + game.skillTitle(tome, got.level) + '，往后的传承里会遇到它');
  },

  onRetire() {
    if (this.state.run.phase !== 'alive' || this.act === 'thunder') return;
    this.openModal({
      title: '坐化',
      content: '主动结束这一世，按当前境界结算灯芯。' + (this.state.run.sect ? '下一世可回山探望弟子，取回托付的卷册。' : '这一世的功法、灵气和因果都会留在身后。'),
      highlight: '灯芯 +' + game.wickGain(this.state, 'retire'),
      confirmText: '坐化',
      cancelText: '再活一阵',
      danger: true
    }, function () {
      if (!game.retire(this.state)) return;
      this.play(this.deathAct());
      this.result = null;
      this.eventOpen = false;
      this.seaOpen = false;
      this.mountainPanel = '';
      this.deadOpen = true;
      this.afterAction();
    });
  },

  onReset() {
    if (this.act === 'thunder') return;
    this.openModal({
      title: '重置存档',
      content: '将清空全部进度，包括灯芯、灯纹和墓志铭，且无法恢复。',
      confirmText: '重置',
      cancelText: '取消',
      danger: true
    }, function () {
      this.state = game.createState(Date.now());
      this.lampOpen = false;
      this.stopAct();
      this.clearScenes();
      this.tipDone = false;
      this.tipStep = 0;
      try {
        wx.removeStorageSync(TIP_KEY);
      } catch (e) {
        console.error('清除指引进度失败', e);
      }
      this.result = null;
      this.eventOpen = false;
      this.seaOpen = false;
      this.mountainPanel = '';
      this.tribOpen = false;
      this.mergeOpen = false;
      this.chronicleOpen = false;
      this.chronicleBusy = false;
      this.shareImage = '';
      this.chronicleToken++;
      this.deadOpen = false;
      this.setData({ tab: 'skill', mountainName: '', chronicleCanvas: { show: false, width: 750, height: 1000 } });
      this.afterAction();
    });
  }
}));
