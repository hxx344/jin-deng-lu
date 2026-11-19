const { GRADES } = require('./content');
const world = require('./sect-world');

const { MATERIAL_MAX, RANKS, MAX_RANK, RULES, DISCIPLES, find, skillInfo, addMaterials } = world;
const PATROL_LENGTH = 2;
const COLD_ROUNDS = 3;
const COLD_GOAL = 5;
const AFTERMATH_LENGTH = 2;

const FACILITIES = [
  { id: 'array', name: '聚灵阵', effects: ['灵气产出 +12%', '灵气产出 +25%'] },
  { id: 'field', name: '灵田', effects: ['每累计两次普通机缘多得 1 灵材；定神丹少耗 3 次机缘', '每次普通机缘多得 1 灵材；定神丹少耗 6 次机缘'] },
  { id: 'library', name: '藏经室', effects: ['更常遇到已修流派的功法；弟子可学至天品', '进一步偏向已修流派；弟子可学秘法'] }
];

const PATROL_HAUL_MAX = 16;
const RANK_AFTER = ['', ' 匾后来换过一回大的。', ' 山下的人如今提起这里，都要先整一整衣襟。', ' 骸山这一带的地图上，现在印着这个名字。'];

const OUTCOMES = {
  pending: '你走时寒潮还没有到，弟子仍记得你嘱咐过的话。',
  both: '旧阵撑过了寒潮，山脚的住户也一个不少。如今他们还轮流给山门送柴。',
  ward: '山门守住了，山脚却空了许多间屋。弟子每年都去替那些人清扫门前的盐。',
  shelter: '山脚的人都活了下来。旧山门埋在盐里，他们用自己的木头搭起了一间新屋。',
  lost: '第一场寒潮冲毁了石阶。弟子带着留得住的东西迁到山背后，又挂起了旧匾。'
};

const QUEST_TASKS = [
  { id: 'ward', name: '修阵', schools: ['sword', 'talisman'] },
  { id: 'shelter', name: '护民', schools: ['pill', 'body'] }
];

function skillName(book) {
  const skill = skillInfo(book.id);
  return '《' + skill.name + '》' + (skill.arcane ? '秘法' : GRADES[book.level - 1] + '品');
}

function cleanName(name) {
  return typeof name === 'string' ? Array.from(name.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 12).join('') : '';
}

function emptyCave() {
  return { array: 0, field: 0, library: 0 };
}

function newDisciple(id) {
  return { id: id, level: 1, book: null };
}

function progressChoices(run, lines, rng) {
  const field = run.cave ? run.cave.field : 0;
  const extra = field === 2 || (field === 1 && run.mountainChoices % 2 === 0);
  const gained = addMaterials(run, 1 + Number(extra));
  if (gained) lines.push('灵材 +' + gained);
  const sect = run.sect;
  if (sect && sect.patrol && run.mountainChoices >= sect.patrol.due) {
    const patrol = sect.patrol;
    const haul = addMaterials(run, patrol.haul);
    const name = find(DISCIPLES, patrol.id).name;
    lines.push(name + '巡山归来' + (haul ? '，灵材 +' + haul : '，灵材已满'));
    sect.patrol = null;
  }
  if (sect && sect.quest.turn === COLD_ROUNDS && sect.quest.due === run.mountainChoices && !sect.quest.after) {
    lines.push('山门有新回报：寒潮退去');
  }
  if (sect) world.tick(run, lines, rng);
}

function archive(run, life) {
  const sect = run.sect;
  if (!sect) return null;
  const heir = find(sect.disciples, sect.heir);
  return {
    life: life,
    name: sect.name,
    rule: sect.rule,
    rank: sect.rank,
    outcome: sect.quest.outcome || 'pending',
    after: sect.quest.after,
    disciple: (heir || sect.disciples[0]).id,
    book: heir && heir.book ? Object.assign({}, heir.book) : null
  };
}

function questPower(sect, disciple, task) {
  const info = find(DISCIPLES, disciple.id);
  const skill = disciple.book && skillInfo(disciple.book.id);
  const suited = skill && task.schools.includes(skill.school);
  const trained = suited ? (skill.arcane ? 3 : (disciple.book.level >= 3 ? 2 : 1)) : 0;
  const ruleBonus = (sect.rule === 'guard' && task.id === 'ward') || (sect.rule === 'aid' && task.id === 'shelter');
  return disciple.level + Number(info.aptitude === task.id) + trained + Number(ruleBonus);
}

function patrolHaul(sect, disciple) {
  const skill = disciple.book && skillInfo(disciple.book.id);
  return 2 + disciple.level + Number(find(DISCIPLES, disciple.id).aptitude === 'patrol') +
    Number(sect.rule === 'salvage') + (world.owns(sect, 'ferry') ? 2 : 0) + (skill && skill.school === 'luck' ? (skill.arcane ? 2 : 1) : 0);
}

function actionStamp(run) {
  return run.realm + ':' + run.stage + ':' + run.mountainRevision;
}

function mountainView(state, page, selected, context) {
  const run = state.run;
  if (!context.ready) return null;
  const cave = run.cave;
  const sect = run.sect;
  const tabs = [{ id: 'cave', label: '洞府' }];
  if (context.yuan) tabs.push({ id: 'sect', label: '宗门' });
  if (sect) tabs.push({ id: 'world', label: '山外' });
  if (state.mountainLegacy) tabs.push({ id: 'return', label: '故地' });
  if (!find(tabs, page)) page = 'cave';
  const view = { page: page, tabs: tabs, title: '', text: '', stats: [], options: [], stamp: actionStamp(run) };
  const add = (id, label, desc, costs, data) => {
    const cost = costs || {};
    const qi = Math.round((cost.qi || 0) * context.cap);
    const material = cost.material || 0;
    const years = cost.years || 0;
    const stock = cost.stock || 0;
    const parts = [];
    if (stock) parts.push(stock + ' 库藏');
    if (qi) parts.push(context.format(qi) + ' 灵气');
    if (material) parts.push(material + ' 灵材');
    if (years) parts.push(years + ' 年寿元');
    const note = stock && sect.world.stock < stock ? '库藏不足' : run.materials < material ? '灵材不足' : (run.qi < qi ? '灵气不足' : (context.years <= years ? '寿元不足' : ''));
    view.options.push(Object.assign({
      id: id, label: label, desc: desc, cost: parts.join(' · '), qi: qi, material: material, years: years, stock: stock,
      note: note, disabled: !!note
    }, data));
  };
  view.stats.push({ label: '灵材', value: run.materials + ' / ' + MATERIAL_MAX },
    { label: '灵气', value: context.format(Math.floor(run.qi)) });

  if (page === 'return') {
    const old = state.mountainLegacy;
    const disciple = find(DISCIPLES, old.disciple);
    view.title = '重回' + old.name;
    view.text = OUTCOMES[old.outcome] + (old.after === 'open' ? ' 寒潮后开放的石室至今还亮着灯。' :
      (old.after === 'seal' ? ' 碑下那封没有送出的信还在。' : '')) + RANK_AFTER[old.rank - 1];
    const gift = 4 + (old.rank - 1) * 2;
    if (old.book) {
      const owned = find(run.skills, old.book.id);
      const learned = owned && owned.level >= old.book.level;
      const capNote = !owned && run.skills.length >= context.skillCap ? '功法栏已满，取回后需要取舍。' : '';
      add('inherit', '取回' + skillName(old.book), disciple.name + '留下的抄本。' + capNote, {},
        { book: old.book, disabled: !!learned, note: learned ? '已经习得同品或更高品功法' : '' });
    }
    const greeting = '你照旧喊了一声「把狗拴好」。' + disciple.name + '一愣，转身去拿钥匙。';
    add('visit', '认下故人', greeting + '灵材 +' + gift + '。', {}, { greeting: greeting, gift: gift });
    add('farewell', '以过客身份辞别', '坐在旧石阶上，把当年没说完的话说完。心魔 -8。');
    return view;
  }

  if (page === 'world') return world.fillView(run, view, add, context);

  if (page === 'cave') {
    view.title = cave ? '修整洞府' : '开辟洞府';
    view.text = '金丹后每完成一次普通机缘得 1 灵材。开府后可修建三种设施，各有两级。';
    if (!cave) {
      add('open', '修复石门', run.marks.includes('dog2') ? '黄狗先挤了进去，熟门熟路地找到了避雨的地方。' : '推开半塌的石门，清出一间可以住人的石室。',
        { qi: 0.15, material: 2, years: 2 });
      return view;
    }
    FACILITIES.forEach((facility) => {
      const level = cave[facility.id];
      view.stats.push({ label: facility.name, value: level ? '第 ' + level + ' 级' : '未建' });
      if (level < 2) add(facility.id, (level ? '扩建' : '修建') + facility.name, facility.effects[level],
        level ? { qi: 0.24, material: 5, years: 2 } : { qi: 0.15, material: 3, years: 1 });
    });
    if (!view.options.length) view.text = '三处设施均已扩建完成。';
    return view;
  }

  if (!sect) {
    view.title = '建立宗门';
    view.text = cave ? '给山门起名，定下门规。首位弟子随门规入门。立宗后门人与库藏会自行增减，山外的大事送到「山外」页等你决断。' : '先修好自己的洞府，才有地方安置弟子。';
    if (!cave) return view;
    view.canName = true;
    RULES.forEach((rule) => {
      const first = rule.id === 'aid' && run.marks.includes('manager') ? 'clerk' : rule.disciple;
      add(rule.id, rule.name + '立宗', rule.perk + '；' + rule.world + '；首徒 ' + find(DISCIPLES, first).name + '。',
        { qi: 0.2, material: 5, years: 3 }, { disciple: first, placeholder: rule.defaultName });
    });
    return view;
  }

  const rule = find(RULES, sect.rule);
  const quest = sect.quest;
  view.title = sect.name;
  view.text = rule.name + '门规：' + rule.perk + '。巡山在两次普通机缘后返山。' +
    (sect.rank < MAX_RANK ? '山门的品阶在「山外」页凭声望、领地和门人提升。' : '');
  const disciple = find(sect.disciples, selected);
  if (disciple) {
    view.selected = selected;
    view.title = find(DISCIPLES, selected).name;
    view.text = find(DISCIPLES, selected).desc + '。' + (disciple.book ? '已学' + skillName(disciple.book) + '。' : '尚未受传功法。');
    view.stats.push({ label: '修为', value: '第 ' + disciple.level + ' 级' });
    if (disciple.level < sect.rank + 1) add('train', '指点修行', '弟子修为 +1；巡山多得 1 灵材，处理寒潮时多得 1 进度。',
      { qi: 0.12, material: disciple.level + 1, years: 2 });
    if (!sect.patrol) add('patrol', '差遣巡山', '两次普通机缘后带回 ' + patrolHaul(sect, disciple) + ' 灵材。',
      { years: 1 }, { haul: patrolHaul(sect, disciple) });
    if (disciple.book) {
      if (sect.heir === selected) view.stats.push({ label: '已留传承', value: skillName(disciple.book) });
      else add('heir', '托付传承', '托弟子保管所学功法。轮回后可以回山取回原品阶。');
    }
    view.teaching = cave.library ? (cave.library === 2 ? '可传这世已习得的功法与秘法。' : '可传至天品，二级藏经室开放秘法。') : '可传至灵品，修建藏经室可提高上限。';
    run.skills.forEach((entry) => {
      const skill = skillInfo(entry.id);
      // 藏经阁功法不在这里的功法表里，不能传给弟子。
      if (!skill || (skill.arcane && cave.library < 2)) return;
      const book = { id: entry.id, level: cave.library ? entry.level : Math.min(2, entry.level) };
      if (disciple.book && disciple.book.id === book.id && disciple.book.level >= book.level) return;
      add('teach-' + entry.id, '传授' + skillName(book), '弟子研习此卷' + (disciple.book ? '，替换他手里的抄本' : '') + '。',
        { qi: 0.1, material: skill.arcane ? 5 : book.level, years: 2 }, { book: book });
    });
    return view;
  }

  view.stats.push({ label: '山门', value: '第 ' + sect.rank + ' 阶 · ' + RANKS[sect.rank - 1] }, { label: '弟子', value: sect.disciples.length + ' / ' + (sect.rank + 1) });
  if (sect.patrol) {
    view.stats.push({ label: '巡山中', value: find(DISCIPLES, sect.patrol.id).name + ' · 还差 ' + (sect.patrol.due - run.mountainChoices) + ' 次机缘' });
  }
  view.people = sect.disciples.map((member) => ({
    id: member.id, name: find(DISCIPLES, member.id).name,
    detail: '修为 ' + member.level + ' 级' + (member.book ? ' · ' + skillName(member.book) : '')
  }));
  if (quest.turn < COLD_ROUNDS) {
    view.story = {
      title: '寒潮封山', detail: '修阵 ' + quest.ward + ' / ' + COLD_GOAL + ' · 护民 ' + quest.shelter + ' / ' + COLD_GOAL,
      text: ['三回合内修阵达标可留住 4 灵材，护民达标可获 8 次机缘。阵纹怕盐，山下的人还在等消息。', '第二拨寒潮压下来，山下只剩一条路还能走。', '最后一拨寒潮要到了，该救的地方还救得及。'][quest.turn]
    };
    QUEST_TASKS.forEach((task) => {
      const desc = '本回' + task.name + ' +';
      add('master-' + task.id, '亲自' + task.name, desc + '1。', { years: 2 }, { task: task.id, power: 1, story: true });
      sect.disciples.forEach((member) => {
        if (quest.posted.includes(member.id) || (sect.patrol && sect.patrol.id === member.id)) return;
        const power = questPower(sect, member, task);
        add(task.id + '-' + member.id, '派' + find(DISCIPLES, member.id).name + task.name,
          desc + power + '。此弟子在本次寒潮中只可出勤一次。',
          { material: 1, years: 1 }, { task: task.id, power: power, disciple: member.id, story: true });
      });
    });
  } else if (!quest.after) {
    const left = quest.due - run.mountainChoices;
    view.story = { title: '寒潮退去', detail: '修阵 ' + quest.ward + ' / ' + COLD_GOAL + ' · 护民 ' + quest.shelter + ' / ' + COLD_GOAL,
      text: OUTCOMES[quest.outcome] + (left > 0 ? ' 再完成 ' + left + ' 次普通机缘，弟子就会回来报信。' : ' 弟子回来问，空出来的石室怎么处置？') };
    if (left <= 0) {
      add('open-hall', '把石室留给山下的人', '用灵材修缮石室，来世仍有人守灯。心魔 -8。', { material: 2, years: 1 }, { story: true });
      add('seal-hall', '封好石室，留下一封信', '弟子带回拆下的旧器。灵材 +3。', { years: 1 }, { story: true });
    }
  } else {
    view.story = { title: '寒潮事了', detail: '修阵 ' + quest.ward + ' / ' + COLD_GOAL + ' · 护民 ' + quest.shelter + ' / ' + COLD_GOAL,
      text: quest.after === 'open' ? '修好的石室入夜仍有人送柴来。' : '弟子把信藏在封门的石碑下面。' };
  }
  if (sect.disciples.length < sect.rank + 1) DISCIPLES.forEach((candidate) => {
    if (find(sect.disciples, candidate.id) || (candidate.mark && !run.marks.includes(candidate.mark))) return;
    if (candidate.site && !world.owns(sect, candidate.site)) return;
    add('recruit-' + candidate.id, '收徒 · ' + candidate.name, candidate.desc + '。',
      { qi: 0.12, material: 3, years: 2 }, { disciple: candidate.id });
  });
  return view;
}

function chooseMountain(state, page, selected, stamp, id, name, context, rng) {
  const run = state.run;
  if (stamp !== actionStamp(run)) return null;
  const view = mountainView(state, page, selected, context);
  if (!view || view.page !== page || (view.selected || '') !== selected) return null;
  const option = find(view.options, id);
  if (!option || option.disabled) return null;

  run.mountainRevision++;
  run.materials -= option.material;
  if (option.stock) run.sect.world.stock -= option.stock;
  run.qi -= option.qi;
  run.age += option.years;
  const lines = [];
  if (option.cost) lines.push('耗 ' + option.cost);
  const result = { title: view.title, label: option.label, lines: lines };
  if (page === 'return') {
    state.mountainLegacy = null;
    if (id === 'inherit') result.book = option.book;
    else if (id === 'visit') lines.push(option.greeting, '灵材 +' + addMaterials(run, option.gift));
    else result.demon = -8;
    return result;
  }
  if (page === 'cave') {
    if (id === 'open') {
      run.cave = emptyCave();
      lines.push('有了一处自己的洞府。');
    } else {
      run.cave[id]++;
      lines.push(option.desc);
    }
    return result;
  }
  if (!run.sect) {
    run.sect = {
      name: cleanName(name) || option.placeholder, rule: id, rank: 1,
      disciples: [newDisciple(option.disciple)], patrol: null, heir: '',
      quest: { turn: 0, ward: 0, shelter: 0, posted: [], due: 0, outcome: '', after: '' },
      world: world.createWorld()
    };
    lines.push(run.sect.name + '立下门规，' + find(DISCIPLES, option.disciple).name + '拜入门下。', '山外有事：盐滩村求庇护');
    return result;
  }
  if (page === 'world') {
    world.resolve(run, option, result, rng, context);
    return result;
  }

  const sect = run.sect;
  const quest = sect.quest;
  if (selected) {
    const disciple = find(sect.disciples, selected);
    if (id === 'train') {
      disciple.level++;
      lines.push('弟子修为升至 ' + disciple.level + ' 级。');
    } else if (id === 'patrol') {
      sect.patrol = { id: selected, due: run.mountainChoices + PATROL_LENGTH, haul: option.haul };
      lines.push(option.desc);
    } else if (id === 'heir') {
      sect.heir = selected;
      lines.push('留下' + skillName(disciple.book) + '，来世可以回山取回。');
    } else {
      disciple.book = option.book;
      lines.push('弟子习得' + skillName(disciple.book) + '。');
    }
  } else if (option.task) {
    quest[option.task] += option.power;
    quest.turn++;
    if (option.disciple) quest.posted.push(option.disciple);
    result.title = '寒潮封山';
    lines.push('修阵 ' + quest.ward + ' / ' + COLD_GOAL + '，护民 ' + quest.shelter + ' / ' + COLD_GOAL);
    if (quest.turn === COLD_ROUNDS) {
      const ward = quest.ward >= COLD_GOAL;
      const shelter = quest.shelter >= COLD_GOAL;
      quest.outcome = ward ? (shelter ? 'both' : 'ward') : (shelter ? 'shelter' : 'lost');
      quest.due = run.mountainChoices + AFTERMATH_LENGTH;
      lines.push(OUTCOMES[quest.outcome]);
      if (ward) lines.push('阵中的存料得以保全，灵材 +' + addMaterials(run, 4));
      if (shelter) result.chance = 8;
      lines.push('再完成两次普通机缘，弟子便会来报信。');
    }
  } else if (option.story) {
    result.title = '寒潮退去';
    if (id === 'open-hall') {
      quest.after = 'open';
      result.demon = -8;
      lines.push('你把石室留给山下的人。');
    } else {
      quest.after = 'seal';
      lines.push('你在碑下留了一封信。', '灵材 +' + addMaterials(run, 3));
    }
  } else {
    sect.disciples.push(newDisciple(option.disciple));
    lines.push(find(DISCIPLES, option.disciple).name + '拜入门下。');
  }
  return result;
}

function normalizeBook(raw, toCount) {
  const skill = raw && skillInfo(raw.id);
  return skill ? { id: skill.id, level: skill.arcane ? 1 : Math.max(1, toCount(raw.level, GRADES.length)) } : null;
}

function normalizeRunMountain(run, raw, yuan, toCount) {
  run.materials = toCount(raw.materials, MATERIAL_MAX);
  run.mountainChoices = toCount(raw.mountainChoices, run.choices);
  run.mountainRevision = toCount(raw.mountainRevision);
  if (!raw.cave || typeof raw.cave !== 'object' || Array.isArray(raw.cave)) return;
  run.cave = emptyCave();
  FACILITIES.forEach((item) => { run.cave[item.id] = toCount(raw.cave[item.id], 2); });
  const sect = raw.sect;
  const rule = yuan && sect && find(RULES, sect.rule);
  if (!rule || !Array.isArray(sect.disciples)) return;
  const rank = Math.max(1, toCount(sect.rank, MAX_RANK));
  const disciples = [];
  sect.disciples.forEach((member) => {
    const info = member && find(DISCIPLES, member.id);
    if (!info || find(disciples, info.id) || disciples.length >= rank + 1) return;
    disciples.push({ id: info.id, level: Math.max(1, toCount(member.level, rank + 1)), book: normalizeBook(member.book, toCount) });
  });
  if (!disciples.length) return;
  const rawQuest = sect.quest || {};
  const turn = toCount(rawQuest.turn, COLD_ROUNDS);
  const ward = toCount(rawQuest.ward, turn * 8);
  const shelter = toCount(rawQuest.shelter, turn * 8);
  const outcome = turn < COLD_ROUNDS ? '' : (ward >= COLD_GOAL ? (shelter >= COLD_GOAL ? 'both' : 'ward') : (shelter >= COLD_GOAL ? 'shelter' : 'lost'));
  const posted = Array.isArray(rawQuest.posted) ? Array.from(new Set(rawQuest.posted.filter((id) => !!find(disciples, id)))).slice(0, turn) : [];
  const quest = {
    turn: turn, ward: ward, shelter: shelter, posted: posted, outcome: outcome,
    due: outcome ? toCount(rawQuest.due, run.mountainChoices + AFTERMATH_LENGTH) : 0,
    after: outcome && ['open', 'seal'].includes(rawQuest.after) ? rawQuest.after : ''
  };
  const postedPatrol = sect.patrol && find(disciples, sect.patrol.id);
  const due = postedPatrol ? toCount(sect.patrol.due, run.mountainChoices + PATROL_LENGTH) : 0;
  const patrol = due > run.mountainChoices ? { id: postedPatrol.id, due: due, haul: Math.max(1, toCount(sect.patrol.haul, PATROL_HAUL_MAX)) } : null;
  const heir = find(disciples, sect.heir);
  run.sect = {
    name: cleanName(sect.name) || rule.defaultName, rule: rule.id, rank: rank, disciples: disciples, patrol: patrol,
    heir: heir && heir.book ? heir.id : '', quest: quest
  };
  world.normalizeWorld(sect.world, run.sect, toCount);
}

function normalizeArchive(raw, lives, toCount) {
  if (!raw || !find(DISCIPLES, raw.disciple)) return null;
  const life = toCount(raw.life);
  const rule = find(RULES, raw.rule);
  if (!life || life > lives || !rule) return null;
  return {
    life: life, name: cleanName(raw.name) || rule.defaultName, rule: rule.id, rank: Math.max(1, toCount(raw.rank, MAX_RANK)),
    outcome: Object.prototype.hasOwnProperty.call(OUTCOMES, raw.outcome) ? raw.outcome : 'pending',
    after: ['open', 'seal'].includes(raw.after) ? raw.after : '',
    disciple: raw.disciple, book: normalizeBook(raw.book, toCount)
  };
}

module.exports = { mountainView, chooseMountain, progressChoices, archive, normalizeRunMountain, normalizeArchive };
