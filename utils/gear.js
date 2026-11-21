// 装备：不依赖游戏状态。一件装备只记 { uid, slot, grade, tier, level, affixes }，数值都由这里按规则算出来。
// 装备只在历练的战斗里起作用，不改锋躯神，所以不影响渡劫。
// 每个槽位的主属性：atk、hp 是第 9 关凡品的基础值，随品级、强化和阶放大；extra 是按品级查表的附带属性，不随阶变。
const SLOTS = [
  { id: 'weapon', name: '兵', atk: 6.5, names: ['柴刀', '青锋剑', '断岳刀', '照夜剑', '斩仙刃', '弑神戟', '无名剑'] },
  { id: 'armor', name: '衣', hp: 39, names: ['粗布衣', '灵蚕袍', '玄龟甲', '天罗衣', '羽化仙衣', '神骸甲', '无缝天衣'] },
  { id: 'crown', name: '冠', hp: 20, extra: 'reduce', table: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07],
    names: ['斗笠', '束发冠', '玄铁盔', '紫金冠', '朝元冠', '神目冕', '太虚冠'] },
  { id: 'boots', name: '靴', hp: 12, extra: 'haste', table: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07],
    names: ['草鞋', '踏云履', '追风靴', '登天靴', '步虚履', '缩地神靴', '无迹履'] },
  { id: 'charm', name: '佩', atk: 2.6, hp: 15.6, extra: 'crit', table: [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14],
    names: ['铜钱串', '养魂玉', '避尘珠', '长明佩', '蜕凡佩', '神血坠', '道纹佩'] },
  { id: 'ring', name: '戒', atk: 3.5, extra: 'critDmg', table: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35],
    names: ['骨戒', '聚灵戒', '玄铁指环', '天星戒', '仙蜕环', '神谕戒', '归一戒'] }
];
// score 是装备分的基础分，mult 是主属性倍率，affixes 是词条数。weight 是掉落权重：基础值加上每一阶的增量，
// 小于零按零算，所以仙品要到 11 关、神品 34 关、道品 76 关之后才会掉。
const GRADES = [
  { name: '凡', color: '#8c8275', score: 4, mult: 1, affixes: 0, scrap: 1, weight: [60, 0] },
  { name: '灵', color: '#3f9a7c', score: 8, mult: 1.4, affixes: 1, scrap: 2, weight: [30, 0.8] },
  { name: '玄', color: '#5a6fd0', score: 14, mult: 1.9, affixes: 2, scrap: 4, weight: [9, 0.5] },
  { name: '天', color: '#c98a24', score: 22, mult: 2.5, affixes: 3, scrap: 8, weight: [1, 0.2] },
  { name: '仙', color: '#b565c9', score: 32, mult: 3.2, affixes: 4, scrap: 14, weight: [-1, 0.1] },
  { name: '神', color: '#d14f45', score: 44, mult: 4, affixes: 5, scrap: 22, weight: [-2, 0.06] },
  { name: '道', color: '#2fb6c4', score: 58, mult: 5, affixes: 6, scrap: 32, weight: [-3, 0.04] }
];
// 词条。key 是加到哪一项战斗加成上；text 里的 # 换成百分比。
const AFFIXES = [
  { id: 'atk', key: 'atkPct', value: 0.06, text: '攻击 +#' },
  { id: 'hp', key: 'hpPct', value: 0.08, text: '气血 +#' },
  { id: 'crit', key: 'crit', value: 0.03, text: '暴击 +#' },
  { id: 'reduce', key: 'reduce', value: 0.03, text: '减伤 +#' },
  { id: 'haste', key: 'haste', value: 0.04, text: '出手加快 #' },
  { id: 'critDmg', key: 'critDmg', value: 0.12, text: '暴击伤害 +#' },
  { id: 'leech', key: 'leech', value: 0.03, text: '吸血 #' },
  { id: 'thorns', key: 'thorns', value: 0.06, text: '反伤 #' },
  { id: 'regen', key: 'regen', value: 0.015, text: '每 5 秒回血 #' },
  { id: 'shield', key: 'shield', value: 0.08, text: '开场护盾 #' },
  { id: 'pierce', key: 'pierce', value: 0.05, text: '破甲 #' },
  { id: 'guard', key: 'guard', value: 0.1, text: '招式伤害 -#' },
  { id: 'combo', key: 'combo', value: 0.05, text: '连击 #' }
];
const STAT_KEYS = ['atk', 'hp', 'atkPct', 'hpPct', 'crit', 'critDmg', 'reduce', 'haste', 'leech', 'thorns', 'regen', 'shield', 'pierce', 'guard', 'combo'];
const STAT_TEXT = {
  atkPct: '攻击 +#', hpPct: '气血 +#', crit: '暴击 +#', critDmg: '暴击伤害 +#', reduce: '减伤 +#', haste: '出手加快 #', leech: '吸血 #',
  thorns: '反伤 #', regen: '每 5 秒回血 #', shield: '开场护盾 #', pierce: '破甲 #', guard: '招式伤害 -#', combo: '连击 #'
};
const MAX_LEVEL = 5;
const LEVEL_BONUS = 0.1;
const AFFIX_SCORE = 2;
const TIER_SCORE = 0.05;
const PACK_MAX = 30;
// 主属性随掉落时的关数（阶）涨，和敌人攻击的增长率一致。
const TIER_GROWTH = 1.1;
const TIER_BASE = 9;

function slotInfo(id) {
  return SLOTS.filter((slot) => slot.id === id)[0] || null;
}

function rollGrade(tier, rng) {
  const weights = GRADES.map((grade) => Math.max(0, grade.weight[0] + grade.weight[1] * tier));
  let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return 0;
}

// 掉一件 tier 阶的装备。boss 为真时品级掷两次取高的，给数字就掷那么多次；slot 指定槽位，不给就随机。
function roll(tier, rng, boss, slot) {
  const at = slot && slotInfo(slot) ? slot : SLOTS[Math.min(SLOTS.length - 1, Math.floor(rng() * SLOTS.length))].id;
  let grade = rollGrade(tier, rng);
  for (let i = 1; i < (boss === true ? 2 : boss || 1); i++) grade = Math.max(grade, rollGrade(tier, rng));
  const pool = AFFIXES.map((affix) => affix.id);
  const affixes = [];
  for (let i = 0; i < GRADES[grade].affixes; i++) {
    affixes.push(pool.splice(Math.min(pool.length - 1, Math.floor(rng() * pool.length)), 1)[0]);
  }
  return { slot: at, grade: grade, tier: Math.max(1, Math.floor(tier)), level: 0, affixes: affixes };
}

function strength(item) {
  return GRADES[item.grade].mult * (1 + LEVEL_BONUS * item.level) * Math.pow(TIER_GROWTH, item.tier - TIER_BASE);
}

function emptyStats() {
  const out = {};
  STAT_KEYS.forEach((key) => {
    out[key] = 0;
  });
  return out;
}

// 一件装备给的战斗加成。
function stats(item) {
  const out = emptyStats();
  const slot = slotInfo(item.slot);
  const power = strength(item);
  if (slot.atk) out.atk = Math.max(1, Math.round(slot.atk * power));
  if (slot.hp) out.hp = Math.max(1, Math.round(slot.hp * power));
  if (slot.extra) out[slot.extra] += slot.table[item.grade];
  item.affixes.forEach((id) => {
    const affix = AFFIXES.filter((entry) => entry.id === id)[0];
    out[affix.key] += affix.value;
  });
  return out;
}

// 身上几件加起来。
function bonus(items) {
  const out = emptyStats();
  items.forEach((item) => {
    if (!item) return;
    const s = stats(item);
    STAT_KEYS.forEach((key) => {
      out[key] += s[key];
    });
  });
  return out;
}

// 装备分：品级、强化和词条定底数，阶再往上乘，每高一阶多 TIER_SCORE。这样越靠后的关掉的装备分越高，装备分才跟得上实际战力。
function score(item) {
  return Math.round((GRADES[item.grade].score * (1 + LEVEL_BONUS * item.level) + AFFIX_SCORE * item.affixes.length) * (1 + TIER_SCORE * (item.tier - 1)));
}

// 比较两件同槽位装备谁在战斗里更好用的粗略分数。
function rating(item) {
  return strength(item) * (1 + 0.12 * item.affixes.length);
}

// 比身上的好：战斗里更好用，装备分也不降。高几阶的白板装备战斗数值常常高过强化过的旧装备，装备分却更低，
// 这种各有高低的既不算更好也不算用不上，留给玩家自己定。
function better(item, worn) {
  return !worn || (rating(item) > rating(worn) && score(item) >= score(worn));
}

function spare(item, worn) {
  return !!worn && rating(item) <= rating(worn) && score(item) <= score(worn);
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
  return Math.round(value * 1000) / 10 + '%';
}

function statsText(s) {
  const parts = [];
  if (s.atk) parts.push('攻击 +' + s.atk);
  if (s.hp) parts.push('气血 +' + s.hp);
  Object.keys(STAT_TEXT).forEach((key) => {
    if (s[key]) parts.push(STAT_TEXT[key].replace('#', percent(s[key])));
  });
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

module.exports = { SLOTS, GRADES, AFFIXES, STAT_KEYS, MAX_LEVEL, PACK_MAX, roll, stats, bonus, statsText, score, rating, better, spare, enhanceCost, scrapValue, describe, clean };
