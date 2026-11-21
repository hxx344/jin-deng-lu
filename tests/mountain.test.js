const assert = require('node:assert/strict');
const test = require('node:test');
const game = require('../utils/game');
const gear = require('../utils/gear');

const NOW = 1000;
const KIN = game.SEA_REALM;
const YUAN = KIN + 1;
const rng = () => 0;

function cultivator(realm) {
  const state = game.createState(NOW, rng);
  state.run.fate = '';
  assert.ok(game.chooseRoot(state, state.run.rootChoices[0], NOW, rng));
  state.run.realm = realm;
  state.run.lifeFlat = 400;
  // 山门用例隔离关隘：材料按凑齐算。
  game.GATES.forEach((gate) => { state.run.gate.mats[gate.id] = gate.need; });
  return state;
}

function reload(state) {
  return game.normalizeState(JSON.parse(JSON.stringify(state)), state.lastTime, rng);
}

function ordinary(state, count) {
  for (let i = 0; i < count; i++) {
    assert.ok(game.drawEvent(state, rng));
    assert.ok(game.choose(state, -1, rng));
  }
}

function act(state, page, id, member = '', name = '', roll = rng) {
  const view = game.mountainView(state, page, member);
  assert.ok(view, 'missing mountain panel');
  const result = game.chooseMountain(state, page, member, view.stamp, id, name, roll);
  assert.ok(result, 'expected action to succeed: ' + id);
  return result;
}

function fund(state, materials = 50) {
  state.run.qi = game.qiCap(state);
  state.run.materials = materials;
  state.run.stone = 50;
}

function found(state, rule = 'guard') {
  fund(state);
  act(state, 'cave', 'open');
  act(state, 'sect', rule, '', '听雪门');
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' != ' + expected);
}

test('宗门品阶和山外领地反哺修行，门规各有所长，失地会收回加成', () => {
  let state = cultivator(YUAN);
  const info = game.tribulationInfo(state);
  const item = { slot: 'weapon', grade: 0, tier: 1, level: 0, affixes: [] };
  while (gear.score(item) < info.gear.need) item.tier++;
  state.run.gear.worn.weapon = item;
  const req = info.req;
  state.run.stats = { edge: req, body: req, mind: req };
  const qi = game.qiRate(state);
  const interval = game.chanceInterval(state);
  const trib = game.tribulationInfo(state).chance;
  assert.equal(game.mountainView(state, 'sect', '').text.includes('修行反哺'), false);

  found(state);
  near(game.qiRate(state), qi * 1.08);
  near(game.chanceInterval(state), interval);
  near(game.tribulationInfo(state).chance, trib + 0.03);
  assert.match(game.mountainView(state, 'sect', '').text, /修行反哺：灵气 \+8%，渡劫 \+3%/);

  state.run.sect.rank = 3;
  world(state).event = null;
  Object.assign(world(state).sites, { village: 'own', mine: 'own', ferry: 'own' });
  near(game.qiRate(state), qi * 1.3);
  near(game.tribulationInfo(state).chance, trib + 0.12);
  assert.match(game.mountainView(state, 'world', '').text, /3 块领地/);
  world(state).sites.mine = 'foe';
  near(game.qiRate(state), qi * 1.28);
  near(game.tribulationInfo(state).chance, trib + 0.11);
  state = reload(state);
  assert.deepEqual(reload(state), state);

  const aid = cultivator(YUAN);
  const aidInterval = game.chanceInterval(aid);
  found(aid, 'aid');
  near(game.chanceInterval(aid), aidInterval / 1.05);
  const salvage = cultivator(YUAN);
  const salvageQi = game.qiRate(salvage);
  found(salvage, 'salvage');
  near(game.qiRate(salvage), salvageQi * 1.12);
});

test('开府与扩建使用筑石和灵气，旧档和早期境界仍可继续修行', () => {
  assert.equal(game.mountainView(cultivator(KIN - 1), 'cave', ''), null);
  let state = cultivator(KIN);
  const old = JSON.parse(JSON.stringify(state));
  for (const key of ['cave', 'sect', 'materials', 'mountainChoices', 'mountainRevision']) delete old.run[key];
  state = game.normalizeState(old, NOW, rng);
  assert.equal(state.run.cave, null);
  assert.equal(game.mountainView(state, 'cave', '').options[0].note, '筑石不足');
  game.advance(state, NOW + 3600000);
  assert.equal(state.run.materials, 0);
  ordinary(state, 2);
  assert.equal(state.run.materials, 2);
  // 开府只收筑石，灵材留给宗门
  assert.equal(game.mountainView(state, 'cave', '').options[0].note, '筑石不足');
  state.run.stone = 2;
  const quote = game.mountainView(state, 'cave', '');
  const oldQi = state.run.qi;
  const oldAge = state.run.age;
  act(state, 'cave', 'open');
  // 开府耗的寿元同时过时间，灵气按年岁回涨
  const gain = game.qiRate(state) * game.YEAR_SECONDS * (state.run.age - oldAge);
  assert.ok(state.run.age > oldAge);
  assert.ok(Math.abs(state.run.qi - (oldQi - quote.options[0].qi + gain)) < 1e-6);
  assert.equal(state.run.materials, 2);
  assert.equal(state.run.stone, 0);
  assert.equal(game.chooseMountain(state, 'cave', '', quote.stamp, 'array'), null);
  assert.equal(game.mountainView(state, 'sect', '').page, 'cave');

  fund(state);
  const base = game.qiRate(state);
  act(state, 'cave', 'array');
  act(state, 'cave', 'array');
  assert.equal(game.qiRate(state), base * 1.25);
  // 金丹的设施上限是 3 级
  assert.equal(game.mountainView(state, 'cave', '').options.find((item) => item.id === 'array').stone, 8);
  act(state, 'cave', 'array');
  assert.ok(Math.abs(game.qiRate(state) - base * 1.37) < 1e-9);
  assert.equal(game.mountainView(state, 'cave', '').options.some((item) => item.id === 'array'), false);
  fund(state, 10);
  act(state, 'cave', 'field');
  act(state, 'cave', 'field');
  const materials = state.run.materials;
  ordinary(state, 2);
  assert.equal(state.run.materials, materials + 4);
  state.big = 1;
  assert.ok(game.drawBig(state, rng));
  game.choose(state, -1, rng);
  assert.equal(state.run.materials, materials + 4);
  assert.deepEqual(reload(state), state);
});

test('洞府在筑基后期开放：之前没有入口也不产灵材，之后照常开府', () => {
  const state = cultivator(KIN - 1);
  state.run.stage = 1;
  assert.equal(game.mountainReady(state), false);
  assert.equal(game.mountainView(state, 'cave', ''), null);
  ordinary(state, 1);
  assert.equal(state.run.materials, 0);
  state.run.stage = 2;
  state.run.qi = 0;
  assert.equal(game.mountainReady(state), true);
  assert.deepEqual(game.mountainView(state, 'cave', '').tabs.map((tab) => tab.id), ['cave']);
  ordinary(state, 1);
  assert.equal(state.run.materials, 1);
  fund(state);
  act(state, 'cave', 'open');
  act(state, 'cave', 'array');
  assert.equal(state.run.cave.array, 1);
  assert.equal(state.run.stone, 50 - 2 - 3);
  assert.deepEqual(reload(state), state);
});

test('历练产筑石和玉露：寻常关 1 块筑石，首领关 3 块筑石加 1 滴玉露，储物袋的装备各带 1 块，旧档按关数补发', () => {
  const state = cultivator(1);
  for (let stage = 1; stage <= 4; stage++) {
    const r = game.trainClear(state, stage, rng);
    assert.equal(r.stone, 1);
    assert.equal(r.dew, 0);
  }
  const boss = game.trainClear(state, 5, rng);
  assert.equal(boss.stone, 3);
  assert.equal(boss.dew, 1);
  assert.equal(state.run.stone, 7);
  assert.equal(state.run.dew, 1);
  assert.match(state.run.log[state.run.log.length - 1].text, /筑石 3 块、玉露 1 滴/);

  game.advance(state, state.lastTime + 2400 * 1000);
  const collected = game.trainCollect(state, rng);
  assert.equal(collected.drops.length, 2);
  assert.ok(collected.lines.includes('筑石 2 块'));
  assert.equal(state.run.stone, 9);
  assert.deepEqual(reload(state), state);

  // 败退后重打的关不再给筑石
  assert.ok(game.trainLose(state, 6));
  assert.equal(game.trainClear(state, 4, rng).again, true);
  assert.equal(game.trainClear(state, 5, rng).again, true);
  assert.equal(state.run.stone, 9);
  assert.equal(state.run.dew, 1);

  state.run.stone = 98;
  assert.equal(game.trainClear(state, 6, rng).stone, 1);
  assert.equal(game.trainClear(state, 7, rng).stone, 0);
  assert.equal(state.run.stone, 99);

  const old = JSON.parse(JSON.stringify(state));
  delete old.run.stone;
  delete old.run.dew;
  old.run.battle.cleared = 12;
  const loaded = game.normalizeState(old, state.lastTime, rng);
  assert.equal(loaded.run.stone, 10 + 2 * 3);
  assert.equal(loaded.run.dew, 2);
});

test('仙树：玉露浇灌后过两次普通机缘结果，仙果加寿元上限，扩建后加得更多，魔修吃了没用', () => {
  const state = cultivator(KIN - 1);
  state.run.stage = 2;
  fund(state);
  act(state, 'cave', 'open');
  const ids = () => game.mountainView(state, 'cave', '').options.map((item) => item.id);
  assert.equal(ids().includes('water'), false);
  act(state, 'cave', 'tree');
  assert.equal(game.mountainView(state, 'cave', '').options.find((item) => item.id === 'water').note, '玉露不足');
  state.run.dew = 5;
  const age = state.run.age;
  act(state, 'cave', 'water');
  assert.equal(state.run.dew, 3);
  assert.equal(state.run.age, age);
  // 果子挂在树上时不能再浇
  assert.equal(ids().includes('water'), false);
  assert.equal(ids().includes('eat'), false);
  assert.deepEqual(reload(state), state);
  ordinary(state, 1);
  assert.equal(state.run.cave.fruit, 0);
  ordinary(state, 1);
  assert.equal(state.run.cave.fruit, 1);
  assert.equal(state.run.cave.ripe, 0);

  let life = game.maxLife(state);
  const eaten = act(state, 'cave', 'eat');
  assert.ok(eaten.lines.includes('寿元上限 +8 年'));
  assert.equal(game.maxLife(state), life + 8);
  assert.equal(state.run.cave.fruit, 0);
  assert.equal(ids().includes('eat'), false);

  fund(state);
  act(state, 'cave', 'tree');
  act(state, 'cave', 'water');
  ordinary(state, 2);
  life = game.maxLife(state);
  act(state, 'cave', 'eat');
  assert.equal(game.maxLife(state), life + 12);
  assert.equal(state.run.dew, 1);
  assert.equal(game.mountainView(state, 'cave', '').options.find((item) => item.id === 'water').disabled, true);

  state.run.cave.fruit = 1;
  state.run.mode = 'demon';
  const eat = game.mountainView(state, 'cave', '').options.find((item) => item.id === 'eat');
  assert.equal(eat.disabled, true);
  assert.equal(game.chooseMountain(state, 'cave', '', game.mountainView(state, 'cave', '').stamp, 'eat', ''), null);
  assert.equal(state.run.cave.fruit, 1);
});

test('设施等级上限随大境界开放：筑基 2 级，每破一个大境界多一级，至多 8 级，越往上越贵越强', () => {
  const state = cultivator(KIN - 1);
  state.run.stage = 2;
  fund(state);
  act(state, 'cave', 'open');
  const option = (id) => game.mountainView(state, 'cave', '').options.find((item) => item.id === id);
  const build = (id) => { fund(state); state.run.stone = 99; act(state, 'cave', id); };
  ['array', 'field', 'library', 'tree'].forEach((id) => { build(id); build(id); });
  ['array', 'field', 'library', 'tree'].forEach((id) => assert.equal(option(id), undefined));
  assert.match(game.mountainView(state, 'cave', '').text, /最高 2 级.*破境后可以再扩建/);

  state.run.realm = KIN;
  state.run.stage = 0;
  assert.equal(option('tree').stone, 8);
  assert.equal(option('tree').desc, '升到第 3 级：每颗仙果寿元上限 +16 年');
  assert.equal(option('field').desc, '升到第 3 级：每累计两次普通机缘多得 3 灵材；定神丹少耗 9 次机缘');
  build('field');
  assert.equal(option('field'), undefined);
  // 三级灵田：两次普通机缘共多得 3 灵材
  state.run.materials = 0;
  ordinary(state, 2);
  assert.equal(state.run.materials, 2 + 3);
  build('tree');
  state.run.dew = 2;
  act(state, 'cave', 'water');
  ordinary(state, 2);
  const life = game.maxLife(state);
  act(state, 'cave', 'eat');
  assert.equal(game.maxLife(state), life + 16);

  state.run.realm = YUAN;
  assert.equal(option('array').stone, 8);
  build('array');
  assert.equal(option('array').stone, 11);
  build('array');
  assert.equal(option('array'), undefined);
  assert.equal(state.run.cave.array, 4);

  state.run.realm = game.REALMS.length - 1;
  for (let level = 5; level <= 8; level++) build('array');
  assert.equal(option('array'), undefined);
  assert.doesNotMatch(game.mountainView(state, 'cave', '').text, /多开一级/);
  const loaded = reload(state);
  assert.equal(loaded.run.cave.array, 8);
  assert.deepEqual(loaded, state);
  const broken = JSON.parse(JSON.stringify(state));
  broken.run.cave.array = 40;
  assert.equal(game.normalizeState(broken, state.lastTime, rng).run.cave.array, 8);
});

test('突破改变设施价格后，过时的设施报价不能扣掉更多灵气', () => {
  const state = cultivator(KIN);
  fund(state);
  const view = game.mountainView(state, 'cave', '');
  game.passTime(state, 3600);
  const qi = state.run.qi;
  assert.equal(game.chooseMountain(state, 'cave', '', view.stamp, 'open'), null);
  assert.equal(state.run.qi, qi);
  assert.equal(state.run.cave, null);
});

test('设施折抵问名关的机缘，探索途中不能操作山门', () => {
  const state = cultivator(KIN);
  state.run.stage = 2;
  fund(state);
  act(state, 'cave', 'open');
  act(state, 'cave', 'field');
  fund(state);
  act(state, 'cave', 'field');
  fund(state);
  state.run.skills = [{ id: 'pi1', level: 1 }, { id: 'pi4', level: 1 }];
  assert.ok(game.chooseSea(state, 'sect', 0));
  assert.equal(game.mountainReady(state), false);
  assert.ok(game.retreatSea(state));
  assert.ok(game.attemptYuanTrial(state, rng, 'edge', 1).success);
  const pill = game.yuanTrialView(state).options.find((option) => option.id === 'pill');
  assert.equal(pill.chances, 4);
  const chances = state.run.chance;
  assert.ok(game.attemptYuanTrial(state, rng, 'pill', 2).advanced);
  assert.equal(state.run.chance, chances - 4 + Math.floor(game.maxChance(state) * game.TRIB_CHANCE_SHARE));
  assert.equal(game.mountainView(state, 'sect', '').canName, true);
});

test('宗门升阶增加弟子与培养上限，巡山在两次普通机缘后按出发时的能力带回资源', () => {
  let state = cultivator(YUAN);
  state.run.marks.push('manager');
  found(state, 'aid');
  assert.equal(state.run.sect.disciples[0].id, 'clerk');
  act(state, 'sect', 'recruit-suo');
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id.startsWith('recruit-')));
  Object.assign(state.run.sect.world, { event: null, next: 0, renown: 6, members: 12, stock: 14 });
  state.run.sect.world.sites.village = 'own';
  ordinary(state, 1);
  fund(state);
  act(state, 'world', 'w-ascend-a');
  assert.equal(state.run.sect.rank, 2);
  act(state, 'sect', 'recruit-li');
  act(state, 'sect', 'train', 'suo');
  state.run.skills.push({ id: 'lu1', level: 4 });
  act(state, 'sect', 'teach-lu1', 'suo');
  assert.equal(state.run.sect.disciples[1].book.level, 2);
  act(state, 'sect', 'patrol', 'suo');
  const expected = state.run.sect.patrol.haul;
  assert.equal(expected, 6);
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id.endsWith('-suo')));
  const elapsed = game.advance(state, NOW + 3600000);
  assert.ok(elapsed.elapsed);
  assert.equal(state.run.sect.patrol.haul, expected);
  ordinary(state, 1);
  state = reload(state);
  assert.equal(state.run.sect.patrol.haul, expected);
  const materials = state.run.materials;
  const age = state.run.age;
  ordinary(state, 1);
  assert.equal(state.run.sect.patrol, null);
  assert.equal(state.run.materials, materials + expected + 1);
  assert.equal(state.run.age, age + 1);
});

test('寒潮按门规、弟子修为和所学结算，双线达标且两次机缘后解锁尾声', () => {
  let state = cultivator(YUAN);
  found(state);
  act(state, 'sect', 'recruit-ya');
  act(state, 'sect', 'train', 'li');
  act(state, 'sect', 'train', 'ya');
  state.run.skills.push({ id: 'sw1', level: 1 }, { id: 'pi2', level: 1 });
  fund(state);
  act(state, 'sect', 'teach-sw1', 'li');
  act(state, 'sect', 'teach-pi2', 'ya');
  act(state, 'sect', 'ward-li');
  assert.equal(state.run.sect.quest.ward, 5);
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id === 'shelter-li'));
  state = reload(state);
  act(state, 'sect', 'shelter-ya');
  const oldMaterials = state.run.materials;
  // 存满后不再随年岁攒，只看奖励的 8 次
  state.run.chance = game.maxChance(state);
  const chances = state.run.chance;
  act(state, 'sect', 'master-shelter');
  assert.equal(state.run.sect.quest.outcome, 'both');
  assert.equal(state.run.materials, oldMaterials + 4);
  assert.equal(state.run.chance, chances + 8);
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id === 'open-hall'));
  ordinary(state, 2);
  state.run.demon = 14;
  act(state, 'sect', 'open-hall');
  assert.equal(state.run.demon, 6);
  assert.equal(state.run.sect.quest.after, 'open');
  assert.equal(state.run.log.at(-1).title, '寒潮退去');
  assert.deepEqual(reload(state), state);
});

test('安排三次亲自修阵仍可能失守，结局传到下一世且可选择不取功法', () => {
  let state = cultivator(YUAN);
  found(state);
  for (let i = 0; i < 3; i++) act(state, 'sect', 'master-ward');
  assert.equal(state.run.sect.quest.outcome, 'lost');
  ordinary(state, 2);
  act(state, 'sect', 'seal-hall');
  assert.ok(game.retire(state));
  state = reload(state);
  assert.equal(state.mountainLegacy.outcome, 'lost');
  assert.equal(state.mountainLegacy.after, 'seal');
  assert.ok(game.reincarnate(state, NOW, rng));
  assert.ok(game.chooseRoot(state, state.run.rootChoices[0], NOW, rng));
  assert.equal(game.mountainView(state, 'return', ''), null);
  state.run.realm = KIN;
  assert.match(game.mountainView(state, 'return', '').text, /旧匾.*那封/);
  act(state, 'return', 'visit');
  assert.equal(state.run.materials, 4);
  assert.equal(state.mountainLegacy, null);
  assert.equal(game.mountainView(state, 'return', '').page, 'cave');
  assert.equal(state.run.cave, null);
  assert.equal(state.run.sect, null);
});

test('两级藏经室可保管秘法，回山按现有槽位规则取舍，待替换的秘法读档后仍有效', () => {
  let state = cultivator(YUAN);
  found(state);
  state.run.skills.push({ id: 'sw1', level: 4 }, { id: 'sw2', level: 4 });
  assert.ok(game.mergeSkills(state, 'sw1', 'sw2', rng));
  const secret = state.run.skills[0].id;
  assert.ok(!game.mountainView(state, 'sect', 'li').options.some((item) => item.id === 'teach-' + secret));
  fund(state);
  act(state, 'cave', 'library');
  act(state, 'cave', 'library');
  act(state, 'sect', 'teach-' + secret, 'li');
  act(state, 'sect', 'heir', 'li');
  assert.ok(game.retire(state));
  assert.ok(game.reincarnate(state, NOW, rng));
  state = reload(state);
  assert.ok(game.chooseRoot(state, state.run.rootChoices[0], NOW, rng));
  state.run.realm = KIN;
  state.run.lifeFlat = 200;
  state.run.skills = game.SKILLS.slice(0, game.maxSkills(state)).map((skill) => ({ id: skill.id, level: 4 }));
  assert.match(game.mountainView(state, 'return', '').title, /听雪门/);
  act(state, 'return', 'inherit');
  state = reload(state);
  assert.deepEqual(state.run.pending, { id: secret, level: 1 });
  assert.equal(state.mountainLegacy, null);
  assert.ok(game.resolveReplace(state, 2));
  assert.ok(state.run.skills.some((skill) => skill.id === secret));
  assert.equal(game.mergeSkills(state, 'sw1', 'sw2', rng), null);
});

test('回山取回普通功法时保留传授品阶，且不会凭空升品或绕过重复领取校验', () => {
  const state = cultivator(YUAN);
  found(state);
  act(state, 'cave', 'library');
  state.run.skills.push({ id: 'pi4', level: 3 });
  act(state, 'sect', 'teach-pi4', 'li');
  act(state, 'sect', 'heir', 'li');
  assert.ok(game.retire(state));
  assert.ok(game.reincarnate(state, NOW, rng));
  assert.ok(game.chooseRoot(state, state.run.rootChoices[0], NOW, rng));
  state.run.realm = KIN;
  state.run.skills.push({ id: 'pi4', level: 2 });
  const returnView = game.mountainView(state, 'return', '');
  act(state, 'return', 'inherit');
  assert.equal(state.run.skills[0].level, 3);
  assert.equal(game.chooseMountain(state, 'return', '', returnView.stamp, 'inherit'), null);
});

function world(state) {
  return state.run.sect.world;
}

function worldOption(state, id) {
  return game.mountainView(state, 'world', '').options.find((item) => item.id === id);
}

test('立宗后山外先送来一件大事，门人、库藏和小事随普通机缘自行变化', () => {
  let state = cultivator(YUAN);
  found(state);
  const first = game.mountainView(state, 'world', '');
  assert.equal(first.story.title, '盐滩村求庇护');
  assert.deepEqual(first.options.map((item) => item.id), ['w-claim-village-a', 'w-claim-village-b', 'w-claim-village-c', 'donate']);
  assert.equal(first.goals.ready, false);
  const claimQi = game.qiRate(state);
  const result = act(state, 'world', 'w-claim-village-a');
  near(game.qiRate(state), claimQi * 1.1 / 1.08);
  assert.equal(result.title, '盐滩村求庇护');
  assert.deepEqual([world(state).sites.village, world(state).renown, world(state).stock, world(state).event], ['own', 2, 1, null]);
  assert.match(game.mountainView(state, 'world', '').story.text, /再完成 2 次/);

  ordinary(state, 1);
  assert.deepEqual([world(state).members, world(state).stock], [5, 4]);
  ordinary(state, 1);
  assert.deepEqual([world(state).members, world(state).stock], [7, 5]);
  assert.deepEqual(world(state).event, { id: 'claim', site: 'mine', power: 0 });
  assert.match(state.run.log.at(-1).text, /山外有事：无主的矿道/);
  assert.equal(world(state).log.length, 2);
  assert.match(game.mountainView(state, 'world', '').chronicle[0].text, /盐滩村送来新晒的盐.*库藏 \+2/);

  const materials = state.run.materials;
  ordinary(state, 2);
  assert.equal(world(state).turn, 4);
  assert.equal(state.run.materials, materials + 2 + 2);
  act(state, 'world', 'donate');
  assert.equal(state.run.materials, materials + 1);
  state = reload(state);
  assert.deepEqual(reload(state), state);
  assert.equal(game.chooseMountain(state, 'world', '', first.stamp, 'w-claim-village-a', '', rng), null);
});

test('库藏见底时门人不再增加，大事的库藏花费不足时不能选', () => {
  const state = cultivator(YUAN);
  found(state);
  world(state).stock = 0;
  assert.equal(worldOption(state, 'w-claim-village-a').note, '库藏不足');
  assert.equal(game.chooseMountain(state, 'world', '', game.mountainView(state, 'world', '').stamp, 'w-claim-village-a', '', rng), null);
  act(state, 'world', 'w-claim-village-b');
  assert.deepEqual([world(state).stock, world(state).renown, world(state).sites.village], [3, 0, '']);
  world(state).stock = 0;
  world(state).members = 9;
  const quiet = () => 0.99;
  assert.ok(game.drawEvent(state, quiet));
  assert.ok(game.choose(state, -1, quiet));
  assert.deepEqual([world(state).members, world(state).stock], [9, 1]);
});

test('战役按宗门战力和门规结算，守不住会丢领地，拿下啃骨坛后食仙教退出骸山', () => {
  let state = cultivator(YUAN);
  found(state);
  Object.assign(world(state), { event: null, next: 0 });
  world(state).foe.heat = 8;
  world(state).sites.village = 'own';
  ordinary(state, 1);
  assert.deepEqual(world(state).event, { id: 'raid', site: 'village', power: 8 });
  const troop = worldOption(state, 'w-raid-village-a');
  const master = worldOption(state, 'w-raid-village-b');
  assert.match(troop.desc, /宗门战力 7 对食仙教 8，胜算 45%/);
  assert.match(master.desc, /宗门战力 9（含你 \+2）/);
  act(state, 'world', 'w-raid-village-a', '', '', () => 0.99);
  assert.deepEqual([world(state).sites.village, world(state).foe.heat, world(state).wins, world(state).event], ['foe', 0, 0, null]);

  world(state).event = { id: 'strike', site: 'village', power: 5 };
  state = reload(state);
  assert.match(worldOption(state, 'w-strike-village-a').desc, /胜：占下盐滩村，声望 \+3；败：声望 -1，门人 -2/);
  act(state, 'world', 'w-strike-village-b');
  assert.deepEqual([world(state).sites.village, world(state).wins, world(state).renown], ['own', 1, 3]);

  state.run.sect.rank = 3;
  Object.assign(world(state).sites, { pass: 'own', mine: 'foe' });
  world(state).event = { id: 'strike', site: 'altar', power: 10 };
  const result = act(state, 'world', 'w-strike-altar-b');
  assert.match(result.lines.join(''), /食仙教分坛退出骸山/);
  assert.deepEqual([world(state).sites.altar, world(state).sites.mine, world(state).renown], ['own', '', 9]);
  assert.equal(game.mountainView(state, 'world', '').stats.find((item) => item.label === '食仙教').value, '已退出骸山');
  world(state).foe.heat = 50;
  ordinary(state, 3);
  assert.notEqual(world(state).event && world(state).event.id, 'raid');
  world(state).foe.heat = 0;
  assert.deepEqual(reload(state), state);
});

test('食仙教会自己占走无主之地，正在商议的那块地随之作废', () => {
  const state = cultivator(YUAN);
  found(state);
  world(state).event = { id: 'claim', site: 'mine', power: 0 };
  world(state).turn = 11;
  ordinary(state, 1);
  assert.equal(world(state).sites.mine, 'foe');
  assert.equal(world(state).event, null);
  assert.ok(world(state).log.some((line) => line.includes('食仙教占了肋骨矿道')));
  assert.match(state.run.log.at(-1).text, /山外来报/);
  ordinary(state, 1);
  assert.ok(world(state).event);
});

test('升阶条件齐备后由大事完成，品阶和领地决定可收的弟子，并传到下一世', () => {
  let state = cultivator(YUAN);
  found(state, 'salvage');
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id === 'rank' || item.id === 'recruit-gou'));
  Object.assign(world(state), { event: null, next: 0, renown: 18, members: 30, wins: 1, stock: 30 });
  Object.assign(world(state).sites, { village: 'own', mine: 'own', ferry: 'own' });
  assert.ok(game.mountainView(state, 'sect', '').options.some((item) => item.id === 'recruit-gou'));
  for (const rank of [2, 3]) {
    ordinary(state, 1);
    assert.equal(world(state).event.id, 'ascend');
    fund(state);
    state.run.demon = 9;
    act(state, 'world', 'w-ascend-a');
    assert.equal(state.run.sect.rank, rank);
    near(game.tribulationInfo(state).parts.find((part) => part.label === '宗门护阵').value, rank * 0.02 + 0.03);
    assert.equal(state.run.demon, 4);
    ordinary(state, 1);
  }
  assert.match(game.mountainView(state, 'world', '').title, /听雪门 · 宗门/);
  assert.equal(game.mountainView(state, 'world', '').goals.items.length, 4);
  fund(state);
  for (const id of ['gou', 'qiao', 'li']) act(state, 'sect', 'recruit-' + id);
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id.startsWith('recruit-')));
  for (let i = 0; i < 3; i++) act(state, 'sect', 'train', 'gou');
  assert.equal(state.run.sect.disciples[1].level, 4);
  assert.ok(!game.mountainView(state, 'sect', 'gou').options.some((item) => item.id === 'train'));
  assert.equal(game.mountainView(state, 'sect', 'qiao').options.find((item) => item.id === 'patrol').haul, 2 + 1 + 1 + 1 + 2);
  state = reload(state);
  assert.equal(state.run.sect.disciples.length, 4);

  assert.ok(game.retire(state));
  assert.ok(game.reincarnate(state, NOW, rng));
  state = reload(state);
  assert.ok(game.chooseRoot(state, state.run.rootChoices[0], NOW, rng));
  state.run.realm = KIN;
  assert.match(game.mountainView(state, 'return', '').text, /整一整衣襟/);
  act(state, 'return', 'visit');
  assert.equal(state.run.materials, 8);
});

test('升阶可以暂缓，没有山外数据或数据损坏的旧档会被修正', () => {
  let state = cultivator(YUAN);
  found(state);
  Object.assign(world(state), { event: null, next: 0, renown: 6, members: 12 });
  world(state).sites.village = 'own';
  ordinary(state, 1);
  act(state, 'world', 'w-ascend-b');
  assert.equal(state.run.sect.rank, 1);
  ordinary(state, 2);
  assert.notEqual(world(state).event.id, 'ascend');

  const old = JSON.parse(JSON.stringify(state));
  delete old.run.sect.world;
  state = game.normalizeState(old, NOW, rng);
  assert.deepEqual(world(state).event, { id: 'claim', site: 'village', power: 0 });
  assert.equal(world(state).members, 3);

  const broken = JSON.parse(JSON.stringify(state));
  broken.run.sect.rank = 9;
  broken.run.sect.world = {
    turn: -5, renown: 1e9, members: 'q', stock: 1e9, wins: null, next: 1e9, hold: 1e9,
    sites: { altar: 'own', pass: 'foe', market: 'x', village: 'guild' }, foe: { power: 'a', heat: 999 },
    event: { id: 'raid', site: 'pass', power: 1e9 }, last: 'nope', log: [1, 'x', '']
  };
  state = game.normalizeState(broken, NOW, rng);
  assert.equal(state.run.sect.rank, 4);
  assert.deepEqual(world(state), {
    turn: 0, renown: 99, wins: 0, members: 0, stock: 60,
    sites: { village: '', mine: '', ferry: '', market: 'guild', pass: '', altar: 'own' },
    foe: { power: 4, heat: 0 }, event: null, next: 2, hold: 9, last: '', log: ['x']
  });
  assert.ok(game.mountainView(state, 'world', ''));
  assert.deepEqual(reload(state), state);
});

test('藏经阁功法不能传给弟子，带着它也能照常授业', () => {
  const state = cultivator(YUAN);
  found(state);
  state.tomes.tm_sw1 = 5;
  state.run.skills = [{ id: 'tm_sw1', level: 5 }, { id: 'sw1', level: 2 }];
  const member = state.run.sect.disciples[0].id;
  const ids = game.mountainView(state, 'sect', member).options.map((item) => item.id);
  assert.ok(ids.includes('teach-sw1'));
  assert.equal(ids.includes('teach-tm_sw1'), false);
  assert.deepEqual(reload(state), state);
});

test('亲手传过功法的弟子修为越过师父就青出于蓝，来世回山成了宗主并回赠', () => {
  let state = cultivator(YUAN);
  found(state);
  state.run.sect.rank = 3;
  // 没传功法的弟子练得再高也不算。
  fund(state);
  for (let i = 0; i < 3; i++) act(state, 'sect', 'train', 'li');
  assert.equal(state.run.sect.disciples[0].level, 4);
  assert.ok(!state.run.sect.disciples[0].surpassed);
  state.run.skills.push({ id: 'pi4', level: 2 });
  fund(state);
  const taught = act(state, 'sect', 'teach-pi4', 'li');
  assert.ok(state.run.sect.disciples[0].surpassed);
  assert.match(taught.text, /阿砺/);
  assert.equal(taught.spot.title, '青出于蓝');
  assert.ok(taught.lines.some((line) => /青出于蓝/.test(line)));
  assert.ok(state.run.highlights.some((h) => /青出于蓝/.test(h.text)));
  // 只触发一次，读档后仍记得。
  state = reload(state);
  assert.ok(state.run.sect.disciples[0].surpassed);
  assert.ok(game.retire(state));
  state = reload(state);
  assert.equal(state.mountainLegacy.master, 'li');
  assert.ok(game.reincarnate(state, NOW, rng));
  assert.ok(game.chooseRoot(state, state.run.rootChoices[0], NOW, rng));
  state.run.realm = KIN;
  const view = game.mountainView(state, 'return', '');
  assert.match(view.title, /宗主阿砺/);
  const chance = state.run.chance;
  const lifeFlat = state.run.lifeFlat;
  const gift = act(state, 'return', 'visit');
  assert.match(gift.text, /师父回来了/);
  // 第三阶山门的故人礼是 8 灵材，宗主翻倍。
  assert.equal(state.run.materials, 16);
  assert.ok(state.run.chance > chance);
  assert.equal(state.run.lifeFlat, lifeFlat + 12);
});
