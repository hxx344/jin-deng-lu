const assert = require('node:assert');
const test = require('node:test');
const battle = require('../utils/battle');
const game = require('../utils/game');

function seq(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

// 先返回给定的随机数，用完后一直返回 0.5。
function half(values) {
  const next = seq(values);
  let used = 0;
  return () => (used++ < values.length ? next() : 0.5);
}

function player(attrs, schools, extra) {
  return battle.playerFighter(Object.assign({ attrs: attrs, softCap: 72, demon: 0, schools: schools || {} }, extra));
}

const dummy = (over) => Object.assign({ name: '木桩', hp: 300, atk: 10, interval: 2, reduce: 0, crit: 0, resist: 0, taken: 1, schools: {} }, over);
const kinds = (fight, kind) => fight.timeline.filter((entry) => entry.kind === kind);

// 引气的修士：锋躯神各给定值，其余清零。
function cultivator(edge, body, mind) {
  const s = game.createState(0, () => 0);
  s.run.fate = '';
  assert.ok(game.chooseRoot(s, 'talisman', 0, () => 0));
  s.run.realm = 1;
  s.run.stats = { edge: edge, body: body, mind: mind };
  return s;
}

test('战斗属性由锋躯神换算，心魔同时抬高攻击和受到的伤害', () => {
  const me = player({ edge: 10, body: 18, mind: 36 });
  assert.strictEqual(me.atk, 20);
  assert.strictEqual(me.hp, 60 + 18 * 12);
  assert.strictEqual(me.reduce, 18 / 90);
  assert.ok(Math.abs(me.interval - 1.6 * 0.9) < 1e-9);
  assert.ok(Math.abs(me.crit - 0.15) < 1e-9);
  const fast = player({ edge: 0, body: -5, mind: 720 });
  assert.strictEqual(fast.interval, 1);
  assert.strictEqual(fast.crit, 0.5);
  assert.strictEqual(fast.atk, 1);
  assert.strictEqual(fast.hp, 60);
  const mad = player({ edge: 10, body: 0, mind: 0 }, {}, { demon: 45, demonMode: true });
  assert.ok(Math.abs(mad.atk - 20 * 1.32) < 1e-9);
  assert.ok(Math.abs(mad.taken - 1.32) < 1e-9);
});

test('同一个随机序列算出同一场战斗，时间轴里的气血与结果对得上', () => {
  const me = player({ edge: 14, body: 12, mind: 14 }, { sword: { count: 2, power: 3 }, luck: { count: 1, power: 1 } });
  const foe = battle.foeFighter(game.TRAIN_STAGES[2], 1);
  const a = battle.simulate(me, foe, battle.seeded(7));
  const b = battle.simulate(me, foe, battle.seeded(7));
  assert.deepStrictEqual(a, b);
  const last = a.timeline[a.timeline.length - 1];
  assert.strictEqual(last.kind, 'end');
  assert.strictEqual(last.t, a.seconds);
  assert.strictEqual(last.me, a.me.hp);
  assert.strictEqual(last.foe, a.foe.hp);
  assert.strictEqual(a.win, a.foe.hp === 0);
  for (let i = 1; i < a.timeline.length; i++) assert.ok(a.timeline[i].t >= a.timeline[i - 1].t);
});

test('久战不下算败，重天的倍率同时放大敌人的气血和攻击', () => {
  const fight = battle.simulate(player({ edge: 1, body: 500, mind: 0 }), dummy({ hp: 100000, atk: 1 }), () => 0.5);
  assert.strictEqual(fight.win, false);
  assert.strictEqual(fight.timeout, true);
  assert.strictEqual(fight.seconds, battle.MAX_SECONDS);
  const foe = battle.foeFighter(game.TRAIN_STAGES[0], 1.5);
  assert.strictEqual(foe.hp, Math.round(game.TRAIN_STAGES[0].hp * 1.5));
  assert.strictEqual(foe.atk, game.TRAIN_STAGES[0].atk * 1.5);
});

test('剑系每三次出手追一剑，两门必暴击，四门斩杀残血', () => {
  const plain = battle.simulate(player({ edge: 10, body: 20, mind: 0 }, { sword: { count: 1, power: 2 } }), dummy(), () => 0.5);
  const hits = plain.timeline.filter((entry) => entry.who === 'me' && ['hit', 'crit', 'double'].indexOf(entry.kind) >= 0).length;
  assert.strictEqual(kinds(plain, 'extra').length, Math.floor(hits / 3));
  // 追加一剑的倍率是 0.3 + 0.1 × 2 = 0.5，随机数取中时正好是攻击的一半。
  assert.strictEqual(kinds(plain, 'extra')[0].value, 10);
  const bonded = battle.simulate(player({ edge: 10, body: 20, mind: 0 }, { sword: { count: 2, power: 2 } }), dummy(), () => 0.5);
  assert.strictEqual(kinds(bonded, 'extra')[0].value, 15);
  const execute = battle.simulate(player({ edge: 10, body: 20, mind: 0 }, { sword: { count: 4, power: 4 } }), dummy(), () => 0.5);
  assert.strictEqual(kinds(execute, 'execute').length, 1);
  assert.ok(execute.seconds < bonded.seconds);
});

test('丹系按时回血，四门能站起来一次；体系有护盾和反伤', () => {
  const foe = dummy({ hp: 2000, atk: 40, interval: 1 });
  const bare = battle.simulate(player({ edge: 5, body: 10, mind: 0 }), foe, () => 0.5);
  const pill = battle.simulate(player({ edge: 5, body: 10, mind: 0 }, { pill: { count: 4, power: 4 } }), foe, () => 0.5);
  assert.strictEqual(kinds(bare, 'heal').length, 0);
  assert.ok(kinds(pill, 'heal').length > 0);
  assert.strictEqual(kinds(pill, 'revive').length, 1);
  assert.ok(pill.seconds > bare.seconds);
  const body = battle.simulate(player({ edge: 5, body: 10, mind: 0 }, { body: { count: 2, power: 2 } }), foe, () => 0.5);
  assert.strictEqual(body.timeline[0].kind, 'shield');
  assert.strictEqual(body.timeline[0].value, Math.round(180 * 0.2));
  assert.ok(kinds(body, 'thorns').length > 0);
  assert.ok(body.seconds > bare.seconds);
});

test('符系开场贴一张符：封招期间敌人的招式放不出来，也可能被抗掉', () => {
  const foe = dummy({ hp: 5000, skill: { name: '重击', every: 3, mult: 3 } });
  const me = player({ edge: 5, body: 40, mind: 0 }, { talisman: { count: 1, power: 2 } });
  // 第一个随机数过抗性，第二个取到第三种异常「封招」，持续 4 + 2 = 6 秒。
  const sealed = battle.simulate(me, foe, half([0, 0.99]));
  assert.strictEqual(sealed.timeline[0].kind, 'curse');
  const early = sealed.timeline.filter((entry) => entry.t < 6 && (entry.kind === 'skill' || entry.kind === 'sealed'));
  assert.deepStrictEqual(early.map((entry) => entry.kind), ['sealed']);
  assert.ok(kinds(sealed, 'skill').length > 0);
  const resisted = battle.simulate(me, dummy({ resist: 1 }), () => 0.5);
  assert.strictEqual(resisted.timeline[0].kind, 'resist');
});

test('历练：引气后开放，按关卡顺序打，开打即付机缘和寿元并计入劫期', () => {
  const mortal = game.createState(0, () => 0);
  game.chooseRoot(mortal, 'talisman', 0, () => 0);
  assert.strictEqual(game.trainView(mortal).open, false);
  assert.ok(game.trainReason(mortal, 0));
  assert.strictEqual(game.trainStart(mortal, 0, () => 0.5), null);

  const s = cultivator(30, 30, 30);
  const view = game.trainView(s);
  assert.strictEqual(view.open, true);
  assert.strictEqual(view.stages.length, 1);
  assert.strictEqual(view.stages[0].reason, '');
  assert.strictEqual(view.stages[0].chance, 1);
  assert.strictEqual(game.trainReason(s, 1), '前一关还没过');
  const chance = s.run.chance;
  const age = s.run.age;
  const used = s.run.realmChoices;
  const fight = game.trainStart(s, 0, () => 0.5);
  assert.strictEqual(fight.win, true);
  assert.ok(fight.timeline.length > 1);
  assert.strictEqual(s.run.age, age + 1);
  assert.strictEqual(s.run.realmChoices, used + 1);
  assert.ok(s.run.chance < chance);
  // 这一场没结算前，别的事都先放着。
  assert.strictEqual(game.canDraw(s), false);
  assert.strictEqual(game.canDrawBig(s), false);
  assert.strictEqual(game.trainStart(s, 0, () => 0.5), null);
  const qi = s.run.qi;
  const r = game.trainFinish(s, false);
  assert.strictEqual(r.win, true);
  assert.ok(s.run.qi > qi);
  assert.strictEqual(s.run.battle.cleared, 1);
  assert.strictEqual(s.trainBest, 1);
  assert.strictEqual(game.trainFinish(s, false), null);
  assert.strictEqual(game.canDraw(s), true);
  assert.strictEqual(s.run.log[s.run.log.length - 1].title, '历练');
  const next = game.trainView(s);
  assert.deepStrictEqual(next.stages.map((stage) => stage.cleared), [true, false]);
  assert.ok(next.stages[0].qi < view.stages[0].qi);
});

test('历练：败了折寿 2 年，中途撤走按败算但只折 1 年，都不算过关', () => {
  const lost = cultivator(1, 1, 1);
  let left = game.yearsLeft(lost);
  assert.strictEqual(game.trainStart(lost, 0, () => 0.5).win, false);
  let r = game.trainFinish(lost, false);
  assert.strictEqual(r.win, false);
  assert.strictEqual(game.yearsLeft(lost), left - 1 - 2);
  assert.strictEqual(lost.run.battle.cleared, 0);

  const fled = cultivator(30, 30, 30);
  left = game.yearsLeft(fled);
  assert.strictEqual(game.trainStart(fled, 0, () => 0.5).win, true);
  r = game.trainFinish(fled, true);
  assert.strictEqual(r.win, false);
  assert.strictEqual(r.retreat, true);
  assert.strictEqual(game.yearsLeft(fled), left - 1 - 1);
  assert.strictEqual(fled.run.battle.cleared, 0);
  assert.strictEqual(r.dead, false);
});

test('历练：寿元经不起一败、机缘用尽、劫期过了时的处理', () => {
  const old = cultivator(30, 30, 30);
  old.run.age = game.maxLife(old) - 3;
  assert.strictEqual(game.trainReason(old, 0), '寿元不足，经不起一败');
  old.run.age -= 1;
  assert.strictEqual(game.trainReason(old, 0), '');

  const dry = cultivator(30, 30, 30);
  dry.run.chance = 0.5;
  assert.strictEqual(game.trainReason(dry, 0), '机缘不足');

  const late = cultivator(30, 30, 30);
  late.run.realmChoices = game.tribTerm(late).term;
  const extra = game.tribTerm(late).years;
  assert.ok(extra > 0);
  assert.strictEqual(game.trainView(late).years, 1 + extra);
  const age = late.run.age;
  game.trainStart(late, 0, () => 0.5);
  assert.strictEqual(late.run.age, age + 1 + extra);
});

test('历练：存档停在战斗途中，读档按原结果结算；过关纪录跨世保留，进度不跨世', () => {
  const s = cultivator(30, 30, 30);
  game.trainStart(s, 0, () => 0.5);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(loaded.run.battle.pending, null);
  assert.strictEqual(loaded.run.battle.cleared, 1);
  assert.strictEqual(loaded.trainBest, 1);
  assert.strictEqual(loaded.run.log[loaded.run.log.length - 1].title, '历练');

  const old = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1 } }, 0, () => 0);
  assert.deepStrictEqual(old.run.battle, { cleared: 0, pending: null });
  assert.strictEqual(old.trainBest, 0);
  const broken = game.normalizeState({ trainBest: 99, run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: 2, pending: { stage: 9, win: true } } } }, 0, () => 0);
  assert.strictEqual(broken.run.battle.pending, null);
  assert.strictEqual(broken.run.battle.cleared, 2);
  assert.strictEqual(broken.trainBest, game.TRAIN_STAGES.length);

  game.retire(loaded);
  game.reincarnate(loaded, 0, () => 0);
  assert.strictEqual(loaded.run.battle.cleared, 0);
  assert.strictEqual(loaded.trainBest, 1);
});

test('历练数值：引气中期的寻常修士稳过前两关，最后一关要靠后面的成长', () => {
  const me = game.trainFighter(cultivator(13, 13, 13));
  const rate = (index) => battle.estimate(me, battle.foeFighter(game.TRAIN_STAGES[index], 1), 200);
  assert.ok(rate(0) >= 0.9, '第一关 ' + rate(0));
  assert.ok(rate(1) >= 0.8, '第二关 ' + rate(1));
  assert.ok(rate(4) <= 0.2, '第五关 ' + rate(4));
  const grown = game.trainFighter(cultivator(45, 45, 30));
  assert.ok(battle.estimate(grown, battle.foeFighter(game.TRAIN_STAGES[4], 1), 200) >= 0.7);
});
