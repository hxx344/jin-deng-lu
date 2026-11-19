const assert = require('node:assert');
const fs = require('node:fs');
const test = require('node:test');
const balance = require('../tools/balance/sim');

const HINT = '\n规则或内容的改动影响了平衡。运行 node tools/balance/sim.js 查看完整差异；' +
  '确认符合预期后运行 node tools/balance/sim.js --write 更新基线。';

test('平衡基线：小样本模拟的结果与基线一致', () => {
  const base = balance.readBaseline();
  assert.ok(base, '缺少 tools/balance/baseline.json');
  const now = balance.simulate(base.check.config);
  const changes = balance.diff(base.check.results, now.results);
  assert.strictEqual(changes.length, 0, '与基线有 ' + changes.length + ' 项不同，例如 ' +
    changes.slice(0, 5).map((item) => item.path + '：' + JSON.stringify(item.base) + ' → ' + JSON.stringify(item.now)).join('；') + HINT);
});

test('平衡基线：没有活不死的局，认真玩不比随手玩差', () => {
  const base = balance.readBaseline();
  Object.keys(base.results).forEach((id) => assert.strictEqual(base.results[id].capped, 0, id + ' 有走不完的一世'));
  const last = String(base.config.lives);
  assert.ok(base.results.careful.lives[last].totalWick > base.results.casual.lives[last].totalWick);
});

test('平衡基线：文档与基线数据同步', () => {
  const doc = fs.readFileSync(balance.DOC_FILE, 'utf8').replace(/\r\n/g, '\n');
  assert.strictEqual(doc, balance.render(balance.readBaseline()) + '\n', 'docs/平衡基线.md 不是由当前基线生成的' + HINT);
});
