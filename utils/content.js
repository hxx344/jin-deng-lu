// 《烬灯录》的内容数据：流派、功法、灵根、境界、天劫、灯纹和事件。只有数据，没有规则。

const SCHOOL_IDS = ['sword', 'pill', 'talisman', 'body', 'luck'];

const SCHOOLS = {
  sword: { name: '剑', color: 'linear-gradient(135deg, #8fc7ff, #3d6fd6)', set2: '渡劫成功率 +10%', set4: '大境界突破后，下一个机缘必为传承' },
  pill: { name: '丹', color: 'linear-gradient(135deg, #7fe0a8, #1f8f66)', set2: '灵气产出 +30%', set4: '每次大境界突破额外 +15 年寿元' },
  talisman: { name: '符', color: 'linear-gradient(135deg, #c9a8ff, #6a44c9)', set2: '每个机缘可重抽 1 次', set4: '传承机缘多一个选项' },
  body: { name: '体', color: 'linear-gradient(135deg, #ffb07a, #c9532f)', set2: '寿元上限 +20%', set4: '渡劫失败不会身死，损失的寿元减半' },
  luck: { name: '运', color: 'linear-gradient(135deg, #ffe07a, #d99a1a)', set2: '概率型选项成功率 +10%', set4: '机缘上限 +36，积攒速度 +25%' }
};

// 开卷时看到的招式描述与 battle.js 的五系打法对应。首卷和合参都取自普通功法库。
const LAMP_SCROLLS = {
  sword: { first: 'sw1', pair: 'sw4', move: '每出手三次，追斩一剑', pairMove: '追剑必暴击' },
  pill: { first: 'pi1', pair: 'pi4', move: '受伤后，每八秒服丹回血', pairMove: '战斗中服丹的回血量提高一半' },
  talisman: { first: 'ta1', pair: 'ta5', move: '开场贴符，减速、破甲或封住敌招', pairMove: '符咒持续时间延长一半' },
  body: { first: 'bo1', pair: 'bo3', move: '挨打时，把一部分伤害震回去', pairMove: '开场获得相当于两成气血的护盾' },
  luck: { first: 'lu2', pair: 'lu4', move: '铜钱翻正，一击打出双倍伤害', pairMove: '' }
};

const GRADES = ['凡', '灵', '玄', '天'];

// edge/body/mind 是渡劫属性锋/躯/神，qi 是灵气产出加成，life 是寿元上限；其余字段是特殊效果，
// 名称和写法见 game.js 的 SKILL_STATS。所有数值都按品级成倍增加。
const SKILLS = [
  { id: 'sw1', school: 'sword', name: '截云剑', edge: 3, qi: 0.1 },
  { id: 'sw2', school: 'sword', name: '听雨剑', edge: 2, storeEdge: 1 },
  { id: 'sw3', school: 'sword', name: '断指式', edge: 2, demonEdge: 1 },
  { id: 'sw4', school: 'sword', name: '守骸剑经', edge: 2, body: 2 },
  { id: 'sw5', school: 'sword', name: '无鞘诀', edge: 2, stageEdge: 1 },
  { id: 'sw6', school: 'sword', name: '一线天', edge: 5 },
  { id: 'sw7', school: 'sword', name: '借刀诀', edge: 1, trib: 0.03 },
  { id: 'sw8', school: 'sword', name: '舍身剑', edge: 6, life: -6 },
  { id: 'pi1', school: 'pill', name: '养气丹方', qi: 0.25 },
  { id: 'pi2', school: 'pill', name: '百草经', qi: 0.1, tough: 1 },
  { id: 'pi3', school: 'pill', name: '回春丹方', life: 8, tribLife: 5 },
  { id: 'pi4', school: 'pill', name: '凝神丹方', qi: 0.15, mind: 2 },
  { id: 'pi5', school: 'pill', name: '炉火诀', skillQi: 0.03 },
  { id: 'pi6', school: 'pill', name: '赊账丹经', qi: 0.45, life: -5 },
  { id: 'pi7', school: 'pill', name: '辟谷丹方', tick: 0.02 },
  { id: 'pi8', school: 'pill', name: '安神汤', mind: 1, soothe: 1 },
  { id: 'ta1', school: 'talisman', name: '定字符', mind: 2, keepQi: 0.1 },
  { id: 'ta2', school: 'talisman', name: '捉字诀', mind: 1, yearsCut: 1 },
  { id: 'ta3', school: 'talisman', name: '镇心符', mind: 2, calm: 0.1 },
  { id: 'ta4', school: 'talisman', name: '借笔法', mind: 2, borrow: 0.15 },
  { id: 'ta5', school: 'talisman', name: '封口符', mind: 3, body: 1 },
  { id: 'ta6', school: 'talisman', name: '无字真言', mind: 5 },
  { id: 'ta7', school: 'talisman', name: '倒写符', mind: 1, seclude: 0.5 },
  { id: 'ta8', school: 'talisman', name: '替身符', mind: 1, tribYears: 0.15 },
  { id: 'bo1', school: 'body', name: '养骨诀', body: 2, life: 10 },
  { id: 'bo2', school: 'body', name: '食骸法', body: 3, demonBody: 1 },
  { id: 'bo3', school: 'body', name: '铜皮功', body: 3 },
  { id: 'bo4', school: 'body', name: '换血术', body: 5, life: -5 },
  { id: 'bo5', school: 'body', name: '吞岳功', body: 2, stageLife: 2 },
  { id: 'bo6', school: 'body', name: '不坏身', body: 5 },
  { id: 'bo7', school: 'body', name: '龟息功', body: 1, ageBody: 1 },
  { id: 'bo8', school: 'body', name: '以伤换伤', body: 2, scar: 1 },
  { id: 'lu1', school: 'luck', name: '拾荒经', edge: 1, body: 1, mind: 1, wick: 0.1 },
  { id: 'lu2', school: 'luck', name: '捡漏诀', edge: 1, body: 1, mind: 1, speed: 0.08 },
  { id: 'lu3', school: 'luck', name: '逢凶化吉', body: 1, mind: 1, flip: 0.15 },
  { id: 'lu4', school: 'luck', name: '天上掉饼', mind: 1, winQi: 0.1 },
  { id: 'lu5', school: 'luck', name: '左脚先迈', edge: 1, luckP: 0.03 },
  { id: 'lu6', school: 'luck', name: '傻人傻福', fool: 1 },
  { id: 'lu7', school: 'luck', name: '破罐破摔', edge: 1, body: 1, oldLuck: 0.08 },
  { id: 'lu8', school: 'luck', name: '多此一举', mind: 1, store: 12 }
];

// 投胎时在根骨之外抽一张命格。lifeFlat 是固定寿元增减，lifeRate 是总寿元上限比例，
// qi 是灵气产出比例，speed 是机缘积攒速度加成，wick 是身死灯芯加成。
const FATES = [
  { id: 'bright', name: '早慧', text: '懂事太早，老得也早。', desc: '神 +5，寿元上限 -10 年', mind: 5, lifeFlat: -10 },
  { id: 'dark', name: '灯下黑', text: '灯照得见别人，照不见自己。', desc: '灵气产出 -20%，机缘积攒速度 +50%', qi: -0.2, speed: 0.5 },
  { id: 'short', name: '薄命', text: '命纸很薄，灯火一烧就亮。', desc: '寿元上限 -30%，身死灯芯 +25%', lifeRate: -0.3, wick: 0.25 }
];

// 秘法不在传承和随机功法池里，只能由同系两门天品功法合成。
// 天品是凡品的 4 倍，所以秘法取两门基值之和的 4 × 1.2 倍。
// 年数、属性、心魔和次数取整，避免读档时再次取整造成漂移；比例保留两位小数。
const ARCANES = [];
const ARCANE_META = ['id', 'school', 'name'];
const ARCANE_INT_STATS = ['edge', 'body', 'mind', 'life', 'storeEdge', 'demonEdge', 'stageEdge', 'tough', 'tribLife', 'soothe', 'yearsCut', 'demonBody', 'stageLife', 'ageBody', 'scar', 'fool', 'store'];
for (let i = 0; i < SKILLS.length; i++) {
  for (let j = i + 1; j < SKILLS.length; j++) {
    const left = SKILLS[i];
    const right = SKILLS[j];
    if (left.school !== right.school) continue;
    const arcane = {
      id: 'arc_' + left.id + '_' + right.id,
      school: left.school,
      name: left.name.slice(0, 2) + right.name.slice(0, 2),
      arcane: true,
      sources: [left.id, right.id]
    };
    Array.from(new Set(Object.keys(left).concat(Object.keys(right)))).forEach((key) => {
      if (ARCANE_META.indexOf(key) >= 0) return;
      const total = ((left[key] || 0) + (right[key] || 0)) * 4.8;
      arcane[key] = ARCANE_INT_STATS.indexOf(key) >= 0 ? Math.round(total) : Math.round(total * 100) / 100;
    });
    ARCANES.push(arcane);
  }
}

// 藏经阁的功法：不在普通传承和随机功法池里，花灯芯请出后才会出现在传承里。
// 它们不加数值，而是各改一条规则：mech 是规则名（在 game.js 里各自生效），v 依次是仙、神、道品时的数值，
// text 里的 {v} 换成当前品级的数值，fmt 是数值写法（pct 百分比，mult 倍数，不写就是原数）。
const TOME_GRADES = ['仙', '神', '道'];
const TOMES = [
  { id: 'tm_sw1', school: 'sword', name: '斩灯剑意', mech: 'earlyTrib', v: [0.8, 0.65, 0.5], fmt: 'pct', text: '不必等灵气圆满：后期灵气到丹田容量的 {v} 就能渡劫' },
  { id: 'tm_sw2', school: 'sword', name: '骸山剑冢', mech: 'relicEdge', v: [1, 2, 3], text: '取舍时每换掉一门功法，锋永久 +{v} × 它的品级（凡 1 至天 4，秘法和藏经阁功法算 5）' },
  { id: 'tm_sw3', school: 'sword', name: '无名一剑', mech: 'reTrib', v: [0.6, 0.8, 1], fmt: 'pct', text: '渡劫失败时立刻再出一剑：按原成功率的 {v} 再判一次' },
  { id: 'tm_pi1', school: 'pill', name: '九转炉心', mech: 'freeSeclude', v: [1, 1.5, 2], fmt: 'mult', text: '“闭关不理”不再耗寿元，灵气收益 ×{v}' },
  { id: 'tm_pi2', school: 'pill', name: '长生药引', mech: 'revive', v: [5, 8, 12], text: '寿元耗尽时不死：散尽灵气，年岁退回到离寿尽还有 {v} 年，每世一次（魔修无效）' },
  { id: 'tm_pi3', school: 'pill', name: '太素丹经', mech: 'demonFuel', v: [0.05, 0.08, 0.12], fmt: 'pct', text: '心魔不再降低渡劫成功率，改为每 10 点心魔灵气产出 +{v}' },
  { id: 'tm_ta1', school: 'talisman', name: '天书残页', mech: 'echo', v: [0.3, 0.45, 0.6], fmt: 'pct', text: '在传承里学会一门功法后，有 {v} 机会把另一门没学过的也一并学会（功法位已满时不触发）' },
  { id: 'tm_ta2', school: 'talisman', name: '敕令真符', mech: 'ward', v: [2, 3, 4], text: '概率型选项没成时不承担后果，每世 {v} 次' },
  { id: 'tm_ta3', school: 'talisman', name: '一字镇魔', mech: 'sealDemon', v: [30, 20, 10], text: '心魔满 100 时不堕魔：心魔清零，折寿 {v} 年' },
  { id: 'tm_bo1', school: 'body', name: '骸骨金身', mech: 'bodyAll', v: [0.6, 0.8, 1], fmt: 'pct', text: '渡劫考核的每一项，都可以用躯的 {v} 顶替' },
  { id: 'tm_bo2', school: 'body', name: '饮海吞山', mech: 'yearCap', v: [3, 2, 1], text: '机缘里每次选择最多耗寿 {v} 年（选项结果里的折寿不算）' },
  { id: 'tm_bo3', school: 'body', name: '万劫不磨', mech: 'demonTrib', v: [0.6, 0.8, 1], fmt: 'pct', text: '魔修也能渡劫，成功率按 {v} 算；成功只升境界，不加寿元' },
  { id: 'tm_lu1', school: 'luck', name: '灯下拾遗', mech: 'wickLive', v: [1, 2, 3], text: '活着就能攒灯芯：每次小境界突破灯芯 +{v}，渡劫成功灯芯 +{v} × 5' },
  { id: 'tm_lu2', school: 'luck', name: '天官赐福', mech: 'twice', v: [0.25, 0.35, 0.5], fmt: 'pct', text: '概率型选项成了时，有 {v} 机会把成功的奖励再结算一次' },
  { id: 'tm_lu3', school: 'luck', name: '逆天改命', mech: 'sure', v: [3, 5, 8], text: '每世前 {v} 次概率型选项必成' }
].map((tome) => Object.assign({ tome: true }, tome));

// odds 依次是请出仙、神、道品的概率。
const TOME_TIERS = [
  { id: 'scrap', name: '翻残卷', cost: 60, odds: [0.9, 0.1, 0] },
  { id: 'copy', name: '请藏本', cost: 150, odds: [0.45, 0.45, 0.1] },
  { id: 'sole', name: '开孤本', cost: 400, odds: [0, 0.6, 0.4] }
];

const ROOTS = [
  { id: 'sword', school: 'sword', name: '剑骨', text: '生来骨头就硬，摔跤都是地先疼。', edge: 2 },
  { id: 'pill', school: 'pill', name: '药体', text: '从小拿灵草当零嘴，至今没吃出毛病。', qi: 0.15 },
  { id: 'talisman', school: 'talisman', name: '文心', text: '三岁识字，四岁开始挑别人的错字。', mind: 2 },
  { id: 'body', school: 'body', name: '石身', text: '接生婆说这孩子沉得不像话。', body: 2, life: 10 },
  { id: 'luck', school: 'luck', name: '歪运', text: '出门必踩东西，踩到的偶尔是灵石。', chance: 12 }
];

// 根骨稀有度，从低到高。weight 是投胎时每个候选位抽到这一档的权重。
const ROOT_RARITIES = [
  { name: '凡', weight: 50 },
  { name: '良', weight: 28 },
  { name: '珍', weight: 14 },
  { name: '绝', weight: 6 },
  { name: '仙', weight: 2 },
  { name: '神', weight: 0.5 }
];

// 2 到 5 种根骨长在一个人身上：加成是各根骨之和，稀有度依次为良、珍、绝、仙。
// 名字是各系的单字加 suffix，例如“剑丹双骨”；五种齐全的直接用 name。
const ROOT_COMBOS = {
  2: { suffix: '双骨', text: '两副根骨长在一个人身上，谁也不服谁。' },
  3: { suffix: '三骨', text: '接生婆数了三遍，确实比别人多两副。' },
  4: { suffix: '四骨', text: '算命的看了一眼，把卦摊收了，说这个算不起。' },
  5: { name: '五骨俱全', text: '五系根骨一样不缺。上一个这样的人，现在是骸山的一部分。' }
};

// 不靠拼凑的稀有根骨。rarity 是 ROOT_RARITIES 的下标，schools 是更容易遇到的功法系别。
const RARE_ROOTS = [
  { id: 'r_blade', rarity: 2, schools: ['sword'], name: '天生剑胎', text: '抓周时一把抓住了屠户的刀，屠户没敢要回去。', edge: 5 },
  { id: 'r_stomach', rarity: 2, schools: ['pill'], name: '百炼胃', text: '生吞过一炉废丹，从此吃什么都补。', qi: 0.35 },
  { id: 'r_tough', rarity: 3, schools: ['body'], name: '不漏之身', text: '摔下山崖三次，山崖塌了一次。', body: 5, life: 25 },
  { id: 'r_sage', rarity: 3, schools: ['talisman'], name: '生而知之', text: '出生第一声哭的是平仄。', mind: 6, qi: 0.1 },
  { id: 'r_stray', rarity: 4, schools: ['luck'], name: '天弃之人', text: '天道已死，没人管你，反倒自在。', edge: 2, body: 2, mind: 2, chance: 36 },
  { id: 'r_lamp', rarity: 4, schools: ['sword', 'pill', 'talisman', 'body', 'luck'], name: '烬灯同源', text: '灯认得你。你不记得灯。', edge: 3, body: 3, mind: 3, qi: 0.3, life: 20, chance: 12 },
  { id: 'r_relic', rarity: 5, schools: ['sword', 'body'], name: '仙骸转世', text: '你是骸山上掉下来的一小块，自己不知道。山知道。', edge: 5, body: 5, mind: 5, qi: 0.3, life: 40 },
  { id: 'r_orphan', rarity: 5, schools: ['sword', 'pill', 'talisman', 'body', 'luck'], name: '天道遗孤', text: '天道咽气前最后看了一眼的人。它什么也没来得及说。', edge: 4, body: 4, mind: 4, qi: 0.5, life: 30, chance: 36 }
];

const LAYERS = ['尘壤', '骸山', '枯海'];

// cap 和 rate 是丹田容量、灵气产出相对凡胎的倍率；layer 是所在墟层。
// attr 是该境界的属性基准：进这个境界的那场寻常天劫考的属性值。
// power 定义该境界的战力基数、单项属性软上限，以及竞技场估算用的典型构筑。
const REALMS = [
  { name: '凡胎', cap: 1, rate: 1, layer: 0, attr: 0,
    power: { base: 12, softCap: 24, opponentAttribute: 2, opponentMastery: 0, opponentBonds: 0 } },
  { name: '引气', cap: 5, rate: 2.5, layer: 0, attr: 16,
    power: { base: 30, softCap: 72, opponentAttribute: 13, opponentMastery: 10, opponentBonds: 4 } },
  { name: '筑基', cap: 25, rate: 6, layer: 1, attr: 48,
    power: { base: 65, softCap: 210, opponentAttribute: 29, opponentMastery: 22, opponentBonds: 6 } },
  { name: '金丹', cap: 150, rate: 15, layer: 1, attr: 140, fullWick: 120,
    power: { base: 130, softCap: 300, opponentAttribute: 77, opponentMastery: 42, opponentBonds: 10 } },
  { name: '元婴', cap: 1000, rate: 45, layer: 2, attr: 180, fullWick: 280,
    power: { base: 220, softCap: 450, opponentAttribute: 114, opponentMastery: 72, opponentBonds: 14 } }
];

const STAGES = [
  { name: '前期', cap: 1, power: 1 },
  { name: '中期', cap: 1.6, power: 1.2 },
  { name: '后期', cap: 2.5, power: 1.4 }
];

// 元婴之后的境界：化神、婴变、问鼎是第一步的后半段，阴虚到碎涅是第二步，空涅到空劫是第三步，踏天是第四步。
// 每行是 [境界名, 进这个境界的天劫名, 这个境界的属性基准, 天劫要的装备分, 破境加的寿元]。
// 属性基准既是寻常天劫考的属性值，也用来定战力的软上限和论道对手的属性。
// 这些境界都在枯海之外，没有自己的墟层：场景沿用枯海，机缘从三个墟层里一起抽（wide）。
const HIGH_REALMS = [
  ['化神', '化神劫', 230, 220, 300],
  ['婴变', '婴变劫', 280, 290, 360],
  ['问鼎', '问鼎劫', 330, 350, 420],
  ['阴虚', '阴虚劫', 390, 850, 500],
  ['阳实', '阳实劫', 450, 540, 580],
  ['窥涅', '窥涅劫', 520, 600, 660],
  ['净涅', '净涅劫', 590, 680, 760],
  ['碎涅', '碎涅劫', 670, 750, 860],
  ['空涅', '空涅劫', 750, 1500, 960],
  ['空灵', '空灵劫', 840, 960, 1080],
  ['空玄', '空玄劫', 930, 1050, 1200],
  ['空劫', '空劫', 1030, 1150, 1350],
  ['踏天', '踏天劫', 1140, 2050, 1500]
];
// 大关：跨“步”的三场天劫不看劫相，锋、躯、神三项全考，装备分的要求也比前后高出一截。
// 每项是 [考的属性值, 失败折的寿元]；其余天劫考属性基准，失败只折破境寿元的八分之一。
const WALLS = { 阴虚劫: [620, 400], 空涅劫: [1100, 1200], 踏天劫: [1500, 2400] };
const HIGH_WICK = 320;
const HIGH_WICK_GROWTH = 1.3;
HIGH_REALMS.forEach((row, i) => {
  const step = i + 1;
  const wick = HIGH_WICK * Math.pow(HIGH_WICK_GROWTH, i);
  REALMS.push({
    name: row[0], cap: 1000 * Math.pow(5, step), rate: 45 * Math.pow(4, step), layer: 2, attr: row[2], wide: true,
    wick: [Math.round(wick), Math.round(wick * 1.1), Math.round(wick * 1.2)], fullWick: Math.round(wick * 1.27),
    power: {
      // 战力基数每个境界 ×1.45，比后期相对前期的 1.4 倍略高，破境时战力不会往下掉。
      base: Math.round(220 * Math.pow(1.45, step)), softCap: Math.round(row[2] * 2.2 / 10) * 10,
      opponentAttribute: Math.round(row[2] * 0.65), opponentMastery: 72 + 6 * step, opponentBonds: 14
    }
  });
});

// 破境加成：每破一个大境界，总战力和历练里的攻击、气血都再乘一次 REALM_POWER_GROWTH。
const REALM_POWER_GROWTH = 1.3;
REALMS.forEach((realm, i) => {
  realm.power.mult = Math.pow(REALM_POWER_GROWTH, i);
});

// TRIBS[i] 是从第 i 个境界突破到下一个境界的天劫。
// 带 bolts 的天劫逐道雷渡：整场成功率 P 按权重拆给每道必接的雷（第 i 道是 P 的 bolts[i] 次方，权重合计为 1，全部硬接时合起来仍是 P）。
// gear 是这场天劫要的装备分：身上的装备分不到这个数，成功率按差的比例往下扣；超过了多加一点，加幅递减。引气劫不要求装备。
// extra 是破境前可以多引的余雷：成功率是 P 的 pow 次方、不超过 cap，接住后收劫时考的每项属性 +attr、寿元上限 +life、灯芯 +wick。
const TRIBS = [
  { name: '引气劫', tests: ['body', 'mind'], req: 16, life: 30, failYears: 15, bolts: [0.2, 0.3, 0.5],
    extra: [{ pow: 0.6, cap: 0.9, attr: 2, life: 5 }, { pow: 0.9, cap: 0.8, attr: 3, wick: 2 }] },
  { name: '筑基劫', tests: ['edge', 'body'], req: 48, life: 60, failYears: 25, gear: 20 },
  { name: '金丹劫', tests: ['edge', 'mind'], req: 140, life: 150, failYears: 50, gear: 90, gearCut: 0.4 },
  { name: '元婴劫', tests: ['edge', 'body', 'mind'], req: 180, life: 300, failYears: 24, gear: 170, gearCut: 0.5, seaTrial: true }
];

// 元婴之后的天劫不分关、不逐道雷，按劫相考属性；失败折的寿元跟着破境加的寿元走。
HIGH_REALMS.forEach((row) => {
  const wall = WALLS[row[1]];
  TRIBS.push({ name: row[1], tests: ['edge', 'body', 'mind'], req: wall ? wall[0] : row[2], life: row[4], failYears: wall ? wall[1] : Math.round(row[4] / 8), gear: row[3], gearCut: 1, wall: !!wall });
});

// 终劫：踏天后期灵气满了再渡，渡过才算踏天圆满；不破境，也不加寿元。
TRIBS.push({ name: '终劫', tests: ['edge', 'body', 'mind'], req: 1700, life: 0, failYears: 3000, gear: 2350, gearCut: 1, wall: true, final: true });

// 典型构筑的装备分看当前境界要渡的天劫，战力校准和论道对手共用这一口径。
REALMS.forEach((realm, i) => {
  realm.power.opponentGear = (TRIBS[i] && TRIBS[i].gear) || 0;
});

// 价格 = cost × 2^已有等级。need 是第一次走到哪个境界（REALMS 的下标）之后才开放，不写就是一开始就能点。
const AUTO_LAMP = { id: 'y5', branch: '缘', name: '自动机缘', desc: '永久解锁主界面的自动机缘开关', cost: 100, max: 1 };
const LAMPS = [
  { id: 'r1', branch: '根', name: '厚胎', desc: '初始寿元 +10 年，破境加的寿元 +3%', cost: 3, max: 3 },
  { id: 'r2', branch: '根', name: '择根', desc: '投胎时根骨四选一', cost: 8, max: 1 },
  { id: 'r3', branch: '根', name: '宿慧', desc: '开局自带一门与根骨同系的凡品功法', cost: 10, max: 1 },
  { id: 'r4', branch: '根', name: '聚气', desc: '灵气产出 +20%，与其他加成相乘', cost: 4, max: 5 },
  { id: 'r5', branch: '根', name: '铸胚', desc: '装备分 +3%', cost: 60, max: 5, need: 5 },
  { id: 'y1', branch: '缘', name: '多缘', desc: '机缘上限 +12', cost: 5, max: 3 },
  { id: 'y2', branch: '缘', name: '回眸', desc: '每世可免费重抽 1 次机缘', cost: 6, max: 2 },
  { id: 'y3', branch: '缘', name: '静修', desc: '“闭关不理”的灵气收益 +100%', cost: 4, max: 2 },
  { id: 'y4', branch: '缘', name: '捷径', desc: '机缘积攒速度 +15%', cost: 6, max: 3 },
  AUTO_LAMP,
  { id: 'm1', branch: '忆', name: '前世功法', desc: '身死后可挑一门功法，以凡品带入下一世', cost: 15, max: 1 },
  { id: 'm2', branch: '忆', name: '劫后余生', desc: '渡劫成功率 +3%', cost: 5, max: 5 },
  { id: 'm3', branch: '忆', name: '道心', desc: '每世开局锋、躯、神各 +1，另各加所在境界属性基准的 1%', cost: 4, max: 5 },
  { id: 'm4', branch: '忆', name: '清明', desc: '心魔增长 -10%', cost: 6, max: 3 },
  { id: 'm5', branch: '忆', name: '博闻', desc: '功法持有上限 +1', cost: 10, max: 4 },
  { id: 'm6', branch: '忆', name: '渡厄', desc: '大关和终劫失败折的寿元 -10%', cost: 80, max: 3, need: 5 },
  { id: 'm7', branch: '忆', name: '随葬', desc: '身死时身上装备分最高的一件带入下一世，强化归零', cost: 150, max: 3, need: 5 }
];

const KARMA = {
  kid: '一饭之恩',
  debt: '丹盟的欠条',
  word: '藏起来的字',
  feast: '食仙教的请帖',
  grudge: '举报之仇',
  pupil: '不成器的徒弟',
  chase: '砸坏的丹炉'
};

// 这一世的经历。选项用 fx.mark 记下、fx.unmark 了结；事件和选项用 need / not 按经历决定是否出现。
const MARKS = {
  sect: '守骸宗弟子',
  sect2: '守骸宗内门',
  thief: '兜里有块仙骨',
  taste: '尝过仙肉',
  cult: '食仙教徒',
  cult2: '食仙教护法',
  credit: '丹盟老主顾',
  deadbeat: '丹盟黑名单',
  manager: '徒弟是丹盟二掌柜',
  petword: '养着一个字',
  library: '一屋子字',
  academy: '书院欠你人情',
  dog: '摸过村口的狗',
  dog2: '身后跟着一条狗',
  // 守骸宗续篇
  sect3: '宗主跟前的红人',
  wanted: '守骸宗的通缉犯',
  fang: '见过宗主的新牙',
  proof: '宗主的把柄',
  // 食仙教续篇
  fake: '尝出了豆腐味',
  cultbook: '抄过后厨的账',
  mob: '碗底刻着账',
  revolt: '教众等你一句话',
  // 丹盟续篇
  rival: '赊不死丹铺的股东',
  hoard: '一缸压箱底的灵石',
  ious: '手里一叠欠条',
  lender: '丹盟的债主',
  // 字续篇
  draft: '字们在写一部书',
  manuscript: '一部没写完的书稿',
  seized: '书稿被书院收了',
  jailbreak: '字们越狱了',
  // 黄狗续篇
  dogbone: '狗叼回一根骨头',
  dogsky: '狗夜里望着骸山',
  leash: '一根仙人的狗链',
  // 旱龙舟（枯海）
  oar: '一支旱龙舟的桨',
  crew: '旱龙舟队的桨手',
  drill: '在盐上练过船',
  sawn: '被锯成两截的龙舟',
  drum: '鼓手有了新鼓',
  champion: '旱龙舟的魁首',
  // 守漏人（跨三层）
  clock: '替守漏人挑过水',
  clock2: '守漏人的挑夫',
  clock3: '守漏人的老伙计',
  clock4: '知道海是怎么干的',
  clock5: '补过守漏人的壶',
  // 话本
  tale: '在话本里听见自己',
  tale2: '话本里的大恶人',
  tale3: '话本出了续集',
  tale4: '活着出了殡',
  tale5: '答应讲最后一回'
};

const LEGACY_INTROS = [
  { layer: 0, title: '破庙里的册子', text: '你在破庙的供桌底下翻出几卷发霉的册子。' },
  { layer: 0, title: '说书先生的包袱', text: '说书先生收摊时落下一个包袱，里面装的不是话本。' },
  { layer: 0, title: '丹盟清仓', text: '百炼丹盟清仓，几卷残本摆在门口论斤卖。' },
  { layer: 1, title: '指骨下的石刻', text: '你在一根比城墙还粗的指骨下面躲雨，发现骨头上刻着字。' },
  { layer: 1, title: '无主石室', text: '骸山的肋骨间有一处无主石室，墙上的字还没被人拓走。' },
  { layer: 1, title: '前辈的玉简', text: '一位坐化的前辈手里攥着几枚玉简，攥得不太紧。' },
  { layer: 2, title: '盐里的玉简', text: '你掰开盐块，里面封着一卷玉简。卷尾还粘着龙舟的漆。' },
  { layer: 2, title: '浮出海床的木匣', text: '退潮后，一只漆匣卡在礁石间。盖上写着：开匣时离船远些。' }
];

// 大机缘：不给选项，随机落下一件。tone 为 good / wild / bad，分别是好事、说不准的事和坏事；
// weight 是抽到的权重。每件事的实际效果和能否出现由 game.js 里同名的条目决定。
const BIG_EVENTS = [
  { id: 'relic', tone: 'good', skill: true, weight: 12, title: '树上挂着的仙蜕', text: '一张仙人蜕下的旧皮挂在树杈上，怀里还揣着他没练完的东西。你替他练完了。' },
  { id: 'bond', tone: 'good', skill: true, weight: 10, title: '缺的那一页', text: '风把一页残卷拍在你脸上。你认得这笔迹：正是你手里那套功法缺的那一页。' },
  { id: 'wick', tone: 'good', weight: 8, title: '灯芯自己长了', text: '夜里灯芯自己长出一截。灯里那个人没有叹气，这还是头一回。' },
  { id: 'youth', tone: 'good', weight: 8, title: '漏刻倒流', text: '守漏人睡着了，水往上走了一整夜。你醒来一照镜子，白头发少了几根。' },
  { id: 'thunder', tone: 'good', weight: 8, title: '一道没主的雷', text: '雷泽漏下来一道没人管的天劫，劈歪了，正劈在你头上。你没死，它倒认了你，说下回替你挡一挡。' },
  { id: 'teller', tone: 'good', skill: true, weight: 7, title: '说书先生讲到了你', text: '茶馆里的说书先生正讲到你。按他的本子，下一回你该得一场传承，听客们都等着。' },
  { id: 'peer', tone: 'good', weight: 7, title: '拾荒人认了同行', text: '拾荒人看你捡东西的手法，认定你是同行，把哪条路上破烂多全告诉了你。' },
  { id: 'rotate', tone: 'wild', weight: 8, title: '装错了', text: '你睡得太沉，魂魄出去逛了一圈，回来时把锋、躯、神装错了位置。' },
  { id: 'fate', tone: 'wild', weight: 6, title: '拿错的命纸', text: '算命的收摊时，把你的命纸和隔壁摊主的弄混了。他说反正都是纸。' },
  { id: 'dream', tone: 'wild', weight: 6, title: '一梦十年', text: '你靠着灯打了个盹。醒来时山下的集市已经换了三拨人，丹田倒是满了。' },
  { id: 'forget', tone: 'bad', weight: 6, title: '爬进功法里的字', text: '一个“忘”字从无字城一路爬来，钻进了你的功法里。等你把它抖出来，已经少记了一截。' },
  { id: 'possess', tone: 'bad', weight: 5, title: '夺舍未遂', text: '有个老鬼想夺你的舍。他进来看了一眼你的丹田，骂骂咧咧地走了，走前还翻乱了你的心事。' },
  { id: 'scavenge', tone: 'bad', weight: 5, title: '被当成破烂', text: '你攒的机缘堆得太显眼，被拾荒人当破烂收走了一半。他留了张字条：谢了。' },
  { id: 'debt', tone: 'bad', weight: 4, title: '不是你的欠条', text: '丹盟的账房拿着一张欠条找上门。名字不是你的，手印是。' }
];
// 触发式突发的余波说明。实际触发条件、冷却和倒计时由 game.js 统一控制。
const SUDDENS = [
  { id: 'meridian', name: '经脉错乱', text: '事件灵气奖励 -30%' },
  { id: 'thunder', name: '天劫余波', text: '概率型选项成功率 -10%' },
  { id: 'backlash', name: '功法反噬', text: '全部秘法暂时失效' },
  { id: 'fortune', name: '福极生变', text: '机缘积攒间隔 ×1.5' },
  { id: 'debt', name: '旧债上门', text: '锋、躯、神 -10%' }
];

// 枯海剧情按所选航线结算。前一章可取得过盐骨关的凭据，后一章可留下渡问名关的线索。
const SEA_ROUTES = [
  {
    id: 'sect', name: '守骸宗', entry: '替守骸宗送还仙骨',
    text: '老执事拿来一截仙骨。他说到了龙舟上，死者自然会认领。',
    anchor: '归骨符', anchorAttr: 'edge', clue: '守骨人的旧名',
    scenes: [
      {
        title: '船头的空棺',
        text: '棺盖一开，手里的仙骨便跳了一下。你才发现棺底刻着和宗主剑鞘上一样的字。',
        options: [
          { id: 'return', label: '守着棺，把仙骨安回原处', years: 8, anchor: true },
          { id: 'leave', label: '把仙骨放上船头，留给下一次潮', years: 2 },
          { id: 'seal', label: '凭内门信物启棺', need: ['sect2'], years: 3, anchor: true }
        ]
      },
      {
        title: '棺底的名册',
        text: '名册上全是送骨人的名字。最后一行写的是：守不住故人，也得守住自己的名。',
        options: [
          { id: 'copy', label: '冒着返潮，抄下守骨人的旧名', years: 8, chance: 4, clue: true },
          { id: 'close', label: '封棺，随接引绳返岸', years: 2 },
          { id: 'remember', label: '以内门的守骨礼记住名字', need: ['sect2'], years: 4, clue: true }
        ]
      }
    ]
  },
  {
    id: 'cult', name: '食仙教', entry: '随食仙教去取龙骸',
    text: '教中人说船舱里锁着一截龙脊，吃过的人都能听见它在水下喘气。',
    anchor: '龙脊拓片', anchorAttr: 'body', clue: '龙骨铭文',
    scenes: [
      {
        title: '锁龙舱',
        text: '锁链一松，龙脊便动了一节。船壁上有一排牙印，都是上一批教众留下的。',
        options: [
          { id: 'touch', label: '贴着龙脊拓下骨纹', years: 4, demon: 12, anchor: true },
          { id: 'lock', label: '把锁链重新扣上', years: 2 },
          { id: 'order', label: '以护法身份让教众摁住龙脊', need: ['cult2'], years: 3, demon: 4, anchor: true }
        ]
      },
      {
        title: '牙印里的字',
        text: '你凑近看，才发现那排牙印是在写同一个名字。末笔一直拖进船底，像有人被拽走时还在写。',
        options: [
          { id: 'listen', label: '听龙骨念完这个名字', years: 5, demon: 15, clue: true },
          { id: 'quit', label: '松手，攀着锚链上岸', years: 2 },
          { id: 'chant', label: '以护法所学的祭词收住尾音', need: ['cult2'], years: 4, demon: 6, clue: true }
        ]
      }
    ]
  },
  {
    id: 'academy', name: '缄默书院', entry: '替缄默书院寻找船籍',
    text: '先生递给你一张空纸。她说那艘船沉的时候，船籍上的人名一齐跳了水。',
    anchor: '定潮字', clue: '补全的船籍',
    scenes: [
      {
        title: '甲板上逃走的字',
        text: '一个「锚」字蹲在甲板边，正把自己的偏旁一笔一笔往水里扔。',
        options: [
          { id: 'gather', label: '把散落的笔画一一捡齐', years: 5, chance: 5, anchor: true },
          { id: 'pass', label: '等它走远，从侧舷过去', years: 2 },
          { id: 'ask', label: '请养过的字去劝它回来', need: ['petword'], years: 2, anchor: true }
        ]
      },
      {
        title: '擦去一半的船籍',
        text: '船籍只剩半句：「本船载人三十七，归来三十六，余一名……」纸背有个手印，大小跟你的一样。',
        options: [
          { id: 'read', label: '对着潮声，一笔一笔补写尾页', years: 8, chance: 4, clue: true },
          { id: 'seal', label: '把残卷封存，带回书院', years: 2 },
          { id: 'rubbing', label: '用书院借给你的符纸拓出原文', need: ['academy'], years: 3, clue: true }
        ]
      }
    ]
  }
];

// 选项字段：years 耗费寿元；cost.qi 需要支付的灵气（丹田容量的比例）；fx 必定生效的效果；
// risk 是概率型结果，p 为成功率。
// 效果字段：qi（丹田容量的比例）、edge、body、mind、demon、life（寿元上限增减）、
// chance（机缘次数）、speed（这一世的机缘积攒速度加成）、skill（流派 id 或 any，获得一门功法）、slot（这一世的功法上限）、karma（种下的因果 id）、
// mark（记下一段经历）、unmark（了结经历，可以是数组）。
// 事件和选项都可以带 need（必须有这些经历）和 not（不能有这些经历）；
// 选项还可以带 school（这一系凑到 2 门才出现）。带条件的选项一律放在最后。
// type 为 fruit 的事件是因果的结果，fruit 字段是对应的因果 id，不参与随机抽取。
const EVENTS = [
  {
    id: 'a_feast', type: 'adventure', layers: [1], title: '食仙教的流水席',
    text: '一群人围着半截仙人小腿，热情地给你递了双筷子。',
    options: [
      { label: '吃', years: 2, fx: { body: 5, demon: 15, mark: 'taste' } },
      { label: '只喝汤', years: 2, fx: { body: 2, demon: 4 } },
      { label: '掀桌子', years: 1, risk: { p: 0.6, win: { skill: 'sword' }, lose: { life: -8 } } },
      { label: '记下人数，回宗门报信', need: ['sect'], years: 1, fx: { edge: 2, demon: -5 } },
      { label: '坐主桌', need: ['cult'], years: 1, fx: { body: 4, demon: 6 } }
    ]
  },
  {
    id: 'a_trial', type: 'adventure', layers: [0, 1, 2], title: '丹盟的试药告示',
    text: '百炼丹盟招人试药。告示最下面有一行小字：后果自负，但管饭。',
    options: [
      { label: '试新丹', years: 2, risk: { p: 0.65, win: { qi: 0.5 }, lose: { life: -6 } } },
      { label: '试老方子', years: 2, fx: { qi: 0.2 } },
      { label: '把告示揭了卖废纸', years: 1, fx: { qi: 0.08 } },
      { label: '指出丹方里的三处错', school: 'pill', years: 1, fx: { qi: 0.4, mind: 1 } }
    ]
  },
  {
    id: 'a_gamble', type: 'adventure', layers: [0], title: '桥头的赌摊',
    text: '一个拾荒人摆摊，让人猜他哪只手里有灵石。他只有一只手。',
    options: [
      { label: '猜那只手', years: 1, risk: { p: 0.5, win: { qi: 0.6 }, lose: { demon: 8 } } },
      { label: '猜在他嘴里', years: 1, risk: { p: 0.25, win: { skill: 'luck', qi: 0.3 }, lose: { life: -4 } } },
      { label: '看别人猜', years: 2, fx: { mind: 1 } },
      { label: '让狗去闻', need: ['dog2'], years: 1, fx: { qi: 0.5 } },
      { replaces: 0, label: '闭着眼随便指', school: 'luck', years: 1, fx: { qi: 0.6 } }
    ]
  },
  {
    id: 'a_cave', type: 'adventure', layers: [0, 1, 2], title: '塌了一半的洞府',
    text: '山腰露出半扇石门，门上写着“内有恶犬”，字迹很新。',
    options: [
      { label: '进去', years: 3, risk: { p: 0.55, win: { skill: 'any' }, lose: { life: -7 } } },
      { label: '在门口打坐蹭灵气', years: 3, fx: { qi: 0.3 } },
      { label: '喂狗', years: 2, risk: { p: 0.7, win: { edge: 1, body: 1, mind: 1 }, lose: { life: -3 } } },
      { replaces: 2, label: '让身后的黄狗进去跟它谈', need: ['dog2'], years: 2, fx: { skill: 'any', demon: -3 } },
      { replaces: 0, label: '一剑把门劈了', school: 'sword', years: 3, fx: { skill: 'any' } }
    ]
  },
  {
    id: 'a_auction', type: 'adventure', layers: [0, 1], not: ['deadbeat'], title: '拍卖会',
    text: '丹盟的拍卖会，压轴的是一只据说仙人用过的夜壶。',
    options: [
      { label: '拍下夜壶', years: 2, cost: { qi: 0.5 }, fx: { body: 3, mind: 2 } },
      { label: '拍一枚延寿丹', years: 2, cost: { qi: 0.3 }, fx: { life: 12 } },
      { label: '当托儿抬价', years: 2, fx: { qi: 0.25, demon: 5 } },
      { label: '记在账上，拍下压轴的丹方', need: ['credit'], years: 2, fx: { skill: 'pill', karma: 'debt' } },
      { label: '画一张以假乱真的灵票', school: 'talisman', years: 2, fx: { body: 3, mind: 2, demon: 6 } },
      { label: '让大掌柜替你举牌，记在他欠你的账上', need: ['lender'], years: 2, fx: { skill: 'pill', mind: 1 } }
    ]
  },
  {
    id: 'a_storm', type: 'adventure', layers: [0], title: '雷雨夜',
    text: '打雷了。村里的老人说，这种天气适合收衣服，不适合修行。',
    options: [
      { label: '站到山顶去', years: 1, risk: { p: 0.5, win: { edge: 3, body: 2 }, lose: { life: -8 } } },
      { label: '收衣服', years: 1, fx: { mind: 1 } },
      { label: '帮全村收衣服', years: 2, fx: { qi: 0.1, demon: -5 } },
      { replaces: 0, label: '站在山顶硬扛', school: 'body', years: 1, fx: { edge: 2, body: 3 } }
    ]
  },
  {
    id: 'a_nail', type: 'adventure', layers: [1], title: '仙人的指甲缝',
    text: '仙人的指甲缝里长着灵草，也住着别的东西。',
    options: [
      { label: '伸手去掏', years: 2, risk: { p: 0.6, win: { qi: 0.7 }, lose: { life: -10 } } },
      { label: '用剑去挑', years: 3, fx: { edge: 2, qi: 0.2, forge: 3 } },
      { label: '往里喊话', years: 1, risk: { p: 0.5, win: { skill: 'talisman' }, lose: { demon: 10 } } },
      { replaces: 0, label: '一剑削下整片指甲', school: 'sword', years: 2, fx: { edge: 3, qi: 0.4 } }
    ]
  },
  {
    id: 'a_voice', type: 'adventure', layers: [0, 1], title: '夜里的声音',
    text: '打坐时你听见一个声音：把隔壁闭关的师兄吃了，能涨三十年修为。',
    options: [
      { label: '听它的', years: 1, fx: { qi: 0.8, demon: 25 } },
      { label: '跟它讲道理', years: 3, risk: { p: 0.6, win: { mind: 3, demon: -5 }, lose: { demon: 8 } } },
      { label: '去敲师兄的门，把这事告诉他', years: 2, fx: { mind: 1, demon: -8 } },
      { label: '往脑门上贴一张镇字符', school: 'talisman', years: 1, fx: { mind: 2, demon: -10 } }
    ]
  },
  {
    id: 'a_weeding', type: 'adventure', layers: [1], not: ['sect', 'thief', 'wanted'], title: '守骸宗的入门试炼',
    text: '守骸宗招外门弟子。试炼内容是给一根仙人肋骨除草，为期三年。',
    options: [
      { label: '老实除草', years: 3, fx: { edge: 2, body: 2, mark: 'sect' } },
      { label: '偷学看守的剑法', years: 2, risk: { p: 0.55, win: { skill: 'sword' }, lose: { life: -6 } } },
      { label: '顺手掰一小块骨头', years: 2, fx: { qi: 0.5, demon: 12, mark: 'thief' } },
      { replaces: 0, label: '半天把整根肋骨的草连根拔光', school: 'body', years: 1, fx: { edge: 2, body: 2, mark: 'sect' } }
    ]
  },
  {
    id: 'a_fortune', type: 'adventure', layers: [0], title: '路边的算命先生',
    text: '“你印堂发黑。”“我没洗脸。”“那就更黑了。”',
    options: [
      { label: '花灵气改命', years: 1, cost: { qi: 0.3 }, fx: { chance: 2 } },
      { label: '让他算寿数', years: 1, risk: { p: 0.5, win: { life: 10 }, lose: { life: -5 } } },
      { label: '反过来给他算一卦', years: 2, fx: { mind: 2 } },
      { label: '让他照着你的手相改他的书', school: 'luck', years: 1, fx: { chance: 2, mind: 1 } },
      { label: '问他话本里的你下一回怎样', need: ['tale'], years: 1, fx: { chance: 1, mind: 1 } }
    ]
  },
  {
    id: 'a_boat', type: 'adventure', layers: [0, 1, 2], title: '渡口的黑船',
    text: '船夫说，上船不收钱，下船收。',
    options: [
      { label: '上船', years: 2, risk: { p: 0.6, win: { qi: 0.5, edge: 1 }, lose: { life: -6, demon: 5 } } },
      { label: '游过去', years: 3, fx: { body: 2 } },
      { label: '等一条白的', years: 2, fx: { qi: 0.1 } },
      { label: '替船夫划一程，抵船钱', years: 2, fx: { body: 2, mark: 'oar' } },
      { replaces: 1, label: '扛着船过河', school: 'body', years: 2, fx: { body: 3, qi: 0.2 } }
    ]
  },
  {
    id: 'a_market', type: 'adventure', layers: [1], title: '骸山鬼市',
    text: '鬼市卖什么的都有，就是没有卖后悔药的。有也是假的。',
    options: [
      { label: '买一卷残篇', years: 1, cost: { qi: 0.4 }, fx: { skill: 'any' } },
      { label: '买一瓶“后悔药”', years: 1, cost: { qi: 0.2 }, risk: { p: 0.4, win: { demon: -20 }, lose: { demon: 3 } } },
      { label: '卖血', years: 1, fx: { qi: 0.4, life: -5 } },
      { label: '把兜里的仙骨卖了', need: ['thief'], years: 1, fx: { qi: 0.8, demon: 6, unmark: 'thief' } },
      { label: '摆摊卖自己炼的丹', school: 'pill', years: 1, fx: { qi: 0.6 } }
    ]
  },
  {
    id: 'a_well', type: 'adventure', layers: [0], title: '山中古井',
    text: '井里有月亮。今天是初一。',
    options: [
      { label: '下去捞', years: 2, risk: { p: 0.5, win: { mind: 3, qi: 0.3 }, lose: { life: -6 } } },
      { label: '打一桶水喝', years: 1, fx: { qi: 0.15 } },
      { label: '扔一枚铜钱许愿', years: 1, risk: { p: 0.3, win: { chance: 2 }, lose: {} } },
      { label: '替守漏人打一桶井水', years: 1, fx: { mind: 1, mark: 'clock' } },
      { replaces: 2, label: '铜钱自己跳回了手里', school: 'luck', years: 1, fx: { chance: 2 } }
    ]
  },
  {
    id: 'a_debate', type: 'adventure', layers: [1], title: '论道大会',
    text: '各派修士围坐论道，论的是“吃仙骸算不算吃素”。',
    options: [
      { label: '上台讲', years: 2, risk: { p: 0.55, win: { mind: 4 }, lose: { demon: 6 } } },
      { label: '在台下记笔记', years: 3, fx: { mind: 2 } },
      { label: '趁机卖瓜子', years: 2, fx: { qi: 0.35 } },
      { label: '以过来人的身份讲讲口感', need: ['taste'], years: 2, fx: { mind: 3, demon: 6 } },
      { label: '把对面的论点写成符贴他脑门上', school: 'talisman', years: 2, fx: { mind: 4 } },
      { label: '拿话本里的自己当反面教材', need: ['tale2'], years: 2, fx: { mind: 4, demon: -3 } }
    ]
  },

  {
    id: 'a_chance_tide', type: 'adventure', layers: [0, 1], title: '机缘潮',
    text: '河里的倒影忽然都变成了没走过的路。艄公说，跳下去的人总能捞到点什么，就是未必回得来。',
    options: [
      { label: '沿浅水捞几条路', years: 1, fx: { chance: 3 } },
      { label: '钻进最亮的漩涡', years: 1, risk: { p: 0.55, win: { speed: 0.2, chance: 1 }, lose: { life: -4 } } },
      { label: '替后来的人指路', years: 2, fx: { chance: 1, speed: 0.05, mind: 1 } }
    ]
  },
  // 偏向负面的奇遇：收益更高，但要付出寿元、心魔或承担失败风险。
  {
    id: 'a_blood_rain', type: 'adventure', layers: [0, 1], title: '血雨',
    text: '天上掉下的雨是红的。有人接了满满一缸，说这东西大补，就是补的地方由不得你。',
    options: [
      { label: '冒雨赶路', years: 2, risk: { p: 0.5, win: { edge: 3, qi: 0.3 }, lose: { life: -7, demon: 5 } } },
      { label: '以血养灯', years: 1, fx: { qi: 0.45, demon: 9 } },
      { label: '找屋檐避雨', years: 2, fx: { life: -2, mind: 1 } }
    ]
  },
  {
    id: 'a_bone_debt', type: 'adventure', layers: [1], title: '白骨债主的收条',
    text: '一具白骨拿着收条找你，说你上辈子欠它一炉灵石。它连自己是谁都忘了，却没忘了利钱。',
    options: [
      { label: '割血还债', years: 1, fx: { qi: 0.65, life: -7 } },
      { label: '再赊一笔', years: 1, fx: { chance: 3, demon: 8 } },
      { label: '逃账', years: 1, risk: { p: 0.45, win: { chance: 2 }, lose: { life: -10, demon: 6 } } }
    ]
  },
  {
    id: 'a_graven_image', type: 'adventure', layers: [0], title: '没有脸的神像',
    text: '破庙里的神像没有脸。你每许一个愿，它就离你的脸近一点。',
    options: [
      { label: '上香许愿', years: 2, fx: { qi: 0.3, demon: 8 } },
      { label: '拆开神像看看', years: 1, risk: { p: 0.5, win: { skill: 'any' }, lose: { life: -6, demon: 6 } } },
      { label: '转身离开', years: 1, fx: { life: -1 } }
    ]
  },
  {
    id: 'a_mirror_price', type: 'adventure', layers: [0, 1], title: '镜中人的报价',
    text: '镜子里的人比你老得多。他说什么都能告诉你，唯独不白说。',
    options: [
      { label: '问自己还能活多久', years: 1, fx: { mind: 3, demon: 7 } },
      { label: '拿十年换一个答案', years: 1, fx: { mind: 6, life: -10 } },
      { label: '砸镜子', years: 1, risk: { p: 0.55, win: { demon: -10 }, lose: { demon: 10, life: -3 } } }
    ]
  },
  {
    id: 'a_dead_meridian', type: 'adventure', layers: [1], title: '枯死的经脉',
    text: '一条经脉忽然枯了。游方修士说还有救，只是救回来以后，未必还归你管。',
    options: [
      { label: '逆转灵力强冲', years: 2, fx: { qi: 0.75, life: -8 } },
      { label: '封住这条经脉', years: 2, fx: { body: 3, life: -3 } },
      { label: '任其溃烂', years: 1, fx: { demon: 6, qi: 0.15 } }
    ]
  },
  {
    id: 'a_thunder_echo', type: 'adventure', layers: [1], title: '天劫留下的回声',
    text: '雷早停了，云里却还有一道雷在重复落下。它劈不中别人，只认得你的影子。',
    options: [
      { label: '引余雷淬体', years: 1, risk: { p: 0.45, win: { body: 6 }, lose: { life: -11, demon: 5 } } },
      { label: '拿寿元挡雷', years: 1, fx: { life: -5 } },
      { label: '听雷到天亮', years: 2, fx: { mind: 3, demon: 6 } }
    ]
  },
  {
    id: 'i_water_clock', type: 'idle', layers: [0, 1, 2], title: '漏刻快了一息',
    text: '你发现水漏比昨日快了一息。守漏人说没坏，是你心里的事太多了。',
    options: [
      { label: '把漏壶再拨快些', years: 1, fx: { speed: 0.1, demon: 3 } },
      { label: '守着滴声等一等', years: 1, fx: { chance: 2 } },
      { label: '帮守漏人换一桶水', years: 1, fx: { mind: 1, demon: -2, mark: 'clock' } },
      { label: '画道符催动水流', school: 'talisman', years: 1, fx: { speed: 0.15, mind: 1 } }
    ]
  },

  {
    id: 'k_kid', type: 'karma', layers: [0, 1, 2], title: '山脚下的小孩',
    text: '一个小孩蹲在路边哭，说他把师父的飞剑弄丢了。',
    options: [
      { label: '帮他找', years: 5, fx: { karma: 'kid' } },
      { label: '教他一句口诀，让他自己找', years: 2, fx: { mind: 1 } },
      { label: '告诉他飞剑哪里有卖', years: 1, fx: { qi: 0.1 } }
    ]
  },
  {
    id: 'f_kid', type: 'fruit', fruit: 'kid', title: '故人',
    text: '当年丢剑的小孩已经长大，成了守骸宗的执事。他一眼就认出了你。',
    options: [
      { label: '收下他的剑谱', years: 1, fx: { skill: 'sword' } },
      { label: '让他指点渡劫', years: 2, fx: { edge: 3, mind: 2 } },
      { label: '只叙旧', years: 1, fx: { demon: -15, life: 5 } }
    ]
  },
  {
    id: 'k_debt', type: 'karma', layers: [0, 1, 2], not: ['deadbeat'], title: '先吃后付',
    text: '丹盟掌柜笑眯眯地说：道友，这颗丹可以先吃后付。',
    options: [
      { label: '先吃后付', years: 1, fx: { qi: 0.8, karma: 'debt' } },
      { label: '现付，买一颗延寿的', years: 1, cost: { qi: 0.3 }, fx: { life: 8 } },
      { label: '不买', years: 1, fx: { mind: 1 } },
      { label: '按老主顾的价，现付两颗延寿的', need: ['credit'], years: 1, cost: { qi: 0.4 }, fx: { life: 14 } }
    ]
  },
  {
    id: 'f_debt', type: 'fruit', fruit: 'debt', title: '丹盟收账',
    text: '收账的来了，利滚利，带着一把算盘和两个打手。',
    options: [
      { label: '还钱', years: 1, cost: { qi: 0.6 }, fx: { demon: -5, mark: 'credit' } },
      { label: '以工抵债', years: 6, fx: { qi: 0.1 } },
      { label: '赖账', years: 1, fx: { mark: 'deadbeat' }, risk: { p: 0.35, win: { demon: 5 }, lose: { life: -15, demon: 10 } } },
      { label: '让二掌柜徒弟把账抹了', need: ['manager'], years: 1, fx: { mind: 1 } },
      { label: '当场炼一炉丹抵债', school: 'pill', years: 2, fx: { demon: -5, mark: 'credit' } },
      { label: '掏出大掌柜的欠条，两清', need: ['lender'], years: 1, fx: { mind: 2, demon: -6 } }
    ]
  },
  {
    id: 'k_word', type: 'karma', layers: [0], title: '墙角的字',
    text: '一个“冤”字缩在墙角发抖，后面追着缄默书院的人。',
    options: [
      { label: '把它藏进袖子', years: 1, fx: { demon: 2, karma: 'word' } },
      { label: '交给书院领赏', years: 1, fx: { qi: 0.2, mark: 'academy' } },
      { label: '假装没看见', years: 1, fx: { mind: 1 } }
    ]
  },
  {
    id: 'f_word', type: 'fruit', fruit: 'word', title: '报恩的字',
    text: '那个“冤”字回来了，还带来一群字，在你门口排成了一篇功法。',
    options: [
      { label: '抄下来', years: 2, fx: { skill: 'talisman', mind: 2 } },
      { label: '只留一个字作伴', years: 1, fx: { chance: 2, mark: 'petword' } },
      { label: '全部交给书院', years: 1, fx: { qi: 0.6, mark: 'academy' } }
    ]
  },
  {
    id: 'k_invite', type: 'karma', layers: [1], not: ['cult'], title: '门缝里的请帖',
    text: '有人往你门缝里塞了一张请帖：下月初八，教主开席，务必赏光。',
    options: [
      { label: '应下', years: 1, fx: { karma: 'feast' } },
      { label: '回绝', years: 1, fx: { mind: 1 } },
      { label: '举报给守骸宗', years: 1, fx: { qi: 0.25, karma: 'grudge' } }
    ]
  },
  {
    id: 'f_feast', type: 'fruit', fruit: 'feast', title: '教主的席',
    text: '主菜是一截仙人指节，教主亲自给你夹了一块。',
    options: [
      { label: '吃', years: 2, fx: { body: 7, demon: 20, mark: 'cult' } },
      { label: '打包带走', years: 1, fx: { qi: 0.6, demon: 8 } },
      { label: '借口吃素离席', years: 1, risk: { p: 0.7, win: { mind: 3 }, lose: { life: -8 } } },
      { label: '摔杯为号，守骸宗的同门冲进来', need: ['sect'], years: 1, fx: { skill: 'sword', edge: 3, demon: -5 } }
    ]
  },
  {
    id: 'f_grudge', type: 'fruit', fruit: 'grudge', title: '食仙教的回礼',
    text: '你举报的那桌人放出来了，在你门口支了口锅。',
    options: [
      { label: '打', years: 1, risk: { p: 0.55, win: { edge: 4 }, lose: { life: -12 } } },
      { label: '跑', years: 4, fx: { body: 1 } },
      { label: '请他们吃顿素的赔罪', years: 2, cost: { qi: 0.4 }, fx: { demon: -5 } },
      { label: '放狗', need: ['dog2'], years: 1, fx: { edge: 2, demon: -3 } },
      { label: '一剑劈了那口锅', school: 'sword', years: 1, fx: { edge: 3 } }
    ]
  },
  {
    id: 'k_pupil', type: 'karma', layers: [0, 1, 2], title: '拜师',
    text: '一个少年跪在你门口要拜师。他说他什么都能干，就是不太会修仙。',
    options: [
      { label: '收下', years: 3, fx: { karma: 'pupil' } },
      { label: '陪他挑三年水再说', years: 3, fx: { body: 2 } },
      { label: '给他指条别的路', years: 1, fx: { qi: 0.1 } }
    ]
  },
  {
    id: 'f_pupil', type: 'fruit', fruit: 'pupil', title: '徒弟出息了',
    text: '你的徒弟确实不会修仙，但是很会做生意，现在是丹盟的二掌柜。',
    options: [
      { label: '收孝敬', years: 1, fx: { qi: 0.9, mark: 'manager' } },
      { label: '要一张丹方', years: 1, fx: { skill: 'pill', mark: 'manager' } },
      { label: '让他给你养老', years: 1, fx: { life: 15, mark: 'manager' } }
    ]
  },
  {
    id: 'k_stone', type: 'karma', layers: [0], title: '滚下山的石头',
    text: '你走路时踢到一块石头，石头滚下山，砸了一位散修的丹炉。',
    options: [
      { label: '下山赔钱', years: 1, cost: { qi: 0.3 }, fx: { demon: -3 } },
      { label: '跑', years: 1, fx: { karma: 'chase' } },
      { label: '说是风吹的', years: 1, risk: { p: 0.5, win: { mind: 1 }, lose: { life: -5 } } }
    ]
  },
  {
    id: 'f_chase', type: 'fruit', fruit: 'chase', title: '追上来的散修',
    text: '那位散修追了你很多年。他说丹炉不要了，就想要一句道歉。',
    options: [
      { label: '道歉', years: 1, fx: { demon: -10, mind: 2 } },
      { label: '赔他一只新丹炉', years: 1, cost: { qi: 0.3 }, fx: { skill: 'pill' } },
      { label: '再跑', years: 2, fx: { body: 2, demon: 6 } }
    ]
  },

  {
    id: 'i_word', type: 'idle', layers: [0, 1], not: ['petword'], title: '逃出来的字',
    text: '一个“贫”字不知从哪里爬出来，赖在你鞋上不走。',
    options: [
      { label: '抓去书院领赏', years: 1, fx: { qi: 0.12, mark: 'academy' } },
      { label: '把它那一撇掰了', years: 1, fx: { chance: 1, demon: 2 } },
      { label: '养着', years: 1, fx: { mind: 1, mark: 'petword' } }
    ]
  },
  {
    id: 'i_dog', type: 'idle', layers: [0], not: ['dog2'], title: '村口的狗',
    text: '村口的黄狗盯着你看了很久，叹了口气。',
    options: [
      { label: '摸摸它', years: 1, fx: { demon: -5, mark: 'dog' } },
      { label: '问它叹什么', years: 1, fx: { mind: 1 } },
      { label: '跟着叹气', years: 1, fx: { qi: 0.1 } }
    ]
  },
  {
    id: 'i_stone', type: 'idle', layers: [0, 1], title: '地上的灵石',
    text: '地上有一块灵石，旁边立着牌子：“谁捡谁是狗”。',
    options: [
      { label: '捡', years: 1, fx: { qi: 0.2, demon: 2 } },
      { label: '把牌子劈了再捡', years: 1, fx: { qi: 0.1, edge: 1, forge: 2 } },
      { label: '在旁边再立一块牌子', years: 1, fx: { mind: 1 } }
    ]
  },
  {
    id: 'i_rain', type: 'idle', layers: [0], title: '下雨天',
    text: '下雨了。你忽然想起修仙之前，自己最喜欢在下雨天睡觉。',
    options: [
      { label: '睡一觉', years: 1, fx: { demon: -6 } },
      { label: '淋着雨练功', years: 1, fx: { body: 1 } },
      { label: '接雨水泡茶', years: 1, fx: { qi: 0.12 } },
      { label: '替守漏人接一缸雨水', years: 1, fx: { demon: -2, mark: 'clock' } },
      { replaces: 0, label: '淋着雨睡', school: 'body', years: 1, fx: { body: 1, demon: -6 } }
    ]
  },
  {
    id: 'i_loan', type: 'idle', layers: [1], title: '师兄借钱',
    text: '师兄来借灵石，说下个月一定还。他上次也是这么说的，那是四十年前。',
    options: [
      { label: '借给他', years: 1, cost: { qi: 0.1 }, fx: { demon: -8 } },
      { label: '不借', years: 1, fx: { mind: 1 } },
      { label: '反过来向他借', years: 1, risk: { p: 0.5, win: { qi: 0.25 }, lose: {} } },
      { label: '说钱都拿去养狗了', need: ['dog2'], years: 1, fx: { mind: 1, demon: -4 } }
    ]
  },
  {
    id: 'i_wind', type: 'idle', layers: [1], title: '骸山的风',
    text: '风穿过仙人的肋骨，吹出了调子，有点像小时候听过的摇篮曲。',
    options: [
      { label: '听完', years: 1, fx: { mind: 1, demon: -3 } },
      { label: '跟着哼', years: 1, fx: { qi: 0.12 } },
      { label: '舞剑相和', years: 1, fx: { edge: 1 } },
      { replaces: 2, label: '以剑引风，把调子改了', school: 'sword', years: 1, fx: { edge: 2, mind: 1 } }
    ]
  },
  {
    id: 'i_mirror', type: 'idle', layers: [0, 1, 2], title: '照镜子',
    text: '你照了照镜子，发现修仙以后自己也没有变好看。',
    options: [
      { label: '接受现实', years: 1, fx: { mind: 1 } },
      { label: '炼一颗驻颜丹', years: 1, cost: { qi: 0.15 }, fx: { life: 3 } },
      { label: '把镜子砸了', years: 1, fx: { edge: 1, demon: 2 } },
      { replaces: 1, label: '随手搓一颗驻颜丹', school: 'pill', years: 1, fx: { life: 4 } },
      { label: '让镜子里的自己晚一刻老', need: ['clock2'], years: 1, fx: { life: 5 } }
    ]
  },
  {
    id: 'i_fair', type: 'idle', layers: [0], title: '集市',
    text: '集市上有人卖“祖传飞升秘籍”，三文钱一本，买二送一。',
    options: [
      { label: '买三本垫桌脚', years: 1, fx: { body: 1 } },
      { label: '跟他讲价', years: 1, fx: { mind: 1 } },
      { label: '当众揭穿他', years: 1, risk: { p: 0.5, win: { qi: 0.2 }, lose: { life: -1 } } },
      { label: '在说书摊前坐下听一回', years: 1, fx: { mind: 1, mark: 'tale' } },
      { label: '随手翻开一本，居然是真的', school: 'luck', years: 1, fx: { mind: 2 } }
    ]
  },

  // 中性闲事：不强迫玩家做危险交易，用小收益和简短插曲调剂连续的高风险选择。
  {
    id: 'i_cloud_watching', type: 'idle', layers: [0, 1], title: '云停在头顶',
    text: '你盯了很久，云没有变成灵兽，也没有落下功法，只是很像一只没睡醒的猫。',
    options: [
      { label: '再看一会儿', years: 1, fx: { demon: -3 } },
      { label: '记下云的形状', years: 1, fx: { mind: 1 } },
      { label: '趁机打个盹', years: 1, fx: { qi: 0.08 } }
    ]
  },
  {
    id: 'i_sweeping', type: 'idle', layers: [0, 1], title: '门前落叶',
    text: '昨天刚扫过，今天又落了一层。修行能解决很多事，解决不了叶子。',
    options: [
      { label: '扫干净', years: 1, fx: { body: 1 } },
      { label: '收去肥田', years: 1, fx: { qi: 0.08 } },
      { label: '连供桌也擦了', years: 1, fx: { demon: -2, mind: 1 } }
    ]
  },
  {
    id: 'i_cold_tea', type: 'idle', layers: [0, 1], title: '茶凉了',
    text: '茶是出门前泡的，回来已经凉透。茶叶浮着，像几艘没赶上渡口的船。',
    options: [
      { label: '照样喝', years: 1, fx: { demon: -2 } },
      { label: '重新煮一壶', years: 2, fx: { qi: 0.12 } },
      { label: '数一数茶叶', years: 1, fx: { mind: 1 } },
      { label: '把漏刻拨回一刻，茶又热了', need: ['clock2'], years: 1, fx: { mind: 1, demon: -4 } }
    ]
  },
  {
    id: 'i_straw_shoe', type: 'idle', layers: [0], title: '磨破的草鞋',
    text: '右脚的草鞋张了嘴。你低头看它，它替你叹了一口气。',
    options: [
      { label: '补一补再穿', years: 1, fx: { body: 1 } },
      { label: '卖给收旧货的', years: 1, fx: { qi: 0.1 } },
      { label: '留给更缺鞋的人', years: 1, fx: { demon: -3 } }
    ]
  },
  {
    id: 'i_paper_boat', type: 'idle', layers: [0, 1], title: '一只纸船',
    text: '你用废掉的符纸折了只船。它不漏灵气，只漏水。',
    options: [
      { label: '放进河里', years: 1, fx: { demon: -2 } },
      { label: '写上心愿再放', years: 1, fx: { chance: 1 } },
      { label: '改折成纸鹤', years: 1, fx: { mind: 1 } }
    ]
  },
  {
    id: 'i_roof_tiles', type: 'idle', layers: [0, 1], title: '屋顶的瓦',
    text: '雨刚停，你坐在屋顶数瓦。数到一半忘了数到哪，索性把这当成今天的功课。',
    options: [
      { label: '重新数一遍', years: 1, fx: { mind: 1 } },
      { label: '把松动的瓦按回去', years: 1, fx: { body: 1 } },
      { label: '数错就再数一遍', years: 2, fx: { mind: 2, demon: -1 } },
      { label: '趴在屋脊上听隔壁茶馆说书', years: 1, fx: { demon: -1, mark: 'tale' } }
    ]
  },

  // 奇缘：type 为 rare，出现得很少，给的是别处拿不到的东西（slot：这一世的功法上限）。
  // 这一世的额外功法位加满后不再出现。
  {
    id: 'r_shelf', type: 'rare', layers: [0, 1, 2], title: '空书架',
    text: '塌了的藏经阁里只剩一个空书架。书都被人搬走了，架子没人要，上面刻着两个字：还有。',
    options: [
      { label: '把书架背走', years: 4, fx: { slot: 1 } },
      { label: '照着刻字参悟', years: 2, risk: { p: 0.5, win: { slot: 1, mind: 2 }, lose: { demon: 8 } } },
      { label: '劈了当柴烧', years: 1, fx: { qi: 0.3 } }
    ]
  },
  {
    id: 'r_monk', type: 'rare', layers: [0, 1], title: '记性不好的老修士',
    text: '老修士说他学了一辈子功法，学一门忘一门。后来才想通，不是记性不好，是丹田里没打隔断。',
    options: [
      { label: '请他帮你打一道隔断', years: 2, cost: { qi: 0.5 }, fx: { slot: 1 } },
      { label: '听个大概，自己回去打', years: 1, risk: { p: 0.4, win: { slot: 1 }, lose: { life: -6, demon: 5 } } },
      { label: '陪他聊聊忘掉的那些', years: 2, fx: { mind: 2, demon: -5 } }
    ]
  },
  {
    id: 'r_pill', type: 'rare', layers: [0], title: '开窍丹',
    text: '丹盟新出了一味“开窍丹”，说是能在经脉里多开一条岔路。试药的人排到了街尾，出来的不多。',
    options: [
      { label: '买一颗验过的', years: 1, cost: { qi: 0.6 }, fx: { slot: 1 } },
      { label: '排队试药', years: 2, risk: { p: 0.5, win: { slot: 1 }, lose: { life: -10 } } },
      { label: '把排到的号卖了', years: 1, fx: { qi: 0.3 } },
      { label: '闻一闻，回去自己炼一炉', school: 'pill', years: 2, fx: { slot: 1 } }
    ]
  },
  {
    id: 'r_skull', type: 'rare', layers: [1], title: '仙人的颅骨缝',
    text: '仙人的颅骨裂了一道缝，里面空荡荡的，回声很好。都说仙人什么都记得住，原来是地方大。',
    options: [
      { label: '钻进去住几年，照着量一量', years: 5, fx: { slot: 1, demon: 6 } },
      { label: '凿一小块带走', years: 2, risk: { p: 0.45, win: { slot: 1 }, lose: { life: -8 } } },
      { label: '朝里面喊一嗓子', years: 1, fx: { mind: 2 } }
    ]
  },
  // 故事线：type 为 story，need 里的经历齐了才会出现，每世每章只出现一次。line 是故事线的名字。
  // 选项的 say 是选完后结果卡上的一段叙述；带 risk 的选项可以另写 sayWin / sayLose，按成败显示。
  // 每条线都有一章结局：结局章不再记下本线后续章节要用的经历。
  // —— 守骸宗：外门 → 内门 → 宗主跟前 → 被冤偷牙 → 找到把柄 → 宗主登门。偷骨被通缉的也会并进来。
  {
    id: 's_sect2', type: 'story', line: '守骸宗', layers: [1], need: ['sect'], not: ['sect2'], title: '外门的差事',
    text: '执事派你去巡山。巡的是仙人的左脚，一圈下来要三年。',
    options: [
      { label: '认真巡完', years: 3, fx: { edge: 2, body: 1, mark: 'sect2' }, say: '你把仙人左脚的每个脚趾都巡了三遍，数清了一共五个。执事很满意，说内门就缺你这种识数的。' },
      { label: '找个脚趾缝睡觉', years: 2, fx: { qi: 0.3 }, say: '脚趾缝里冬暖夏凉，就是偶尔有风。你睡得很好，醒来灵气涨了一截，名字却从巡山册上掉了。' },
      { label: '路过食仙教的摊子，没忍住', need: ['taste'], years: 1, fx: { body: 4, demon: 10 }, say: '摊主切了一片脚背肉给你，说是就地取材。你吃完抹了抹嘴，才想起这正是你在巡的那只脚。' }
    ]
  },
  {
    id: 's_sect3', type: 'story', line: '守骸宗', layers: [1], need: ['sect2'], title: '宗主的茶',
    text: '宗主请你喝茶。茶叶是从仙人耳朵里采的，他说这叫耳听为实。',
    options: [
      { label: '请教剑法', years: 2, fx: { skill: 'sword', edge: 3, mark: 'sect3' }, say: '宗主拿茶匙比划了一套剑法，茶没洒一滴。临走他拍拍你的肩：往后夜里守山的差事，就交给你了。' },
      { label: '请宗主指点渡劫', years: 1, fx: { edge: 4, mind: 4, mark: 'sect3' }, say: '宗主说渡劫和喝茶一样，烫的时候别急着咽。你连连点头，他很受用，从此走到哪儿都带着你。' },
      {
        label: '把茶泼了，亮明食仙教的身份', need: ['cult'], years: 1, risk: { p: 0.5, win: { body: 8, demon: 10, unmark: ['sect', 'sect2'] }, lose: { life: -15 } },
        sayWin: '一杯茶泼在宗主脸上，耳听为实成了眼见为实。你在满山弟子的追赶下逃回教里，教主亲手给你加了一块肉。',
        sayLose: '宗主抹了把脸，说茶凉了。你被扔下山崖，一路滚到山脚，路上顺便数清了仙人有几根肋骨。'
      }
    ]
  },
  {
    id: 's_thief', type: 'story', line: '守骸宗', layers: [1], need: ['thief'], title: '守骸宗的通缉',
    text: '山门口贴了你的画像，画得比你本人好看。',
    options: [
      { label: '把骨头还回去', years: 1, fx: { demon: -8, unmark: 'thief' }, say: '你趁夜把仙骨放回山门口。守门弟子收了骨头，顺手揭走一张画像，说留着自己挂。' },
      { label: '躲几年风头', years: 4, fx: { body: 1, mark: 'wanted' }, say: '你在山沟里躲了四年，画像越贴越多，赏格越涨越高。你开始有点骄傲，也开始好奇是谁在出这笔钱。' },
      { label: '卖给食仙教', years: 1, fx: { qi: 0.6, demon: 10, mark: 'taste', unmark: 'thief' }, say: '食仙教给的价很公道，还送你一碗用它熬的汤。守骸宗的画像从此改了一行字：此人已入魔，见之可煮。' }
    ]
  },
  {
    id: 's_sect4', type: 'story', line: '守骸宗', layers: [1], need: ['sect3'], not: ['wanted'], title: '少了一颗门牙',
    text: '仙人的门牙一夜之间少了一颗，有半间屋子那么大。执事们查了三天，查到你头上：那晚守夜的是你，离嘴最近的也是你。宗主没有露面，只派人送来一句话：清者自清。',
    options: [
      { label: '认下，先背着这口锅', years: 2, fx: { mind: 4, demon: 8, mark: 'wanted', unmark: ['sect', 'sect2', 'sect3'] }, say: '你被摘了腰牌，赶出山门。山门口贴出新画像，这回画得很丑，旁边写着：偷牙贼，见者扭送。' },
      { label: '连夜下山', years: 1, fx: { body: 4, mark: 'wanted', unmark: ['sect', 'sect2', 'sect3'] }, say: '你连夜跑了。第二天全宗都说，跑得这么快，不是你还能是谁。你的画像比上一任通缉犯的大了两号。' },
      {
        label: '张嘴让执事们验', years: 1, risk: { p: 0.5, win: { mind: 5, demon: -6 }, lose: { life: -5, mark: 'wanted', unmark: ['sect', 'sect2', 'sect3'] } },
        sayWin: '执事们挨个看了你的牙，确认颗颗都是你自己的。他们赔了个笑脸，转头去查下一个嘴大的人。',
        sayLose: '执事们看了半天，说你牙缝里有骨渣。那是你早上啃的饼。你挨了一顿打，被扔下山去，腰牌留下了。'
      }
    ]
  },
  {
    id: 's_sect5', type: 'story', line: '守骸宗', layers: [0, 1], need: ['wanted'], not: ['fang'], title: '画像上的人',
    text: '画通缉像的画师找上门来，说他画了一辈子贼，这回越画越不对劲：最大的那个贼不是你。他从袖子里抖出另一张画：上月宗主过寿，请他去画像，宗主一笑，嘴里多了一颗不合尺寸的牙，大得合不拢。',
    options: [
      { label: '请画师把那颗牙画仔细些', years: 2, fx: { mind: 4, mark: 'fang' }, say: '画师凭记忆描了三天，牙根上的纹路和仙人嘴里那个豁口严丝合缝。他收笔时说：这张不收钱，挂出去再收。' },
      { label: '请画师喝酒，套他的话', years: 1, fx: { demon: -4, mark: 'fang' }, say: '画师喝到第三壶，说宗主那颗牙夜里会发光，照得卧房跟白天一样，所以宗主睡觉从来不闭嘴。' },
      { label: '劝画师别多管闲事', years: 1, fx: { qi: 0.3 }, say: '画师叹了口气，把画撕了，转头又给你画了张新通缉像。这回画得比你本人还好看，赏格也跟着涨了。' },
      { label: '拿兜里的仙骨跟画上的牙比一比', need: ['thief'], years: 1, fx: { mind: 3, mark: 'fang' }, say: '仙骨的断口和画上的牙根对得上。原来你掰的那一小块，是宗主拔牙时崩下来的渣。你偷的是人家的边角料。' }
    ]
  },
  {
    id: 's_sect6', type: 'story', line: '守骸宗', layers: [1], need: ['fang'], not: ['proof'], title: '宗主的鼾声',
    text: '你摸进宗主的卧房。宗主仰面睡着，嘴张得像山门，那颗牙在黑里发着白光，照亮了半面墙上的宗规：仙骸一丝一毫不得私取。他打一声鼾，牙跟着一震，墙上的字也跟着晃一晃。',
    options: [
      { label: '借着牙光把宗规拓下来', years: 2, fx: { mind: 5, mark: 'proof' }, say: '你把宗规连同宗主的嘴一起拓在纸上。拓片上，规矩和犯规的东西挨得很近，近得像一句自问自答。' },
      {
        label: '在他枕边留张字条', years: 1, risk: { p: 0.5, win: { edge: 4, mark: 'proof' }, lose: { life: -8 } },
        sayWin: '你留了张字条：牙不错。第二天宗主闭着嘴主持晨课，一句话没说。弟子们交头接耳，你知道把柄已经攥在手里了。',
        sayLose: '字条写到一半，宗主翻了个身，牙光正照在你脸上。他没醒，你却吓得撞翻了香炉，被巡夜弟子追了八里地。'
      },
      { label: '悄悄退出去', years: 1, fx: { body: 2, demon: 5 }, say: '你退到门口，听见宗主在梦里说：这牙真好使。你忽然觉得这口锅背得有点冤，又有点想笑。' },
      { label: '叫教友来认这颗牙', need: ['cult'], years: 1, fx: { body: 4, demon: 6, mark: 'proof' }, say: '教友一眼认出来：这牙宗主拿到教里押过三顿流水席，后来又赎回去了。押条上还按着他的手印。' }
    ]
  },
  {
    id: 's_sect_end', type: 'story', line: '守骸宗', layers: [0, 1], need: ['wanted', 'proof'], title: '宗主登门',
    text: '拓片还没贴出去，宗主先来了。他亲自提着礼盒，身后跟着当初查你的三个执事，每人背着一捆撕下来的画像。宗主闭着嘴笑，笑得很辛苦。他说误会，全是误会，那颗牙是替仙人保管的。',
    options: [
      { label: '收下赔礼，把拓片烧了', years: 1, fx: { slot: 1, mind: 6, demon: -15, unmark: ['wanted', 'proof', 'fang', 'thief'] }, say: '礼盒里是宗主压箱底的一门心法，外加一张内门长老的名帖。你当着他的面烧了拓片，他长出一口气，牙光都暗了三分。' },
      { label: '让他当众把牙安回仙人嘴里', years: 2, fx: { edge: 10, body: 6, demon: -12, unmark: ['wanted', 'proof', 'fang', 'thief'] }, say: '宗主扛着牙爬上仙人的下巴，全宗弟子在底下看着。牙安回去那一刻，满山的风换了调子。执事们把你的画像裱起来，挂进了祠堂。' },
      { label: '不要礼，只要他那套剑谱', years: 1, fx: { skill: 'sword', edge: 6, unmark: ['wanted', 'proof', 'fang', 'thief'] }, say: '宗主犹豫了很久，最后从怀里掏出剑谱。扉页上有一个牙印。你说没关系，你不嫌弃。' }
    ]
  },
  // —— 食仙教：入教 → 护法 → 尝出豆腐味 → 抄下后厨的账 → 被罚洗碗 → 教主收买 → 掀桌。
  {
    id: 's_cult2', type: 'story', line: '食仙教', layers: [1], need: ['cult'], not: ['cult2'], title: '教主的提议',
    text: '教主说你有慧根，尤其是牙口。',
    options: [
      { label: '当护法', years: 2, fx: { body: 6, demon: 15, mark: 'cult2' }, say: '教主赐你一双银筷，说护法的职责是替教众试菜。你试了两年，牙口越来越好，心也越来越黑。' },
      { label: '婉拒', years: 1, fx: { mind: 1 }, say: '教主没生气，只是盯着你的胳膊看了很久。你回去以后，把袖子放长了三寸。' },
      { label: '答应下来，转头告诉守骸宗', need: ['sect'], years: 1, fx: { edge: 3, mind: 2, mark: 'sect2', unmark: 'cult' }, say: '你连夜上山告密。宗主当场提你进了内门，又叮嘱你别把教主给的银筷扔了，留着当证物。' }
    ]
  },
  {
    id: 's_cult3', type: 'story', line: '食仙教', layers: [1], need: ['cult2'], title: '分食大典',
    text: '教中大典，分食一整只仙人手掌。按资历，你分到一根小指。',
    options: [
      { label: '吃完', years: 2, fx: { body: 12, demon: 25, mark: 'fake' }, say: '你把小指啃得干干净净，浑身发热。只是嚼到最后一口，舌头尝出一股豆腥味，像是哪里不太对。' },
      { label: '只啃指甲', years: 1, fx: { body: 5, demon: 8, mark: 'fake' }, say: '指甲又硬又脆，你啃着啃着，发现上面有刀刻的纹路，刻得很匀，像是厨子一刀一刀雕出来的。' },
      {
        label: '趁乱带走教典', years: 1, risk: { p: 0.5, win: { skill: 'body', qi: 0.5 }, lose: { life: -10 } },
        sayWin: '你把教典塞进怀里，混在抢骨头的人堆里溜了出来。翻开一看，第一页写着：吃什么补什么。',
        sayLose: '教典比你想的沉，你跑了三步就被护法按住。他们没把你怎么样，只是让你当了一晚上的配菜。'
      }
    ]
  },
  {
    id: 's_cult4', type: 'story', line: '食仙教', layers: [1], need: ['fake'], not: ['cultbook'], title: '后厨',
    text: '你半夜摸进教里的后厨。十几个厨子围着几大块豆腐，正往上雕指纹，雕完刷一层酱，看着跟仙人手指一模一样。墙角码着一排木箱，封条上写着：真货，发丹盟，轻放。',
    options: [
      { label: '把出货的账抄下来', years: 2, fx: { mind: 4, mark: 'cultbook' }, say: '账记得很细：真仙肉一斤换丹盟三颗延寿丹，归教主一人。教众吃的豆腐，按斤报的却是仙肉的价。' },
      { label: '撬开箱子尝一口真的', years: 1, fx: { body: 8, demon: 12 }, say: '真货果然不一样，一口下去，你听见骨头里有人叹气。你舔了舔手指，决定先不声张，再观察几年。' },
      { label: '跟老厨子学雕豆腐', years: 2, fx: { qi: 0.3, mind: 2, mark: 'cultbook' }, say: '老厨子手很稳，边雕边骂：教主说仙肉太贵，教众舌头又不灵，糊弄糊弄得了。你学会了雕指甲，也记下了他每一句话。' },
      { label: '凭老主顾的面子去丹盟对账', need: ['credit'], years: 1, fx: { qi: 0.4, mark: 'cultbook' }, say: '丹盟掌柜一听是老主顾，把进货单全翻给你看。单子上盖着教主的私印，印泥里还掺着肉末。' }
    ]
  },
  {
    id: 's_cult5', type: 'story', line: '食仙教', layers: [1], need: ['cultbook'], not: ['mob'], title: '洗碗的护法',
    text: '账本还没捂热，教主先动了手。他说你最近口味不对，撤了你的护法，罚你去后厨洗碗，洗满三千只为止。碗都是教众吃完豆腐仙肉剩下的，每一只碗底都舔得锃亮。',
    options: [
      { label: '洗碗时把账刻在碗底', years: 3, fx: { mind: 4, demon: -4, mark: 'mob', unmark: 'cult2' }, say: '你每洗一只碗，就在碗底刻一行账。三个月后，全教的人喝完汤都盯着碗底发愣，有人开始把碗翻过来吃饭。' },
      { label: '往豆腐里掺回一丝真肉', years: 2, fx: { body: 4, demon: 6, mark: 'mob', unmark: 'cult2' }, say: '你往每块豆腐里塞了一丝真货。教众吃出了区别，饭桌上开始小声议论：今天的仙肉，怎么比往常像仙肉？' },
      { label: '老实洗完三千只', years: 3, fx: { body: 5, demon: -8, unmark: 'cult2' }, say: '你洗完三千只碗，手泡得发白，心却静了。教主很满意，说你这人能处。你觉得他说得对，你确实挺能忍。' }
    ]
  },
  {
    id: 's_cult6', type: 'story', line: '食仙教', layers: [1], need: ['mob'], not: ['revolt'], title: '教主的家宴',
    text: '教主听说了碗底的事，请你去吃家宴。席上只有你们两个，一盘真仙肉切得薄如蝉翼。教主亲自给你夹菜，说教里缺个懂账的长老，往后有肉同吃、有账同记，碗底就别再刻了。',
    options: [
      { label: '吃了，从此闭嘴', years: 2, fx: { body: 10, demon: 18, unmark: 'mob' }, say: '肉是真好吃。你吃完抹抹嘴，第二天碗底的字就被磨平了。教众又低头喝汤，只是喝得没以前香了。' },
      { label: '假意答应，顺手锯了桌腿', years: 1, fx: { edge: 3, mind: 4, mark: 'revolt' }, say: '你一边夸肉嫩，一边用袖里的薄刃把桌腿锯得只剩一层皮。教主拍着桌子大笑，桌子晃了晃，没塌，你也跟着笑。' },
      {
        label: '把席上的肉端出去分给教众', years: 1, risk: { p: 0.5, win: { body: 4, mark: 'revolt' }, lose: { life: -10 } },
        sayWin: '你说带回去孝敬师父，端着一盘真肉穿过整座教坛，见者一片。那晚全教的人都失眠了，因为头一回吃到真的。',
        sayLose: '你刚把盘子端起来，教主的笑就收了。护法们把你按在桌上，你当了半个时辰的砧板，桌腿倒是没断。'
      }
    ]
  },
  {
    id: 's_cult_end', type: 'story', line: '食仙教', layers: [1], need: ['revolt'], title: '掀桌',
    text: '分食大典又到了。教主站在主桌后面，举刀要切今年的仙人脚掌。台下三百个教徒捧着碗，碗底朝天，刻满了账。你走上前，把手搭在桌沿上。所有人都在等你一句话。',
    options: [
      { label: '掀了', years: 1, fx: { skill: 'body', body: 10, demon: -10, unmark: ['cult', 'revolt'] }, say: '桌子翻过去，豆腐脚掌摔成八瓣，箱子里的真货滚了一地。教主坐在地上，被三百只碗围着。教众把教典塞进你怀里，说往后按碗底的规矩办。' },
      { label: '掀了，再坐上主位', years: 2, fx: { slot: 1, body: 12, demon: 20 }, say: '你掀完桌子，扶正，坐了上去。教众给你磕头，叫你新教主。你宣布第一条教规：仙肉按人头分，豆腐另算。' },
      { label: '掀了，把教主交给守骸宗', years: 1, fx: { edge: 8, mind: 6, demon: -20, chance: 2, unmark: ['cult', 'cult2', 'revolt'] }, say: '守骸宗派了十个执事来押人。教主被押下山时还在喊冤，说豆腐也是仙人身上长的豆子。宗主送来一面锦旗：口下留山。' }
    ]
  },
  // —— 丹盟：老主顾被杀熟、黑名单抱团，都并进“赊不死”；被砸、丹盟亏空，最后大掌柜登门借钱。
  {
    id: 's_black', type: 'story', line: '丹盟', layers: [0, 1], need: ['deadbeat'], title: '丹盟的黑名单',
    text: '丹盟每间铺子门口都贴了你的名字，下面一行小字：此人与狗不得赊账。',
    options: [
      { label: '认栽，连本带利还清', years: 1, cost: { qi: 0.5 }, fx: { mark: 'credit', unmark: 'deadbeat' }, say: '掌柜收了钱，亲手把你的名字从门口揭下来，又在背面添了一行：老主顾，可赊。' },
      {
        label: '蒙面去买', years: 1, risk: { p: 0.5, win: { qi: 0.4 }, lose: { demon: 6 } },
        sayWin: '你蒙着脸进门，掌柜热情招呼，还多送了一颗。出门时你听见他跟伙计说：黑名单上那个，今天又来了。',
        sayLose: '掌柜一眼认出了你的鞋。他什么也没说，只是把门口的告示往高处挪了一寸，方便你看清。'
      },
      { label: '让二掌柜徒弟把名字划了', need: ['manager'], years: 1, fx: { demon: -5, unmark: 'deadbeat' }, say: '徒弟拿朱笔在你名字上画了个圈，说这就算划掉了。全城的铺子连夜重贴告示，你的名字成了一个红圈。' }
    ]
  },
  {
    id: 's_pill', type: 'story', line: '丹盟', layers: [0, 1], need: ['credit'], title: '老主顾的请柬',
    text: '掌柜请老主顾试吃新炉的丹。请柬上写着：这回是真的管饭。',
    options: [
      {
        label: '吃', years: 1, risk: { p: 0.7, win: { qi: 0.6, life: 5 }, lose: { life: -4 } },
        sayWin: '新丹入口即化，你多活了五年。掌柜在本子上记了一笔：老主顾，耐吃。',
        sayLose: '新丹入口即化，化完你就倒了。掌柜把你扶起来，说这炉还在改，下回再来，照样管饭。'
      },
      { label: '讨一张丹方', years: 1, cost: { qi: 0.4 }, fx: { skill: 'pill' }, say: '掌柜给了你一张丹方，又收了你一笔抄写费。他说老主顾嘛，讲究个有来有往。' },
      { label: '让徒弟带你走后门', need: ['manager'], years: 1, fx: { skill: 'pill', qi: 0.4 }, say: '徒弟领你从后厨进去，顺手往你怀里揣了张丹方。掌柜在前门等了半天，请柬白写了。' }
    ]
  },
  {
    id: 's_dan_kill', type: 'story', line: '丹盟', layers: [0, 1, 2], need: ['credit'], not: ['rival'], title: '老主顾价',
    text: '你在丹盟柜台前站了一刻钟，看见新客买延寿丹打九折，你的老主顾价却比他贵三成。掌柜笑得很诚恳：老主顾信得过我们，我们也信得过老主顾，信得过的东西，就值这个价。',
    options: [
      { label: '认了，照价买', years: 1, cost: { qi: 0.4 }, fx: { life: 10, mind: 2 }, say: '你付了钱，掌柜在你名字后面添了颗星，说这是至尊老主顾。下回再来，还要再贵一成。' },
      { label: '去对面黑名单开的铺子看看', years: 1, fx: { qi: 0.3, mark: 'rival', unmark: 'credit' }, say: '对面铺子叫“赊不死”，掌柜是你在黑名单上见过的名字。他说老主顾在丹盟受了委屈，到这边入一股，往后自己定价。你入了。' },
      { label: '当场撕了老主顾的名帖', years: 1, fx: { edge: 3, demon: -5, unmark: 'credit' }, say: '名帖撕成两半，掌柜心疼得直哆嗦。不是心疼你，是心疼那张帖子的工本费。你走出门，浑身轻了三成。' }
    ]
  },
  {
    id: 's_dan_black', type: 'story', line: '丹盟', layers: [0, 1, 2], need: ['deadbeat'], not: ['rival'], title: '黑名单互助会',
    text: '茶馆二楼坐满了人，个个都在丹盟的黑名单上。会长敲着桌子说：咱们三百号人，丹盟一颗都不肯赊，那就自己开一家。铺名都想好了，叫“赊不死”。就缺个能扛事的东家，大家看了一圈，都看向你。',
    options: [
      { label: '当东家', years: 2, fx: { edge: 2, mind: 3, mark: 'rival' }, say: '你在门口挂起招牌，下面一行小字：丹盟的人与狗，概不赊账。开张头一天，排队的人从街这头一直排到丹盟门口。' },
      { label: '只入一股，不出面', years: 1, cost: { qi: 0.3 }, fx: { chance: 1, mark: 'rival' }, say: '你出了一笔灵石，换来一张股契。契上写着：盈亏自负，丹盟来砸，大家一起扛。' },
      { label: '去丹盟告密', years: 1, fx: { qi: 0.5, demon: 10, unmark: 'deadbeat' }, say: '丹盟赏了你一笔钱，把你的名字从黑名单挪到了“线人”那一栏。茶馆二楼从此空了，你路过时总觉得楼上有人在看你。' }
    ]
  },
  {
    id: 's_dan4', type: 'story', line: '丹盟', layers: [0, 1, 2], need: ['rival'], not: ['hoard'], title: '算盘砸门',
    text: '赊不死开张第三年，丹盟来了二十个打手，每人一把铁算盘，见柜台就砸，见丹炉就推。领头的账房边砸边念：砸一张柜台十两，推一座丹炉三十两，回头一并记在你们账上。',
    options: [
      { label: '赔着笑脸让他们砸', years: 1, fx: { mind: 3, demon: 8, mark: 'hoard' }, say: '他们砸到最后一块地砖，砖底下露出一口大缸，满满一缸灵石。黑名单上的人从不借钱给别人，攒了一辈子。账房愣住，算盘珠子掉了一地。' },
      {
        label: '抄起丹炉砸回去', years: 1, fx: { mark: 'hoard' }, risk: { p: 0.5, win: { edge: 5 }, lose: { life: -8 } },
        sayWin: '你一炉子扣在账房头上，二十个打手扛着他跑了。收拾残局时，你掀开碎地砖，底下埋着一缸灵石，是会员们攒了几百年的私房。',
        sayLose: '你被二十把算盘按在地上算了一遍，伤得不轻。打手们撬地砖找值钱的，撬出一缸灵石，没搬动，骂骂咧咧地走了。'
      },
      { label: '关门歇业', years: 2, fx: { body: 2, life: 4, unmark: 'rival' }, say: '你锁了门，回家养了两年鸡。赊不死的招牌被雨泡烂了，丹盟门口的告示上又多了几个名字。' }
    ]
  },
  {
    id: 's_dan5', type: 'story', line: '丹盟', layers: [0, 1, 2], need: ['hoard'], not: ['ious'], title: '丹盟的窟窿',
    text: '街上都在传：丹盟把钱借给了食仙教和守骸宗。食仙教把上门收账的伙计吃了，守骸宗说仙人还没死透，押的骨头不算数。丹盟的炼丹师三个月没拿到工钱，正蹲在赊不死门口晒太阳。',
    options: [
      { label: '把炼丹师都请进铺子', years: 2, fx: { qi: 0.4, mind: 3, mark: 'ious' }, say: '你按丹盟的两倍开工钱。炼丹师们扛着丹炉过街，丹盟门口只剩一个掌柜，和一块写着“老主顾”的牌子。' },
      { label: '在鬼市收丹盟的旧欠条', years: 1, cost: { qi: 0.4 }, fx: { mind: 5, mark: 'ious' }, say: '食仙教和守骸宗打给丹盟的欠条在鬼市论斤卖，你全收了。如今他们欠你的，丹盟欠他们的，绕了一圈，也都欠着你。' },
      { label: '搬把椅子看热闹', years: 1, fx: { body: 2, demon: -6 }, say: '你坐在门口嗑了三年瓜子。丹盟的窟窿越来越大，你脚边的瓜子皮越堆越高，两样东西都没人去扫。' }
    ]
  },
  {
    id: 's_dan_end', type: 'story', line: '丹盟', layers: [0, 1, 2], need: ['ious'], title: '大掌柜来借钱',
    text: '百炼丹盟的大掌柜亲自登门，带着一把算盘、两个打手和一张写好的欠条，欠款人一栏写着：百炼丹盟。他在门口站了很久，看着你招牌下那行小字，最后把打手打发走了，自己进来作揖。',
    options: [
      { label: '借，利钱照丹盟的规矩算', years: 1, fx: { qi: 0.6, chance: 3, mark: 'lender', unmark: ['deadbeat', 'rival', 'hoard', 'ious'] }, say: '你拨着他带来的算盘，一笔一笔算利滚利。大掌柜越听脸越白，签字时手直抖。你送他出门：先借后还，童叟无欺。' },
      { label: '不借，把他写上黑名单', years: 1, fx: { edge: 4, mind: 8, demon: -15, unmark: ['deadbeat', 'rival', 'hoard', 'ious'] }, say: '你提笔在门口告示上添了一行：百炼丹盟大掌柜，此人与狗不得赊账。大掌柜盯着那行字看了半晌，说字写得不错。' },
      { label: '借，拿他的镇店丹方作押', years: 1, fx: { skill: 'pill', slot: 1, mark: 'lender', unmark: ['deadbeat', 'rival', 'hoard', 'ious'] }, say: '大掌柜交出镇店丹方时，眼泪掉进了砚台。你收好丹方，答应他还清以后原样奉还，前提是他还得清。' }
    ]
  },
  // —— 字：养字 → 字生字 → 一屋子字要写书 → 书稿被书院抄走 → 字狱越狱 → 书院来求书。
  {
    id: 's_word2', type: 'story', line: '字', layers: [0, 1], need: ['petword'], not: ['library'], title: '字生了字',
    text: '你养的那个字半夜生了一窝偏旁，满屋子乱爬。',
    options: [
      { label: '教它们排队', years: 2, fx: { mind: 3, mark: 'library' }, say: '你教它们按笔画排队，排到第二年，它们自己学会了按意思排。屋里从此安静了，只偶尔有个“吵”字插队。' },
      { label: '连窝卖给书院', years: 1, fx: { qi: 0.5, mark: 'academy', unmark: 'petword' }, say: '书院的先生拎着笼子来，数了数偏旁，按斤给了钱。临走他说，你这字养得好，膘肥。' },
      { label: '放生', years: 1, fx: { demon: -8, unmark: 'petword' }, say: '你把它们放在河边。字们排成一行游走了，远远看去，像一句没说完的话。' }
    ]
  },
  {
    id: 's_word3', type: 'story', line: '字', layers: [0, 1], need: ['library'], title: '一屋子字',
    text: '字们自己凑成了一篇谁也没见过的功法，有几处语病。',
    options: [
      { label: '照着抄下来', years: 2, fx: { skill: 'talisman', mind: 2 }, say: '你连语病一起抄了下来。练起来居然没走火，只是每回运功，都忍不住想改个错字。' },
      { label: '让它们自己念给你听', years: 3, fx: { mind: 6, mark: 'draft' }, say: '字们轮流念了三年，越念越顺，念到后来不肯停了，说要写一部真正的书。' },
      { label: '请书院的先生来校对', need: ['academy'], years: 1, fx: { skill: 'talisman', mind: 4, mark: 'draft' }, say: '先生改完语病，眼睛发亮，说这些字是写书的好材料。他走的时候，多看了你的屋子两眼。' }
    ]
  },
  {
    id: 's_academy', type: 'story', line: '字', layers: [0, 1], need: ['petword'], not: ['academy'], title: '缄默书院的搜查',
    text: '书院的人挨家挨户搜字。你养的那个字钻进了你的领口。',
    options: [
      {
        label: '把字含在嘴里', years: 1, risk: { p: 0.6, win: { mind: 2 }, lose: { demon: 6, unmark: ['petword', 'library'] } },
        sayWin: '搜查的人让你张嘴，你说了一声“啊”。他们走了，那个字在你舌头底下笑出了声。',
        sayLose: '你憋了半天，一个喷嚏把它喷了出来，它的偏旁们也全跟着跑了出来。书院的人一网打尽，还谢你帮忙。'
      },
      { label: '交出去', years: 1, fx: { qi: 0.3, mark: 'academy', unmark: ['petword', 'library'] }, say: '书院的人把字装进信封，在封口按了个手印，按的是你的手。他们说念你主动上交，记你一份人情。' },
      {
        label: '说它是你自己写的', years: 1, risk: { p: 0.4, win: { mind: 4, mark: 'academy' }, lose: { life: -6 } },
        sayWin: '先生让你当场再写一个。你写的字丑得像在逃跑，他信了，记下你的名字，说书院欠你个人情。',
        sayLose: '先生让你当场再写一个。你写的字刚落纸就跑了，他气得拿戒尺打你手心，一直打到天黑。'
      }
    ]
  },
  {
    id: 's_word4', type: 'story', line: '字', layers: [0, 1], need: ['draft'], not: ['manuscript'], title: '书名',
    text: '字们决定写一部书，写这世上的事：骸山怎么成的山，枯海怎么干的海。可开头就吵翻了天。“书”字不肯进书名，嫌俗；“死”字非要排第一个，说它见得最多；“我”字躲在墙角，说还没想好自己算不算一个字。',
    options: [
      { label: '给它们当编辑', years: 3, fx: { mind: 5, mark: 'manuscript' }, say: '你定下规矩：吵架的罚抄自己一百遍。三年后书稿摞到了房梁，“死”字排进了第三章，“我”字终于站了出来，站在书名最后。' },
      { label: '去集市给它们招新字', years: 2, fx: { body: 2, chance: 2, mark: 'manuscript' }, say: '你在集市贴了告示：招字，管饭。来了一群从说书摊上逃出来的字，满嘴江湖话。书稿厚了一倍，多了很多“且听下回分解”。' },
      { label: '劝它们别写了', years: 1, fx: { demon: -6, unmark: 'draft' }, say: '你说写书伤神。字们沉默了很久，各自回到墙上，排成一句“好吧”。那句话在墙上挂了很多年。' },
      { label: '请书院的先生作序', need: ['academy'], years: 1, fx: { mind: 4, mark: 'manuscript' }, say: '先生写了一篇很长的序，夸得天花乱坠。字们很高兴，没注意先生每夸一句，就往袖子里抄一页。' }
    ]
  },
  {
    id: 's_word5', type: 'story', line: '字', layers: [0, 1], need: ['manuscript'], not: ['seized'], title: '书院抄家',
    text: '缄默书院来了三十个先生，抬着铁笼，说接到举报，此处私藏逃字、聚众著书。他们把书稿一页页撕下来，字们被抖进笼子，挤成一团乱码。领头的院正说：字是天下的字，书院替天下收着。',
    options: [
      { label: '眼看着它们被收走', years: 1, fx: { mind: 2, demon: 10, mark: 'seized' }, say: '笼子抬走时，“我”字从栏杆缝里伸出一笔，朝你挥了挥。屋里空了，墙上只剩一个落下的逗号，你把它供在了桌上。' },
      { label: '把最后一页塞进嘴里', years: 1, fx: { mind: 4, mark: 'seized' }, say: '先生们没搜你的嘴。他们走后，你吐出最后一页，纸上只剩三个字：等我们。' },
      {
        label: '跟院正讲道理', years: 1, fx: { mark: 'seized' }, risk: { p: 0.45, win: { mind: 6 }, lose: { life: -6 } },
        sayWin: '你问院正，书院把字收了，字就不写书了吗？院正被问住了，临走留下一张收条：暂押，候审。',
        sayLose: '你讲到第三条道理，院正拿戒尺封了你的嘴。他说书院只收字，不收道理，又罚你抄了六年《缄默经》。'
      }
    ]
  },
  {
    id: 's_word6', type: 'story', line: '字', layers: [0, 1], need: ['seized'], not: ['jailbreak'], title: '字狱',
    text: '书院的字狱在地底下，一本本大字典就是一间间牢房，被抓的字钉在释义里动弹不得。你去探监，发现自家的字没闲着：它们在字典里悄悄挪位置，已经把“书院”的释义改成了“一间关字的屋子”。',
    options: [
      { label: '帮它们把整本字典改完', years: 3, fx: { mind: 6, mark: 'jailbreak' }, say: '你每回探监都带进去一支笔。三年后整本字典的释义都换了。看守翻开查“看守”，查到的是“睡着的人”，于是他睡着了。' },
      {
        label: '送一把剪刀进去', years: 1, risk: { p: 0.55, win: { edge: 4, mark: 'jailbreak' }, lose: { life: -4, demon: 8 } },
        sayWin: '字们剪开释义，顺着页边溜了出来，一个接一个钻进你的袖子。看守只听见一阵翻书声，以为是风。',
        sayLose: '剪刀被看守搜了出来。你被记过一次，罚在门口站岗，天天听着字们在地底下骂人。'
      },
      { label: '在字典扉页写一句“出来吧”', years: 2, fx: { mind: 3, demon: -5, mark: 'jailbreak' }, say: '那句话一落笔，所有的字都认出了你的笔迹。那夜字狱里的字典全空了，第二天先生们上课，发现课本也是空的。' }
    ]
  },
  {
    id: 's_word_end', type: 'story', line: '字', layers: [0, 1], need: ['jailbreak'], title: '书院来求书',
    text: '字们在你屋里把书写完了，厚厚一部，书名叫《还有》。缄默书院那边，藏书楼十万卷书一夜之间全成了白纸，字都跑来投奔这部书。院正带着全院先生站在你门口，求你借几个字回去，好歹把校训写上。',
    options: [
      { label: '借，按字收租', years: 1, fx: { qi: 0.6, mind: 4, chance: 3, unmark: ['seized', 'jailbreak'] }, say: '你立了个规矩：常用字一年一两，生僻字半价，“之乎者也”白送。先生们算了半天，连校训都租不起，只好先租了个“静”字。' },
      { label: '请院正来当编辑', years: 2, fx: { skill: 'talisman', mind: 10 }, say: '院正坐在你屋里改了两年错字，改着改着哭了，说这辈子头一回看见字自己愿意待在纸上。他回去后，把字狱改成了阅览室。' },
      { label: '把书印出来，人手一本', years: 2, fx: { slot: 1, mind: 6, demon: -10 }, say: '书印了一万本，字们轮流住进每一本里。书院门口排起长队，先生们捧着书，像捧着一窝刚孵出来的鸟。' }
    ]
  },
  // —— 黄狗：摸狗 → 收留 → 狗啃仙骨 → 狗不吃饭、只望骸山 → 仙人手上的狗链 → 鸡犬升天。
  {
    id: 's_dog', type: 'story', line: '黄狗', layers: [0, 1], need: ['dog'], not: ['dog2'], title: '跟上来的黄狗',
    text: '村口那条黄狗不知什么时候跟上了你，走一步叹一口气。',
    options: [
      { label: '收留它', years: 1, fx: { demon: -10, mark: 'dog2' }, say: '你给它起名叫阿黄，它没理你。但那天晚上它睡在你门口，叹气声小了一点。' },
      { label: '给它指回村的路', years: 1, fx: { mind: 1, unmark: 'dog' }, say: '你给它指了路。它看看你的手指，又看看你，叹了一口最长的气，转身走了。' },
      { label: '问它到底叹什么', years: 2, fx: { mind: 2 }, say: '它没回答，只是望着骸山的方向看了两年。你也跟着看，看出那山像一个人侧身躺着。' }
    ]
  },
  {
    id: 's_dog2', type: 'story', line: '黄狗', layers: [0, 1], need: ['dog2'], not: ['dogbone'], title: '狗啃了仙骨',
    text: '阿黄出门溜了三天，叼回来一根骨头，比它自己还长。守骸宗的执事追到门口，说这是仙人的尾椎骨，按宗规要赔。阿黄把骨头护在肚子底下，头一回没叹气，冲执事龇了龇牙。',
    options: [
      { label: '照价赔', years: 1, cost: { qi: 0.4 }, fx: { demon: -4, mark: 'dogbone' }, say: '你赔了一大笔灵石。执事要拿走骨头，阿黄死活不松口。执事说算了，被狗啃过的仙骨，宗里也没人肯供了。' },
      {
        label: '说这狗不是你的', years: 1, fx: { mark: 'dogbone' }, risk: { p: 0.5, win: { qi: 0.3 }, lose: { life: -5, demon: 6 } },
        sayWin: '执事转头去问阿黄。阿黄看看他，叹了口气，叼着骨头走到你身后躺下。执事说狗都不认你，你又何必认狗，就走了。',
        sayLose: '你话音刚落，阿黄就叼着骨头钻进你怀里。执事气得给你记了一笔，说包庇狗也算包庇。'
      },
      { label: '让阿黄自己去跟执事谈', years: 2, fx: { mind: 3, mark: 'dogbone' }, say: '阿黄跟着执事上了山，两年后自己回来了，骨头没还，执事也没再来。听说宗主见了它一面，就下了令：此狗所到之处，骨头随便啃。' }
    ]
  },
  {
    id: 's_dog3', type: 'story', line: '黄狗', layers: [0, 1], need: ['dogbone'], not: ['dogsky'], title: '狗不吃饭',
    text: '阿黄跟了你这些年，一口饭也没吃过。它只在天亮前舔一口草尖上的露水，然后蹲在门口望着骸山，一望就是一整天。丹盟的兽医路过，说它病得不轻；算命先生路过，说它骨相清奇，像是吃过仙丹。',
    options: [
      { label: '买丹盟的药', years: 1, cost: { qi: 0.3 }, fx: { demon: 3, mark: 'dogsky' }, say: '药喂下去，阿黄打了个嗝，嗝出一缕金光。兽医当场改口，说这狗没病，有病的是他，把药钱退了一半。' },
      { label: '陪它一起望', years: 3, fx: { mind: 6, demon: -6, mark: 'dogsky' }, say: '你陪它望了三年，看出了门道：骸山像一个人侧躺着，右手伸向天上，像要拉谁一把。阿黄每回看到那只手，就叹一口气。' },
      {
        label: '请算命先生给它算一卦', years: 1, risk: { p: 0.5, win: { chance: 3, mark: 'dogsky' }, lose: { demon: 6 } },
        sayWin: '先生摸了摸狗骨，脸色发白，说这卦他算不了，此狗的命比他的大。他卦金都没收，收拾摊子连夜搬了家。',
        sayLose: '阿黄一口咬住了先生的签筒。先生说狗咬签是大凶，劝你早点把它送走。阿黄看了他一眼，他就不说了。'
      }
    ]
  },
  {
    id: 's_dog4', type: 'story', line: '黄狗', layers: [1], need: ['dogsky'], not: ['leash'], title: '仙人指上的狗链',
    text: '阿黄领你走上骸山，一直走到仙人伸向天上的那只右手。手指上缠着一根锈透了的链子，另一头空着，链环上刻着两个小篆。阿黄蹲下来，把脖子伸到空着的那一头，伸了很久，然后回头看你。',
    options: [
      { label: '把链子解下来给它戴上', years: 2, fx: { body: 4, demon: -8, mark: 'leash' }, say: '链扣合上的一刻，整座骸山轻轻震了一下，像一个人在梦里翻了个身。阿黄没有叹气，摇了摇尾巴。你头一回见它摇尾巴。' },
      { label: '念出链环上的字', years: 1, fx: { mind: 5, mark: 'leash' }, say: '你认出那两个字：阿黄。你给它起名那天它没理你，原来它早就叫这个名字，只是很久没人这么叫过了。' },
      { label: '劝它别想过去的事', years: 1, fx: { mind: 2, demon: 4 }, say: '阿黄听完，把头埋进爪子里，叹了这辈子最长的一口气。你们下山时，链子在身后叮当作响，像在叫它。' }
    ]
  },
  {
    id: 's_dog_end', type: 'story', line: '黄狗', layers: [0, 1, 2], need: ['leash'], title: '鸡犬升天',
    text: '那夜阿黄开口说话了，声音很老。它说当年主人得道飞升，一人得道，鸡犬升天，鸡和它都上去了，主人自己卡在天门外，掉下来摔成了骸山。它下来陪了他一万年，看人在他身上种地、开宗、摆流水席。它说它累了，想找个人替它记着主人。',
    options: [
      { label: '替它的主人立一块碑', years: 3, fx: { mind: 10, demon: -20, chance: 2 }, say: '你在仙人掌心立了块碑：此处躺着一个差半步的人。守骸宗、食仙教、丹盟的人路过，都停下来看了一会儿。那天骸山上没人动筷子。' },
      { label: '跟它学那半步怎么走', years: 2, fx: { slot: 1, mind: 6 }, say: '阿黄教你走了半步。就半步，你走了两年。走完回头，你还站在原地，丹田里却多出一间屋子，屋里有盏灯，灯下趴着一条狗。' },
      { label: '挠挠它的下巴', years: 1, fx: { life: 20, demon: -10, chance: 3 }, say: '阿黄眯起眼，喉咙里咕噜一声，一万年来头一回没叹气。第二天你醒来，门口放着一根仙骨，上面有它的牙印，算是谢礼。' },
      { label: '带它回守骸宗认亲', need: ['sect'], years: 1, fx: { edge: 6, mind: 4, demon: -6 }, say: '宗主一见阿黄，扑通跪下，喊了声祖师的狗。全宗弟子跟着跪了一地，阿黄绕着他们走了一圈，挑了个最矮的，在他鞋上趴下了。' }
    ]
  },
  // —— 旱龙舟（枯海）：捡到桨 → 入队 → 盐上练船 → 船被盐商锯断 → 去沉船借鼓 → 竞渡。
  {
    id: 's_race1', type: 'story', line: '旱龙舟', layers: [2], need: ['oar'], not: ['crew'], title: '凑不齐的船队',
    text: '枯海的盐民每年端午还赛龙舟，在盐上划。卖灯阿婆的孙子组了一条船：一个鼓手，一个瞎了眼的舵手，一只据说当年会游水的老龟，还缺一个桨手。他看见你手里的桨，眼睛亮了：道友，桨都带了。',
    options: [
      { label: '入队', years: 1, fx: { body: 3, mark: 'crew' }, say: '你在队旗上按了手印。队旗是一块床单，上面画着一条龙，画得像根油条。孙子说不要紧，在盐上划船，样子不重要。' },
      { label: '当教头', years: 1, fx: { mind: 3, mark: 'crew' }, say: '你站在船头讲了半天划桨的要领。老龟听完点点头，慢慢爬回船尾。鼓手翻译：讲得好，但你也得划。' },
      { label: '劝他们别赛了', years: 1, fx: { demon: -3, unmark: 'oar' }, say: '孙子低着头听完，把你的桨要了回去，说桨是他爹的。那天夜里，你听见盐滩上有人一个人在划，划了很久。' }
    ]
  },
  {
    id: 's_race2', type: 'story', line: '旱龙舟', layers: [2], need: ['crew'], not: ['drill'], title: '盐上练桨',
    text: '盐比水硬，一桨下去，溅起来的是白花花的盐粒，打在脸上生疼。一个月磨秃一支桨，三个月磨掉一层皮。舵手说海还在的时候，划一下能滑出去十丈；如今划一下，船挪半寸，地上多一道沟。',
    options: [
      { label: '天天划，划到盐化成卤', years: 3, fx: { body: 8, mark: 'drill' }, say: '你划了三年，汗把船底的盐泡成了卤，船终于滑起来了。盐民们说，这是枯海三千年来头一回有船在滑，虽然只滑了一丈。' },
      { label: '给船底抹油', years: 2, fx: { qi: 0.3, mind: 3, mark: 'drill' }, say: '你试了猪油、灯油、丹盟的润肠丹，最后发现鱼油最好使。可枯海哪来的鱼？阿婆从箱底翻出一罐，说是她出嫁时的嫁妆。' },
      { label: '躺在船里晒盐', years: 2, fx: { life: 3, demon: -6 }, say: '你在船里躺了两年，晒出一身盐霜，活像一条咸鱼。孙子没说什么，只是从此划船都绕开你那一侧。' }
    ]
  },
  {
    id: 's_race3', type: 'story', line: '旱龙舟', layers: [2], need: ['drill'], not: ['sawn'], title: '盐商的船',
    text: '赛前一夜，盐商的船队开进了海床。他们的龙舟描金镶玉，船底装着轮子，十二个桨手都是重金请来的金丹修士。盐商站在船头，看了一眼你们的油条龙旗，笑了。第二天一早，你们的船被锯成了两截，锯口很齐。',
    options: [
      { label: '把两截绑起来', years: 2, fx: { body: 4, mark: 'sawn' }, say: '你用麻绳、铁丝和阿婆的裹脚布把船绑了回去。船看着更像油条了，还是拧过的那种。盐商路过，笑得从船头掉了下去。' },
      { label: '锯成两截就划两条', years: 1, fx: { mind: 4, mark: 'sawn' }, say: '一条船变成两条，你带老龟一条，孙子带舵手一条。规矩里没说不行，裁判翻了半天章程，只好在名册上多添一行。' },
      {
        label: '钻到盐商船底看看', years: 1, fx: { mark: 'sawn' }, risk: { p: 0.5, win: { edge: 2, mind: 5 }, lose: { life: -6 } },
        sayWin: '你钻到盐商船底，看见一排轮子，轮轴上刻着丹盟的记号。你什么也没碰，只记下了轮子有多宽，盐地上哪几段是软的。',
        sayLose: '你刚钻到船底就被金丹桨手拖了出来，一顿好打。临走他们在你脸上写了个“慢”字，说给你们队讨个彩头。'
      }
    ]
  },
  {
    id: 's_race4', type: 'story', line: '旱龙舟', layers: [2], need: ['sawn'], not: ['drum'], title: '借鼓',
    text: '鼓手的鼓也被人戳破了。舵手说，海床北边有条沉了三千年的龙舟，桅杆还立着，风一吹就像有人在击鼓，那鼓从来没停过。他说那船上的人赛了一辈子龙舟，最后一场没赛完，海就干了。',
    options: [
      { label: '去沉船上借', years: 2, fx: { mind: 4, demon: 4, mark: 'drum' }, say: '你在桅杆底下鞠了三个躬，说明来意。风停了一会儿，盐壳里浮出一面鼓，鼓皮上还留着手印。你扛着鼓往回走，鼓声一路跟在身后。' },
      { label: '拿自己的肚皮当鼓', years: 1, fx: { body: 6, mark: 'drum' }, say: '鼓手试着在你肚皮上敲了两下，声音闷得像打雷前的云。他说能用，就是你得憋着气，一口气憋一整场。' },
      { label: '找盐商买一面', years: 1, cost: { qi: 0.4 }, fx: { mind: 1, mark: 'drum' }, say: '盐商卖给你一面鼓，价钱是市价的三倍。敲起来很响，响的是鼓皮上刻的四个字：盐商赞助。' }
    ]
  },
  {
    id: 's_race_end', type: 'story', line: '旱龙舟', layers: [2], need: ['drum'], title: '竞渡',
    text: '端午那天，枯海上站满了人。盐商的金龙舟一马当先，你们那条拧成麻花的油条船落在最后。鼓声一响，北边沉船的桅杆跟着响了，三千年前的桨手从盐里坐起来，一个个抓起了桨。海床底下，有什么东西翻了个身。',
    options: [
      { label: '划', years: 2, fx: { body: 12, edge: 6, mark: 'champion' }, say: '盐地下涌出卤水，越涌越多，你们的船浮了起来，像枯海记起了自己曾经是海。盐商的轮子陷在卤里空转。你们头一个撞线，锦标是半碗海水。' },
      { label: '让三千年前的桨手先过线', years: 2, fx: { mind: 10, demon: -20, chance: 3, mark: 'champion' }, say: '你们在终点前停了桨。沉船上的人慢慢划过去，划完了三千年前那最后一场，化成盐粒落回海床。裁判把锦标给了你们，盐民说那晚的盐是甜的。' },
      { label: '在浪头上悟桨法', years: 3, fx: { slot: 1, body: 6, mark: 'champion' }, say: '那股浪只来了一刻。你在浪头上划完这一刻，悟出一个道理：桨不在手里，在下一桨里。盐商的船沉进卤里，只剩个船头露在外面，像块碑。' }
    ]
  },
  // —— 守漏人（跨三层）：替他挑水 → 挑扁担 → 骸山的时辰 → 枯海是他挑干的 → 漏壶裂了 → 替他守一夜。
  {
    id: 's_clock1', type: 'story', line: '守漏人', layers: [0, 1, 2], need: ['clock'], not: ['clock2'], title: '守漏人的扁担',
    text: '守漏人挑着一根扁担从你门口过，两头各一只木桶，一桶装着尘壤的时辰，一桶装着骸山的。他老得腰都直不起来，走三步歇一步，每歇一步，天就暗一下。他说道友，你上回帮过我，这回再帮我挑一程？',
    options: [
      { label: '接过扁担', years: 3, fx: { body: 5, mark: 'clock2' }, say: '扁担压在肩上，比看着沉一万倍。你每走一步，就听见身后有人在长大，有人在变老。守漏人跟在旁边说：别回头，回头就洒了。' },
      { label: '只挑尘壤那一头', years: 1, fx: { body: 2, life: 3, mark: 'clock2' }, say: '你只挑了一头，扁担翘得老高。尘壤那一桶晃来晃去，路过的村子里，鸡一会儿打鸣一会儿不打，村里人以为又要变天。' },
      { label: '问他水是从哪来的', years: 1, fx: { mind: 3 }, say: '守漏人想了很久，说他也忘了，反正桶空了往东走，总能打满。他挑起扁担往东去了，背影越走越矮。' }
    ]
  },
  {
    id: 's_clock2', type: 'story', line: '守漏人', layers: [1, 2], need: ['clock2'], not: ['clock3'], title: '骸山的时辰',
    text: '你跟着守漏人上了骸山。山上的时辰走得慢，仙人的尸骸太沉，把时辰压弯了，守骸宗的弟子活了八百岁还在外门。骸山那只桶底裂了道缝，时辰滴滴答答往外漏，路边一棵草一会儿开花，一会儿结籽。',
    options: [
      { label: '用手捂住裂缝', years: 4, fx: { body: 4, mind: 4, life: -6, mark: 'clock3' }, say: '你捂了四年，手背上的皮老了，手心的皮倒年轻了。守漏人说这叫一手阴阳，又说别得意，往后你会想念对称的日子。' },
      { label: '拿符纸糊上', years: 1, fx: { mind: 4, mark: 'clock3' }, say: '符纸糊上去，漏是不漏了，就是这一桶时辰从此带着墨香。骸山上的人往后做梦，都梦见自己在抄书。' },
      {
        label: '舀一勺骸山的时辰喝', years: 1, risk: { p: 0.5, win: { life: 12, mark: 'clock3' }, lose: { life: -10 } },
        sayWin: '一勺下肚，你的心跳慢了半拍，寿元却多出一截。守漏人瞪了你一眼，在账本上记下：挑夫偷喝一勺，从工钱里扣。',
        sayLose: '那一勺时辰在你肚子里倒着走，你吐了三天，吐出来的全是去年吃的饭。守漏人说早告诉过你，骸山的时辰不好消化。'
      }
    ]
  },
  {
    id: 's_clock3', type: 'story', line: '守漏人', layers: [2], need: ['clock3'], not: ['clock4'], title: '海是怎么干的',
    text: '桶空了。守漏人领你往东走，一直走到枯海边。他蹲下来用手在盐里刨，刨出一小洼水，舀进桶里。你忽然明白了：这片海是被他一桶一桶挑干的，一滴是一刻，挑了一万年。盐民们认出了他的扁担，抄起了盐耙。',
    options: [
      { label: '替守漏人挡着', years: 2, fx: { body: 6, demon: 6, mark: 'clock4' }, say: '盐耙一下一下落在你背上，打得你骨头缝里全是盐。守漏人趁乱挑满了两桶，回头对你说了声对不住，声音比海还干。' },
      { label: '跟盐民讲清楚这是一万年的时辰', years: 2, fx: { mind: 6, mark: 'clock4' }, say: '你讲了两年。盐民们放下盐耙，有人哭了：原来海没走，是变成了日子，被大家过掉了。他们放守漏人走，只要他打一张欠条。' },
      { label: '把桶里的水倒回海里', years: 1, fx: { life: -5, demon: -10 }, say: '水倒回去，枯海边多了一小洼海，盐民们围着它跪了一圈。守漏人看着空桶没说话，那天尘壤的天黑得特别早。' }
    ]
  },
  {
    id: 's_clock4', type: 'story', line: '守漏人', layers: [0, 1, 2], need: ['clock4'], not: ['clock5'], title: '漏壶裂了',
    text: '回到漏刻房，守漏人的漏壶裂了，从壶嘴一直裂到壶底。时辰往外渗，窗外的人一会儿快一会儿慢：有个孩子刚学会走路就长了胡子，有个老人在门口坐着坐着又会爬了。守漏人坐在地上，说他补不动了。',
    options: [
      { label: '和泥补壶', years: 3, fx: { body: 4, mind: 4, mark: 'clock5' }, say: '你拿枯海的盐、骸山的骨粉和尘壤的黄泥和了一团泥，补了三年。补过的地方颜色不一样，像一道疤。守漏人摸着它说，挺好，这壶总算有点来历了。' },
      { label: '拿自己的寿元去填', years: 1, fx: { mind: 6, life: -15, mark: 'clock5' }, say: '你把手按在裂缝上，寿元一点点流进壶里。窗外孩子的胡子掉了，老人又站了起来。你照镜子，多了几根白发，镜子里的人冲你点了点头。' },
      {
        label: '把漏壶砸了，大家慢慢过', years: 1, risk: { p: 0.4, win: { speed: 0.2, demon: -8 }, lose: { life: -8, demon: 8 } },
        sayWin: '壶碎了，时辰流了一地，渗进土里。从此世上的日子不快不慢，只是没人知道几时几刻。大家照样过，过得也挺好。',
        sayLose: '壶碎了，时辰却没流走，全扑到了你身上。你一天之内过了好几个季节，一会儿冻得发抖一会儿热得流汗，落了一身病。'
      }
    ]
  },
  {
    id: 's_clock_end', type: 'story', line: '守漏人', layers: [0, 1, 2], need: ['clock5'], title: '替他守一夜',
    text: '守漏人说他想歇一歇，就歇一夜，让你替他守着漏壶。他靠着墙睡着了，打起了一万年来的第一个呼噜。漏壶滴答滴答，整个世上的时辰从你手边一滴一滴流过去，快一点、慢一点，全凭你一句话。',
    options: [
      { label: '一滴不差地守到天亮', years: 1, fx: { mind: 10, demon: -15, chance: 3 }, say: '你守了一夜，一滴没多，一滴没少。天亮守漏人醒了，看了看壶，说比他自己守得还准，在扁担上刻下了你的名字。' },
      { label: '往自己那一桶多滴几滴', years: 1, fx: { life: 20, speed: 0.1 }, say: '你只多滴了三滴，三滴就是三十年。守漏人醒来闻了闻，说怎么有股偷吃的味道。他没追究，只在账本上画了个笑脸。' },
      { label: '往枯海那一桶倒回半桶', years: 2, fx: { slot: 1, mind: 6, demon: -10 }, say: '那一夜枯海涨了一回潮，盐民们站在没膝的海水里，谁也不敢出声。天亮潮退，你在丹田里摸到一处湿漉漉的空当，像是潮水替你多冲开了一间屋子。' }
    ]
  },
  // —— 话本：听见话本里的自己 → 成了大恶人 → 续集里你死了 → 说书先生病倒 → 你自己讲最后一回。
  {
    id: 's_tale1', type: 'story', line: '话本', layers: [0, 1], need: ['tale'], not: ['tale2'], title: '话本里的你',
    text: '茶馆的说书先生正讲到精彩处：那人姓甚名谁与你一字不差，三岁偷鸡，七岁欺师，十五岁赊了丹盟一千颗丹不还，如今正在骸山脚下吃人。满堂听客拍案叫好，有人回头打量你，问你怎么跟那恶人长得一样。',
    options: [
      {
        label: '上台更正', years: 1, fx: { mark: 'tale2' }, risk: { p: 0.4, win: { mind: 4 }, lose: { life: -3, demon: 6 } },
        sayWin: '你一条一条更正，先生听得直点头，当场改了词：此人赊丹不还，是丹盟先坑的他。听客们更爱听了，说恶人也有苦衷。',
        sayLose: '你一上台，听客们就扔花生壳，说恶人还敢露面。先生顺势加了一段：恶人现身茶馆，被众人打了出去。这段反响最好。'
      },
      { label: '塞给先生几块灵石，让他改', years: 1, cost: { qi: 0.3 }, fx: { mind: 1, mark: 'tale2' }, say: '先生收了钱，下一回就改了：恶人其实有个苦命的娘。听客们哭成一片，越发恨你，说有娘还这样。' },
      { label: '坐下来听完', years: 2, fx: { mind: 3, demon: -2 }, say: '你听完了全本，听到恶人死在第一百回，满堂叫好。你也跟着叫了一声，觉得这辈子算是有了交代。' }
    ]
  },
  {
    id: 's_tale2', type: 'story', line: '话本', layers: [0, 1], need: ['tale2'], not: ['tale3'], title: '书迷',
    text: '话本越讲越红，你走到哪儿都有人认得。小孩见了你就哭，寡妇见了你就关窗，丹盟掌柜见了你，二话不说先把账本藏起来。只有一个书生追着你要签名，说他最喜欢你吃人那一回，写得太好了。',
    options: [
      { label: '给他签', years: 1, fx: { mind: 2, mark: 'tale3' }, say: '你签了名。书生如获至宝，第二天把签名裱起来挂在书摊上卖，价钱比话本贵十倍，还顺手出了一本《恶人亲笔》，里面全是他自己写的。' },
      { label: '吓唬他一下', years: 1, fx: { edge: 2, demon: 4, mark: 'tale3' }, say: '你龇牙咧嘴扑过去，书生吓得一屁股坐在地上，又爬起来大喊：是真的！他回去把这事写成了续集，比原本还火。' },
      { label: '躲进山里', years: 3, fx: { body: 3, demon: -4 }, say: '你在山里躲了三年，出来时话本已经讲完了，新的一部讲一条会叹气的狗。听客们早忘了你，你还有点失落。' }
    ]
  },
  {
    id: 's_tale3', type: 'story', line: '话本', layers: [0, 1], need: ['tale3'], not: ['tale4'], title: '续集里你死了',
    text: '书生写的续集卖得到处都是，第三回你就死了：被守骸宗一剑穿心，挂在山门口示众。如今你走在街上，熟人见了你脸色发白，有人给你烧纸，有人来认领遗产，还有个散修拿着契书，说你生前把洞府卖给了他。',
    options: [
      { label: '当街证明自己还活着', years: 1, fx: { body: 3, demon: 5, mark: 'tale4' }, say: '你当街打了一套拳，吃了三碗面，又跟认领遗产的人打了一架。大家这才信你还活着，只是有点失望：死了的那版好看些。' },
      { label: '将错就错，去吃自己的席', years: 2, fx: { qi: 0.5, demon: -3, mark: 'tale4' }, say: '你的头七办得很热闹，丹盟送了花圈，食仙教送了一口锅。你坐在角落吃完了自己的席，收了一桌份子钱，觉得死一回也不亏。' },
      {
        label: '把散修的契书撕了', years: 1, risk: { p: 0.5, win: { edge: 4, mark: 'tale4' }, lose: { life: -6 } },
        sayWin: '你一把撕了契书，散修大喊有鬼，扭头就跑，跑掉了一只鞋。你捡起来看看，比你脚上那双还新，就收下了。',
        sayLose: '散修不认账，说书上都写着呢，书上写的还能有假？你们打了一架，他赢了，你在自己的洞府门口睡了半年。'
      }
    ]
  },
  {
    id: 's_tale4', type: 'story', line: '话本', layers: [0, 1], need: ['tale4'], not: ['tale5'], title: '先生病了',
    text: '说书先生病倒了，躺在茶馆后屋，嗓子哑得只剩气声。他这些年讲你讲得太多，讲着讲着自己信了，一闭眼就梦见你来吃他。门口围满了听客，拍着门要听下一回。先生拉着你的手说：道友，最后一回，你自己讲吧。',
    options: [
      { label: '替他煎药', years: 2, fx: { mind: 3, demon: -8, mark: 'tale5' }, say: '你煎了两年药，先生的嗓子一点点回来了。他说原来恶人也会煎药，这段他要写进去。你说你写吧，写好看点。' },
      { label: '翻他的稿子', years: 1, fx: { mind: 5, mark: 'tale5' }, say: '稿子里写满了你：你没干过的坏事，和你干过却没人知道的好事，混在一处，难分真假。最后一页空着，题头写着：大结局，待本人亲述。' },
      { label: '趁机把话本烧了', years: 1, fx: { edge: 2, demon: 6 }, say: '稿子烧了，灰飘出窗外，落在听客们头上。他们以为先生要讲新的，等了一夜。第二天，街上传开了一个更离谱的版本。' }
    ]
  },
  {
    id: 's_tale_end', type: 'story', line: '话本', layers: [0, 1], need: ['tale5'], title: '最后一回',
    text: '茶馆里挤得水泄不通，丹盟掌柜、守骸宗执事、食仙教的教徒都来了，写续集的书生坐在第一排，手里攥着笔。你一拍醒木，满堂鸦雀无声。先生靠在后台的门框上，冲你点了点头。',
    options: [
      { label: '照实讲', years: 2, fx: { mind: 10, demon: -15, chance: 2 }, say: '你讲了你这一世：哪年挑过水，哪年摸过狗，哪年赊过账。没有吃人，也没有欺师。听客们没鼓掌，静了很久，有人小声说：原来是这样。第二天，街上的小孩不哭了。' },
      { label: '讲得比原本还离谱', years: 1, fx: { qi: 0.6, mind: 6, chance: 3 }, say: '你讲自己一口吞了半座骸山，又把丹盟大掌柜吊在了月亮上。满堂喝彩，赏钱扔了一地。先生在后台笑出了眼泪，说青出于蓝。' },
      { label: '把先生请上台，讲他自己', years: 2, fx: { slot: 1, mind: 6 }, say: '先生讲了一辈子别人，头一回讲自己。听客们听得入神，书生连笔都忘了动。散场时先生说，讲故事和修行一样，得给后面留地方。你回去打坐，丹田里真空出了一块。' }
    ]
  },
  {
    id: 'a_salt_wreck', type: 'adventure', layers: [2], title: '盐壳里的桅杆',
    text: '一道旧雷把龙舟桅杆钉进了海床。风吹过断口，响得像谁还在击鼓。',
    options: [
      { label: '沿着雷痕拆开盐壳', years: 4, fx: { edge: 9, demon: 7, gear: 1 } },
      { label: '背着桅杆走到岸上', years: 4, fx: { body: 9 } },
      { label: '坐在断口旁听完一通鼓', years: 3, fx: { mind: 8 } },
      { label: '从盐壳里拔出一支断桨', years: 2, fx: { body: 3, mark: 'oar' } }
    ]
  },
  {
    id: 'i_sea_lantern', type: 'idle', layers: [2], title: '盐灯照潮',
    text: '卖灯的阿婆点了一盏盐灯。她说潮会涨到很高，但总有人要看灯回来。',
    options: [
      { label: '替她守灯', years: 2, fx: { demon: -8 } },
      { label: '记下几段潮声', years: 2, fx: { mind: 4 } },
      { label: '把温热的盐倒进阵眼', years: 1, fx: { qi: 0.12 } },
      { label: '替阿婆的孙子扛桨', years: 1, fx: { body: 1, mark: 'oar' } },
      { label: '把锦标里的半碗海水倒进灯里', need: ['champion'], years: 1, fx: { mind: 4, demon: -10 } }
    ]
  },
  // 给装备和锻材的机缘：装备补身上装备分最低的槽位，阶比历练眼下掉的高，品级也更好。
  {
    id: 'a_smith', type: 'adventure', layers: [1, 2], title: '铁匠铺的回炉价',
    text: '铁匠说，他这炉子烧的都是别人不要的兵器。烧到最后剩下什么，他自己也说不准。',
    options: [
      { label: '把身上最破的一件递进去', years: 2, cost: { qi: 0.3 }, fx: { gear: 1 } },
      { label: '赌他炉底压着的那件', years: 2, risk: { p: 0.45, win: { gear: 2 }, lose: { life: -6, forge: 2 } } },
      { label: '帮他拉一天风箱', years: 3, fx: { body: 2, forge: 4 } },
      { replaces: 0, label: '徒手从炉里捞一件', school: 'body', years: 2, fx: { gear: 1, body: 2 } },
      { label: '请铁匠给旱龙舟的桨包一层铁', need: ['oar'], years: 1, fx: { edge: 2, forge: 4 } }
    ]
  },
  {
    id: 'a_battlefield', type: 'adventure', layers: [1, 2], title: '没人收尸的战场',
    text: '两拨修士在这里打过一场，赢的那边也没剩下人。兵器倒是都还在，只是有的手还握着不放。',
    options: [
      { label: '一根一根掰开手指', years: 3, fx: { gear: 1, demon: 6 } },
      { label: '只捡地上散着的', years: 2, fx: { forge: 5 } },
      { label: '挖坑把人都埋了', years: 4, fx: { demon: -8, mind: 2 } },
      { label: '翻最里面穿得最好的那具', years: 2, risk: { p: 0.5, win: { gear: 2 }, lose: { life: -9, demon: 5 } } }
    ]
  },
  {
    id: 'a_pawn', type: 'adventure', layers: [1, 2], title: '当铺的死当',
    text: '当铺清死当。掌柜说这些东西的主人都发过誓会回来赎，他等了三百年，决定不等了。',
    options: [
      { label: '挑一件顺眼的', years: 1, cost: { qi: 0.4 }, fx: { gear: 1 } },
      { label: '买下那口没开封的箱子', years: 2, cost: { qi: 0.6 }, fx: { gear: 2 } },
      { label: '替掌柜抄一天当票', years: 2, fx: { mind: 2, qi: 0.15 } },
      { replaces: 0, label: '闭着眼摸一件', school: 'luck', years: 1, fx: { gear: 2 } },
      { label: '把龙舟锦标押在柜上', need: ['champion'], years: 1, fx: { gear: 1, mind: 1 } }
    ]
  },
  {
    id: 'i_whetstone', type: 'idle', layers: [0, 1, 2], title: '路边的磨刀石',
    text: '磨刀石上刻着一行字：“磨一次少一次”。没说少的是石头还是刀。',
    options: [
      { label: '磨一磨随身的家伙', years: 1, fx: { forge: 3 } },
      { label: '把石头搬走', years: 2, fx: { body: 1, forge: 5, demon: 2 } },
      { label: '坐下看别人磨', years: 1, fx: { mind: 1 } }
    ]
  },

  // 触发式突发：trigger 对应 SUDDENS，stage 为 omen（征兆）或 event（突发）。
  // 这些事件不参与普通随机池，也不能重抽；选择征兆后，下一回机缘进入对应突发。
  {
    id: 's_meridian_omen', type: 'adventure', trigger: 'meridian', stage: 'omen', layers: [0, 1, 2], title: '征兆·灵气逆行',
    text: '刚突破的经脉里，灵气忽然倒着走了一段。你得先稳住气息；处理完这个征兆，下一回机缘就要面对经脉错乱。',
    options: [
      { label: '放缓吐纳', years: 1, fx: { demon: -2 } },
      { label: '服一颗稳脉丹', years: 1, cost: { qi: 0.2 }, fx: { mind: 1 } },
      { label: '装作无事', years: 1, fx: { qi: 0.1 } }
    ]
  },
  {
    id: 's_meridian', type: 'adventure', trigger: 'meridian', stage: 'event', layers: [0, 1, 2], title: '突发·经脉错乱',
    text: '逆行忽然冲进整条主脉。无论你怎么处理，接下来三次普通机缘的灵气奖励都会减少三成。',
    options: [
      { label: '立即封脉', years: 2, fx: { life: -3 } },
      { label: '强行冲关', years: 1, risk: { p: 0.55, win: { qi: 0.5 }, lose: { life: -7, demon: 5 } } },
      { label: '慢慢疏导', years: 3, fx: { demon: 2 } }
    ]
  },
  {
    id: 's_thunder_omen', type: 'adventure', trigger: 'thunder', stage: 'omen', layers: [0, 1, 2], title: '征兆·雷云不散',
    text: '劫云已经退去，云里却还有雷声跟着你。先做些准备；下一回机缘，余雷就会找上门。',
    options: [
      { label: '静坐听雷', years: 1, fx: { mind: 1 } },
      { label: '收拢散开的灵气', years: 1, fx: { qi: 0.12 } },
      { label: '检查身上旧伤', years: 1, fx: { demon: -2 } }
    ]
  },
  {
    id: 's_thunder', type: 'adventure', trigger: 'thunder', stage: 'event', layers: [0, 1, 2], title: '突发·天劫余波',
    text: '余雷没有劫云，也没有规矩。它落下之后，接下来三次普通机缘的概率型选项都会更难成功。',
    options: [
      { label: '引雷入体', years: 1, risk: { p: 0.5, win: { body: 4 }, lose: { life: -6, demon: 4 } } },
      { label: '拿寿元挡下', years: 1, fx: { life: -4 } },
      { label: '耗灵气引出体外', years: 1, cost: { qi: 0.3 }, fx: { demon: -2 } }
    ]
  },
  {
    id: 's_backlash_omen', type: 'adventure', trigger: 'backlash', stage: 'omen', layers: [0, 1, 2], title: '征兆·秘纹相争',
    text: '新成的秘法里，两路旧纹开始争抢同一个位置。你得先决定如何安置心神，下一回就要处理功法反噬。',
    options: [
      { label: '暂停研读', years: 1, fx: { demon: -2 } },
      { label: '默记两路旧纹', years: 2, fx: { mind: 2 } },
      { label: '先稳住其他功法', years: 1, fx: { qi: 0.1 } }
    ]
  },
  {
    id: 's_backlash', type: 'adventure', trigger: 'backlash', stage: 'event', layers: [0, 1, 2], title: '突发·功法反噬',
    text: '两路秘纹同时失控。压下反噬后，全部秘法还要沉寂三次普通机缘，其他功法不受影响。',
    options: [
      { label: '以心神镇压', years: 2, fx: { demon: 6 } },
      { label: '以寿元养纹', years: 1, fx: { life: -4 } },
      { label: '任它们争出胜负', years: 1, risk: { p: 0.5, win: { demon: -5 }, lose: { demon: 10 } } }
    ]
  },
  {
    id: 's_fortune_omen', type: 'adventure', trigger: 'fortune', stage: 'omen', layers: [0, 1, 2], title: '征兆·灯焰过盛',
    text: '机缘来得太密，灯焰已经压不住了。你可以先整理手头的收获，下一回就要面对福极生变。',
    options: [
      { label: '清点收获', years: 1, fx: { mind: 1 } },
      { label: '压一压灯焰', years: 1, fx: { demon: -2 } },
      { label: '趁热再翻一卷', years: 1, fx: { qi: 0.12 } }
    ]
  },
  {
    id: 's_fortune', type: 'adventure', trigger: 'fortune', stage: 'event', layers: [0, 1, 2], title: '突发·机缘反噬',
    text: '太多没走过的路一起挤到眼前，反倒看不清方向。处理后，接下来三次普通机缘的积攒间隔都会变成一点五倍。',
    options: [
      { label: '丢掉多余的机缘', years: 1, fx: { chance: -6, mind: 2 } },
      { label: '分出几段给别人', years: 1, fx: { chance: -3, demon: -2 } },
      { label: '强留所有机缘', years: 1, risk: { p: 0.5, win: { chance: 2 }, lose: { chance: -10, demon: 5 } } }
    ]
  },
  {
    id: 's_debt_omen', type: 'adventure', trigger: 'debt', stage: 'omen', layers: [0, 1, 2], title: '征兆·收条上的旧名',
    text: '一张发黄的收条写着你的名字，日期却是很久以前。那些经历终于串成了账，下一回就会有人上门。',
    options: [
      { label: '先看清数额', years: 1, fx: { mind: 1 } },
      { label: '假装没认出来', years: 1, fx: { demon: 2 } },
      { label: '先备些灵气', years: 1, fx: { qi: 0.15 } }
    ]
  },
  {
    id: 's_debt', type: 'adventure', trigger: 'debt', stage: 'event', layers: [0, 1, 2], title: '突发·旧债上门',
    text: '来人不要命，也不要功法，只要你为旧账折损一些锋芒。接下来三次普通机缘，锋、躯、神都会降低一成。',
    options: [
      { label: '拿寿元还', years: 1, fx: { life: -5, demon: -3 } },
      { label: '拿灵气还', years: 1, cost: { qi: 0.4 }, fx: { demon: -2 } },
      { label: '赖到底', years: 1, risk: { p: 0.5, win: { chance: 3 }, lose: { life: -8, demon: 6 } } }
    ]
  }
];

// 劫相：前三场天劫每一世各抽一种，决定考哪几项。只考一项的要求更高。req 是对该场天劫基础要求的倍率。
const TRIB_ASPECTS = [
  { id: 'bm', name: '阴火', tests: ['body', 'mind'], req: 1 },
  { id: 'eb', name: '刀兵', tests: ['edge', 'body'], req: 1 },
  { id: 'em', name: '诛心', tests: ['edge', 'mind'], req: 1 },
  { id: 'e', name: '斩业', tests: ['edge'], req: 1.35 },
  { id: 'b', name: '碎骨', tests: ['body'], req: 1.35 },
  { id: 'm', name: '失名', tests: ['mind'], req: 1.35 }
];

// 历练里来犯的东西。关卡不限数量，每一关的气血和攻击由 game.js 按关数算，这里只定各自的打法：
// interval 是出手间隔（秒），reduce 是减伤，resist 是抗异常，skill 是当首领时每隔 every 秒放一次、伤害为攻击 mult 倍的招式。
// mob 是当小怪时的名字，name 和 text 是当首领时的名字和一句话。
const TRAIN_FOES = [
  { id: 'dog', sprite: 'dog', mob: '野狗', name: '偷灯油的野狗', text: '它不图别的，就图你那盏灯亮。', interval: 1.5,
    skill: { name: '叼了就跑', every: 6, mult: 1.8 } },
  { id: 'scarecrow', sprite: 'scarecrow', mob: '草人', name: '拦路的稻草人', text: '田里早就没有庄稼了，它拦的是路。', interval: 2, reduce: 0.15,
    skill: { name: '此路不通', every: 7, mult: 2 } },
  { id: 'debt', sprite: 'debt', mob: '欠条', name: '逃出来的“欠”字', text: '从无字城一路爬到尘壤，见人就往身上贴。', interval: 1.6, resist: 0.3,
    skill: { name: '利滚利', every: 6, mult: 2 } },
  { id: 'waiter', sprite: 'waiter', mob: '食仙教徒', name: '食仙教的传菜人', text: '端着一盘不知道是谁的东西，嫌你挡道。', interval: 1.8, reduce: 0.1,
    skill: { name: '上菜', every: 7, mult: 2.2 } },
  { id: 'scavenger', sprite: 'scavenger', mob: '拾荒人', name: '拾荒人的头儿', text: '他说这片破烂归他管，包括你。', interval: 1.6, reduce: 0.1, resist: 0.4,
    skill: { name: '这也是我的', every: 5, mult: 2 } }
];
// 骸山、枯海的历练换一批对手。第 i 个和尘壤的第 i 个打法一样（出手间隔、减伤、抗性、招式节奏和倍率），只换模样和名字，
// 所以换层不改平衡。art 是没有 3D 时用的平面图，借用模样相近的现成图。
const TRAIN_FOE_LOOKS = [
  [
    { id: 'bonehound', art: 'dog', mob: '骨犬', name: '守坟的骨头狗', text: '主人埋在哪儿它早忘了，只记得见人就咬。', skill: '刨坟' },
    { id: 'skeleton', art: 'scavenger', mob: '骸卒', name: '没领到军饷的骸卒', text: '仗打完三百年了，他还在等人来发饷。', skill: '列阵' },
    { id: 'skullwisp', art: 'kilnfire', mob: '磷火', name: '找不到坟的磷火', text: '它绕着骸山找了一夜，觉得你像它的坟。', skill: '鬼打墙' },
    { id: 'snowape', art: 'saltfigure', mob: '雪猿', name: '雪岭上的老猿', text: '它在雪里蹲了一冬，就等个会喘气的过来。', skill: '雪崩' },
    { id: 'vulture', art: 'kilncrow', mob: '秃鹫', name: '盘了三天的秃鹫', text: '它看你走路的样子，觉得不用等太久。', skill: '啄眼' }
  ],
  [
    { id: 'leapfish', art: 'saltcrab', mob: '跳鱼', name: '上了岸的跳鱼', text: '海干了它也不回去，说岸上的东西好咬。', skill: '甩尾' },
    { id: 'hermit', art: 'saltcrab', mob: '寄居蟹', name: '背着破船的寄居蟹', text: '船是它捡的，它说船上的人也该归它。', skill: '横冲' },
    { id: 'jelly', art: 'tombthunder', mob: '水母', name: '飘在干海上的水母', text: '没有水托着，它就飘在风里，碰谁蜇谁。', skill: '蜇' },
    { id: 'drowned', art: 'saltferryman', mob: '老水手', name: '沉船上的老水手', text: '他的船沉在没水的海里，每天照样起锚。', skill: '收锚' },
    { id: 'octopus', art: 'inkblot', mob: '章鱼', name: '捡破烂的章鱼', text: '八只手都占着，还想腾一只来拿你的灯。', skill: '缠' }
  ]
];
// 按墟层排的历练对手：TRAIN_FOE_LAYERS[层][i]。
const TRAIN_FOE_LAYERS = [TRAIN_FOES].concat(TRAIN_FOE_LOOKS.map((looks) => looks.map((look, i) => {
  const base = TRAIN_FOES[i];
  return {
    id: look.id, sprite: look.id, art: look.art, mob: look.mob, name: look.name, text: look.text,
    interval: base.interval, reduce: base.reduce, resist: base.resist,
    skill: { name: look.skill, every: base.skill.every, mult: base.skill.mult }
  };
})));
// 关隘：这几场天劫要先凑齐材料才肯落下。材料只在对应的秘境里打赢对手才有，每打一场耗机缘。
// trib 是 TRIBS 的下标，人在这个境界时秘境开着；need 是要凑的材料数。
// foes 从下品到上品：stage 是它相当于历练第几关的首领，gain 是打赢给几份材料，其余和 TRAIN_FOES 的写法一样。
// 对手的图在 assets/foes/<对手 id>.svg，场景的图在 assets/scenes/<关隘 id>.svg。
const GATES = [
  { id: 'paper', trib: 1, scene: '纸人巷', material: '纸灰', need: 4,
    text: '办丧事的一条街，人早走光了，纸扎的还在照常营业。筑基要拿纸灰垫底，灰得从它们身上烧。',
    foes: [
      { id: 'paperboy', tier: '下品', name: '送信的纸童', text: '帖子上没有字，它还是坚持要你签收。', stage: 2, gain: 1, interval: 1.5,
        skill: { name: '递帖子', every: 6, mult: 1.8 } },
      { id: 'paperbearer', tier: '中品', name: '抬空轿的纸轿夫', text: '轿子里没有人，他说这趟还是得算钱。', stage: 4, gain: 2, interval: 1.9, reduce: 0.15,
        skill: { name: '起轿', every: 7, mult: 2 } },
      { id: 'papercollector', tier: '上品', name: '讨债的纸人', text: '它记着整条街的账，头一笔就是你的。', stage: 7, gain: 3, interval: 1.6, resist: 0.3,
        skill: { name: '连本带利', every: 6, mult: 2.2 } }
    ] },
  { id: 'salt', trib: 3, scene: '盐骨滩', material: '盐晶', need: 6,
    text: '枯海退潮后露出来的滩，船和骨头都结了壳。元婴劫的潮认盐晶，没有它，船不肯为你停。',
    foes: [
      { id: 'saltcrab', tier: '下品', name: '背盐壳的蟹', text: '它横着走了一辈子，没觉得哪里不对。', stage: 22, gain: 1, interval: 1.5, reduce: 0.2,
        skill: { name: '横着来', every: 6, mult: 1.8 } },
      { id: 'saltfigure', tier: '中品', name: '盐化的俑', text: '原先是个等船的人，等得久了点。', stage: 31, gain: 2, interval: 2, reduce: 0.25,
        skill: { name: '再等等', every: 7, mult: 2.1 } },
      { id: 'saltferryman', tier: '上品', name: '龙舟的艄公', text: '船早沉了，他还在收过河钱。', stage: 40, gain: 3, interval: 1.7, reduce: 0.1, resist: 0.35,
        skill: { name: '过河钱', every: 6, mult: 2.3 } }
    ] },
  { id: 'ink', trib: 6, scene: '无字城', material: '残墨', need: 8,
    text: '城里的字都逃了，剩下的墨没处去，自己成了精。问鼎要落款，落款要墨。',
    foes: [
      { id: 'inkblot', tier: '下品', name: '爬墙的错字', text: '它知道自己写错了，所以不让人看。', stage: 52, gain: 1, interval: 1.4, resist: 0.3,
        skill: { name: '涂掉重写', every: 6, mult: 1.8 } },
      { id: 'inkbrush', tier: '中品', name: '改卷的朱笔', text: '卷子早没了，它见什么都想批一个“阅”。', stage: 60, gain: 2, interval: 1.6, resist: 0.2,
        skill: { name: '已阅', every: 6, mult: 2.1 } },
      { id: 'inkstele', tier: '上品', name: '不肯落款的碑', text: '立了三千年，至今不肯说是给谁立的。', stage: 68, gain: 3, interval: 2.1, reduce: 0.3, resist: 0.4,
        skill: { name: '无可奉告', every: 7, mult: 2.4 } }
    ] },
  { id: 'kiln', trib: 11, scene: '涅火窑', material: '窑烬', need: 10,
    text: '一座烧人不烧柴的老窑。碎涅之前，先得从窑里讨一把别人烧剩的烬。',
    foes: [
      { id: 'kilncrow', tier: '下品', name: '衔火的灰鸦', text: '它叼着一粒炭到处问：这是谁掉的。', stage: 86, gain: 1, interval: 1.4,
        skill: { name: '谁掉的', every: 5, mult: 1.8 } },
      { id: 'kilnworker', tier: '中品', name: '把自己烧了的窑工', text: '他说这一窑火候刚好，就是忘了出来。', stage: 95, gain: 2, interval: 1.8, reduce: 0.2,
        skill: { name: '添把火', every: 6, mult: 2.2 } },
      { id: 'kilnfire', tier: '上品', name: '看窑的老火', text: '窑主死了很久，它一直没等到有人喊熄火。', stage: 104, gain: 3, interval: 1.6, reduce: 0.15, resist: 0.4,
        skill: { name: '开窑', every: 6, mult: 2.4 } }
    ] },
  { id: 'tomb', trib: 16, scene: '天道坟', material: '天屑', need: 12,
    text: '天道埋在这里，碑上一个字也没有。踏天之前，得从坟上带走几片它掉下来的屑。',
    foes: [
      { id: 'tombbeast', tier: '下品', name: '守陵的石兽', text: '没人告诉它，里头那位已经不需要守了。', stage: 110, gain: 1, interval: 1.9, reduce: 0.3,
        skill: { name: '闲人免进', every: 7, mult: 2 } },
      { id: 'tombthunder', tier: '中品', name: '哭丧的雷', text: '它劈了一辈子人，如今只会哭。', stage: 120, gain: 2, interval: 1.5, resist: 0.3,
        skill: { name: '一声干嚎', every: 5, mult: 2.2 } },
      { id: 'tombshadow', tier: '上品', name: '天道的影子', text: '本尊不在了，影子还留在原地，不知道该跟谁。', stage: 132, gain: 3, interval: 1.6, reduce: 0.2, resist: 0.5,
        skill: { name: '天意如此', every: 6, mult: 2.5 } }
    ] }
];// 道途的克制：主修左边一系时，右边一系的功法效果减半。
const PATH_COUNTER = { sword: 'talisman', talisman: 'body', body: 'luck', luck: 'pill', pill: 'sword' };

module.exports = {
  TRAIN_FOES,
  TRAIN_FOE_LAYERS,
  GATES,
  TRIB_ASPECTS,
  PATH_COUNTER,
  SCHOOL_IDS,
  LAMP_SCROLLS,
  SCHOOLS,
  GRADES,
  SKILLS,
  FATES,
  ARCANES,
  TOME_GRADES,
  TOMES,
  TOME_TIERS,
  ROOTS,
  ROOT_RARITIES,
  ROOT_COMBOS,
  RARE_ROOTS,
  LAYERS,
  REALMS,
  REALM_POWER_GROWTH,
  STAGES,
  TRIBS,
  AUTO_LAMP,
  LAMPS,
  KARMA,
  MARKS,
  LEGACY_INTROS,
  BIG_EVENTS,
  SUDDENS,
  SEA_ROUTES,
  EVENTS
};
