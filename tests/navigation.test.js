const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const game = require('../utils/game');

const file = require.resolve('../pages/index/index');
const requirePage = createRequire(file);
const controller = new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });

function openPage(save) {
  const storage = new Map([['jindeng_save_v1', save]]);
  const math = Object.create(Math);
  math.random = () => 0;
  let page;
  controller.runInNewContext({
    Page(definition) { page = definition; },
    require(id) { return id === '../../utils/cloud-sync' ? { isAvailable: () => false } : requirePage(id); },
    wx: {
      getStorageSync: (key) => storage.get(key),
      setStorageSync: (key, value) => storage.set(key, value),
      createInnerAudioContext: () => ({ play() {}, stop() {} }),
      vibrateShort() {}
    },
    console, Math: math, setTimeout() {}, clearTimeout() {}
  });
  page.setData = (patch, ready) => { Object.assign(page.data, patch); if (ready) ready(); };
  page.onLoad();
  return page;
}

function livingSave() {
  const state = game.createState(Date.now(), () => 0);
  game.chooseRoot(state, state.run.rootChoices[0], Date.now(), () => 0);
  const book = game.lampView(state);
  game.chooseLamp(state, book.stamp, book.options[0].id, () => 0);
  return state;
}

test('未投胎时可浏览底栏，回历练仍须从同一批根骨选择', () => {
  const p = openPage();
  const roots = p.state.run.rootChoices.slice();
  assert.equal(p.data.tab, 'train');
  assert.equal(p.data.sheet.kind, 'root');
  p.switchTab('star');
  assert.equal(p.starOpen, false);
  assert.equal(p.data.sheet.kind, '');
  p.switchTab('me');
  p.switchTab('lamp');
  assert.ok(p.data.lamps.length);
  p.switchTab('me');
  p.switchTab('train');
  assert.equal(p.data.sheet.kind, 'root');
  assert.deepEqual(p.state.run.rootChoices, roots);
});

test('切走保留未选机缘，确认结果前不能用仙星遮住结算', () => {
  const p = openPage(livingSave());
  p.onMain();
  assert.equal(p.data.sheet.kind, 'event');
  const event = p.state.run.event;
  const chance = p.state.run.chance;
  p.switchTab('gear');
  assert.equal(p.data.sheet.kind, '');
  p.switchTab('train');
  p.onMain();
  assert.equal(p.data.sheet.kind, 'event');
  assert.equal(p.state.run.event, event);
  assert.equal(p.state.run.chance, chance);
  p.onOption({ currentTarget: { dataset: { index: 0 } } });
  assert.equal(p.data.sheet.kind, 'result');
  p.switchTab('star');
  assert.equal(p.data.sheet.kind, 'result');
  assert.equal(p.starOpen, false);
  p.onResultOk();
  p.switchTab('star');
  assert.equal(p.data.sheet.kind, 'star');
});

test('仙星中途切页停住揭牌并退出战况，回来能继续同一批牌', () => {
  const save = livingSave();
  save.run.incense = 100;
  const p = openPage(save);
  p.onTrain();
  p.switchTab('star');
  assert.equal(p.trainOpen, false);
  p.onStarDraw({ currentTarget: { dataset: { count: 10 } } });
  const cards = p.state.run.starCards;
  p.onStarFlipAll();
  assert.ok(p.starTurn);
  p.switchTab('gear');
  assert.equal(p.starTurn, null);
  assert.equal(p.starAuto, false);
  assert.equal(p.data.sheet.kind, '');
  p.switchTab('star');
  assert.equal(p.state.run.starCards, cards);
  assert.equal(p.data.star.cards.length, 10);
  assert.equal(p.state.run.incense, 10);
});

test('身死后可从轮回点灯纹，回历练继续结算，再投胎回到历练', () => {
  const save = livingSave();
  game.retire(save);
  const p = openPage(save);
  assert.equal(p.data.sheet.kind, 'dead');
  p.onDeadLamp();
  assert.equal(p.data.tab, 'me');
  assert.equal(p.data.sheet.kind, '');
  p.switchTab('lamp');
  assert.equal(p.state.run.phase, 'dead');
  p.switchTab('me');
  p.switchTab('train');
  assert.equal(p.data.sheet.kind, 'dead');
  p.onReborn();
  assert.equal(p.data.tab, 'train');
  assert.equal(p.data.sheet.kind, 'root');
});
