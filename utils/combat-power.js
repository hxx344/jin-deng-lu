const { REALMS, STAGES } = require('./content');

const ATTRIBUTE_WEIGHTS = { edge: 1.2, body: 1.1, mind: 1.1 };
const OVER_CAP_WEIGHT = 0.55;
const BALANCE_WEIGHT = 0.25;
// 凡、灵、玄、天品，之后是藏经阁的仙、神、道品。
const MASTERY_BY_GRADE = [2, 4, 7, 11, 16, 22, 29];
const ARCANE_MASTERY = 29;
const BOND_BY_COUNT = { two: 4, four: 10 };
const UNBORN_OPPONENT_POWER = 8;
const MAX_WICK_BONUS = 0.15;
const WICK_LOG_RATE = 0.03;
const MAX_ATTRIBUTE = Math.floor(Number.MAX_SAFE_INTEGER / 8);

function masteryPower(level, arcane) {
  return arcane ? ARCANE_MASTERY : MASTERY_BY_GRADE[level - 1];
}

function bondPower(count) {
  if (count >= 4) return BOND_BY_COUNT.four;
  return count >= 2 ? BOND_BY_COUNT.two : 0;
}

function attributePower(attributes, softCap) {
  const keys = Object.keys(ATTRIBUTE_WEIGHTS);
  const effective = keys.map((key) => {
    const value = Number.isFinite(attributes[key]) ? Math.max(0, Math.min(attributes[key], MAX_ATTRIBUTE)) : 0;
    return Math.min(value, softCap) + Math.max(0, value - softCap) * OVER_CAP_WEIGHT;
  });
  return keys.reduce((sum, key, i) => sum + effective[i] * ATTRIBUTE_WEIGHTS[key], 0) +
    Math.min(...effective) * BALANCE_WEIGHT;
}

// 所有来源独立取整后再求和，破境加成再按合计乘出来单列一项。新玩法在调用侧提供带固定 id 的加减项。
function powerProfile(realm, stage, attributes, extraSources = []) {
  const sources = [
    { id: 'realm', label: '境界', value: realm.power.base * stage.power },
    { id: 'attributes', label: '锋 · 躯 · 神', value: attributePower(attributes, realm.power.softCap) },
    ...extraSources
  ].map((source) => ({
    id: source.id,
    label: source.label,
    value: Number.isFinite(source.value) ? Math.round(source.value) : 0
  }));
  const mult = realm.power.mult || 1;
  const flat = sources.reduce((sum, source) => sum + source.value, 0);
  if (mult > 1) {
    sources.push({ id: 'boost', label: '破境加成 ×' + mult.toFixed(2), value: Math.round(Math.max(0, flat) * (mult - 1)) });
  }
  const total = sources.reduce((sum, source) => sum + source.value, 0);
  return { total: Math.max(0, total), sources: sources };
}

// 排行榜沿用历史最高境界和累计灯芯，估算角色在该境界的战力。
function opponentRealm(row) {
  const index = Math.floor(Number(row.realmIndex));
  if (row.realmIndex == null || row.realmIndex === '' || !Number.isFinite(index) || index < 0) return null;
  const knownIndex = Math.min(index, REALMS.length * STAGES.length - 1);
  return { realm: REALMS[Math.floor(knownIndex / STAGES.length)], knownIndex: knownIndex };
}

// 榜上这一行所在境界的破境加成；论道积分按除掉它的战力算，免得积分跟着境界翻倍。
function opponentBoost(row) {
  const known = opponentRealm(row);
  return known ? known.realm.power.mult || 1 : 1;
}

function estimatedOpponentPower(row) {
  const known = opponentRealm(row);
  if (!known) return UNBORN_OPPONENT_POWER;
  const knownIndex = known.knownIndex;
  const realm = known.realm;
  const stage = STAGES[knownIndex % STAGES.length];
  const attribute = realm.power.opponentAttribute * stage.power;
  const extraSources = [
    { id: 'mastery', value: realm.power.opponentMastery * stage.power },
    { id: 'bonds', value: realm.power.opponentBonds }
  ];
  const profile = powerProfile(realm, stage, { edge: attribute, body: attribute, mind: attribute }, extraSources);
  const rawWick = Number(row.totalWick);
  const wick = Number.isFinite(rawWick) ? Math.max(0, rawWick) : 0;
  const bonus = Math.min(MAX_WICK_BONUS, WICK_LOG_RATE * Math.log10(1 + wick));
  return Math.round(profile.total * (1 + bonus));
}

module.exports = { powerProfile, masteryPower, bondPower, estimatedOpponentPower, opponentBoost };
