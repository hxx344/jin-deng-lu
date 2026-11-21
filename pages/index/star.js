const game = require('../../utils/game');
const gear = require('../../utils/gear');
const { STAR_SOUNDS } = require('../../utils/audio');

const RULES = game.STAR;
const ODDS = RULES.weights.map((weight, grade) => ({ grade: grade, name: gear.GRADES[grade].name + '品', chance: weight / 10 + '%' }));
const GOLD_HOLD_MS = 600;
const TURN_MS = 180;
const NEXT_CARD_MS = 320;

function placeText(card) {
  if (card.place === 'worn') return '已穿戴';
  if (card.place === 'pack') return '已入背包';
  if (card.place === 'held') return '暂存仙星';
  return card.forge ? '锻材 +' + card.forge : '锻材已满';
}

module.exports = function starScene(audio) {
  return {
    onStarOpen() {
      if (this.state.run.phase !== 'alive' || this.act === 'thunder') return;
      this.starOpen = true;
      this.starRules = false;
      this.starSelected = this.state.run.starCards.findIndex((card) => card.shown);
      audio.play('tap');
      this.renderStar();
    },

    cancelStarTurn() {
      clearTimeout(this.starTimer);
      if (this.starOpen) {
        audio.stop('pick');
        audio.stop('lamp');
        STAR_SOUNDS.forEach((sound) => audio.stop(sound));
      }
      this.starTurn = null;
      this.starAuto = false;
    },

    onStarClose() {
      this.cancelStarTurn();
      this.starOpen = false;
      audio.play('tap');
      this.refresh();
    },

    onStarRules() {
      this.starRules = !this.starRules;
      this.renderStar();
    },

    renderStar(ready) {
      const run = this.state.run;
      let revealed = 0;
      let held = 0;
      const cards = run.starCards.map((card, index) => {
        const turning = !!this.starTurn && this.starTurn.index === index;
        const face = { id: index, delay: index * 35, shown: card.shown, turning: turning, light: turning || card.shown ? card.item.grade : -1 };
        if (card.shown) {
          revealed++;
          if (card.place === 'held') held++;
          const item = gear.describe(card.item);
          Object.assign(face, { name: item.name, grade: item.grade, slot: item.slotName, tier: item.tier, score: item.score, stats: item.text, place: placeText(card) });
        }
        return face;
      });
      const selected = cards[this.starSelected];
      this.setData({
        sheet: { kind: 'star' },
        star: {
          incense: run.incense, rules: RULES, odds: ODDS, showRules: this.starRules, tier: Math.max(1, run.battle.cleared), forgeMax: game.FORGE_MAX,
          discount: RULES.ten / RULES.single, heavenLeft: RULES.heavenPity - run.starDry, immortalLeft: RULES.immortalPity - run.starGoldDry,
          cards: cards, revealed: revealed, held: held, done: cards.length > 0 && cards.length === revealed,
          selected: selected && selected.shown ? selected : null, auto: !!this.starAuto, turning: !!this.starTurn
        }
      }, ready);
    },

    onStarDraw(e) {
      if (!this.starOpen || !game.starDraw(this.state, Number(e.currentTarget.dataset.count))) return;
      this.starRules = false;
      this.starSelected = -1;
      this.trainCache = null;
      this.gateCache = null;
      this.save();
      audio.play('lamp');
      this.renderStar();
    },

    onStarFlip(e) {
      const index = Number(e.currentTarget.dataset.index);
      const card = this.state.run.starCards[index];
      if (!this.starOpen || !card || this.starAuto || this.starTurn) return;
      if (card.shown) {
        this.starSelected = index;
        this.renderStar();
        return;
      }
      this.turnStar(index);
    },

    onStarFlipAll() {
      if (!this.starOpen || this.starTurn || this.starAuto) return;
      const index = this.state.run.starCards.findIndex((card) => !card.shown);
      if (index < 0) return;
      this.starAuto = true;
      this.turnStar(index);
    },

    turnStar(index) {
      const cards = this.state.run.starCards;
      const card = cards[index];
      const turn = { index: index };
      this.starTurn = turn;
      audio.play('pick');
      // 等牌背的光画出来再计时。离场或换档后，旧回调不能揭开后来那批牌。
      this.renderStar(() => {
        if (this.starTurn !== turn) return;
        this.starTimer = setTimeout(() => {
          if (this.starTurn !== turn) return;
          this.starTurn = null;
          card.shown = true;
          this.starSelected = index;
          audio.play(STAR_SOUNDS[card.item.grade]);
          const next = cards.findIndex((entry) => !entry.shown);
          this.starAuto = this.starAuto && next >= 0;
          this.save();
          this.renderStar();
          if (this.starAuto) this.starTimer = setTimeout(() => this.turnStar(next), NEXT_CARD_MS);
        }, card.item.grade === 4 ? GOLD_HOLD_MS : TURN_MS);
      });
    },

    onStarFinish() {
      if (!this.starOpen || !this.data.star.done) return;
      const finished = game.finishStarDraw(this.state);
      this.save();
      if (!finished) {
        this.trainOpen = false;
        this.setData({ tab: 'gear' });
        this.onStarClose();
        this.showBanner('背包已满，整理后回仙星收取暂存装备');
        return;
      }
      this.starSelected = -1;
      this.renderStar();
    }
  };
};
