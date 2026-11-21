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
  dog2: '身后跟着一条狗'
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
      { label: '画一张以假乱真的灵票', school: 'talisman', years: 2, fx: { body: 3, mind: 2, demon: 6 } }
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
    id: 'a_weeding', type: 'adventure', layers: [1], not: ['sect', 'thief'], title: '守骸宗的入门试炼',
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
      { label: '让他照着你的手相改他的书', school: 'luck', years: 1, fx: { chance: 2, mind: 1 } }
    ]
  },
  {
    id: 'a_boat', type: 'adventure', layers: [0, 1, 2], title: '渡口的黑船',
    text: '船夫说，上船不收钱，下船收。',
    options: [
      { label: '上船', years: 2, risk: { p: 0.6, win: { qi: 0.5, edge: 1 }, lose: { life: -6, demon: 5 } } },
      { label: '游过去', years: 3, fx: { body: 2 } },
      { label: '等一条白的', years: 2, fx: { qi: 0.1 } },
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
      { label: '把对面的论点写成符贴他脑门上', school: 'talisman', years: 2, fx: { mind: 4 } }
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
      { label: '帮守漏人换一桶水', years: 1, fx: { mind: 1, demon: -2 } },
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
      { label: '当场炼一炉丹抵债', school: 'pill', years: 2, fx: { demon: -5, mark: 'credit' } }
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
      { replaces: 1, label: '随手搓一颗驻颜丹', school: 'pill', years: 1, fx: { life: 4 } }
    ]
  },
  {
    id: 'i_fair', type: 'idle', layers: [0], title: '集市',
    text: '集市上有人卖“祖传飞升秘籍”，三文钱一本，买二送一。',
    options: [
      { label: '买三本垫桌脚', years: 1, fx: { body: 1 } },
      { label: '跟他讲价', years: 1, fx: { mind: 1 } },
      { label: '当众揭穿他', years: 1, risk: { p: 0.5, win: { qi: 0.2 }, lose: { life: -1 } } },
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
      { label: '数一数茶叶', years: 1, fx: { mind: 1 } }
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
      { label: '数错就再数一遍', years: 2, fx: { mind: 2, demon: -1 } }
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
  {
    id: 's_sect2', type: 'story', line: '守骸宗', layers: [1], need: ['sect'], not: ['sect2'], title: '外门的差事',
    text: '执事派你去巡山。巡的是仙人的左脚，一圈下来要三年。',
    options: [
      { label: '认真巡完', years: 3, fx: { edge: 2, body: 1, mark: 'sect2' } },
      { label: '找个脚趾缝睡觉', years: 2, fx: { qi: 0.3 } },
      { label: '路过食仙教的摊子，没忍住', need: ['taste'], years: 1, fx: { body: 4, demon: 10 } }
    ]
  },
  {
    id: 's_sect3', type: 'story', line: '守骸宗', layers: [1], need: ['sect2'], title: '宗主的茶',
    text: '宗主请你喝茶。茶叶是从仙人耳朵里采的，他说这叫耳听为实。',
    options: [
      { label: '请教剑法', years: 2, fx: { skill: 'sword', edge: 3 } },
      { label: '请宗主指点渡劫', years: 1, fx: { edge: 4, mind: 4 } },
      { label: '把茶泼了，亮明食仙教的身份', need: ['cult'], years: 1, risk: { p: 0.5, win: { body: 8, demon: 10, unmark: ['sect', 'sect2'] }, lose: { life: -15 } } }
    ]
  },
  {
    id: 's_thief', type: 'story', line: '守骸宗', layers: [1], need: ['thief'], title: '守骸宗的通缉',
    text: '山门口贴了你的画像，画得比你本人好看。',
    options: [
      { label: '把骨头还回去', years: 1, fx: { demon: -8, unmark: 'thief' } },
      { label: '躲几年风头', years: 4, fx: { body: 1 } },
      { label: '卖给食仙教', years: 1, fx: { qi: 0.6, demon: 10, mark: 'taste', unmark: 'thief' } }
    ]
  },
  {
    id: 's_cult2', type: 'story', line: '食仙教', layers: [1], need: ['cult'], not: ['cult2'], title: '教主的提议',
    text: '教主说你有慧根，尤其是牙口。',
    options: [
      { label: '当护法', years: 2, fx: { body: 6, demon: 15, mark: 'cult2' } },
      { label: '婉拒', years: 1, fx: { mind: 1 } },
      { label: '答应下来，转头告诉守骸宗', need: ['sect'], years: 1, fx: { edge: 3, mind: 2, mark: 'sect2', unmark: 'cult' } }
    ]
  },
  {
    id: 's_cult3', type: 'story', line: '食仙教', layers: [1], need: ['cult2'], title: '分食大典',
    text: '教中大典，分食一整只仙人手掌。按资历，你分到一根小指。',
    options: [
      { label: '吃完', years: 2, fx: { body: 12, demon: 25 } },
      { label: '只啃指甲', years: 1, fx: { body: 5, demon: 8 } },
      { label: '趁乱带走教典', years: 1, risk: { p: 0.5, win: { skill: 'body', qi: 0.5 }, lose: { life: -10 } } }
    ]
  },
  {
    id: 's_black', type: 'story', line: '丹盟', layers: [0, 1], need: ['deadbeat'], title: '丹盟的黑名单',
    text: '丹盟每间铺子门口都贴了你的名字，下面一行小字：此人与狗不得赊账。',
    options: [
      { label: '认栽，连本带利还清', years: 1, cost: { qi: 0.5 }, fx: { mark: 'credit', unmark: 'deadbeat' } },
      { label: '蒙面去买', years: 1, risk: { p: 0.5, win: { qi: 0.4 }, lose: { demon: 6 } } },
      { label: '让二掌柜徒弟把名字划了', need: ['manager'], years: 1, fx: { demon: -5, unmark: 'deadbeat' } }
    ]
  },
  {
    id: 's_pill', type: 'story', line: '丹盟', layers: [0, 1], need: ['credit'], title: '老主顾的请柬',
    text: '掌柜请老主顾试吃新炉的丹。请柬上写着：这回是真的管饭。',
    options: [
      { label: '吃', years: 1, risk: { p: 0.7, win: { qi: 0.6, life: 5 }, lose: { life: -4 } } },
      { label: '讨一张丹方', years: 1, cost: { qi: 0.4 }, fx: { skill: 'pill' } },
      { label: '让徒弟带你走后门', need: ['manager'], years: 1, fx: { skill: 'pill', qi: 0.4 } }
    ]
  },
  {
    id: 's_word2', type: 'story', line: '字', layers: [0, 1], need: ['petword'], not: ['library'], title: '字生了字',
    text: '你养的那个字半夜生了一窝偏旁，满屋子乱爬。',
    options: [
      { label: '教它们排队', years: 2, fx: { mind: 3, mark: 'library' } },
      { label: '连窝卖给书院', years: 1, fx: { qi: 0.5, mark: 'academy', unmark: 'petword' } },
      { label: '放生', years: 1, fx: { demon: -8, unmark: 'petword' } }
    ]
  },
  {
    id: 's_word3', type: 'story', line: '字', layers: [0, 1], need: ['library'], title: '一屋子字',
    text: '字们自己凑成了一篇谁也没见过的功法，有几处语病。',
    options: [
      { label: '照着抄下来', years: 2, fx: { skill: 'talisman', mind: 2 } },
      { label: '让它们自己念给你听', years: 3, fx: { mind: 6 } },
      { label: '请书院的先生来校对', need: ['academy'], years: 1, fx: { skill: 'talisman', mind: 4 } }
    ]
  },
  {
    id: 's_academy', type: 'story', line: '字', layers: [0, 1], need: ['petword'], not: ['academy'], title: '缄默书院的搜查',
    text: '书院的人挨家挨户搜字。你养的那个字钻进了你的领口。',
    options: [
      { label: '把字含在嘴里', years: 1, risk: { p: 0.6, win: { mind: 2 }, lose: { demon: 6, unmark: ['petword', 'library'] } } },
      { label: '交出去', years: 1, fx: { qi: 0.3, mark: 'academy', unmark: ['petword', 'library'] } },
      { label: '说它是你自己写的', years: 1, risk: { p: 0.4, win: { mind: 4, mark: 'academy' }, lose: { life: -6 } } }
    ]
  },
  {
    id: 's_dog', type: 'story', line: '黄狗', layers: [0, 1], need: ['dog'], not: ['dog2'], title: '跟上来的黄狗',
    text: '村口那条黄狗不知什么时候跟上了你，走一步叹一口气。',
    options: [
      { label: '收留它', years: 1, fx: { demon: -10, mark: 'dog2' } },
      { label: '给它指回村的路', years: 1, fx: { mind: 1, unmark: 'dog' } },
      { label: '问它到底叹什么', years: 2, fx: { mind: 2 } }
    ]
  },
  {
    id: 'a_salt_wreck', type: 'adventure', layers: [2], title: '盐壳里的桅杆',
    text: '一道旧雷把龙舟桅杆钉进了海床。风吹过断口，响得像谁还在击鼓。',
    options: [
      { label: '沿着雷痕拆开盐壳', years: 4, fx: { edge: 9, demon: 7, gear: 1 } },
      { label: '背着桅杆走到岸上', years: 4, fx: { body: 9 } },
      { label: '坐在断口旁听完一通鼓', years: 3, fx: { mind: 8 } }
    ]
  },
  {
    id: 'i_sea_lantern', type: 'idle', layers: [2], title: '盐灯照潮',
    text: '卖灯的阿婆点了一盏盐灯。她说潮会涨到很高，但总有人要看灯回来。',
    options: [
      { label: '替她守灯', years: 2, fx: { demon: -8 } },
      { label: '记下几段潮声', years: 2, fx: { mind: 4 } },
      { label: '把温热的盐倒进阵眼', years: 1, fx: { qi: 0.12 } }
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
      { replaces: 0, label: '徒手从炉里捞一件', school: 'body', years: 2, fx: { gear: 1, body: 2 } }
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
      { replaces: 0, label: '闭着眼摸一件', school: 'luck', years: 1, fx: { gear: 2 } }
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
