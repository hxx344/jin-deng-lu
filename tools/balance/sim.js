// 平衡模拟：用两种固定打法的机器人把整套规则跑很多世，输出一组可对比的数值。
// 用法：node tools/balance/sim.js          对比当前规则与基线
//       node tools/balance/sim.js --write  用当前规则重写基线和 docs/平衡基线.md
const fs = require('node:fs');
const path = require('node:path');
const game = require('../../utils/game');
const content = require('../../utils/content');

const BASELINE_FILE = path.join(__dirname, 'baseline.json');
const DOC_FILE = path.join(__dirname, '..', '..', 'docs', '平衡基线.md');

const CONFIG = {
  seed: 20261120,
  saves: 200,
  lives: 12,
  // 每做一次选择或操作花掉的现实时间。
  choiceSeconds: 5,
  // 认真玩：渡劫成功率到这个数才渡；寿元只剩这么多年时不再等。
  tribThreshold: 0.7,
  lastDitchYears: 8,
  reportLives: [1, 2, 4, 8, 12]
};
// 单元测试每次都跑的小样本：只用来发现“数值变了”，读数以全量结果为准。
const CHECK = { saves: 40, lives: 6, reportLives: [1, 3, 6] };

const POLICY_NAMES = { casual: '随手玩', careful: '认真玩' };
// 一世最多走这么多步；走不完说明寿元越活越多，记为“活不死”并强制坐化。
const MAX_STEPS = 5000;
const LAST_REALM = game.REALMS.length - 1;
const STAGE_COUNT = game.STAGES.length;
const REALM_NAMES = game.REALMS.map((realm) => realm.name);
const CAUSES = ['age', 'retire', 'trib', 'demon'];
const CAUSE_NAMES = { age: '寿终', retire: '坐化', trib: '死于天劫', demon: '入魔燃尽' };

function mulberry(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(list, rng) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function seaOption(run, id) {
  const route = content.SEA_ROUTES.find((item) => item.id === run.sea.route);
  return route.scenes[run.sea.tide - 1].options.find((item) => item.id === id);
}

// 两种打法共用的骨架：act 返回 true 表示这一步做了一件要花时间的事。
const POLICIES = {
  // 随手玩：不看收益，只是不点明摆着送命的选项；灵气满了立刻硬抗天劫。
  casual: {
    root(state) {
      return state.run.rootChoices[0];
    },
    act(state, rng, sim) {
      const trib = game.tribulationInfo(state);
      if (trib && trib.ready) return sim.tribulation('endure');
      const sea = game.seaView(state);
      if (sea) {
        const open = sea.options.filter((option) => !option.disabled);
        if (open.length) return !!game.chooseSea(state, pick(open, rng).id, sea.tide);
        if (state.run.sea) return !!game.retreatSea(state);
      }
      const trial = game.yuanTrialView(state);
      if (trial && trial.ready) {
        const open = trial.options.filter((option) => !option.disabled);
        if (open.length) return sim.yuanTrial(pick(open, rng).id, trial.step);
      }
      return false;
    },
    wait() {
      return false;
    },
    choose(state, rng) {
      const view = game.eventView(state);
      const all = [];
      const safe = [];
      view.options.forEach((option, i) => {
        if (option.disabled) return;
        all.push(i);
        if (!option.fatal) safe.push(i);
      });
      all.push(-1);
      if (!view.fallback.fatal) safe.push(-1);
      return pick(safe.length ? safe : all, rng);
    },
    replace(state, rng) {
      return Math.floor(rng() * (state.run.skills.length + 1)) - 1;
    },
    afterDeath() {}
  },

  // 认真玩：选项和功法取舍用游戏自带的“自动机缘”估分；属性够了才渡劫，够了就停手等灵气；
  // 会合秘法、修洞府、走枯海拿凭据、带前世功法，投胎时把根骨重抽用完。
  careful: {
    root(state, rng) {
      const best = () => state.run.rootChoices.slice().sort((a, b) => game.rootInfo(b).rarity - game.rootInfo(a).rarity)[0];
      while (game.rootInfo(best()).rarity < 3 && game.rerollRoots(state, rng)) { /* 重抽到出绝品为止 */ }
      return best();
    },
    tribChance(state) {
      const trib = game.tribulationInfo(state);
      if (trib) return trib.borrowReady ? trib.borrowChance : trib.chance;
      const trial = game.yuanTrialView(state);
      if (!trial) return null;
      return trial.options.filter((option) => !option.disabled).reduce((max, option) => Math.max(max, option.chance), 0);
    },
    act(state, rng, sim) {
      const run = state.run;
      const cfg = sim.config;
      const hurry = game.yearsLeft(state) <= cfg.lastDitchYears;
      const merge = game.mergeOptions(state)[0];
      if (merge) return !!game.mergeSkills(state, merge.first, merge.second, rng);
      const powder = game.powderInfo(state);
      if (powder.ready && game.yearsLeft(state) <= 3) return !!game.takePowder(state);
      const trib = game.tribulationInfo(state);
      if (trib && trib.ready) {
        const chance = trib.borrowReady ? trib.borrowChance : trib.chance;
        if (chance >= cfg.tribThreshold || hurry) return sim.tribulation(trib.borrowReady ? 'borrow' : 'endure');
      }
      const sea = game.seaView(state);
      if (sea) {
        const open = sea.options.filter((option) => !option.disabled && !option.note);
        if (!run.sea) {
          if (open.length) return !!game.chooseSea(state, open[0].id, sea.tide);
        } else {
          const left = game.yearsLeft(state);
          const rated = open.map((option) => {
            const def = seaOption(run, option.id);
            return { id: option.id, years: def.years, useful: !!(def.anchor || def.clue) && def.years + 25 < left };
          }).sort((a, b) => (Number(b.useful) - Number(a.useful)) || (a.years - b.years));
          if (rated.length) return !!game.chooseSea(state, rated[0].id, sea.tide);
          return !!game.retreatSea(state);
        }
      }
      const trial = game.yuanTrialView(state);
      if (trial && trial.ready) {
        const open = trial.options.filter((option) => !option.disabled).sort((a, b) => b.chance - a.chance);
        if (open.length && (open[0].chance >= cfg.tribThreshold || hurry)) return sim.yuanTrial(open[0].id, trial.step);
      }
      if (game.mountainReady(state) && !game.isFull(state)) {
        const view = game.mountainView(state, 'cave', '');
        const option = view && view.options.find((item) => !item.disabled && item.years + 15 < game.yearsLeft(state));
        if (option) return !!game.chooseMountain(state, 'cave', '', view.stamp, option.id, '');
      }
      return false;
    },
    wait(state, sim) {
      const run = state.run;
      if (run.mode === 'demon' || game.isFull(state) || game.yearsLeft(state) <= sim.config.lastDitchYears) return false;
      if (game.seaView(state) || (run.realm === game.SEA_REALM && !run.sea)) return false;
      const chance = this.tribChance(state);
      return chance !== null && chance >= sim.config.tribThreshold;
    },
    choose(state) {
      return game.autoPick(state);
    },
    replace(state) {
      return game.autoReplace(state);
    },
    afterDeath(state) {
      if (!game.canCarry(state)) return;
      const best = state.run.skills.filter((entry) => !game.skillInfo(entry.id).arcane).sort((a, b) => b.level - a.level)[0];
      if (best) game.setCarry(state, best.id);
    }
  }
};

function buyLamps(state) {
  for (;;) {
    let best = null;
    game.LAMPS.forEach((lamp) => {
      if (game.lampMaxed(state, lamp.id)) return;
      const cost = game.lampCost(state, lamp.id);
      if (cost <= state.wick && (!best || cost < best.cost)) best = { id: lamp.id, cost: cost };
    });
    if (!best || !game.buyLamp(state, best.id)) return;
  }
}

// 跑完一世，返回这一世的记录。
function playLife(state, policy, rng, config, clock) {
  const life = { tribs: [], capped: false };
  const start = clock.now;
  const tick = (seconds) => {
    clock.now += seconds * 1000;
    game.advance(state, clock.now);
  };
  const sim = {
    config: config,
    tribulation(method) {
      const result = game.attemptTribulation(state, rng, method);
      if (result) life.tribs.push({ name: result.name, success: result.success });
      return !!result;
    },
    yuanTrial(method, step) {
      const realm = state.run.realm;
      const result = game.attemptYuanTrial(state, rng, method, step);
      // 元婴劫两关算一次天劫：失败一次记一次失败，问名关过了记一次成功。
      if (result && (!result.success || result.advanced)) life.tribs.push({ name: game.TRIBS[realm].name, success: !!result.advanced });
      return !!result;
    }
  };
  game.chooseRoot(state, policy.root(state, rng), clock.now, rng);
  const run = state.run;
  let steps = 0;
  while (run.phase === 'alive') {
    if (++steps > MAX_STEPS) {
      life.capped = true;
      game.retire(state);
      break;
    }
    // 到了版本终点（最高境界圆满）灯芯不会再涨，两种打法都直接坐化。
    if (run.realm === LAST_REALM && game.isFull(state)) {
      game.retire(state);
      break;
    }
    if (policy.act(state, rng, sim)) {
      tick(config.choiceSeconds);
      continue;
    }
    if (game.atSea(run)) {
      game.retreatSea(state);
      continue;
    }
    if (policy.wait(state, sim)) {
      tick(30);
      continue;
    }
    // 大机缘当场结算，没有选项。
    if (game.drawBig(state, rng)) {
      if (run.phase === 'alive' && run.pending) game.resolveReplace(state, policy.replace(state, rng));
      tick(config.choiceSeconds);
      continue;
    }
    if (!game.drawEvent(state, rng)) {
      tick(Math.max(1, (1 - run.chance) * game.chanceInterval(state)));
      continue;
    }
    const index = policy.choose(state, rng);
    if (index === null || !game.choose(state, index, rng)) {
      // 没有不送命的选项：能渡劫就搏一把，否则坐化。
      const trib = game.tribulationInfo(state);
      if (!(trib && trib.ready && sim.tribulation(trib.borrowReady ? 'borrow' : 'endure') && run.phase === 'alive' && !run.event)) game.retire(state);
      continue;
    }
    if (run.phase === 'alive' && run.pending) game.resolveReplace(state, policy.replace(state, rng));
    tick(config.choiceSeconds);
  }
  life.realm = run.realm;
  life.stage = run.realm * STAGE_COUNT + run.stage;
  life.cause = run.death.cause;
  life.wick = run.death.wick;
  life.choices = run.choices;
  life.age = run.age;
  life.left = game.yearsLeft(state);
  life.minutes = (clock.now - start) / 60000;
  life.skills = run.skills.length;
  life.arcanes = run.skills.filter((entry) => game.skillInfo(entry.id).arcane).length;
  life.suddens = run.suddenCount;
  life.demon = run.mode === 'demon';
  return life;
}

function playSave(policyId, seed, config) {
  const policy = POLICIES[policyId];
  const rng = mulberry(seed);
  const clock = { now: 0 };
  const state = game.createState(0, rng);
  const lives = [];
  for (let i = 0; i < config.lives; i++) {
    const life = playLife(state, policy, rng, config, clock);
    life.totalWick = state.totalWick;
    life.totalMinutes = clock.now / 60000;
    lives.push(life);
    policy.afterDeath(state, rng);
    buyLamps(state);
    life.lampsMaxed = game.LAMPS.every((lamp) => game.lampMaxed(state, lamp.id));
    game.reincarnate(state, clock.now, rng);
  }
  return lives;
}

const round = (value, digits) => Number(value.toFixed(digits === undefined ? 1 : digits));
const mean = (list, fn) => (list.length ? list.reduce((sum, item) => sum + fn(item), 0) / list.length : 0);
const share = (list, fn) => round(100 * mean(list, (item) => Number(!!fn(item))));

function median(list) {
  if (!list.length) return null;
  const sorted = list.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function summarize(saves, config) {
  const out = { lives: {}, firstReach: {}, tribs: {}, capped: 0 };
  config.reportLives.forEach((n) => {
    const lives = saves.map((save) => save[n - 1]);
    const reach = {};
    REALM_NAMES.slice(1).forEach((name, i) => { reach[name] = share(lives, (life) => life.realm >= i + 1); });
    const causes = {};
    CAUSES.forEach((cause) => { causes[cause] = share(lives, (life) => life.cause === cause); });
    out.lives[n] = {
      reach: reach,
      causes: causes,
      wick: round(mean(lives, (life) => life.wick)),
      choices: round(mean(lives, (life) => life.choices)),
      minutes: round(mean(lives, (life) => life.minutes)),
      age: round(mean(lives, (life) => life.age)),
      left: round(mean(lives, (life) => life.left)),
      skills: round(mean(lives, (life) => life.skills)),
      arcanes: round(mean(lives, (life) => life.arcanes), 2),
      suddens: round(mean(lives, (life) => life.suddens), 2),
      demon: share(lives, (life) => life.demon),
      totalWick: round(mean(lives, (life) => life.totalWick)),
      totalMinutes: round(mean(lives, (life) => life.totalMinutes)),
      lampsMaxed: share(lives, (life) => life.lampsMaxed)
    };
  });
  REALM_NAMES.slice(1).forEach((name, i) => {
    const first = saves.map((save) => save.findIndex((life) => life.realm >= i + 1)).filter((n) => n >= 0);
    const minutes = saves.map((save) => {
      const n = save.findIndex((life) => life.realm >= i + 1);
      return n < 0 ? -1 : save[n].totalMinutes;
    }).filter((n) => n >= 0);
    out.firstReach[name] = {
      share: round(100 * first.length / saves.length),
      medianLife: first.length ? median(first) + 1 : null,
      medianMinutes: minutes.length ? round(median(minutes)) : null
    };
  });
  const all = [].concat.apply([], saves);
  game.TRIBS.forEach((trib) => {
    const tries = [].concat.apply([], all.map((life) => life.tribs)).filter((item) => item.name === trib.name);
    out.tribs[trib.name] = { perLife: round(tries.length / all.length, 2), success: tries.length ? share(tries, (item) => item.success) : null };
  });
  out.capped = all.filter((life) => life.capped).length;
  return out;
}

function simulate(overrides) {
  const config = Object.assign({}, CONFIG, overrides);
  const results = {};
  const random = Math.random;
  // 规则里少数几处直接用了 Math.random；模拟期间换成会报错的函数，保证结果只由种子决定。
  Math.random = () => { throw new Error('平衡模拟期间不应调用 Math.random'); };
  try {
    Object.keys(POLICIES).forEach((id) => {
      const saves = [];
      for (let i = 0; i < config.saves; i++) saves.push(playSave(id, config.seed + i, config));
      results[id] = summarize(saves, config);
    });
  } finally {
    Math.random = random;
  }
  return { config: config, results: results };
}

function build() {
  return Object.assign(simulate(), { check: simulate(CHECK) });
}

function table(head, rows) {
  return ['| ' + head.join(' | ') + ' |', '| ' + head.map(() => '---').join(' | ') + ' |']
    .concat(rows.map((row) => '| ' + row.join(' | ') + ' |')).join('\n');
}

const pct = (value) => (value === null ? '—' : value + '%');
const orDash = (value) => (value === null ? '—' : String(value));

function render(data) {
  const config = data.config;
  const out = [
    '# 平衡基线',
    '',
    '> 本文件由 `node tools/balance/sim.js --write` 生成，不要手改。数值来自 `tools/balance/baseline.json`。',
    '> 改了规则或内容后运行 `node --test`：`tests/balance.test.js` 用一组小样本（' + data.check.config.saves + ' 个存档 × ' + data.check.config.lives + ' 世）重跑模拟，结果与基线不一致就失败。',
    '> 这时运行 `node tools/balance/sim.js` 看全量差异（约半分钟）。',
    '> 确认变化符合预期后重新生成基线，并把本文件的差异一起提交。',
    '',
    '## 口径',
    '',
    '- 每种打法 ' + config.saves + ' 个存档，每个存档连续玩 ' + config.lives + ' 世，随机种子 ' + config.seed + ' 起逐档加一，结果可完全复现。',
    '- 时间：一直在线，有机缘就翻，每次选择或操作算 ' + config.choiceSeconds + ' 秒；机缘用完就等下一次。没有模拟离线。',
    '- 灯芯：每世结束后从最便宜的灯纹买起，买到买不起为止。',
    '- 终点：到达' + REALM_NAMES[LAST_REALM] + '圆满后灯芯不会再涨，两种打法都直接坐化，“余寿”是身死时还没用掉的寿元。一世走满 ' + MAX_STEPS + ' 步仍未结束的记为“活不死”并强制坐化。',
    '- **随手玩**：选项在不会当场寿尽的里面随机挑，功法取舍随机，灵气一满立刻硬抗天劫，枯海和元婴劫也随机选；根骨拿第一副，不重抽。',
    '- **认真玩**：选项和功法取舍用游戏自带的“自动机缘”估分；渡劫成功率到 ' + Math.round(config.tribThreshold * 100) + '% 才渡（能借势就借势），属性够了就停手等灵气，寿元只剩 ' + config.lastDitchYears + ' 年时不再等；会合秘法、修洞府、在枯海拿凭据、带前世功法；根骨重抽到出“绝”品以上或次数用完。',
    '- 没有覆盖：竞技场、宗门与弟子（含跨世传承）、机缘重抽、散功保命、离线收益。',
    ''
  ];
  Object.keys(data.results).forEach((id) => {
    const result = data.results[id];
    const lives = Object.keys(result.lives);
    out.push('## ' + POLICY_NAMES[id], '');
    out.push('**每一世的结局**（到达 = 身死时所在的大境界不低于该境界）', '');
    out.push(table(['第几世'].concat(REALM_NAMES.slice(1).map((name) => '到达' + name), ['灯芯', '选择次数', '时长（分）', '享年', '余寿']),
      lives.map((n) => {
        const life = result.lives[n];
        return [n].concat(REALM_NAMES.slice(1).map((name) => pct(life.reach[name])), [life.wick, life.choices, life.minutes, life.age, life.left]);
      })), '');
    out.push('**死法与构筑**', '');
    out.push(table(['第几世'].concat(CAUSES.map((cause) => CAUSE_NAMES[cause]), ['堕魔', '功法数', '秘法数', '突发组数']),
      lives.map((n) => {
        const life = result.lives[n];
        return [n].concat(CAUSES.map((cause) => pct(life.causes[cause])), [pct(life.demon), life.skills, life.arcanes, life.suddens]);
      })), '');
    out.push('**跨世进度**', '');
    out.push(table(['到第几世结束', '累计灯芯', '累计时长（分）', '灯纹全满'],
      lives.map((n) => [n, result.lives[n].totalWick, result.lives[n].totalMinutes, pct(result.lives[n].lampsMaxed)])), '');
    out.push(table(['首次到达', config.lives + ' 世内做到的存档', '中位数世数', '那一世结束时的累计时长中位数（分）'],
      Object.keys(result.firstReach).map((name) => {
        const item = result.firstReach[name];
        return [name, pct(item.share), orDash(item.medianLife), orDash(item.medianMinutes)];
      })), '');
    out.push('“活不死”的局数：' + result.capped + '。', '');
    out.push('**天劫**', '');
    out.push(table(['天劫', '每世平均渡劫次数', '成功率'],
      Object.keys(result.tribs).map((name) => [name, result.tribs[name].perLife, pct(result.tribs[name].success)])), '');
  });
  return out.join('\n');
}

// 列出两份结果里数值不同的项：路径、基线值、当前值。
function diff(base, next, prefix, out) {
  out = out || [];
  const keys = Array.from(new Set(Object.keys(base || {}).concat(Object.keys(next || {}))));
  keys.forEach((key) => {
    const a = base ? base[key] : undefined;
    const b = next ? next[key] : undefined;
    const name = prefix ? prefix + '.' + key : key;
    if (a && b && typeof a === 'object' && typeof b === 'object') diff(a, b, name, out);
    else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: name, base: a, now: b });
  });
  return out;
}

function readBaseline() {
  return fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : null;
}

function main(args) {
  const data = build();
  if (args.indexOf('--write') >= 0) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2) + '\n');
    fs.writeFileSync(DOC_FILE, render(data) + '\n');
    console.log('已写入 ' + path.relative(process.cwd(), BASELINE_FILE) + ' 和 ' + path.relative(process.cwd(), DOC_FILE));
    return 0;
  }
  const base = readBaseline();
  if (!base) {
    console.log(render(data));
    console.log('\n还没有基线。运行 node tools/balance/sim.js --write 生成。');
    return 1;
  }
  const changes = diff(base, data);
  if (!changes.length) {
    console.log('与基线一致。');
    return 0;
  }
  console.log('与基线有 ' + changes.length + ' 项不同（路径：基线 → 当前）：');
  changes.forEach((item) => console.log('  ' + item.path + '：' + JSON.stringify(item.base) + ' → ' + JSON.stringify(item.now)));
  console.log('\n确认变化符合预期后运行 node tools/balance/sim.js --write 更新基线。');
  return 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { CONFIG, CHECK, BASELINE_FILE, DOC_FILE, simulate, build, render, diff, readBaseline };
