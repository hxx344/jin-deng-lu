// 《烬灯录》的游戏规则，不依赖微信接口。所有随机数由调用方传入 rng（返回 [0, 1) 的函数），便于测试。
const content = require('./content');

const SCHOOL_IDS = content.SCHOOL_IDS;
const SCHOOLS = content.SCHOOLS;
const GRADES = content.GRADES;
const SKILLS = content.SKILLS;
const FATES = content.FATES;
const ARCANES = content.ARCANES;
const ROOTS = content.ROOTS;
const ROOT_RARITIES = content.ROOT_RARITIES;
const ROOT_COMBOS = content.ROOT_COMBOS;
const RARE_ROOTS = content.RARE_ROOTS;
const LAYERS = content.LAYERS;
const REALMS = content.REALMS;
const STAGES = content.STAGES;
const TRIBS = content.TRIBS;
const SEA_ROUTES = content.SEA_ROUTES;
const LAMPS = content.LAMPS;
const AUTO_LAMP = content.AUTO_LAMP;
const KARMA = content.KARMA;
const MARKS = content.MARKS;
const LEGACY_INTROS = content.LEGACY_INTROS;
const SUDDENS = content.SUDDENS;
const EVENTS = content.EVENTS;

const BASE_QI_CAP = 100;
const BASE_LIFE = 60;
const CHANCE_INTERVAL_SEC = 60;
const BASE_MAX_CHANCE = 60;
// 灯纹“多缘”每级、运系 4 门羁绊加的机缘上限。
const LAMP_CHANCE = 12;
const LUCK_SET_CHANCE = 36;
// 听雨剑一类“存着机缘就加锋”的功法，每存这么多次算一份。
const STORE_EDGE_PER = 12;
// 事件奖励的机缘可以暂时超过上限这么多次，超出上限后不再自动积攒。
const CHANCE_OVERFLOW = 120;
// 每做完这么多次普通机缘的选择，得一次大机缘。
const BIG_EVERY = 10;
const MAX_BIG = 99;
// 投胎时可以把候选根骨整批重新随机的次数。
const ROOT_REROLLS = 10;
const MAX_SKILLS = 8;
// 一世里靠奇缘最多能多出来的功法位。
const MAX_EXTRA_SLOTS = 3;
const MAX_GRADE = GRADES.length;
const LEGACY_YEARS = 3;
const FALLBACK_YEARS = 1;
const FALLBACK_QI = 0.1;
const TRIB_FAIL_DEMON = 10;
const MAX_DEMON = 100;
// 突发只由主动行为触发。每世最多三次，突发结束后隔四次普通机缘才可再触发。
const SUDDEN_MAX = 3;
const SUDDEN_COOLDOWN = 4;
const SUDDEN_AFTERMATH = 3;
const SUDDEN_CHANCE = 0.35;
// 魔修保留满心魔，灵气产出按心魔额外放大；堕魔后只有十年燃寿。
const DEMON_QI_RATE = 0.04;
const DEMON_YEARS = 10;
const POWDER_QI = 0.5;
const POWDER_YEARS = 3;
const BORROW_CHANCE = 30;
const BORROW_TRIB = 0.15;
const SCATTER_YEARS = 10;
const MAX_LOG = 30;
const MAX_EPITAPHS = 10;
const RECENT_EVENTS = 8;
// 有故事章节可接时，下一个机缘是它的概率。
const STORY_CHANCE = 0.5;
// 选项标了 school 时，要这一系凑到这么多门才出现。
const SCHOOL_NEED = 2;
// 余势：上一回机缘的结果，只影响紧接着的下一回。
const WAKES = {
  win: { name: '顺势', text: '上一回成了，气势正盛：这一回概率型选项成功率 +10%' },
  lose: { name: '吃一堑', text: '上一回没成，长了记性：这一回折寿减半' },
  rest: { name: '养精蓄锐', text: '上一回闭关养足了精神：这一回的选项少耗 1 年寿元' }
};
const WAKE_WIN = 0.1;
const TYPE_WEIGHTS = [['legacy', 0.4], ['adventure', 0.3], ['karma', 0.2], ['idle', 0.06], ['rare', 0.04]];
const TYPE_NAMES = { legacy: '传承', big: '大机缘', adventure: '奇遇', karma: '因果', fruit: '因果', idle: '闲事', rare: '奇缘', story: '故事', omen: '征兆', sudden: '突发' };
const ATTRS = ['edge', 'body', 'mind'];
const ATTR_NAMES = { edge: '锋', body: '躯', mind: '神' };
// 按“境界 × 3 + 小境界”取基础值；圆满奖励由各境界单独定义。
const WICK_SCORE = [2, 3, 4, 8, 11, 14, 24, 30, 36, 60, 75, 90, 160, 190, 220];
const SEA_REALM = TRIBS.findIndex((trial) => trial.seaTrial);
const SEA_LAYER = REALMS[SEA_REALM + 1].layer;
const SEA_TIDE_LIMIT = 3;
const SALT_ANCHOR_BONUS = 60;
const DEATH_MULT = { age: 1, retire: 1, trib: 1.2, demon: 1.5 };
const UNITS = ['', '万', '亿', '兆', '京'];

function findById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pick(list, rng) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

// 不放回地按权重抽 count 个。
function sample(items, weights, count, rng) {
  const pool = items.slice();
  const w = weights.slice();
  const out = [];
  while (out.length < count && pool.length) {
    let total = 0;
    for (let i = 0; i < w.length; i++) total += w[i];
    let r = rng() * total;
    let idx = 0;
    while (idx < w.length - 1 && r >= w[idx]) {
      r -= w[idx];
      idx++;
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
    w.splice(idx, 1);
  }
  return out;
}

function lampLevel(state, id) {
  return state.lamps[id] || 0;
}

function autoUnlocked(state) {
  return lampLevel(state, AUTO_LAMP.id) > 0;
}

const ROOT_FIELDS = ['edge', 'body', 'mind', 'qi', 'life', 'chance'];
const rootCache = {};

// 根骨 id 可以是单个根骨、用 + 连起来的 2 到 5 种根骨（按 ROOTS 的顺序），或者稀有根骨。无效时返回 null。
function rootInfo(id) {
  if (typeof id !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(rootCache, id)) return rootCache[id];
  let info = findById(RARE_ROOTS, id);
  if (!info) {
    const parts = id.split('+');
    const roots = parts.map((part) => findById(ROOTS, part));
    const ordered = roots.every((root, i) => root && (i === 0 || ROOTS.indexOf(root) > ROOTS.indexOf(roots[i - 1])));
    if (ordered) {
      const combo = ROOT_COMBOS[roots.length];
      info = {
        id: id,
        rarity: roots.length - 1,
        schools: roots.map((root) => root.school),
        name: combo ? combo.name || roots.map((root) => SCHOOLS[root.school].name).join('') + combo.suffix : roots[0].name,
        text: combo ? combo.text : roots[0].text
      };
      ROOT_FIELDS.forEach((k) => {
        const total = roots.reduce((sum, root) => sum + (root[k] || 0), 0);
        if (total) info[k] = total;
      });
    }
  }
  rootCache[id] = info || null;
  return rootCache[id];
}

// ROOT_POOLS[i] 是稀有度为 i 的全部根骨 id。
const ROOT_POOLS = ROOT_RARITIES.map(() => []);
(function fill(start, picked) {
  if (picked.length) ROOT_POOLS[picked.length - 1].push(picked.join('+'));
  for (let i = start; i < ROOTS.length; i++) fill(i + 1, picked.concat(ROOTS[i].id));
})(0, []);
RARE_ROOTS.forEach((root) => {
  ROOT_POOLS[root.rarity].push(root.id);
});

// 投胎时的候选：每个位置先按权重抽稀有度，再从这一档里抽一副没出现过的；这一档抽空了就退一档。
function rollRoots(count, rng) {
  const out = [];
  const total = ROOT_RARITIES.reduce((sum, r) => sum + r.weight, 0);
  while (out.length < count) {
    let r = rng() * total;
    let rarity = 0;
    while (rarity < ROOT_RARITIES.length - 1 && r >= ROOT_RARITIES[rarity].weight) {
      r -= ROOT_RARITIES[rarity].weight;
      rarity++;
    }
    let pool = [];
    for (; rarity >= 0 && !pool.length; rarity--) {
      pool = ROOT_POOLS[rarity].filter((id) => out.indexOf(id) < 0);
    }
    out.push(pick(pool, rng));
  }
  return out;
}

function rootCount(state) {
  return lampLevel(state, 'r2') > 0 ? 4 : 3;
}

function newRun(state, rng) {
  return {
    phase: 'root',
    rootChoices: rollRoots(rootCount(state), rng),
    fate: pick(FATES, rng).id,
    rootRolls: ROOT_REROLLS,
    root: '',
    realm: 0,
    stage: 0,
    qi: 0,
    age: 0,
    lifeFlat: 0,
    demon: 0,
    mode: 'human',
    fallAge: 0,
    demonLife: 0,
    speed: 0,
    stats: { edge: 0, body: 0, mind: 0 },
    skills: [],
    chance: 0,
    event: null,
    pending: null,
    karma: [],
    choices: 0,
    recent: [],
    marks: [],
    seen: [],
    slots: 0,
    wake: '',
    log: [],
    forceLegacy: false,
    freeRerolls: 0,
    lastTitle: '',
    lastTrib: null,
    sea: null,
    sudden: null,
    suddenCount: 0,
    suddenCooldown: 0,
    aftermath: null,
    death: null
  };
}

function createState(now, rng) {
  const state = {
    version: 1,
    lastTime: now,
    wick: 0,
    totalWick: 0,
    lives: 0,
    best: -1,
    lamps: {},
    epitaphs: [],
    carry: '',
    // 大机缘次数和攒大机缘的进度跨世保留。
    big: 0,
    bigCount: 0,
    arena: ARENA_MAX,
    arenaPoints: 0,
    run: null
  };
  state.run = newRun(state, rng || Math.random);
  return state;
}

function skillInfo(id) {
  return findById(SKILLS, id) || findById(ARCANES, id);
}

function skillEntry(run, id) {
  return findById(run.skills, id);
}

function fateInfo(run) {
  return findById(FATES, run.fate) || {};
}

function suddenInfo(id) {
  return findById(SUDDENS, id);
}

function aftermathText(state) {
  const run = state.run;
  const info = run.aftermath && suddenInfo(run.aftermath.id);
  return info ? '余波·' + info.name + '：' + info.text + '（剩 ' + run.aftermath.remaining + ' 次普通机缘）' : '';
}

function setCounts(run) {
  const counts = {};
  SCHOOL_IDS.forEach((k) => {
    counts[k] = 0;
  });
  run.skills.forEach((s) => {
    counts[skillInfo(s.id).school]++;
  });
  return counts;
}

function hasSet(run, school, n) {
  return setCounts(run)[school] >= n;
}

function sumSkills(run, key) {
  let total = 0;
  run.skills.forEach((s) => {
    const skill = skillInfo(s.id);
    if (run.aftermath && run.aftermath.id === 'backlash' && skill.arcane) return;
    total += (skill[key] || 0) * s.level;
  });
  return total;
}

function signed(n) {
  return (n > 0 ? '+' : '-') + Math.abs(n);
}

function pctText(v) {
  return Math.round(v * 100) + '%';
}

// 功法上每个字段的写法：label 在前，val 把（已乘品级的）数值写成文字。
// 前五项是直接加成，后面是特殊效果，各自在对应的规则函数里生效。
const SKILL_STATS = [
  { key: 'edge', label: '锋', val: signed },
  { key: 'body', label: '躯', val: signed },
  { key: 'mind', label: '神', val: signed },
  { key: 'qi', label: '灵气产出', val: (v) => '+' + pctText(v) },
  { key: 'life', label: '寿元上限', val: (v) => signed(v) + ' 年' },
  { key: 'storeEdge', label: '每存着 ' + STORE_EDGE_PER + ' 次机缘，锋', val: signed },
  { key: 'demonEdge', label: '每 10 点心魔，锋', val: signed },
  { key: 'stageEdge', label: '每次小境界突破，锋永久', val: signed },
  { key: 'trib', label: '渡劫成功率', val: (v) => '+' + pctText(v) },
  { key: 'tough', label: '机缘里每次折寿少折', val: (v) => v + ' 年' },
  { key: 'tribLife', label: '渡劫成功额外寿元', val: (v) => '+' + v + ' 年' },
  { key: 'skillQi', label: '每持有一门功法，灵气产出', val: (v) => '+' + pctText(v) },
  { key: 'tick', label: '每做一次选择，得灵气相当于丹田容量的', val: pctText },
  { key: 'soothe', label: '每做一次选择，心魔', val: (v) => '-' + v },
  { key: 'keepQi', label: '渡劫失败多保住灵气', val: pctText },
  { key: 'yearsCut', label: '传承耗寿', val: (v) => '-' + v + ' 年' },
  { key: 'calm', label: '心魔增长', val: (v) => '-' + pctText(v) },
  { key: 'borrow', label: '锋额外加上神的', val: pctText },
  { key: 'seclude', label: '“闭关不理”的灵气', val: (v) => '+' + pctText(v) },
  { key: 'tribYears', label: '渡劫失败折寿', val: (v) => '-' + pctText(v) },
  { key: 'demonBody', label: '每 10 点心魔，躯', val: signed },
  { key: 'stageLife', label: '每次小境界突破，寿元上限', val: (v) => '+' + v + ' 年' },
  { key: 'ageBody', label: '每活 20 年，躯', val: signed },
  { key: 'scar', label: '机缘里每次折寿后，躯永久', val: signed },
  { key: 'wick', label: '身死所得灯芯', val: (v) => '+' + pctText(v) },
  { key: 'speed', label: '机缘积攒速度', val: (v) => '+' + pctText(v) },
  { key: 'flip', label: '概率型选项没成时，改判为成的机会', val: pctText },
  { key: 'winQi', label: '概率型选项成了，额外得灵气相当于丹田容量的', val: pctText },
  { key: 'luckP', label: '概率型选项成功率', val: (v) => '+' + pctText(v) },
  { key: 'fool', label: '每涉猎一系功法，锋、躯、神各', val: signed },
  { key: 'oldLuck', label: '寿元不足 10 年时，概率型选项成功率', val: (v) => '+' + pctText(v) },
  { key: 'store', label: '机缘上限', val: signed }
];
// 几种按比例的减免加起来也不会超过这些上限。
const MAX_DEMON_CUT = 0.8;
const MAX_TRIB_YEARS_CUT = 0.6;
const MAX_FLIP = 0.6;
const MAX_KEEP_QI = 0.9;
const OLD_YEARS = 10;

function skillDesc(skill, level) {
  return SKILL_STATS.filter((st) => skill[st.key]).map((st) => st.label + ' ' + st.val(skill[st.key] * level)).join('，');
}

// 精进时把原数值和新数值并排写出来，例如“锋 +3 → +6”。
function skillUpgradeDesc(skill, from, to) {
  return SKILL_STATS.filter((st) => skill[st.key])
    .map((st) => st.label + ' ' + st.val(skill[st.key] * from) + ' → ' + st.val(skill[st.key] * to)).join('，');
}

function skillTitle(skill, level) {
  return '《' + skill.name + '》（' + SCHOOLS[skill.school].name + '·' + (skill.arcane ? '秘法' : GRADES[level - 1] + '品') + '）';
}

function arcaneFor(first, second) {
  return ARCANES.filter((skill) => skill.sources.indexOf(first) >= 0 && skill.sources.indexOf(second) >= 0)[0] || null;
}

// 返回能与指定天品功法合成的另一门；不传 id 时列出本世所有可合的组合。
function mergeOptions(state, id) {
  const run = state.run;
  const out = [];
  run.skills.forEach((entry, i) => {
    if (id && entry.id !== id) return;
    const left = skillInfo(entry.id);
    if (!left || left.arcane || entry.level < MAX_GRADE) return;
    run.skills.forEach((other, j) => {
      if ((id && j === i) || (!id && j <= i) || other.level < MAX_GRADE) return;
      const right = skillInfo(other.id);
      if (!right || right.arcane || right.school !== left.school) return;
      const arcane = arcaneFor(left.id, right.id);
      if (arcane) out.push({ first: left.id, second: right.id, arcane: arcane });
    });
  });
  return out;
}

function mergeSkills(state, first, second, rng) {
  const run = state.run;
  if (run.phase !== 'alive' || run.pending || first === second) return null;
  const leftEntry = skillEntry(run, first);
  const rightEntry = skillEntry(run, second);
  const left = skillInfo(first);
  const right = skillInfo(second);
  if (!leftEntry || !rightEntry || leftEntry.level < MAX_GRADE || rightEntry.level < MAX_GRADE ||
    !left || !right || left.arcane || right.arcane || left.school !== right.school) return null;
  const arcane = arcaneFor(first, second);
  if (!arcane) return null;
  const before = snapshot(state);
  run.skills = run.skills.filter((entry) => entry.id !== first && entry.id !== second);
  run.skills.push({ id: arcane.id, level: 1 });
  const lines = ['《' + left.name + '》与《' + right.name + '》归一，功法位 -1', skillDesc(arcane, 1)];
  run.log.push({ age: run.age, title: '秘法合成', text: '炼成《' + arcane.name + '》：' + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  maybeSudden(state, rng, 'backlash');
  const dead = checkDeath(state);
  return { title: '秘法合成', label: '炼成《' + arcane.name + '》', lines: lines, tags: ['bond', 'upgrade'], dead: dead };
}

function demonGain(state, amount) {
  if (amount <= 0) return amount;
  const cut = Math.min(MAX_DEMON_CUT, 0.1 * lampLevel(state, 'm4') + sumSkills(state.run, 'calm'));
  // 加一点余量，免得 7.5 因为浮点误差被舍成 7。
  return Math.max(1, Math.round(amount * (1 - cut) + 1e-6));
}

// 机缘里的折寿，算上功法的减免。
function lifeLoss(state, years) {
  if (state.run.wake === 'lose') years = Math.ceil(years / 2);
  return Math.max(0, years - sumSkills(state.run, 'tough'));
}

function marksOk(run, item) {
  const need = item.need || [];
  const not = item.not || [];
  if (item.school && setCounts(run)[item.school] < SCHOOL_NEED) return false;
  return need.every((m) => run.marks.indexOf(m) >= 0) && !not.some((m) => run.marks.indexOf(m) >= 0);
}

function markList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function skillCap(state, run) {
  return MAX_SKILLS + lampLevel(state, 'm5') + run.slots;
}

function maxSkills(state) {
  return skillCap(state, state.run);
}

function rootOf(run) {
  return rootInfo(run.root) || {};
}

function loseLife(run, years) {
  if (run.mode === 'demon') run.demonLife -= years;
  else run.lifeFlat -= years;
}

function attrs(state) {
  const run = state.run;
  const out = {};
  const fate = fateInfo(run);
  ATTRS.forEach((k) => {
    out[k] = run.stats[k] + sumSkills(run, k) + (fate[k] || 0);
  });
  const demonTens = Math.floor(run.demon / 10);
  out.edge += sumSkills(run, 'storeEdge') * Math.floor(run.chance / STORE_EDGE_PER) + sumSkills(run, 'demonEdge') * demonTens;
  out.body += sumSkills(run, 'demonBody') * demonTens + sumSkills(run, 'ageBody') * Math.floor(run.age / 20);
  const fool = sumSkills(run, 'fool');
  if (fool) {
    const counts = setCounts(run);
    const schools = SCHOOL_IDS.filter((k) => counts[k] > 0).length;
    ATTRS.forEach((k) => {
      out[k] += fool * schools;
    });
  }
  out.edge += Math.floor(Math.max(0, out.mind) * sumSkills(run, 'borrow'));
  if (run.aftermath && run.aftermath.id === 'debt') {
    ATTRS.forEach((k) => {
      out[k] = out[k] >= 0 ? Math.floor(out[k] * 0.9) : Math.ceil(out[k] * 0.9);
    });
  }
  return out;
}

function qiCap(state) {
  const run = state.run;
  return BASE_QI_CAP * REALMS[run.realm].cap * STAGES[run.stage].cap;
}

function qiRate(state) {
  const run = state.run;
  if (run.phase !== 'alive') return 0;
  const bonus = (rootOf(run).qi || 0) + sumSkills(run, 'qi') + sumSkills(run, 'skillQi') * run.skills.length +
    (hasSet(run, 'pill', 2) ? 0.3 : 0) + 0.2 * lampLevel(state, 'r4');
  const fate = fateInfo(run);
  const demon = run.mode === 'demon' ? 1 + MAX_DEMON * DEMON_QI_RATE : 1;
  return REALMS[run.realm].rate * (1 + bonus) * (1 + (fate.qi || 0)) * demon;
}

function maxLife(state) {
  const run = state.run;
  if (run.mode === 'demon') return Math.max(1, run.fallAge + run.demonLife);
  const fate = fateInfo(run);
  const flat = BASE_LIFE + 10 * lampLevel(state, 'r1') + run.lifeFlat + sumSkills(run, 'life') + (fate.lifeFlat || 0);
  return Math.max(1, Math.floor(flat * (hasSet(run, 'body', 2) ? 1.2 : 1) * (1 + (fate.lifeRate || 0))));
}

function yearsLeft(state) {
  return Math.max(0, maxLife(state) - state.run.age);
}

// 反噬只剩最后一次普通机缘时，选项和闭关都要按秘法恢复后的寿元评估。
function choiceYearsLeft(state) {
  const run = state.run;
  if (!run.aftermath || run.aftermath.id !== 'backlash' || run.aftermath.remaining !== 1) return yearsLeft(state);
  const aftermath = run.aftermath;
  run.aftermath = null;
  try {
    return Math.max(0, maxLife(state) - run.age);
  } finally {
    run.aftermath = aftermath;
  }
}

function maxChance(state) {
  const run = state.run;
  return BASE_MAX_CHANCE + LAMP_CHANCE * lampLevel(state, 'y1') + (rootOf(run).chance || 0) + (hasSet(run, 'luck', 4) ? LUCK_SET_CHANCE : 0) + sumSkills(run, 'store');
}

function chanceInterval(state) {
  const run = state.run;
  const slow = run.aftermath && run.aftermath.id === 'fortune' ? 1.5 : 1;
  return CHANCE_INTERVAL_SEC / (1 + 0.15 * lampLevel(state, 'y4')) / (hasSet(run, 'luck', 4) ? 1.25 : 1) /
    (1 + sumSkills(run, 'speed')) / (1 + run.speed + (fateInfo(run).speed || 0)) * slow;
}

function realmText(run) {
  return REALMS[run.realm].name + STAGES[run.stage].name;
}

function atSea(run) {
  return run.phase === 'alive' && !!run.sea && !run.sea.landed;
}

function layerIndex(run) {
  return atSea(run) ? SEA_LAYER : REALMS[run.realm].layer;
}

function layerName(run) {
  return LAYERS[layerIndex(run)];
}

function isFull(state) {
  const run = state.run;
  return run.stage === STAGES.length - 1 && run.qi >= qiCap(state);
}

// 加灵气；小境界灵气满了自动突破，多出的带入下一个小境界。后期满了就停在上限等渡劫。
function gainQi(state, amount) {
  const run = state.run;
  let gained = 0;
  let ups = 0;
  while (amount > 0) {
    const room = Math.max(0, qiCap(state) - run.qi);
    if (amount < room) {
      run.qi += amount;
      gained += amount;
      break;
    }
    gained += room;
    amount -= room;
    if (run.stage < STAGES.length - 1) {
      run.stage++;
      run.qi = 0;
      ups++;
      run.stats.edge += sumSkills(run, 'stageEdge');
      run.lifeFlat += sumSkills(run, 'stageLife');
    } else {
      run.qi = qiCap(state);
      break;
    }
  }
  return { gained: gained, ups: ups };
}

// 结算从 lastTime 到 now 的灵气和机缘。寿元不随时间流逝，所以离线多久都不会死。
function advance(state, now) {
  const run = state.run;
  const elapsed = Math.max(0, (now - state.lastTime) / 1000);
  state.lastTime = now;
  const result = { elapsed: elapsed, qi: 0, ups: 0, chance: 0 };
  state.arena = Math.min(ARENA_MAX, state.arena + elapsed / ARENA_INTERVAL_SEC);
  if (run.phase !== 'alive') return result;
  const max = maxChance(state);
  if (run.chance < max) {
    const before = run.chance;
    run.chance = Math.min(max, run.chance + elapsed / chanceInterval(state));
    result.chance = Math.floor(run.chance) - Math.floor(before);
  }
  const q = gainQi(state, qiRate(state) * elapsed);
  result.qi = q.gained;
  result.ups = q.ups;
  return result;
}


function qiAmount(state, fraction) {
  return Math.round(fraction * qiCap(state));
}

function qiRewardAmount(state, fraction) {
  const cut = state.run.aftermath && state.run.aftermath.id === 'meridian' ? 0.7 : 1;
  return Math.round(fraction * qiCap(state) * cut);
}

// 把效果写成给玩家看的文字；选项说明和实际结算都以同一份数据为准。
function fxParts(state, fx) {
  const parts = [];
  if (fx.skill) parts.push(fx.skill === 'any' ? '获得一门功法' : '获得一门' + SCHOOLS[fx.skill].name + '系功法');
  ATTRS.forEach((k) => {
    if (fx[k]) parts.push(ATTR_NAMES[k] + ' ' + signed(fx[k]));
  });
  if (fx.qi) parts.push('灵气 +' + formatNumber(qiRewardAmount(state, fx.qi)));
  if (fx.life > 0) parts.push(state.run.mode === 'demon' ? '普通延寿对魔修无效' : '寿元上限 +' + fx.life + ' 年');
  else if (fx.life < 0) parts.push('折寿 ' + lifeLoss(state, -fx.life) + ' 年');
  if (fx.demon) parts.push('心魔 ' + signed(demonGain(state, fx.demon)));
  if (fx.chance) parts.push('机缘 ' + signed(fx.chance));
  if (fx.speed) parts.push('这一世机缘积攒速度 +' + pctText(fx.speed));
  if (fx.slot && state.run.slots < MAX_EXTRA_SLOTS) parts.push('功法上限 +' + fx.slot);
  if (fx.karma) parts.push('种下因果【' + KARMA[fx.karma] + '】');
  if (fx.mark) parts.push('记下【' + MARKS[fx.mark] + '】');
  markList(fx.unmark).forEach((m) => {
    if (state.run.marks.indexOf(m) >= 0) parts.push('了结【' + MARKS[m] + '】');
  });
  return parts.length ? parts : ['无事发生'];
}

function riskChance(state, risk) {
  const run = state.run;
  let p = risk.p + (hasSet(run, 'luck', 2) ? 0.1 : 0) + sumSkills(run, 'luckP') + (run.wake === 'win' ? WAKE_WIN : 0);
  if (yearsLeft(state) <= OLD_YEARS) p += sumSkills(run, 'oldLuck');
  p = Math.min(1, p);
  p += (1 - p) * Math.min(MAX_FLIP, sumSkills(run, 'flip'));
  if (run.aftermath && run.aftermath.id === 'thunder') p -= 0.1;
  return clamp(p, 0.05, 0.95);
}

function legacyYears(state) {
  return Math.max(0, LEGACY_YEARS - sumSkills(state.run, 'yearsCut'));
}

function eventDef(state) {
  const run = state.run;
  const ev = run.event;
  if (!ev) return null;
  if (ev.kind === 'legacy') {
    const intro = LEGACY_INTROS[ev.intro];
    return {
      type: ev.big ? 'big' : 'legacy',
      title: intro.title,
      text: ev.big ? '十次机缘攒下的缘分凝成一团，落在你面前。' + intro.text + '这一回的东西比平常好，而且不耗寿元。' : intro.text,
      options: ev.offers.map((o) => {
        const skill = skillInfo(o.id);
        const owned = skillEntry(run, o.id);
        return {
          label: owned ? '精进《' + skill.name + '》至' + GRADES[o.level - 1] + '品' : '修习《' + skill.name + '》',
          years: ev.big ? 0 : legacyYears(state),
          learn: o
        };
      })
    };
  }
  const def = findById(EVENTS, ev.id);
  // 带条件的选项只在有对应经历时出现；触发式事件用独立类型展示，不参与普通随机池。
  return {
    type: def.stage === 'omen' ? 'omen' : (def.stage === 'event' ? 'sudden' : def.type),
    line: def.line, title: def.title, text: def.text, trigger: def.trigger, stage: def.stage,
    options: def.options.filter((o) => marksOk(run, o))
  };
}

function optionYears(state, opt) {
  return Math.max(0, opt.years - (state.run.wake === 'rest' ? 1 : 0));
}

function optionCost(state, opt) {
  return opt.cost && opt.cost.qi ? qiAmount(state, opt.cost.qi) : 0;
}

function optionDesc(state, opt) {
  const segments = [];
  const because = (opt.need || []).map((m) => '【' + MARKS[m] + '】').join('') +
    (opt.school ? SCHOOLS[opt.school].name + '系 ' + SCHOOL_NEED + ' 门' : '');
  if (because) segments.push('因' + because);
  if (opt.learn) {
    const skill = skillInfo(opt.learn.id);
    const owned = skillEntry(state.run, skill.id);
    if (owned && owned.level < opt.learn.level) {
      segments.push(SCHOOLS[skill.school].name + '·' + GRADES[owned.level - 1] + '品 → ' + GRADES[opt.learn.level - 1] + '品：' + skillUpgradeDesc(skill, owned.level, opt.learn.level));
    } else {
      segments.push(SCHOOLS[skill.school].name + '·' + GRADES[opt.learn.level - 1] + '品：' + skillDesc(skill, opt.learn.level));
    }
  }
  const fixed = [];
  const cost = optionCost(state, opt);
  if (cost) fixed.push('耗灵气 ' + formatNumber(cost));
  if (opt.fx) Array.prototype.push.apply(fixed, fxParts(state, opt.fx));
  if (fixed.length) segments.push(fixed.join('，'));
  if (opt.risk) {
    const pct = Math.round(riskChance(state, opt.risk) * 100);
    segments.push(pct + '% ' + fxParts(state, opt.risk.win).join('，'));
    segments.push(100 - pct + '% ' + fxParts(state, opt.risk.lose).join('，'));
  }
  return segments.join('；');
}

function fallbackQi(state) {
  return FALLBACK_QI * (1 + lampLevel(state, 'y3') + sumSkills(state.run, 'seclude'));
}

function rerollsLeft(state) {
  const run = state.run;
  if (!run.event || run.event.fruit || run.event.trigger) return 0;
  return (run.event.rerolls || 0) + run.freeRerolls;
}

function eventView(state) {
  const run = state.run;
  const def = eventDef(state);
  if (!def) return null;
  const left = choiceYearsLeft(state);
  return {
    type: def.type,
    typeName: TYPE_NAMES[def.type] + (def.type === 'story' ? ' · ' + def.line : ''),
    title: def.title,
    text: def.text,
    options: def.options.map((opt) => {
      const cost = optionCost(state, opt);
      const years = optionYears(state, opt);
      return {
        label: opt.label,
        desc: optionDesc(state, opt),
        years: years,
        disabled: cost > run.qi,
        fatal: years >= left
      };
    }),
    fallback: {
      label: '闭关不理',
      desc: '灵气 +' + formatNumber(qiRewardAmount(state, fallbackQi(state))),
      years: FALLBACK_YEARS,
      fatal: FALLBACK_YEARS >= left
    },
    rerolls: rerollsLeft(state),
    wake: [
      WAKES[run.wake] ? WAKES[run.wake].name + '：' + WAKES[run.wake].text : '',
      aftermathText(state),
      def.stage === 'omen' ? '处理征兆后，下一回机缘将转为突发；这段经历不能重抽。' : '',
      def.stage === 'event' ? '处理突发后，余波会影响接下来的三次普通机缘。' : ''
    ].filter(Boolean).join('；')
  };
}

// 功法已满时，新功法的总权重压到可精进功法总权重的这个比例，让精进比新功法更常出现。
const FULL_NEW_RATIO = 0.5;

function dampNewSkills(state, pool, weights) {
  const run = state.run;
  if (run.skills.length < maxSkills(state)) return;
  let owned = 0;
  let fresh = 0;
  pool.forEach((skill, i) => {
    if (skillEntry(run, skill.id)) owned += weights[i];
    else fresh += weights[i];
  });
  if (!owned || fresh <= FULL_NEW_RATIO * owned) return;
  const factor = FULL_NEW_RATIO * owned / fresh;
  pool.forEach((skill, i) => {
    if (!skillEntry(run, skill.id)) weights[i] *= factor;
  });
}

// big 为真时是大机缘：多一个选项，品阶高一品。
function legacyOffers(state, rng, big) {
  const run = state.run;
  const counts = setCounts(run);
  const rootSchools = rootOf(run).schools || [];
  const pool = [];
  const weights = [];
  SKILLS.forEach((skill) => {
    const owned = skillEntry(run, skill.id);
    if (owned && owned.level >= MAX_GRADE) return;
    pool.push(skill);
    weights.push((rootSchools.indexOf(skill.school) >= 0 ? 3 : 1) * (counts[skill.school] > 0 ? 2 : 1));
  });
  dampNewSkills(state, pool, weights);
  const count = 3 + (hasSet(run, 'talisman', 4) ? 1 : 0) + (big ? 1 : 0);
  const boost = big ? 1 : 0;
  return sample(pool, weights, count, rng).map((skill) => {
    const owned = skillEntry(run, skill.id);
    if (owned) return { id: skill.id, level: Math.min(MAX_GRADE, owned.level + 1 + boost) };
    return { id: skill.id, level: (REALMS[run.realm].layer > 0 && rng() < 0.3 ? 2 : 1) + boost };
  });
}

function seedsPendingKarma(run, ev) {
  for (let i = 0; i < ev.options.length; i++) {
    const id = ev.options[i].fx && ev.options[i].fx.karma;
    if (id && findById(run.karma, id)) return true;
  }
  return false;
}

function rollType(rng) {
  let r = rng();
  for (let i = 0; i < TYPE_WEIGHTS.length; i++) {
    if (r < TYPE_WEIGHTS[i][1]) return TYPE_WEIGHTS[i][0];
    r -= TYPE_WEIGHTS[i][1];
  }
  return TYPE_WEIGHTS[0][0];
}

function generateEvent(state, rng, forcedType, excludeId) {
  const run = state.run;
  if (!forcedType && run.sudden) {
    const def = EVENTS.filter((e) => e.trigger === run.sudden.id && e.stage === run.sudden.stage)[0];
    if (def) return { kind: 'event', id: def.id, trigger: def.trigger, stage: def.stage };
    run.sudden = null;
  }
  const layer = REALMS[run.realm].layer;
  const eligible = (e) => !e.trigger && e.layers.indexOf(layer) >= 0 && e.id !== excludeId && marksOk(run, e) &&
    !seedsPendingKarma(run, e) && (e.type !== 'story' || run.seen.indexOf(e.id) < 0) &&
    (e.type !== 'rare' || run.slots < MAX_EXTRA_SLOTS);
  const stories = EVENTS.filter((e) => e.type === 'story' && eligible(e));
  let type = forcedType;
  if (!type) {
    for (let i = 0; i < run.karma.length; i++) {
      if (run.choices < run.karma[i].due) continue;
      const id = run.karma.splice(i, 1)[0].id;
      for (let j = 0; j < EVENTS.length; j++) {
        if (EVENTS[j].fruit === id) return { kind: 'event', id: EVENTS[j].id, fruit: true };
      }
      break;
    }
    if (run.forceLegacy) {
      run.forceLegacy = false;
      type = 'legacy';
    } else if (stories.length && rng() < STORY_CHANCE) {
      type = 'story';
    } else {
      type = rollType(rng);
    }
  } else if (type === 'story' && !stories.length) {
    // 重抽故事时没有别的章节可给，就当普通机缘重抽。
    type = rollType(rng);
  }
  // 额外功法位加满后没有奇缘可给，当闲事处理。
  if (type === 'rare' && !EVENTS.some((e) => e.type === 'rare' && eligible(e))) type = 'idle';
  if (type !== 'legacy' && type !== 'big') {
    let pool = EVENTS.filter((e) => e.type === type && eligible(e));
    const fresh = pool.filter((e) => run.recent.indexOf(e.id) < 0);
    if (fresh.length) pool = fresh;
    if (pool.length) return { kind: 'event', id: pick(pool, rng).id };
  }
  const big = forcedType === 'big';
  const offers = legacyOffers(state, rng, big);
  if (offers.length) {
    const intros = [];
    LEGACY_INTROS.forEach((intro, i) => {
      if (intro.layer === layer) intros.push(i);
    });
    const ev = { kind: 'legacy', intro: pick(intros, rng), offers: offers };
    if (big) ev.big = true;
    return ev;
  }
  // 功法全部满品时没有传承可给，退回闲事。
  return { kind: 'event', id: pick(EVENTS.filter((e) => e.type === 'idle' && !e.trigger && e.id !== excludeId), rng).id };
}

function canDraw(state) {
  const run = state.run;
  return run.phase === 'alive' && !atSea(run) && !run.event && !run.pending && run.chance >= 1;
}

function drawEvent(state, rng) {
  if (!canDraw(state)) return false;
  const run = state.run;
  run.chance -= 1;
  run.event = generateEvent(state, rng);
  run.event.rerolls = hasSet(run, 'talisman', 2) ? 1 : 0;
  return true;
}

function canDrawBig(state) {
  const run = state.run;
  if (run.phase !== 'alive' || atSea(run) || run.event || run.pending || run.sudden || state.big < 1) return false;
  // 功法全部满品时没有东西可给，大机缘先留着。
  return SKILLS.some((skill) => {
    const owned = skillEntry(run, skill.id);
    return !owned || owned.level < MAX_GRADE;
  });
}

function drawBig(state, rng) {
  if (!canDrawBig(state)) return false;
  const run = state.run;
  state.big -= 1;
  run.event = generateEvent(state, rng, 'big');
  run.event.rerolls = hasSet(run, 'talisman', 2) ? 1 : 0;
  return true;
}

function rerollEvent(state, rng) {
  const run = state.run;
  if (run.phase !== 'alive' || rerollsLeft(state) < 1) return false;
  const old = run.event;
  let rerolls = old.rerolls || 0;
  if (rerolls > 0) rerolls--;
  else run.freeRerolls--;
  const type = old.kind === 'legacy' ? (old.big ? 'big' : 'legacy') : findById(EVENTS, old.id).type;
  run.event = generateEvent(state, rng, type, old.id);
  run.event.rerolls = rerolls;
  return true;
}

function gainSkill(state, id, level, lines, tags) {
  const run = state.run;
  const skill = skillInfo(id);
  const owned = skillEntry(run, id);
  tags.push('skill:' + skill.school);
  if (owned) {
    tags.push('upgrade');
    const before = owned.level;
    owned.level = Math.min(MAX_GRADE, Math.max(owned.level + 1, level));
    lines.push('《' + skill.name + '》精进至' + GRADES[owned.level - 1] + '品：' + skillUpgradeDesc(skill, before, owned.level));
  } else if (run.skills.length < maxSkills(state)) {
    run.skills.push({ id: id, level: level });
    lines.push('习得' + skillTitle(skill, level));
    const count = setCounts(run)[skill.school];
    if (count === 2 || count === 4) tags.push('bond');
  } else {
    run.pending = { id: id, level: level };
    lines.push('得到' + skillTitle(skill, level) + '，但功法已满，需要取舍');
  }
}

function randomSkill(state, school, rng) {
  const run = state.run;
  const open = SKILLS.filter((s) => {
    const owned = skillEntry(run, s.id);
    return !owned || owned.level < MAX_GRADE;
  });
  const matched = open.filter((s) => school === 'any' || s.school === school);
  const pool = matched.length ? matched : open;
  if (!pool.length) return null;
  const weights = pool.map(() => 1);
  dampNewSkills(state, pool, weights);
  return sample(pool, weights, 1, rng)[0];
}

function addQiWithLines(state, amount, lines, tags) {
  const q = gainQi(state, amount);
  lines.push('灵气 +' + formatNumber(Math.round(q.gained)));
  tags.push('qi');
  if (q.ups) {
    lines.push('突破至' + realmText(state.run));
    tags.push('stageup');
  }
}

// tags 记录这次结算里发生了哪几类事，界面据此决定角色做什么动作。
function applyFx(state, fx, rng, lines, tags) {
  const run = state.run;
  if (fx.skill) {
    const skill = randomSkill(state, fx.skill, rng);
    if (skill) gainSkill(state, skill.id, 1, lines, tags);
    else lines.push('已经没有可学的功法');
  }
  ATTRS.forEach((k) => {
    if (!fx[k]) return;
    run.stats[k] += fx[k];
    lines.push(ATTR_NAMES[k] + ' ' + signed(fx[k]));
    if (fx[k] > 0) tags.push(k);
  });
  if (fx.qi) addQiWithLines(state, qiRewardAmount(state, fx.qi), lines, tags);
  if (fx.life > 0) {
    if (run.mode === 'demon') {
      lines.push('魔躯燃寿已定，普通延寿无效');
    } else {
      run.lifeFlat += fx.life;
      lines.push('寿元上限 +' + fx.life + ' 年');
      tags.push('life+');
    }
  } else if (fx.life < 0) {
    const loss = lifeLoss(state, -fx.life);
    loseLife(run, loss);
    lines.push('折寿 ' + loss + ' 年');
    if (loss > 0) {
      tags.push('life-');
      const scar = sumSkills(run, 'scar');
      if (scar) {
        run.stats.body += scar;
        lines.push('躯 +' + scar);
      }
    }
  }
  if (fx.demon) {
    const d = demonGain(state, fx.demon);
    run.demon = clamp(run.demon + d, 0, MAX_DEMON);
    lines.push('心魔 ' + signed(d));
    tags.push(d > 0 ? 'demon+' : 'demon-');
  }
  if (fx.chance) {
    run.chance = clamp(run.chance + fx.chance, 0, maxChance(state) + CHANCE_OVERFLOW);
    lines.push('机缘 ' + signed(fx.chance));
    tags.push('chance');
  }
  if (fx.speed) {
    run.speed += fx.speed;
    lines.push('这一世机缘积攒速度 +' + pctText(fx.speed));
    tags.push('chance');
  }
  if (fx.slot && run.slots < MAX_EXTRA_SLOTS) {
    run.slots += fx.slot;
    lines.push('功法上限 +' + fx.slot);
    tags.push('slot');
  }
  if (fx.karma && !findById(run.karma, fx.karma)) {
    // 当前这次选择还没计入 choices，所以结果出现在此后的第 4 到 6 次机缘。
    run.karma.push({ id: fx.karma, due: run.choices + 4 + Math.floor(rng() * 3) });
    lines.push('种下因果【' + KARMA[fx.karma] + '】');
    tags.push('karma');
  }
  if (fx.mark && run.marks.indexOf(fx.mark) < 0) {
    run.marks.push(fx.mark);
    lines.push('记下【' + MARKS[fx.mark] + '】');
    tags.push('mark');
  }
  markList(fx.unmark).forEach((m) => {
    const at = run.marks.indexOf(m);
    if (at < 0) return;
    run.marks.splice(at, 1);
    lines.push('了结【' + MARKS[m] + '】');
  });
}

function setBonus(run) {
  const counts = setCounts(run);
  let bonus = 0;
  SCHOOL_IDS.forEach((k) => {
    if (counts[k] >= 4) bonus += 0.25;
    else if (counts[k] >= 2) bonus += 0.1;
  });
  return bonus;
}

function wickGain(state, cause) {
  const run = state.run;
  const full = REALMS[run.realm].fullWick;
  const score = full && isFull(state) ? full : WICK_SCORE[run.realm * STAGES.length + run.stage];
  return Math.max(1, Math.ceil(score * (1 + setBonus(run) + sumSkills(run, 'wick')) * (1 + (fateInfo(run).wick || 0)) * DEATH_MULT[cause] - 1e-9));
}

function epitaph(state, cause) {
  const run = state.run;
  let text = '享年 ' + run.age + ' 岁，' + realmText(run) + '。';
  const last = run.lastTitle ? '生前最后一件事是「' + run.lastTitle + '」。' : '';
  if (cause === 'trib') {
    text += '死于' + run.lastTrib.name + '，渡劫时的成功率是 ' + Math.round(run.lastTrib.chance * 100) + '%。';
  } else if (cause === 'demon') {
    text += run.mode === 'demon' ? '魔躯燃尽，十年来烧得很亮，散得也很干净。' + last : '走火入魔，疯得很精彩。' + last;
  } else if (cause === 'retire') {
    text += '自行坐化，走得很安详。';
  } else {
    text += '寿终正寝。' + last;
  }
  return text;
}

function die(state, cause) {
  const run = state.run;
  const wick = wickGain(state, cause);
  const text = epitaph(state, cause);
  run.phase = 'dead';
  run.event = null;
  run.pending = null;
  run.death = { cause: cause, wick: wick, text: text };
  state.wick += wick;
  state.totalWick += wick;
  state.lives++;
  state.best = Math.max(state.best, run.realm * STAGES.length + run.stage);
  state.carry = '';
  state.epitaphs.unshift(text + '（灯芯 +' + wick + '）');
  state.epitaphs = state.epitaphs.slice(0, MAX_EPITAPHS);
}

// 满心魔先堕魔，不立即身死；魔修的燃寿耗尽后才散去。
function becomeDemon(state) {
  const run = state.run;
  const before = snapshot(state);
  run.mode = 'demon';
  run.fallAge = run.age;
  run.demonLife = DEMON_YEARS;
  run.demon = MAX_DEMON;
  run.log.push({ age: run.age, title: '堕入魔道', text: '心魔满心，转而燃寿修行：灵气产出 ×' + (1 + MAX_DEMON * DEMON_QI_RATE) + '，不能再渡劫，十年后继绝。', detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
}

// 返回是否身死。
function checkDeath(state, cause) {
  const run = state.run;
  if (run.phase !== 'alive') return false;
  if (run.demon >= MAX_DEMON && run.mode !== 'demon') becomeDemon(state);
  if (run.age >= maxLife(state)) {
    die(state, run.mode === 'demon' ? 'demon' : (cause || 'age'));
    return true;
  }
  return false;
}

// 见闻里每条记录附带的数值变化：结算前后各记一次，只写出变了的项。
function snapshot(state) {
  const run = state.run;
  return {
    realm: realmText(run),
    attrs: attrs(state),
    left: yearsLeft(state),
    life: maxLife(state),
    demon: run.demon,
    qi: Math.floor(run.qi),
    chance: Math.floor(run.chance),
    slots: maxSkills(state)
  };
}

function changeText(before, after) {
  const parts = [];
  const add = (label, a, b, unit) => {
    if (a !== b) parts.push(label + ' ' + a + ' → ' + b + (unit || ''));
  };
  add('境界', before.realm, after.realm);
  ATTRS.forEach((k) => add(ATTR_NAMES[k], before.attrs[k], after.attrs[k]));
  add('寿元余', before.left, after.left, ' 年');
  add('寿元上限', before.life, after.life, ' 年');
  add('心魔', before.demon, after.demon);
  add('灵气', formatNumber(before.qi), formatNumber(after.qi));
  add('机缘', before.chance, after.chance, ' 次');
  add('功法上限', before.slots, after.slots);
  return parts.join('，');
}

function maybeSudden(state, rng, source, previousMarks) {
  const run = state.run;
  if (!suddenInfo(source) || run.phase !== 'alive' || run.mode !== 'human' || run.sudden || run.aftermath ||
    run.suddenCount >= SUDDEN_MAX || run.suddenCooldown > 0 || yearsLeft(state) <= 3) return false;
  // 旧债与资源溢出从引气起可触发，其余主要针对筑基以后，避免进一步抬高凡胎死亡率。
  if (source !== 'debt' && source !== 'fortune' && run.realm < 2) return false;
  if (source === 'debt' && (run.realm < 1 || (previousMarks === undefined ? run.marks.length : previousMarks) < 2)) return false;
  if ((source === 'debt' || source === 'fortune') && run.realm < 1) return false;
  if ((rng || Math.random)() >= SUDDEN_CHANCE) return false;
  run.sudden = { id: source, stage: 'omen' };
  return true;
}

function advanceAftermath(run) {
  if (run.aftermath) {
    run.aftermath.remaining--;
    if (run.aftermath.remaining <= 0) run.aftermath = null;
  }
  if (run.suddenCooldown > 0) run.suddenCooldown--;
}

function powderInfo(state) {
  const run = state.run;
  const cost = qiAmount(state, POWDER_QI);
  return {
    cost: cost,
    years: POWDER_YEARS,
    ready: run.phase === 'alive' && run.mode === 'demon' && run.qi >= cost,
    visible: run.phase === 'alive' && run.mode === 'demon'
  };
}

// 魔修唯一的主动延寿手段：散功换成药散，普通延寿事件对魔躯无效。
function takePowder(state) {
  const run = state.run;
  const info = powderInfo(state);
  if (!info.ready) return null;
  const before = snapshot(state);
  run.qi -= info.cost;
  run.demonLife += info.years;
  const lines = ['灵气 -' + formatNumber(info.cost), '燃寿 +' + info.years + ' 年'];
  run.log.push({ age: run.age, title: '服散续命', text: lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  return { title: '服散续命', label: '魔火又稳了一些', lines: lines, tags: ['pill', 'life+'], dead: false };
}

// index 为 -1 表示保底选项“闭关不理”。选项不可用时返回 null。
function choose(state, index, rng) {
  const run = state.run;
  const def = eventDef(state);
  if (run.phase !== 'alive' || !def || run.pending) return null;
  const before = snapshot(state);
  const beforeStage = run.realm * STAGES.length + run.stage;
  const beforeMarks = run.marks.length;
  const lines = [];
  const tags = def.type === 'fruit' ? ['fruit'] : (def.type === 'big' ? ['big'] : []);
  let label;
  let wake = '';
  if (index === -1) {
    label = '闭关不理';
    wake = 'rest';
    run.age += FALLBACK_YEARS;
    tags.push('seclude');
    addQiWithLines(state, qiRewardAmount(state, fallbackQi(state)), lines, tags);
  } else {
    const opt = def.options[index];
    if (!opt) return null;
    const cost = optionCost(state, opt);
    if (cost > run.qi) return null;
    label = opt.label;
    // 成功率按做选择时看到的算，不受这次耗掉的寿元影响。
    const p = opt.risk ? riskChance(state, opt.risk) : 0;
    run.age += optionYears(state, opt);
    if (cost) {
      run.qi -= cost;
      lines.push('灵气 -' + formatNumber(cost));
    }
    if (opt.learn) gainSkill(state, opt.learn.id, opt.learn.level, lines, tags);
    if (opt.fx) applyFx(state, opt.fx, rng, lines, tags);
    if (opt.risk) {
      const win = rng() < p;
      const sub = [];
      applyFx(state, win ? opt.risk.win : opt.risk.lose, rng, sub, tags);
      const bonus = sumSkills(run, 'winQi');
      if (win && bonus) addQiWithLines(state, qiRewardAmount(state, bonus), sub, tags);
      tags.push(win ? 'win' : 'lose');
      wake = win ? 'win' : 'lose';
      lines.push((win ? '成了：' : '没成：') + (sub.length ? sub.join('，') : '无事发生'));
    }
  }
  if (run.event.kind === 'event') {
    run.recent.push(run.event.id);
    run.recent = run.recent.slice(-RECENT_EVENTS);
  }
  if (def.type === 'story') run.seen.push(run.event.id);
  // 已达满心魔就先堕魔，不能被这次选择末尾的安抚效果抹掉。
  if (run.demon >= MAX_DEMON && run.mode !== 'demon') becomeDemon(state);
  run.choices++;
  const tick = sumSkills(run, 'tick');
  if (tick) addQiWithLines(state, qiRewardAmount(state, tick), lines, tags);
  const soothe = Math.min(run.demon, sumSkills(run, 'soothe'));
  if (soothe > 0) {
    run.demon -= soothe;
    lines.push('心魔 -' + soothe);
  }
  if (def.type !== 'big') {
    state.bigCount++;
    if (state.bigCount >= BIG_EVERY) {
      state.bigCount = 0;
      state.big = Math.min(MAX_BIG, state.big + 1);
      lines.push('做满 ' + BIG_EVERY + ' 次机缘，得大机缘 +1');
      tags.push('bigup');
    }
  }
  if (def.stage === 'omen') {
    run.sudden = { id: def.trigger, stage: 'event' };
    lines.push('下一回机缘：' + suddenInfo(def.trigger).name);
  } else if (def.stage === 'event') {
    run.aftermath = { id: def.trigger, remaining: SUDDEN_AFTERMATH };
    run.sudden = null;
    run.suddenCount++;
    run.suddenCooldown = SUDDEN_COOLDOWN;
    lines.push('余波：' + suddenInfo(def.trigger).text + '，持续三次普通机缘');
  } else {
    if (def.type !== 'big') advanceAftermath(run);
    if (run.realm * STAGES.length + run.stage > beforeStage) maybeSudden(state, rng, 'meridian');
    if (def.type === 'big' || (run.realm >= 1 && run.chance >= maxChance(state) * 0.9)) maybeSudden(state, rng, 'fortune');
    if (run.marks.length > beforeMarks) maybeSudden(state, rng, 'debt', beforeMarks);
  }
  run.lastTitle = def.title;
  run.wake = wake;
  run.event = null;
  run.log.push({ age: run.age, title: def.title, text: label + '：' + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  const dead = checkDeath(state);
  return { title: def.title, label: label, lines: lines, tags: tags, dead: dead };
}

// index 为 -1 表示放弃新功法，否则替换掉第 index 门已有功法。
function resolveReplace(state, index) {
  const run = state.run;
  if (run.phase !== 'alive' || !run.pending) return false;
  if (index !== -1) {
    if (!run.skills[index]) return false;
    run.skills[index] = run.pending;
  }
  run.pending = null;
  // 换掉体系功法可能让寿元上限下降。
  checkDeath(state);
  return true;
}

// 以下是“自动机缘”开关用的估分：替玩家翻开机缘、挑选项、取舍功法。分数只用来比大小。
// 功法上各种特殊效果每 1 点数值折成多少分；锋、躯、神另按天劫是否要考来算。
const AUTO_WORTH = {
  qi: 15, life: 0.5, storeEdge: 3, demonEdge: 2, stageEdge: 3, trib: 100, tough: 3, tribLife: 0.3, skillQi: 100,
  tick: 150, soothe: 3, keepQi: 10, yearsCut: 3, calm: 20, borrow: 20, seclude: 3, tribYears: 10, demonBody: 2,
  stageLife: 1.5, ageBody: 3, scar: 2, wick: 30, speed: 40, flip: 20, winQi: 15, luckP: 60, fool: 6, oldLuck: 10, store: 0.25
};
const AUTO_BOND_2 = 5;
const AUTO_BOND_4 = 12;
// 随机得来的功法可能自带折寿，寿元上先留出这么多年的余量。
const AUTO_SKILL_MARGIN = 8;

function autoAttrWeight(state, key) {
  const trib = TRIBS[state.run.realm];
  if (!trib) return 1;
  return trib.tests.indexOf(key) >= 0 ? 3 : 1.5;
}

function autoYearWeight(state) {
  return yearsLeft(state) <= 15 ? 2 : 1;
}

function autoBuildWorth(state, skills) {
  const run = state.run;
  const counts = {};
  let total = 0;
  skills.forEach((entry) => {
    const skill = skillInfo(entry.id);
    if (run.aftermath && run.aftermath.id === 'backlash' && skill.arcane) return;
    counts[skill.school] = (counts[skill.school] || 0) + 1;
    SKILL_STATS.forEach((st) => {
      if (!skill[st.key]) return;
      const weight = ATTRS.indexOf(st.key) >= 0 ? autoAttrWeight(state, st.key) : AUTO_WORTH[st.key];
      total += skill[st.key] * entry.level * weight;
    });
  });
  SCHOOL_IDS.forEach((k) => {
    if (counts[k] >= 4) total += AUTO_BOND_4;
    else if (counts[k] >= 2) total += AUTO_BOND_2;
  });
  return total;
}

function withSkills(state, skills, fn) {
  const run = state.run;
  const old = run.skills;
  run.skills = skills;
  try {
    return fn();
  } finally {
    run.skills = old;
  }
}

// 功法已满时拿 entry 换掉哪一门最划算；index 为 -1 表示不如不换。换完会寿元耗尽的方案不考虑。
function autoBestReplace(state, entry) {
  const run = state.run;
  const best = { index: -1, worth: autoBuildWorth(state, run.skills) };
  run.skills.forEach((old, i) => {
    const next = run.skills.slice();
    next[i] = entry;
    if (withSkills(state, next, () => maxLife(state)) <= run.age) return;
    const worth = autoBuildWorth(state, next);
    if (worth > best.worth) {
      best.index = i;
      best.worth = worth;
    }
  });
  return best;
}

function autoReplace(state) {
  return state.run.pending ? autoBestReplace(state, state.run.pending).index : null;
}

function autoFxScore(state, fx) {
  const run = state.run;
  let v = fx.skill ? 6 : 0;
  ATTRS.forEach((k) => {
    if (fx[k]) v += fx[k] * autoAttrWeight(state, k);
  });
  if (fx.qi && !isFull(state)) v += 10 * fx.qi * (run.aftermath && run.aftermath.id === 'meridian' ? 0.7 : 1);
  if (fx.life > 0 && run.mode !== 'demon') v += 0.8 * fx.life;
  else if (fx.life < 0) v -= autoYearWeight(state) * lifeLoss(state, -fx.life);
  if (fx.demon) {
    const d = demonGain(state, fx.demon);
    v += d > 0 ? -d * (run.demon >= 50 ? 0.8 : 0.4) : 0.3 * Math.min(run.demon, -d);
  }
  if (fx.chance) v += 3 * fx.chance;
  if (fx.speed) v += AUTO_WORTH.speed * fx.speed;
  if (fx.slot && run.slots < MAX_EXTRA_SLOTS) v += 10 * fx.slot;
  if (fx.karma && !findById(run.karma, fx.karma)) v += 2;
  if (fx.mark && run.marks.indexOf(fx.mark) < 0) v += 1;
  return v;
}

// 这组效果最坏会折掉多少年寿元、涨多少心魔。体系羁绊会把折寿放大两成，一并算进去。
function autoFxWorst(state, fx) {
  const loss = fx.life < 0 ? Math.ceil(lifeLoss(state, -fx.life) * 1.2) : 0;
  return { years: loss + (fx.skill ? AUTO_SKILL_MARGIN : 0), demon: fx.demon > 0 ? demonGain(state, fx.demon) : 0 };
}

// 选项的估分；选不了，或者最坏情况下会身死，返回 null。
function autoOptionScore(state, opt) {
  const run = state.run;
  const years = optionYears(state, opt);
  const left = choiceYearsLeft(state);
  const cost = optionCost(state, opt);
  if (cost > run.qi) return null;
  const fixed = autoFxWorst(state, opt.fx || {});
  const win = autoFxWorst(state, opt.risk ? opt.risk.win : {});
  const lose = autoFxWorst(state, opt.risk ? opt.risk.lose : {});
  if (years + fixed.years + Math.max(win.years, lose.years) >= left) return null;
  if (run.mode !== 'demon' && run.demon + fixed.demon + Math.max(win.demon, lose.demon) >= MAX_DEMON) return null;
  let score = -years * autoYearWeight(state);
  if (cost) score -= 10 * opt.cost.qi;
  if (opt.learn) {
    const owned = skillEntry(run, opt.learn.id);
    const now = autoBuildWorth(state, run.skills);
    if (owned || run.skills.length < maxSkills(state)) {
      const next = run.skills.filter((s) => s !== owned);
      next.push({ id: opt.learn.id, level: owned ? Math.min(MAX_GRADE, Math.max(owned.level + 1, opt.learn.level)) : opt.learn.level });
      if (withSkills(state, next, () => maxLife(state)) <= run.age + years) return null;
      score += autoBuildWorth(state, next) - now;
    } else {
      score += autoBestReplace(state, opt.learn).worth - now;
    }
  }
  if (opt.fx) score += autoFxScore(state, opt.fx);
  if (opt.risk) {
    const p = riskChance(state, opt.risk);
    score += p * autoFxScore(state, opt.risk.win) + (1 - p) * autoFxScore(state, opt.risk.lose);
  }
  return score;
}

// 当前机缘里估分最高的选项下标，-1 是“闭关不理”。没有不致命的选项时返回 null，留给玩家。
function autoPick(state) {
  const run = state.run;
  const def = eventDef(state);
  if (state.run.phase !== 'alive' || !def || state.run.pending) return null;
  let best = null;
  let bestScore = -Infinity;
  def.options.forEach((opt, i) => {
    const score = autoOptionScore(state, opt);
    if (score !== null && score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  if (FALLBACK_YEARS < choiceYearsLeft(state)) {
    const score = (isFull(state) ? 0 : 10 * fallbackQi(state) * (run.aftermath && run.aftermath.id === 'meridian' ? 0.7 : 1)) - FALLBACK_YEARS * autoYearWeight(state);
    if (score > bestScore) best = -1;
  }
  return best;
}

function autoResolve(state) {
  const run = state.run;
  const pending = run.pending;
  const index = autoReplace(state);
  const dropped = index >= 0 ? run.skills[index] : pending;
  const kept = '《' + skillInfo(pending.id).name + '》';
  const before = snapshot(state);
  const text = index >= 0
    ? '换掉《' + skillInfo(dropped.id).name + '》，留下' + kept
    : '功法已满，放弃' + kept;
  resolveReplace(state, index);
  run.log.push({ age: run.age, title: '取舍功法', text: text, detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  return text;
}

// 自动走一步：先取舍等着的功法，否则翻开机缘（大机缘优先）并做出选择。无事可做时返回 null。
// stuck 为真表示这个机缘没有稳妥的选项，留在原处等玩家决定。
function autoStep(state, rng) {
  const run = state.run;
  if (!autoUnlocked(state) || run.phase !== 'alive' || atSea(run)) return null;
  const out = { result: null, replaced: '', stuck: false };
  if (run.pending) {
    out.replaced = autoResolve(state);
    return out;
  }
  if (!run.event && !drawBig(state, rng) && !drawEvent(state, rng)) return null;
  const index = autoPick(state);
  out.result = index === null ? null : choose(state, index, rng);
  if (!out.result) {
    out.stuck = true;
    return out;
  }
  if (run.pending) out.replaced = autoResolve(state);
  return out;
}

// 竞技场：和排行榜上的人切磋。榜上只有境界和累计灯芯，对手的战力由这两项推算。
const ARENA_REALM_POWER = [12, 45, 130, 380, 850];
const ARENA_STAGE_MULT = [1, 1.25, 1.5];
const ARENA_UNBORN_POWER = 6;
// 胜利按对手战力发论道积分，失败折寿。
const ARENA_WIN_RATE = 0.06;
const ARENA_WIN_MIN = 3;
const ARENA_LOSE_YEARS = 3;
// 对战次数：每 ARENA_INTERVAL_SEC 秒回 1 次，最多存 ARENA_MAX 次。
const ARENA_INTERVAL_SEC = 3600;
const ARENA_MAX = 10;
const ARENA_RANKS = [
  { points: 0, title: '初登论道台' },
  { points: 30, title: '论道新秀' },
  { points: 120, title: '论道名士' },
  { points: 360, title: '论道魁首' }
];

function arenaStanding(state) {
  const nextIndex = ARENA_RANKS.findIndex((rank) => rank.points > state.arenaPoints);
  const next = nextIndex < 0 ? null : ARENA_RANKS[nextIndex];
  const rank = ARENA_RANKS[nextIndex < 0 ? ARENA_RANKS.length - 1 : nextIndex - 1];
  return { points: state.arenaPoints, title: rank.title, next: next };
}

function arenaPower(state) {
  const a = attrs(state);
  return ATTRS.reduce((sum, k) => sum + Math.max(0, a[k]), 0);
}

function arenaFoePower(row) {
  const index = Math.floor(Number(row.realmIndex));
  if (!Number.isFinite(index) || index < 0) return ARENA_UNBORN_POWER;
  const realm = Math.min(REALMS.length - 1, Math.floor(index / STAGES.length));
  const wick = Math.max(0, Number(row.totalWick) || 0);
  return Math.round(ARENA_REALM_POWER[realm] * ARENA_STAGE_MULT[index % STAGES.length] * (1 + Math.min(0.5, Math.log10(1 + wick) / 10)));
}

// row 是榜上的一行：{ id, name, realmIndex, totalWick }。对战次数跨世保留，随时间回复。
function arenaInfo(state, row) {
  const run = state.run;
  const mine = arenaPower(state);
  const foe = arenaFoePower(row);
  const win = Math.max(ARENA_WIN_MIN, Math.round(foe * ARENA_WIN_RATE));
  const info = {
    power: foe,
    chance: clamp(mine / (mine + foe), 0.05, 0.95),
    win: win,
    years: ARENA_LOSE_YEARS,
    left: Math.floor(state.arena),
    reason: ''
  };
  if (run.phase !== 'alive') info.reason = '这一世已经结束';
  else if (info.left < 1) info.reason = '对战次数用完了';
  // 体系羁绊会把折寿放大两成，留出余量，保证输了也不会当场寿尽。
  else if (yearsLeft(state) <= Math.ceil(ARENA_LOSE_YEARS * 1.2)) info.reason = '寿元不足，经不起一败';
  return info;
}

// 离下一次对战次数还有多少秒；已满返回 0。
function arenaWait(state) {
  if (state.arena >= ARENA_MAX) return 0;
  return Math.ceil((Math.floor(state.arena) + 1 - state.arena) * ARENA_INTERVAL_SEC);
}

// times 是最多连打几场，默认 1。次数用完或寿元经不起一败时提前停手；一场都打不了返回 null。
function arenaFight(state, row, rng, times) {
  const run = state.run;
  const before = snapshot(state);
  const beforeTitle = arenaStanding(state).title;
  let wins = 0;
  let losses = 0;
  let gained = 0;
  for (let i = 0; i < (times || 1); i++) {
    const info = arenaInfo(state, row);
    if (info.reason) break;
    state.arena -= 1;
    const win = rng() < info.chance;
    if (win) {
      wins++;
      gained += info.win;
    } else {
      losses++;
      loseLife(run, ARENA_LOSE_YEARS);
    }
  }
  const fights = wins + losses;
  if (!fights) return null;
  state.arenaPoints += gained;
  const title = arenaStanding(state).title;
  const lines = [gained ? '论道积分 +' + gained : '论道积分未增加'];
  if (title !== beforeTitle) lines.push('获得称号「' + title + '」');
  const tags = [wins ? 'win' : 'lose'];
  if (losses) {
    lines.push('折寿 ' + losses * ARENA_LOSE_YEARS + ' 年');
    tags.push('life-');
  }
  const name = toText(row.name, 12) || '无名';
  let label = wins ? '胜了' + name : '败给' + name;
  if (fights > 1) label = '连战' + name + ' ' + fights + ' 场，胜 ' + wins + ' 败 ' + losses;
  run.log.push({ age: run.age, title: '竞技场', text: label + '：' + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  const dead = checkDeath(state);
  return { title: '竞技场', label: label, win: wins > 0, wins: wins, losses: losses, fights: fights, lines: lines, tags: tags, dead: dead };
}
function choiceCosts(state, years, chances) {
  const desc = [];
  if (years) desc.push('耗 ' + years + ' 年寿元');
  if (chances) desc.push('耗 ' + chances + ' 次机缘');
  const reason = years && yearsLeft(state) <= years ? '寿元不足' : (state.run.chance < chances ? '机缘不足' : '');
  return { desc: desc, reason: reason };
}

function seaView(state) {
  const run = state.run;
  const sea = run.sea;
  if (run.realm !== SEA_REALM || run.phase !== 'alive' || run.mode === 'demon' || run.event || run.pending) return null;
  if (!sea) {
    if (!isFull(state)) return null;
    const cost = choiceCosts(state, 1, 0);
    return {
      title: '枯海沉舟',
      text: '金丹圆满时，烬灯指向一艘搁在海床上的龙舟。三拨人都在等船浮起来，你这一世可以跟其中一拨登船。',
      tide: 0,
      maxTide: SEA_TIDE_LIMIT,
      retreat: false,
      options: SEA_ROUTES.map((route) => ({
        id: route.id, label: route.entry, desc: route.text + ' ' + cost.desc.join('，') + '。',
        note: cost.reason, disabled: !!cost.reason
      }))
    };
  }
  if (sea.landed) return null;
  const route = findById(SEA_ROUTES, sea.route);
  const scene = route.scenes[sea.tide - 1];
  const options = scene.options.filter((option) => marksOk(run, option)).map((option) => {
    const cost = choiceCosts(state, option.years, option.chance || 0);
    const demon = demonGain(state, option.demon || 0);
    if (demon) cost.desc.push('心魔 +' + demon);
    if (option.anchor) cost.desc.push('获得「' + route.anchor + '」');
    if (option.clue) cost.desc.push('获得「' + route.clue + '」');
    if (sea.tide + 1 === SEA_TIDE_LIMIT) cost.desc.push('结算后返航');
    const note = cost.reason || (demon && run.demon + demon >= MAX_DEMON ? '此行会堕入魔道' : '');
    return { id: option.id, label: option.label, desc: cost.desc.join(' · '), note: note, disabled: !!cost.reason };
  });
  return {
    title: scene.title, text: scene.text, route: route.name, tide: sea.tide, maxTide: SEA_TIDE_LIMIT,
    retreat: true, anchor: sea.anchor ? route.anchor : '', options: options
  };
}

function seaResult(state, title, label, lines, tags, before, cause) {
  const run = state.run;
  run.lastTitle = title;
  run.log.push({
    age: run.age, title: title, text: label + '：' + lines.join('，'), detail: changeText(before, snapshot(state))
  });
  run.log = run.log.slice(-MAX_LOG);
  return { title: title, label: label, lines: lines, tags: tags, dead: checkDeath(state, cause) };
}

function landingText(sea) {
  sea.landed = true;
  return sea.clue ? '枯海留名：你带着船上的名字回到了岸边。' : '沉舟归岸：你趁水还没漫过船舷，回到了岸边。';
}

function chooseSea(state, id, tide) {
  const run = state.run;
  const view = seaView(state);
  const pick = view && view.tide === tide ? findById(view.options, id) : null;
  if (!pick || pick.disabled) return null;
  const before = snapshot(state);
  const tags = [];
  const lines = [];
  if (!run.sea) {
    run.age += 1;
    run.sea = { route: id, tide: 1, landed: false, anchor: false, clue: false, saltPassed: false };
  } else {
    const sea = run.sea;
    const route = findById(SEA_ROUTES, sea.route);
    const option = findById(route.scenes[sea.tide - 1].options, id);
    run.age += option.years;
    run.chance -= option.chance || 0;
    const demon = demonGain(state, option.demon || 0);
    if (demon) {
      run.demon = Math.min(MAX_DEMON, run.demon + demon);
      lines.push('心魔 +' + demon);
      tags.push('demon+');
    }
    if (option.anchor) {
      sea.anchor = true;
      lines.push('取得「' + route.anchor + '」，可用于盐骨关');
    }
    if (option.clue) {
      sea.clue = true;
      lines.push('取得「' + route.clue + '」，可用于问名关');
    }
    sea.tide++;
    if (sea.tide === SEA_TIDE_LIMIT || run.demon >= MAX_DEMON) lines.push(landingText(sea));
  }
  lines.push('潮位 ' + run.sea.tide + ' / ' + SEA_TIDE_LIMIT);
  return seaResult(state, view.title, pick.label, lines, tags, before);
}

function retreatSea(state) {
  const run = state.run;
  if (!atSea(run)) return null;
  const before = snapshot(state);
  const sea = run.sea;
  const lines = [landingText(sea)];
  if (sea.anchor) lines.push('保留「' + findById(SEA_ROUTES, sea.route).anchor + '」');
  return seaResult(state, '枯海沉舟', '沿接引绳返航', lines, [], before);
}

function tribulationChance(state, ratio) {
  const run = state.run;
  return clamp(0.15 + 0.7 * ratio - 0.03 * Math.floor(run.demon / 10) +
    (hasSet(run, 'sword', 2) ? 0.1 : 0) + 0.03 * lampLevel(state, 'm2') + sumSkills(run, 'trib'), 0.05, 0.98);
}

function tribulationTerms(state, trib) {
  const run = state.run;
  const safe = hasSet(run, 'body', 4);
  const baseYears = safe ? Math.ceil(trib.failYears / 2) : trib.failYears;
  const keep = Math.min(MAX_KEEP_QI, 0.5 + sumSkills(run, 'keepQi'));
  return {
    failYears: Math.ceil(baseYears * (1 - Math.min(MAX_TRIB_YEARS_CUT, sumSkills(run, 'tribYears'))) - 1e-9),
    keep: keep,
    keepText: keep === 0.5 ? '灵气散去一半' : '灵气只保住 ' + pctText(keep),
    failDemon: demonGain(state, TRIB_FAIL_DEMON),
    safe: safe,
    lifeBonus: trib.life + (hasSet(run, 'pill', 4) ? 15 : 0) + sumSkills(run, 'tribLife')
  };
}

function enterNextRealm(state, info, lines) {
  const run = state.run;
  run.realm++;
  run.stage = 0;
  run.qi = 0;
  run.lifeFlat += info.lifeBonus;
  if (hasSet(run, 'sword', 4)) run.forceLegacy = true;
  lines.push('突破至' + realmText(run), '寿元上限 +' + info.lifeBonus + ' 年');
}

function failTribulation(state, info, lines) {
  const run = state.run;
  run.age += info.failYears;
  run.demon = clamp(run.demon + info.failDemon, 0, MAX_DEMON);
  run.qi = qiCap(state) * info.keep;
  if (info.safe) run.age = Math.min(run.age, maxLife(state) - 1);
  lines.push('折寿 ' + info.failYears + ' 年', '心魔 +' + info.failDemon, info.keepText);
}

function yuanTrialView(state) {
  const run = state.run;
  const sea = run.sea;
  if (run.phase !== 'alive' || run.mode === 'demon' || run.realm !== SEA_REALM || !sea || !sea.landed) return null;
  const trib = TRIBS[run.realm];
  const terms = tribulationTerms(state, trib);
  const route = findById(SEA_ROUTES, sea.route);
  const a = attrs(state);
  const options = [];
  const chanceFor = (value) => tribulationChance(state, clamp(value / trib.req, 0, 1.2));
  const attribute = (key, label) => {
    options.push({ id: key, label: label, chance: chanceFor(a[key]), desc: ATTR_NAMES[key] + ' ' + a[key] + ' / ' + trib.req });
  };
  const prepared = (id, label, years, chances) => {
    const cost = choiceCosts(state, years, chances);
    options.push({ id: id, label: label, chance: 1, years: years, chances: chances, desc: cost.desc.join(' · '), note: cost.reason, disabled: !!cost.reason });
  };
  if (sea.saltPassed) {
    attribute('mind', '凭道心守住本名');
    if (sea.clue) prepared('clue', '凭「' + route.clue + '」唤回本名', 0, 8);
    if (run.marks.includes('petword')) prepared('word', '请逃字替你记名', 6, 0);
    if (hasSet(run, 'pill', 2)) prepared('pill', '炼一炉定神丹', 0, 10);
  } else {
    attribute('edge', '斩断盐索');
    attribute('body', '负骨过潮');
    if (sea.anchor) {
      const key = route.anchorAttr || (a.edge >= a.body ? 'edge' : 'body');
      const cost = choiceCosts(state, 0, 8);
      options.push({
        id: 'anchor', label: '以「' + route.anchor + '」定潮', chances: 8,
        chance: chanceFor(a[key] + SALT_ANCHOR_BONUS),
        desc: ATTR_NAMES[key] + ' ' + a[key] + ' + ' + SALT_ANCHOR_BONUS + ' / ' + trib.req + ' · ' + cost.desc.join(' · '),
        note: cost.reason, disabled: !!cost.reason
      });
    }
  }
  const step = sea.saltPassed ? 2 : 1;
  const name = sea.saltPassed ? '问名关' : '盐骨关';
  return Object.assign(terms, {
    step: step, name: name,
    ready: !run.event && !run.pending && isFull(state),
    text: sea.saltPassed ? '潮声把你叫过的每一个名字都念了一遍。你得认出，哪一个是自己的。' : '返潮把锚链一节节拽出海床。你要先越过乱潮，才能听清船底是谁在喊你的名字。',
    options: options
  });
}

function attemptYuanTrial(state, rng, method, step) {
  const info = yuanTrialView(state);
  const option = info && info.ready && info.step === step ? findById(info.options, method) : null;
  if (!option || option.disabled) return null;
  const run = state.run;
  const before = snapshot(state);
  const lines = [];
  run.lastTrib = { name: '元婴劫·' + info.name, chance: option.chance };
  if (option.years) {
    run.age += option.years;
    lines.push('耗 ' + option.years + ' 年寿元');
  }
  if (option.chances) {
    run.chance -= option.chances;
    lines.push('机缘 -' + option.chances);
  }
  const success = option.chance === 1 || rng() < option.chance;
  const advanced = success && info.step === 2;
  if (advanced) {
    enterNextRealm(state, info, lines);
  } else if (success) {
    run.sea.saltPassed = true;
    lines.push('盐骨关已过，下一关考神，也可用问名的准备');
  } else {
    run.sea.saltPassed = false;
    failTribulation(state, info, lines);
    lines.push('备齐灵气后可从盐骨关重试，保留枯海所得');
  }
  if (advanced && option.chance < 1) maybeSudden(state, rng, 'thunder');
  const label = advanced ? '渡劫成功，元婴初成' : (success ? '你穿过了返潮' : '你被潮声送了回来');
  return Object.assign(seaResult(state, '元婴劫·' + info.name, label, lines, [], before, 'trib'),
    { success: success, advanced: advanced });
}

function tribulationInfo(state) {
  const run = state.run;
  const trib = TRIBS[run.realm];
  if (!trib || trib.seaTrial) return null;
  const a = attrs(state);
  let ratio = 0;
  trib.tests.forEach((k) => {
    ratio += Math.min(Math.max(a[k], 0) / trib.req, 1.2);
  });
  ratio /= trib.tests.length;
  const baseChance = tribulationChance(state, ratio);
  return Object.assign(tribulationTerms(state, trib), {
    name: trib.name,
    tests: trib.tests,
    req: trib.req,
    chance: baseChance,
    borrowChance: clamp(baseChance + BORROW_TRIB, 0.05, 0.98),
    borrowReady: run.chance >= BORROW_CHANCE,
    borrowCost: BORROW_CHANCE,
    scatterYears: SCATTER_YEARS,
    ready: run.phase === 'alive' && run.mode !== 'demon' && !run.pending && isFull(state)
  });
}

// method：endure 硬抗（默认），borrow 耗机缘借势，scatter 散功保命。
function attemptTribulation(state, rng, method) {
  const run = state.run;
  const info = tribulationInfo(state);
  method = method || 'endure';
  if (!info || !info.ready || ['endure', 'borrow', 'scatter'].indexOf(method) < 0) return null;
  if (method === 'borrow' && run.chance < BORROW_CHANCE) return null;
  const lines = [];
  const before = snapshot(state);
  const chance = method === 'borrow' ? info.borrowChance : info.chance;
  run.lastTrib = { name: info.name, chance: method === 'scatter' ? 0 : chance, method: method };
  if (method === 'borrow') {
    run.chance -= BORROW_CHANCE;
    lines.push('借势：机缘 -' + BORROW_CHANCE + '，成功率 +' + pctText(BORROW_TRIB));
  }
  let success = false;
  if (method === 'scatter') {
    run.age += SCATTER_YEARS;
    run.qi = qiCap(state) * 0.5;
    run.age = Math.min(run.age, maxLife(state) - 1);
    lines.push('散功：折寿 ' + SCATTER_YEARS + ' 年，不会身死');
    lines.push('灵气散去一半');
  } else {
    success = rng() < chance;
    if (success) {
      enterNextRealm(state, info, lines);
    } else {
      failTribulation(state, info, lines);
    }
  }
  if (success) maybeSudden(state, rng, 'thunder');
  const methodName = method === 'borrow' ? '借势' : (method === 'scatter' ? '散功' : '硬抗');
  run.log.push({ age: run.age, title: info.name, text: methodName + (success ? '，渡劫成功：' : '，渡劫失败：') + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  const dead = checkDeath(state, 'trib');
  return { name: info.name, method: method, success: success, chance: chance, lines: lines, dead: dead };
}

function retire(state) {
  if (state.run.phase !== 'alive') return false;
  die(state, 'retire');
  return true;
}

function canCarry(state) {
  return state.run.phase === 'dead' && lampLevel(state, 'm1') > 0 && state.run.skills.some((entry) => !!findById(SKILLS, entry.id));
}

function setCarry(state, id) {
  if (!canCarry(state) || !findById(SKILLS, id) || !skillEntry(state.run, id)) return false;
  state.carry = id;
  return true;
}

function reincarnate(state, now, rng) {
  if (state.run.phase !== 'dead') return false;
  state.run = newRun(state, rng);
  state.lastTime = now;
  return true;
}

// 投胎时把候选整批换掉，一世最多 ROOT_REROLLS 次。
function rerollRoots(state, rng) {
  const run = state.run;
  if (run.phase !== 'root' || run.rootRolls < 1) return false;
  run.rootRolls--;
  run.rootChoices = rollRoots(rootCount(state), rng);
  return true;
}

function chooseRoot(state, id, now, rng) {
  const run = state.run;
  if (run.phase !== 'root' || run.rootChoices.indexOf(id) < 0) return false;
  const root = rootInfo(id);
  run.root = id;
  run.rootChoices = [];
  run.rootRolls = 0;
  run.phase = 'alive';
  ATTRS.forEach((k) => {
    run.stats[k] = (root[k] || 0) + lampLevel(state, 'm3');
  });
  run.lifeFlat = root.life || 0;
  run.freeRerolls = lampLevel(state, 'y2');
  const lines = [];
  if (state.carry && lampLevel(state, 'm1') > 0 && findById(SKILLS, state.carry)) gainSkill(state, state.carry, 1, lines, []);
  state.carry = '';
  if (lampLevel(state, 'r3') > 0) {
    const pool = SKILLS.filter((s) => root.schools.indexOf(s.school) >= 0 && !skillEntry(run, s.id));
    gainSkill(state, pick(pool, rng).id, 1, lines, []);
  }
  run.chance = maxChance(state);
  state.lastTime = now;
  return true;
}

function lampCost(state, id) {
  const lamp = findById(LAMPS, id);
  return lamp.cost * Math.pow(2, lampLevel(state, id));
}

function lampMaxed(state, id) {
  return lampLevel(state, id) >= findById(LAMPS, id).max;
}

function buyLamp(state, id) {
  if (!findById(LAMPS, id) || lampMaxed(state, id)) return false;
  const cost = lampCost(state, id);
  if (state.wick < cost) return false;
  state.wick -= cost;
  state.lamps[id] = lampLevel(state, id) + 1;
  // 上限涨了以后，等着取舍的新功法直接收下。
  const run = state.run;
  if (run.pending && run.skills.length < maxSkills(state)) {
    run.skills.push(run.pending);
    run.pending = null;
  }
  return true;
}

function toCount(value, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return max === undefined ? n : Math.min(n, max);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rerolls = toCount(raw.rerolls, 1);
  if (raw.kind === 'legacy') {
    if (!LEGACY_INTROS[raw.intro] || !Array.isArray(raw.offers)) return null;
    const offers = [];
    raw.offers.slice(0, 5).forEach((o) => {
      if (!o || !findById(SKILLS, o.id) || findById(offers, o.id)) return;
      offers.push({ id: o.id, level: clamp(toCount(o.level), 1, MAX_GRADE) });
    });
    if (!offers.length) return null;
    const legacy = { kind: 'legacy', intro: raw.intro, offers: offers, rerolls: rerolls };
    if (raw.big === true) legacy.big = true;
    return legacy;
  }
  const def = raw.kind === 'event' ? findById(EVENTS, raw.id) : null;
  if (!def) return null;
  const ev = { kind: 'event', id: def.id, rerolls: rerolls };
  if (def.type === 'fruit') ev.fruit = true;
  if (def.trigger) {
    ev.trigger = def.trigger;
    ev.stage = def.stage;
  }
  return ev;
}

function normalizeSea(run, raw) {
  if (!raw || run.realm < SEA_REALM || (run.realm === SEA_REALM && run.stage !== STAGES.length - 1) ||
    !findById(SEA_ROUTES, raw.route)) return null;
  const tide = clamp(toCount(raw.tide), 1, SEA_TIDE_LIMIT);
  const landed = raw.landed === true || tide === SEA_TIDE_LIMIT || run.realm > SEA_REALM || run.mode === 'demon' ||
    run.demon >= MAX_DEMON || !!run.event || !!run.pending;
  return {
    route: raw.route, tide: tide, landed: landed,
    anchor: tide >= 2 && raw.anchor === true,
    clue: tide === SEA_TIDE_LIMIT && raw.clue === true,
    saltPassed: landed && raw.saltPassed === true
  };
}

function normalizeRun(state, raw, rng) {
  const run = newRun(state, rng);
  if (!raw || typeof raw !== 'object') return run;
  const phase = raw.phase;
  if (phase !== 'alive' && phase !== 'dead') {
    if (findById(FATES, raw.fate)) run.fate = raw.fate;
    if (phase === 'root' && Array.isArray(raw.rootChoices)) {
      const choices = [];
      raw.rootChoices.forEach((id) => {
        if (rootInfo(id) && choices.indexOf(id) < 0) choices.push(id);
      });
      if (choices.length >= 2) {
        run.rootChoices = choices;
        if (raw.rootRolls !== undefined) run.rootRolls = toCount(raw.rootRolls, ROOT_REROLLS);
      }
    }
    return run;
  }
  if (!rootInfo(raw.root)) return run;
  run.phase = phase;
  run.rootChoices = [];
  run.rootRolls = 0;
  run.root = raw.root;
  // 更新前已经开始的这一世不补抽命格，避免读档突然改变寿元或产出。
  run.fate = findById(FATES, raw.fate) ? raw.fate : '';
  run.realm = toCount(raw.realm, REALMS.length - 1);
  run.stage = toCount(raw.stage, STAGES.length - 1);
  run.age = toCount(raw.age);
  run.lifeFlat = Math.round(toNumber(raw.lifeFlat));
  run.demon = toCount(raw.demon, MAX_DEMON);
  run.mode = raw.mode === 'demon' ? 'demon' : 'human';
  run.fallAge = Math.min(run.age, toCount(raw.fallAge));
  run.demonLife = toCount(raw.demonLife);
  run.speed = Math.max(0, toNumber(raw.speed));
  const stats = raw.stats || {};
  ATTRS.forEach((k) => {
    run.stats[k] = Math.round(toNumber(stats[k]));
  });
  run.slots = toCount(raw.slots, MAX_EXTRA_SLOTS);
  if (Array.isArray(raw.skills)) {
    raw.skills.forEach((s) => {
      const skill = s && skillInfo(s.id);
      if (!skill || skillEntry(run, s.id) || run.skills.length >= skillCap(state, run)) return;
      run.skills.push({ id: s.id, level: skill.arcane ? 1 : clamp(toCount(s.level), 1, MAX_GRADE) });
    });
  }
  run.choices = toCount(raw.choices);
  if (Array.isArray(raw.karma)) {
    raw.karma.forEach((k) => {
      if (k && KARMA[k.id] && !findById(run.karma, k.id)) run.karma.push({ id: k.id, due: toCount(k.due) });
    });
  }
  if (Array.isArray(raw.recent)) {
    run.recent = raw.recent.filter((id) => !!findById(EVENTS, id)).slice(-RECENT_EVENTS);
  }
  if (Array.isArray(raw.marks)) {
    raw.marks.forEach((m) => {
      if (typeof m === 'string' && MARKS[m] && run.marks.indexOf(m) < 0) run.marks.push(m);
    });
  }
  if (Array.isArray(raw.seen)) {
    raw.seen.forEach((id) => {
      const def = typeof id === 'string' ? findById(EVENTS, id) : null;
      if (def && def.type === 'story' && run.seen.indexOf(id) < 0) run.seen.push(id);
    });
  }
  if (Array.isArray(raw.log)) {
    raw.log.slice(-MAX_LOG).forEach((l) => {
      if (l && typeof l === 'object') {
        const entry = { title: toText(l.title, 40), text: toText(l.text, 300), detail: toText(l.detail, 300) };
        if (l.age !== undefined) entry.age = toCount(l.age);
        run.log.push(entry);
      }
    });
  }
  run.wake = WAKES[raw.wake] ? raw.wake : '';
  run.forceLegacy = raw.forceLegacy === true;
  run.freeRerolls = toCount(raw.freeRerolls, findById(LAMPS, 'y2').max);
  run.lastTitle = toText(raw.lastTitle, 40);
  if (raw.lastTrib && typeof raw.lastTrib === 'object') {
    run.lastTrib = { name: toText(raw.lastTrib.name, 20), chance: clamp(toNumber(raw.lastTrib.chance), 0, 1) };
    if (['endure', 'borrow', 'scatter'].indexOf(raw.lastTrib.method) >= 0) run.lastTrib.method = raw.lastTrib.method;
  }
  // 丹田容量和机缘上限依赖境界、功法和灯纹，所以放在它们之后校验。
  state.run = run;
  run.qi = clamp(toNumber(raw.qi), 0, qiCap(state));
  run.chance = clamp(toNumber(raw.chance), 0, maxChance(state) + CHANCE_OVERFLOW);
  run.suddenCount = toCount(raw.suddenCount, SUDDEN_MAX);
  run.suddenCooldown = toCount(raw.suddenCooldown, SUDDEN_COOLDOWN);
  if (raw.sudden && suddenInfo(raw.sudden.id) && ['omen', 'event'].indexOf(raw.sudden.stage) >= 0) {
    run.sudden = { id: raw.sudden.id, stage: raw.sudden.stage };
  }
  if (raw.aftermath && suddenInfo(raw.aftermath.id)) {
    const remaining = toCount(raw.aftermath.remaining, SUDDEN_AFTERMATH);
    if (remaining) run.aftermath = { id: raw.aftermath.id, remaining: remaining };
  }
  if (phase === 'dead') {
    const death = raw.death && typeof raw.death === 'object' ? raw.death : {};
    run.death = {
      cause: DEATH_MULT[death.cause] ? death.cause : 'age',
      wick: toCount(death.wick),
      text: toText(death.text, 300)
    };
    run.sea = normalizeSea(run, raw.sea);
    return run;
  }
  run.event = normalizeEvent(raw.event);
  if (run.event && run.event.trigger && !run.sudden) run.sudden = { id: run.event.trigger, stage: run.event.stage };
  // 存档里的机缘已失效（例如事件被改名）时，把消耗的那次机缘还回去。
  if (raw.event && !run.event) {
    if (raw.event.big === true) state.big = Math.min(MAX_BIG, state.big + 1);
    else run.chance += 1;
  }
  const pending = raw.pending;
  if (pending && findById(SKILLS, pending.id) && !skillEntry(run, pending.id) && run.skills.length >= maxSkills(state)) {
    run.pending = { id: pending.id, level: clamp(toCount(pending.level), 1, MAX_GRADE) };
  }
  run.sea = normalizeSea(run, raw.sea);
  return run;
}

// 存档可能来自旧版本或已损坏，逐字段校验后再使用。
function normalizeState(raw, now, rng) {
  rng = rng || Math.random;
  const state = createState(now, rng);
  if (!raw || typeof raw !== 'object') return state;
  state.wick = toCount(raw.wick);
  state.totalWick = Math.max(toCount(raw.totalWick), state.wick);
  state.lives = toCount(raw.lives);
  const best = Math.floor(Number(raw.best));
  state.best = Number.isFinite(best) ? clamp(best, -1, WICK_SCORE.length - 1) : -1;
  const lamps = raw.lamps || {};
  LAMPS.forEach((lamp) => {
    const level = toCount(lamps[lamp.id], lamp.max);
    if (level) state.lamps[lamp.id] = level;
  });
  if (Array.isArray(raw.epitaphs)) {
    state.epitaphs = raw.epitaphs.filter((e) => typeof e === 'string').slice(0, MAX_EPITAPHS).map((e) => e.slice(0, 300));
  }
  const last = Number(raw.lastTime);
  state.lastTime = Number.isFinite(last) && last > 0 && last <= now ? last : now;
  state.big = toCount(raw.big, MAX_BIG);
  state.bigCount = toCount(raw.bigCount, BIG_EVERY - 1);
  if (raw.arena !== undefined) state.arena = clamp(toNumber(raw.arena), 0, ARENA_MAX);
  state.arenaPoints = toCount(raw.arenaPoints);
  state.run = normalizeRun(state, raw.run, rng);
  // 挑好的前世功法在身死后、投胎选灵根前都要保留。
  const phase = state.run.phase;
  const carried = phase === 'dead' ? !!skillEntry(state.run, raw.carry) && !!findById(SKILLS, raw.carry) : phase === 'root' && !!findById(SKILLS, raw.carry);
  state.carry = carried && lampLevel(state, 'm1') > 0 ? raw.carry : '';
  if (state.run.phase === 'alive') checkDeath(state);
  return state;
}

// 本纪直接由这一世的见闻排版；旧存档没有年岁时以“未记”展示，不伪造时间。
function chronicle(state) {
  const run = state.run;
  const number = state.lives + (run.phase === 'dead' ? 0 : 1);
  const root = rootInfo(run.root);
  const fate = fateInfo(run);
  const rows = run.log.map((entry) => ({
    age: typeof entry.age === 'number' ? entry.age : null,
    title: entry.title,
    text: entry.text,
    detail: entry.detail || ''
  }));
  if (run.phase === 'dead' && run.death) {
    rows.push({ age: run.age, title: '本纪终', text: run.death.text, detail: '灯芯 +' + run.death.wick });
  }
  return {
    title: '第 ' + number + ' 世本纪',
    subtitle: (root ? root.name : '未择根骨') + (fate.name ? ' · ' + fate.name : ''),
    intro: '这一世做过 ' + run.choices + ' 次选择，行至' + realmText(run) + '，享年 ' + run.age + ' 岁。',
    rows: rows
  };
}

function trimDecimals(value, digits) {
  const p = Math.pow(10, digits);
  // 向下取整，避免显示的数额比实际拥有的多。
  return (Math.floor(value * p + 1e-9) / p).toFixed(digits);
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) n = 0;
  if (n < 10000) {
    if (n < 100 && Math.abs(n - Math.round(n)) > 1e-9) return trimDecimals(n, 1);
    return String(Math.floor(n + 1e-9));
  }
  let value = n;
  let idx = 0;
  while (value >= 10000 && idx < UNITS.length - 1) {
    value /= 10000;
    idx++;
  }
  if (value >= 10000) return n.toExponential(2);
  return trimDecimals(value, 2) + UNITS[idx];
}

function formatDuration(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + ' 小时 ' + m + ' 分钟';
  if (m > 0) return m + ' 分钟';
  return s + ' 秒';
}

module.exports = {
  SCHOOL_IDS,
  SCHOOLS,
  GRADES,
  SKILLS,
  FATES,
  ARCANES,
  SUDDENS,
  SUDDEN_MAX,
  SUDDEN_COOLDOWN,
  SUDDEN_AFTERMATH,
  ROOTS,
  RARE_ROOTS,
  ROOT_RARITIES,
  rootInfo,
  REALMS,
  STAGES,
  TRIBS,
  AUTO_LAMP,
  LAMPS,
  KARMA,
  MARKS,
  EVENTS,
  LEGACY_INTROS,
  ATTRS,
  ATTR_NAMES,
  MAX_SKILLS,
  ROOT_REROLLS,
  rollRoots,
  rerollRoots,
  MAX_EXTRA_SLOTS,
  MAX_DEMON,
  DEMON_YEARS,
  DEMON_QI_RATE,
  CHANCE_INTERVAL_SEC,
  BIG_EVERY,
  createState,
  normalizeState,
  lampLevel,
  maxSkills,
  setCounts,
  hasSet,
  attrs,
  qiCap,
  qiRate,
  maxLife,
  yearsLeft,
  maxChance,
  chanceInterval,
  realmText,
  layerIndex,
  layerName,
  atSea,
  isFull,
  advance,
  skillInfo,
  skillDesc,
  skillTitle,
  skillUpgradeDesc,
  mergeOptions,
  mergeSkills,
  eventView,
  canDraw,
  drawEvent,
  canDrawBig,
  drawBig,
  rerollEvent,
  choose,
  resolveReplace,
  autoPick,
  autoReplace,
  autoUnlocked,
  autoStep,
  arenaPower,
  arenaInfo,
  arenaFight,
  arenaWait,
  arenaStanding,
  ARENA_MAX,
  SEA_REALM,
  SEA_TIDE_LIMIT,
  seaView,
  chooseSea,
  retreatSea,
  yuanTrialView,
  attemptYuanTrial,
  tribulationInfo,
  attemptTribulation,
  maybeSudden,
  aftermathText,
  powderInfo,
  takePowder,
  chronicle,
  wickGain,
  retire,
  canCarry,
  setCarry,
  reincarnate,
  chooseRoot,
  lampCost,
  lampMaxed,
  buyLamp,
  formatNumber,
  formatDuration
};
