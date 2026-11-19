// 立宗之后的山外世界：门人、库藏和小事随每次普通机缘自行变化，扩张、战役和升阶作为大事交给玩家决断。
const { SKILLS, ARCANES } = require('./content');

const MATERIAL_MAX = 99;
const RANKS = ['草庐', '山门', '宗门', '大宗'];
const MAX_RANK = RANKS.length;
const EVENT_GAP = 2;
const RAID_HEAT = 8;
const SEIZE_EVERY = 12;
const TRIBUTE_EVERY = 4;
const MARKET_EVERY = 4;
const LOG_MAX = 8;
const FOE_MIN = 4;
const FOE_MAX = 32;
const RENOWN_MAX = 99;
const MEMBERS_MAX = 200;
const MARKET_RENOWN = 8;
const RULE_MIGHT = 3;
const SMALL_EVENT_RATE = 0.6;

const RULES = [
  { id: 'guard', name: '守骨', defaultName: '守骨山门', disciple: 'li', perk: '弟子修阵多得 1 进度', world: '守山时宗门战力 +' + RULE_MIGHT },
  { id: 'aid', name: '济人', defaultName: '长明山门', disciple: 'ya', perk: '弟子护民多得 1 进度', world: '门人每次多来 1 人，庇护与布施多得 1 声望' },
  { id: 'salvage', name: '取骸', defaultName: '拾骨山门', disciple: 'suo', perk: '每趟巡山多得 1 灵材', world: '出击时宗门战力 +' + RULE_MIGHT }
];

const DISCIPLES = [
  { id: 'li', name: '阿砺', aptitude: 'ward', desc: '识得仙骨上的阵纹，擅长修阵' },
  { id: 'ya', name: '芦芽', aptitude: 'shelter', desc: '在盐滩上采药长大，擅长护民' },
  { id: 'suo', name: '小索', aptitude: 'patrol', desc: '从小在骸山捡废器，擅长巡山' },
  { id: 'clerk', name: '丹盟二掌柜', aptitude: 'shelter', desc: '你昔日收下的徒弟，擅长护民', mark: 'manager' },
  { id: 'gou', name: '石苟', aptitude: 'battle', desc: '在肋骨矿道里长大的孤儿，擅长战阵', site: 'mine' },
  { id: 'qiao', name: '乔七', aptitude: 'patrol', desc: '断腕渡上撑船的拾荒人，擅长巡山', site: 'ferry' }
];

// start 是立宗时的归属：'' 无主，'guild' 丹盟，'foe' 食仙教。
const SITES = [
  { id: 'village', name: '盐滩村', perk: '门人每次多来 1 人', start: '' },
  { id: 'mine', name: '肋骨矿道', perk: '库藏每次 +1，宗门战力 +1；可收石苟为徒', stock: 1, might: 1, start: '' },
  { id: 'ferry', name: '断腕渡', perk: '巡山多带回 2 灵材；可收乔七为徒', rank: 2, start: '' },
  { id: 'market', name: '骨市', perk: '库藏每次 +1，每 ' + MARKET_EVERY + ' 次声望 +1', stock: 1, rank: 2, start: 'guild' },
  { id: 'pass', name: '脊梁关', perk: '宗门战力 +4', might: 4, rank: 2, guard: 5, start: 'foe' },
  { id: 'altar', name: '啃骨坛', perk: '宗门战力 +2；拿下后食仙教分坛退出骸山', might: 2, rank: 3, guard: 10, start: 'foe' }
];
const OWNERS = { '': '无主', own: '本门', foe: '食仙教', guild: '丹盟' };
const SEIZE_ORDER = ['mine', 'ferry', 'village'];
const STRIKE_ORDER = ['village', 'mine', 'ferry', 'pass', 'altar'];

// 升到下一阶的条件，下标是当前品阶。
const ASCEND = [null,
  { renown: 6, sites: 1, members: 12 },
  { renown: 18, sites: 3, members: 30, wins: 1 },
  { renown: 36, sites: 5, members: 60, foeDown: true }
];

const CLAIMS = {
  village: {
    title: '盐滩村求庇护',
    text: '盐滩村的里正提着两条咸鱼上山，问山门收不收保护费。他说村里商量过了，交给谁都是交。',
    options: [
      { key: 'a', label: '派弟子驻村', cost: { stock: 3, years: 1 }, aid: true, fx: { site: ['village', 'own'], renown: 2, say: '里正把鱼挂在了山门的匾下面。' } },
      { key: 'b', label: '只收鱼，不管事', fx: { stock: 3, renown: -1, say: '鱼很咸。里正下山时回头看了三次。' } }
    ]
  },
  mine: {
    title: '无主的矿道',
    text: '一段仙人肋骨里掏出来的旧矿道塌了口，里头的拾荒人跑了个干净，只留下一盏还亮着的灯。',
    options: [
      { key: 'a', label: '清出矿道，立下界碑', cost: { stock: 4, years: 2 }, fx: { site: ['mine', 'own'], renown: 2, say: '界碑立好了，字是弟子刻的，歪得很有诚意。' } },
      { key: 'b', label: '让门人抢先闯进去', cost: { years: 1 }, theirs: 6, foeName: '矿道残阵',
        win: { site: ['mine', 'own'], renown: 2, say: '残阵只响了一声就哑了。' }, lose: { members: -2, say: '残阵把人原样送了出来，只是鞋没跟上。' } }
    ]
  },
  ferry: {
    title: '渡口要出手',
    text: '断腕渡的拾荒人头领想把渡口盘出去。开价不低，但他愿意打一场，谁赢谁定价。',
    options: [
      { key: 'a', label: '照价买下', cost: { stock: 6, years: 1 }, fx: { site: ['ferry', 'own'], renown: 1, say: '头领数了两遍灵材，把船桨留给了你。' } },
      { key: 'b', label: '打一场定价', cost: { years: 1 }, theirs: 10, foeName: '渡口的拾荒人',
        win: { site: ['ferry', 'own'], renown: 3, say: '头领输得很痛快，价钱定成了一顿酒。' }, lose: { renown: -1, say: '头领赢了以后把价钱又抬了三成，然后说不卖了。' } }
    ]
  },
  market: {
    title: '丹盟送来一张契',
    text: '丹盟分号的掌柜送来一张契：骨市的铺面分你三成，价钱按“老朋友”算。老朋友的价一向比较贵。',
    options: [
      { key: 'a', label: '按契入股', cost: { stock: 8, years: 1 }, fx: { site: ['market', 'own'], renown: 2, say: '掌柜当场改口叫你东家。' } },
      { key: 'b', label: '只做一笔买卖', cost: { stock: 3 }, fx: { renown: 1, chance: 2, say: '掌柜送了你一本过期的黄历当添头。' } }
    ]
  }
};

const find = (items, id) => items.find((item) => item.id === id);
const skillInfo = (id) => find(SKILLS, id) || find(ARCANES, id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const signed = (n) => (n > 0 ? '+' : '') + n;

function addMaterials(run, amount) {
  const gained = Math.min(amount, MATERIAL_MAX - run.materials);
  run.materials += gained;
  return gained;
}

function initialSites() {
  const sites = {};
  SITES.forEach((site) => { sites[site.id] = site.start; });
  return sites;
}

function createWorld() {
  return {
    turn: 0, renown: 0, wins: 0, members: 3, stock: 4, sites: initialSites(),
    foe: { power: 10, heat: 0 }, event: { id: 'claim', site: 'village', power: 0 }, next: 0, hold: 0, last: '', log: []
  };
}

const owns = (sect, id) => sect.world.sites[id] === 'own';
const owned = (world) => SITES.filter((site) => world.sites[site.id] === 'own');
const foeAlive = (world) => world.sites.altar !== 'own';
const memberCap = (sect) => sect.rank * 15 + owned(sect.world).length * 6;
const stockCap = (rank) => 20 + rank * 10;

function might(sect) {
  const world = sect.world;
  const people = sect.disciples.reduce((sum, member) => {
    const skill = member.book && skillInfo(member.book.id);
    const book = skill ? (skill.arcane ? 3 : (member.book.level >= 3 ? 2 : 1)) : 0;
    return sum + member.level * 2 + book + (find(DISCIPLES, member.id).aptitude === 'battle' ? 2 : 0);
  }, 0);
  return sect.rank * 2 + people + owned(world).reduce((sum, site) => sum + (site.might || 0), 0) + Math.floor(world.members / 10);
}

// 玩家亲自出阵时按自身战力折算。
const masterMight = (power) => clamp(Math.round(power / 100), 2, 16);
const odds = (ours, theirs) => clamp(0.5 + (ours - theirs) * 0.05, 0.1, 0.95);

function memberGrowth(sect) {
  const world = sect.world;
  if (!world.stock || world.members >= memberCap(sect)) return 0;
  const gain = 1 + Math.floor(world.renown / 10) + Number(sect.rule === 'aid') + Number(owns(sect, 'village'));
  return Math.min(gain, memberCap(sect) - world.members);
}

function stockIncome(sect) {
  const world = sect.world;
  return 1 + Math.floor(world.members / 12) + owned(world).reduce((sum, site) => sum + (site.stock || 0), 0) - (sect.rank - 1) * 2;
}

function ascendGoals(sect) {
  const need = ASCEND[sect.rank];
  if (!need) return null;
  const world = sect.world;
  const items = [
    { label: '声望 ' + world.renown + ' / ' + need.renown, done: world.renown >= need.renown },
    { label: '领地 ' + owned(world).length + ' / ' + need.sites, done: owned(world).length >= need.sites },
    { label: '门人 ' + world.members + ' / ' + need.members, done: world.members >= need.members }
  ];
  if (need.wins) items.push({ label: '打赢过一场战役', done: world.wins >= need.wins });
  if (need.foeDown) items.push({ label: '拿下啃骨坛', done: !foeAlive(world) });
  return { title: '升为「' + RANKS[sect.rank] + '」', items: items, ready: items.every((item) => item.done) };
}

function note(world, text) {
  world.log.push(text);
  world.log = world.log.slice(-LOG_MAX);
}

// 结算一组变化，返回写给玩家看的分项。result 只在玩家决断时传入，用来带出机缘和心魔。
function applyFx(run, fx, result) {
  const sect = run.sect;
  const world = sect.world;
  const parts = [];
  if (fx.site) {
    const site = find(SITES, fx.site[0]);
    world.sites[site.id] = fx.site[1];
    parts.push(fx.site[1] === 'own' ? '占下' + site.name : site.name + '落入食仙教手里');
    if (!foeAlive(world)) {
      SITES.forEach((item) => { if (world.sites[item.id] === 'foe') world.sites[item.id] = ''; });
      world.foe.heat = 0;
      parts.push('食仙教分坛退出骸山');
    }
  }
  if (fx.rank) {
    sect.rank += fx.rank;
    parts.push('升为「' + RANKS[sect.rank - 1] + '」，弟子名额与弟子修为上限各 +1');
  }
  const change = (key, label, max) => {
    if (!fx[key]) return;
    const next = clamp(world[key] + fx[key], 0, max);
    if (next !== world[key]) parts.push(label + ' ' + signed(next - world[key]));
    world[key] = next;
  };
  change('renown', '声望', RENOWN_MAX);
  change('members', '门人', fx.members > 0 ? Math.max(world.members, memberCap(sect)) : MEMBERS_MAX);
  change('stock', '库藏', stockCap(sect.rank));
  if (fx.wins) world.wins += fx.wins;
  if (fx.foePower) world.foe.power = clamp(world.foe.power + fx.foePower, FOE_MIN, FOE_MAX);
  if (fx.calm) world.foe.heat = 0;
  if (fx.heat) world.foe.heat += fx.heat;
  if (fx.hold) world.hold = world.turn + fx.hold;
  if (result && fx.chance) result.chance = fx.chance;
  if (result && fx.demon) result.demon = fx.demon;
  return parts;
}

function fxText(sect, fx) {
  const parts = [];
  if (fx.site) parts.push(fx.site[1] === 'own' ? '占下' + find(SITES, fx.site[0]).name : '失去' + find(SITES, fx.site[0]).name);
  if (fx.rank) parts.push('升为「' + RANKS[sect.rank] + '」');
  if (fx.renown) parts.push('声望 ' + signed(fx.renown));
  if (fx.members) parts.push('门人 ' + signed(fx.members));
  if (fx.stock) parts.push('库藏 ' + signed(fx.stock));
  if (fx.chance) parts.push('机缘 ' + signed(fx.chance));
  if (fx.demon) parts.push('心魔 ' + signed(fx.demon));
  if (fx.hold) parts.push('过 ' + fx.hold + ' 次机缘再议');
  return parts.join('，');
}

const SMALL_EVENTS = [
  { id: 'crowd', when: (sect, world) => world.members >= memberCap(sect) && world.members > 5, text: '屋子不够住，几名门人卷了铺盖下山。', fx: { members: -2 } },
  { id: 'hungry', when: (sect, world) => !world.stock && world.members > 3, text: '库里见底，有门人开始自带干粮，也有人干脆没回来。', fx: { members: -1 } },
  { id: 'steps', when: (sect, world) => world.stock >= 12, text: '库房宽裕，门人自己把石阶修到了山脚。', fx: { stock: -3, renown: 1 } },
  { id: 'salt', when: (sect) => owns(sect, 'village'), text: '盐滩村送来新晒的盐，说是今年的份子。', fx: { stock: 2 } },
  { id: 'bone', when: (sect) => owns(sect, 'mine'), text: '矿道里挖出一截带纹的指骨。', fx: { stock: 3 } },
  { id: 'ferry', when: (sect) => owns(sect, 'ferry'), text: '断腕渡的船夫捎来对岸的消息，顺手带了几个想拜师的人。', fx: { members: 2 } },
  { id: 'lecture', when: (sect) => sect.disciples.some((member) => member.level >= 3), text: '亲传弟子开坛讲了半日，听的人坐到了门外。', fx: { members: 2 } },
  { id: 'fame', when: (sect, world) => world.renown >= 10, text: '有人慕名上山，在门口站了三天。第四天门人给他搬了张凳子。', fx: { members: 1 } },
  { id: 'quarrel', when: (sect, world) => world.members >= 20, text: '两拨门人为晒衣绳吵了一架，被罚一起去挑水，库里多了几缸。', fx: { stock: 1 } },
  { id: 'spy', when: (sect, world) => foeAlive(world) && world.foe.heat >= 4 && world.members > 3, text: '食仙教的探子在山下转悠，有门人吓得告了长假。', fx: { members: -1 } },
  { id: 'dog', when: (sect, world, run) => run.marks.includes('dog2'), text: '黄狗在山门口撵走了一个偷灵材的，叼回来半袋。', fx: { stock: 1 } }
];

function pick(items, rng) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  return items.find((item) => (roll -= item.weight) < 0) || items[items.length - 1];
}

function strikeTarget(sect) {
  const world = sect.world;
  const id = STRIKE_ORDER.find((item) => world.sites[item] === 'foe' && find(SITES, item).start !== 'foe') ||
    STRIKE_ORDER.find((item) => world.sites[item] === 'foe' && sect.rank >= find(SITES, item).rank && (item !== 'altar' || owns(sect, 'pass')));
  return id ? find(SITES, id) : null;
}

function claimable(sect, site) {
  const world = sect.world;
  if (!CLAIMS[site.id] || sect.rank < (site.rank || 1)) return false;
  return site.id === 'market' ? world.sites.market === 'guild' && world.renown >= MARKET_RENOWN : world.sites[site.id] === '';
}

function nextEvent(sect, rng) {
  const world = sect.world;
  const goals = ascendGoals(sect);
  if (goals && goals.ready && world.turn >= world.hold) return { id: 'ascend', site: '', power: 0 };
  if (foeAlive(world) && world.foe.heat >= RAID_HEAT) {
    const targets = owned(world);
    return { id: 'raid', site: targets.length ? targets[Math.floor(rng() * targets.length)].id : '', power: Math.round(world.foe.power * 0.75) };
  }
  const pool = SITES.filter((site) => claimable(sect, site)).map((site) => ({ weight: 4, event: { id: 'claim', site: site.id, power: 0 } }));
  const target = foeAlive(world) && strikeTarget(sect);
  if (target) pool.push({ weight: 3, event: { id: 'strike', site: target.id, power: world.foe.power + (target.guard || 0) } });
  pool.push({ weight: 1, event: { id: 'duel', site: '', power: 4 + sect.rank * 4 + Math.floor(world.turn / 6) } },
    { weight: 1, event: { id: 'caravan', site: '', power: 0 } });
  return pick(pool, rng).event;
}

// 当前大事的标题、正文和选项。选项要么直接生效（fx），要么先打一场（theirs、win、lose）。
function eventInfo(sect, power) {
  const world = sect.world;
  const event = world.event;
  const site = find(SITES, event.site);
  const base = might(sect);
  const master = masterMight(power);
  const battle = (bonus, win, lose) => [
    { key: 'a', label: '弟子列阵', cost: { stock: event.id === 'raid' ? 3 : 4, years: 1 }, ours: base + bonus, theirs: event.power, win: win, lose: lose },
    { key: 'b', label: '亲自出阵', cost: { years: 3 }, ours: base + bonus + master, theirs: event.power, win: win, lose: lose, master: master }
  ];
  if (event.id === 'claim') {
    const claim = CLAIMS[site.id];
    const options = claim.options.map((option) => {
      if (option.fx && option.aid && sect.rule === 'aid') return Object.assign({}, option, { fx: Object.assign({}, option.fx, { renown: option.fx.renown + 1 }) });
      return option.theirs ? Object.assign({ ours: base }, option) : option;
    });
    return { title: claim.title, text: claim.text, options: options.concat({ key: 'c', label: '不去理会', fx: { say: '你没有接话，这件事就这么过去了。' } }) };
  }
  if (event.id === 'raid') {
    const place = site ? site.name : '山门';
    const guard = sect.rule === 'guard' ? RULE_MIGHT : 0;
    const lost = site ? { site: [site.id, 'foe'], renown: -2, members: -3, calm: true, say: place + '没有守住。' } :
      { stock: -5, renown: -2, members: -3, calm: true, say: '库房被翻了一遍，连咸菜缸都没放过。' };
    return {
      title: '食仙教来犯', foeName: '食仙教',
      text: '食仙教分坛的人摸到了' + place + '。他们来的时候还带着锅。',
      options: battle(guard, { renown: 2, wins: 1, foePower: -1, calm: true, say: '食仙教的人退了，锅没带走。' }, lost).concat(site ?
        { key: 'c', label: '让出' + place, fx: { site: [site.id, 'foe'], renown: -1, calm: true, say: '你让人撤了回来。' } } :
        { key: 'c', label: '闭门送粮', fx: { stock: -4, renown: -1, calm: true, say: '粮送出去了，锅也被要走一口。' } })
    };
  }
  if (event.id === 'strike') {
    const drive = sect.rule === 'salvage' ? RULE_MIGHT : 0;
    return {
      title: '攻打' + site.name, foeName: '食仙教',
      text: '巡山的弟子回报：' + site.name + '的守卫正在换防，有半天空档。' + (site.id === 'altar' ? '拿下这里，食仙教在骸山就没有落脚的地方了。' : ''),
      options: battle(drive, { site: [site.id, 'own'], renown: site.id === 'altar' ? 6 : 3, wins: 1, foePower: -2, say: site.name + '换了旗。' },
        { renown: -1, members: -2, heat: 3, say: '空档比说好的短了一半。' }).concat({ key: 'c', label: '按兵不动', fx: { say: '你让弟子把这条消息记在了账上。' } })
    };
  }
  if (event.id === 'duel') {
    return {
      title: '散修登门讨教', foeName: '登门的散修',
      text: '一名散修在山门外摆了擂台，说要讨教贵宗的高招。围观的人自带了板凳。',
      options: [
        { key: 'a', label: '派弟子应战', cost: { years: 1 }, ours: base, theirs: event.power,
          win: { renown: 2, members: 2, say: '散修输了以后问还收不收人。' }, lose: { renown: -1, say: '散修赢了，顺手把擂台卖给了围观的人。' } },
        { key: 'b', label: '请他喝茶', cost: { stock: 2 }, fx: { renown: 1, say: '他喝了三壶，逢人就说贵宗的茶不错。' } },
        { key: 'c', label: '闭门不见', fx: { say: '擂台在门外摆到天黑，自己收了。' } }
      ]
    };
  }
  if (event.id === 'caravan') {
    return {
      title: '丹盟骸车过境',
      text: '丹盟的骸车路过山门，车上挂着“童叟无欺”，童叟两个字是后补的。',
      options: [
        { key: 'a', label: '卖一批存货', cost: { stock: 4 }, fx: { chance: 3, say: '车上的伙计顺口讲了几条沿路的消息。' } },
        { key: 'b', label: '捐给沿途的粥棚', cost: { stock: 3 }, fx: { renown: sect.rule === 'aid' ? 3 : 2, demon: -3, say: '粥棚的幌子上添了山门的名字。' } },
        { key: 'c', label: '目送车队', fx: { say: '车队走远了，路上落了一地丹渣。' } }
      ]
    };
  }
  return {
    title: '各方来贺',
    text: sect.name + '的名字传到了骸山另一头。按规矩，该换一块大点的匾了。',
    options: [
      { key: 'a', label: '立碑升阶', cost: { qi: 0.25, stock: 6 + sect.rank * 4, years: 3 }, fx: { rank: 1, demon: -5, say: '新匾挂上去的时候，旧匾被弟子收进了柴房，没舍得劈。' } },
      { key: 'b', label: '暂缓', fx: { hold: 4, say: '你说再等等。来贺的人把礼又拎了回去。' } }
    ]
  };
}

const eventTag = (event) => 'w-' + event.id + (event.site ? '-' + event.site : '') + '-';

function tick(run, lines, rng) {
  const sect = run.sect;
  const world = sect.world;
  world.turn++;
  const growth = memberGrowth(sect);
  world.stock = clamp(world.stock + stockIncome(sect), 0, stockCap(sect.rank));
  world.members += growth;
  if (owns(sect, 'market') && world.turn % MARKET_EVERY === 0) world.renown = Math.min(RENOWN_MAX, world.renown + 1);
  if (world.turn % TRIBUTE_EVERY === 0) {
    const sent = addMaterials(run, Math.min(world.stock, sect.rank + 1));
    world.stock -= sent;
    if (sent) lines.push('门中月例，灵材 +' + sent);
  }
  if (foeAlive(world)) {
    world.foe.heat++;
    world.foe.power = Math.min(FOE_MAX, world.foe.power + 1);
    const seized = world.turn % SEIZE_EVERY === 0 && SEIZE_ORDER.find((id) => world.sites[id] === '');
    if (seized) {
      world.sites[seized] = 'foe';
      const text = '食仙教占了' + find(SITES, seized).name + '。';
      note(world, text);
      lines.push('山外来报：' + text);
      if (world.event && world.event.site === seized) {
        world.event = null;
        world.next = world.turn + 1;
      }
    }
  }
  // 同一件小事不连着发生两次。
  const ready = rng() < SMALL_EVENT_RATE ? SMALL_EVENTS.filter((item) => item.id !== world.last && item.when(sect, world, run)) : [];
  const small = ready[Math.floor(rng() * ready.length)];
  world.last = small ? small.id : '';
  if (small) {
    const parts = applyFx(run, small.fx);
    note(world, small.text + (parts.length ? '（' + parts.join('，') + '）' : ''));
  }
  if (!world.event && world.turn >= world.next) {
    world.event = nextEvent(sect, rng);
    run.mountainRevision++;
    lines.push('山外有事：' + eventInfo(sect, 0).title);
  }
}

function fillView(run, view, add, context) {
  const sect = run.sect;
  const world = sect.world;
  const rule = find(RULES, sect.rule);
  const growth = memberGrowth(sect);
  view.title = sect.name + ' · ' + RANKS[sect.rank - 1];
  view.text = '门人、库藏和山外的小事随每次普通机缘自行变化，扩张、战役和升阶等大事等你决断。眼下每次机缘：门人 ' + signed(growth) +
    '，库藏 ' + signed(stockIncome(sect)) + '。' + rule.name + '门规：' + rule.world + '。';
  view.stats = [
    { label: '声望', value: String(world.renown) },
    { label: '门人', value: world.members + ' / ' + memberCap(sect) },
    { label: '库藏', value: world.stock + ' / ' + stockCap(sect.rank) },
    { label: '宗门战力', value: String(might(sect)) },
    { label: '食仙教', value: foeAlive(world) ? '战力 ' + world.foe.power : '已退出骸山' },
    { label: '灵材', value: run.materials + ' / ' + MATERIAL_MAX }
  ];
  if (world.event) {
    const info = eventInfo(sect, context.power);
    view.story = { title: info.title, detail: '待决断', text: info.text };
    info.options.forEach((option) => {
      let desc = option.fx ? fxText(sect, option.fx) : '';
      if (option.theirs) {
        desc = '宗门战力 ' + option.ours + (option.master ? '（含你 +' + option.master + '）对' : ' 对') + (info.foeName || option.foeName) + ' ' + option.theirs +
          '，胜算 ' + Math.round(odds(option.ours, option.theirs) * 100) + '%。胜：' + fxText(sect, option.win) + '；败：' + fxText(sect, option.lose) + '。';
      }
      add(eventTag(world.event) + option.key, option.label, desc || '什么也不会发生。', option.cost, { story: true, key: option.key });
    });
  } else {
    view.story = { title: '山外暂且无事', detail: '', text: '再完成 ' + Math.max(1, world.next - world.turn) + ' 次普通机缘，会有新的消息送上山。' };
  }
  add('donate', '拨灵材入库', '库藏 +3。库藏用来应付山外的大事，也养着门人。', { material: 3 },
    world.stock >= stockCap(sect.rank) ? { disabled: true, note: '库房已满' } : null);
  view.goals = ascendGoals(sect);
  view.sites = SITES.map((site) => ({ id: site.id, name: site.name, owner: OWNERS[world.sites[site.id]], own: world.sites[site.id] === 'own', perk: site.perk }));
  view.chronicle = world.log.map((line, index) => ({ id: index, text: line })).reverse();
  return view;
}

function resolve(run, option, result, rng, context) {
  const sect = run.sect;
  const world = sect.world;
  const lines = result.lines;
  if (option.id === 'donate') {
    world.stock = Math.min(stockCap(sect.rank), world.stock + 3);
    lines.push('库藏 +3');
    return;
  }
  const info = eventInfo(sect, context.power);
  const chosen = info.options.find((item) => item.key === option.key);
  result.title = info.title;
  let fx = chosen.fx;
  let outcome = '';
  if (chosen.theirs) {
    const won = rng() < odds(chosen.ours, chosen.theirs);
    fx = won ? chosen.win : chosen.lose;
    outcome = won ? '胜' : '败';
    lines.push('宗门战力 ' + chosen.ours + ' 对 ' + chosen.theirs + '，' + outcome);
  }
  world.event = null;
  world.next = world.turn + EVENT_GAP;
  if (fx.say) lines.push(fx.say);
  const parts = applyFx(run, fx, result);
  parts.forEach((part) => lines.push(part));
  note(world, info.title + '：' + chosen.label + (outcome ? '，' + outcome : '') + '。' + (parts.length ? '（' + parts.join('，') + '）' : ''));
}

function normalizeEvent(raw, sect) {
  if (!raw || typeof raw !== 'object') return null;
  const world = sect.world;
  const site = find(SITES, raw.site);
  const power = Math.floor(Number(raw.power));
  const event = { id: raw.id, site: site ? site.id : '', power: Number.isFinite(power) ? clamp(power, 0, 99) : 0 };
  if (event.id === 'claim') return site && claimable(sect, site) ? Object.assign(event, { power: 0 }) : null;
  if (event.id === 'strike') return site && world.sites[site.id] === 'foe' && foeAlive(world) ? event : null;
  if (event.id === 'raid') return foeAlive(world) && (!site || world.sites[site.id] === 'own') ? event : null;
  if (event.id === 'duel') return Object.assign(event, { site: '' });
  if (event.id === 'caravan') return { id: 'caravan', site: '', power: 0 };
  if (event.id === 'ascend') return ASCEND[sect.rank] ? { id: 'ascend', site: '', power: 0 } : null;
  return null;
}

// sect 的其余字段已经校验过；旧档没有山外数据时从头开始。
function normalizeWorld(raw, sect, toCount) {
  const world = createWorld();
  sect.world = world;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const rawSites = raw.sites && typeof raw.sites === 'object' ? raw.sites : {};
  SITES.forEach((site) => {
    const owner = rawSites[site.id];
    if (owner === '' || owner === 'own' || owner === 'foe' || (owner === 'guild' && site.id === 'market')) world.sites[site.id] = owner;
  });
  if (!foeAlive(world)) SITES.forEach((site) => { if (world.sites[site.id] === 'foe') world.sites[site.id] = ''; });
  const foe = raw.foe || {};
  world.turn = toCount(raw.turn, 9999);
  world.renown = toCount(raw.renown, RENOWN_MAX);
  world.wins = toCount(raw.wins, 999);
  world.members = toCount(raw.members, MEMBERS_MAX);
  world.stock = toCount(raw.stock, stockCap(sect.rank));
  world.foe = { power: Math.max(FOE_MIN, toCount(foe.power, FOE_MAX)), heat: foeAlive(world) ? toCount(foe.heat, 99) : 0 };
  world.next = toCount(raw.next, world.turn + EVENT_GAP);
  world.hold = toCount(raw.hold, world.turn + 9);
  world.last = find(SMALL_EVENTS, raw.last) ? raw.last : '';
  world.log = Array.isArray(raw.log) ? raw.log.filter((line) => typeof line === 'string' && line).map((line) => Array.from(line).slice(0, 120).join('')).slice(-LOG_MAX) : [];
  world.event = normalizeEvent(raw.event, sect);
}

module.exports = {
  MATERIAL_MAX, RANKS, MAX_RANK, RULES, DISCIPLES, find, skillInfo, addMaterials,
  createWorld, owns, owned, might, tick, fillView, resolve, normalizeWorld
};
