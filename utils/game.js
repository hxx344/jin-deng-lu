// 《烬灯录》的游戏规则，不依赖微信接口。所有随机数由调用方传入 rng（返回 [0, 1) 的函数），便于测试。
const content = require('./content');
const combatPower = require('./combat-power');
const mountain = require('./mountain');
const battle = require('./battle');
const gear = require('./gear');

const SCHOOL_IDS = content.SCHOOL_IDS;
const SCHOOLS = content.SCHOOLS;
const GRADES = content.GRADES;
const SKILLS = content.SKILLS;
const FATES = content.FATES;
const ARCANES = content.ARCANES;
const TOME_GRADES = content.TOME_GRADES;
const TOMES = content.TOMES;
const TOME_TIERS = content.TOME_TIERS;
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
const BIG_EVENTS = content.BIG_EVENTS;
const TRIB_ASPECTS = content.TRIB_ASPECTS;
const PATH_COUNTER = content.PATH_COUNTER;
const SUDDENS = content.SUDDENS;
const EVENTS = content.EVENTS;
const TRAIN_FOES = content.TRAIN_FOES;

const BASE_QI_CAP = 100;
const BASE_LIFE = 60;
// 一世之内的时间只随寿元走：每耗 1 年寿元，灵气和机缘按这么多秒结算。机缘间隔和各境界的灵气产出仍以秒计。
const YEAR_SECONDS = 12;
const CHANCE_INTERVAL_SEC = 60;
const BASE_MAX_CHANCE = 60;
// 投胎时只带上限的这么多机缘，其余靠年岁攒。
const START_CHANCE_SHARE = 1 / 3;
// 每高一个大境界，攒一次机缘要过的年数乘这么多，和破境加的寿元一起涨。
const CHANCE_REALM_GROWTH = 1.15;
// 灯油按现实时间积攒，离线也攒，跨世保留；一滴换一次机缘重抽。
const OIL_INTERVAL_SEC = 900;
const OIL_MAX = 6;
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
// 藏经阁功法的品级接在天品之后。
const TOME_MIN = MAX_GRADE + 1;
const GRADE_NAMES = GRADES.concat(TOME_GRADES);
// 已请出的藏经阁功法在传承里出现的权重，相对同系的普通功法。
const TOME_WEIGHT = 0.5;
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
// 一世最多服几次散，免得魔修靠服散永远不死。
const POWDER_MAX = 3;
const BORROW_CHANCE = 30;
const BORROW_TRIB = 0.15;
// 逐道雷的天劫每道雷单独借势：耗的机缘和这一道加的成功率。
const BOLT_BORROW_CHANCE = 10;
const BOLT_BORROW_TRIB = 0.1;
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
const TYPE_NAMES = { legacy: '传承', adventure: '奇遇', karma: '因果', fruit: '因果', idle: '闲事', rare: '奇缘', story: '故事', omen: '征兆', sudden: '突发' };
const ATTRS = ['edge', 'body', 'mind'];
const ATTR_NAMES = { edge: '锋', body: '躯', mind: '神' };
// 按“境界 × 3 + 小境界”取基础值；圆满奖励由各境界单独定义。
const WICK_SCORE = [2, 3, 4, 8, 11, 14, 24, 30, 36, 60, 75, 90, 160, 190, 220];
REALMS.forEach((realm) => {
  if (realm.wick) realm.wick.forEach((score) => WICK_SCORE.push(score));
});
const SEA_REALM = TRIBS.findIndex((trial) => trial.seaTrial);
const SEA_LAYER = REALMS[SEA_REALM + 1].layer;
// 洞府在枯海前一个大境界的后期开放。
const CAVE_REALM = SEA_REALM - 1;

function caveOpen(run) {
  return run.realm > CAVE_REALM || (run.realm === CAVE_REALM && run.stage === STAGES.length - 1);
}
const SEA_TIDE_LIMIT = 3;
const SALT_ANCHOR_BONUS = 60;
const DEATH_MULT = { age: 1, retire: 1, trib: 1.2, demon: 1.5 };
const UNITS = ['', '万', '亿', '兆', '京'];
// 劫期：每个境界里可以从容做这么多次普通机缘；过期后每次机缘额外折寿，每再拖 OVERDUE_STEP 次加重一档。
// 多折的这些年和天劫失败折的寿一样是白折的，不涨灵气也不攒机缘。
const TRIB_TERMS = [30, 36, 44, 52, 40];
const OVERDUE_YEARS = [1, 1, 2, 4, 8];
// 元婴之后的境界：劫期一律 40 次，过期后每次多折的寿元逐境界加四成。
for (let i = TRIB_TERMS.length; i < REALMS.length; i++) {
  TRIB_TERMS.push(40);
  OVERDUE_YEARS.push(Math.round(OVERDUE_YEARS[4] * Math.pow(1.4, i - 4)));
}
const OVERDUE_STEP = 5;
const MIN_TERM = 10;
// 道途：主修一系的功法效果放大，被它克制的一系削弱。
const PATH_MAIN = 1.5;
const PATH_WEAK = 0.5;
// 重天：每高一重，天劫要求、劫期和灯芯的变化幅度。
const HEAVEN_MAX = 9;
const HEAVEN_REQ = 0.25;
// 每高一重，渡劫成功率降这么多；枯海备下的“必过”手段也不再必过。
const HEAVEN_TRIB = 0.04;
const HEAVEN_PREPARED = 0.08;
const HEAVEN_TERM = 0.05;
const HEAVEN_WICK = 0.5;
// 每解锁一重天，这几种灯纹的上限加一级。
const DEEP_LAMPS = ['r1', 'r4', 'm3'];
// 没选过的选项只显示牵涉哪几样东西。
const FX_KINDS = [['qi', '灵气'], ['edge', '锋'], ['body', '躯'], ['mind', '神'], ['demon', '心魔'], ['life', '寿元上限'], ['chance', '机缘'],
  ['speed', '机缘速度'], ['skill', '功法'], ['slot', '功法位'], ['karma', '因果'], ['mark', '经历'], ['unmark', '经历']];

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
    tribs: rollAspects(rng),
    heaven: state.heaven || 0,
    path: '',
    realmChoices: 0,
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
    powders: 0,
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
    tribBoon: 0,
    lastTitle: '',
    lastTrib: null,
    // 逐道雷的天劫渡到一半：bolt 是已接住的必接雷数，gains 是已接住的余雷数。
    trib: null,
    sea: null,
    materials: 0,
    stone: 0,
    dew: 0,
    mountainChoices: 0,
    mountainRevision: 0,
    cave: null,
    sect: null,
    sudden: null,
    suddenCount: 0,
    suddenCooldown: 0,
    aftermath: null,
    // 藏经阁功法的每世次数：已续命、已挡下的失败、已用掉的必成。
    revived: false,
    wards: 0,
    sures: 0,
    // 历练：cleared 是这一世过的最远一关，back 是败了之后眼下比它退回了几关，bag 是储物袋里攒着的灵气（按丹田容量的比例记），loot 是储物袋里攒着的装备件数。
    battle: { cleared: 0, back: 0, bag: 0, loot: 0 },
    gear: emptyGear(),
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
    // 藏经阁里已请出的功法：id → 品级。
    tomes: {},
    epitaphs: [],
    carry: '',
    // 大机缘次数和攒大机缘的进度跨世保留。
    big: 0,
    bigCount: 0,
    arena: ARENA_MAX,
    arenaPoints: 0,
    oil: 0,
    mountainLegacy: null,
    // 重天：heaven 是下一世要去的那一重，heavenMax 是已解锁的最高一重。
    heaven: 0,
    heavenMax: 0,
    // 见闻：每个事件里选过哪些选项，按选项下标记成位。
    known: {},
    // 历练过到第几关的最高纪录，跨世保留。
    trainBest: 0,
    run: null
  };
  state.run = newRun(state, rng || Math.random);
  return state;
}

const SKILL_INDEX = new Map();
ARCANES.concat(SKILLS, TOMES).forEach((skill) => SKILL_INDEX.set(skill.id, skill));

function skillInfo(id) {
  return SKILL_INDEX.get(id) || null;
}

function skillEntry(run, id) {
  return findById(run.skills, id);
}

function fateInfo(run) {
  return findById(FATES, run.fate) || {};
}

// 这一世持有的藏经阁功法里，名为 name 的规则当前的数值；没有就是 0。
function mech(run, name) {
  for (let i = 0; i < run.skills.length; i++) {
    const skill = skillInfo(run.skills[i].id);
    if (skill.tome && skill.mech === name) return skill.v[run.skills[i].level - TOME_MIN];
  }
  return 0;
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

function skillSuppressed(run, skill) {
  return skill.arcane && run.aftermath && run.aftermath.id === 'backlash';
}

function sumSkills(run, key) {
  let total = 0;
  run.skills.forEach((s) => {
    const skill = skillInfo(s.id);
    if (skillSuppressed(run, skill)) return;
    const value = (skill[key] || 0) * s.level * pathMult(run, skill);
    // 整数类的效果换算后去掉零头，免得属性出现半点。
    total += Number.isInteger(skill[key]) ? Math.trunc(value) : value;
  });
  return total;
}

// 这一世前三场天劫各考什么。随机数恒为 0 时依次是躯神、锋躯、锋神。
function rollAspects(rng) {
  const out = [];
  for (let i = 0; i < SEA_REALM; i++) {
    const n = Math.min(TRIB_ASPECTS.length - 1, Math.floor(rng() * TRIB_ASPECTS.length));
    out.push(TRIB_ASPECTS[(n + i) % TRIB_ASPECTS.length].id);
  }
  return out;
}

function validAspects(raw) {
  return Array.isArray(raw) && raw.length === SEA_REALM && raw.every((id) => !!findById(TRIB_ASPECTS, id)) ? raw.slice() : null;
}

function tribAspect(run, realm) {
  return findById(TRIB_ASPECTS, run.tribs[realm]) || TRIB_ASPECTS[realm % TRIB_ASPECTS.length];
}

function tribReq(state, trib, mult) {
  return Math.round(trib.req * (mult || 1) * (1 + HEAVEN_REQ * state.run.heaven));
}

// 这一世要过的每一场天劫：名字、劫相、考哪几项、每项要多少。
function tribPlan(state) {
  return TRIBS.map((trib, i) => {
    if (trib.seaTrial) return { name: trib.name, aspect: '', tests: trib.tests, req: tribReq(state, trib) };
    const aspect = tribAspect(state.run, i);
    return { name: trib.name, aspect: aspect.name, tests: aspect.tests, req: tribReq(state, trib, aspect.req) };
  });
}

// 劫期：term 是这个境界的期限，left 是还剩几次；过期后 years 是每次机缘多折的寿元。魔修不受劫期管。
function tribTerm(state) {
  const run = state.run;
  const term = Math.max(MIN_TERM, Math.round(TRIB_TERMS[run.realm] * (1 - HEAVEN_TERM * run.heaven)));
  const over = run.realmChoices - term;
  const overdue = run.phase === 'alive' && run.mode !== 'demon' && over >= 0;
  return {
    term: term,
    used: run.realmChoices,
    left: Math.max(0, -over),
    overdue: overdue,
    years: overdue ? (1 + Math.floor(over / OVERDUE_STEP)) * OVERDUE_YEARS[run.realm] : 0
  };
}

function pathMult(run, skill) {
  if (!run.path) return 1;
  if (skill.school === run.path) return PATH_MAIN;
  return skill.school === PATH_COUNTER[run.path] ? PATH_WEAK : 1;
}

function pathReady(state) {
  const run = state.run;
  return run.phase === 'alive' && run.realm >= 1 && !run.path && !run.event && !run.pending;
}

// 引气之后择一系主修，这一世不能改。换算后寿元上限不够活的选不了。
function pathView(state) {
  if (!pathReady(state)) return null;
  const run = state.run;
  const counts = setCounts(run);
  return {
    title: '择道',
    text: '引气入体之后，该定下这一世主修哪一系了。主修一系的功法效果 ×' + PATH_MAIN + '，被它克制的一系 ×' + PATH_WEAK + '，传承里主修的功法也更常见。定了就不能改。',
    options: SCHOOL_IDS.map((id) => {
      const weak = PATH_COUNTER[id];
      run.path = id;
      const fatal = maxLife(state) <= run.age;
      run.path = '';
      return {
        id: id,
        label: '主修' + SCHOOLS[id].name + '系',
        desc: SCHOOLS[id].name + '系 ' + counts[id] + ' 门 ×' + PATH_MAIN + '；' + SCHOOLS[weak].name + '系 ' + counts[weak] + ' 门 ×' + PATH_WEAK,
        note: fatal ? '寿元撑不住' : '',
        disabled: fatal
      };
    })
  };
}

function choosePath(state, id) {
  const view = pathView(state);
  const option = view && findById(view.options, id);
  if (!option || option.disabled) return null;
  const run = state.run;
  const before = snapshot(state);
  run.path = id;
  const lines = [SCHOOLS[id].name + '系功法效果 ×' + PATH_MAIN, SCHOOLS[PATH_COUNTER[id]].name + '系功法效果 ×' + PATH_WEAK];
  run.log.push({ age: run.age, title: '择道', text: option.label + '：' + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  return { title: '择道', label: option.label, lines: lines, tags: ['skill:' + id, 'bond'], dead: checkDeath(state) };
}

function heavenText(level) {
  return level ? '天劫属性要求 +' + pctText(HEAVEN_REQ * level) + '，装备分要求 +' + pctText(GEAR_HEAVEN * level) + '，渡劫成功率 -' + pctText(HEAVEN_TRIB * level) + '，劫期 -' + pctText(HEAVEN_TERM * level) + '，灯芯 +' + pctText(HEAVEN_WICK * level)
    : '最初的天：没有刁难，也没有加成';
}

// 投胎前选这一世去第几重天，只能选已经解锁的。
function setHeaven(state, level) {
  const run = state.run;
  if (run.phase !== 'root' || !Number.isInteger(level) || level < 0 || level > state.heavenMax) return false;
  state.heaven = level;
  run.heaven = level;
  return true;
}

// 这个选项以前有没有选过。功法传承一向写明，不算在内。
function optionKnown(state, opt) {
  const ev = state.run.event;
  if (opt.learn || !ev || ev.kind !== 'event') return true;
  const index = findById(EVENTS, ev.id).options.indexOf(opt);
  return index < 0 || !!((state.known[ev.id] || 0) & (1 << index));
}

function learnOption(state, opt) {
  const ev = state.run.event;
  if (opt.learn || !ev || ev.kind !== 'event') return;
  const index = findById(EVENTS, ev.id).options.indexOf(opt);
  if (index >= 0) state.known[ev.id] = (state.known[ev.id] || 0) | (1 << index);
}

function hiddenDesc(state, opt) {
  const segments = [];
  const because = (opt.need || []).map((m) => '【' + MARKS[m] + '】').join('') +
    (opt.school ? SCHOOLS[opt.school].name + '系 ' + SCHOOL_NEED + ' 门' : '');
  if (because) segments.push('因' + because);
  const cost = optionCost(state, opt);
  if (cost) segments.push('耗灵气 ' + formatNumber(cost));
  const kinds = [];
  [opt.fx, opt.risk && opt.risk.win, opt.risk && opt.risk.lose].forEach((fx) => {
    if (!fx) return;
    FX_KINDS.forEach((kind) => {
      if (fx[kind[0]] && kinds.indexOf(kind[1]) < 0) kinds.push(kind[1]);
    });
  });
  segments.push((opt.risk ? '成败未卜' : '后果未明') + (kinds.length ? '，牵涉' + kinds.join('、') : '') + '。选过一次就记得');
  return segments.join('；');
}

// 见闻：全部事件选项里已经选过多少个。
function knownProgress(state) {
  let known = 0;
  let total = 0;
  EVENTS.forEach((ev) => {
    total += ev.options.length;
    for (let i = 0; i < ev.options.length; i++) {
      if ((state.known[ev.id] || 0) & (1 << i)) known++;
    }
  });
  return { known: known, total: total };
}

function lampMax(state, id) {
  return findById(LAMPS, id).max + (DEEP_LAMPS.indexOf(id) >= 0 ? state.heavenMax : 0);
}

function lampMaxed(state, id) {
  return lampLevel(state, id) >= lampMax(state, id);
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

function tomeDesc(skill, level) {
  const v = skill.v[level - TOME_MIN];
  return skill.text.replace(/\{v\}/g, skill.fmt === 'pct' ? pctText(v) : String(v));
}

function skillDesc(skill, level) {
  if (skill.tome) return tomeDesc(skill, level);
  return SKILL_STATS.filter((st) => skill[st.key]).map((st) => st.label + ' ' + st.val(skill[st.key] * level)).join('，');
}

// 精进时把原数值和新数值并排写出来，例如“锋 +3 → +6”。
function skillUpgradeDesc(skill, from, to) {
  return SKILL_STATS.filter((st) => skill[st.key])
    .map((st) => st.label + ' ' + st.val(skill[st.key] * from) + ' → ' + st.val(skill[st.key] * to)).join('，');
}

function gradeName(level) {
  return GRADE_NAMES[level - 1];
}

function skillTitle(skill, level) {
  return '《' + skill.name + '》（' + SCHOOLS[skill.school].name + '·' + (skill.arcane ? '秘法' : gradeName(level) + '品') + '）';
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
      if (arcane && !skillEntry(run, arcane.id)) out.push({ first: left.id, second: right.id, arcane: arcane });
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
  if (!arcane || skillEntry(run, arcane.id)) return null;
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

function combatPowerDetails(state, currentAttrs) {
  const run = state.run;
  if (run.phase === 'root') return { total: 0, sources: [] };
  const mastery = run.skills.reduce((sum, entry) => {
    const skill = skillInfo(entry.id);
    return skillSuppressed(run, skill) ? sum : sum + combatPower.masteryPower(entry.level, skill.arcane);
  }, 0);
  const counts = setCounts(run);
  const bonds = SCHOOL_IDS.reduce((sum, id) => sum + combatPower.bondPower(counts[id]), 0);
  return combatPower.powerProfile(REALMS[run.realm], STAGES[run.stage], currentAttrs || attrs(state), [
    { id: 'mastery', label: '功法品级', value: mastery },
    { id: 'bonds', label: '流派羁绊', value: bonds },
    { id: 'gear', label: '装备', value: gearScore(state) }
  ]);
}

function qiCap(state) {
  const run = state.run;
  return BASE_QI_CAP * REALMS[run.realm].cap * STAGES[run.stage].cap;
}

function qiRate(state) {
  const run = state.run;
  if (run.phase !== 'alive') return 0;
  const bonus = (rootOf(run).qi || 0) + sumSkills(run, 'qi') + sumSkills(run, 'skillQi') * run.skills.length +
    (hasSet(run, 'pill', 2) ? 0.3 : 0) + 0.2 * lampLevel(state, 'r4') + mech(run, 'demonFuel') * Math.floor(run.demon / 10);
  const fate = fateInfo(run);
  const demon = run.mode === 'demon' ? 1 + MAX_DEMON * DEMON_QI_RATE : 1;
  const cave = [1, 1.12, 1.25][run.cave ? run.cave.array : 0];
  return REALMS[run.realm].rate * (1 + bonus) * (1 + (fate.qi || 0)) * demon * cave;
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
  return CHANCE_INTERVAL_SEC * Math.pow(CHANCE_REALM_GROWTH, run.realm) / (1 + 0.15 * lampLevel(state, 'y4')) / (hasSet(run, 'luck', 4) ? 1.25 : 1) /
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

function gainLiveWick(state, amount) {
  state.wick += amount;
  state.totalWick += amount;
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
      gainLiveWick(state, mech(run, 'wickLive'));
    } else {
      run.qi = qiCap(state);
      break;
    }
  }
  return { gained: gained, ups: ups };
}

// 结算从 lastTime 到 now 的现实时间：攒竞技场次数、灯油和历练的储物袋。一世之内的灵气、机缘和寿元都不随现实时间变。
function advance(state, now) {
  const elapsed = Math.max(0, (now - state.lastTime) / 1000);
  state.lastTime = now;
  const before = Math.floor(state.oil);
  state.arena = Math.min(ARENA_MAX, state.arena + elapsed / ARENA_INTERVAL_SEC);
  state.oil = Math.min(OIL_MAX, state.oil + elapsed / OIL_INTERVAL_SEC);
  fillBag(state, elapsed);
  return { elapsed: elapsed, oil: Math.floor(state.oil) - before };
}

// 这一世过了 seconds 秒：结算灵气和机缘。
function passTime(state, seconds) {
  const run = state.run;
  const result = { qi: 0, ups: 0, chance: 0 };
  if (run.phase !== 'alive' || !(seconds > 0)) return result;
  const max = maxChance(state);
  if (run.chance < max) {
    const before = run.chance;
    run.chance = Math.min(max, run.chance + seconds / chanceInterval(state));
    result.chance = Math.floor(run.chance) - Math.floor(before);
  }
  const q = gainQi(state, qiRate(state) * seconds);
  result.qi = q.gained;
  result.ups = q.ups;
  return result;
}

// 过 years 年；期间小境界突破的话记进 lines 和 tags。
function passYears(state, years, lines, tags) {
  const got = passTime(state, years * YEAR_SECONDS);
  if (got.ups && lines) {
    lines.push('灵气充盈，突破至' + realmText(state.run));
    if (tags) tags.push('stageup');
  }
  return got;
}

// 攒一次机缘要过多少年。
function chanceYears(state) {
  return chanceInterval(state) / YEAR_SECONDS;
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

function sureLeft(run) {
  return Math.max(0, mech(run, 'sure') - run.sures);
}

function riskChance(state, risk) {
  const run = state.run;
  if (sureLeft(run) > 0) return 1;
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
      type: 'legacy',
      title: intro.title,
      text: intro.text,
      options: ev.offers.map((o) => {
        const skill = skillInfo(o.id);
        const owned = skillEntry(run, o.id);
        return {
          label: owned ? '精进《' + skill.name + '》至' + gradeName(o.level) + '品' : '修习《' + skill.name + '》',
          years: legacyYears(state),
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
  const years = Math.max(0, opt.years - (state.run.wake === 'rest' ? 1 : 0));
  const cap = mech(state.run, 'yearCap');
  // 劫期逾期的折寿不受《饮海吞山》封顶。
  return (cap ? Math.min(years, cap) : years) + tribTerm(state).years;
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
      segments.push(SCHOOLS[skill.school].name + '·' + gradeName(owned.level) + '品 → ' + gradeName(opt.learn.level) + '品：' + skillUpgradeDesc(skill, owned.level, opt.learn.level));
    } else {
      segments.push(SCHOOLS[skill.school].name + '·' + gradeName(opt.learn.level) + '品：' + skillDesc(skill, opt.learn.level));
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
  return FALLBACK_QI * (1 + lampLevel(state, 'y3') + sumSkills(state.run, 'seclude')) * (mech(state.run, 'freeSeclude') || 1);
}

function fallbackYears(state) {
  return (mech(state.run, 'freeSeclude') ? 0 : FALLBACK_YEARS) + tribTerm(state).years;
}

function rerollsLeft(state) {
  const run = state.run;
  if (!run.event || run.event.fruit || run.event.trigger) return 0;
  return (run.event.rerolls || 0) + run.freeRerolls + Math.floor(state.oil);
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
      const known = optionKnown(state, opt);
      return {
        label: opt.label,
        desc: known ? optionDesc(state, opt) : hiddenDesc(state, opt),
        years: years,
        disabled: cost > run.qi,
        fatal: years >= left,
        unknown: !known
      };
    }),
    fallback: {
      label: '闭关不理',
      desc: '灵气 +' + formatNumber(qiRewardAmount(state, fallbackQi(state))),
      years: fallbackYears(state),
      fatal: fallbackYears(state) >= left
    },
    rerolls: rerollsLeft(state),
    oil: rerollsLeft(state) ? Math.floor(state.oil) : 0,
    wake: [
      WAKES[run.wake] ? WAKES[run.wake].name + '：' + WAKES[run.wake].text : '',
      aftermathText(state),
      def.stage === 'omen' ? '处理征兆后，下一回机缘将转为突发；这段经历不能重抽。' : '',
      def.stage === 'event' ? '处理突发后，余波会影响接下来的三次普通机缘。' : ''
    ].filter(Boolean).join('；')
  };
}

// 功法已满时，新功法的总权重压到可精进功法总权重的这个比例，让精进比新功法更常出现。
const FULL_NEW_RATIO = 0.15;

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

function legacyOffers(state, rng) {
  const run = state.run;
  const counts = setCounts(run);
  const rootSchools = rootOf(run).schools || [];
  const library = run.cave ? run.cave.library : 0;
  const pool = [];
  const weights = [];
  SKILLS.forEach((skill) => {
    const owned = skillEntry(run, skill.id);
    if (owned && owned.level >= MAX_GRADE) return;
    pool.push(skill);
    weights.push((rootSchools.indexOf(skill.school) >= 0 ? 3 : 1) * (counts[skill.school] > 0 ? 2 + library * 2 : 1) * pathMult(run, skill));
  });
  TOMES.forEach((tome) => {
    if (!tomeLevel(state, tome.id) || skillEntry(run, tome.id)) return;
    pool.push(tome);
    weights.push(TOME_WEIGHT * (rootSchools.indexOf(tome.school) >= 0 ? 3 : 1) * (counts[tome.school] > 0 ? 2 + library * 2 : 1) * pathMult(run, tome));
  });
  dampNewSkills(state, pool, weights);
  const count = 3 + (hasSet(run, 'talisman', 4) ? 1 : 0);
  return sample(pool, weights, count, rng).map((skill) => {
    if (skill.tome) return { id: skill.id, level: tomeLevel(state, skill.id) };
    const owned = skillEntry(run, skill.id);
    if (owned) return { id: skill.id, level: Math.min(MAX_GRADE, owned.level + 1) };
    return { id: skill.id, level: REALMS[run.realm].layer > 0 && rng() < 0.3 ? 2 : 1 };
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
  const wide = !!REALMS[run.realm].wide;
  const eligible = (e) => !e.trigger && (wide || e.layers.indexOf(layer) >= 0) && e.id !== excludeId && marksOk(run, e) &&
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
  if (type !== 'legacy') {
    let pool = EVENTS.filter((e) => e.type === type && eligible(e));
    const fresh = pool.filter((e) => run.recent.indexOf(e.id) < 0);
    if (fresh.length) pool = fresh;
    if (pool.length) return { kind: 'event', id: pick(pool, rng).id };
  }
  const offers = legacyOffers(state, rng);
  if (offers.length) {
    const intros = [];
    LEGACY_INTROS.forEach((intro, i) => {
      if (intro.layer === layer) intros.push(i);
    });
    return { kind: 'legacy', intro: pick(intros, rng), offers: offers };
  }
  // 功法全部满品时没有传承可给，退回闲事。
  return { kind: 'event', id: pick(EVENTS.filter((e) => e.type === 'idle' && !e.trigger && e.id !== excludeId), rng).id };
}

function canDraw(state) {
  const run = state.run;
  return run.phase === 'alive' && !atSea(run) && !run.event && !run.pending && !run.trib && run.chance >= 1;
}

// 机缘用尽时只能静坐：耗 1 年寿元（劫期过了照样多折），让灵气和机缘跟着年岁涨。
function canMeditate(state) {
  const run = state.run;
  return run.phase === 'alive' && !atSea(run) && !run.event && !run.pending && !run.trib && run.chance < 1;
}

// 坐到下一次机缘回来为止，至少一年。
function meditateWait(state) {
  return Math.max(1, Math.ceil((1 - state.run.chance) * chanceYears(state) - 1e-9));
}

function meditateYears(state) {
  return meditateWait(state) + tribTerm(state).years;
}

function meditate(state) {
  if (!canMeditate(state)) return null;
  const run = state.run;
  const before = snapshot(state);
  const years = meditateYears(state);
  const wait = meditateWait(state);
  run.age += years;
  const lines = ['耗 ' + years + ' 年寿元'];
  const tags = ['seclude'];
  const got = passTime(state, wait * YEAR_SECONDS);
  if (got.qi >= 1) lines.push('灵气 +' + formatNumber(Math.round(got.qi)));
  if (got.ups) {
    lines.push('突破至' + realmText(run));
    tags.push('stageup');
  }
  run.log.push({ age: run.age, title: '静坐', text: '机缘未至，静坐了一阵：' + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  const dead = checkDeath(state);
  return { title: '静坐', label: '机缘未至，静坐了一阵', lines: lines, tags: tags, dead: dead };
}

function drawEvent(state, rng) {
  if (!canDraw(state)) return false;
  const run = state.run;
  run.chance -= 1;
  run.event = generateEvent(state, rng);
  run.event.rerolls = hasSet(run, 'talisman', 2) ? 1 : 0;
  return true;
}

// 大机缘不给选项，随机落下一件事并当场结算，好事、坏事和说不准的事都有。
// 坏事不会直接让人寿尽或入魔；眼下用不上或会致命的事不进池子。
const BIG_YEARS = 10;
const BIG_DEMON = 15;
const BIG_TRIB = 0.2;
const BIG_REROLLS = 2;
const BIG_SPEED = 0.5;

// 把 skills 换成 next 之后人还活着。
function bigSurvives(state, next) {
  return withSkills(state, next, () => maxLife(state)) > state.run.age;
}

function bigWithLevel(run, entry, level) {
  return run.skills.map((s) => (s === entry ? { id: s.id, level: level } : s));
}

// 能学的新功法：功法已满时交给取舍，否则学了不能寿尽。
function bigNewSkills(state, level, schools) {
  const run = state.run;
  return SKILLS.filter((skill) => !skillEntry(run, skill.id) && (!schools || schools.indexOf(skill.school) >= 0) &&
    (run.skills.length >= maxSkills(state) || bigSurvives(state, run.skills.concat({ id: skill.id, level: level }))));
}

function bigRelicOwned(state) {
  const run = state.run;
  return run.skills.filter((s) => !skillInfo(s.id).arcane && s.level < MAX_GRADE && bigSurvives(state, bigWithLevel(run, s, MAX_GRADE)));
}

function bigBondSkills(state) {
  const counts = setCounts(state.run);
  return bigNewSkills(state, 2, SCHOOL_IDS.filter((k) => counts[k] === 1 || counts[k] === 3));
}

function bigFates(state) {
  const run = state.run;
  const old = run.fate;
  const out = FATES.filter((fate) => {
    if (fate.id === old) return false;
    run.fate = fate.id;
    return maxLife(state) > run.age;
  });
  run.fate = old;
  return out;
}

function bigForgettable(state) {
  const run = state.run;
  return run.skills.filter((s) => !skillInfo(s.id).arcane && !skillInfo(s.id).tome && s.level > 1 && bigSurvives(state, bigWithLevel(run, s, s.level - 1)));
}

function bigWick(run) {
  return Math.max(2, Math.ceil(WICK_SCORE[run.realm * STAGES.length + run.stage] / 3));
}

// ok 判断这件事眼下能不能发生，run 结算并把结果写进 lines 和 tags。
const BIG_EFFECTS = {
  relic: {
    ok: (state) => bigRelicOwned(state).length > 0 || bigNewSkills(state, 3).length > 0,
    run: (state, rng, lines, tags) => {
      const owned = bigRelicOwned(state);
      if (!owned.length) {
        gainSkill(state, pick(bigNewSkills(state, 3), rng).id, 3, lines, tags);
        return;
      }
      const entry = pick(owned, rng);
      const skill = skillInfo(entry.id);
      const before = entry.level;
      entry.level = MAX_GRADE;
      tags.push('skill:' + skill.school, 'upgrade');
      lines.push('《' + skill.name + '》直入' + GRADES[MAX_GRADE - 1] + '品：' + skillUpgradeDesc(skill, before, MAX_GRADE));
    }
  },
  bond: {
    ok: (state) => bigBondSkills(state).length > 0,
    run: (state, rng, lines, tags) => gainSkill(state, pick(bigBondSkills(state), rng).id, 2, lines, tags)
  },
  wick: {
    ok: () => true,
    run: (state, rng, lines, tags) => {
      const n = bigWick(state.run);
      state.wick += n;
      state.totalWick += n;
      lines.push('灯芯 +' + n + '（不必等到身死）');
      tags.push('bigup');
    }
  },
  youth: {
    ok: (state) => state.run.age >= 3,
    run: (state, rng, lines, tags) => {
      const n = Math.min(BIG_YEARS, state.run.age);
      state.run.age -= n;
      lines.push('年岁 -' + n + '，寿元余 +' + n + ' 年');
      tags.push('life+');
    }
  },
  thunder: {
    ok: (state) => {
      const run = state.run;
      const trib = TRIBS[run.realm];
      return run.mode !== 'demon' && !!trib && !trib.seaTrial && !run.tribBoon;
    },
    run: (state, rng, lines) => {
      state.run.tribBoon = BIG_TRIB;
      lines.push('下一场天劫成功率 +' + pctText(BIG_TRIB) + '，渡过或失败后用掉');
    }
  },
  teller: {
    ok: (state) => !state.run.forceLegacy,
    run: (state, rng, lines, tags) => {
      const run = state.run;
      const cap = findById(LAMPS, 'y2').max + BIG_REROLLS;
      const gained = Math.min(cap, run.freeRerolls + BIG_REROLLS) - run.freeRerolls;
      run.forceLegacy = true;
      run.freeRerolls += gained;
      lines.push('下一个机缘必为传承');
      if (gained > 0) lines.push('这一世可重抽的次数 +' + gained);
      tags.push('chance');
    }
  },
  peer: {
    ok: () => true,
    run: (state, rng, lines, tags) => applyFx(state, { speed: BIG_SPEED }, rng, lines, tags)
  },
  rotate: {
    ok: (state) => {
      const s = state.run.stats;
      return s.edge !== s.body || s.body !== s.mind;
    },
    run: (state, rng, lines) => {
      const s = state.run.stats;
      const next = { edge: s.mind, body: s.edge, mind: s.body };
      ATTRS.forEach((k) => {
        if (next[k] !== s[k]) lines.push(ATTR_NAMES[k] + '的根基 ' + s[k] + ' → ' + next[k]);
        s[k] = next[k];
      });
    }
  },
  fate: {
    ok: (state) => bigFates(state).length > 0,
    run: (state, rng, lines) => {
      const fate = pick(bigFates(state), rng);
      state.run.fate = fate.id;
      lines.push('命格换成【' + fate.name + '】：' + fate.desc);
    }
  },
  dream: {
    ok: (state) => state.run.mode !== 'demon' && !isFull(state) && yearsLeft(state) >= BIG_YEARS + 2,
    run: (state, rng, lines, tags) => {
      const run = state.run;
      run.age += BIG_YEARS;
      lines.push('一觉睡去 ' + BIG_YEARS + ' 年');
      addQiWithLines(state, qiRewardAmount(state, 1), lines, tags);
      const calm = Math.min(BIG_DEMON, run.demon);
      if (calm > 0) {
        run.demon -= calm;
        lines.push('心魔 -' + calm);
      }
    }
  },
  forget: {
    ok: (state) => bigForgettable(state).length > 0,
    run: (state, rng, lines) => {
      const entry = pick(bigForgettable(state), rng);
      const skill = skillInfo(entry.id);
      entry.level -= 1;
      lines.push('《' + skill.name + '》跌回' + GRADES[entry.level - 1] + '品');
    }
  },
  possess: {
    ok: (state) => state.run.mode !== 'demon' && state.run.demon <= MAX_DEMON - 2,
    run: (state, rng, lines, tags) => {
      // 实际涨幅只会比给出的小，所以按离 99 的差额给，不会就此入魔。
      const gain = Math.min(BIG_DEMON, MAX_DEMON - 1 - state.run.demon);
      applyFx(state, { demon: gain, mind: 2 }, rng, lines, tags);
    }
  },
  scavenge: {
    ok: (state) => state.run.chance >= 4,
    run: (state, rng, lines) => {
      const n = Math.floor(state.run.chance / 2);
      state.run.chance -= n;
      lines.push('机缘 -' + n);
    }
  },
  debt: {
    ok: (state) => !findById(state.run.karma, 'debt') && state.run.marks.indexOf('deadbeat') < 0,
    run: (state, rng, lines, tags) => applyFx(state, { karma: 'debt' }, rng, lines, tags)
  }
};

function canDrawBig(state) {
  const run = state.run;
  return run.phase === 'alive' && !atSea(run) && !run.event && !run.pending && !run.trib && !run.sudden && state.big >= 1;
}

// 眼下能落下来的大机缘。
function bigPool(state) {
  return BIG_EVENTS.filter((ev) => BIG_EFFECTS[ev.id].ok(state));
}

// 用掉一次大机缘并当场结算，返回和 choose 相同形状的结果，另带一段 text；用不了时返回 null。
function drawBig(state, rng) {
  if (!canDrawBig(state)) return null;
  const run = state.run;
  const before = snapshot(state);
  const beforeStage = run.realm * STAGES.length + run.stage;
  const pool = bigPool(state);
  const ev = sample(pool, pool.map((item) => item.weight), 1, rng)[0];
  const lines = [];
  const tags = ['big'];
  state.big -= 1;
  BIG_EFFECTS[ev.id].run(state, rng, lines, tags);
  if (ev.tone === 'bad') tags.push('lose');
  if (run.realm * STAGES.length + run.stage > beforeStage) maybeSudden(state, rng, 'meridian');
  maybeSudden(state, rng, 'fortune');
  run.lastTitle = ev.title;
  run.log.push({ age: run.age, title: '大机缘·' + ev.title, text: lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  const dead = checkDeath(state);
  return { title: '大机缘', label: ev.title, text: ev.text, lines: lines, tags: tags, dead: dead };
}
function rerollEvent(state, rng) {
  const run = state.run;
  if (run.phase !== 'alive' || rerollsLeft(state) < 1) return false;
  const old = run.event;
  let rerolls = old.rerolls || 0;
  if (rerolls > 0) rerolls--;
  else if (run.freeRerolls > 0) run.freeRerolls--;
  else state.oil -= 1;
  const type = old.kind === 'legacy' ? 'legacy' : findById(EVENTS, old.id).type;
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
    owned.level = skill.tome ? Math.max(owned.level, level) : Math.min(MAX_GRADE, Math.max(owned.level + 1, level));
    lines.push('《' + skill.name + '》精进至' + gradeName(owned.level) + '品：' + skillUpgradeDesc(skill, before, owned.level));
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
  return Math.max(1, Math.ceil(score * (1 + setBonus(run) + sumSkills(run, 'wick')) * (1 + (fateInfo(run).wick || 0)) *
    (1 + HEAVEN_WICK * run.heaven) * DEATH_MULT[cause] - 1e-9));
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
  // 在已解锁的最高一重天修到最高境界圆满，下一重天就开了。
  const cleared = run.realm === REALMS.length - 1 && isFull(state) && run.heaven === state.heavenMax && state.heavenMax < HEAVEN_MAX;
  run.phase = 'dead';
  run.event = null;
  run.pending = null;
  run.death = { cause: cause, wick: wick, text: text };
  if (cleared) {
    state.heavenMax++;
    state.heaven = state.heavenMax;
    run.death.heaven = state.heavenMax;
  }
  state.wick += wick;
  state.totalWick += wick;
  state.lives++;
  if (run.sect) state.mountainLegacy = mountain.archive(run, state.lives);
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

// 心魔满了：有《一字镇魔》就清零折寿，否则堕魔。
function checkFall(state) {
  const run = state.run;
  if (run.demon < MAX_DEMON || run.mode === 'demon') return;
  const years = mech(run, 'sealDemon');
  if (!years) {
    becomeDemon(state);
    return;
  }
  const before = snapshot(state);
  run.demon = 0;
  run.age += years;
  run.log.push({ age: run.age, title: '一字镇魔', text: '心魔满心，一个字把它压了回去：心魔清零，折寿 ' + years + ' 年。', detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
}

// 返回是否身死。
function checkDeath(state, cause) {
  const run = state.run;
  if (run.phase !== 'alive') return false;
  checkFall(state);
  const back = mech(run, 'revive');
  if (run.age >= maxLife(state) && back && !run.revived && run.mode !== 'demon') {
    const before = snapshot(state);
    run.revived = true;
    run.age = Math.max(0, maxLife(state) - back);
    run.qi = 0;
    run.log.push({ age: run.age, title: '长生药引', text: '寿元耗尽，一口药引吊住了命：灵气散尽，还剩 ' + yearsLeft(state) + ' 年。', detail: changeText(before, snapshot(state)) });
    run.log = run.log.slice(-MAX_LOG);
  }
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
    left: Math.max(0, POWDER_MAX - run.powders),
    ready: run.phase === 'alive' && run.mode === 'demon' && !run.trib && run.qi >= cost && run.powders < POWDER_MAX,
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
  run.powders++;
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
  const tags = def.type === 'fruit' ? ['fruit'] : [];
  const overdue = tribTerm(state).years;
  let label;
  let wake = '';
  if (index === -1) {
    label = '闭关不理';
    wake = 'rest';
    const years = fallbackYears(state);
    run.age += years;
    passYears(state, years - overdue, lines, tags);
    tags.push('seclude');
    addQiWithLines(state, qiRewardAmount(state, fallbackQi(state)), lines, tags);
  } else {
    const opt = def.options[index];
    if (!opt) return null;
    const cost = optionCost(state, opt);
    if (cost > run.qi) return null;
    label = opt.label;
    learnOption(state, opt);
    // 成功率按做选择时看到的算，不受这次耗掉的寿元影响。
    const p = opt.risk ? riskChance(state, opt.risk) : 0;
    const years = optionYears(state, opt);
    run.age += years;
    if (cost) {
      run.qi -= cost;
      lines.push('灵气 -' + formatNumber(cost));
    }
    passYears(state, years - overdue, lines, tags);
    if (opt.learn) {
      gainSkill(state, opt.learn.id, opt.learn.level, lines, tags);
      const others = run.event.offers.filter((o) => o.id !== opt.learn.id && !skillEntry(run, o.id));
      const echo = mech(run, 'echo');
      if (echo && others.length && !run.pending && run.skills.length < maxSkills(state) && rng() < echo) {
        const extra = pick(others, rng);
        lines.push('《天书残页》多记下一门');
        gainSkill(state, extra.id, extra.level, lines, tags);
      }
    }
    if (opt.fx) applyFx(state, opt.fx, rng, lines, tags);
    if (opt.risk) {
      if (sureLeft(run) > 0) run.sures++;
      const win = rng() < p;
      const sub = [];
      const wards = mech(run, 'ward') - run.wards;
      if (win || wards <= 0) {
        applyFx(state, win ? opt.risk.win : opt.risk.lose, rng, sub, tags);
      } else {
        run.wards++;
        sub.push('《敕令真符》挡下了后果，这一世还剩 ' + (wards - 1) + ' 次');
      }
      const twice = mech(run, 'twice');
      if (win && twice && rng() < twice) {
        sub.push('《天官赐福》再结算一次');
        applyFx(state, opt.risk.win, rng, sub, tags);
      }
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
  checkFall(state);
  run.choices++;
  run.realmChoices++;
  if (overdue) lines.push('劫期已过，多折 ' + overdue + ' 年');
  const tick = sumSkills(run, 'tick');
  if (tick) addQiWithLines(state, qiRewardAmount(state, tick), lines, tags);
  const soothe = Math.min(run.demon, sumSkills(run, 'soothe'));
  if (soothe > 0) {
    run.demon -= soothe;
    lines.push('心魔 -' + soothe);
  }
  if (caveOpen(run)) {
    run.mountainChoices++;
    mountain.progressChoices(run, lines, rng);
  }
  state.bigCount++;
  if (state.bigCount >= BIG_EVERY) {
    state.bigCount = 0;
    state.big = Math.min(MAX_BIG, state.big + 1);
    lines.push('做满 ' + BIG_EVERY + ' 次机缘，得大机缘 +1');
    tags.push('bigup');
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
    advanceAftermath(run);
    if (run.realm * STAGES.length + run.stage > beforeStage) maybeSudden(state, rng, 'meridian');
    if (run.realm >= 1 && run.chance >= maxChance(state) * 0.9) maybeSudden(state, rng, 'fortune');
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
    const old = run.skills[index];
    const oldSkill = skillInfo(old.id);
    const relic = oldSkill.mech === 'relicEdge' ? 0 : mech(run, 'relicEdge');
    run.skills[index] = run.pending;
    if (relic) run.stats.edge += relic * (oldSkill.arcane || oldSkill.tome ? TOME_MIN : old.level);
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
// 藏经阁功法改的是规则，没有数值可折算，按品级给一个固定分。
const AUTO_TOME_WORTH = 12;
const AUTO_BOND_2 = 5;
const AUTO_BOND_4 = 12;
// 随机得来的功法可能自带折寿，寿元上先留出这么多年的余量。
const AUTO_SKILL_MARGIN = 8;

function autoAttrWeight(state, key) {
  const trib = tribPlan(state)[state.run.realm];
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
    if (skill.tome) total += AUTO_TOME_WORTH * entry.level;
    SKILL_STATS.forEach((st) => {
      if (!skill[st.key]) return;
      const weight = ATTRS.indexOf(st.key) >= 0 ? autoAttrWeight(state, st.key) : AUTO_WORTH[st.key];
      total += skill[st.key] * entry.level * weight * pathMult(run, skill);
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
  // 没选过的选项不知道后果，自动机缘不替玩家去试。
  if (cost > run.qi || !optionKnown(state, opt)) return null;
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
  if (fallbackYears(state) < choiceYearsLeft(state)) {
    const score = (isFull(state) ? 0 : 10 * fallbackQi(state) * (run.aftermath && run.aftermath.id === 'meridian' ? 0.7 : 1)) - fallbackYears(state) * autoYearWeight(state);
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

// 自动走一步：先取舍等着的功法，否则先用大机缘，再翻开机缘并做出选择。无事可做时返回 null。
// stuck 为真表示这个机缘没有稳妥的选项，留在原处等玩家决定。
function autoStep(state, rng) {
  const run = state.run;
  if (!autoUnlocked(state) || run.phase !== 'alive' || atSea(run) || run.trib) return null;
  const out = { result: null, replaced: '', stuck: false };
  if (run.pending) {
    out.replaced = autoResolve(state);
    return out;
  }
  if (!run.event) {
    out.result = drawBig(state, rng);
    if (out.result) {
      if (run.pending) out.replaced = autoResolve(state);
      return out;
    }
    if (!drawEvent(state, rng)) {
      // 机缘用尽就替他静坐，但不坐到寿尽。
      if (!canMeditate(state) || meditateYears(state) >= yearsLeft(state)) return null;
      out.result = meditate(state);
      return out;
    }
  }
  const index = autoPick(state);
  out.result = index === null ? null : choose(state, index, rng);
  if (!out.result) {
    out.stuck = true;
    return out;
  }
  if (run.pending) out.replaced = autoResolve(state);
  return out;
}

// 竞技场：和排行榜上的人切磋。
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
  return combatPowerDetails(state).total;
}

// row 是榜上的一行：{ id, name, realmIndex, totalWick }。对战次数跨世保留，随时间回复。
function arenaInfo(state, row, mine = arenaPower(state)) {
  const run = state.run;
  const foe = combatPower.estimatedOpponentPower(row);
  const win = Math.max(ARENA_WIN_MIN, Math.round(foe / combatPower.opponentBoost(row) * ARENA_WIN_RATE));
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
// 历练：引气后角色在场景里自己打，不耗寿元和机缘，也不计入劫期。战斗由 battle.js 一次算完，页面只负责播放。
// 关卡不限数量：寻常的关连打 TRAIN_MOBS 只小怪，每 TRAIN_BOSS_EVERY 关是一个首领。败了往回退 TRAIN_RETREAT 关，再一关一关打回来。
// 退回去重打的关不再给东西：储物袋的速度和掉落都只认这一世过的最远一关，否则故意输就能反复刷首领的掉落。
// 每过一关，储物袋攒灵气的速度就高一档；储物袋随现实时间攒，离线也攒，最多存 TRAIN_BAG_HOURS 小时的量。
const TRAIN_REALM = 1;
const TRAIN_MOBS = 3;
const TRAIN_BOSS_EVERY = 5;
const TRAIN_RETREAT = 2;
const TRAIN_MAX = 9999;
// 第 1 关小怪的气血和攻击，之后每关各乘一次增长率。
const TRAIN_HP = 44;
const TRAIN_ATK = 5;
const TRAIN_HP_GROWTH = 1.13;
const TRAIN_ATK_GROWTH = 1.1;
// 首领的气血和攻击，相对同一关小怪的倍率。
const TRAIN_BOSS_HP = 3.5;
const TRAIN_BOSS_ATK = 1.4;
// 储物袋：每过一关每小时多攒丹田容量的这么多；过一个首领关另算 TRAIN_BOSS_BONUS 关。
const TRAIN_RATE = 0.015;
const TRAIN_BOSS_BONUS = 2;
const TRAIN_BAG_HOURS = 2;
// 掉落：寻常的关过关时有这么大的机会掉一件，连着 TRAIN_DROP_PITY 关没掉下一关必掉；首领关必掉，品级掷两次取高的。
// 储物袋另外每 TRAIN_LOOT_SEC 秒攒一件，卡关时也有东西拿。
const TRAIN_DROP = 0.3;
const TRAIN_DROP_PITY = 3;
const TRAIN_LOOT_SEC = 1200;
const TRAIN_LOOT_MAX = TRAIN_BAG_HOURS * 3600 / TRAIN_LOOT_SEC;
// 洞府材料：每过一关得筑石，首领关多得几块并得玉露；储物袋每攒一件装备也带一块筑石。
const TRAIN_STONE = 1;
const TRAIN_BOSS_STONE = 3;
const TRAIN_BOSS_DEW = 1;
const FORGE_MAX = 99;
// 装备分不够时，渡劫成功率最多扣这么多。
const GEAR_TRIB_MAX = 0.3;
// 装备分超过要求后成功率多加一点：最多加 GEAR_TRIB_BONUS，每多出要求的 GEAR_TRIB_HALF，离这个上限的差距减半。
const GEAR_TRIB_BONUS = 0.08;
const GEAR_TRIB_HALF = 0.25;
// 每高一重天，天劫要的装备分多这么多。
const GEAR_HEAVEN = 0.05;

function trainFighter(state) {
  const run = state.run;
  const counts = setCounts(run);
  const schools = {};
  SCHOOL_IDS.forEach((id) => {
    schools[id] = { count: counts[id], power: 0 };
  });
  run.skills.forEach((entry) => {
    const skill = skillInfo(entry.id);
    // 藏经阁功法只改规则，不加战斗威力，但照算同系门数。
    if (skill.tome || skillSuppressed(run, skill)) return;
    schools[skill.school].power += (skill.arcane ? MAX_GRADE * 2 * 1.2 : entry.level) * pathMult(run, skill);
  });
  return battle.playerFighter({
    name: '你',
    attrs: attrs(state),
    softCap: REALMS[run.realm].power.softCap,
    boost: REALMS[run.realm].power.mult,
    demon: run.demon,
    demonMode: run.mode === 'demon',
    schools: schools,
    gear: gear.bonus(wornItems(run))
  });
}

function trainBoss(stage) {
  return stage % TRAIN_BOSS_EVERY === 0;
}

// 这一关要连赢几场。
function trainWaves(stage) {
  return trainBoss(stage) ? 1 : TRAIN_MOBS;
}

// 第 stage 关（从 1 起）来的是谁。每五关换一轮：前四关各是一种小怪，第五关的首领轮着当。
function trainFoeDef(stage) {
  const round = Math.floor((stage - 1) / TRAIN_BOSS_EVERY);
  return TRAIN_FOES[((stage - 1) % TRAIN_BOSS_EVERY + round) % TRAIN_FOES.length];
}

function trainFoe(state, stage) {
  const def = trainFoeDef(stage);
  const boss = trainBoss(stage);
  const scale = 1 + HEAVEN_REQ * state.run.heaven;
  return battle.foeFighter({
    name: boss ? def.name : def.mob,
    hp: TRAIN_HP * Math.pow(TRAIN_HP_GROWTH, stage - 1) * (boss ? TRAIN_BOSS_HP : 1),
    atk: TRAIN_ATK * Math.pow(TRAIN_ATK_GROWTH, stage - 1) * (boss ? TRAIN_BOSS_ATK : 1),
    interval: def.interval,
    reduce: def.reduce,
    resist: def.resist,
    skill: boss ? def.skill : null
  }, scale);
}

// 眼下不在历练的原因；在历练返回空串。
function trainReason(state) {
  const run = state.run;
  if (run.phase !== 'alive') return '这一世已经结束';
  if (run.realm < TRAIN_REALM) return REALMS[TRAIN_REALM].name + '之后才有东西找上门';
  if (atSea(run)) return '人在枯海，回来再说';
  return '';
}

// 正在打第几关（从 1 起）；不在历练时返回 0。
function trainStage(state) {
  return trainReason(state) ? 0 : Math.min(TRAIN_MAX, state.run.battle.cleared + 1 - state.run.battle.back);
}

// 算出当前这一关的第 wave 场。只算不改状态；这一关最后一场打赢后由页面调 trainClear 记过关。
function trainEncounter(state, wave, rng) {
  const stage = trainStage(state);
  if (!stage) return null;
  const waves = trainWaves(stage);
  const at = Math.max(0, Math.min(waves - 1, Math.floor(wave) || 0));
  const fight = battle.simulate(trainFighter(state), trainFoe(state, stage), rng);
  return {
    stage: stage,
    wave: at,
    waves: waves,
    last: at === waves - 1,
    boss: trainBoss(stage),
    sprite: trainFoeDef(stage).sprite,
    win: fight.win,
    seconds: fight.seconds,
    timeline: fight.timeline,
    me: fight.me,
    foe: fight.foe
  };
}

// 过了 cleared 关时储物袋每小时攒多少，按丹田容量的比例计。
function trainRate(state, cleared) {
  const count = cleared === undefined ? state.run.battle.cleared : cleared;
  return TRAIN_RATE * (count + TRAIN_BOSS_BONUS * Math.floor(count / TRAIN_BOSS_EVERY));
}

function fillBag(state, seconds) {
  const run = state.run;
  if (run.phase !== 'alive' || !(seconds > 0)) return;
  const rate = trainRate(state);
  run.battle.bag = Math.min(rate * TRAIN_BAG_HOURS, run.battle.bag + rate * seconds / 3600);
  if (run.battle.cleared > 0) run.battle.loot = Math.min(TRAIN_LOOT_MAX, run.battle.loot + seconds / TRAIN_LOOT_SEC);
}

// 过了第 stage 关：储物袋攒得更快，可能掉一件装备。只有首领关记一条见闻，免得刷屏。
// 败退之后重打的关只往前挪一关，again 为真，什么都不给。
function trainClear(state, stage, rng) {
  const run = state.run;
  if (!stage || trainStage(state) !== stage) return null;
  const boss = trainBoss(stage);
  const name = boss ? trainFoeDef(stage).name : trainFoeDef(stage).mob;
  if (run.battle.back > 0) {
    run.battle.back--;
    return { stage: stage, boss: boss, name: name, perHour: qiRewardAmount(state, trainRate(state)), drop: null, again: true };
  }
  if (run.battle.cleared >= TRAIN_MAX) return null;
  run.battle.cleared = stage;
  state.trainBest = Math.max(state.trainBest, stage);
  const perHour = qiRewardAmount(state, trainRate(state));
  const roll = rng || Math.random;
  let drop = null;
  if (boss || run.gear.dry >= TRAIN_DROP_PITY || roll() < TRAIN_DROP) {
    run.gear.dry = 0;
    drop = gearGain(state, gear.roll(stage, roll, boss));
  } else {
    run.gear.dry++;
  }
  const stone = mountain.addStone(run, boss ? TRAIN_BOSS_STONE : TRAIN_STONE);
  const dew = boss ? mountain.addDew(run, TRAIN_BOSS_DEW) : 0;
  if (boss) {
    run.log.push({ age: run.age, title: '历练', text: '第 ' + stage + ' 关，打赢了' + name + '，得' + drop.item.grade + drop.item.name +
      (stone ? '、筑石 ' + stone + ' 块' : '') + (dew ? '、玉露 ' + dew + ' 滴' : '') + '。储物袋每小时攒灵气 ' + formatNumber(perHour), detail: '' });
    run.log = run.log.slice(-MAX_LOG);
  }
  return { stage: stage, boss: boss, name: name, perHour: perHour, drop: drop, stone: stone, dew: dew };
}

// 第 stage 关败了：往回退 TRAIN_RETREAT 关，最多退到第 1 关。返回退到了第几关。
function trainLose(state, stage) {
  const run = state.run;
  if (!stage || trainStage(state) !== stage) return null;
  run.battle.back = Math.min(run.battle.cleared, run.battle.back + TRAIN_RETREAT);
  return { from: stage, stage: trainStage(state) };
}

// 储物袋眼下的样子：攒了多少、每小时攒多少、装满是多少。
function trainBag(state) {
  const run = state.run;
  const rate = trainRate(state);
  const max = rate * TRAIN_BAG_HOURS;
  return {
    qi: qiRewardAmount(state, run.battle.bag),
    perHour: qiRewardAmount(state, rate),
    max: qiRewardAmount(state, max),
    full: max > 0 && run.battle.bag >= max && run.battle.loot >= TRAIN_LOOT_MAX,
    hours: TRAIN_BAG_HOURS,
    gear: Math.floor(run.battle.loot),
    gearMax: TRAIN_LOOT_MAX,
    gearMinutes: TRAIN_LOOT_SEC / 60
  };
}

// 把储物袋里的灵气收进丹田，装备按眼下过了的关数现掷。袋里什么都没有时返回 null。
function trainCollect(state, rng) {
  const run = state.run;
  if (run.phase !== 'alive') return null;
  const amount = qiRewardAmount(state, run.battle.bag);
  const pieces = Math.floor(run.battle.loot);
  if (amount < 1 && pieces < 1) return null;
  const before = snapshot(state);
  const qi = run.qi;
  const lines = [];
  const tags = [];
  if (amount >= 1) {
    run.battle.bag = 0;
    addQiWithLines(state, amount, lines, tags);
  }
  const drops = [];
  const roll = rng || Math.random;
  for (let i = 0; i < pieces; i++) drops.push(gearGain(state, gear.roll(Math.max(1, run.battle.cleared), roll, false)));
  run.battle.loot -= pieces;
  if (pieces) lines.push('装备 ' + pieces + ' 件');
  const stone = mountain.addStone(run, pieces);
  if (stone) lines.push('筑石 ' + stone + ' 块');
  run.log.push({ age: run.age, title: '历练', text: '收了储物袋：' + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  return { title: '历练', label: '收了储物袋', qi: amount >= 1 ? amount : 0, gained: Math.max(0, Math.floor(run.qi - qi)), drops: drops, lines: lines, tags: tags };
}

// 装备：历练掉落，只管这一世。身上兵、衣、佩三个槽位，背包最多 PACK_MAX 件，装不下的直接分解成锻材。
function emptyGear() {
  const worn = {};
  gear.SLOTS.forEach((slot) => {
    worn[slot.id] = null;
  });
  return { worn: worn, pack: [], forge: 0, seq: 0, dry: 0 };
}

function wornItems(run) {
  return gear.SLOTS.map((slot) => run.gear.worn[slot.id]);
}

function gearScore(state) {
  return wornItems(state.run).reduce((sum, item) => sum + (item ? gear.score(item) : 0), 0);
}

// 得到一件装备：槽位空着就穿上，否则进背包；背包满了当场分解。
function gearGain(state, item) {
  const g = state.run.gear;
  item.uid = ++g.seq;
  const out = { item: gear.describe(item), worn: false, scrapped: 0, better: false };
  if (!g.worn[item.slot]) {
    g.worn[item.slot] = item;
    out.worn = true;
  } else if (g.pack.length < gear.PACK_MAX) {
    g.pack.push(item);
    out.better = gear.rating(item) > gear.rating(g.worn[item.slot]);
  } else {
    out.scrapped = gear.scrapValue(item);
    g.forge = Math.min(FORGE_MAX, g.forge + out.scrapped);
  }
  return out;
}

function packIndex(run, uid) {
  for (let i = 0; i < run.gear.pack.length; i++) {
    if (run.gear.pack[i].uid === uid) return i;
  }
  return -1;
}

// 把背包里的一件换到身上，原来身上那件回背包。
function gearEquip(state, uid) {
  const run = state.run;
  const index = run.phase === 'alive' ? packIndex(run, uid) : -1;
  if (index < 0) return false;
  const item = run.gear.pack[index];
  const old = run.gear.worn[item.slot];
  run.gear.worn[item.slot] = item;
  if (old) run.gear.pack[index] = old;
  else run.gear.pack.splice(index, 1);
  return true;
}

// 把背包里比身上好的都换上。返回换了几件。
function gearEquipBest(state) {
  const run = state.run;
  if (run.phase !== 'alive') return 0;
  let count = 0;
  gear.SLOTS.forEach((slot) => {
    let best = null;
    run.gear.pack.forEach((item) => {
      if (item.slot === slot.id && (!best || gear.rating(item) > gear.rating(best))) best = item;
    });
    const worn = run.gear.worn[slot.id];
    if (best && (!worn || gear.rating(best) > gear.rating(worn)) && gearEquip(state, best.uid)) count++;
  });
  return count;
}

// 强化身上某个槽位的装备，耗锻材，不会失败。
function gearEnhance(state, slot) {
  const run = state.run;
  const item = run.phase === 'alive' ? run.gear.worn[slot] : null;
  const cost = item ? gear.enhanceCost(item) : 0;
  if (!cost || run.gear.forge < cost) return false;
  run.gear.forge -= cost;
  item.level++;
  return true;
}

// 分解背包里的一件，得锻材。返回得了多少；没有这一件返回 0。
function gearScrap(state, uid) {
  const run = state.run;
  const index = run.phase === 'alive' ? packIndex(run, uid) : -1;
  if (index < 0) return 0;
  const value = gear.scrapValue(run.gear.pack.splice(index, 1)[0]);
  run.gear.forge = Math.min(FORGE_MAX, run.gear.forge + value);
  return value;
}

// 把背包里不比身上好的都分解掉。
function gearScrapSpare(state) {
  const run = state.run;
  if (run.phase !== 'alive') return { count: 0, forge: 0 };
  const spare = run.gear.pack.filter((item) => {
    const worn = run.gear.worn[item.slot];
    return worn && gear.rating(item) <= gear.rating(worn);
  });
  let forge = 0;
  spare.forEach((item) => {
    forge += gearScrap(state, item.uid);
  });
  return { count: spare.length, forge: forge };
}

// 背包里有没有比身上好的；标签页上的红点只问这一句，不必排一遍整个背包。
function gearHasBetter(state) {
  const g = state.run.gear;
  return g.pack.some((item) => !g.worn[item.slot] || gear.rating(item) > gear.rating(g.worn[item.slot]));
}

function gearView(state) {
  const run = state.run;
  const g = run.gear;
  const worn = gear.SLOTS.map((slot) => {
    const item = g.worn[slot.id];
    const cost = item ? gear.enhanceCost(item) : 0;
    return { slot: slot.id, slotName: slot.name, item: item ? gear.describe(item) : null, cost: cost, canEnhance: cost > 0 && g.forge >= cost };
  });
  const pack = g.pack.map((item) => {
    const mine = g.worn[item.slot];
    return Object.assign(gear.describe(item), { better: !mine || gear.rating(item) > gear.rating(mine), scrap: gear.scrapValue(item) });
  }).sort((a, b) => (a.slot === b.slot ? b.tier - a.tier || b.score - a.score : gear.SLOTS.findIndex((s) => s.id === a.slot) - gear.SLOTS.findIndex((s) => s.id === b.slot)));
  return {
    score: gearScore(state),
    bonus: gear.statsText(gear.bonus(wornItems(run))),
    forge: g.forge,
    forgeMax: FORGE_MAX,
    trib: tribGear(state),
    worn: worn,
    pack: pack,
    packMax: gear.PACK_MAX,
    hasBetter: pack.some((item) => item.better),
    hasSpare: pack.some((item) => !item.better)
  };
}

function normalizeGear(raw) {
  const out = emptyGear();
  if (!raw || typeof raw !== 'object') return out;
  const read = (entry) => {
    const item = gear.clean(entry);
    if (item) item.uid = ++out.seq;
    return item;
  };
  const worn = raw.worn && typeof raw.worn === 'object' ? raw.worn : {};
  gear.SLOTS.forEach((slot) => {
    const item = worn[slot.id] && worn[slot.id].slot === slot.id ? read(worn[slot.id]) : null;
    if (item) out.worn[slot.id] = item;
  });
  (Array.isArray(raw.pack) ? raw.pack : []).forEach((entry) => {
    const item = out.pack.length < gear.PACK_MAX ? read(entry) : null;
    if (item) out.pack.push(item);
  });
  out.forge = toCount(raw.forge, FORGE_MAX);
  out.dry = toCount(raw.dry, TRAIN_DROP_PITY);
  return out;
}
// 历练面板：打到第几关、眼前这一关和下一个首领的胜率、储物袋。
function trainView(state) {
  const run = state.run;
  const stage = trainStage(state);
  const me = stage ? trainFighter(state) : null;
  const stages = [];
  if (stage) {
    const boss = Math.ceil(stage / TRAIN_BOSS_EVERY) * TRAIN_BOSS_EVERY;
    (boss === stage ? [stage] : [stage, boss]).forEach((no) => {
      const foe = trainFoe(state, no);
      const def = trainFoeDef(no);
      stages.push({
        stage: no,
        now: no === stage,
        boss: trainBoss(no),
        name: foe.name,
        text: trainBoss(no) ? def.text : '',
        waves: trainWaves(no),
        hp: foe.hp,
        atk: Math.round(foe.atk),
        skill: foe.skill ? foe.skill.name : '',
        chance: battle.estimate(me, foe)
      });
    });
  }
  return {
    open: !!stage,
    reason: trainReason(state),
    stage: stage,
    cleared: run.battle.cleared,
    best: state.trainBest,
    mobs: TRAIN_MOBS,
    bossEvery: TRAIN_BOSS_EVERY,
    bag: trainBag(state),
    nextPerHour: qiRewardAmount(state, trainRate(state, run.battle.cleared + 1)),
    me: me ? { hp: me.hp, atk: Math.round(me.atk), interval: me.interval, reduce: me.reduce, crit: me.crit } : null,
    stages: stages
  };
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

function mountainReady(state) {
  const run = state.run;
  return run.phase === 'alive' && caveOpen(run) && !atSea(run) && !run.event && !run.pending;
}

function mountainContext(state) {
  const power = combatPowerDetails(state);
  return {
    ready: mountainReady(state), yuan: state.run.realm > SEA_REALM, demon: state.run.mode === 'demon',
    cap: qiCap(state), years: yearsLeft(state), skillCap: maxSkills(state), format: formatNumber,
    // 亲自出阵按不含破境加成的战力折算，免得境界一高就把出阵的上限顶满。
    power: power.total - power.sources.reduce((sum, source) => sum + (source.id === 'boost' ? source.value : 0), 0)
  };
}

function mountainView(state, page, disciple) {
  return mountain.mountainView(state, page, disciple, mountainContext(state));
}

function chooseMountain(state, page, disciple, stamp, id, name, rng = Math.random) {
  const before = snapshot(state);
  const age = state.run.age;
  const result = mountain.chooseMountain(state, page, disciple, stamp, id, name, mountainContext(state), rng);
  if (!result) return null;
  passYears(state, state.run.age - age, result.lines);
  const tags = [];
  if (result.book) gainSkill(state, result.book.id, result.book.level, result.lines, tags);
  if (result.demon || result.chance || result.life) {
    const demon = result.demon ? Math.max(-state.run.demon, result.demon) : 0;
    applyFx(state, { demon: demon, chance: result.chance, life: result.life }, Math.random, result.lines, tags);
  }
  return seaResult(state, result.title, result.label, result.lines, tags, before);
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
    passYears(state, 1, lines, tags);
    run.sea = { route: id, tide: 1, landed: false, anchor: false, clue: false, saltPassed: false };
  } else {
    const sea = run.sea;
    const route = findById(SEA_ROUTES, sea.route);
    const option = findById(route.scenes[sea.tide - 1].options, id);
    run.age += option.years;
    passYears(state, option.years, lines, tags);
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

// 渡劫成功率由哪几项加出来，按顺序列给玩家看；为零的项不列。
// 这场天劫要多少装备分、身上有多少。不够时成功率按差的比例扣，一件不穿扣满 GEAR_TRIB_MAX；超过了按多出的比例加，越往上加得越少。
function tribGear(state) {
  const trib = TRIBS[state.run.realm];
  const need = Math.round(((trib && trib.gear) || 0) * (1 + GEAR_HEAVEN * state.run.heaven));
  const score = gearScore(state);
  const short = score < need;
  const cut = (trib && trib.gearCut) || GEAR_TRIB_MAX;
  const bonus = need > 0 && score > need ? GEAR_TRIB_BONUS * (1 - Math.pow(0.5, (score / need - 1) / GEAR_TRIB_HALF)) : 0;
  return { name: trib ? trib.name : '', need: need, score: score, short: short, cut: cut, penalty: short ? cut * (1 - score / need) : 0, bonus: bonus };
}

// 羁绊、灯纹、功法、大机缘和装备富余这些加成，按考核属性的达标程度打折：属性只到要求的四成，加成也只算四成。
function tribulationParts(state, ratio) {
  const run = state.run;
  const gear = tribGear(state);
  const boosts = [
    ['剑系羁绊', hasSet(run, 'sword', 2) ? 0.1 : 0],
    ['灯纹「劫后余生」', 0.03 * lampLevel(state, 'm2')],
    ['功法', sumSkills(run, 'trib')],
    ['大机缘的雷', run.tribBoon],
    ['装备分富余', gear.bonus]
  ];
  const boost = boosts.reduce((sum, part) => sum + Math.max(0, part[1]), 0);
  return [
    ['属性', 0.15 + 0.7 * ratio],
    ['心魔', mech(run, 'demonFuel') ? 0 : -0.03 * Math.floor(run.demon / 10)]
  ].concat(boosts, [
    ['属性未达标，加成打折', -boost * (1 - clamp(ratio, 0, 1))],
    ['重天', -HEAVEN_TRIB * run.heaven],
    ['装备分不足', -gear.penalty]
  ]).filter((part) => Math.abs(part[1]) > 1e-9).map((part) => ({ label: part[0], value: part[1] }));
}

function tribulationChance(state, ratio) {
  // 化神起的装备扣幅可以到 100%，不能再被通用的 5% 保底抬回来。
  const min = tribGear(state).cut >= 1 ? 0 : 0.05;
  return clamp(tribulationParts(state, ratio).reduce((sum, part) => sum + part.value, 0), min, 0.98);
}

function boltRewardText(tests, reward) {
  const parts = [];
  if (reward.attr) parts.push(tests.map((k) => ATTR_NAMES[k]).join('、') + (tests.length > 1 ? '各 +' : ' +') + reward.attr);
  if (reward.life) parts.push('寿元上限 +' + reward.life + ' 年');
  if (reward.wick) parts.push('灯芯 +' + reward.wick);
  return parts.join('，');
}

// 逐道雷的天劫眼下的局面。overall 是整场全部硬接的成功率。
function boltView(state, trib, tests, overall) {
  const run = state.run;
  const session = run.trib || { bolt: 0, gains: 0 };
  const total = trib.bolts.length;
  const extra = session.bolt >= total;
  const main = trib.bolts.map((weight) => Math.pow(overall, weight));
  const spare = trib.extra.map((item) => Math.min(item.cap, Math.pow(overall, item.pow)));
  const chance = extra ? spare[session.gains] : main[session.bolt];
  const boost = (p) => Math.min(0.99, p + BOLT_BORROW_TRIB);
  // 借势按机缘够借几道算，先借给最难的几道。
  let borrows = Math.floor(run.chance / BOLT_BORROW_CHANCE);
  let left = 1;
  let leftBorrow = 1;
  for (let i = total - 1; i >= session.bolt; i--) {
    left *= main[i];
    leftBorrow *= borrows-- > 0 ? boost(main[i]) : main[i];
  }
  return {
    total: total,
    extraTotal: trib.extra.length,
    passed: session.bolt,
    gains: session.gains,
    active: !!run.trib,
    extra: extra,
    index: extra ? session.gains + 1 : session.bolt + 1,
    chance: chance,
    borrowChance: boost(chance),
    left: extra ? chance : left,
    leftBorrow: extra ? boost(chance) : leftBorrow,
    reward: extra ? boltRewardText(tests, trib.extra[session.gains]) : '',
    held: trib.extra.slice(0, session.gains).map((item) => boltRewardText(tests, item))
  };
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
  run.realmChoices = 0;
  run.stage = 0;
  run.qi = 0;
  if (hasSet(run, 'sword', 4)) run.forceLegacy = true;
  lines.push('突破至' + realmText(run));
  if (run.mode === 'demon') {
    lines.push('魔躯燃寿已定，不加寿元');
  } else {
    run.lifeFlat += info.lifeBonus;
    lines.push('寿元上限 +' + info.lifeBonus + ' 年');
  }
  const wick = mech(run, 'wickLive') * 5;
  if (wick) {
    gainLiveWick(state, wick);
    lines.push('灯芯 +' + wick);
  }
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
  const req = tribReq(state, trib);
  const terms = tribulationTerms(state, trib);
  const route = findById(SEA_ROUTES, sea.route);
  const a = attrs(state);
  const options = [];
  const chanceFor = (value) => tribulationChance(state, clamp(value / req, 0, 1.2));
  const attribute = (key, label) => {
    options.push({ id: key, label: label, chance: chanceFor(a[key]), desc: ATTR_NAMES[key] + ' ' + a[key] + ' / ' + req });
  };
  const prepared = (id, label, years, chances) => {
    const cost = choiceCosts(state, years, chances);
    options.push({ id: id, label: label, chance: clamp(1 - HEAVEN_PREPARED * run.heaven, 0.05, 1), years: years, chances: chances, desc: cost.desc.join(' · '), note: cost.reason, disabled: !!cost.reason });
  };
  if (sea.saltPassed) {
    attribute('mind', '凭道心守住本名');
    if (sea.clue) prepared('clue', '凭「' + route.clue + '」唤回本名', 0, 8);
    if (run.marks.includes('petword')) prepared('word', '请逃字替你记名', 6, 0);
    if (hasSet(run, 'pill', 2)) prepared('pill', '炼一炉定神丹', 0, 10 - (run.cave ? run.cave.field * 3 : 0));
  } else {
    attribute('edge', '斩断盐索');
    attribute('body', '负骨过潮');
    if (sea.anchor) {
      const key = route.anchorAttr || (a.edge >= a.body ? 'edge' : 'body');
      const cost = choiceCosts(state, 0, 8);
      options.push({
        id: 'anchor', label: '以「' + route.anchor + '」定潮', chances: 8,
        chance: chanceFor(a[key] + SALT_ANCHOR_BONUS),
        desc: ATTR_NAMES[key] + ' ' + a[key] + ' + ' + SALT_ANCHOR_BONUS + ' / ' + req + ' · ' + cost.desc.join(' · '),
        note: cost.reason, disabled: !!cost.reason
      });
    }
  }
  const step = sea.saltPassed ? 2 : 1;
  const name = sea.saltPassed ? '问名关' : '盐骨关';
  return Object.assign(terms, {
    step: step, name: name,
    gear: tribGear(state),
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
    passYears(state, option.years, lines);
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

// 斩灯剑意：后期灵气不必圆满也能渡劫。
function tribQiReady(state) {
  const run = state.run;
  const part = mech(run, 'earlyTrib');
  return part ? run.stage === STAGES.length - 1 && run.qi >= qiCap(state) * part : isFull(state);
}

function tribulationInfo(state) {
  const run = state.run;
  const trib = TRIBS[run.realm];
  if (!trib || trib.seaTrial) return null;
  const a = attrs(state);
  const plan = tribPlan(state)[run.realm];
  const stand = Math.floor(Math.max(a.body, 0) * mech(run, 'bodyAll'));
  let ratio = 0;
  plan.tests.forEach((k) => {
    ratio += Math.min(Math.max(a[k], stand, 0) / plan.req, 1.2);
  });
  ratio /= plan.tests.length;
  const demonOk = run.mode === 'demon' && mech(run, 'demonTrib') > 0;
  const again = mech(run, 'reTrib');
  const gear = tribGear(state);
  const minChance = gear.cut >= 1 ? 0 : 0.05;
  // 化神起装备不足也削弱借势，避免零装备靠借势的固定加成绕过装备要求。
  const borrowBonus = BORROW_TRIB * (gear.cut >= 1 ? 1 - gear.penalty : 1);
  // 魔修渡劫按比例打折；《无名一剑》把“失败后再判一次”折进显示的成功率里。
  const final = (p) => {
    if (demonOk) p *= mech(run, 'demonTrib');
    return clamp(p + (1 - p) * p * again, minChance, 0.98);
  };
  const baseChance = tribulationChance(state, ratio);
  const info = Object.assign(tribulationTerms(state, trib), {
    name: trib.name,
    aspect: plan.aspect,
    tests: plan.tests,
    req: plan.req,
    chance: final(baseChance),
    borrowChance: final(clamp(baseChance + borrowBonus, minChance, 0.98)),
    borrowReady: run.chance >= BORROW_CHANCE,
    borrowCost: BORROW_CHANCE,
    scatterYears: SCATTER_YEARS,
    demonOk: demonOk,
    gear: gear,
    parts: tribulationParts(state, ratio),
    // 逐道雷渡到一半时不再看灵气和魔修身份，否则这场劫既渡不完也退不出。
    ready: run.phase === 'alive' && !run.pending && (!!run.trib || ((run.mode !== 'demon' || demonOk) && tribQiReady(state)))
  });
  if (trib.bolts) {
    // chance 和 borrowChance 改成“剩下的必接雷全过”的把握，渡到余雷时是下一道余雷的把握。
    info.bolts = boltView(state, trib, plan.tests, info.chance);
    info.chance = info.bolts.left;
    info.borrowChance = info.bolts.leftBorrow;
    info.borrowReady = run.chance >= BOLT_BORROW_CHANCE;
    info.borrowCost = BOLT_BORROW_CHANCE;
  }
  return info;
}

// 逐道雷：必接的雷用 endure 硬接或 borrow 借势，一道没接住整场就败；也可以 scatter 散功。
// 必接的雷全过后进入余雷：settle 收劫破境，或继续 endure、borrow 多引一道。余雷没接住照样破境，但淬体所得尽失，还要折寿、涨心魔。
function attemptBolt(state, rng, method, info) {
  const run = state.run;
  const bolts = info.bolts;
  if ((bolts.extra ? ['endure', 'borrow', 'settle'] : ['endure', 'borrow', 'scatter']).indexOf(method) < 0) return null;
  if (method === 'borrow' && run.chance < BOLT_BORROW_CHANCE) return null;
  const trib = TRIBS[run.realm];
  const lines = [];
  const before = snapshot(state);
  const out = { name: info.name, method: method, success: false, chance: 0, lines: lines, dead: false, done: true, broke: false, bolt: bolts.index, extra: bolts.extra };
  const settle = (gains) => {
    enterNextRealm(state, info, lines);
    trib.extra.slice(0, gains).forEach((reward) => {
      info.tests.forEach((k) => { run.stats[k] += reward.attr || 0; });
      run.lifeFlat += reward.life || 0;
      gainLiveWick(state, reward.wick || 0);
      lines.push('余雷淬体：' + boltRewardText(info.tests, reward));
    });
    out.broke = true;
  };
  if (method === 'scatter') {
    run.lastTrib = { name: info.name, chance: 0, method: method };
    run.age += SCATTER_YEARS;
    run.qi = qiCap(state) * 0.5;
    run.age = Math.min(run.age, maxLife(state) - 1);
    lines.push('散功：折寿 ' + SCATTER_YEARS + ' 年，不会身死', '灵气散去一半');
  } else if (method === 'settle') {
    out.success = true;
    settle(bolts.gains);
  } else {
    const chance = method === 'borrow' ? bolts.borrowChance : bolts.chance;
    out.chance = chance;
    run.lastTrib = { name: info.name, chance: chance, method: method };
    if (method === 'borrow') {
      run.chance -= BOLT_BORROW_CHANCE;
      lines.push('借势：机缘 -' + BOLT_BORROW_CHANCE + '，这一道成功率 +' + pctText(BOLT_BORROW_TRIB));
    }
    const session = run.trib || { bolt: 0, gains: 0 };
    out.success = rng() < chance;
    if (!bolts.extra && out.success) {
      session.bolt++;
      run.trib = session;
      lines.push('接住了第 ' + session.bolt + ' 道雷');
      if (session.bolt < bolts.total) {
        out.done = false;
      } else if (trib.extra.length) {
        out.done = false;
        lines.push('必接的雷已过，劫云未散：可以收劫破境，也可以再引余雷淬体');
      } else {
        settle(0);
      }
    } else if (!bolts.extra) {
      lines.push('第 ' + bolts.index + ' 道雷没接住');
      failTribulation(state, info, lines);
    } else if (out.success) {
      session.gains++;
      lines.push('接住了第 ' + session.gains + ' 道余雷');
      if (session.gains < trib.extra.length) {
        out.done = false;
        lines.push(boltRewardText(info.tests, trib.extra[session.gains - 1]) + '（收劫时到手）');
      } else {
        settle(session.gains);
      }
    } else {
      lines.push('第 ' + bolts.index + ' 道余雷没接住，淬体所得尽失');
      settle(0);
      run.age += info.failYears;
      run.demon = clamp(run.demon + info.failDemon, 0, MAX_DEMON);
      if (info.safe) run.age = Math.min(run.age, maxLife(state) - 1);
      lines.push('折寿 ' + info.failYears + ' 年', '心魔 +' + info.failDemon);
    }
  }
  if (!out.done) return out;
  run.trib = null;
  run.tribBoon = 0;
  if (out.broke) maybeSudden(state, rng, 'thunder');
  const head = method === 'scatter' ? '散功，渡劫失败：' : (out.broke ? '渡劫成功：' : '渡劫失败：');
  run.log.push({ age: run.age, title: info.name, text: head + lines.join('，'), detail: changeText(before, snapshot(state)) });
  run.log = run.log.slice(-MAX_LOG);
  out.dead = checkDeath(state, 'trib');
  return out;
}

// method：endure 硬抗（默认），borrow 耗机缘借势，scatter 散功保命。
function attemptTribulation(state, rng, method) {
  const run = state.run;
  const info = tribulationInfo(state);
  method = method || 'endure';
  if (info && info.ready && info.bolts) return attemptBolt(state, rng, method, info);
  if (!info || !info.ready || ['endure', 'borrow', 'scatter'].indexOf(method) < 0) return null;
  if (method === 'borrow' && run.chance < BORROW_CHANCE) return null;
  const lines = [];
  const before = snapshot(state);
  const chance = method === 'borrow' ? info.borrowChance : info.chance;
  run.lastTrib = { name: info.name, chance: method === 'scatter' ? 0 : chance, method: method };
  run.tribBoon = 0;
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
  return { name: info.name, method: method, success: success, chance: chance, lines: lines, dead: dead, done: true, broke: success };
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
  run.chance = Math.floor(maxChance(state) * START_CHANCE_SHARE);
  state.lastTime = now;
  return true;
}

function lampCost(state, id) {
  const lamp = findById(LAMPS, id);
  return lamp.cost * Math.pow(2, lampLevel(state, id));
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

function tomeLevel(state, id) {
  return state.tomes[id] || 0;
}

// 这一档请出各品级的实际概率。已经没有功法能升到的品级不会出，它的概率按比例分给其余品级。
function tomeOdds(state, id) {
  const tier = findById(TOME_TIERS, id);
  const odds = tier.odds.map((p, i) => (TOMES.some((tome) => tomeLevel(state, tome.id) < TOME_MIN + i) ? p : 0));
  const total = odds.reduce((sum, p) => sum + p, 0);
  return odds.map((p) => (total ? p / total : 0));
}

function tomeTierOpen(state, id) {
  return !!findById(TOME_TIERS, id) && tomeOdds(state, id).some((p) => p > 0);
}

// 花灯芯从藏经阁请一门功法：先定品级，再从还没到这个品级的功法里挑一门，所以每次都有所得。
function drawTome(state, id, rng) {
  const tier = findById(TOME_TIERS, id);
  if (!tier || !tomeTierOpen(state, id) || state.wick < tier.cost) return null;
  const odds = tomeOdds(state, id);
  let r = rng();
  let grade = odds.length - 1;
  while (!odds[grade]) grade--;
  for (let i = 0; i < odds.length; i++) {
    if (!odds[i]) continue;
    if (r < odds[i]) {
      grade = i;
      break;
    }
    r -= odds[i];
  }
  const level = TOME_MIN + grade;
  const tome = pick(TOMES.filter((item) => tomeLevel(state, item.id) < level), rng);
  const before = tomeLevel(state, tome.id);
  state.wick -= tier.cost;
  state.tomes[tome.id] = level;
  return { id: tome.id, level: level, before: before };
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

// 存档里一门功法的品级；返回 0 表示这门功法不该出现（藏经阁里还没请出）。
function savedLevel(state, skill, level) {
  if (skill.arcane) return 1;
  if (skill.tome) return tomeLevel(state, skill.id) ? clamp(toCount(level), TOME_MIN, tomeLevel(state, skill.id)) : 0;
  return clamp(toCount(level), 1, MAX_GRADE);
}

function learnable(id) {
  return findById(SKILLS, id) || findById(TOMES, id);
}

function normalizeEvent(raw, state) {
  if (!raw || typeof raw !== 'object') return null;
  const rerolls = toCount(raw.rerolls, 1);
  if (raw.kind === 'legacy') {
    // 旧版大机缘是待选的传承，现在当场结算；存档里留着的作废，由调用方退还次数。
    if (raw.big === true || !LEGACY_INTROS[raw.intro] || !Array.isArray(raw.offers)) return null;
    const offers = [];
    raw.offers.slice(0, 5).forEach((o) => {
      const skill = o && learnable(o.id);
      const level = skill ? savedLevel(state, skill, o.level) : 0;
      if (!level || findById(offers, o.id)) return;
      offers.push({ id: o.id, level: level });
    });
    if (!offers.length) return null;
    return { kind: 'legacy', intro: raw.intro, offers: offers, rerolls: rerolls };
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
    if (validAspects(raw.tribs)) run.tribs = validAspects(raw.tribs);
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
  run.powders = toCount(raw.powders, POWDER_MAX);
  run.speed = Math.max(0, toNumber(raw.speed));
  const stats = raw.stats || {};
  ATTRS.forEach((k) => {
    run.stats[k] = Math.round(toNumber(stats[k]));
  });
  run.slots = toCount(raw.slots, MAX_EXTRA_SLOTS);
  if (Array.isArray(raw.skills)) {
    raw.skills.forEach((s) => {
      const skill = s && skillInfo(s.id);
      const level = skill ? savedLevel(state, skill, s.level) : 0;
      if (!level || skillEntry(run, s.id) || run.skills.length >= skillCap(state, run)) return;
      run.skills.push({ id: s.id, level: level });
    });
  }
  run.choices = toCount(raw.choices);
  run.realmChoices = toCount(raw.realmChoices, run.choices);
  // 更新前已经开始的这一世沿用原来的考核，不补抽劫相。
  run.tribs = validAspects(raw.tribs) || TRIB_ASPECTS.slice(0, SEA_REALM).map((aspect) => aspect.id);
  run.heaven = toCount(raw.heaven, state.heavenMax);
  run.path = SCHOOLS[raw.path] && run.realm >= 1 ? raw.path : '';
  if (caveOpen(run)) mountain.normalizeRunMountain(run, raw, run.realm > SEA_REALM, toCount);
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
  run.revived = raw.revived === true;
  run.wards = toCount(raw.wards, 99);
  run.sures = toCount(raw.sures, 99);
  run.wake = WAKES[raw.wake] ? raw.wake : '';
  run.forceLegacy = raw.forceLegacy === true;
  run.freeRerolls = toCount(raw.freeRerolls, findById(LAMPS, 'y2').max + BIG_REROLLS);
  run.tribBoon = raw.tribBoon > 0 ? BIG_TRIB : 0;
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
    if (toCount(death.heaven, HEAVEN_MAX)) run.death.heaven = toCount(death.heaven, HEAVEN_MAX);
    run.sea = normalizeSea(run, raw.sea);
    return run;
  }
  const boltTrib = TRIBS[run.realm] && TRIBS[run.realm].bolts ? TRIBS[run.realm] : null;
  if (boltTrib && raw.trib && typeof raw.trib === 'object') {
    const bolt = toCount(raw.trib.bolt, boltTrib.bolts.length);
    const gains = bolt === boltTrib.bolts.length ? toCount(raw.trib.gains, boltTrib.extra.length - 1) : 0;
    if (bolt) run.trib = { bolt: bolt, gains: gains };
  }
  run.event = normalizeEvent(raw.event, state);
  if (run.event && run.event.trigger && !run.sudden) run.sudden = { id: run.event.trigger, stage: run.event.stage };
  // 存档里的机缘已失效（例如事件被改名）时，把消耗的那次机缘还回去。
  if (raw.event && !run.event) {
    if (raw.event.big === true) state.big = Math.min(MAX_BIG, state.big + 1);
    else run.chance += 1;
  }
  const pending = raw.pending;
  const pendingSkill = pending && skillInfo(pending.id);
  const pendingLevel = pendingSkill ? savedLevel(state, pendingSkill, pending.level) : 0;
  if (pendingLevel && !skillEntry(run, pending.id) && run.skills.length >= maxSkills(state)) {
    run.pending = { id: pending.id, level: pendingLevel };
  }
  run.sea = normalizeSea(run, raw.sea);
  const saved = raw.battle && typeof raw.battle === 'object' ? raw.battle : {};
  run.battle.cleared = toCount(saved.cleared, TRAIN_MAX);
  run.battle.back = toCount(saved.back, run.battle.cleared);
  run.battle.bag = clamp(toNumber(saved.bag), 0, trainRate(state, run.battle.cleared) * TRAIN_BAG_HOURS);
  run.battle.loot = run.battle.cleared > 0 ? clamp(toNumber(saved.loot), 0, TRAIN_LOOT_MAX) : 0;
  run.gear = normalizeGear(raw.gear);
  // 加入筑石和玉露之前的存档，按已经过的关数补发。
  const cleared = run.battle.cleared;
  const bosses = Math.floor(cleared / TRAIN_BOSS_EVERY);
  run.stone = raw.stone === undefined ? Math.min(mountain.STONE_MAX, (cleared - bosses) * TRAIN_STONE + bosses * TRAIN_BOSS_STONE) : toCount(raw.stone, mountain.STONE_MAX);
  run.dew = raw.dew === undefined ? Math.min(mountain.DEW_MAX, bosses * TRAIN_BOSS_DEW) : toCount(raw.dew, mountain.DEW_MAX);
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
  state.heavenMax = toCount(raw.heavenMax, HEAVEN_MAX);
  state.heaven = toCount(raw.heaven, state.heavenMax);
  const known = raw.known && typeof raw.known === 'object' ? raw.known : {};
  EVENTS.forEach((ev) => {
    const mask = toCount(known[ev.id]) & ((1 << ev.options.length) - 1);
    if (mask) state.known[ev.id] = mask;
  });
  state.mountainLegacy = mountain.normalizeArchive(raw.mountainLegacy, state.lives, toCount);
  const best = Math.floor(Number(raw.best));
  state.best = Number.isFinite(best) ? clamp(best, -1, WICK_SCORE.length - 1) : -1;
  const lamps = raw.lamps || {};
  LAMPS.forEach((lamp) => {
    const level = toCount(lamps[lamp.id], lampMax(state, lamp.id));
    if (level) state.lamps[lamp.id] = level;
  });
  const tomes = raw.tomes || {};
  TOMES.forEach((tome) => {
    const level = toCount(tomes[tome.id], GRADE_NAMES.length);
    if (level >= TOME_MIN) state.tomes[tome.id] = level;
  });
  if (Array.isArray(raw.epitaphs)) {
    state.epitaphs = raw.epitaphs.filter((e) => typeof e === 'string').slice(0, MAX_EPITAPHS).map((e) => e.slice(0, 300));
  }
  const last = Number(raw.lastTime);
  state.lastTime = Number.isFinite(last) && last > 0 && last <= now ? last : now;
  state.big = toCount(raw.big, MAX_BIG);
  state.bigCount = toCount(raw.bigCount, BIG_EVERY - 1);
  if (raw.arena !== undefined) state.arena = clamp(toNumber(raw.arena), 0, ARENA_MAX);
  state.oil = clamp(toNumber(raw.oil), 0, OIL_MAX);
  state.arenaPoints = toCount(raw.arenaPoints);
  state.run = normalizeRun(state, raw.run, rng);
  state.trainBest = Math.max(toCount(raw.trainBest, TRAIN_MAX), state.run.battle.cleared);
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
  TOMES,
  TOME_TIERS,
  SUDDENS,
  SUDDEN_MAX,
  SUDDEN_COOLDOWN,
  SUDDEN_AFTERMATH,
  ROOTS,
  RARE_ROOTS,
  ROOT_RARITIES,
  rootInfo,
  REALMS,
  REALM_POWER_GROWTH: content.REALM_POWER_GROWTH,
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
  START_CHANCE_SHARE,
  CHANCE_REALM_GROWTH,
  BIG_EVERY,
  createState,
  normalizeState,
  lampLevel,
  maxSkills,
  setCounts,
  hasSet,
  attrs,
  combatPowerDetails,
  qiCap,
  qiRate,
  maxLife,
  yearsLeft,
  maxChance,
  chanceInterval,
  chanceYears,
  YEAR_SECONDS,
  OIL_MAX,
  OIL_INTERVAL_SEC,
  passTime,
  passYears,
  canMeditate,
  meditateYears,
  meditate,
  realmText,
  layerIndex,
  layerName,
  atSea,
  isFull,
  advance,
  skillInfo,
  skillDesc,
  skillTitle,
  gradeName,
  skillUpgradeDesc,
  mergeOptions,
  mergeSkills,
  eventView,
  canDraw,
  drawEvent,
  BIG_EVENTS,
  canDrawBig,
  bigPool,
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
  TRAIN_MOBS,
  TRAIN_BOSS_EVERY,
  TRAIN_RETREAT,
  TRAIN_BAG_HOURS,
  TRAIN_STONE,
  TRAIN_BOSS_STONE,
  TRAIN_BOSS_DEW,
  caveOpen,
  trainFighter,
  trainFoe,
  trainView,
  trainReason,
  trainStage,
  trainWaves,
  trainEncounter,
  trainClear,
  trainLose,
  trainRate,
  trainBag,
  trainCollect,
  GEAR_SLOTS: gear.SLOTS,
  GEAR_PACK_MAX: gear.PACK_MAX,
  GEAR_MAX_LEVEL: gear.MAX_LEVEL,
  TRAIN_DROP_PITY,
  gearView,
  gearHasBetter,
  gearScore,
  tribGear,
  GEAR_HEAVEN,
  GEAR_TRIB_MAX,
  GEAR_TRIB_BONUS,
  GEAR_TRIB_HALF,
  gearEquip,
  gearEquipBest,
  gearEnhance,
  gearScrap,
  gearScrapSpare,
  SEA_REALM,
  SEA_TIDE_LIMIT,
  seaView,
  chooseSea,
  retreatSea,
  mountainReady,
  mountainView,
  chooseMountain,
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
  lampMax,
  TRIB_ASPECTS,
  PATH_COUNTER,
  HEAVEN_MAX,
  tribulationChance,
  PATH_MAIN,
  PATH_WEAK,
  DEEP_LAMPS,
  tribPlan,
  tribTerm,
  pathReady,
  pathView,
  choosePath,
  pathMult,
  heavenText,
  setHeaven,
  knownProgress,
  buyLamp,
  tomeLevel,
  tomeOdds,
  tomeTierOpen,
  drawTome,
  formatNumber,
  formatDuration
};
