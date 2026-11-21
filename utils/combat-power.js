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

const MODULE_IDS = ['realm', 'attributes', 'mastery', 'bonds', 'gear'];

function opponentBuild(realm, stage) {
  const attribute = realm.power.opponentAttribute * stage.power;
  return {
    attributes: { edge: attribute, body: attribute, mind: attribute },
    mastery: realm.power.opponentMastery * stage.power,
    bonds: realm.power.opponentBonds,
    gear: realm.power.opponentGear || 0
  };
}

function referenceValues(realm, stage) {
  const build = opponentBuild(realm, stage);
  return {
    realm: realm.power.base * stage.power,
    attributes: attributePower(build.attributes, realm.power.softCap),
    mastery: build.mastery,
    bonds: build.bonds,
    gear: build.gear
  };
}

// 先定合计再按小数余数分配取整，免得低战力阶段各项分别四舍五入后，合计停在上一个小境界。
function roundShares(values) {
  const rounded = values.map(Math.floor);
  const left = Math.round(values.reduce((sum, value) => sum + value, 0)) - rounded.reduce((sum, value) => sum + value, 0);
  const order = values.map((value, index) => ({ index: index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < left; i++) rounded[order[i].index]++;
  return rounded;
}

// 五项养成各分一份当前境界的典型战力，实际投入高于或低于典型构筑时按比例增减。
// 破境倍率乘到每一个来源上，不再单列一项吞掉后期几乎所有战力；未知来源仍按固定加减项处理。
function powerProfile(realm, stage, attributes, extraSources = []) {
  const references = referenceValues(realm, stage);
  const referenceTotal = MODULE_IDS.reduce((sum, id) => sum + references[id], 0);
  const moduleShare = referenceTotal / MODULE_IDS.length;
  const sources = [
    { id: 'realm', label: '境界', value: realm.power.base * stage.power },
    { id: 'attributes', label: '锋 · 躯 · 神', value: attributePower(attributes, realm.power.softCap) },
    ...extraSources
  ].map((source) => {
    const raw = Number.isFinite(source.value) ? source.value : 0;
    const reference = references[source.id] || 0;
    return {
      id: source.id,
      label: source.label,
      value: reference > 0 ? moduleShare * raw / reference : raw
    };
  });
  const mult = realm.power.mult || 1;
  const flatValues = sources.map((source) => source.value);
  const flat = roundShares(flatValues).reduce((sum, value) => sum + value, 0);
  const boostedValues = roundShares(flatValues.map((value) => value * mult));
  const boosted = sources.map((source, i) => Object.assign({}, source, { value: boostedValues[i] }));
  const total = boosted.reduce((sum, source) => sum + source.value, 0);
  return { total: Math.max(0, total), baseTotal: Math.max(0, flat), multiplier: mult, sources: boosted };
}

// row.realmIndex 是对手这一世的当前境界；按它和累计灯芯估算角色在该境界的战力。
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
  const build = opponentBuild(realm, stage);
  const extraSources = [
    { id: 'mastery', value: build.mastery },
    { id: 'bonds', value: build.bonds },
    { id: 'gear', value: build.gear }
  ];
  const profile = powerProfile(realm, stage, build.attributes, extraSources);
  const rawWick = Number(row.totalWick);
  const wick = Number.isFinite(rawWick) ? Math.max(0, rawWick) : 0;
  const bonus = Math.min(MAX_WICK_BONUS, WICK_LOG_RATE * Math.log10(1 + wick));
  return Math.round(profile.total * (1 + bonus));
}

module.exports = { powerProfile, masteryPower, bondPower, estimatedOpponentPower, opponentBoost };
