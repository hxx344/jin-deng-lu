// 战斗内核：不依赖游戏状态和微信接口。给定双方和随机数，一次算完整场，返回可回放的时间轴。
// 时间以 0.1 秒为一步，用整数步计，避免浮点误差让同一个种子算出不同结果。
const STEP = 0.1;
const MAX_STEPS = 600;
const BASE_HP = 60;
const HP_PER_BODY = 12;
const ATK_PER_EDGE = 2;
const BASE_INTERVAL = 1.6;
const MIN_INTERVAL = 1;
const MAX_REDUCE = 0.8;
// 装备词条的上限和节奏。
const MAX_LEECH = 0.3;
const MAX_PIERCE = 0.6;
const MAX_GUARD = 0.6;
const MAX_COMBO = 0.4;
const REGEN_EVERY = 5;
// 神每达到软上限的一成，出手快这么多。
const HASTE_PER_TENTH = 0.02;
const BASE_CRIT = 0.05;
const CRIT_PER_CAP = 0.2;
const MAX_CRIT = 0.5;
const CRIT_MULT = 1.5;
const SPREAD = 0.2;
// 每 10 点心魔：攻击和受到的伤害都加这么多；魔修再各加一份 DEMON_MODE。
const DEMON_STEP = 0.03;
const DEMON_MODE = 0.2;

// 五系功法在战斗里各是一种打法。p 是这一系的威力：每门功法按品级 1 至 4 计（道途倍率照算），秘法约 9.6。
const SWORD_EVERY = 3;
const swordExtra = (p) => Math.min(2, 0.3 + 0.1 * p);
const SWORD_EXECUTE = 0.2;
const PILL_EVERY = 8;
const pillHeal = (p) => Math.min(0.15, 0.03 + 0.01 * p);
const PILL_REVIVE = 0.3;
const talismanSeconds = (p) => Math.min(12, 4 + p);
const TALISMAN_SLOW = 1.3;
const TALISMAN_BREAK = 0.2;
const TALISMAN_SEAL = 0.25;
const bodyThorns = (p) => Math.min(0.3, 0.05 + 0.02 * p);
const BODY_SHIELD = 0.2;
const BODY_GUARD = 0.3;
const luckDouble = (p) => Math.min(0.25, 0.08 + 0.02 * p);
const CURSES = [
  { id: 'slow', name: '缓' },
  { id: 'break', name: '破甲' },
  { id: 'seal', name: '封招' }
];

function num(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ratio(value, cap) {
  return value / (value + cap);
}

// input: { name, attrs: { edge, body, mind }, softCap, demon, demonMode, schools: { 流派: { count, power } }, gear }
// gear 是装备加成（见 gear.js 的 STAT_KEYS），可以不给。boost 是破境加成，气血和攻击最后各乘一次，不给按 1 算。
function playerFighter(input) {
  const cap = Math.max(1, num(input.softCap));
  const edge = num(input.attrs.edge);
  const body = num(input.attrs.body);
  const mind = num(input.attrs.mind);
  const rage = DEMON_STEP * Math.floor(num(input.demon) / 10) + (input.demonMode ? DEMON_MODE : 0);
  const schools = {};
  Object.keys(input.schools || {}).forEach((id) => {
    const school = input.schools[id];
    if (school && school.count > 0) schools[id] = { count: school.count, power: num(school.power) };
  });
  const boost = Math.max(1, num(input.boost));
  const extra = {};
  ['atk', 'hp', 'atkPct', 'hpPct', 'crit', 'critDmg', 'reduce', 'haste', 'leech', 'thorns', 'regen', 'shield', 'pierce', 'guard', 'combo'].forEach((key) => {
    extra[key] = num(input.gear && input.gear[key]);
  });
  return {
    name: input.name || '你',
    hp: Math.round((BASE_HP + body * HP_PER_BODY + extra.hp) * (1 + extra.hpPct) * boost),
    atk: (Math.max(1, edge * ATK_PER_EDGE) + extra.atk) * (1 + extra.atkPct) * (1 + rage) * boost,
    interval: Math.max(MIN_INTERVAL, BASE_INTERVAL * (1 - HASTE_PER_TENTH * Math.floor(mind / (cap * 0.1))) * (1 - Math.min(0.5, extra.haste))),
    reduce: Math.min(MAX_REDUCE, ratio(body, cap) + extra.reduce),
    crit: Math.min(MAX_CRIT, BASE_CRIT + CRIT_PER_CAP * mind / cap + extra.crit),
    critMult: CRIT_MULT + extra.critDmg,
    leech: Math.min(MAX_LEECH, extra.leech),
    thorns: extra.thorns,
    regen: extra.regen,
    shield: extra.shield,
    pierce: Math.min(MAX_PIERCE, extra.pierce),
    guard: Math.min(MAX_GUARD, extra.guard),
    combo: Math.min(MAX_COMBO, extra.combo),
    resist: ratio(mind, cap),
    taken: 1 + rage,
    schools: schools
  };
}

// def 是 content.js 里的一行敌人；scale 是气血和攻击的倍率（重天）。
function foeFighter(def, scale) {
  const mult = scale || 1;
  return {
    name: def.name,
    hp: Math.round(def.hp * mult),
    atk: def.atk * mult,
    interval: def.interval,
    reduce: def.reduce || 0,
    crit: 0,
    resist: def.resist || 0,
    taken: 1,
    schools: {},
    skill: def.skill || null
  };
}

function steps(seconds) {
  return Math.max(1, Math.round(seconds / STEP));
}

function simulate(me, foe, rng) {
  const sides = {
    me: { def: me, hp: me.hp, max: me.hp, shield: 0, next: steps(me.interval), hits: 0, revived: false },
    foe: { def: foe, hp: foe.hp, max: foe.hp, shield: 0, next: steps(foe.interval), hits: 0, revived: false }
  };
  const mine = sides.me;
  const theirs = sides.foe;
  const school = (id) => me.schools[id] || null;
  const bond = (id, n) => !!(me.schools[id] && me.schools[id].count >= n);
  const timeline = [];
  let now = 0;
  const push = (who, kind, value, text) => {
    timeline.push({ t: now, who: who, kind: kind, value: value || 0, text: text, me: Math.max(0, Math.round(mine.hp)), foe: Math.max(0, Math.round(theirs.hp)), shield: Math.round(mine.shield) });
  };
  // 敌方身上的异常：id → 到第几步为止。
  const curse = { id: '', until: 0 };
  const cursed = (id) => curse.id === id && now < curse.until;

  const hurt = (target, amount) => {
    let left = Math.max(1, Math.round(amount));
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, left);
      target.shield -= absorbed;
      left -= absorbed;
    }
    target.hp -= left;
    return left;
  };

  const strike = (from, to, mult, forceCrit) => {
    const attacker = sides[from];
    const target = sides[to];
    const crit = forceCrit || rng() < attacker.def.crit;
    let reduce = target.def.reduce;
    if (to === 'me' && bond('body', 4)) reduce = Math.min(0.9, reduce + BODY_GUARD * (1 - mine.hp / mine.max));
    let taken = target.def.taken;
    if (to === 'foe' && cursed('break')) taken += TALISMAN_BREAK;
    if (attacker.def.pierce) reduce = Math.max(0, reduce - attacker.def.pierce);
    const raw = attacker.def.atk * mult * (1 - SPREAD / 2 + SPREAD * rng()) * (crit ? attacker.def.critMult || CRIT_MULT : 1);
    const dealt = hurt(target, raw * (1 - reduce) * taken);
    if (attacker.def.leech && attacker.hp > 0) attacker.hp = Math.min(attacker.max, attacker.hp + dealt * attacker.def.leech);
    return { dealt: dealt, crit: crit };
  };

  const shieldRate = (school('body') && bond('body', 2) ? BODY_SHIELD : 0) + (me.shield || 0);
  if (shieldRate > 0) {
    mine.shield = Math.round(mine.max * shieldRate);
    push('me', 'shield', mine.shield, '气血凝成一层护盾');
  }
  if (school('talisman')) {
    if (rng() < foe.resist) {
      push('me', 'resist', 0, '一张符贴上去，被' + foe.name + '抖掉了');
    } else {
      const pickCurse = CURSES[Math.floor(rng() * CURSES.length)];
      const seconds = talismanSeconds(school('talisman').power) * (bond('talisman', 2) ? 1.5 : 1);
      curse.id = pickCurse.id;
      curse.until = steps(seconds);
      if (pickCurse.id === 'slow') theirs.next = steps(foe.interval * TALISMAN_SLOW);
      push('me', 'curse', Math.round(seconds), '一张符贴上去：' + foe.name + '中了「' + pickCurse.name + '」');
    }
  }
  const pillEvery = steps(PILL_EVERY);
  const regenEvery = steps(REGEN_EVERY);
  const skillEvery = foe.skill ? steps(foe.skill.every) : 0;

  const down = () => {
    if (theirs.hp <= 0) return 'foe';
    if (mine.hp > 0) return '';
    if (bond('pill', 4) && !mine.revived) {
      mine.revived = true;
      mine.hp = Math.round(mine.max * PILL_REVIVE);
      push('me', 'revive', mine.hp, '含在舌下的丹药化开，又站了起来');
      return '';
    }
    return 'me';
  };

  let loser = '';
  for (now = 1; now <= MAX_STEPS; now++) {
    if (now === mine.next) {
      mine.hits++;
      const double = school('luck') && rng() < luckDouble(school('luck').power);
      const hit = strike('me', 'foe', double ? 2 : 1, false);
      push('me', hit.crit ? 'crit' : (double ? 'double' : 'hit'), hit.dealt, double ? '铜钱落地是正面，这一下算两下' : '');
      if (me.combo && theirs.hp > 0 && rng() < me.combo) {
        const again = strike('me', 'foe', 1, false);
        push('me', again.crit ? 'crit' : 'extra', again.dealt, '连击');
      }
      if (school('sword') && mine.hits % SWORD_EVERY === 0 && theirs.hp > 0) {
        const extra = strike('me', 'foe', swordExtra(school('sword').power), bond('sword', 2));
        push('me', 'extra', extra.dealt, '顺势追了一剑');
      }
      if (bond('sword', 4) && theirs.hp > 0 && theirs.hp <= theirs.max * SWORD_EXECUTE) {
        const rest = theirs.hp;
        theirs.hp = 0;
        push('me', 'execute', rest, '一剑收尾');
      }
      mine.next = now + steps(me.interval);
      loser = down();
    }
    if (!loser && pillEvery && school('pill') && now % pillEvery === 0 && mine.hp < mine.max) {
      const heal = Math.min(mine.max - mine.hp, Math.round(mine.max * pillHeal(school('pill').power) * (bond('pill', 2) ? 1.5 : 1)));
      mine.hp += heal;
      push('me', 'heal', heal, '吞了一粒丹');
    }
    if (!loser && me.regen && now % regenEvery === 0 && mine.hp < mine.max) {
      const heal = Math.min(mine.max - mine.hp, Math.round(mine.max * me.regen));
      mine.hp += heal;
      push('me', 'heal', heal, '气血回转');
    }
    if (!loser && now === theirs.next) {
      theirs.hits++;
      const hit = strike('foe', 'me', 1, false);
      push('foe', 'hit', hit.dealt, '');
      const thorns = (school('body') ? bodyThorns(school('body').power) : 0) + (me.thorns || 0);
      if (thorns > 0 && hit.dealt > 0 && mine.hp > 0) {
        const back = hurt(theirs, hit.dealt * thorns);
        push('me', 'thorns', back, '');
      }
      theirs.next = now + steps(foe.interval * (cursed('slow') ? TALISMAN_SLOW : 1));
      loser = down();
    }
    if (!loser && skillEvery && now % skillEvery === 0) {
      if (cursed('seal') || (bond('talisman', 4) && rng() < TALISMAN_SEAL)) {
        push('foe', 'sealed', 0, foe.name + '的「' + foe.skill.name + '」被封住了');
      } else {
        const hit = strike('foe', 'me', foe.skill.mult * (1 - (me.guard || 0)), false);
        push('foe', 'skill', hit.dealt, foe.name + '使出「' + foe.skill.name + '」');
        loser = down();
      }
    }
    if (loser) break;
  }
  now = Math.min(now, MAX_STEPS);
  const timeout = !loser;
  const win = loser === 'foe';
  push(win ? 'me' : 'foe', 'end', 0, win ? foe.name + '倒下了' : (timeout ? '久战不下，只好退走' : '你撑不住了'));
  return {
    win: win,
    timeout: timeout,
    seconds: Math.round(now * STEP * 10) / 10,
    timeline: timeline.map((entry) => Object.assign(entry, { t: Math.round(entry.t * STEP * 10) / 10 })),
    me: { name: me.name, max: mine.max, hp: Math.max(0, Math.round(mine.hp)) },
    foe: { name: foe.name, max: theirs.max, hp: Math.max(0, Math.round(theirs.hp)) }
  };
}

// 估胜率用的固定随机序列，保证同一个局面每次估出来一样。
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function estimate(me, foe, rounds) {
  const total = rounds || 40;
  const rng = seeded(20261120);
  let wins = 0;
  for (let i = 0; i < total; i++) {
    if (simulate(me, foe, rng).win) wins++;
  }
  return wins / total;
}

module.exports = { playerFighter, foeFighter, simulate, estimate, seeded, MAX_SECONDS: MAX_STEPS * STEP };
