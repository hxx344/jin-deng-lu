// 装备：不依赖游戏状态。一件装备只记 { uid, slot, grade, tier, level, affixes }，数值都由这里按规则算出来。
// 装备只在历练的战斗里起作用，不改锋躯神，所以不影响渡劫。
const SLOTS = [
  { id: 'weapon', name: '兵', names: ['柴刀', '青锋剑', '断岳刀', '照夜剑'] },
  { id: 'armor', name: '衣', names: ['粗布衣', '灵蚕袍', '玄龟甲', '天罗衣'] },
  { id: 'charm', name: '佩', names: ['铜钱串', '养魂玉', '避尘珠', '长明佩'] }
];
// score 是装备分的基础分，mult 是主属性倍率，affixes 是词条数。
const GRADES = [
  { name: '凡', color: '#8c8275', score: 4, mult: 1, affixes: 0, scrap: 1 },
  { name: '灵', color: '#3f9a7c', score: 8, mult: 1.4, affixes: 1, scrap: 2 },
  { name: '玄', color: '#5a6fd0', score: 14, mult: 1.9, affixes: 2, scrap: 4 },
  { name: '天', color: '#c98a24', score: 22, mult: 2.5, affixes: 3, scrap: 8 }
];
const AFFIXES = [
  { id: 'atk', name: '攻击', value: 0.06 },
  { id: 'hp', name: '气血', value: 0.08 },
  { id: 'crit', name: '暴击', value: 0.03 },
  { id: 'reduce', name: '减伤', value: 0.03 },
  { id: 'haste', name: '出手加快', value: 0.04 }
];
const MAX_LEVEL = 5;
const LEVEL_BONUS = 0.1;
const AFFIX_SCORE = 2;
const PACK_MAX = 20;
// 主属性随掉落时的关数（阶）涨，和敌人攻击的增长率一致。第 9 关的凡品兵器加 6.5 点攻击。
const TIER_GROWTH = 1.1;
const TIER_BASE = 9;
const WEAPON_ATK = 6.5;
const ARMOR_HP = 39;
const CHARM_ATK = 2.6;
const CHARM_HP = 15.6;
const CHARM_CRIT = [0.02, 0.04, 0.06, 0.08];
// 各品级的掉落权重：基础值加上每一阶的增量，越往后好东西越多。
const GRADE_WEIGHT = [[60, 0], [30, 0.8], [9, 0.5], [1, 0.2]];

function slotInfo(id) {
  return SLOTS.filter((slot) => slot.id === id)[0] || null;
}

function rollGrade(tier, rng) {
  const weights = GRADE_WEIGHT.map((w) => w[0] + w[1] * tier);
  let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return 0;
}

// 掉一件 tier 阶的装备。boss 为真时品级掷两次取高的。
function roll(tier, rng, boss) {
  const slot = SLOTS[Math.min(SLOTS.length - 1, Math.floor(rng() * SLOTS.length))].id;
  let grade = rollGrade(tier, rng);
  if (boss) grade = Math.max(grade, rollGrade(tier, rng));
  const pool = AFFIXES.map((affix) => affix.id);
  const affixes = [];
  for (let i = 0; i < GRADES[grade].affixes; i++) {
    affixes.push(pool.splice(Math.min(pool.length - 1, Math.floor(rng() * pool.length)), 1)[0]);
  }
  return { slot: slot, grade: grade, tier: Math.max(1, Math.floor(tier)), level: 0, affixes: affixes };
}

function strength(item) {
  return GRADES[item.grade].mult * (1 + LEVEL_BONUS * item.level) * Math.pow(TIER_GROWTH, item.tier - TIER_BASE);
}

// 一件装备给的战斗加成。
function stats(item) {
  const out = { atk: 0, hp: 0, atkPct: 0, hpPct: 0, crit: 0, reduce: 0, haste: 0 };
  const power = strength(item);
  if (item.slot === 'weapon') out.atk = Math.max(1, Math.round(WEAPON_ATK * power));
  if (item.slot === 'armor') out.hp = Math.max(1, Math.round(ARMOR_HP * power));
  if (item.slot === 'charm') {
    out.atk = Math.max(1, Math.round(CHARM_ATK * power));
    out.hp = Math.max(1, Math.round(CHARM_HP * power));
    out.crit = CHARM_CRIT[item.grade];
  }
  item.affixes.forEach((id) => {
    const affix = AFFIXES.filter((entry) => entry.id === id)[0];
    if (id === 'atk') out.atkPct += affix.value;
    else if (id === 'hp') out.hpPct += affix.value;
    else out[id] += affix.value;
  });
  return out;
}

// 身上几件加起来。
function bonus(items) {
  const out = { atk: 0, hp: 0, atkPct: 0, hpPct: 0, crit: 0, reduce: 0, haste: 0 };
  items.forEach((item) => {
    if (!item) return;
    const s = stats(item);
    Object.keys(out).forEach((key) => {
      out[key] += s[key];
    });
  });
  return out;
}

function score(item) {
  return Math.round(GRADES[item.grade].score * (1 + LEVEL_BONUS * item.level) + AFFIX_SCORE * item.affixes.length);
}

// 比较两件同槽位装备谁更好用的粗略分数。
function rating(item) {
  return strength(item) * (1 + 0.12 * item.affixes.length);
}

function enhanceCost(item) {
  return item.level >= MAX_LEVEL ? 0 : (item.level + 1) * (item.grade + 1);
}

// 分解得的锻材：品级的底数，加上强化花掉的一半。
function scrapValue(item) {
  let spent = 0;
  for (let level = 0; level < item.level; level++) spent += (level + 1) * (item.grade + 1);
  return GRADES[item.grade].scrap + Math.floor(spent / 2);
}

function percent(value) {
  return Math.round(value * 100) + '%';
}

function statsText(s) {
  const parts = [];
  if (s.atk) parts.push('攻击 +' + s.atk);
  if (s.hp) parts.push('气血 +' + s.hp);
  if (s.atkPct) parts.push('攻击 +' + percent(s.atkPct));
  if (s.hpPct) parts.push('气血 +' + percent(s.hpPct));
  if (s.crit) parts.push('暴击 +' + percent(s.crit));
  if (s.reduce) parts.push('减伤 +' + percent(s.reduce));
  if (s.haste) parts.push('出手加快 ' + percent(s.haste));
  return parts.join('，');
}

function describe(item) {
  const grade = GRADES[item.grade];
  const slot = slotInfo(item.slot);
  return {
    uid: item.uid,
    slot: item.slot,
    slotName: slot.name,
    name: slot.names[item.grade] + (item.level ? ' +' + item.level : ''),
    grade: grade.name + '品',
    color: grade.color,
    tier: item.tier,
    level: item.level,
    text: statsText(stats(item)),
    score: score(item)
  };
}

// 读档时校验一件装备；不合法返回 null。
function clean(raw) {
  if (!raw || typeof raw !== 'object' || !slotInfo(raw.slot)) return null;
  const whole = (value, max) => (Number.isInteger(value) && value >= 0 && value <= max ? value : -1);
  const grade = whole(raw.grade, GRADES.length - 1);
  const tier = whole(raw.tier, 9999);
  const level = whole(raw.level, MAX_LEVEL);
  if (grade < 0 || tier < 1 || level < 0 || !Array.isArray(raw.affixes)) return null;
  const affixes = [];
  raw.affixes.forEach((id) => {
    if (AFFIXES.some((affix) => affix.id === id) && affixes.indexOf(id) < 0 && affixes.length < GRADES[grade].affixes) affixes.push(id);
  });
  return { slot: raw.slot, grade: grade, tier: tier, level: level, affixes: affixes };
}

module.exports = { SLOTS, GRADES, AFFIXES, MAX_LEVEL, PACK_MAX, roll, stats, bonus, statsText, score, rating, enhanceCost, scrapValue, describe, clean };
