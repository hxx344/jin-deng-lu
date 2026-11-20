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

test('历练：引气后自己打，不耗寿元、机缘和劫期；小怪打完才轮到守关的', () => {
  const mortal = game.createState(0, () => 0);
  game.chooseRoot(mortal, 'talisman', 0, () => 0);
  assert.strictEqual(game.trainView(mortal).open, false);
  assert.ok(game.trainReason(mortal));
  assert.strictEqual(game.trainStage(mortal), -1);
  assert.strictEqual(game.trainEncounter(mortal, 0, () => 0.5), null);

  const s = cultivator(30, 30, 30);
  const view = game.trainView(s);
  assert.strictEqual(view.open, true);
  assert.strictEqual(view.stage, 0);
  assert.strictEqual(view.stages.length, 1);
  assert.strictEqual(view.stages[0].chance, 1);
  const saved = JSON.stringify(s);
  const mob = game.trainEncounter(s, 0, () => 0.5);
  const boss = game.trainEncounter(s, game.TRAIN_MOBS, () => 0.5);
  // 只算不改状态。
  assert.strictEqual(JSON.stringify(s), saved);
  assert.strictEqual(mob.boss, false);
  assert.strictEqual(mob.foe.name, game.TRAIN_STAGES[0].mob);
  assert.strictEqual(mob.sprite, game.TRAIN_STAGES[0].sprite);
  assert.strictEqual(boss.boss, true);
  assert.strictEqual(boss.foe.name, game.TRAIN_STAGES[0].name);
  assert.strictEqual(boss.foe.max, game.TRAIN_STAGES[0].hp);
  assert.ok(mob.foe.max < boss.foe.max);
  assert.ok(mob.win && boss.win);
  assert.ok(mob.seconds < boss.seconds);
  // 越界的场次收回到守关的。
  assert.strictEqual(game.trainEncounter(s, 99, () => 0.5).boss, true);
});

test('历练：打赢守关的才过关，头一回过关得灵气并记一条见闻', () => {
  const s = cultivator(30, 30, 30);
  const age = s.run.age;
  const chance = s.run.chance;
  const used = s.run.realmChoices;
  const qi = s.run.qi;
  assert.strictEqual(game.trainClear(s, 1), null);
  const r = game.trainClear(s, 0);
  assert.strictEqual(r.first, true);
  assert.ok(r.qi > 0);
  assert.strictEqual(s.run.qi, qi + r.qi);
  assert.strictEqual(s.run.battle.cleared, 1);
  assert.strictEqual(s.trainBest, 1);
  assert.strictEqual(s.run.age, age);
  assert.strictEqual(s.run.chance, chance);
  assert.strictEqual(s.run.realmChoices, used);
  assert.strictEqual(s.run.log[s.run.log.length - 1].title, '历练');
  assert.strictEqual(game.trainStage(s), 1);
  assert.strictEqual(game.trainClear(s, 0), null);
  assert.deepStrictEqual(game.trainView(s).stages.map((stage) => stage.cleared), [true, false]);

  // 全过了就留在最后一关，重打不再给东西。
  s.run.battle.cleared = game.TRAIN_STAGES.length;
  const last = game.TRAIN_STAGES.length - 1;
  assert.strictEqual(game.trainStage(s), last);
  const logs = s.run.log.length;
  const again = game.trainClear(s, last);
  assert.strictEqual(again.first, false);
  assert.strictEqual(again.qi, 0);
  assert.strictEqual(s.run.log.length, logs);
  assert.strictEqual(game.trainView(s).stages[last].qi, 0);
});

test('历练：身死或人在枯海时停下，重天放大敌人', () => {
  const dead = cultivator(30, 30, 30);
  game.retire(dead);
  assert.strictEqual(game.trainStage(dead), -1);
  assert.strictEqual(game.trainClear(dead, 0), null);

  const high = cultivator(30, 30, 30);
  const base = game.trainEncounter(high, game.TRAIN_MOBS, () => 0.5).foe.max;
  high.run.heaven = 2;
  assert.ok(game.trainEncounter(high, game.TRAIN_MOBS, () => 0.5).foe.max > base);
});

test('历练：旧存档里没结算的那一场直接丢掉；过关纪录跨世保留，进度不跨世', () => {
  const old = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1 } }, 0, () => 0);
  assert.deepStrictEqual(old.run.battle, { cleared: 0 });
  assert.strictEqual(old.trainBest, 0);
  const legacy = game.normalizeState({ trainBest: 99, run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: 2, pending: { stage: 2, win: true, lines: ['耗 1 次机缘'] } } } }, 0, () => 0);
  assert.deepStrictEqual(legacy.run.battle, { cleared: 2 });
  assert.strictEqual(legacy.trainBest, game.TRAIN_STAGES.length);
  assert.strictEqual(game.canDraw(legacy), legacy.run.chance >= 1);

  const s = cultivator(30, 30, 30);
  game.trainClear(s, 0);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(loaded.run.battle.cleared, 1);
  game.retire(loaded);
  game.reincarnate(loaded, 0, () => 0);
  assert.strictEqual(loaded.run.battle.cleared, 0);
  assert.strictEqual(loaded.trainBest, 1);
});

test('历练数值：小怪比守关的好打；引气中期的寻常修士稳过前两关，最后一关要靠后面的成长', () => {
  const state = cultivator(13, 13, 13);
  const me = game.trainFighter(state);
  const rate = (index) => battle.estimate(me, battle.foeFighter(game.TRAIN_STAGES[index], 1), 200);
  assert.ok(rate(0) >= 0.9, '第一关 ' + rate(0));
  assert.ok(rate(1) >= 0.8, '第二关 ' + rate(1));
  assert.ok(rate(4) <= 0.2, '第五关 ' + rate(4));
  state.run.battle.cleared = 2;
  let mobWins = 0;
  const rng = battle.seeded(3);
  for (let i = 0; i < 50; i++) mobWins += game.trainEncounter(state, 0, rng).win ? 1 : 0;
  assert.ok(mobWins >= 45, '第三关小怪 ' + mobWins);
  const grown = game.trainFighter(cultivator(45, 45, 30));
  assert.ok(battle.estimate(grown, battle.foeFighter(game.TRAIN_STAGES[4], 1), 200) >= 0.7);
});
