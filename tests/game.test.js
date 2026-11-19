const assert = require('node:assert');
const test = require('node:test');
const game = require('../utils/game');
const { powerProfile } = require('../utils/combat-power');

const near = (a, b) => assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), a + ' 应约等于 ' + b);

// 依次返回给定的随机数，用完后一直返回 0。
function seq(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

function mulberry(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 随机数恒为 0 时，灵根候选是剑骨、药体、文心。
function born(root) {
  const s = game.createState(0, () => 0);
  // 旧规则用例隔离命格，命格本身由独立用例覆盖。
  s.run.fate = '';
  assert.ok(game.chooseRoot(s, root || 'talisman', 0, () => 0));
  return s;
}

function give(s, ids, level) {
  ids.forEach((id) => s.run.skills.push({ id: id, level: level || 1 }));
}

function withAuto(state) {
  state.lamps[game.AUTO_LAMP.id] = 1;
  return state;
}

function setEvent(s, id) {
  s.run.event = { kind: 'event', id: id, rerolls: 0 };
}

test('新存档先投胎：三选一灵根，选定后开局机缘是满的', () => {
  const s = game.createState(1000, () => 0);
  assert.strictEqual(s.run.phase, 'root');
  assert.deepStrictEqual(s.run.rootChoices, ['sword', 'pill', 'talisman']);
  assert.strictEqual(s.run.fate, 'bright');
  s.run.fate = '';
  assert.strictEqual(game.qiRate(s), 0);
  assert.strictEqual(game.chooseRoot(s, 'luck', 1000, () => 0), false);
  assert.strictEqual(game.chooseRoot(s, 'sword', 1000, () => 0), true);
  assert.strictEqual(s.run.phase, 'alive');
  assert.deepStrictEqual(game.attrs(s), { edge: 2, body: 0, mind: 0 });
  assert.strictEqual(s.run.chance, 60);
  assert.strictEqual(game.maxLife(s), 60);
  assert.strictEqual(game.realmText(s.run), '凡胎前期');
  assert.strictEqual(game.chooseRoot(s, 'pill', 1000, () => 0), false);
});

test('灵根特性：药体加产出，石身加寿元，歪运加机缘上限', () => {
  near(game.qiRate(born('pill')), 1.15);
  const s = game.createState(0, seq([0, 0.99, 0, 0.99]));
  assert.ok(s.run.rootChoices.indexOf('body') >= 0 && s.run.rootChoices.indexOf('luck') >= 0);
  const luck = JSON.parse(JSON.stringify(s));
  s.run.fate = '';
  luck.run.fate = '';
  game.chooseRoot(s, 'body', 0, () => 0);
  assert.strictEqual(game.maxLife(s), 70);
  assert.strictEqual(game.attrs(s).body, 2);
  game.chooseRoot(luck, 'luck', 0, () => 0);
  assert.strictEqual(game.maxChance(luck), 72);
  assert.strictEqual(luck.run.chance, 72);
});

test('根骨组合：2 到 5 种根骨的加成相加，稀有度依次升高，id 不规范的不认', () => {
  const two = game.rootInfo('sword+pill');
  assert.deepStrictEqual(two, { id: 'sword+pill', rarity: 1, schools: ['sword', 'pill'], name: '剑丹双骨', text: two.text, edge: 2, qi: 0.15 });
  assert.strictEqual(game.rootInfo('pill+body+luck').name, '丹体运三骨');
  assert.strictEqual(game.rootInfo('sword+pill+talisman+body').rarity, 3);
  const five = game.rootInfo('sword+pill+talisman+body+luck');
  assert.strictEqual(five.name, '五骨俱全');
  assert.strictEqual(five.rarity, 4);
  assert.deepStrictEqual([five.edge, five.body, five.mind, five.qi, five.life, five.chance], [2, 2, 2, 0.15, 10, 12]);
  assert.strictEqual(game.rootInfo('sword').rarity, 0);
  ['pill+sword', 'sword+sword', 'sword+nope', '', 'nope', null, 'toString'].forEach((id) => {
    assert.strictEqual(game.rootInfo(id), null, String(id));
  });
  // 每一档的数量：单根骨 5，双 10，三 10 加 2 副稀有，四 5 加 2，五 1 加 2，神骨 2；名字不重复
  const ids = [];
  ['sword', 'pill', 'talisman', 'body', 'luck'].forEach((id, i, all) => {
    (function walk(at, picked) {
      ids.push(picked.join('+'));
      for (let j = at; j < all.length; j++) walk(j + 1, picked.concat(all[j]));
    })(i + 1, [id]);
  });
  game.RARE_ROOTS.forEach((r) => ids.push(r.id));
  assert.strictEqual(ids.length, 39);
  assert.strictEqual(new Set(ids.map((id) => game.rootInfo(id).name)).size, 39);
  const counts = [0, 0, 0, 0, 0, 0];
  ids.forEach((id) => { counts[game.rootInfo(id).rarity]++; });
  assert.deepStrictEqual(counts, [5, 10, 12, 7, 3, 2]);
  assert.strictEqual(game.ROOT_RARITIES.length, 6);
});

test('根骨：投胎时候选可以重新随机 10 次，最稀有的神骨抽得到，次数读档保留', () => {
  const s = game.createState(0, () => 0);
  assert.strictEqual(game.ROOT_REROLLS, 10);
  assert.strictEqual(s.run.rootRolls, 10);
  // 掷到最高的那一小段是神骨
  assert.strictEqual(game.rerollRoots(s, seq([0.999, 0, 0.6, 0, 0, 0])), true);
  assert.deepStrictEqual(s.run.rootChoices, ['r_relic', 'sword+pill', 'sword']);
  assert.strictEqual(game.rootInfo('r_relic').rarity, 5);
  assert.strictEqual(game.ROOT_RARITIES[5].name, '神');
  assert.strictEqual(s.run.rootRolls, 9);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.deepStrictEqual(loaded.run.rootChoices, ['r_relic', 'sword+pill', 'sword']);
  assert.strictEqual(loaded.run.rootRolls, 9);
  // 旧存档没有这个字段时给满；越界的截回来
  const old = JSON.parse(JSON.stringify(s));
  delete old.run.rootRolls;
  assert.strictEqual(game.normalizeState(old, 0, () => 0).run.rootRolls, 10);
  old.run.rootRolls = 999;
  assert.strictEqual(game.normalizeState(old, 0, () => 0).run.rootRolls, 10);

  // 灯纹“择根”后每次都换四个；10 次用完就不能再换
  s.lamps.r2 = 1;
  const rng = mulberry(5);
  const seen = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 9; i++) {
    assert.strictEqual(game.rerollRoots(s, rng), true);
    assert.strictEqual(new Set(s.run.rootChoices).size, 4);
  }
  assert.strictEqual(s.run.rootRolls, 0);
  const last = s.run.rootChoices.slice();
  assert.strictEqual(game.rerollRoots(s, rng), false);
  assert.deepStrictEqual(s.run.rootChoices, last);
  for (let i = 0; i < 20000; i++) {
    game.rollRoots(3, rng).forEach((id) => { seen[game.rootInfo(id).rarity]++; });
  }
  for (let i = 1; i < 6; i++) assert.ok(seen[i] > 0 && seen[i] < seen[i - 1], seen.join(','));

  // 选定神骨后加成生效；活着的时候不能换，下一世次数回满
  loaded.run.fate = '';
  assert.ok(game.chooseRoot(loaded, 'r_relic', 0, () => 0));
  assert.deepStrictEqual(game.attrs(loaded), { edge: 5, body: 5, mind: 5 });
  assert.strictEqual(game.maxLife(loaded), 100);
  assert.strictEqual(game.rerollRoots(loaded, rng), false);
  game.retire(loaded);
  game.reincarnate(loaded, 0, rng);
  assert.strictEqual(loaded.run.rootRolls, 10);
});
test('根骨组合：投胎候选按稀有度抽取且不重复，选定后各项加成生效并能读档', () => {
  // 每个候选位用两个随机数：先定稀有度，再在这一档里挑
  const s = game.createState(0, seq([0.99, 0, 0.99, 0.99, 0.6, 0]));
  assert.deepStrictEqual(s.run.rootChoices, ['sword+pill+talisman+body+luck', 'r_lamp', 'sword+pill']);
  const seen = [0, 0, 0, 0, 0, 0];
  const rng = mulberry(11);
  for (let i = 0; i < 4000; i++) {
    const t = game.createState(0, rng);
    t.lamps.r2 = 1;
    t.run.phase = 'dead';
    game.reincarnate(t, 0, rng);
    assert.strictEqual(new Set(t.run.rootChoices).size, 4);
    t.run.rootChoices.forEach((id) => { seen[game.rootInfo(id).rarity]++; });
  }
  // 稀有度越高越少见，但每一档都抽得到
  for (let i = 1; i < 5; i++) assert.ok(seen[i] > 0 && seen[i] < seen[i - 1], seen.join(','));

  s.run.fate = '';
  assert.ok(game.chooseRoot(s, 'r_lamp', 0, () => 0));
  assert.deepStrictEqual(game.attrs(s), { edge: 3, body: 3, mind: 3 });
  near(game.qiRate(s), 1.3);
  assert.strictEqual(game.maxLife(s), 80);
  assert.strictEqual(game.maxChance(s), 72);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(loaded.run.root, 'r_lamp');
  assert.strictEqual(game.maxChance(loaded), 72);

  // 双根骨：两系功法都更容易出现，“宿慧”送的功法出自其中一系
  const d = game.createState(0, seq([0.6, 0]));
  d.lamps.r3 = 1;
  d.run.fate = '';
  assert.strictEqual(d.run.rootChoices[0], 'sword+pill');
  game.chooseRoot(d, 'sword+pill', 0, () => 0.99);
  assert.deepStrictEqual(d.run.skills, [{ id: 'pi8', level: 1 }]);
  near(game.qiRate(d), 1.15);
  assert.strictEqual(game.attrs(d).edge, 2);
  const pending = game.normalizeState({ run: { phase: 'root', rootChoices: ['sword+pill', 'r_sage', 'pill+sword', 'body'] } }, 0, () => 0);
  assert.deepStrictEqual(pending.run.rootChoices, ['sword+pill', 'r_sage', 'body']);
});

test('灵气自动增长，小境界满了自动突破，后期停在上限等渡劫', () => {
  const s = born();
  assert.strictEqual(game.qiCap(s), 100);
  game.advance(s, 40000);
  near(s.run.qi, 40);
  const r = game.advance(s, 110000);
  assert.strictEqual(r.ups, 1);
  assert.strictEqual(game.realmText(s.run), '凡胎中期');
  near(s.run.qi, 10);
  assert.strictEqual(game.qiCap(s), 160);
  assert.strictEqual(game.isFull(s), false);
  const off = game.advance(s, 110000 + 30 * 86400 * 1000);
  assert.strictEqual(game.realmText(s.run), '凡胎后期');
  assert.strictEqual(s.run.qi, 250);
  assert.strictEqual(game.isFull(s), true);
  near(off.qi, 150 + 250);
});

test('离线：寿元不流逝，机缘攒到上限为止，时钟回拨不出错', () => {
  const s = born();
  s.run.chance = 0;
  game.advance(s, 60000);
  near(s.run.chance, 1);
  game.advance(s, 90000);
  near(s.run.chance, 1.5);
  const r = game.advance(s, 90000 + 12 * 3600 * 1000);
  assert.strictEqual(s.run.chance, 60);
  assert.strictEqual(r.chance, 59);
  assert.strictEqual(s.run.age, 0);
  assert.strictEqual(game.yearsLeft(s), 60);
  assert.strictEqual(s.run.phase, 'alive');
  const before = s.run.qi;
  assert.strictEqual(game.advance(s, 1000).elapsed, 0);
  assert.strictEqual(s.run.qi, before);
  assert.strictEqual(s.lastTime, 1000);
});

test('翻开机缘消耗一次机缘，没有机缘或已有未决事件时不能再翻', () => {
  const s = born();
  assert.strictEqual(game.drawEvent(s, mulberry(1)), true);
  assert.strictEqual(s.run.chance, 59);
  assert.ok(game.eventView(s));
  assert.strictEqual(game.drawEvent(s, mulberry(1)), false);
  assert.strictEqual(s.run.chance, 59);
  s.run.event = null;
  s.run.chance = 0.9;
  assert.strictEqual(game.canDraw(s), false);
  assert.strictEqual(game.drawEvent(s, mulberry(1)), false);
});

test('选项：说明与结算一致，每次选择才消耗寿元', () => {
  const s = born();
  setEvent(s, 'i_dog');
  const v = game.eventView(s);
  assert.strictEqual(v.typeName, '闲事');
  assert.deepStrictEqual(v.options.map((o) => o.desc), ['心魔 -5，记下【摸过村口的狗】', '神 +1', '灵气 +10']);
  assert.deepStrictEqual(v.options.map((o) => o.years), [1, 1, 1]);
  const r = game.choose(s, 1, () => 0);
  assert.deepStrictEqual(r.lines, ['神 +1']);
  assert.strictEqual(r.dead, false);
  assert.strictEqual(game.attrs(s).mind, 3);
  assert.strictEqual(s.run.age, 1);
  assert.strictEqual(s.run.choices, 1);
  assert.strictEqual(s.run.event, null);
  assert.deepStrictEqual(s.run.log, [{ age: 1, title: '村口的狗', text: '问它叹什么：神 +1', detail: '神 2 → 3，寿元余 60 → 59 年' }]);
  assert.strictEqual(game.choose(s, 0, () => 0), null);
  // 心魔不会减到负数
  setEvent(s, 'i_dog');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.demon, 0);
  setEvent(s, 'i_dog');
  assert.strictEqual(game.choose(s, 3, () => 0), null);
  assert.strictEqual(s.run.age, 2);
});

test('保底选项“闭关不理”：耗 1 年，得一成丹田容量的灵气', () => {
  const s = born();
  setEvent(s, 'a_voice');
  assert.deepStrictEqual(game.eventView(s).fallback, { label: '闭关不理', desc: '灵气 +10', years: 1, fatal: false });
  const r = game.choose(s, -1, () => 0);
  assert.strictEqual(r.label, '闭关不理');
  assert.strictEqual(s.run.qi, 10);
  assert.strictEqual(s.run.age, 1);
  assert.strictEqual(s.run.demon, 0);
});

test('需要灵气的选项：不够时不可选且不产生任何变化，够时扣除', () => {
  const s = born();
  setEvent(s, 'a_auction');
  let v = game.eventView(s);
  assert.deepStrictEqual(v.options.map((o) => o.disabled), [true, true, false]);
  assert.strictEqual(v.options[1].desc, '耗灵气 30，寿元上限 +12 年');
  const snapshot = JSON.stringify(s);
  assert.strictEqual(game.choose(s, 1, () => 0), null);
  assert.strictEqual(JSON.stringify(s), snapshot);
  s.run.qi = 30;
  v = game.eventView(s);
  assert.strictEqual(v.options[1].disabled, false);
  const r = game.choose(s, 1, () => 0);
  assert.deepStrictEqual(r.lines, ['灵气 -30', '寿元上限 +12 年']);
  assert.strictEqual(s.run.qi, 0);
  assert.strictEqual(game.maxLife(s), 72);
});

test('概率型选项：按标明的成功率结算，运系 2 门时成功率 +10%', () => {
  let s = born();
  setEvent(s, 'a_storm');
  assert.strictEqual(game.eventView(s).options[0].desc, '50% 锋 +3，躯 +2；50% 折寿 8 年');
  let r = game.choose(s, 0, () => 0.49);
  assert.deepStrictEqual(r.lines, ['成了：锋 +3，躯 +2']);
  assert.deepStrictEqual(game.attrs(s), { edge: 3, body: 2, mind: 2 });

  s = born();
  setEvent(s, 'a_storm');
  r = game.choose(s, 0, () => 0.5);
  assert.deepStrictEqual(r.lines, ['没成：折寿 8 年']);
  assert.strictEqual(game.maxLife(s), 52);

  s = born();
  give(s, ['lu1', 'lu2']);
  setEvent(s, 'a_storm');
  assert.ok(game.eventView(s).options[0].desc.indexOf('60% ') === 0);
  r = game.choose(s, 0, () => 0.59);
  assert.strictEqual(r.lines[0].indexOf('成了'), 0);

  s = born();
  setEvent(s, 'a_well');
  r = game.choose(s, 2, () => 0.9);
  assert.deepStrictEqual(r.lines, ['没成：无事发生']);
});

test('传承：学到功法、同名功法升品，属性与产出按品级增加', () => {
  const s = born();
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'sw1', level: 1 }, { id: 'pi1', level: 1 }], rerolls: 0 };
  let v = game.eventView(s);
  assert.strictEqual(v.typeName, '传承');
  assert.strictEqual(v.options[0].label, '修习《截云剑》');
  assert.strictEqual(v.options[0].desc, '剑·凡品：锋 +3，灵气产出 +10%');
  assert.strictEqual(v.options[0].years, 3);
  game.choose(s, 0, () => 0);
  assert.deepStrictEqual(s.run.skills, [{ id: 'sw1', level: 1 }]);
  assert.strictEqual(game.attrs(s).edge, 3);
  near(game.qiRate(s), 1.1);
  assert.strictEqual(s.run.age, 3);

  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'sw1', level: 2 }], rerolls: 0 };
  v = game.eventView(s);
  assert.strictEqual(v.options[0].label, '精进《截云剑》至灵品');
  assert.strictEqual(v.options[0].desc, '剑·凡品 → 灵品：锋 +3 → +6，灵气产出 +10% → +20%');
  const r = game.choose(s, 0, () => 0);
  assert.deepStrictEqual(r.lines, ['《截云剑》精进至灵品：锋 +3 → +6，灵气产出 +10% → +20%']);
  assert.deepStrictEqual(s.run.skills, [{ id: 'sw1', level: 2 }]);
  assert.strictEqual(game.attrs(s).edge, 6);
  near(game.qiRate(s), 1.2);
});

test('功法最多 8 门：满了以后必须取舍，取舍前不能做别的', () => {
  const s = born();
  give(s, ['sw1', 'sw2', 'sw3', 'sw4', 'pi1', 'pi2', 'ta1', 'ta2']);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'bo2', level: 1 }], rerolls: 0 };
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.skills.length, 8);
  assert.deepStrictEqual(s.run.pending, { id: 'bo2', level: 1 });
  assert.strictEqual(game.canDraw(s), false);
  assert.strictEqual(game.resolveReplace(s, 8), false);
  assert.strictEqual(game.resolveReplace(s, 4), true);
  assert.deepStrictEqual(s.run.skills[4], { id: 'bo2', level: 1 });
  assert.strictEqual(s.run.pending, null);
  assert.strictEqual(game.resolveReplace(s, 0), false);

  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'bo3', level: 1 }], rerolls: 0 };
  game.choose(s, 0, () => 0);
  assert.strictEqual(game.resolveReplace(s, -1), true);
  assert.strictEqual(s.run.skills.length, 8);
  assert.strictEqual(s.run.skills.filter((k) => k.id === 'bo3').length, 0);
});

test('羁绊：丹 2 加产出，体 2 加寿元，运 4 加机缘上限和速度', () => {
  let s = born();
  give(s, ['pi3']);
  near(game.qiRate(s), 1);
  give(s, ['pi1']);
  near(game.qiRate(s), 1 * (1 + 0.25 + 0.3));
  assert.strictEqual(game.hasSet(s.run, 'pill', 2), true);
  assert.strictEqual(game.hasSet(s.run, 'pill', 4), false);

  s = born();
  give(s, ['bo2', 'bo3']);
  assert.strictEqual(game.maxLife(s), 72);

  s = born();
  give(s, ['lu1', 'lu3', 'lu4']);
  assert.strictEqual(game.maxChance(s), 60);
  near(game.chanceInterval(s), 60);
  give(s, ['lu5']);
  assert.strictEqual(game.maxChance(s), 96);
  near(game.chanceInterval(s), 48);
});

test('符系羁绊：2 门可重抽一次，4 门传承多一个选项', () => {
  const s = born();
  give(s, ['ta1', 'ta2']);
  const rng = mulberry(7);
  game.drawEvent(s, rng);
  assert.strictEqual(game.eventView(s).rerolls, 1);
  const first = JSON.stringify(s.run.event);
  assert.strictEqual(game.rerollEvent(s, rng), true);
  assert.notStrictEqual(JSON.stringify(s.run.event), first);
  assert.strictEqual(game.eventView(s).rerolls, 0);
  assert.strictEqual(game.rerollEvent(s, rng), false);
  assert.strictEqual(s.run.chance, 59);

  s.run.event = null;
  s.run.forceLegacy = true;
  game.drawEvent(s, rng);
  assert.strictEqual(game.eventView(s).options.length, 3);
  s.run.event = null;
  give(s, ['ta3', 'ta4']);
  s.run.forceLegacy = true;
  game.drawEvent(s, rng);
  const v = game.eventView(s);
  assert.strictEqual(v.type, 'legacy');
  assert.strictEqual(v.options.length, 4);
  assert.strictEqual(s.run.forceLegacy, false);
});

test('因果：种下后过几次选择必然结果，结果事件不能重抽', () => {
  const s = born();
  give(s, ['ta1', 'ta2']);
  setEvent(s, 'k_kid');
  const r = game.choose(s, 0, () => 0);
  assert.deepStrictEqual(r.lines, ['种下因果【一饭之恩】']);
  assert.strictEqual(s.run.age, 5);
  assert.deepStrictEqual(s.run.karma, [{ id: 'kid', due: 4 }]);
  const rng = mulberry(3);
  for (let i = 0; i < 3; i++) {
    game.drawEvent(s, rng);
    assert.notStrictEqual(s.run.event.id, 'f_kid');
    assert.notStrictEqual(s.run.event.id, 'k_kid');
    game.choose(s, -1, rng);
  }
  game.drawEvent(s, rng);
  assert.strictEqual(s.run.event.id, 'f_kid');
  assert.deepStrictEqual(s.run.karma, []);
  assert.strictEqual(game.eventView(s).rerolls, 0);
  assert.strictEqual(game.rerollEvent(s, rng), false);
  game.choose(s, 1, rng);
  assert.strictEqual(game.attrs(s).edge, 3);
});

test('渡劫：灵气圆满才能渡，成功率由考核属性、心魔和羁绊决定', () => {
  const s = born();
  let info = game.tribulationInfo(s);
  assert.strictEqual(info.name, '引气劫');
  assert.deepStrictEqual(info.tests, ['body', 'mind']);
  assert.strictEqual(info.req, 16);
  assert.strictEqual(info.ready, false);
  assert.strictEqual(game.attemptTribulation(s, () => 0), null);
  // 躯 0、神 2：0.15 + 0.7 × (0 + 2/16) / 2
  near(info.chance, 0.15 + 0.7 * 0.0625);
  s.run.stats.body = 16;
  s.run.stats.mind = 16;
  near(game.tribulationInfo(s).chance, 0.85);
  s.run.demon = 29;
  near(game.tribulationInfo(s).chance, 0.79);
  give(s, ['sw3', 'sw6']);
  near(game.tribulationInfo(s).chance, 0.89);
  s.run.stats.body = 999;
  s.run.stats.mind = 999;
  s.run.demon = 0;
  near(game.tribulationInfo(s).chance, 0.98);
});

test('渡劫成功：进入下一境界，加寿元，灵气归零', () => {
  const s = born();
  s.run.stage = 2;
  s.run.qi = 250;
  const info = game.tribulationInfo(s);
  assert.strictEqual(info.ready, true);
  const r = game.attemptTribulation(s, () => info.chance - 0.001);
  assert.strictEqual(r.success, true);
  assert.deepStrictEqual(r.lines, ['突破至引气前期', '寿元上限 +30 年']);
  assert.strictEqual(s.run.realm, 1);
  assert.strictEqual(s.run.stage, 0);
  assert.strictEqual(s.run.qi, 0);
  assert.strictEqual(game.maxLife(s), 90);
  assert.strictEqual(game.qiCap(s), 500);
  near(game.qiRate(s), 2.5);
  assert.strictEqual(game.tribulationInfo(s).name, '筑基劫');
});

test('渡劫失败：折寿、涨心魔、灵气减半；寿元耗尽则死于天劫', () => {
  const s = born();
  s.run.stage = 2;
  s.run.qi = 250;
  let r = game.attemptTribulation(s, () => 0.999);
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.dead, false);
  assert.strictEqual(s.run.age, 15);
  assert.strictEqual(s.run.demon, 10);
  assert.strictEqual(s.run.qi, 125);
  assert.strictEqual(s.run.realm, 0);
  assert.strictEqual(game.tribulationInfo(s).ready, false);

  s.run.qi = 250;
  s.run.age = 50;
  r = game.attemptTribulation(s, () => 0.999);
  assert.strictEqual(r.dead, true);
  assert.strictEqual(s.run.phase, 'dead');
  assert.strictEqual(s.run.death.cause, 'trib');
  // 凡胎后期 4 分，死于天劫 ×1.2
  assert.strictEqual(s.run.death.wick, 5);
  assert.ok(s.run.death.text.indexOf('死于引气劫') > 0);
  assert.strictEqual(s.wick, 5);
});

test('体系 4 门：渡劫失败不会身死，折寿减半', () => {
  const s = born();
  give(s, ['bo2', 'bo3', 'bo5', 'bo6']);
  s.run.stage = 2;
  s.run.qi = 250;
  s.run.age = game.maxLife(s) - 2;
  const info = game.tribulationInfo(s);
  assert.strictEqual(info.safe, true);
  assert.strictEqual(info.failYears, 8);
  const r = game.attemptTribulation(s, () => 0.999);
  assert.strictEqual(r.dead, false);
  assert.strictEqual(game.yearsLeft(s), 1);
});

test('丹系 4 门多加寿元，剑系 4 门破境后必得传承', () => {
  const s = born();
  give(s, ['pi1', 'pi2', 'pi5', 'pi4', 'sw1', 'sw2', 'sw3', 'sw4']);
  s.run.stage = 2;
  s.run.qi = 250;
  const before = game.maxLife(s);
  game.attemptTribulation(s, () => 0);
  assert.strictEqual(game.maxLife(s), before + 45);
  assert.strictEqual(s.run.forceLegacy, true);
  game.drawEvent(s, () => 0.99);
  assert.strictEqual(s.run.event.kind, 'legacy');
});

test('寿元耗尽身死：结算灯芯、记墓志铭，之后不能再行动', () => {
  const s = born();
  s.run.age = 59;
  setEvent(s, 'i_dog');
  assert.strictEqual(game.eventView(s).options[0].fatal, true);
  const r = game.choose(s, 1, () => 0);
  assert.strictEqual(r.dead, true);
  assert.strictEqual(s.run.phase, 'dead');
  assert.deepStrictEqual(s.run.death, { cause: 'age', wick: 2, text: '享年 60 岁，凡胎前期。寿终正寝。生前最后一件事是「村口的狗」。' });
  assert.strictEqual(s.wick, 2);
  assert.strictEqual(s.totalWick, 2);
  assert.strictEqual(s.lives, 1);
  assert.strictEqual(s.best, 0);
  assert.deepStrictEqual(s.epitaphs, [s.run.death.text + '（灯芯 +2）']);
  assert.strictEqual(game.drawEvent(s, () => 0), false);
  assert.strictEqual(game.retire(s), false);
  assert.strictEqual(game.qiRate(s), 0);
  game.advance(s, 1e9);
  assert.strictEqual(s.run.qi, 0);
});

test('延寿的选项能在寿元将尽时救命', () => {
  const s = born();
  s.run.age = 59;
  setEvent(s, 'f_pupil');
  const r = game.choose(s, 2, () => 0);
  assert.strictEqual(r.dead, false);
  assert.strictEqual(game.yearsLeft(s), 15);
});

test('心魔满 100 转魔修：十年燃寿、服散续命，最后身死灯芯 ×1.5', () => {
  const s = born();
  near(game.qiRate(s), 1);
  s.run.demon = 80;
  setEvent(s, 'a_voice');
  const r = game.choose(s, 0, () => 0);
  assert.strictEqual(r.dead, false);
  assert.strictEqual(s.run.phase, 'alive');
  assert.strictEqual(s.run.mode, 'demon');
  assert.strictEqual(s.run.demon, 100);
  assert.strictEqual(game.yearsLeft(s), 10);
  near(game.qiRate(s), 5);
  s.run.stage = 2;
  s.run.qi = game.qiCap(s);
  assert.strictEqual(game.tribulationInfo(s).ready, false);
  assert.strictEqual(game.attemptTribulation(s, () => 0), null);

  // 普通延寿对魔躯无效，服散才增加燃寿。
  setEvent(s, 'f_kid');
  assert.strictEqual(game.eventView(s).options[2].desc, '普通延寿对魔修无效，心魔 -15');
  game.choose(s, 2, () => 0);
  assert.strictEqual(game.maxLife(s), 11);
  assert.strictEqual(s.run.lifeFlat, 0);
  near(game.qiRate(s), 5);
  const before = game.yearsLeft(s);
  s.run.qi = game.qiCap(s);
  const powder = game.takePowder(s);
  assert.strictEqual(powder.dead, false);
  assert.strictEqual(game.yearsLeft(s), before + 3);
  assert.strictEqual(s.run.qi, game.qiCap(s) / 2);

  s.run.age = game.maxLife(s) - 1;
  setEvent(s, 'i_dog');
  const dead = game.choose(s, -1, () => 0);
  assert.strictEqual(dead.dead, true);
  assert.strictEqual(s.run.death.cause, 'demon');
  assert.strictEqual(s.run.death.wick, 6);
  assert.strictEqual(game.reincarnate(s, 0, () => 0), true);
  assert.strictEqual(s.run.mode, 'human');
  assert.strictEqual(s.run.demon, 0);
});

test('堕魔边界：安神汤不撤销堕魔，魔修自动机缘仍可挑普通选项', () => {
  const s = born();
  give(s, ['pi8']);
  s.run.demon = 80;
  setEvent(s, 'a_voice');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.demon, 99);
  assert.strictEqual(s.run.mode, 'demon');
  near(game.qiRate(s), 5);

  setEvent(s, 'i_dog');
  assert.ok(game.autoPick(s) >= 0);
});

test('灯芯：按境界计分，羁绊和死法加成', () => {
  const s = born();
  s.run.realm = 1;
  s.run.stage = 1;
  assert.strictEqual(game.wickGain(s, 'age'), 11);
  assert.strictEqual(game.wickGain(s, 'trib'), 14);
  assert.strictEqual(game.wickGain(s, 'demon'), 17);
  give(s, ['pi1', 'pi2']);
  assert.strictEqual(game.wickGain(s, 'age'), 13);
  give(s, ['pi3', 'pi4', 'sw1', 'sw2']);
  // 丹 4 门 +25%，剑 2 门 +10%
  assert.strictEqual(game.wickGain(s, 'age'), 15);
  s.run.realm = 3;
  s.run.stage = 2;
  s.run.skills = [];
  assert.strictEqual(game.wickGain(s, 'retire'), 90);
  s.run.qi = game.qiCap(s);
  assert.strictEqual(game.wickGain(s, 'retire'), 120);
  assert.strictEqual(game.tribulationInfo(s), null);
});

test('坐化与轮回：灯芯和灯纹保留，这一世的东西清空', () => {
  const s = born();
  give(s, ['sw1']);
  s.run.qi = 50;
  assert.strictEqual(game.reincarnate(s, 5000, () => 0), false);
  assert.strictEqual(game.retire(s), true);
  assert.strictEqual(s.run.death.cause, 'retire');
  assert.strictEqual(s.wick, 2);
  assert.strictEqual(game.buyLamp(s, 'r1'), false);
  s.wick = 3;
  assert.strictEqual(game.buyLamp(s, 'r1'), true);
  assert.strictEqual(game.reincarnate(s, 5000, () => 0), true);
  assert.strictEqual(s.run.phase, 'root');
  assert.deepStrictEqual(s.run.skills, []);
  assert.strictEqual(s.run.qi, 0);
  assert.strictEqual(s.lives, 1);
  assert.strictEqual(s.lamps.r1, 1);
  s.run.fate = '';
  game.chooseRoot(s, 'sword', 5000, () => 0);
  assert.strictEqual(game.maxLife(s), 70);
  assert.strictEqual(s.lastTime, 5000);
});

test('灯纹：价格逐级翻倍，有等级上限，灯芯不足买不了', () => {
  const s = born();
  s.wick = 3 + 6 + 12 + 100;
  assert.strictEqual(game.lampCost(s, 'r1'), 3);
  assert.ok(game.buyLamp(s, 'r1'));
  assert.strictEqual(game.lampCost(s, 'r1'), 6);
  assert.ok(game.buyLamp(s, 'r1'));
  assert.ok(game.buyLamp(s, 'r1'));
  assert.strictEqual(s.wick, 100);
  assert.strictEqual(game.lampMaxed(s, 'r1'), true);
  assert.strictEqual(game.buyLamp(s, 'r1'), false);
  assert.strictEqual(s.wick, 100);
  assert.strictEqual(game.maxLife(s), 90);
  assert.strictEqual(game.buyLamp(s, 'nope'), false);
  s.wick = 4;
  assert.strictEqual(game.buyLamp(s, 'y1'), false);
  assert.strictEqual(s.wick, 4);
});

test('灯纹效果：产出、机缘、渡劫、心魔、闭关和开局加成', () => {
  const s = born();
  s.lamps = { r4: 2, y1: 2, y4: 2, m2: 3, m4: 3, y3: 1 };
  near(game.qiRate(s), 1.4);
  assert.strictEqual(game.maxChance(s), 84);
  near(game.chanceInterval(s), 60 / 1.3);
  near(game.tribulationInfo(s).chance, 0.15 + 0.7 * 0.0625 + 0.09);
  setEvent(s, 'a_feast');
  assert.strictEqual(game.eventView(s).options[0].desc, '躯 +5，心魔 +11，记下【尝过仙肉】');
  assert.strictEqual(game.eventView(s).fallback.desc, '灵气 +20');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.demon, 11);
  assert.strictEqual(game.tribulationInfo(s).failDemon, 7);

  const t = game.createState(0, () => 0);
  t.lamps = { r2: 1, r3: 1, m3: 2, y2: 2 };
  t.run.fate = '';
  game.retire(t);
  assert.strictEqual(t.run.phase, 'root');
  t.run.phase = 'dead';
  t.run.death = { cause: 'age', wick: 1, text: '' };
  game.reincarnate(t, 0, () => 0);
  assert.strictEqual(t.run.rootChoices.length, 4);
  t.run.fate = '';
  game.chooseRoot(t, 'sword', 0, () => 0);
  assert.deepStrictEqual(game.attrs(t), { edge: 4 + 3, body: 2, mind: 2 });
  assert.deepStrictEqual(t.run.skills, [{ id: 'sw1', level: 1 }]);
  assert.strictEqual(t.run.freeRerolls, 2);
  game.drawEvent(t, mulberry(5));
  assert.strictEqual(game.eventView(t).rerolls, 2);
  game.rerollEvent(t, mulberry(6));
  assert.strictEqual(t.run.freeRerolls, 1);
});

test('前世功法：身死后挑一门，以凡品带入下一世', () => {
  const s = born();
  give(s, ['bo6', 'sw1'], 3);
  assert.strictEqual(game.setCarry(s, 'bo6'), false);
  game.retire(s);
  assert.strictEqual(game.canCarry(s), false);
  assert.strictEqual(game.setCarry(s, 'bo6'), false);
  s.lamps.m1 = 1;
  assert.strictEqual(game.setCarry(s, 'pi1'), false);
  assert.strictEqual(game.setCarry(s, 'bo6'), true);
  game.reincarnate(s, 0, () => 0);
  assert.strictEqual(s.carry, 'bo6');
  game.chooseRoot(s, 'sword', 0, () => 0);
  assert.deepStrictEqual(s.run.skills, [{ id: 'bo6', level: 1 }]);
  assert.strictEqual(s.carry, '');
});

test('存档校验：损坏或旧游戏的存档得到一个可玩的新档', () => {
  const inputs = [null, undefined, '', 'abc', 42, [], { gold: 1e9, owned: { miner: 5 }, stardust: 3 },
    { run: 'x' }, { run: { phase: 'alive' } }, { run: { phase: 'alive', root: 'nope' } }, { run: { phase: 'root', rootChoices: ['x'] } }];
  inputs.forEach((raw) => {
    const s = game.normalizeState(raw, 5000, () => 0);
    assert.strictEqual(s.run.phase, 'root');
    assert.strictEqual(s.run.rootChoices.length, 3);
    assert.strictEqual(s.wick, 0);
    assert.strictEqual(s.lastTime, 5000);
    assert.ok(game.chooseRoot(s, s.run.rootChoices[0], 5000, () => 0));
  });
});

test('存档校验：逐字段修正越界和非法的值', () => {
  const s = game.normalizeState({
    wick: -5, totalWick: 'x', lives: 2.9, best: 99, lastTime: 9e15,
    lamps: { r1: 99, r2: -1, zz: 3, m3: 2.5 },
    epitaphs: ['a', 5, null, 'b'],
    carry: 'sw1',
    run: {
      phase: 'alive', root: 'pill', realm: 9, stage: -2, qi: 1e12, age: -3, lifeFlat: 'NaN', demon: 55.5,
      stats: { edge: Infinity, body: 3.6, mind: -2 },
      skills: [{ id: 'sw1', level: 9 }, { id: 'sw1', level: 1 }, { id: 'nope', level: 1 }, null, { id: 'pi1', level: 0 }],
      chance: 999, event: { kind: 'event', id: 'gone' }, pending: { id: 'bo1', level: 1 },
      karma: [{ id: 'kid', due: 4 }, { id: 'kid', due: 9 }, { id: 'zzz', due: 1 }, 7],
      choices: 6, recent: ['i_dog', 'zzz'], log: [{ title: 5, text: 'ok' }, 'x'],
      forceLegacy: 'yes', freeRerolls: 50
    }
  }, 7000, () => 0);
  assert.strictEqual(s.wick, 0);
  assert.strictEqual(s.totalWick, 0);
  assert.strictEqual(s.lives, 2);
  assert.strictEqual(s.best, 14);
  assert.strictEqual(s.lastTime, 7000);
  assert.deepStrictEqual(s.lamps, { r1: 3, m3: 2 });
  assert.deepStrictEqual(s.epitaphs, ['a', 'b']);
  assert.strictEqual(s.carry, '');
  const run = s.run;
  assert.strictEqual(run.phase, 'alive');
  assert.strictEqual(run.realm, 4);
  assert.strictEqual(run.stage, 0);
  assert.strictEqual(run.qi, 100000);
  assert.strictEqual(run.age, 0);
  assert.strictEqual(run.lifeFlat, 0);
  assert.strictEqual(run.demon, 55);
  assert.deepStrictEqual(run.stats, { edge: 0, body: 4, mind: -2 });
  assert.deepStrictEqual(run.skills, [{ id: 'sw1', level: 4 }, { id: 'pi1', level: 1 }]);
  assert.deepStrictEqual(run.karma, [{ id: 'kid', due: 4 }]);
  assert.deepStrictEqual(run.recent, ['i_dog']);
  assert.deepStrictEqual(run.log, [{ title: '', text: 'ok', detail: '' }]);
  assert.strictEqual(run.forceLegacy, false);
  assert.strictEqual(run.event, null);
  assert.strictEqual(run.pending, null);
});

test('存档校验：失效的机缘会退还次数，寿元已尽或心魔已满的存档在载入时结算', () => {
  const s = born();
  s.run.chance = 2;
  const raw = JSON.parse(JSON.stringify(s));
  raw.run.event = { kind: 'event', id: 'renamed', rerolls: 0 };
  const loaded = game.normalizeState(raw, 0, () => 0);
  assert.strictEqual(loaded.run.event, null);
  assert.strictEqual(loaded.run.chance, 3);

  raw.run.event = null;
  raw.run.age = 500;
  const dead = game.normalizeState(raw, 0, () => 0);
  assert.strictEqual(dead.run.phase, 'dead');
  assert.strictEqual(dead.run.death.cause, 'age');
  assert.strictEqual(dead.lives, 1);

  raw.run.age = 0;
  raw.run.demon = 500;
  const mad = game.normalizeState(raw, 0, () => 0);
  assert.strictEqual(mad.run.demon, 100);
  assert.strictEqual(mad.run.phase, 'alive');
  assert.strictEqual(mad.run.mode, 'demon');
  assert.strictEqual(game.yearsLeft(mad), 10);
});

test('内容完整性：功法、事件、因果和灯纹的数据都能被规则使用', () => {
  const fxKeys = ['qi', 'edge', 'body', 'mind', 'demon', 'life', 'chance', 'speed', 'skill', 'slot', 'karma', 'mark', 'unmark'];
  const used = {};
  const gained = {};
  const checkFx = (fx, where) => {
    Object.keys(fx).forEach((k) => assert.ok(fxKeys.indexOf(k) >= 0, where + ' 有未知效果 ' + k));
    if (fx.skill) assert.ok(fx.skill === 'any' || game.SCHOOLS[fx.skill], where);
    if (fx.karma) assert.ok(game.KARMA[fx.karma], where);
    if (fx.mark) {
      assert.ok(game.MARKS[fx.mark], where);
      gained[fx.mark] = true;
    }
    [].concat(fx.unmark || []).forEach((m) => assert.ok(game.MARKS[m], where));
  };
  const ids = {};
  const seeded = {};
  const fruits = {};
  game.EVENTS.forEach((e) => {
    assert.ok(!ids[e.id], e.id + ' 重复');
    ids[e.id] = true;
    assert.ok(e.title && e.text, e.id);
    const gated = (o) => !!(o.need || o.school);
    const open = e.options.filter((o) => !gated(o)).length;
    assert.ok(open >= (e.type === 'story' ? 2 : 3), e.id + ' 无条件的选项太少');
    // 带条件的选项排在最后，保证无条件选项的序号不变。
    assert.ok(e.options.every((o, i) => gated(o) === i >= open), e.id);
    e.options.forEach((o) => assert.ok(!o.school || game.SCHOOLS[o.school], e.id));
    [e].concat(e.options).forEach((item) => {
      (item.need || []).concat(item.not || []).forEach((m) => {
        assert.ok(game.MARKS[m], e.id + ' 用了未知经历 ' + m);
        used[m] = true;
      });
    });
    if (e.type === 'fruit') {
      assert.ok(game.KARMA[e.fruit], e.id);
      fruits[e.fruit] = true;
    } else {
      assert.ok(['adventure', 'karma', 'idle', 'rare', 'story'].indexOf(e.type) >= 0, e.id);
      assert.ok(e.layers.length > 0 && e.layers.every((l) => [0, 1, 2].includes(l)), e.id);
      if (e.type === 'story') assert.ok(e.line && e.need && e.need.length, e.id);
    }
    const labels = {};
    e.options.forEach((o) => {
      assert.ok(o.label && !labels[o.label], e.id + ' 选项重名');
      labels[o.label] = true;
      assert.ok(o.years >= 1, e.id);
      assert.ok(o.fx || o.risk, e.id);
      if (o.cost) assert.deepStrictEqual(Object.keys(o.cost), ['qi'], e.id);
      if (o.fx) {
        checkFx(o.fx, e.id);
        if (o.fx.karma) seeded[o.fx.karma] = true;
      }
      if (o.risk) {
        assert.ok(o.risk.p > 0 && o.risk.p < 1, e.id);
        checkFx(o.risk.win, e.id);
        checkFx(o.risk.lose, e.id);
        assert.ok(!o.risk.win.karma && !o.risk.lose.karma, e.id);
      }
    });
  });
  assert.deepStrictEqual(Object.keys(seeded).sort(), Object.keys(game.KARMA).sort());
  assert.deepStrictEqual(Object.keys(fruits).sort(), Object.keys(game.KARMA).sort());
  // 每段经历都有来处，也都有用处。
  assert.deepStrictEqual(Object.keys(gained).sort(), Object.keys(game.MARKS).sort());
  assert.deepStrictEqual(Object.keys(used).sort(), Object.keys(game.MARKS).sort());
  game.SKILLS.forEach((k) => assert.ok(game.skillDesc(k, 1), k.id + ' 没有说明'));
  [0, 1, 2].forEach((layer) => {
    ['adventure', 'karma', 'idle'].forEach((type) => {
      assert.ok(game.EVENTS.filter((e) => e.type === type && e.layers.indexOf(layer) >= 0).length >= 3, type + layer);
    });
    assert.ok(game.LEGACY_INTROS.filter((i) => i.layer === layer).length >= 1);
  });
  assert.strictEqual(game.SKILLS.length, 40);
  game.SCHOOL_IDS.forEach((id) => {
    assert.strictEqual(game.SKILLS.filter((k) => k.school === id).length, 8);
    assert.ok(game.ROOTS.filter((r) => r.school === id).length === 1);
  });
  assert.strictEqual(new Set(game.SKILLS.map((k) => k.id)).size, 40);
  assert.strictEqual(new Set(game.SKILLS.map((k) => k.name)).size, 40);
  assert.strictEqual(game.LAMPS.length, 14);
  assert.strictEqual(game.TRIBS.length, game.REALMS.length - 1);
});

test('随机游玩 300 世：不会卡死，数值始终合法，存档读回后完全一致', () => {
  const rng = mulberry(20261119);
  const s = game.createState(0, rng);
  let now = 0;
  let steps = 0;
  const seenTypes = {};
  const check = () => {
    const run = s.run;
    [run.qi, run.age, run.demon, run.chance, run.lifeFlat, s.wick, game.qiRate(s), game.maxLife(s)].forEach((n) => assert.ok(Number.isFinite(n)));
    assert.ok(run.qi >= 0 && run.qi <= game.qiCap(s) + 1e-6);
    assert.ok(run.demon >= 0 && run.demon <= 100);
    assert.ok(run.skills.length <= game.maxSkills(s));
    assert.ok(run.skills.every((k) => k.level >= 1 && k.level <= 4));
    if (run.phase === 'alive') assert.ok(game.yearsLeft(s) > 0 && (run.demon < 100 || run.mode === 'demon'));
    assert.deepStrictEqual(game.normalizeState(JSON.parse(JSON.stringify(s)), now, rng), s);
  };
  while (s.lives < 300) {
    assert.ok(++steps < 2e6, '疑似卡死');
    const run = s.run;
    if (run.phase === 'root') {
      game.chooseRoot(s, run.rootChoices[Math.floor(rng() * run.rootChoices.length)], now, rng);
    } else if (run.phase === 'dead') {
      if (game.canCarry(s)) game.setCarry(s, run.skills[0].id);
      game.LAMPS.forEach((lamp) => {
        if (rng() < 0.5) game.buyLamp(s, lamp.id);
      });
      game.reincarnate(s, now, rng);
    } else if (run.pending) {
      game.resolveReplace(s, rng() < 0.3 ? -1 : Math.floor(rng() * run.skills.length));
    } else if (run.event) {
      const v = game.eventView(s);
      seenTypes[v.type] = true;
      if (v.rerolls && rng() < 0.3) {
        game.rerollEvent(s, rng);
      } else {
        const index = rng() < 0.1 ? -1 : Math.floor(rng() * v.options.length);
        const result = game.choose(s, index, rng);
        assert.strictEqual(result === null, index >= 0 && v.options[index].disabled);
      }
    } else if (game.tribulationInfo(s) && game.tribulationInfo(s).ready && rng() < 0.5) {
      game.attemptTribulation(s, rng);
    } else if (game.canDraw(s)) {
      game.drawEvent(s, rng);
    } else if (!game.tribulationInfo(s) && game.isFull(s) && rng() < 0.2) {
      game.retire(s);
    } else {
      now += 20000;
      game.advance(s, now);
    }
    if (steps % 37 === 0) check();
  }
  check();
  const seen = Object.keys(seenTypes);
  ['adventure', 'fruit', 'idle', 'karma', 'legacy', 'rare', 'story'].forEach((type) => assert.ok(seen.includes(type), type));
  seen.forEach((type) => assert.ok(['adventure', 'fruit', 'idle', 'karma', 'legacy', 'rare', 'story', 'omen', 'sudden'].includes(type), type));
  assert.ok(s.best >= 6, '300 世里应该有人到过筑基');
  assert.strictEqual(s.epitaphs.length, 10);
});

test('结算结果带有动作标签，供界面决定角色做什么', () => {
  let s = born();
  setEvent(s, 'a_feast');
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['body', 'demon+', 'mark']);
  setEvent(s, 'a_feast');
  assert.deepStrictEqual(game.choose(s, 2, () => 0).tags, ['skill:sword', 'win']);
  setEvent(s, 'a_feast');
  assert.deepStrictEqual(game.choose(s, 2, () => 0.99).tags, ['life-', 'lose']);
  setEvent(s, 'i_dog');
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['demon-', 'mark']);
  setEvent(s, 'f_kid');
  assert.deepStrictEqual(game.choose(s, 2, () => 0).tags, ['fruit', 'life+', 'demon-']);
  setEvent(s, 'a_fortune');
  s.run.qi = 99;
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['chance']);
  setEvent(s, 'k_kid');
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['karma']);

  s = born();
  s.run.qi = 95;
  setEvent(s, 'i_dog');
  assert.deepStrictEqual(game.choose(s, -1, () => 0).tags, ['seclude', 'qi', 'stageup']);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'pi1', level: 1 }], rerolls: 0 };
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['skill:pill']);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'pi1', level: 1 }], rerolls: 0 };
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['skill:pill', 'upgrade']);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'pi2', level: 1 }], rerolls: 0 };
  assert.deepStrictEqual(game.choose(s, 0, () => 0).tags, ['skill:pill', 'bond']);
});

test('每做完 10 次普通机缘的选择得一次大机缘，进度跨世保留', () => {
  const s = born();
  assert.strictEqual(game.BIG_EVERY, 10);
  s.bigCount = 8;
  setEvent(s, 'i_dog');
  assert.deepStrictEqual(game.choose(s, 1, () => 0).lines, ['神 +1']);
  assert.strictEqual(s.bigCount, 9);
  assert.strictEqual(s.big, 0);
  setEvent(s, 'i_dog');
  const r = game.choose(s, 1, () => 0);
  assert.deepStrictEqual(r.lines, ['神 +1', '做满 10 次机缘，得大机缘 +1']);
  assert.ok(r.tags.indexOf('bigup') >= 0);
  assert.strictEqual(s.bigCount, 0);
  assert.strictEqual(s.big, 1);
  // 大机缘本身不计入进度
  game.drawBig(s, mulberry(2));
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.bigCount, 0);
  s.big = 4;
  s.bigCount = 7;
  game.retire(s);
  game.reincarnate(s, 0, () => 0);
  assert.strictEqual(s.big, 4);
  assert.strictEqual(s.bigCount, 7);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(Object.assign({}, s, { big: 1e9, bigCount: 1e9 }))), 0, () => 0);
  assert.strictEqual(loaded.big, 99);
  assert.strictEqual(loaded.bigCount, 9);
});
test('大机缘：消耗一次大机缘，多一个选项、高一品、不耗寿元，可重抽', () => {
  const s = born();
  assert.strictEqual(game.canDrawBig(s), false);
  assert.strictEqual(game.drawBig(s, () => 0), false);
  s.big = 2;
  give(s, ['ta1', 'ta2']);
  const chance = s.run.chance;
  const rng = mulberry(5);
  assert.strictEqual(game.drawBig(s, rng), true);
  assert.strictEqual(s.big, 1);
  assert.strictEqual(s.run.chance, chance);
  assert.strictEqual(game.drawBig(s, rng), false);
  let v = game.eventView(s);
  assert.strictEqual(v.typeName, '大机缘');
  assert.strictEqual(v.options.length, 4);
  v.options.forEach((o) => assert.strictEqual(o.years, 0));
  s.run.event.offers.forEach((o) => {
    const owned = s.run.skills.filter((k) => k.id === o.id)[0];
    assert.strictEqual(o.level, owned ? 3 : 2);
  });
  assert.strictEqual(game.rerollEvent(s, rng), true);
  assert.strictEqual(s.run.event.big, true);
  assert.strictEqual(game.eventView(s).options.length, 4);
  const first = s.run.event.offers[0];
  const r = game.choose(s, 0, rng);
  assert.strictEqual(r.tags[0], 'big');
  assert.strictEqual(s.run.age, 0);
  assert.strictEqual(s.run.skills.filter((k) => k.id === first.id)[0].level, first.level);

  // 存档里失效的大机缘退还的是大机缘
  game.drawBig(s, rng);
  const raw = JSON.parse(JSON.stringify(s));
  raw.run.event.offers = [];
  const loaded = game.normalizeState(raw, 0, () => 0);
  assert.strictEqual(loaded.run.event, null);
  assert.strictEqual(loaded.big, 1);
  raw.run.event = JSON.parse(JSON.stringify(s.run.event));
  assert.strictEqual(game.normalizeState(raw, 0, () => 0).run.event.big, true);
});
test('精进功法时，选项说明并排显示原数值和新数值', () => {
  const s = born();
  give(s, ['pi1'], 1);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'pi1', level: 2 }, { id: 'sw1', level: 1 }], rerolls: 0 };
  const v = game.eventView(s);
  const pi1 = game.SKILLS.filter((k) => k.id === 'pi1')[0];
  assert.strictEqual(v.options[0].desc, '丹·凡品 → 灵品：' + game.skillUpgradeDesc(pi1, 1, 2));
  assert.ok(/\+\d+%? → \+\d+/.test(v.options[0].desc), v.options[0].desc);
  assert.ok(v.options[1].desc.indexOf('→') < 0);
  const sw = { edge: 3, mind: 1, qi: 0.25, life: 5 };
  assert.strictEqual(game.skillUpgradeDesc(sw, 1, 3), '锋 +3 → +9，神 +1 → +3，灵气产出 +25% → +75%，寿元上限 +5 年 → +15 年');
});
test('特殊功法：按存着的机缘、心魔、年岁和涉猎的系别加属性', () => {
  let s = born();
  give(s, ['sw2'], 2);
  s.run.chance = 47.9;
  // 听雨剑灵品：锋 +4，每存 12 次机缘再 +2
  assert.strictEqual(game.attrs(s).edge, 4 + 2 * 3);
  assert.strictEqual(game.skillDesc(game.SKILLS.filter((k) => k.id === 'sw2')[0], 2), '锋 +4，每存着 12 次机缘，锋 +2');

  s = born();
  give(s, ['sw3', 'bo2', 'bo7']);
  s.run.demon = 35;
  s.run.age = 45;
  assert.deepStrictEqual(game.attrs(s), { edge: 2 + 3, body: 3 + 3 + 1 + 2, mind: 2 });

  s = born();
  give(s, ['ta4'], 2);
  s.run.stats.mind = 16;
  // 神 16 + 4 = 20，锋额外加上神的 30%
  assert.deepStrictEqual(game.attrs(s), { edge: 6, body: 0, mind: 20 });

  s = born();
  give(s, ['lu6', 'sw6', 'pi1']);
  assert.deepStrictEqual(game.attrs(s), { edge: 5 + 3, body: 3, mind: 2 + 3 });
});

test('特殊功法：突破、折寿、每次选择和概率型选项上的效果', () => {
  let s = born();
  give(s, ['sw5', 'bo5'], 2);
  const life = game.maxLife(s);
  s.lastTime = 0;
  game.advance(s, 100000);
  assert.strictEqual(s.run.stage, 1);
  assert.strictEqual(s.run.stats.edge, 2);
  assert.strictEqual(game.maxLife(s), life + 4);

  s = born();
  give(s, ['pi2', 'bo8'], 2);
  setEvent(s, 'a_storm');
  assert.strictEqual(game.eventView(s).options[0].desc, '50% 锋 +3，躯 +2；50% 折寿 6 年');
  let r = game.choose(s, 0, () => 0.9);
  assert.deepStrictEqual(r.lines, ['没成：折寿 6 年，躯 +2']);
  assert.strictEqual(game.maxLife(s), 54);
  assert.strictEqual(s.run.stats.body, 2);

  s = born();
  give(s, ['pi7', 'pi8']);
  s.run.demon = 10;
  setEvent(s, 'i_dog');
  r = game.choose(s, 1, () => 0);
  assert.deepStrictEqual(r.lines, ['神 +1', '灵气 +2', '心魔 -1']);
  assert.strictEqual(s.run.demon, 9);

  s = born();
  give(s, ['lu3', 'lu4'], 2);
  setEvent(s, 'a_storm');
  // 运系 2 门 60%，没成的那 40% 里有 30% 改判为成
  assert.ok(game.eventView(s).options[0].desc.indexOf('72% ') === 0);
  r = game.choose(s, 0, () => 0.71);
  assert.deepStrictEqual(r.lines, ['成了：锋 +3，躯 +2，灵气 +20']);

  s = born();
  give(s, ['lu5', 'lu7']);
  setEvent(s, 'a_storm');
  assert.ok(game.eventView(s).options[0].desc.indexOf('63% ') === 0);
  s.run.age = game.maxLife(s) - 10;
  assert.ok(game.eventView(s).options[0].desc.indexOf('71% ') === 0);
});

test('特殊功法：传承耗寿、闭关、产出、机缘、渡劫和灯芯上的效果', () => {
  let s = born();
  give(s, ['ta2', 'ta7'], 2);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'sw1', level: 1 }], rerolls: 0 };
  const v = game.eventView(s);
  assert.strictEqual(v.options[0].years, 1);
  assert.strictEqual(v.fallback.desc, '灵气 +20');

  s = born();
  give(s, ['pi5', 'lu2', 'lu8']);
  near(game.qiRate(s), 1 + 0.03 * 3);
  near(game.chanceInterval(s), 60 / 1.08);
  assert.strictEqual(game.maxChance(s), 72);

  s = born();
  const base = game.tribulationInfo(s);
  give(s, ['sw7', 'pi3', 'ta1', 'ta8']);
  s.run.stats.mind = 0;
  s.run.stage = 2;
  s.run.qi = 250;
  const info = game.tribulationInfo(s);
  // 定字符、替身符各带神 +2、+1，正好补回被清掉的 2 点神
  near(info.chance, base.chance + 0.7 * (1 / 16) / 2 + 0.03);
  assert.strictEqual(info.lifeBonus, 35);
  assert.strictEqual(info.failYears, 13);
  assert.strictEqual(info.keepText, '灵气只保住 60%');
  const r = game.attemptTribulation(s, () => 0.999);
  assert.deepStrictEqual(r.lines, ['折寿 13 年', '心魔 +10', '灵气只保住 60%']);
  near(s.run.qi, 150);

  s = born();
  s.run.realm = 1;
  s.run.stage = 1;
  give(s, ['lu1'], 3);
  // 11 分 × (1 + 30%)
  assert.strictEqual(game.wickGain(s, 'age'), 15);

  s = born();
  give(s, ['ta3'], 4);
  s.lamps = { m4: 3 };
  setEvent(s, 'a_voice');
  // 灯纹 -30%、镇心符 -40%，合计 -70%
  assert.ok(game.eventView(s).options[0].desc.indexOf('心魔 +8') > 0);
});

test('灯纹“博闻”：功法持有上限 +1，点亮时等着取舍的功法直接收下', () => {
  const s = born();
  assert.strictEqual(game.maxSkills(s), 8);
  give(s, ['sw1', 'sw2', 'sw3', 'sw4', 'pi1', 'pi2', 'ta1', 'ta2']);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'bo3', level: 1 }], rerolls: 0 };
  game.choose(s, 0, () => 0);
  assert.deepStrictEqual(s.run.pending, { id: 'bo3', level: 1 });
  s.wick = 1000;
  assert.strictEqual(game.buyLamp(s, 'm5'), true);
  assert.strictEqual(game.maxSkills(s), 9);
  assert.strictEqual(s.run.pending, null);
  assert.strictEqual(s.run.skills.length, 9);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(loaded.run.skills.length, 9);
  while (game.buyLamp(s, 'm5'));
  assert.strictEqual(game.maxSkills(s), 12);
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'bo6', level: 1 }], rerolls: 0 };
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.pending, null);
  assert.strictEqual(s.run.skills.length, 10);
});

test('奇缘：选项能加这一世的功法上限，加满后不再出现，读档保留，转世清零', () => {
  const s = born();
  assert.strictEqual(game.maxSkills(s), 8);
  setEvent(s, 'r_shelf');
  assert.ok(game.eventView(s).options[0].desc.indexOf('功法上限 +1') >= 0);
  assert.strictEqual(game.eventView(s).typeName, '奇缘');
  const r = game.choose(s, 0, () => 0);
  assert.ok(r.lines.indexOf('功法上限 +1') >= 0);
  assert.strictEqual(game.maxSkills(s), 9);
  assert.ok(s.run.log[s.run.log.length - 1].detail.indexOf('功法上限 8 → 9') >= 0);

  give(s, ['sw1', 'sw2', 'sw3', 'sw4', 'pi1', 'pi2', 'ta1', 'ta2', 'bo3']);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(game.maxSkills(loaded), 9);
  assert.strictEqual(loaded.run.skills.length, 9);

  // 加满之后再遇到也不再加，随机机缘里也抽不到奇缘
  s.run.slots = game.MAX_EXTRA_SLOTS;
  const top = game.maxSkills(s);
  setEvent(s, 'r_shelf');
  game.choose(s, 0, () => 0);
  assert.strictEqual(game.maxSkills(s), top);
  s.run.lifeFlat = 100000;
  for (let i = 0; i < 40; i++) {
    s.run.event = null;
    s.run.pending = null;
    s.run.chance = 5;
    game.drawEvent(s, () => 0.99);
    assert.notStrictEqual(game.eventView(s).type, 'rare');
  }

  // 没加满时，掷到最高的那一段就是奇缘
  const t = born();
  t.run.chance = 5;
  game.drawEvent(t, () => 0.99);
  assert.strictEqual(game.eventView(t).type, 'rare');

  const bad = JSON.parse(JSON.stringify(t));
  bad.run.slots = 999;
  assert.strictEqual(game.normalizeState(bad, 0, () => 0).run.slots, game.MAX_EXTRA_SLOTS);
  assert.strictEqual(game.createState(0, () => 0).run.slots, 0);
});
test('故事线：选择记下经历，经历带出后续章节和别处的新选项', () => {
  const s = born();
  s.run.realm = 2;
  s.run.suddenCount = game.SUDDEN_MAX;
  setEvent(s, 'a_feast');
  assert.strictEqual(game.eventView(s).options.length, 3);
  setEvent(s, 'a_weeding');
  let r = game.choose(s, 0, () => 0);
  assert.deepStrictEqual(r.lines, ['锋 +2', '躯 +2', '记下【守骸宗弟子】']);
  assert.deepStrictEqual(s.run.marks, ['sect']);
  assert.ok(r.tags.indexOf('mark') >= 0);

  // 别处的机缘多出一个只有守骸宗弟子能选的选项
  setEvent(s, 'a_feast');
  let v = game.eventView(s);
  assert.strictEqual(v.options.length, 4);
  assert.strictEqual(v.options[3].desc, '因【守骸宗弟子】；锋 +2，心魔 -5');
  r = game.choose(s, 3, () => 0);
  assert.deepStrictEqual(r.lines, ['锋 +2', '心魔 -5']);

  // 下一章：随机数小于 0.5 时接上故事
  s.run.chance = 5;
  assert.ok(game.drawEvent(s, () => 0));
  assert.strictEqual(s.run.event.id, 's_sect2');
  v = game.eventView(s);
  assert.strictEqual(v.type, 'story');
  assert.strictEqual(v.typeName, '故事 · 守骸宗');
  assert.strictEqual(v.options.length, 2);
  game.choose(s, 0, () => 0);
  assert.deepStrictEqual(s.run.marks, ['sect', 'sect2']);
  assert.deepStrictEqual(s.run.seen, ['s_sect2']);
  assert.ok(game.drawEvent(s, () => 0));
  assert.strictEqual(s.run.event.id, 's_sect3');
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.deepStrictEqual(loaded.run.marks, ['sect', 'sect2']);
  assert.strictEqual(loaded.run.event.id, 's_sect3');
  game.choose(s, 1, () => 0);
  // 每章每世只出现一次，入过门也不会再遇到入门试炼
  for (let i = 0; i < 40; i++) {
    s.run.chance = 5;
    s.run.age = 0;
    s.run.demon = 0;
    assert.ok(game.drawEvent(s, mulberry(i)));
    assert.ok(['s_sect2', 's_sect3', 'a_weeding'].indexOf(s.run.event.id) < 0);
    s.run.event = null;
  }
});

test('故事线：经历可以了结，了结后对应的选项和章节消失', () => {
  const s = born();
  s.run.realm = 2;
  s.run.marks = ['thief'];
  setEvent(s, 'a_market');
  const v = game.eventView(s);
  assert.strictEqual(v.options.length, 4);
  assert.ok(v.options[3].desc.indexOf('了结【兜里有块仙骨】') > 0);
  const r = game.choose(s, 3, () => 0);
  assert.strictEqual(r.lines[r.lines.length - 1], '了结【兜里有块仙骨】');
  assert.deepStrictEqual(s.run.marks, []);
  setEvent(s, 'a_market');
  assert.strictEqual(game.eventView(s).options.length, 3);
  // 存档里混进不存在的经历会被丢掉
  const raw = JSON.parse(JSON.stringify(s));
  raw.run.marks = ['dog', 'dog', 'nope', 3];
  raw.run.seen = ['s_dog', 'a_market', 'nope'];
  const loaded = game.normalizeState(raw, 0, () => 0);
  assert.deepStrictEqual(loaded.run.marks, ['dog']);
  assert.deepStrictEqual(loaded.run.seen, ['s_dog']);
});

test('联动：同系功法凑到 2 门，相关机缘多出专属选项', () => {
  const s = born();
  setEvent(s, 'a_storm');
  assert.strictEqual(game.eventView(s).options.length, 3);
  give(s, ['bo3']);
  assert.strictEqual(game.eventView(s).options.length, 3);
  give(s, ['bo6']);
  const v = game.eventView(s);
  assert.strictEqual(v.options.length, 4);
  assert.strictEqual(v.options[3].desc, '因体系 2 门；锋 +2，躯 +3');
  const r = game.choose(s, 3, () => 0);
  assert.deepStrictEqual(r.lines, ['锋 +2', '躯 +3']);
  // 经历和功法两种条件可以同时出现在一个机缘里
  s.run.marks = ['dog2'];
  give(s, ['sw1', 'sw6']);
  setEvent(s, 'a_cave');
  assert.deepStrictEqual(game.eventView(s).options.slice(3).map((o) => o.desc.split('；')[0]), ['因【身后跟着一条狗】', '因剑系 2 门']);
});

test('联动：上一回的结果留下余势，只影响紧接着的下一回', () => {
  const s = born();
  setEvent(s, 'a_storm');
  assert.strictEqual(game.eventView(s).wake, '');
  game.choose(s, 0, () => 0.49);
  assert.strictEqual(s.run.wake, 'win');
  setEvent(s, 'a_storm');
  let v = game.eventView(s);
  assert.ok(v.wake.indexOf('顺势') === 0);
  assert.ok(v.options[0].desc.indexOf('60% ') === 0);
  game.choose(s, 0, () => 0.6);
  assert.strictEqual(s.run.wake, 'lose');
  assert.strictEqual(game.maxLife(s), 52);

  // 吃一堑：折寿减半，说明和结算一致
  setEvent(s, 'a_storm');
  v = game.eventView(s);
  assert.ok(v.wake.indexOf('吃一堑') === 0);
  assert.strictEqual(v.options[0].desc, '50% 锋 +3，躯 +2；50% 折寿 4 年');
  game.choose(s, 1, () => 0);
  assert.strictEqual(s.run.wake, '');

  // 养精蓄锐：闭关之后的下一回少耗 1 年，闭关自己不减
  setEvent(s, 'a_storm');
  const age = s.run.age;
  game.choose(s, -1, () => 0);
  assert.strictEqual(s.run.age, age + 1);
  assert.strictEqual(s.run.wake, 'rest');
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'sw1', level: 1 }], rerolls: 0 };
  v = game.eventView(s);
  assert.ok(v.wake.indexOf('养精蓄锐') === 0);
  assert.strictEqual(v.options[0].years, 2);
  assert.strictEqual(v.fallback.years, 1);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(loaded.run.wake, 'rest');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.age, age + 3);
  assert.strictEqual(s.run.wake, '');
});

test('自动机缘：花 30 灯芯一次解锁，读档和轮回后可用', () => {
  const id = game.AUTO_LAMP.id;
  const s = born();
  s.wick = 29;
  setEvent(s, 'a_trial');
  const before = JSON.stringify(s);
  assert.strictEqual(game.autoUnlocked(s), false);
  assert.strictEqual(game.autoStep(s, () => 0), null);
  assert.strictEqual(game.buyLamp(s, id), false);
  assert.strictEqual(JSON.stringify(s), before);

  s.wick = 30;
  assert.ok(game.buyLamp(s, id));
  assert.strictEqual(s.wick, 0);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.ok(game.autoUnlocked(loaded));
  assert.ok(game.autoStep(loaded, () => 0).result);
  loaded.wick = 60;
  assert.strictEqual(game.buyLamp(loaded, id), false);
  assert.strictEqual(loaded.wick, 60);
  game.retire(loaded);
  assert.ok(game.reincarnate(loaded, 0, () => 0));
  assert.ok(game.autoUnlocked(loaded));
});

test('自动机缘：挑估分最高的选项，会致命或入魔的不选，没有稳妥选项时留给玩家', () => {
  const s = withAuto(born());
  setEvent(s, 'a_trial');
  // 稳拿的“试老方子”和闭关打平时选前者；要赌折寿的“试新丹”不如它
  assert.strictEqual(game.autoPick(s), 1);
  // 只剩 2 年：耗 2 年的选项都会寿尽，剩下的里闭关最划算
  s.run.age = 58;
  assert.strictEqual(game.autoPick(s), -1);
  // 只剩 1 年：连闭关都会寿尽，机缘原样留着
  s.run.age = 59;
  assert.strictEqual(game.autoPick(s), null);
  const step = game.autoStep(s, () => 0);
  assert.strictEqual(step.stuck, true);
  assert.strictEqual(s.run.event.id, 'a_trial');
  assert.strictEqual(s.run.age, 59);
  assert.strictEqual(s.run.phase, 'alive');

  // 心魔 96：再涨 4 点就入魔，“吃”和“只喝汤”都不能选
  const d = born();
  d.run.demon = 96;
  setEvent(d, 'a_feast');
  assert.ok([0, 1].indexOf(game.autoPick(d)) < 0);
  // 灵气不够付账的选项不选
  const q = born();
  setEvent(q, 'a_auction');
  assert.ok([0, 1].indexOf(game.autoPick(q)) < 0);
});

test('自动机缘：功法已满时换掉最不值的一门，新功法不如旧的就放弃，换了会寿尽的不换', () => {
  const s = withAuto(born());
  give(s, ['bo3', 'bo6', 'ta6', 'ta5', 'ta1', 'ta3', 'bo1', 'lu8']);
  assert.strictEqual(game.autoReplace(s), null);
  s.run.pending = { id: 'sw7', level: 1 };
  assert.strictEqual(game.autoReplace(s), -1);
  s.run.pending = { id: 'ta4', level: 4 };
  assert.strictEqual(game.autoReplace(s), 7);
  const step = game.autoStep(s, () => 0);
  assert.strictEqual(step.result, null);
  assert.strictEqual(step.replaced, '换掉《多此一举》，留下《借笔法》');
  assert.strictEqual(s.run.pending, null);
  assert.deepStrictEqual(s.run.skills[7], { id: 'ta4', level: 4 });
  assert.strictEqual(s.run.log[s.run.log.length - 1].title, '取舍功法');

  // 天品舍身剑寿元上限 -24：年岁已经超过换完后的上限时不换
  const t = withAuto(born());
  give(t, ['ta6', 'ta5', 'ta1', 'ta3', 'ta2', 'ta7', 'ta8', 'lu8']);
  t.run.pending = { id: 'sw8', level: 4 };
  t.run.age = 10;
  assert.ok(game.autoReplace(t) >= 0);
  t.run.age = 50;
  assert.strictEqual(game.autoReplace(t), -1);
  game.autoStep(t, () => 0);
  assert.strictEqual(t.run.phase, 'alive');
  assert.strictEqual(t.run.skills.length, 8);
});

test('自动机缘：大机缘优先，没有机缘时无事可做，身死后不动', () => {
  const s = withAuto(born());
  s.big = 1;
  const step = game.autoStep(s, mulberry(7));
  assert.ok(step.result.tags.indexOf('big') >= 0);
  assert.strictEqual(s.big, 0);
  assert.strictEqual(s.run.chance, 60);
  assert.strictEqual(s.run.skills.length, 1);
  s.run.chance = 0.5;
  assert.strictEqual(game.autoStep(s, mulberry(7)), null);
  game.retire(s);
  assert.strictEqual(game.autoStep(s, mulberry(7)), null);
});

test('自动机缘：一直开着走完一世也不会自己把人走死', () => {
  let stuck = 0;
  let realms = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const rng = mulberry(seed);
    const s = withAuto(game.createState(0, rng));
    // 一部分存档点满灯纹，覆盖功法上限更高、重抽和开局自带功法的情况
    if (seed % 3 === 0) game.LAMPS.forEach((lamp) => { s.lamps[lamp.id] = lamp.max; });
    game.chooseRoot(s, s.run.rootChoices[0], 0, rng);
    for (let i = 0; i < 600; i++) {
      game.advance(s, s.lastTime + 30000);
      s.run.chance = game.maxChance(s);
      const info = game.tribulationInfo(s);
      if (info && info.ready && info.chance >= 0.9) {
        game.attemptTribulation(s, () => 0);
        realms++;
      }
      const step = game.autoStep(s, rng);
      assert.ok(step, '第 ' + seed + ' 局第 ' + i + ' 步无事可做');
      assert.strictEqual(s.run.phase, 'alive', '第 ' + seed + ' 局第 ' + i + ' 步身死：' + JSON.stringify(s.run.log.slice(-2)));
      assert.strictEqual(s.run.pending, null);
      if (step.stuck) {
        stuck++;
        break;
      }
    }
    assert.ok(game.yearsLeft(s) >= 1 && s.run.demon < game.MAX_DEMON);
  }
  assert.ok(stuck > 50, '只有 ' + stuck + ' 局走到寿元将尽');
  assert.ok(realms > 30, '模拟里渡劫成功 ' + realms + ' 次，没走到后面的境界');
});

test('见闻：每条记录带上结算前后的数值变化，渡劫和取舍功法也记', () => {
  const s = born();
  setEvent(s, 'a_feast');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.log[0].detail, '躯 0 → 5，寿元余 60 → 58 年，心魔 0 → 15');
  // 闭关：灵气和寿元都变，突破时写出境界
  s.run.qi = 95;
  setEvent(s, 'i_dog');
  game.choose(s, -1, () => 0);
  assert.strictEqual(s.run.log[1].detail, '境界 凡胎前期 → 凡胎中期，寿元余 58 → 57 年，灵气 95 → 5');
  s.run.stage = 2;
  s.run.qi = game.qiCap(s);
  game.attemptTribulation(s, () => 0.99);
  assert.strictEqual(s.run.log[2].detail, '寿元余 57 → 42 年，心魔 15 → 25，灵气 250 → 125');
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(loaded.run.log[2].detail, s.run.log[2].detail);
  // 旧存档里的记录没有 detail
  const old = JSON.parse(JSON.stringify(s));
  delete old.run.log[0].detail;
  assert.strictEqual(game.normalizeState(old, 0, () => 0).run.log[0].detail, '');

  const t = withAuto(born());
  give(t, ['bo3', 'bo6', 'ta6', 'ta5', 'ta1', 'ta3', 'bo1', 'lu8']);
  t.run.pending = { id: 'ta4', level: 4 };
  game.autoStep(t, () => 0);
  assert.strictEqual(t.run.log[0].detail, '锋 0 → 13，神 15 → 22');
});

test('功法已满时，传承和随机得来的功法里精进比新功法更常出现；没满时不受影响', () => {
  const count = (full) => {
    const s = born();
    give(s, full ? ['sw1', 'sw2', 'pi1', 'pi2', 'ta1', 'bo1', 'lu1', 'lu2'] : ['sw1', 'sw2', 'pi1', 'pi2', 'ta1', 'bo1', 'lu1']);
    const rng = mulberry(5);
    const out = { fresh: 0, owned: 0, gainFresh: 0, gainOwned: 0 };
    for (let i = 0; i < 2000; i++) {
      s.run.event = null;
      s.run.forceLegacy = true;
      s.run.chance = 1;
      game.drawEvent(s, rng);
      assert.strictEqual(s.run.event.offers.length, 3);
      s.run.event.offers.forEach((o) => {
        if (s.run.skills.some((k) => k.id === o.id)) out.owned++;
        else out.fresh++;
      });
      // “塌了一半的洞府”剑系选项：必得一门随机功法
      const t = JSON.parse(JSON.stringify(s));
      setEvent(t, 'a_cave');
      const r = game.choose(t, 3, rng);
      if (r.tags.indexOf('upgrade') >= 0) out.gainOwned++;
      else out.gainFresh++;
    }
    return out;
  };
  const full = count(true);
  assert.ok(full.fresh > 0 && full.fresh < full.owned, JSON.stringify(full));
  assert.ok(full.gainFresh > 0 && full.gainFresh < full.gainOwned, JSON.stringify(full));
  const open = count(false);
  assert.ok(open.fresh > open.owned && open.gainFresh > open.gainOwned, JSON.stringify(open));

  // 手上的功法都满品时没有可精进的，新功法照常出现
  const s = born();
  give(s, ['sw1', 'sw2', 'pi1', 'pi2', 'ta1', 'bo1', 'lu1', 'lu2'], 4);
  s.run.forceLegacy = true;
  game.drawEvent(s, mulberry(5));
  assert.strictEqual(s.run.event.offers.length, 3);
});

test('战力由当前角色派生，兼顾境界、均衡属性和功法，旧档可直接重算', () => {
  const unborn = game.createState(0, () => 0);
  assert.deepStrictEqual(game.combatPowerDetails(unborn), { total: 0, sources: [] });

  const s = born('pill');
  const points = (id) => game.combatPowerDetails(s).sources.find((entry) => entry.id === id).value;
  assert.strictEqual(game.combatPowerDetails(s).total, 12);
  s.run.stats.edge = 12;
  s.run.stats.mind = -100;
  assert.strictEqual(points('attributes'), 14);
  s.run.stats.edge = 24;
  const cap = points('attributes');
  s.run.stats.edge = 36;
  assert.ok(points('attributes') - cap < cap - 14);
  s.run.stats = { edge: 30, body: 0, mind: 0 };
  const specialized = points('attributes');
  s.run.stats = { edge: 10, body: 10, mind: 10 };
  assert.ok(points('attributes') > specialized);

  const initial = game.combatPowerDetails(s).total;
  game.advance(s, 100 * 1000);
  assert.strictEqual(s.run.stage, 1);
  assert.ok(game.combatPowerDetails(s).total > initial);
  give(s, ['pi1', 'pi3', 'pi5', 'pi6']);
  assert.strictEqual(points('mastery'), 8);
  assert.strictEqual(points('bonds'), 10);
  s.run.skills[0].level = 4;
  assert.strictEqual(points('mastery'), 17);
  give(s, ['sw2']);
  const withStoredChances = points('attributes');
  s.run.chance = 0;
  assert.ok(points('attributes') < withStoredChances);

  const profile = game.combatPowerDetails(s);
  assert.strictEqual(profile.total, profile.sources.reduce((sum, source) => sum + source.value, 0));
  assert.deepStrictEqual(game.combatPowerDetails(game.normalizeState(JSON.parse(JSON.stringify(s)), s.lastTime)), profile);
  assert.ok(game.retire(s));
  assert.deepStrictEqual(game.combatPowerDetails(s), profile);
  assert.ok(game.reincarnate(s, s.lastTime, () => 0));
  assert.strictEqual(game.combatPowerDetails(s).total, 0);
});

test('战力按有效秘法贡献计分，并支持来自新玩法的独立增减项', () => {
  const s = born('pill');
  give(s, ['sw1', 'sw2', 'sw4', 'sw6'], 4);
  const before = game.combatPowerDetails(s);
  assert.ok(game.mergeSkills(s, 'sw1', 'sw2', () => 1));
  const merged = game.combatPowerDetails(s);
  assert.ok(merged.total > before.total);
  s.run.aftermath = { id: 'backlash', remaining: 1 };
  const suppressed = game.combatPowerDetails(s);
  assert.strictEqual(suppressed.sources.find((entry) => entry.id === 'mastery').value, 22);
  assert.ok(suppressed.total < merged.total);

  const equipment = { id: 'equipment', label: '装备', value: 12.6 };
  const injury = { id: 'injury', label: '伤势', value: -3 };
  const inputs = [game.REALMS[0], game.STAGES[0], game.attrs(s)];
  const base = powerProfile(...inputs);
  const extended = powerProfile(...inputs, [equipment, injury]);
  assert.strictEqual(extended.total, base.total + 10);
  assert.deepStrictEqual(extended.sources.slice(-2), [Object.assign({}, equipment, { value: 13 }), injury]);
});

test('竞技场估算全境界逐阶段递增，同档构筑可公平切磋，灯芯加成有上限', () => {
  const s = born('pill');
  const builds = [
    { attrs: [3, 2, 1], skills: [], level: 1 },
    { attrs: [13, 10, 8], skills: ['sw1', 'sw4', 'bo1', 'ta1'], level: 1 },
    { attrs: [30, 28, 22], skills: ['sw1', 'sw4', 'bo1', 'bo3', 'ta1', 'pi1'], level: 2 },
    { attrs: [90, 70, 63], skills: ['sw1', 'sw4', 'bo1', 'bo3', 'ta1', 'ta2', 'pi1', 'pi3'], level: 3 },
    { attrs: [135, 120, 105], skills: ['sw1', 'sw4', 'bo1', 'bo3', 'ta1', 'ta2', 'pi1', 'pi3'], level: 4 }
  ];
  let previous = 0;
  builds.forEach((build, realm) => {
    s.run.realm = realm;
    s.run.skills = [];
    give(s, build.skills, build.level);
    s.run.stats = { edge: build.attrs[0], body: build.attrs[1], mind: build.attrs[2] };
    game.STAGES.forEach((_, stage) => {
      s.run.stage = stage;
      const realmIndex = realm * game.STAGES.length + stage;
      const info = game.arenaInfo(s, { realmIndex, totalWick: 0 });
      assert.ok(info.power > previous);
      previous = info.power;
      const highWick = game.arenaInfo(s, { realmIndex, totalWick: 1e9 });
      assert.strictEqual(highWick.power, Math.round(info.power * 1.15));
      assert.strictEqual(game.arenaInfo(s, { realmIndex, totalWick: NaN }).power, info.power);
      assert.strictEqual(game.arenaInfo(s, { realmIndex, totalWick: -5 }).power, info.power);
      if (stage === 0) assert.ok(info.chance >= 0.4 && info.chance <= 0.6, '同档胜率 ' + info.chance);
    });
  });
  assert.strictEqual(game.arenaInfo(s, { realmIndex: 999 }).power, previous);
  assert.strictEqual(game.arenaInfo(s, { realmIndex: null }).power, 8);
});

test('竞技场：战力推算、胜败奖励、对战次数每小时回复一次并可一次用完', () => {
  const s = born();
  s.run.stats = { edge: 10, body: 10, mind: -5 };
  assert.strictEqual(game.arenaPower(s), 35);
  assert.strictEqual(s.arena, 10);
  const weak = { id: 'u1', name: '甲', realmIndex: 0, totalWick: 0 };
  const strong = { id: 'u2', name: '乙', realmIndex: 11, totalWick: 99999 };
  let info = game.arenaInfo(s, weak);
  assert.strictEqual(info.power, 19);
  near(info.chance, 35 / 54);
  assert.deepStrictEqual([info.win, info.years, info.left, info.reason], [3, 3, 10, '']);
  info = game.arenaInfo(s, strong);
  assert.strictEqual(info.power, 741);
  assert.strictEqual(info.chance, 0.05);
  assert.strictEqual(info.win, 44);
  assert.strictEqual(game.arenaInfo(s, { realmIndex: 12, totalWick: 0 }).power, 722);
  assert.strictEqual(game.arenaInfo(s, { id: 'u3', realmIndex: -1, totalWick: 5 }).power, 8);
  assert.strictEqual(game.arenaInfo(s, { id: 'u4' }).power, 8);

  // 败：寿元上限 -3，耗一次。
  const originalAttrs = game.attrs(s);
  const originalTrib = game.tribulationInfo(s).chance;
  let r = game.arenaFight(s, strong, () => 0.5);
  assert.deepStrictEqual([r.win, r.fights], [false, 1]);
  assert.deepStrictEqual(r.lines, ['论道积分未增加', '折寿 3 年']);
  assert.strictEqual(s.arenaPoints, 0);
  assert.strictEqual(game.maxLife(s), 57);
  assert.strictEqual(s.run.age, 0);
  assert.strictEqual(s.arena, 9);
  assert.deepStrictEqual(s.run.log[0], { age: 0, title: '竞技场', text: '败给乙：论道积分未增加，折寿 3 年', detail: '寿元余 60 → 57 年，寿元上限 60 → 57 年' });
  // 胜：论道积分 +44，解锁称号；同一个人可以接着再胜。
  r = game.arenaFight(s, strong, () => 0);
  assert.strictEqual(r.win, true);
  assert.deepStrictEqual(r.lines, ['论道积分 +44', '获得称号「论道新秀」']);
  assert.strictEqual(game.arenaStanding(s).title, '论道新秀');
  assert.strictEqual(game.maxLife(s), 57);
  assert.strictEqual(game.arenaFight(s, strong, () => 0).win, true);
  assert.strictEqual(s.arena, 7);

  // 一次用完：剩 3 次就连打 3 场，记成一条见闻
  s.arena = 3.5;
  const logs = s.run.log.length;
  let n = 0;
  r = game.arenaFight(s, weak, () => (n++ === 1 ? 0.999 : 0), 99);
  assert.deepStrictEqual([r.fights, r.wins, r.losses], [3, 2, 1]);
  assert.deepStrictEqual(r.lines, ['论道积分 +6', '折寿 3 年']);
  assert.strictEqual(r.label, '连战甲 3 场，胜 2 败 1');
  assert.strictEqual(s.arenaPoints, 94);
  assert.deepStrictEqual(game.attrs(s), originalAttrs);
  assert.strictEqual(game.tribulationInfo(s).chance, originalTrib);
  assert.strictEqual(s.run.log.length, logs + 1);
  near(s.arena, 0.5);
  assert.strictEqual(game.arenaInfo(s, weak).reason, '对战次数用完了');
  assert.strictEqual(game.arenaFight(s, weak, () => 0, 99), null);

  // 每小时回一次，最多 10 次；身死期间也照样回
  assert.strictEqual(game.arenaWait(s), 1800);
  game.advance(s, s.lastTime + 1800 * 1000);
  near(s.arena, 1);
  assert.strictEqual(game.arenaInfo(s, weak).left, 1);
  game.advance(s, s.lastTime + 100 * 3600 * 1000);
  assert.strictEqual(s.arena, 10);
  assert.strictEqual(game.arenaWait(s), 0);

  // 读档：旧存档没有这个字段时给满，越界的截回来
  const raw = JSON.parse(JSON.stringify(s));
  raw.arena = 2.5;
  assert.strictEqual(game.normalizeState(raw, s.lastTime, () => 0).arena, 2.5);
  assert.strictEqual(game.normalizeState(raw, s.lastTime, () => 0).arenaPoints, 94);
  raw.arena = 99;
  assert.strictEqual(game.normalizeState(raw, s.lastTime, () => 0).arena, 10);
  delete raw.arena;
  delete raw.arenaPoints;
  const old = game.normalizeState(raw, s.lastTime, () => 0);
  assert.strictEqual(old.arena, 10);
  assert.strictEqual(old.arenaPoints, 0);
  assert.deepStrictEqual(game.attrs(old), originalAttrs);

  // 连战时寿元经不起一败就停手，不会死在竞技场里
  s.run.age = game.maxLife(s) - 8;
  r = game.arenaFight(s, weak, () => 0.999, 99);
  assert.strictEqual(r.fights, 2);
  assert.strictEqual(s.arena, 8);
  assert.strictEqual(s.run.phase, 'alive');
  assert.strictEqual(game.yearsLeft(s), 2);
  assert.strictEqual(game.arenaInfo(s, weak).reason, '寿元不足，经不起一败');
  assert.strictEqual(game.arenaFight(s, weak, () => 0), null);
  game.retire(s);
  assert.strictEqual(game.arenaFight(s, weak, () => 0), null);
  s.arena = 4;
  game.advance(s, s.lastTime + 3600 * 1000);
  assert.strictEqual(s.arena, 5);
  game.reincarnate(s, s.lastTime, () => 0);
  assert.strictEqual(s.arena, 5);
  assert.strictEqual(s.arenaPoints, 94);
});
function goldCore() {
  const s = born();
  s.run.realm = game.SEA_REALM;
  s.run.stage = game.STAGES.length - 1;
  s.run.qi = game.qiCap(s);
  s.run.lifeFlat = 240;
  return s;
}

test('枯海：旧档金丹圆满即可登船，普通机缘和离线经过不会推动探索', () => {
  const raw = goldCore();
  delete raw.run.sea;
  const s = game.normalizeState(raw, 0, () => 0);
  assert.strictEqual(game.wickGain(s, 'retire'), 120);
  s.run.qi--;
  assert.strictEqual(game.seaView(s), null);
  s.run.qi++;
  setEvent(s, 'i_mirror');
  assert.strictEqual(game.seaView(s), null);
  game.choose(s, -1, () => 0);
  assert.deepStrictEqual(game.seaView(s).options.map((option) => option.id), ['sect', 'cult', 'academy']);
  assert.ok(game.chooseSea(s, 'sect', 0));
  assert.strictEqual(game.layerName(s.run), '枯海');
  s.big = 1;
  assert.strictEqual(game.drawEvent(s, () => 0), false);
  assert.strictEqual(game.drawBig(s, () => 0), false);
  withAuto(s);
  assert.strictEqual(game.autoStep(s, () => 0), null);
  const before = { ...s.run.sea };
  const age = s.run.age;
  game.advance(s, 86400000);
  assert.deepStrictEqual(s.run.sea, before);
  assert.strictEqual(s.run.age, age);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), s.lastTime, () => 0);
  assert.deepStrictEqual(loaded, s);
  assert.strictEqual(game.chooseSea(loaded, 'return', 0), null);
  assert.ok(game.chooseSea(loaded, 'return', 1));
  assert.ok(game.retreatSea(loaded).lines.some((line) => line.includes('保留「归骨符」')));
  assert.strictEqual(game.seaView(loaded), null);
  assert.strictEqual(game.retreatSea(loaded), null);
  assert.ok(game.yuanTrialView(loaded).ready);
  assert.ok(game.canDraw(loaded));
});

test('枯海：三条航线各有普通与旧经历选项，线索及剧情结局写入本纪', () => {
  for (const [route, mark, oldFirst, oldSecond, anchor, clue] of [
    ['sect', 'sect2', 'seal', 'remember', '归骨符', '守骨人的旧名'],
    ['cult', 'cult2', 'order', 'chant', '龙脊拓片', '龙骨铭文'],
    ['academy', 'petword', 'ask', 'rubbing', '定潮字', '补全的船籍']
  ]) {
    const s = goldCore();
    assert.ok(game.chooseSea(s, route, 0));
    assert.strictEqual(game.seaView(s).options.length, 2);
    assert.strictEqual(game.chooseSea(s, oldFirst, 1), null);
    s.run.marks = route === 'academy' ? [mark, 'academy'] : [mark];
    assert.ok(game.chooseSea(s, oldFirst, 1).lines.some((line) => line.includes(anchor)));
    assert.ok(game.chooseSea(s, oldSecond, 2).lines.some((line) => line.includes(clue)));
    assert.strictEqual(s.run.sea.tide, 3);
    assert.ok(s.run.sea.landed && s.run.sea.anchor && s.run.sea.clue);
    assert.ok(s.run.log.at(-1).text.includes('枯海留名'));
    assert.ok(game.chronicle(s).rows.some((entry) => entry.text.includes(clue)));
  }
});

test('元婴劫：盐骨关独立判定，问名关失败后退回首关，过两关才破境', () => {
  const s = goldCore();
  s.run.stats.edge = 150;
  s.run.stats.body = 10;
  assert.ok(game.chooseSea(s, 'academy', 0));
  assert.ok(game.chooseSea(s, 'gather', 1));
  assert.ok(game.chooseSea(s, 'read', 2));
  let info = game.yuanTrialView(s);
  assert.strictEqual(info.name, '盐骨关');
  const [edge, body, anchor] = info.options;
  assert.ok(edge.chance > body.chance);
  assert.ok(anchor.chance > edge.chance && anchor.chance < 1);
  assert.strictEqual(game.attemptTribulation(s, () => 0), null);
  assert.strictEqual(game.attemptYuanTrial(s, () => 0, 'mind', 2), null);
  const life = s.run.lifeFlat;
  const chance = s.run.chance;
  const noRoll = () => assert.fail('准备妥当时无需判定随机数');
  assert.ok(game.attemptYuanTrial(s, () => 0, 'anchor', 1).success);
  assert.strictEqual(s.run.chance, chance - 8);
  assert.strictEqual(s.run.realm, game.SEA_REALM);
  assert.strictEqual(s.run.lifeFlat, life);
  const mid = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  info = game.yuanTrialView(mid);
  assert.strictEqual(info.name, '问名关');
  assert.ok(info.options.some((option) => option.id === 'clue' && option.chance === 1));
  assert.strictEqual(game.attemptYuanTrial(mid, () => 0, 'anchor', 1), null);
  const age = mid.run.age;
  const failed = game.attemptYuanTrial(mid, () => 0.999, 'mind', 2);
  assert.strictEqual(failed.success, false);
  assert.strictEqual(mid.run.age, age + info.failYears);
  assert.strictEqual(mid.run.qi, game.qiCap(mid) * info.keep);
  assert.strictEqual(game.yuanTrialView(mid).step, 1);
  assert.strictEqual(game.yuanTrialView(mid).ready, false);
  assert.ok(mid.run.sea.anchor && mid.run.sea.clue);
  game.advance(mid, 86400000);
  assert.ok(game.attemptYuanTrial(mid, () => 0, 'anchor', 1).success);
  assert.ok(game.attemptYuanTrial(mid, noRoll, 'clue', 2).advanced);
  assert.strictEqual(game.realmText(mid.run), '元婴前期');
  assert.strictEqual(game.layerName(mid.run), '枯海');
  assert.strictEqual(mid.run.lifeFlat, life + 300);
  assert.strictEqual(game.wickGain(mid, 'retire'), 160);
  assert.strictEqual(game.yuanTrialView(mid), null);
  assert.ok(game.drawEvent(mid, () => 0));
  assert.strictEqual(game.eventView(mid).title, '盐里的玉简');
  game.retire(mid);
  assert.strictEqual(mid.best, 12);
  assert.ok(game.reincarnate(mid, mid.lastTime, () => 0));
  assert.strictEqual(mid.run.sea, null);
});

test('元婴劫：早返航后可找逃字或丹修，资源不足时不结算', () => {
  const s = goldCore();
  assert.ok(game.chooseSea(s, 'sect', 0));
  assert.ok(game.retreatSea(s));
  assert.strictEqual(game.yuanTrialView(s).options.length, 2);
  assert.ok(game.attemptYuanTrial(s, () => 0, 'body', 1).success);
  assert.deepStrictEqual(game.yuanTrialView(s).options.map((option) => option.id), ['mind']);
  s.run.marks = ['petword'];
  give(s, ['pi1', 'pi2']);
  s.run.chance = 9;
  s.run.age = game.maxLife(s) - 6;
  assert.strictEqual(game.attemptYuanTrial(s, () => 0, 'pill', 2), null);
  assert.strictEqual(game.attemptYuanTrial(s, () => 0, 'word', 2), null);
  assert.strictEqual(game.yuanTrialView(s).step, 2);
  s.run.chance++;
  assert.ok(game.attemptYuanTrial(s, () => 0.999, 'pill', 2).advanced);
  assert.strictEqual(s.run.chance, 0);
});

test('命格：投胎抽一张且换根骨不换，早慧、灯下黑和薄命都实际生效', () => {
  const s = game.createState(0, () => 0);
  assert.strictEqual(s.run.fate, 'bright');
  assert.strictEqual(game.rerollRoots(s, () => 0), true);
  assert.strictEqual(s.run.fate, 'bright');
  assert.ok(game.chooseRoot(s, 'sword', 0, () => 0));
  assert.deepStrictEqual(game.attrs(s), { edge: 2, body: 0, mind: 5 });
  assert.strictEqual(game.maxLife(s), 50);

  s.run.fate = 'dark';
  near(game.qiRate(s), 0.8);
  near(game.chanceInterval(s), 40);
  s.run.fate = 'short';
  assert.strictEqual(game.maxLife(s), 42);
  assert.strictEqual(game.wickGain(s, 'age'), 3);
  assert.strictEqual(game.FATES.length, 3);

  // 更新前已经开始的旧世不补抽命格，避免读档改变数值。
  const old = game.normalizeState({ run: { phase: 'alive', root: 'sword' } }, 0, () => 0);
  assert.strictEqual(old.run.fate, '');
  assert.strictEqual(game.maxLife(old), 60);
});

test('机缘事件：直接获得次数，本世速度加成生效并读档保留', () => {
  const s = born();
  s.run.chance = 0;
  setEvent(s, 'a_chance_tide');
  assert.ok(game.eventView(s).options[2].desc.indexOf('机缘积攒速度 +5%') >= 0);
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.chance, 3);
  setEvent(s, 'a_chance_tide');
  game.choose(s, 2, () => 0);
  assert.strictEqual(s.run.chance, 4);
  near(s.run.speed, 0.05);
  near(game.chanceInterval(s), 60 / 1.05);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  near(loaded.run.speed, 0.05);
  near(game.chanceInterval(loaded), 60 / 1.05);
});

test('渡劫三法：借势扣三十次机缘并加成功率，散功必败但不死', () => {
  const s = born();
  s.run.stats = { edge: 20, body: 20, mind: 20 };
  s.run.stage = 2;
  s.run.qi = game.qiCap(s);
  s.run.chance = 0;
  const before = JSON.stringify(s);
  assert.strictEqual(game.attemptTribulation(s, () => 0, 'borrow'), null);
  assert.strictEqual(JSON.stringify(s), before);
  s.run.chance = 30;
  const info = game.tribulationInfo(s);
  near(info.borrowChance, Math.min(0.98, info.chance + 0.15));
  const borrowed = game.attemptTribulation(s, () => 0, 'borrow');
  assert.strictEqual(borrowed.method, 'borrow');
  assert.strictEqual(borrowed.success, true);
  assert.strictEqual(s.run.chance, 0);
  assert.strictEqual(s.run.realm, 1);
  assert.strictEqual(s.run.lastTrib.method, 'borrow');

  const scattered = born();
  scattered.run.stage = 2;
  scattered.run.qi = game.qiCap(scattered);
  scattered.run.demon = 20;
  scattered.run.age = game.maxLife(scattered) - 2;
  const cap = game.qiCap(scattered);
  const result = game.attemptTribulation(scattered, () => 0, 'scatter');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.dead, false);
  assert.strictEqual(scattered.run.phase, 'alive');
  assert.strictEqual(scattered.run.age, game.maxLife(scattered) - 1);
  assert.strictEqual(scattered.run.demon, 20);
  near(scattered.run.qi, cap / 2);
  assert.strictEqual(scattered.run.lastTrib.method, 'scatter');
});

test('秘法：同系两门天品归一，效果总和乘 1.2，读档后仍合法', () => {
  const s = born();
  give(s, ['sw1', 'sw2', 'pi1'], 4);
  assert.strictEqual(game.mergeOptions(s, 'sw1').length, 1);
  assert.strictEqual(game.mergeOptions(s, 'sw2').length, 1);
  assert.strictEqual(game.mergeSkills(s, 'sw1', 'pi1'), null);
  const result = game.mergeSkills(s, 'sw1', 'sw2');
  assert.strictEqual(result.dead, false);
  assert.strictEqual(s.run.skills.length, 2);
  const entry = s.run.skills.filter((item) => item.id.indexOf('arc_') === 0)[0];
  const arcane = game.skillInfo(entry.id);
  assert.strictEqual(arcane.arcane, true);
  assert.strictEqual(entry.level, 1);
  near(arcane.edge, 24);
  near(arcane.qi, 0.48);
  near(arcane.storeEdge, 5);
  assert.ok(game.skillTitle(arcane, 1).indexOf('秘法') >= 0);
  assert.strictEqual(game.mergeOptions(s, arcane.id).length, 0);
  assert.strictEqual(game.ARCANES.length, 140);
  assert.strictEqual(new Set(game.ARCANES.map((item) => item.id)).size, 140);
  const integerStats = ['edge', 'body', 'mind', 'life', 'storeEdge', 'demonEdge', 'stageEdge', 'tough', 'tribLife', 'soothe', 'yearsCut', 'demonBody', 'stageLife', 'ageBody', 'scar', 'fool', 'store'];
  game.ARCANES.forEach((skill) => integerStats.forEach((key) => {
    if (skill[key] !== undefined) assert.ok(Number.isInteger(skill[key]), skill.id + '.' + key + ' 应取整');
  }));
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.deepStrictEqual(loaded.run.skills, s.run.skills);
  assert.strictEqual(game.skillInfo(loaded.run.skills[1].id).arcane, true);
});

test('本纪：见闻记录选择时的年岁，身死后自动补上终章且读档不丢', () => {
  const s = born();
  setEvent(s, 'i_dog');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.log[0].age, 1);
  game.retire(s);
  const data = game.chronicle(s);
  assert.strictEqual(data.title, '第 1 世本纪');
  assert.strictEqual(data.rows.length, 2);
  assert.strictEqual(data.rows[0].age, 1);
  assert.strictEqual(data.rows[1].title, '本纪终');
  assert.strictEqual(data.rows[1].detail, '灯芯 +2');
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.deepStrictEqual(game.chronicle(loaded), data);

  const old = JSON.parse(JSON.stringify(s));
  delete old.run.log[0].age;
  assert.strictEqual(game.chronicle(game.normalizeState(old, 0, () => 0)).rows[0].age, null);
});

test('负面与中性机缘：新事件可展示，负面代价和中性小收益按说明结算', () => {
  const negative = ['a_blood_rain', 'a_bone_debt', 'a_graven_image', 'a_mirror_price', 'a_dead_meridian', 'a_thunder_echo'];
  const neutral = ['i_cloud_watching', 'i_sweeping', 'i_cold_tea', 'i_straw_shoe', 'i_paper_boat', 'i_roof_tiles'];
  const hasNegative = (option) => !!(
    (option.fx && (option.fx.life < 0 || option.fx.demon > 0)) ||
    (option.risk && (option.risk.lose.life < 0 || option.risk.lose.demon > 0))
  );
  negative.forEach((id) => {
    const event = game.EVENTS.filter((item) => item.id === id)[0];
    assert.ok(event && event.type === 'adventure', id);
    assert.ok(event.options.every(hasNegative), id + ' 应保留明确的负面代价');
  });
  neutral.forEach((id) => {
    const event = game.EVENTS.filter((item) => item.id === id)[0];
    assert.ok(event && event.type === 'idle', id);
    event.options.forEach((option) => {
      assert.ok(!option.risk && !option.cost && !hasNegative(option), id + ' 不应藏有额外惩罚');
    });
  });

  const s = born();
  setEvent(s, 'a_blood_rain');
  assert.strictEqual(game.eventView(s).options[1].desc, '灵气 +45，心魔 +9');
  game.choose(s, 1, () => 0);
  assert.strictEqual(s.run.qi, 45);
  assert.strictEqual(s.run.demon, 9);
  setEvent(s, 'a_bone_debt');
  game.choose(s, 0, () => 0);
  assert.strictEqual(s.run.lifeFlat, -7);
  assert.strictEqual(game.maxLife(s), 53);

  const calm = born();
  calm.run.chance = 0;
  setEvent(calm, 'i_paper_boat');
  assert.strictEqual(game.eventView(calm).options[1].desc, '机缘 +1');
  game.choose(calm, 1, () => 0);
  assert.strictEqual(calm.run.chance, 1);
  setEvent(calm, 'i_roof_tiles');
  game.choose(calm, 2, () => 0);
  assert.strictEqual(calm.run.stats.mind, 4);
  assert.strictEqual(calm.run.demon, 0);
});

test('突发事件链：主动突破引出征兆与突发，余波和冷却按普通机缘倒计时', () => {
  const s = born();
  s.run.realm = 2;
  s.run.qi = game.qiCap(s) - 1;
  setEvent(s, 'i_dog');
  const result = game.choose(s, 2, () => 0);
  assert.ok(result.tags.includes('stageup'));
  assert.deepStrictEqual(s.run.sudden, { id: 'meridian', stage: 'omen' });

  assert.ok(game.drawEvent(s, () => 0));
  assert.strictEqual(s.run.event.id, 's_meridian_omen');
  assert.strictEqual(game.eventView(s).type, 'omen');
  assert.strictEqual(game.eventView(s).rerolls, 0);
  game.choose(s, 0, () => 0);
  assert.deepStrictEqual(s.run.sudden, { id: 'meridian', stage: 'event' });
  s.big = 1;
  assert.strictEqual(game.canDrawBig(s), false);
  assert.strictEqual(game.drawBig(s, () => 0), false);
  assert.ok(game.drawEvent(s, () => 0));
  assert.strictEqual(s.run.event.id, 's_meridian');
  assert.strictEqual(game.eventView(s).type, 'sudden');
  game.choose(s, 2, () => 0);
  assert.deepStrictEqual(s.run.aftermath, { id: 'meridian', remaining: 3 });
  assert.strictEqual(s.run.suddenCount, 1);
  assert.strictEqual(s.run.suddenCooldown, 4);

  // 大机缘不能减少普通机缘的余波和冷却。
  s.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'sw1', level: 2 }], rerolls: 0, big: true };
  game.choose(s, 0, () => 0.99);
  assert.strictEqual(s.run.aftermath.remaining, 3);
  assert.strictEqual(s.run.suddenCooldown, 4);

  s.run.qi = 0;
  s.run.chance = 0;
  setEvent(s, 'i_dog');
  const expectedQi = Math.round(game.qiCap(s) * 0.1 * 0.7);
  assert.strictEqual(game.eventView(s).options[2].desc, '灵气 +' + expectedQi);
  game.choose(s, 2, () => 0.99);
  assert.strictEqual(s.run.qi, expectedQi);
  assert.strictEqual(s.run.aftermath.remaining, 2);
  assert.strictEqual(s.run.suddenCooldown, 3);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.deepStrictEqual(loaded.run.aftermath, s.run.aftermath);
  assert.strictEqual(loaded.run.suddenCooldown, 3);

  setEvent(s, 'i_dog');
  game.choose(s, 1, () => 0.99);
  assert.strictEqual(s.run.aftermath.remaining, 1);
  setEvent(s, 'i_dog');
  game.choose(s, 1, () => 0.99);
  assert.strictEqual(s.run.aftermath, null);
  assert.strictEqual(s.run.suddenCooldown, 1);
  setEvent(s, 'i_dog');
  game.choose(s, 1, () => 0.99);
  assert.strictEqual(s.run.suddenCooldown, 0);

  // 非整十容量也不能因两次舍入让说明和到账差 1 点。
  const exact = born();
  exact.run.realm = 2;
  exact.run.stage = 2;
  exact.run.qi = 0;
  exact.run.aftermath = { id: 'meridian', remaining: 3 };
  setEvent(exact, 'a_dead_meridian');
  const exactQi = Math.round(game.qiCap(exact) * 0.75 * 0.7);
  assert.strictEqual(game.eventView(exact).options[0].desc, '灵气 +' + exactQi + '，折寿 8 年');
  exact.run.chance = 0;
  game.choose(exact, 0, () => 0.99);
  assert.strictEqual(exact.run.qi, exactQi);

  // 离线突破照常发生，但不会新增突发。
  const offline = born();
  offline.run.realm = 2;
  offline.run.qi = game.qiCap(offline) - 1;
  game.advance(offline, 1000);
  assert.strictEqual(offline.run.stage, 1);
  assert.strictEqual(offline.run.sudden, null);
  assert.strictEqual(offline.run.aftermath, null);
});

test('突发来源：渡劫、秘法、大机缘、资源溢出和经历累积分别触发对应事件', () => {
  const trib = born();
  trib.run.realm = 1;
  trib.run.stage = 2;
  trib.run.stats = { edge: 100, body: 100, mind: 100 };
  trib.run.qi = game.qiCap(trib);
  assert.ok(game.attemptTribulation(trib, () => 0).success);
  assert.deepStrictEqual(trib.run.sudden, { id: 'thunder', stage: 'omen' });

  const merged = born();
  merged.run.realm = 2;
  give(merged, ['sw1', 'sw2'], 4);
  assert.ok(game.mergeSkills(merged, 'sw1', 'sw2', () => 0));
  assert.deepStrictEqual(merged.run.sudden, { id: 'backlash', stage: 'omen' });

  const big = born();
  big.run.realm = 1;
  big.run.event = { kind: 'legacy', intro: 0, offers: [{ id: 'sw1', level: 2 }], rerolls: 0, big: true };
  game.choose(big, 0, () => 0);
  assert.deepStrictEqual(big.run.sudden, { id: 'fortune', stage: 'omen' });

  const rich = born();
  rich.run.realm = 1;
  rich.run.chance = game.maxChance(rich);
  setEvent(rich, 'i_dog');
  game.choose(rich, 1, () => 0);
  assert.deepStrictEqual(rich.run.sudden, { id: 'fortune', stage: 'omen' });

  const earlyDebt = born();
  earlyDebt.run.realm = 1;
  earlyDebt.run.chance = 0;
  earlyDebt.run.marks = ['sect'];
  setEvent(earlyDebt, 'i_dog');
  game.choose(earlyDebt, 0, () => 0);
  assert.strictEqual(earlyDebt.run.sudden, null);

  const debt = born();
  debt.run.realm = 1;
  debt.run.chance = 0;
  debt.run.marks = ['sect', 'taste'];
  setEvent(debt, 'i_dog');
  game.choose(debt, 0, () => 0);
  assert.deepStrictEqual(debt.run.sudden, { id: 'debt', stage: 'omen' });

  game.SUDDENS.forEach((info) => {
    const pair = game.EVENTS.filter((event) => event.trigger === info.id);
    assert.deepStrictEqual(pair.map((event) => event.stage).sort(), ['event', 'omen'], info.id);
  });
});

test('突发余波：概率、秘法、机缘速度、属性和负机缘都按说明结算', () => {
  const thunder = born();
  setEvent(thunder, 'a_gamble');
  assert.ok(thunder && game.eventView(thunder).options[0].desc.startsWith('50%'));
  thunder.run.aftermath = { id: 'thunder', remaining: 3 };
  assert.ok(game.eventView(thunder).options[0].desc.startsWith('40%'));

  const fortune = born();
  const interval = game.chanceInterval(fortune);
  fortune.run.aftermath = { id: 'fortune', remaining: 3 };
  near(game.chanceInterval(fortune), interval * 1.5);
  fortune.run.aftermath = null;
  fortune.run.chance = 20;
  setEvent(fortune, 's_fortune');
  assert.strictEqual(game.eventView(fortune).options[0].desc, '神 +2，机缘 -6');
  game.choose(fortune, 0, () => 0);
  assert.strictEqual(fortune.run.chance, 14);

  const backlash = born();
  backlash.run.realm = 2;
  backlash.run.skills = [{ id: 'arc_sw1_sw2', level: 1 }];
  assert.strictEqual(game.attrs(backlash).edge, 49);
  near(game.qiRate(backlash), 6 * 1.48);
  backlash.run.aftermath = { id: 'backlash', remaining: 3 };
  assert.strictEqual(game.attrs(backlash).edge, 0);
  near(game.qiRate(backlash), 6);

  const debt = born();
  debt.run.stats = { edge: 20, body: 10, mind: 5 };
  debt.run.aftermath = { id: 'debt', remaining: 3 };
  assert.deepStrictEqual(game.attrs(debt), { edge: 18, body: 9, mind: 4 });

  const capped = born();
  capped.run.realm = 2;
  capped.run.suddenCount = game.SUDDEN_MAX;
  assert.strictEqual(game.maybeSudden(capped, () => 0, 'meridian'), false);

  const low = born();
  low.run.realm = 2;
  low.run.age = game.maxLife(low) - 1;
  setEvent(low, 's_meridian');
  assert.strictEqual(game.autoPick(low), null);
});

test('反噬结束：负寿元秘法恢复前，界面和自动机缘都按恢复后的寿元判致命', () => {
  const s = born();
  s.run.realm = 2;
  s.run.lifeFlat = 90;
  s.run.age = 148;
  s.run.skills = [{ id: 'arc_sw1_sw8', level: 1 }];
  s.run.aftermath = { id: 'backlash', remaining: 1 };
  assert.strictEqual(game.yearsLeft(s), 2);
  setEvent(s, 'i_dog');
  const view = game.eventView(s);
  assert.ok(view.options.every((option) => option.fatal));
  assert.strictEqual(view.fallback.fatal, true);
  assert.strictEqual(game.autoPick(s), null);
  const result = game.choose(s, 1, () => 0.99);
  assert.strictEqual(result.dead, true);
  assert.strictEqual(s.run.aftermath, null);
  assert.strictEqual(game.maxLife(s), 121);
  assert.strictEqual(s.run.death.cause, 'age');
});

test('数字与时长的显示', () => {
  assert.strictEqual(game.formatNumber(0), '0');
  assert.strictEqual(game.formatNumber(1.15), '1.1');
  assert.strictEqual(game.formatNumber(2.5), '2.5');
  assert.strictEqual(game.formatNumber(250), '250');
  assert.strictEqual(game.formatNumber(9999), '9999');
  assert.strictEqual(game.formatNumber(37500), '3.75万');
  assert.strictEqual(game.formatNumber(-3), '0');
  assert.strictEqual(game.formatDuration(59), '59 秒');
  assert.strictEqual(game.formatDuration(3 * 3600 + 120), '3 小时 2 分钟');
});
