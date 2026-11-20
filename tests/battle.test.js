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
  const foe = game.trainFoe(cultivator(1, 1, 1), 5);
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
  const def = { name: '木桩', hp: 130, atk: 9, interval: 1.8 };
  const foe = battle.foeFighter(def, 1.5);
  assert.strictEqual(foe.hp, 195);
  assert.strictEqual(foe.atk, 13.5);
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

test('历练：引气后自己打，不耗寿元、机缘和劫期；关卡不限数量，每五关一个首领', () => {
  const mortal = game.createState(0, () => 0);
  game.chooseRoot(mortal, 'talisman', 0, () => 0);
  assert.strictEqual(game.trainView(mortal).open, false);
  assert.ok(game.trainReason(mortal));
  assert.strictEqual(game.trainStage(mortal), 0);
  assert.strictEqual(game.trainEncounter(mortal, 0, () => 0.5), null);

  const s = cultivator(30, 30, 30);
  assert.strictEqual(game.trainStage(s), 1);
  const saved = JSON.stringify(s);
  const first = game.trainEncounter(s, 0, () => 0.5);
  // 只算不改状态。
  assert.strictEqual(JSON.stringify(s), saved);
  assert.strictEqual(first.stage, 1);
  assert.strictEqual(first.boss, false);
  assert.strictEqual(first.waves, game.TRAIN_MOBS);
  assert.strictEqual(first.last, false);
  assert.strictEqual(game.trainEncounter(s, game.TRAIN_MOBS - 1, () => 0.5).last, true);
  // 越界的场次收回到这一关的最后一场。
  assert.strictEqual(game.trainEncounter(s, 99, () => 0.5).wave, game.TRAIN_MOBS - 1);
  assert.ok(first.win);

  s.run.battle.cleared = game.TRAIN_BOSS_EVERY - 1;
  const boss = game.trainEncounter(s, 0, () => 0.5);
  assert.strictEqual(boss.stage, game.TRAIN_BOSS_EVERY);
  assert.strictEqual(boss.boss, true);
  assert.strictEqual(boss.waves, 1);
  assert.strictEqual(boss.last, true);
  assert.strictEqual(game.trainWaves(game.TRAIN_BOSS_EVERY * 7), 1);
  assert.strictEqual(game.trainWaves(game.TRAIN_BOSS_EVERY * 7 + 1), game.TRAIN_MOBS);

  // 越往后越硬，首领比同一带的小怪硬得多；几百关之后照样有敌人。
  const hp = (stage) => game.trainFoe(s, stage).hp;
  const atk = (stage) => game.trainFoe(s, stage).atk;
  for (let stage = 2; stage <= 60; stage++) {
    if (stage % game.TRAIN_BOSS_EVERY > 1) {
      assert.ok(hp(stage) > hp(stage - 1), '第 ' + stage + ' 关气血');
      assert.ok(atk(stage) > atk(stage - 1), '第 ' + stage + ' 关攻击');
    }
  }
  assert.ok(hp(5) > hp(6) && hp(5) > 3 * hp(4));
  assert.ok(game.trainFoe(s, 5).skill);
  assert.strictEqual(game.trainFoe(s, 4).skill, null);
  assert.ok(Number.isFinite(hp(500)) && hp(500) > hp(60));
  assert.notStrictEqual(game.trainFoe(s, 5).name, game.trainFoe(s, 10).name);
});

test('历练：按顺序过关，过关不耗东西，储物袋攒得更快，首领关涨得更多', () => {
  const s = cultivator(30, 30, 30);
  const age = s.run.age;
  const chance = s.run.chance;
  const used = s.run.realmChoices;
  const qi = s.run.qi;
  assert.strictEqual(game.trainRate(s), 0);
  assert.strictEqual(game.trainClear(s, 2), null);
  const r = game.trainClear(s, 1);
  assert.strictEqual(r.stage, 1);
  assert.strictEqual(r.boss, false);
  assert.ok(r.perHour > 0);
  assert.strictEqual(s.run.battle.cleared, 1);
  assert.strictEqual(s.trainBest, 1);
  assert.strictEqual(s.run.age, age);
  assert.strictEqual(s.run.chance, chance);
  assert.strictEqual(s.run.realmChoices, used);
  assert.strictEqual(s.run.qi, qi);
  assert.strictEqual(game.trainStage(s), 2);
  assert.strictEqual(game.trainClear(s, 1), null);
  const logs = s.run.log.length;
  let rate = game.trainRate(s);
  const steps = [];
  for (let stage = 2; stage <= 6; stage++) {
    assert.ok(game.trainClear(s, stage));
    steps.push(game.trainRate(s) - rate);
    rate = game.trainRate(s);
  }
  // 第 5 关是首领：涨幅是寻常关的三倍，并记一条见闻。
  assert.ok(Math.abs(steps[3] - 3 * steps[0]) < 1e-9);
  assert.ok(Math.abs(steps[4] - steps[0]) < 1e-9);
  assert.strictEqual(s.run.log.length, logs + 1);
  assert.strictEqual(s.run.log[s.run.log.length - 1].title, '历练');
});

test('储物袋：随现实时间攒灵气，有上限，收取后进丹田', () => {
  const s = cultivator(30, 30, 30);
  s.run.qi = 0;
  game.advance(s, 3600 * 1000);
  assert.strictEqual(s.run.battle.bag, 0);
  assert.strictEqual(game.trainCollect(s), null);
  assert.strictEqual(game.trainBag(s).full, false);

  for (let stage = 1; stage <= 5; stage++) game.trainClear(s, stage);
  const rate = game.trainRate(s);
  const t0 = s.lastTime;
  game.advance(s, t0 + 1800 * 1000);
  assert.ok(Math.abs(s.run.battle.bag - rate / 2) < 1e-9);
  let bag = game.trainBag(s);
  assert.strictEqual(bag.qi, Math.round(game.qiCap(s) * rate / 2));
  assert.strictEqual(bag.perHour, Math.round(game.qiCap(s) * rate));
  assert.strictEqual(bag.full, false);
  // 放再久也只存 TRAIN_BAG_HOURS 小时的量。
  game.advance(s, t0 + 100 * 3600 * 1000);
  bag = game.trainBag(s);
  assert.ok(Math.abs(s.run.battle.bag - rate * game.TRAIN_BAG_HOURS) < 1e-9);
  assert.strictEqual(bag.full, true);
  assert.strictEqual(bag.qi, bag.max);

  const age = s.run.age;
  const r = game.trainCollect(s);
  assert.strictEqual(r.qi, bag.max);
  assert.strictEqual(s.run.qi, bag.max);
  assert.strictEqual(s.run.battle.bag, 0);
  assert.strictEqual(s.run.age, age);
  assert.strictEqual(s.run.log[s.run.log.length - 1].title, '历练');
  assert.strictEqual(game.trainCollect(s), null);
});

test('历练：身死后停下，储物袋不再攒；重天放大敌人', () => {
  const dead = cultivator(30, 30, 30);
  game.trainClear(dead, 1);
  game.retire(dead);
  assert.strictEqual(game.trainStage(dead), 0);
  assert.strictEqual(game.trainClear(dead, 2), null);
  const bag = dead.run.battle.bag;
  game.advance(dead, dead.lastTime + 3600 * 1000);
  assert.strictEqual(dead.run.battle.bag, bag);
  assert.strictEqual(game.trainCollect(dead), null);

  const high = cultivator(30, 30, 30);
  const base = game.trainFoe(high, 3).hp;
  high.run.heaven = 2;
  assert.ok(game.trainFoe(high, 3).hp > base);
});

test('历练存档：旧档缺字段按空值读，储物袋不超过上限；关卡和储物袋不跨世，最远纪录跨世保留', () => {
  const old = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1 } }, 0, () => 0);
  assert.deepStrictEqual(old.run.battle, { cleared: 0, bag: 0 });
  assert.strictEqual(old.trainBest, 0);
  const legacy = game.normalizeState({ trainBest: 3, run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: 12, bag: 99, pending: { stage: 2, win: true } } } }, 0, () => 0);
  assert.strictEqual(legacy.run.battle.cleared, 12);
  assert.ok(Math.abs(legacy.run.battle.bag - game.trainRate(legacy) * game.TRAIN_BAG_HOURS) < 1e-9);
  assert.deepStrictEqual(Object.keys(legacy.run.battle).sort(), ['bag', 'cleared']);
  assert.strictEqual(legacy.trainBest, 12);
  const broken = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: -4, bag: 'x' } } }, 0, () => 0);
  assert.deepStrictEqual(broken.run.battle, { cleared: 0, bag: 0 });

  const s = cultivator(30, 30, 30);
  game.trainClear(s, 1);
  game.advance(s, s.lastTime + 600 * 1000);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), s.lastTime, () => 0);
  assert.strictEqual(loaded.run.battle.cleared, 1);
  assert.ok(loaded.run.battle.bag > 0);
  game.retire(loaded);
  game.reincarnate(loaded, 0, () => 0);
  assert.deepStrictEqual(loaded.run.battle, { cleared: 0, bag: 0 });
  assert.strictEqual(loaded.trainBest, 1);
});

test('历练数值：引气中期的寻常修士能过头一个首领，越强走得越远', () => {
  const reach = (edge, body, mind) => {
    const s = cultivator(edge, body, mind);
    const me = game.trainFighter(s);
    let stage = 1;
    while (stage < 200 && battle.estimate(me, game.trainFoe(s, stage), 100) >= 0.5) stage++;
    return stage - 1;
  };
  const novice = reach(13, 13, 13);
  const grown = reach(45, 45, 30);
  assert.ok(novice >= 5 && novice < 15, '引气中期 ' + novice);
  assert.ok(grown >= novice + 8 && grown < 40, '引气圆满 ' + grown);
  assert.ok(reach(200, 200, 150) > grown);
  // 小怪一场十来秒内打完，不会拖成久战。
  const s = cultivator(13, 13, 13);
  s.run.battle.cleared = 3;
  assert.ok(game.trainEncounter(s, 0, battle.seeded(5)).seconds < 20);
});
