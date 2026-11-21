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
  const scrolls = game.lampView(mortal);
  for (const opt of scrolls.options) {
    const trial = game.normalizeState(mortal, 0, () => 0);
    assert.ok(game.chooseLamp(trial, scrolls.stamp, opt.id));
    const fight = game.trainEncounter(trial, 0, () => 0.5);
    assert.ok(fight.win && fight.last);
    assert.strictEqual(fight.foe.name, '叼刀的野狗');
    const clear = game.trainClear(trial, 1, () => 0.99);
    assert.strictEqual(clear.drop.item.slot, 'weapon');
    assert.ok(clear.drop.worn);
    assert.strictEqual(game.trainStage(trial), 0);
    assert.strictEqual(game.trainClear(trial, 1), null);
    trial.run.realm = 1;
    assert.strictEqual(game.trainStage(trial), 2);
  }

  const s = cultivator(30, 30, 30);
  assert.strictEqual(game.trainStage(s), 1);
  const saved = JSON.stringify(s);
  const first = game.trainEncounter(s, 0, () => 0.5);
  // 只算不改状态。
  assert.strictEqual(JSON.stringify(s), saved);
  assert.strictEqual(first.stage, 1);
  assert.strictEqual(first.boss, false);
  assert.strictEqual(first.waves, 1);
  assert.strictEqual(first.last, true);
  game.trainClear(s, 1, () => 0.5);
  assert.strictEqual(game.trainEncounter(s, 0, () => 0.5).waves, game.TRAIN_MOBS);
  assert.strictEqual(game.trainEncounter(s, 0, () => 0.5).last, false);
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

test('历练：败了退回两关，最多退到第 1 关；重打的关不再掉东西，储物袋不变慢', () => {
  const s = cultivator(30, 30, 30);
  const always = () => 0;
  assert.strictEqual(game.trainLose(s, 2), null);
  assert.deepStrictEqual(game.trainLose(s, 1), { from: 1, stage: 1 });
  for (let stage = 1; stage <= 6; stage++) game.trainClear(s, stage, always);
  const rate = game.trainRate(s);
  const pack = s.run.gear.pack.length;
  const logs = s.run.log.length;

  assert.deepStrictEqual(game.trainLose(s, 7), { from: 7, stage: 5 });
  assert.strictEqual(game.trainStage(s), 5);
  assert.strictEqual(game.trainEncounter(s, 0, () => 0.5).boss, true);
  assert.strictEqual(s.run.battle.cleared, 6);
  assert.strictEqual(game.trainRate(s), rate);
  assert.strictEqual(game.trainView(s).cleared, 6);
  // 连着败就接着退，退到第 1 关为止。
  assert.strictEqual(game.trainLose(s, 5).stage, 3);
  assert.strictEqual(game.trainLose(s, 3).stage, 1);
  assert.strictEqual(game.trainLose(s, 1).stage, 1);

  for (let stage = 1; stage <= 6; stage++) {
    assert.strictEqual(game.trainClear(s, stage + 1, always), null);
    const again = game.trainClear(s, stage, always);
    assert.strictEqual(again.again, true);
    assert.strictEqual(again.drop, null);
  }
  assert.strictEqual(s.run.gear.pack.length, pack);
  assert.strictEqual(s.run.log.length, logs);
  assert.strictEqual(game.trainRate(s), rate);
  assert.strictEqual(game.trainStage(s), 7);
  const fresh = game.trainClear(s, 7, always);
  assert.ok(fresh.drop);
  assert.ok(!fresh.again);
  assert.strictEqual(s.run.battle.cleared, 7);

  // 退回的位置进存档，坏值按没退读。
  game.trainLose(s, 8);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), s.lastTime, () => 0);
  assert.strictEqual(game.trainStage(loaded), 6);
  const raw = JSON.parse(JSON.stringify(s));
  raw.run.battle.back = 99;
  assert.strictEqual(game.trainStage(game.normalizeState(raw, s.lastTime, () => 0)), 1);
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
  const r = game.trainCollect(s, () => 0.5);
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
  assert.deepStrictEqual(old.run.battle, { cleared: 0, back: 0, bag: 0, loot: 0 });
  assert.strictEqual(old.trainBest, 0);
  const legacy = game.normalizeState({ trainBest: 3, run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: 12, bag: 99, pending: { stage: 2, win: true } } } }, 0, () => 0);
  assert.strictEqual(legacy.run.battle.cleared, 12);
  assert.ok(Math.abs(legacy.run.battle.bag - game.trainRate(legacy) * game.TRAIN_BAG_HOURS) < 1e-9);
  assert.deepStrictEqual(Object.keys(legacy.run.battle).sort(), ['back', 'bag', 'cleared', 'loot']);
  assert.strictEqual(legacy.trainBest, 12);
  const broken = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: -4, bag: 'x' } } }, 0, () => 0);
  assert.deepStrictEqual(broken.run.battle, { cleared: 0, back: 0, bag: 0, loot: 0 });

  const s = cultivator(30, 30, 30);
  game.trainClear(s, 1);
  game.advance(s, s.lastTime + 600 * 1000);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), s.lastTime, () => 0);
  assert.strictEqual(loaded.run.battle.cleared, 1);
  assert.ok(loaded.run.battle.bag > 0);
  game.retire(loaded);
  game.reincarnate(loaded, 0, () => 0);
  assert.deepStrictEqual(loaded.run.battle, { cleared: 0, back: 0, bag: 0, loot: 0 });
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

// 装备
const gear = require('../utils/gear');

test('装备：品级定词条数和装备分，阶越高、强化越高主属性越大', () => {
  const low = { slot: 'weapon', grade: 0, tier: 9, level: 0, affixes: [] };
  assert.strictEqual(gear.stats(low).atk, 7);
  // 装备分随阶涨：第 9 阶是第 1 阶的 1.4 倍。
  assert.strictEqual(gear.score(Object.assign({}, low, { tier: 1 })), 4);
  assert.strictEqual(gear.score(low), Math.round(4 * 1.4));
  assert.ok(gear.score(Object.assign({}, low, { tier: 60 })) > gear.score(low) * 2);
  // 到 80 阶为止每阶加 5%，之后每阶乘 1.015：后期每过一关，装备分涨的比例不再越来越小。
  const late = { slot: 'weapon', grade: 6, tier: 80, level: 0, affixes: [] };
  assert.strictEqual(gear.score(late), Math.round(58 * 4.95));
  assert.strictEqual(gear.score(Object.assign({}, late, { tier: 81 })), Math.round(58 * 4.95 * 1.015));
  assert.strictEqual(gear.score(Object.assign({}, late, { tier: 180 })), Math.round(58 * 4.95 * Math.pow(1.015, 100)));
  assert.ok(Number.isFinite(gear.score(Object.assign({}, late, { tier: 9999 }))));
  const high = { slot: 'weapon', grade: 3, tier: 9, level: 5, affixes: ['atk', 'crit', 'haste'] };
  assert.strictEqual(gear.stats(high).atk, Math.round(6.5 * 2.5 * 1.5));
  assert.strictEqual(gear.score(high), Math.round((22 * 1.5 + 6) * 1.4));
  assert.ok(Math.abs(gear.stats(high).atkPct - 0.06) < 1e-9);
  assert.ok(gear.stats({ slot: 'weapon', grade: 0, tier: 30, level: 0, affixes: [] }).atk > gear.stats(low).atk * 5);
  assert.ok(gear.stats({ slot: 'armor', grade: 1, tier: 9, level: 0, affixes: [] }).hp > 0);
  const charm = gear.stats({ slot: 'charm', grade: 2, tier: 9, level: 0, affixes: [] });
  assert.ok(charm.atk > 0 && charm.hp > 0 && charm.crit === 0.06);
  assert.strictEqual(gear.stats({ slot: 'weapon', grade: 6, tier: 9, level: 0, affixes: [] }).atk, Math.round(6.5 * 5));
  assert.ok(gear.rating(high) > gear.rating(low));
  // 强化的花费逐级涨，到顶之后是 0；分解退一半。
  assert.strictEqual(gear.enhanceCost(low), 1);
  assert.strictEqual(gear.enhanceCost(high), 0);
  assert.strictEqual(gear.scrapValue(low), 1);
  assert.strictEqual(gear.scrapValue(high), 8 + Math.floor((4 + 8 + 12 + 16 + 20) / 2));
});

test('装备掉落：词条不重复，越往后好东西越多，首领掷两次取高', () => {
  const count = (tier, boss) => {
    const rng = battle.seeded(11);
    const grades = gear.GRADES.map(() => 0);
    for (let i = 0; i < 2000; i++) {
      const item = gear.roll(tier, rng, boss);
      assert.strictEqual(item.affixes.length, gear.GRADES[item.grade].affixes);
      assert.strictEqual(new Set(item.affixes).size, item.affixes.length);
      assert.strictEqual(item.tier, tier);
      grades[item.grade]++;
    }
    return grades;
  };
  const early = count(1, false);
  const late = count(40, false);
  const boss = count(1, true);
  assert.ok(early[0] > 1000 && early[3] < 60);
  assert.ok(late[3] > early[3] * 3 && late[0] < early[0]);
  assert.ok(boss[0] < early[0] && boss[2] + boss[3] > early[2] + early[3]);
});

test('历练掉装备：首领关必掉，寻常的关有保底；空槽位直接穿上，装备让他打得更远', () => {
  const s = cultivator(13, 13, 13);
  // 随机数一直是 0.99：寻常的关不掉，连着 TRAIN_DROP_PITY 关没掉后必掉。
  const never = () => 0.99;
  assert.strictEqual(game.trainClear(s, 1, never).drop.item.slot, 'weapon');
  for (let stage = 2; stage < 5; stage++) assert.strictEqual(game.trainClear(s, stage, never).drop, null);
  const boss = game.trainClear(s, 5, never);
  assert.strictEqual(boss.boss, true);
  assert.ok(boss.drop);
  assert.ok(/得/.test(s.run.log[s.run.log.length - 1].text));
  for (let stage = 6; stage < 6 + game.TRAIN_DROP_PITY; stage++) assert.strictEqual(game.trainClear(s, stage, never).drop, null);
  const pity = game.trainClear(s, 6 + game.TRAIN_DROP_PITY, never);
  assert.ok(pity.drop);
  assert.strictEqual(pity.drop.item.tier, 6 + game.TRAIN_DROP_PITY);
  assert.ok(game.gearScore(s) > 0);
  const power = game.combatPowerDetails(s);
  assert.ok(power.sources.find((source) => source.id === 'gear').value > 0);
  assert.ok(power.total > game.combatPowerDetails(cultivator(13, 13, 13)).total);

  const bare = game.trainFighter(cultivator(13, 13, 13));
  const armed = cultivator(13, 13, 13);
  armed.run.gear.worn.weapon = { uid: 1, slot: 'weapon', grade: 3, tier: 9, level: 5, affixes: ['atk', 'crit', 'haste'] };
  armed.run.gear.worn.armor = { uid: 2, slot: 'armor', grade: 3, tier: 9, level: 5, affixes: ['hp', 'reduce', 'crit'] };
  const me = game.trainFighter(armed);
  assert.ok(me.atk > bare.atk * 1.8 && me.hp > bare.hp * 1.5 && me.interval < bare.interval && me.reduce > bare.reduce && me.crit > bare.crit);
  const reach = (state, fighter) => {
    let stage = 1;
    while (stage < 100 && battle.estimate(fighter, game.trainFoe(state, stage), 60) >= 0.5) stage++;
    return stage - 1;
  };
  assert.ok(reach(armed, me) >= reach(armed, bare) + 4);
  // 装备不改锋躯神，渡劫不受影响。
  assert.deepStrictEqual(game.attrs(armed), game.attrs(cultivator(13, 13, 13)));
});

test('装备：换上、一键换好的、强化、分解，背包满了新掉的直接分解', () => {
  const s = cultivator(13, 13, 13);
  const g = s.run.gear;
  g.worn.weapon = { uid: 1, slot: 'weapon', grade: 0, tier: 3, level: 0, affixes: [] };
  g.pack = [
    { uid: 2, slot: 'weapon', grade: 1, tier: 6, level: 0, affixes: ['atk'] },
    { uid: 3, slot: 'weapon', grade: 0, tier: 1, level: 0, affixes: [] },
    { uid: 4, slot: 'armor', grade: 0, tier: 2, level: 0, affixes: [] }
  ];
  g.seq = 4;
  let view = game.gearView(s);
  assert.deepStrictEqual(view.pack.map((item) => [item.uid, item.better]), [[2, true], [3, false], [4, true]]);
  assert.strictEqual(game.gearEquipBest(s), 2);
  assert.strictEqual(g.worn.weapon.uid, 2);
  assert.strictEqual(g.worn.armor.uid, 4);
  assert.deepStrictEqual(g.pack.map((item) => item.uid).sort(), [1, 3]);
  assert.strictEqual(game.gearEquip(s, 99), false);
  assert.strictEqual(game.gearEquip(s, 1), true);
  assert.strictEqual(g.worn.weapon.uid, 1);

  assert.strictEqual(game.gearEnhance(s, 'weapon'), false);
  const spare = game.gearScrapSpare(s);
  assert.deepStrictEqual(spare, { count: 1, forge: 1 });
  assert.strictEqual(game.gearScrap(s, 2), 2);
  assert.strictEqual(g.forge, 3);
  assert.strictEqual(g.pack.length, 0);
  assert.strictEqual(game.gearEnhance(s, 'weapon'), true);
  assert.strictEqual(game.gearEnhance(s, 'weapon'), true);
  assert.strictEqual(g.worn.weapon.level, 2);
  assert.strictEqual(g.forge, 0);
  assert.strictEqual(game.gearEnhance(s, 'charm'), false);

  for (let i = 0; i < game.GEAR_PACK_MAX; i++) g.pack.push({ uid: 100 + i, slot: 'weapon', grade: 0, tier: 1, level: 0, affixes: [] });
  game.GEAR_SLOTS.forEach((slot) => {
    if (!g.worn[slot.id]) g.worn[slot.id] = { uid: 200, slot: slot.id, grade: 0, tier: 1, level: 0, affixes: [] };
  });
  s.run.battle.cleared = 4;
  const full = game.trainClear(s, 5, () => 0.5);
  assert.ok(full.drop.scrapped > 0);
  assert.strictEqual(g.pack.length, game.GEAR_PACK_MAX);
  assert.strictEqual(g.forge, full.drop.scrapped);
});

test('装备：高几阶的白板装备装备分不如强化过的旧装备时，不算更好也不算用不上', () => {
  const s = cultivator(13, 13, 13);
  const g = s.run.gear;
  g.worn.weapon = { uid: 1, slot: 'weapon', grade: 2, tier: 20, level: 5, affixes: ['atk', 'crit'] };
  const raw = { uid: 2, slot: 'weapon', grade: 2, tier: 25, level: 0, affixes: ['atk', 'crit'] };
  g.pack = [raw];
  g.seq = 2;
  assert.ok(gear.rating(raw) > gear.rating(g.worn.weapon) && gear.score(raw) < gear.score(g.worn.weapon));
  const before = game.gearScore(s);
  let view = game.gearView(s);
  assert.strictEqual(view.pack[0].better, false);
  assert.strictEqual(view.hasBetter, false);
  assert.strictEqual(view.hasSpare, false);
  assert.strictEqual(game.gearHasBetter(s), false);
  assert.strictEqual(game.gearEquipBest(s), 0);
  assert.deepStrictEqual(game.gearScrapSpare(s), { count: 0, forge: 0 });
  assert.strictEqual(game.gearScore(s), before);
  assert.strictEqual(g.pack.length, 1);
  // 阶高到装备分也超过了才算更好；换上去装备分不降。
  g.pack.push({ uid: 3, slot: 'weapon', grade: 2, tier: 45, level: 0, affixes: ['atk', 'crit'] });
  g.seq = 3;
  view = game.gearView(s);
  assert.deepStrictEqual(view.pack.map((item) => [item.uid, item.better]), [[3, true], [2, false]]);
  assert.strictEqual(game.gearEquipBest(s), 1);
  assert.strictEqual(g.worn.weapon.uid, 3);
  assert.ok(game.gearScore(s) >= before);
  // 换下来的两件现在两项都不如身上的，才分解。
  assert.strictEqual(game.gearScrapSpare(s).count, 2);
});
test('储物袋攒装备：每 20 分钟一件，有上限，收取时按眼下的关数掷', () => {
  const s = cultivator(13, 13, 13);
  game.advance(s, s.lastTime + 3600 * 1000);
  assert.strictEqual(game.trainBag(s).gear, 0);
  s.run.battle.cleared = 7;
  game.advance(s, s.lastTime + 3000 * 1000);
  assert.strictEqual(game.trainBag(s).gear, 2);
  const r = game.trainCollect(s, battle.seeded(2));
  assert.strictEqual(r.drops.length, 2);
  r.drops.forEach((drop) => assert.strictEqual(drop.item.tier, 7));
  assert.ok(Math.abs(s.run.battle.loot - 0.5) < 1e-9);
  game.advance(s, s.lastTime + 100 * 3600 * 1000);
  const bag = game.trainBag(s);
  assert.strictEqual(bag.gear, bag.gearMax);
  assert.strictEqual(bag.full, true);
});

test('装备红点：背包里有比身上好的才亮，换上或分解后熄灭', () => {
  const s = cultivator(30, 30, 30);
  assert.strictEqual(game.gearHasBetter(s), false);
  s.run.gear.worn.weapon = { uid: 1, slot: 'weapon', grade: 1, tier: 1, level: 0, affixes: [] };
  s.run.gear.pack.push({ uid: 2, slot: 'weapon', grade: 0, tier: 1, level: 0, affixes: [] });
  assert.strictEqual(game.gearHasBetter(s), false);
  s.run.gear.pack.push({ uid: 3, slot: 'weapon', grade: 3, tier: 1, level: 0, affixes: [] });
  assert.strictEqual(game.gearHasBetter(s), true);
  assert.strictEqual(game.gearHasBetter(s), game.gearView(s).hasBetter);
  assert.ok(game.gearEquip(s, 3));
  assert.strictEqual(game.gearHasBetter(s), false);
  assert.strictEqual(game.gearView(s).hasBetter, false);
});

test('装备存档：不合法的装备丢掉，编号重排；装备和锻材不跨世', () => {
  const raw = { run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: 3, loot: 99 }, gear: {
    worn: { weapon: { slot: 'weapon', grade: 2, tier: 8, level: 3, affixes: ['atk', 'atk', 'hp', 'crit', 'x'] }, armor: { slot: 'weapon', grade: 0, tier: 1, level: 0, affixes: [] }, charm: { slot: 'charm', grade: 9, tier: 1, level: 0, affixes: [] } },
    pack: [{ slot: 'armor', grade: 1, tier: 2, level: 0, affixes: ['hp'] }, { slot: 'cape', grade: 0, tier: 1, level: 0, affixes: [] }, null, { slot: 'charm', grade: 0, tier: 0, level: 0, affixes: [] }],
    forge: 500, dry: 50, seq: -3
  } } };
  const s = game.normalizeState(raw, 0, () => 0);
  const g = s.run.gear;
  assert.deepStrictEqual(g.worn.weapon, { slot: 'weapon', grade: 2, tier: 8, level: 3, affixes: ['atk', 'hp'], uid: 1 });
  assert.strictEqual(g.worn.armor, null);
  assert.strictEqual(g.worn.charm, null);
  assert.strictEqual(g.pack.length, 1);
  assert.strictEqual(g.pack[0].uid, 2);
  assert.strictEqual(g.seq, 2);
  assert.strictEqual(g.forge, 99);
  assert.strictEqual(g.dry, game.TRAIN_DROP_PITY);
  assert.strictEqual(s.run.battle.loot, game.trainBag(s).gearMax);
  const old = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1 } }, 0, () => 0);
  assert.deepStrictEqual(old.run.gear, { worn: { weapon: null, armor: null, crown: null, boots: null, charm: null, ring: null }, pack: [], forge: 0, seq: 0, dry: 0 });
  game.retire(s);
  game.reincarnate(s, 0, () => 0);
  assert.deepStrictEqual(s.run.gear, old.run.gear);
});

test('天劫要装备分：不够时成功率按差的比例扣，够了不扣，超过了递减着加一点；引气劫不设', () => {
  const wear = (s, items) => {
    items.forEach((item, i) => {
      s.run.gear.worn[item.slot] = Object.assign({ uid: i + 1, tier: 1, level: 0, affixes: [] }, item);
    });
  };
  const part = (info) => info.parts.filter((entry) => entry.label === '装备分不足')[0];
  const s = cultivator(48, 48, 48);
  s.run.qi = game.qiCap(s);
  const bare = game.tribulationInfo(s);
  assert.strictEqual(bare.name, '筑基劫');
  const need = game.TRIBS[1].gear;
  assert.strictEqual(need, 20);
  assert.deepStrictEqual(bare.gear, { name: '筑基劫', need: need, score: 0, short: true, cut: game.GEAR_TRIB_MAX, penalty: game.GEAR_TRIB_MAX, bonus: 0 });
  assert.strictEqual(part(bare).value, -game.GEAR_TRIB_MAX);
  // 一件凡品 4 分、一件 +5 的凡品 6 分，合计 10 分，差一半，扣一半。
  wear(s, [{ slot: 'weapon', grade: 0 }, { slot: 'armor', grade: 0, level: 5 }]);
  const half = game.tribulationInfo(s);
  assert.strictEqual(half.gear.score, 10);
  assert.ok(Math.abs(part(half).value + game.GEAR_TRIB_MAX / 2) < 1e-9);
  assert.ok(Math.abs(half.chance - bare.chance - game.GEAR_TRIB_MAX / 2) < 1e-9);
  wear(s, [{ slot: 'boots', grade: 0 }, { slot: 'charm', grade: 0 }, { slot: 'ring', grade: 0 }]);
  assert.strictEqual(game.gearScore(s), 22);
  const full = game.tribulationInfo(s);
  assert.strictEqual(full.gear.short, false);
  assert.strictEqual(part(full), undefined);
  // 超过要求的部分另加一点：多出一成，离上限的差距缩到 0.5^(0.1 / GEAR_TRIB_HALF)。
  const spare = (info) => info.parts.filter((entry) => entry.label === '装备分富余')[0];
  const over = game.GEAR_TRIB_BONUS * (1 - Math.pow(0.5, 0.1 / game.GEAR_TRIB_HALF));
  assert.ok(Math.abs(full.gear.bonus - over) < 1e-9);
  assert.ok(Math.abs(spare(full).value - over) < 1e-9);
  assert.ok(Math.abs(full.chance - bare.chance - game.GEAR_TRIB_MAX - over) < 1e-9);
  // 刚好够不加；越往上每一截加得越少，怎么堆也不超过 GEAR_TRIB_BONUS。
  s.run.gear.worn.ring = null;
  s.run.gear.worn.charm.level = 5;
  assert.strictEqual(game.gearScore(s), need);
  const exact = game.tribulationInfo(s);
  assert.strictEqual(exact.gear.bonus, 0);
  assert.strictEqual(spare(exact), undefined);
  // 多出九成：加得比多出一成时多，但远不到九倍。
  wear(s, [{ slot: 'weapon', grade: 3 }]);
  const rich = game.tribulationInfo(s);
  assert.strictEqual(rich.gear.score, 38);
  assert.ok(Math.abs(rich.gear.bonus - game.GEAR_TRIB_BONUS * (1 - Math.pow(0.5, 0.9 / game.GEAR_TRIB_HALF))) < 1e-9);
  assert.ok(rich.gear.bonus > over && rich.gear.bonus < over * 9 / 2);
  assert.ok(Math.abs(rich.chance - exact.chance - rich.gear.bonus) < 1e-9);
  wear(s, ['weapon', 'armor', 'crown', 'boots', 'charm', 'ring'].map((slot) => ({ slot: slot, grade: 6, level: 5, tier: 40 })));
  const most = game.tribulationInfo(s);
  assert.ok(most.gear.bonus > rich.gear.bonus && most.gear.bonus <= game.GEAR_TRIB_BONUS);
  assert.ok(most.chance <= 0.98);
  assert.strictEqual(game.gearView(s).trib.need, need);
  // 装备不改属性：换装前后锋躯神一样。
  assert.deepStrictEqual(game.attrs(s), { edge: 48, body: 48, mind: 48 });
  const mortal = game.createState(0, () => 0);
  mortal.run.fate = '';
  assert.ok(game.chooseRoot(mortal, 'talisman', 0, () => 0));
  assert.strictEqual(game.tribGear(mortal).need, 0);
  assert.strictEqual(game.tribGear(mortal).short, false);
  // 前松后紧：寻常的天劫要求一场比一场高，扣幅从三成加到十成；每高一重天要求再多 5%。
  const plain = game.TRIBS.filter((trib) => !trib.wall);
  const cuts = game.TRIBS.map((trib) => trib.gearCut || game.GEAR_TRIB_MAX);
  assert.strictEqual(plain[0].gear, undefined);
  for (let i = 2; i < plain.length; i++) assert.ok(plain[i].gear > plain[i - 1].gear, plain[i].name);
  for (let i = 1; i < cuts.length; i++) assert.ok(cuts[i] >= cuts[i - 1], game.TRIBS[i].name);
  assert.strictEqual(cuts[1], 0.3);
  assert.strictEqual(cuts[cuts.length - 1], 1);
  s.run.heaven = 2;
  assert.strictEqual(game.tribGear(s).need, Math.round(need * (1 + 2 * game.GEAR_HEAVEN)));
});

test('元婴之后的境界：十三个新境界接在元婴后面，各有天劫，破境后丹田、寿元、灯芯都往上涨', () => {
  const names = game.REALMS.map((realm) => realm.name);
  assert.deepStrictEqual(names.slice(0, 5), ['凡胎', '引气', '筑基', '金丹', '元婴']);
  assert.deepStrictEqual(names.slice(5), ['化神', '婴变', '问鼎', '阴虚', '阳实', '窥涅', '净涅', '碎涅', '空涅', '空灵', '空玄', '空劫', '踏天']);
  assert.strictEqual(game.TRIBS.length, game.REALMS.length);
  for (let i = 5; i < game.REALMS.length; i++) {
    const realm = game.REALMS[i];
    const before = game.REALMS[i - 1];
    const trib = game.TRIBS[i - 1];
    assert.ok(realm.cap > before.cap && realm.rate > before.rate && realm.power.base > before.power.base && realm.power.softCap > before.power.softCap, realm.name);
    assert.ok(realm.fullWick > realm.wick[2] && realm.wick[0] > before.fullWick, realm.name);
    assert.ok(trib.req > 0 && trib.life > 0 && trib.failYears > 0 && !trib.bolts && !trib.seaTrial, trib.name);
  }
  // 元婴圆满后接着渡化神劫。零装备时硬抗和借势都是 0%，不能靠 5% 保底或反复借势绕过。
  const s = cultivator(400, 400, 400);
  s.run.realm = 4;
  s.run.stage = game.STAGES.length - 1;
  s.run.qi = game.qiCap(s);
  const bare = game.tribulationInfo(s);
  assert.strictEqual(bare.name, '化神劫');
  assert.ok(bare.ready && bare.tests.length > 0 && bare.gear.need > 0 && bare.gear.cut === 1);
  assert.strictEqual(bare.chance, 0);
  assert.strictEqual(bare.borrowChance, 0);
  const blocked = game.attemptTribulation(s, () => 0, 'endure');
  assert.strictEqual(blocked.success, false);
  assert.strictEqual(s.run.realm, 4);
  // 两件 20 阶道品合计 226 分，达到化神劫的 220 后才能破境。
  ['weapon', 'armor'].forEach((slot, i) => {
    s.run.gear.worn[slot] = { uid: i + 1, slot: slot, grade: 6, tier: 20, level: 0, affixes: [] };
  });
  s.run.qi = game.qiCap(s);
  const info = game.tribulationInfo(s);
  assert.strictEqual(info.gear.short, false);
  assert.ok(info.chance > 0 && info.borrowChance > info.chance);
  const life = game.maxLife(s);
  const result = game.attemptTribulation(s, () => 0, 'endure');
  assert.ok(result.success);
  assert.strictEqual(game.realmText(s.run), '化神前期');
  assert.strictEqual(game.maxLife(s), life + info.lifeBonus);
  assert.strictEqual(game.layerName(s.run), '枯海');
  assert.ok(game.tribTerm(s).term > 0);
  // 新境界没有自己的墟层，机缘从三个墟层里一起抽。
  const layers = new Set();
  const rng = battle.seeded(3);
  for (let i = 0; i < 300; i++) {
    s.run.event = null;
    s.run.chance = 10;
    assert.ok(game.drawEvent(s, rng));
    const ev = s.run.event;
    if (ev.kind === 'event') game.EVENTS.filter((entry) => entry.id === ev.id)[0].layers.forEach((layer) => layers.add(layer));
  }
  assert.strictEqual(layers.size, 3);
  s.run.event = null;
  // 踏天后期还有一场终劫：灵气满了也不算圆满，渡过才算；不破境、不加寿元，之后再没有天劫。
  const last = game.REALMS.length - 1;
  s.run.realm = last;
  s.run.stage = game.STAGES.length - 1;
  s.run.qi = 0;
  s.run.stats = { edge: 3000, body: 3000, mind: 3000 };
  const waiting = game.tribulationInfo(s);
  assert.ok(waiting.final && waiting.wall && !waiting.ready);
  assert.strictEqual(waiting.name, '终劫');
  assert.strictEqual(waiting.failYears, game.TRIBS[last].failYears);
  assert.strictEqual(game.realmText(s.run), '踏天后期');
  const late = game.wickGain(s, 'retire');
  s.run.qi = game.qiCap(s);
  assert.strictEqual(game.isPerfect(s), false);
  assert.strictEqual(game.wickGain(s, 'retire'), late);
  const lifeBefore = game.maxLife(s);
  const done = game.attemptTribulation(s, () => 0, 'endure');
  assert.ok(done.success && done.broke && !done.dead);
  assert.ok(s.run.ascended && game.isPerfect(s));
  assert.strictEqual(s.run.realm, last);
  assert.strictEqual(game.maxLife(s), lifeBefore);
  assert.strictEqual(game.realmText(s.run), '踏天圆满');
  assert.strictEqual(game.tribulationInfo(s), null);
  assert.strictEqual(game.tribGear(s).need, 0);
  assert.ok(game.wickGain(s, 'retire') > late);
  const saved = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(saved.run.realm, last);
  assert.strictEqual(saved.run.ascended, true);
  // 没到踏天后期的存档带着这个标记也不认。
  const forged = JSON.parse(JSON.stringify(s));
  forged.run.realm = last - 1;
  assert.strictEqual(game.normalizeState(forged, 0, () => 0).run.ascended, false);
});

test('大关：阴虚劫、空涅劫、踏天劫和终劫三项全考，要求比前后的天劫高出一截，失败折寿重得多', () => {
  const walls = game.TRIBS.filter((trib) => trib.wall).map((trib) => trib.name);
  assert.deepStrictEqual(walls, ['阴虚劫', '空涅劫', '踏天劫', '终劫']);
  const plain = game.TRIBS.filter((trib) => !trib.wall && !trib.bolts && !trib.seaTrial);
  for (let i = 1; i < plain.length; i++) assert.ok(plain[i].req > plain[i - 1].req, plain[i].name);
  const s = cultivator(400, 400, 400);
  const plan = game.tribPlan(s);
  game.TRIBS.forEach((trib, i) => {
    if (!trib.wall) return;
    const before = game.TRIBS[i - 1];
    const after = game.TRIBS[i + 1];
    assert.ok(trib.req > before.req && trib.gear > before.gear && trib.failYears > (before.wall ? 1 : 2) * before.failYears, trib.name);
    if (after && !after.wall) assert.ok(trib.req > after.req && trib.gear > after.gear && trib.failYears > 2 * after.failYears, trib.name);
    assert.strictEqual(plan[i].aspect, '');
    assert.deepStrictEqual(plan[i].tests, ['edge', 'body', 'mind']);
    assert.strictEqual(plan[i].req, trib.req);
  });
  // 只堆一项属性过不了大关：另外两项不够，成功率上不去。
  s.run.realm = game.TRIBS.findIndex((trib) => trib.name === '阴虚劫');
  s.run.stage = game.STAGES.length - 1;
  s.run.qi = game.qiCap(s);
  ['weapon', 'armor', 'crown', 'boots', 'charm', 'ring'].forEach((slot, i) => {
    s.run.gear.worn[slot] = { uid: i + 1, slot: slot, grade: 6, tier: 40, level: 5, affixes: [] };
  });
  s.run.stats = { edge: 5000, body: 100, mind: 100 };
  const lopsided = game.tribulationInfo(s);
  assert.ok(lopsided.wall && !lopsided.final && !lopsided.gear.short);
  s.run.stats = { edge: 700, body: 700, mind: 700 };
  const even = game.tribulationInfo(s);
  assert.ok(even.chance > lopsided.chance + 0.3, lopsided.chance + ' / ' + even.chance);
  assert.strictEqual(even.failYears, game.TRIBS[s.run.realm].failYears);
});

test('装备扩充：六个槽位、七个品级、十三种词条，高品级要到后面的关才掉', () => {
  assert.deepStrictEqual(gear.SLOTS.map((slot) => slot.name), ['兵', '衣', '冠', '靴', '佩', '戒']);
  assert.deepStrictEqual(gear.GRADES.map((grade) => grade.name), ['凡', '灵', '玄', '天', '仙', '神', '道']);
  assert.strictEqual(gear.AFFIXES.length, 13);
  gear.SLOTS.forEach((slot) => assert.strictEqual(slot.names.length, gear.GRADES.length));
  gear.GRADES.forEach((grade, i) => assert.strictEqual(grade.affixes, i));
  // 每种词条都落在一项战斗加成上，并写得出说明。
  gear.AFFIXES.forEach((affix) => {
    const s = gear.stats({ slot: 'weapon', grade: 1, tier: 9, level: 0, affixes: [affix.id] });
    assert.ok(s[affix.key] > 0, affix.id);
    assert.ok(gear.statsText(s).split('，').length === 2, affix.id);
  });
  assert.ok(gear.stats({ slot: 'crown', grade: 2, tier: 9, level: 0, affixes: [] }).reduce > 0);
  assert.ok(gear.stats({ slot: 'boots', grade: 2, tier: 9, level: 0, affixes: [] }).haste > 0);
  assert.ok(gear.stats({ slot: 'ring', grade: 2, tier: 9, level: 0, affixes: [] }).critDmg > 0);
  const top = (tier) => {
    const rng = battle.seeded(5);
    let best = 0;
    const slots = new Set();
    for (let i = 0; i < 4000; i++) {
      const item = gear.roll(tier, rng, false);
      best = Math.max(best, item.grade);
      slots.add(item.slot);
    }
    assert.strictEqual(slots.size, gear.SLOTS.length);
    return best;
  };
  assert.strictEqual(top(10), 3);
  assert.strictEqual(top(30), 4);
  assert.strictEqual(top(60), 5);
  assert.strictEqual(top(120), 6);
});

test('新词条在战斗里生效：暴击伤害、吸血、反伤、回血、护盾、破甲、招式减伤、连击', () => {
  const foe = dummy({ hp: 3000, atk: 30, interval: 1, reduce: 0.5, skill: { name: '重击', every: 4, mult: 3 } });
  const run = (bonus, rng) => battle.simulate(player({ edge: 10, body: 30, mind: 0 }, {}, { gear: bonus }), foe, rng || (() => 0.5));
  const base = run({});
  const sum = (fight, kind) => kinds(fight, kind).reduce((total, entry) => total + entry.value, 0);
  const myHits = (fight) => fight.timeline.filter((entry) => entry.who === 'me' && entry.kind === 'hit');
  // 暴击伤害：随机数取 0 时每一下都暴击。
  const critBase = run({}, () => 0);
  const critUp = run({ critDmg: 0.5 }, () => 0);
  assert.ok(kinds(critUp, 'crit')[0].value > kinds(critBase, 'crit')[0].value);
  // 破甲：敌人 50% 减伤削掉 20 个点，伤害是原来的 1.4 倍。
  assert.strictEqual(myHits(run({ pierce: 0.2 }))[0].value, Math.round(myHits(base)[0].value * 1.4));
  // 吸血：同一场打赢的架，收场时剩的气血更多。
  const soft = dummy({ hp: 300, atk: 12, interval: 1 });
  const duel = (bonus) => battle.simulate(player({ edge: 10, body: 30, mind: 0 }, {}, { gear: bonus }), soft, () => 0.5);
  assert.ok(duel({}).win);
  assert.ok(duel({ leech: 0.2 }).me.hp > duel({}).me.hp);
  assert.strictEqual(kinds(base, 'thorns').length, 0);
  assert.ok(kinds(run({ thorns: 0.1 }), 'thorns').length > 0);
  assert.strictEqual(kinds(base, 'heal').length, 0);
  const regen = run({ regen: 0.02 });
  assert.ok(kinds(regen, 'heal').length > 0);
  assert.strictEqual(kinds(regen, 'heal')[0].t, 5);
  const shield = run({ shield: 0.1 });
  assert.strictEqual(shield.timeline[0].kind, 'shield');
  assert.strictEqual(shield.timeline[0].value, Math.round(shield.me.max * 0.1));
  assert.ok(sum(run({ guard: 0.5 }), 'skill') < sum(base, 'skill') * 0.7 * kinds(run({ guard: 0.5 }), 'skill').length / kinds(base, 'skill').length);
  assert.strictEqual(kinds(base, 'extra').length, 0);
  // 连击：随机数取 0 时每次出手都多打一下。
  const combo = run({ combo: 0.05 }, () => 0);
  const mains = combo.timeline.filter((entry) => entry.who === 'me' && entry.text === '连击').length;
  assert.ok(mains > 0);
});

test('机缘里得装备：补装备分最低的槽位，阶比过的最远一关高，品级多掷几次；锻材有上限', () => {
  // 指定槽位时不再掷槽位；给了次数就掷那么多次取最高的。
  const fine = gear.roll(20, seq([0, 0.99, 0]), 3, 'ring');
  assert.strictEqual(fine.slot, 'ring');
  assert.strictEqual(fine.grade, 3);
  assert.strictEqual(gear.roll(20, seq([0, 0, 0.99]), true).grade, 3);
  assert.strictEqual(gear.roll(20, seq([0, 0, 0.99]), false).grade, 0);

  const s = cultivator(20, 20, 20);
  s.run.battle.cleared = 10;
  const put = (id, index) => {
    s.run.event = { kind: 'event', id: id, rerolls: 0 };
    return game.choose(s, index, () => 0.5);
  };
  const first = put('a_battlefield', 0);
  assert.ok(first.tags.includes('gear'));
  assert.ok(first.lines.some((line) => /^得.+，已穿上$/.test(line)));
  for (let i = 0; i < 5; i++) put('a_battlefield', 0);
  let view = game.gearView(s);
  assert.ok(view.worn.every((slot) => slot.item && slot.item.tier === 13));
  assert.strictEqual(view.pack.length, 0);

  // 冠最弱，下一件就补冠；“上好的装备”阶再高一截。
  s.run.gear.worn.crown = { uid: 99, slot: 'crown', grade: 0, tier: 1, level: 0, affixes: [] };
  s.run.qi = game.qiCap(s);
  const next = put('a_pawn', 1);
  assert.ok(next.lines.some((line) => line.indexOf('（冠）') > 0 && line.indexOf('比身上的好') > 0));
  view = game.gearView(s);
  assert.strictEqual(view.pack.length, 1);
  assert.strictEqual(view.pack[0].slot, 'crown');
  assert.strictEqual(view.pack[0].tier, 16);
  assert.ok(game.gearHasBetter(s));

  assert.ok(put('a_battlefield', 1).lines.indexOf('锻材 +5') >= 0);
  assert.strictEqual(s.run.gear.forge, 5);
  s.run.gear.forge = 97;
  assert.ok(put('a_battlefield', 1).lines.indexOf('锻材 +2') >= 0);
  assert.strictEqual(s.run.gear.forge, 99);
  assert.ok(put('a_battlefield', 1).lines.indexOf('锻材已满') >= 0);

  // 选项说明和结算用同一份数据。
  s.run.event = { kind: 'event', id: 'a_pawn', rerolls: 0 };
  assert.ok(game.eventView(s).options[1].desc.indexOf('得一件上好的装备') >= 0);
});

test('香火随本世首通和储物袋结算，重打与重复收取不发放', () => {
  const s = cultivator(13, 13, 13);
  const first = game.trainClear(s, 1, () => 0);
  assert.strictEqual(first.incense, 10);
  assert.ok(first.drop.worn);
  for (let stage = 2; stage <= 5; stage++) {
    assert.strictEqual(game.trainClear(s, stage, () => 0).incense, stage === 5 ? 10 : 4);
  }
  assert.strictEqual(s.run.incense, 32);
  game.trainLose(s, 6);
  for (let stage = 4; stage <= 5; stage++) assert.ok(game.trainClear(s, stage, () => 0).again);
  assert.strictEqual(s.run.incense, 32);
  s.run.battle.loot = 2.5;
  assert.strictEqual(game.trainCollect(s, () => 0).incense, 8);
  assert.strictEqual(game.trainCollect(s, () => 0), null);
  assert.strictEqual(s.run.incense, 40);
});

function putAwayStars(s) {
  s.run.starCards.forEach((card) => { card.shown = true; });
  assert.ok(game.finishStarDraw(s));
}

test('仙星十连九折且与单抽逐张共用两档保底，未揭完不能重复扣费', () => {
  const s = cultivator(13, 13, 13);
  s.run.incense = 89;
  const before = JSON.stringify(s);
  for (const count of [0, 2, 10, -1, '1']) assert.strictEqual(game.starDraw(s, count, () => 0), false);
  assert.strictEqual(JSON.stringify(s), before);
  s.run.incense = 1000;
  for (let i = 0; i < 8; i++) {
    assert.ok(game.starDraw(s, 1, () => 0));
    putAwayStars(s);
  }
  assert.ok(game.starDraw(s, 10, () => 0));
  assert.strictEqual(s.run.incense, 830);
  assert.deepStrictEqual(s.run.starCards.map((card) => card.item.grade), [0, 3, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepStrictEqual([s.run.starDry, s.run.starGoldDry], [8, 18]);
  assert.ok(!game.starDraw(s, 1, () => 0));
  assert.ok(!game.finishStarDraw(s));
  assert.strictEqual(s.run.incense, 830);
  putAwayStars(s);
  for (let i = 0; i < 3; i++) {
    game.starDraw(s, 10, () => 0);
    putAwayStars(s);
  }
  game.starDraw(s, 10, () => 0);
  assert.strictEqual(s.run.starCards[1].item.grade, 4);
  assert.deepStrictEqual([s.run.starDry, s.run.starGoldDry], [8, 8]);
  putAwayStars(s);
  game.starDraw(s, 1, () => 0.99);
  assert.deepStrictEqual([s.run.starDry, s.run.starGoldDry], [0, 0]);
});

test('仙星七品都可抽，按最终品级生成词条，天品以下直接化为实际能容纳的锻材', () => {
  const rolls = [0.2, 0.5, 0.8, 0.9, 0.98, 0.996, 0.9995];
  for (let grade = 0; grade < rolls.length; grade++) {
    const s = cultivator(13, 13, 13);
    s.run.battle.cleared = 12;
    s.run.incense = 10;
    s.run.gear.forge = 98;
    if (grade === 6) s.run.starGoldDry = 49;
    assert.ok(game.starDraw(s, 1, () => rolls[grade]));
    const card = s.run.starCards[0];
    assert.deepStrictEqual([card.item.grade, card.item.tier, card.item.affixes.length], [grade, 12, grade]);
    assert.strictEqual(s.run.gear.pack.length, 0);
    if (grade < 3) {
      assert.strictEqual(s.run.gear.worn[card.item.slot], null);
      assert.deepStrictEqual([card.place, card.forge, s.run.gear.forge], ['forge', 1, 99]);
      putAwayStars(s);
      s.run.incense = 10;
      game.starDraw(s, 1, () => rolls[grade]);
      assert.strictEqual(s.run.starCards[0].forge, 0);
    } else {
      assert.strictEqual(card.place, 'worn');
      assert.strictEqual(s.run.gear.worn[card.item.slot].grade, grade);
    }
  }
});

test('满包时仙星保留高品，读档和分批收取都不会重复发奖', () => {
  let s = cultivator(13, 13, 13);
  s.run.incense = 90;
  const plain = () => gear.makeItem(1, 0, () => 0, 'ring');
  s.run.gear.worn.ring = plain();
  s.run.gear.pack = Array.from({ length: game.GEAR_PACK_MAX }, plain);
  assert.ok(game.starDraw(s, 10, () => 0.9995));
  assert.ok(s.run.starCards.every((card) => card.place === 'held' && card.item.grade === 6));
  assert.strictEqual(s.run.gear.forge, 0);
  s.run.starCards.forEach((card) => { card.shown = true; });
  s = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.strictEqual(s.run.incense, 0);
  assert.strictEqual(game.finishStarDraw(s), false);
  game.gearScrap(s, s.run.gear.pack[0].uid);
  assert.strictEqual(game.finishStarDraw(s), false);
  assert.strictEqual(s.run.gear.pack.filter((item) => item.grade === 6).length, 1);
  assert.strictEqual(s.run.starCards.filter((card) => card.place === 'held').length, 9);
  s.run.gear.pack.slice(0, 9).forEach((item) => game.gearScrap(s, item.uid));
  assert.ok(game.finishStarDraw(s));
  assert.strictEqual(s.run.gear.pack.filter((item) => item.grade === 6).length, 10);
  assert.ok(!game.finishStarDraw(s));
});

test('旧档按本世关数补香火一次，同世读档保留未揭牌，轮回清空香火和两档保底', () => {
  const old = cultivator(13, 13, 13);
  old.trainBest = 80;
  old.run.battle.cleared = 12;
  delete old.run.incense;
  const s = game.normalizeState(old, 0, () => 0);
  assert.strictEqual(s.run.incense, 66);
  assert.ok(game.starDraw(s, 1, () => 0));
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), 0, () => 0);
  assert.deepStrictEqual([loaded.run.incense, loaded.run.starDry, loaded.run.starGoldDry], [56, 1, 1]);
  assert.deepStrictEqual(loaded.run.starCards, s.run.starCards);
  assert.strictEqual(loaded.run.gear.forge, 1);
  s.run.incense = 0;
  assert.strictEqual(game.normalizeState(s, 0, () => 0).run.incense, 0);
  assert.ok(game.retire(loaded));
  assert.ok(!game.starDraw(loaded, 1, () => 0));
  assert.ok(game.reincarnate(loaded, 0, () => 0));
  const newborn = game.normalizeState(loaded, 0, () => 0);
  assert.deepStrictEqual([newborn.run.incense, newborn.run.starDry, newborn.run.starGoldDry, newborn.run.starCards.length], [0, 0, 0, 0]);
  assert.ok(!game.starDraw(newborn, 1, () => 0));
});
