// 调数值时用的速览：node tools/balance/quick.js [存档数] [世数]
const sim = require('./sim.js');
const saves = Number(process.argv[2]) || 60;
const lives = Number(process.argv[3]) || sim.CONFIG.lives;
const t = Date.now();
const d = sim.simulate({ saves: saves, lives: lives, reportLives: sim.CONFIG.reportLives.filter((n) => n <= lives) });
console.log(saves + ' 档 × ' + lives + ' 世，' + (Date.now() - t) + 'ms');
Object.keys(d.results).forEach((id) => {
  const r = d.results[id];
  console.log('\n== ' + id + '  capped=' + r.capped);
  Object.keys(r.lives).forEach((n) => {
    const l = r.lives[n];
    console.log('L' + n + ' hv=' + l.heaven + ' reach=' + Object.values(l.reach).join('/') + ' wick=' + l.wick + ' ch=' + l.choices + ' min=' + l.minutes +
      ' left=' + l.left + ' | clear/age/trib/demon=' + Object.values(l.causes).join('/') + ' | totW=' + l.totalWick + ' hvMax=' + l.heavenMax + ' known=' + l.known + ' lamps=' + l.lampsMaxed);
  });
  console.log('first: ' + Object.keys(r.firstReach).map((k) => k + ' ' + r.firstReach[k].share + '%@L' + r.firstReach[k].medianLife).join(', '));
  console.log('tribs: ' + Object.keys(r.tribs).map((k) => k + ' ' + r.tribs[k].perLife + 'x ' + r.tribs[k].success + '%').join(', '));
  console.log('stay/first/gear: ' + Object.keys(r.tribs).map((k) => k + ' ' + r.tribs[k].stay + 'm ' + r.tribs[k].firstPass + '%(' + r.tribs[k].firstSaves + ') g' + r.tribs[k].gear).join(', '));
});
