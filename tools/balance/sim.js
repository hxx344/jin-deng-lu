// 平衡模拟：用三种固定打法的机器人把整套规则跑很多世，输出一组可对比的数值。
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
  // 认真玩：渡劫成功率到这个数才渡；劫期过了降到 overdueThreshold；寿元只剩 lastDitchYears 年时不再等。
  tribThreshold: 0.7,
  overdueThreshold: 0.45,
  lastDitchYears: 8,
  // 认真玩：余雷的成功率到这个数才多引一道。
  extraThreshold: 0.85,
  // 挂机玩：成功率过了这个数就渡。
  idleThreshold: 0.5,
  reportLives: [1, 2, 4, 8, 12]
};
// 单元测试每次都跑的小样本：只用来发现“数值变了”，读数以全量结果为准。
const CHECK = { saves: 30, lives: 6, reportLives: [1, 3, 6] };

const POLICY_NAMES = { casual: '随手玩', idle: '挂机玩', careful: '认真玩' };
// 一世最多走这么多步；走不完说明寿元越活越多，记为“活不死”并强制坐化。
const MAX_STEPS = 5000;
const LAST_REALM = game.REALMS.length - 1;
const STAGE_COUNT = game.STAGES.length;
const REALM_NAMES = game.REALMS.map((realm) => realm.name);
const GOALS = REALM_NAMES.slice(1).concat('圆满');
// 圆满后的坐化单列；走投无路时的坐化和寿终算一类。
const CAUSES = ['clear', 'age', 'trib', 'demon'];
const CAUSE_NAMES = { clear: '圆满坐化', age: '寿尽或无路可走', trib: '死于天劫', demon: '入魔燃尽' };
const SCHOOL_ATTR = { sword: 'edge', body: 'body', talisman: 'mind' };

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

// 随机走枯海和元婴劫。
function randomVoyage(state, rng, sim) {
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
}

// 没选过的选项里挑一个去试：只在寿元和心魔都宽裕时试，返回下标；没有可试的返回 null。
function explore(state) {
  if (state.run.demon >= 60) return null;
  const view = game.eventView(state);
  const left = game.yearsLeft(state);
  const index = view.options.findIndex((option) => option.unknown && !option.disabled && !option.fatal && option.years + 12 < left);
  return index < 0 ? null : index;
}

function pathScore(state, id) {
  const counts = {};
  game.SCHOOL_IDS.forEach((school) => { counts[school] = 0; });
  state.run.skills.forEach((entry) => { counts[game.skillInfo(entry.id).school] += entry.level; });
  let score = counts[id] - 0.5 * counts[game.PATH_COUNTER[id]];
  game.tribPlan(state).slice(state.run.realm).forEach((trib) => {
    if (trib.tests.indexOf(SCHOOL_ATTR[id]) >= 0) score += 3;
  });
  return score;
}

function bestPath(state, score) {
  const view = game.pathView(state);
  if (!view) return null;
  const open = view.options.filter((option) => !option.disabled).sort((a, b) => score(b.id) - score(a.id));
  return open.length ? open[0].id : null;
}

// 三种打法共用的骨架：act 返回 true 表示这一步做了一件要花时间的事。
const POLICIES = {
  // 随手玩：不看收益，只是不点明摆着送命的选项；灵气满了立刻硬抗天劫，道途随便选。
  casual: {
    root(state) {
      return state.run.rootChoices[0];
    },
    act(state, rng, sim) {
      const view = game.pathView(state);
      if (view) {
        const open = view.options.filter((option) => !option.disabled);
        if (open.length) return !!game.choosePath(state, pick(open, rng).id);
      }
      const trib = game.tribulationInfo(state);
      if (trib && trib.ready) return sim.tribulation('endure');
      return randomVoyage(state, rng, sim);
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

  // 挂机玩：没见过的选项会去试，见过的全交给“自动机缘”；道途选手里功法最多的一系；
  // 成功率过半就硬抗天劫，劫期过了或寿元将尽也渡；枯海随便走，不合秘法、不修洞府、不重抽根骨。
  idle: {
    root(state) {
      return state.run.rootChoices[0];
    },
    act(state, rng, sim) {
      const school = bestPath(state, (id) => game.setCounts(state.run)[id]);
      if (school) return !!game.choosePath(state, school);
      const trib = game.tribulationInfo(state);
      if (trib && trib.ready && (trib.chance >= sim.config.idleThreshold || game.tribTerm(state).overdue ||
        game.yearsLeft(state) <= sim.config.lastDitchYears)) return sim.tribulation('endure');
      return randomVoyage(state, rng, sim);
    },
    wait() {
      return false;
    },
    choose(state) {
      const index = explore(state);
      return index === null ? game.autoPick(state) : index;
    },
    replace(state) {
      return game.autoReplace(state);
    },
    gear: true,
    afterDeath() {}
  },

  // 认真玩：选项和功法取舍同样靠试和“自动机缘”估分，但会经营：道途按功法和劫相选；
  // 成功率够了才渡劫（能借势就借势），属性够了就停手等灵气；会合秘法、修洞府、在枯海拿凭据、
  // 带前世功法，投胎时把根骨重抽用完。
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
    threshold(state, sim) {
      if (game.yearsLeft(state) <= sim.config.lastDitchYears) return 0;
      return game.tribTerm(state).overdue ? sim.config.overdueThreshold : sim.config.tribThreshold;
    },
    act(state, rng, sim) {
      const run = state.run;
      const school = bestPath(state, (id) => pathScore(state, id));
      if (school) return !!game.choosePath(state, school);
      const merge = game.mergeOptions(state)[0];
      if (merge) return !!game.mergeSkills(state, merge.first, merge.second, rng);
      const powder = game.powderInfo(state);
      if (powder.ready && game.yearsLeft(state) <= 3) return !!game.takePowder(state);
      const need = this.threshold(state, sim);
      const trib = game.tribulationInfo(state);
      if (trib && trib.ready && (trib.borrowReady ? trib.borrowChance : trib.chance) >= need) {
        return sim.tribulation(trib.borrowReady ? 'borrow' : 'endure');
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
        if (open.length && open[0].chance >= need) return sim.yuanTrial(open[0].id, trial.step);
      }
      if (game.mountainReady(state) && !game.isFull(state)) {
        const view = game.mountainView(state, 'cave', '');
        const option = view && view.options.find((item) => !item.disabled && item.years + 15 < game.yearsLeft(state));
        if (option) return !!game.chooseMountain(state, 'cave', '', view.stamp, option.id, '');
      }
      return false;
    },
    extraBolt(state, info, sim) {
      return info.bolts.chance >= sim.config.extraThreshold && game.yearsLeft(state) > info.failYears + 20;
    },
    wait(state, sim) {
      const run = state.run;
      if (run.mode === 'demon' || game.isFull(state) || game.yearsLeft(state) <= sim.config.lastDitchYears) return false;
      if (game.seaView(state) || (run.realm === game.SEA_REALM && !run.sea)) return false;
      const chance = this.tribChance(state);
      return chance !== null && chance >= sim.config.tribThreshold;
    },
    choose(state) {
      const index = explore(state);
      return index === null ? game.autoPick(state) : index;
    },
    replace(state) {
      return game.autoReplace(state);
    },
    gear: true,
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

// 历练：场景里的战斗是自己打的，机器人也照打。seconds 是刚过去的现实时间，一场战斗占掉它自己的时长加上入场、倒下的间隔，
// 败了再加调息；时间不够打下一场就留到下次。manage 为真时每过一关把更好的换上、用不上的分解、锻材拿去强化，并收储物袋。
const TRAIN_GAP = 2;
const TRAIN_REST = 4;
function train(state, clock, seconds, manage) {
  if (!game.trainStage(state)) {
    clock.spare = 0;
    return;
  }
  const tidy = () => {
    game.gearEquipBest(state);
    game.gearScrapSpare(state);
    game.gearView(state).worn.forEach((slot) => {
      while (game.gearEnhance(state, slot.slot)) { /* 强化到锻材不够为止 */ }
    });
  };
  clock.spare += seconds;
  while (clock.spare > 0) {
    const stage = game.trainStage(state);
    if (!stage) break;
    let won = true;
    for (let wave = 0; won && wave < game.trainWaves(stage); wave++) {
      const fight = game.trainEncounter(state, wave, clock.trainRng);
      clock.spare -= fight.seconds + TRAIN_GAP;
      if (!fight.win) {
        won = false;
        clock.spare -= TRAIN_REST;
      }
    }
    if (won && game.trainClear(state, stage, clock.trainRng) && manage) tidy();
  }
  if (manage && game.trainBag(state).gear >= 1 && game.trainCollect(state, clock.trainRng)) tidy();
}

// 跑完一世，返回这一世的记录。
function playLife(state, policy, rng, config, clock) {
  const life = { tribs: [], capped: false };
  const start = clock.now;
  const tick = (seconds) => {
    clock.now += seconds * 1000;
    game.advance(state, clock.now);
    if (state.run.phase === 'alive') train(state, clock, seconds, !!policy.gear);
  };
  clock.spare = 0;
  const tribRecord = (name, success) => ({ name: name, success: success, gear: game.gearScore(state), cleared: state.run.battle.cleared });
  const sim = {
    config: config,
    // 逐道雷的天劫一口气渡完：必接的雷按 method 走，借不起就硬接；余雷只有打法愿意时才引。
    tribulation(method) {
      let result = null;
      const record = tribRecord('', false);
      for (;;) {
        const info = game.tribulationInfo(state);
        if (!info || !info.ready) break;
        let step = method === 'borrow' && !info.borrowReady ? 'endure' : method;
        if (info.bolts && info.bolts.extra) step = policy.extraBolt && policy.extraBolt(state, info, sim) ? 'endure' : 'settle';
        const next = game.attemptTribulation(state, rng, step);
        if (!next) break;
        result = next;
        if (next.done) break;
      }
      if (result) life.tribs.push(Object.assign(record, { name: result.name, success: result.broke }));
      return !!result;
    },
    yuanTrial(method, step) {
      const realm = state.run.realm;
      const record = tribRecord(game.TRIBS[realm].name, false);
      const result = game.attemptYuanTrial(state, rng, method, step);
      // 元婴劫两关算一次天劫：失败一次记一次失败，问名关过了记一次成功。
      if (result && (!result.success || result.advanced)) life.tribs.push(Object.assign(record, { success: !!result.advanced }));
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
    // 最高境界圆满后灯芯不会再涨，三种打法都直接坐化。
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
    // 属性够了、只差灵气时不再冒险：机缘照翻，但只选“闭关不理”。
    const waiting = policy.wait(state, sim);
    // 大机缘当场结算，没有选项。
    if (!waiting && game.drawBig(state, rng)) {
      if (run.phase === 'alive' && run.pending) game.resolveReplace(state, policy.replace(state, rng));
      tick(config.choiceSeconds);
      continue;
    }
    if (!game.drawEvent(state, rng)) {
      // 机缘用尽：静坐一年；连静坐都不行就坐化。
      if (!game.meditate(state)) game.retire(state);
      tick(config.choiceSeconds);
      continue;
    }
    const index = waiting && !game.eventView(state).fallback.fatal ? -1 : policy.choose(state, rng);
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
  life.full = run.realm === LAST_REALM && run.qi >= game.qiCap(state);
  life.heaven = run.heaven;
  life.cause = life.full ? 'clear' : (run.death.cause === 'retire' ? 'age' : run.death.cause);
  life.wick = run.death.wick;
  life.choices = run.choices;
  life.age = run.age;
  life.left = game.yearsLeft(state);
  life.minutes = (clock.now - start) / 60000;
  life.skills = run.skills.length;
  life.arcanes = run.skills.filter((entry) => game.skillInfo(entry.id).arcane).length;
  life.suddens = run.suddenCount;
  life.demon = run.mode === 'demon';
  life.path = !!run.path;
  return life;
}

function playSave(policyId, seed, config) {
  const policy = POLICIES[policyId];
  const rng = mulberry(seed);
  // 历练用单独的随机数流，战斗打几场不影响机缘的随机序列。
  const clock = { now: 0, spare: 0, trainRng: mulberry((seed ^ 0x5bd1e995) >>> 0) };
  const state = game.createState(0, rng);
  const lives = [];
  for (let i = 0; i < config.lives; i++) {
    const life = playLife(state, policy, rng, config, clock);
    life.totalWick = state.totalWick;
    life.totalMinutes = clock.now / 60000;
    life.heavenMax = state.heavenMax;
    const progress = game.knownProgress(state);
    life.known = 100 * progress.known / progress.total;
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
const reached = (life, goal) => (goal === LAST_REALM + 1 ? life.full : life.realm >= goal);

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
    GOALS.forEach((name, i) => { reach[name] = share(lives, (life) => reached(life, i + 1)); });
    const causes = {};
    CAUSES.forEach((cause) => { causes[cause] = share(lives, (life) => life.cause === cause); });
    out.lives[n] = {
      reach: reach,
      causes: causes,
      heaven: round(mean(lives, (life) => life.heaven), 2),
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
      heavenMax: round(mean(lives, (life) => life.heavenMax), 2),
      known: round(mean(lives, (life) => life.known)),
      lampsMaxed: share(lives, (life) => life.lampsMaxed)
    };
  });
  GOALS.forEach((name, i) => {
    const first = saves.map((save) => save.findIndex((life) => reached(life, i + 1)));
    const done = first.filter((n) => n >= 0);
    const minutes = saves.map((save, k) => (first[k] < 0 ? -1 : save[first[k]].totalMinutes)).filter((n) => n >= 0);
    out.firstReach[name] = {
      share: round(100 * done.length / saves.length),
      medianLife: done.length ? median(done) + 1 : null,
      medianMinutes: minutes.length ? round(median(minutes)) : null
    };
  });
  const all = [].concat.apply([], saves);
  game.TRIBS.forEach((trib) => {
    const tries = [].concat.apply([], all.map((life) => life.tribs)).filter((item) => item.name === trib.name);
    out.tribs[trib.name] = { perLife: round(tries.length / all.length, 2), success: tries.length ? share(tries, (item) => item.success) : null,
      gear: tries.length ? median(tries.map((item) => item.gear)) : null, cleared: tries.length ? median(tries.map((item) => item.cleared)) : null };
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
    '> 这时运行 `node tools/balance/sim.js` 看全量差异（约一分钟）。',
    '> 确认变化符合预期后重新生成基线，并把本文件的差异一起提交。',
    '',
    '## 口径',
    '',
    '- 每种打法 ' + config.saves + ' 个存档，每个存档连续玩 ' + config.lives + ' 世，随机种子 ' + config.seed + ' 起逐档加一，结果可完全复现。',
    '- 时间：一世之内不用等，灵气和机缘只随耗掉的寿元涨。有机缘就翻，机缘用完就静坐（每次耗 1 年寿元）；每次选择或操作算 ' + config.choiceSeconds + ' 秒，“时长”就是操作次数乘这个数。',
    '- 灯芯：每世结束后从最便宜的灯纹买起，买到买不起为止。“灯纹全满”把随重天加深的等级也算在内。',
    '- 重天：每一世都去已解锁的最高一重。“圆满”指修到' + REALM_NAMES[LAST_REALM] + '圆满，在最高一重做到就解锁下一重。',
    '- 终点：' + REALM_NAMES[LAST_REALM] + '圆满后灯芯不会再涨，三种打法都直接坐化，“余寿”是身死时还没用掉的寿元。一世走满 ' + MAX_STEPS + ' 步仍未结束的记为“活不死”并强制坐化。',
    '- 见闻：三种打法都从零开始认选项。挂机玩和认真玩在寿元、心魔宽裕时会去试没选过的选项。',
    '- **随手玩**：选项在不会当场寿尽的里面随机挑，功法取舍和道途随机，灵气一满立刻硬抗天劫，枯海和元婴劫也随机选；根骨拿第一副，不重抽。',
    '- **挂机玩**：见过的选项全交给游戏自带的“自动机缘”估分；道途选手里功法最多的一系；成功率到 ' + Math.round(config.idleThreshold * 100) + '% 就硬抗天劫，劫期过了或寿元将尽也渡；枯海和元婴劫随机选，不合秘法、不修洞府、不重抽根骨。',
    '- **认真玩**：选项同样靠“自动机缘”估分，但会经营：道途按功法和劫相选；成功率到 ' + Math.round(config.tribThreshold * 100) + '% 才渡劫（能借势就借势），劫期过了降到 ' + Math.round(config.overdueThreshold * 100) + '%，属性够了就只选“闭关不理”等灵气，寿元只剩 ' + config.lastDitchYears + ' 年时不再等；逐道雷的天劫渡过后，余雷成功率到 ' + Math.round(config.extraThreshold * 100) + '% 且寿元宽裕才多引一道；会合秘法、修洞府、在枯海拿凭据、带前世功法；根骨重抽到出“绝”品以上或次数用完。',
    '- 逐道雷的天劫：三种打法都把必接的雷一口气接完；随手玩和挂机玩接完就收劫，不引余雷。',
    '- 历练：三种打法都照打（场景里的战斗本来就是自己打的），一场战斗占掉它自己的时长再加 ' + TRAIN_GAP + ' 秒间隔，败了多歇 ' + TRAIN_REST + ' 秒。挂机玩和认真玩每过一关把更好的装备换上、用不上的分解、锻材拿去强化，并收储物袋；随手玩不管装备，只有空槽位会自动穿上。',
    '- 没有覆盖：竞技场、宗门与弟子（含跨世传承）、机缘重抽与灯油、散功保命、主动降重天。',
    ''
  ];
  Object.keys(data.results).forEach((id) => {
    const result = data.results[id];
    const lives = Object.keys(result.lives);
    out.push('## ' + POLICY_NAMES[id], '');
    out.push('**每一世的结局**（到达 = 身死时所在的大境界不低于该境界）', '');
    out.push(table(['第几世', '所在重天'].concat(GOALS.map((name) => (name === '圆满' ? name : '到达' + name)), ['灯芯', '选择次数', '时长（分）', '享年', '余寿']),
      lives.map((n) => {
        const life = result.lives[n];
        return [n, life.heaven].concat(GOALS.map((name) => pct(life.reach[name])), [life.wick, life.choices, life.minutes, life.age, life.left]);
      })), '');
    out.push('**死法与构筑**', '');
    out.push(table(['第几世'].concat(CAUSES.map((cause) => CAUSE_NAMES[cause]), ['堕魔', '功法数', '秘法数', '突发组数']),
      lives.map((n) => {
        const life = result.lives[n];
        return [n].concat(CAUSES.map((cause) => pct(life.causes[cause])), [pct(life.demon), life.skills, life.arcanes, life.suddens]);
      })), '');
    out.push('**跨世进度**', '');
    out.push(table(['到第几世结束', '累计灯芯', '累计时长（分）', '已解锁重天', '见闻', '灯纹全满'],
      lives.map((n) => {
        const life = result.lives[n];
        return [n, life.totalWick, life.totalMinutes, life.heavenMax, pct(life.known), pct(life.lampsMaxed)];
      })), '');
    out.push(table(['首次做到', config.lives + ' 世内做到的存档', '中位数世数', '那一世结束时的累计时长中位数（分）'],
      Object.keys(result.firstReach).map((name) => {
        const item = result.firstReach[name];
        return [name, pct(item.share), orDash(item.medianLife), orDash(item.medianMinutes)];
      })), '');
    out.push('“活不死”的局数：' + result.capped + '。', '');
    out.push('**天劫**', '');
    out.push(table(['天劫', '每世平均渡劫次数', '成功率', '渡劫时的装备分（中位数）', '渡劫时历练过了几关（中位数）'],
      Object.keys(result.tribs).map((name) => {
        const item = result.tribs[name];
        return [name, item.perLife, pct(item.success), orDash(item.gear), orDash(item.cleared)];
      })), '');
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
  if (args.indexOf('--print') >= 0) {
    console.log(render(data));
    return 0;
  }
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
