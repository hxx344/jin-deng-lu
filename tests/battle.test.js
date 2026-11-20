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
  assert.deepStrictEqual(old.run.battle, { cleared: 0, bag: 0, loot: 0 });
  assert.strictEqual(old.trainBest, 0);
  const legacy = game.normalizeState({ trainBest: 3, run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: 12, bag: 99, pending: { stage: 2, win: true } } } }, 0, () => 0);
  assert.strictEqual(legacy.run.battle.cleared, 12);
  assert.ok(Math.abs(legacy.run.battle.bag - game.trainRate(legacy) * game.TRAIN_BAG_HOURS) < 1e-9);
  assert.deepStrictEqual(Object.keys(legacy.run.battle).sort(), ['bag', 'cleared', 'loot']);
  assert.strictEqual(legacy.trainBest, 12);
  const broken = game.normalizeState({ run: { phase: 'alive', root: 'talisman', realm: 1, battle: { cleared: -4, bag: 'x' } } }, 0, () => 0);
  assert.deepStrictEqual(broken.run.battle, { cleared: 0, bag: 0, loot: 0 });

  const s = cultivator(30, 30, 30);
  game.trainClear(s, 1);
  game.advance(s, s.lastTime + 600 * 1000);
  const loaded = game.normalizeState(JSON.parse(JSON.stringify(s)), s.lastTime, () => 0);
  assert.strictEqual(loaded.run.battle.cleared, 1);
  assert.ok(loaded.run.battle.bag > 0);
  game.retire(loaded);
  game.reincarnate(loaded, 0, () => 0);
  assert.deepStrictEqual(loaded.run.battle, { cleared: 0, bag: 0, loot: 0 });
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
  assert.strictEqual(gear.score(low), 4);
  const high = { slot: 'weapon', grade: 3, tier: 9, level: 5, affixes: ['atk', 'crit', 'haste'] };
  assert.strictEqual(gear.stats(high).atk, Math.round(6.5 * 2.5 * 1.5));
  assert.strictEqual(gear.score(high), 22 * 1.5 + 6);
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
  for (let stage = 1; stage <= game.TRAIN_DROP_PITY; stage++) assert.strictEqual(game.trainClear(s, stage, never).drop, null);
  const pity = game.trainClear(s, game.TRAIN_DROP_PITY + 1, never);
  assert.ok(pity.drop && pity.drop.worn);
  assert.strictEqual(pity.drop.item.tier, game.TRAIN_DROP_PITY + 1);
  const boss = game.trainClear(s, 5, never);
  assert.strictEqual(boss.boss, true);
  assert.ok(boss.drop);
  assert.ok(/得/.test(s.run.log[s.run.log.length - 1].text));
  assert.ok(game.gearScore(s) > 0);
  const power = game.combatPowerDetails(s);
  assert.strictEqual(power.sources.filter((source) => source.id === 'gear')[0].value, game.gearScore(s));

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
