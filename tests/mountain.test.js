const assert = require('node:assert/strict');
const test = require('node:test');
const game = require('../utils/game');

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
}

function found(state, rule = 'guard') {
  fund(state);
  act(state, 'cave', 'open');
  act(state, 'sect', rule, '', '听雪门');
}

test('开府与扩建使用同一份灵材和灵气，旧档和早期境界仍可继续修行', () => {
  assert.equal(game.mountainView(cultivator(KIN - 1), 'cave', ''), null);
  let state = cultivator(KIN);
  const old = JSON.parse(JSON.stringify(state));
  for (const key of ['cave', 'sect', 'materials', 'mountainChoices', 'mountainRevision']) delete old.run[key];
  state = game.normalizeState(old, NOW, rng);
  assert.equal(state.run.cave, null);
  assert.equal(game.mountainView(state, 'cave', '').options[0].note, '灵材不足');
  game.advance(state, NOW + 3600000);
  assert.equal(state.run.materials, 0);
  ordinary(state, 2);
  assert.equal(state.run.materials, 2);
  const quote = game.mountainView(state, 'cave', '');
  const oldQi = state.run.qi;
  act(state, 'cave', 'open');
  assert.equal(state.run.qi, oldQi - quote.options[0].qi);
  assert.equal(state.run.materials, 0);
  assert.equal(game.chooseMountain(state, 'cave', '', quote.stamp, 'array'), null);
  assert.equal(game.mountainView(state, 'sect', '').page, 'cave');

  fund(state);
  const base = game.qiRate(state);
  act(state, 'cave', 'array');
  act(state, 'cave', 'array');
  assert.equal(game.qiRate(state), base * 1.25);
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

test('突破改变设施价格后，过时的设施报价不能扣掉更多灵气', () => {
  const state = cultivator(KIN);
  fund(state);
  const view = game.mountainView(state, 'cave', '');
  game.advance(state, NOW + 3600000);
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
  assert.equal(state.run.chance, chances - 4);
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
  const result = act(state, 'world', 'w-claim-village-a');
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
