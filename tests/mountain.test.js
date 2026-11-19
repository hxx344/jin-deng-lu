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

function act(state, page, id, member = '', name = '') {
  const view = game.mountainView(state, page, member);
  assert.ok(view, 'missing mountain panel');
  const result = game.chooseMountain(state, page, member, view.stamp, id, name);
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

test('宗门扩建增加弟子与培养上限，巡山在两次普通机缘后按出发时的能力带回资源', () => {
  let state = cultivator(YUAN);
  state.run.marks.push('manager');
  found(state, 'aid');
  assert.equal(state.run.sect.disciples[0].id, 'clerk');
  act(state, 'sect', 'recruit-suo');
  assert.ok(!game.mountainView(state, 'sect', '').options.some((item) => item.id.startsWith('recruit-')));
  act(state, 'sect', 'rank');
  fund(state);
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
