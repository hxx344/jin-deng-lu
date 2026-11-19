# 烬灯录 · 项目约定

## 版本号

- 每个合入 `master` 的提交都带版本号：写在提交标题末尾，形如 `feat: 大机缘改为随机事件 (v1.1.0)`，并同步改 `package.json` 和 `package-lock.json` 的 `version`。
- 按改动类型递增：`feat` 升中间一位、末位归零（v1.1.0 → v1.2.0）；`fix` 和其他类型（`docs`、`refactor`、`test`、`chore` 等）升末位（v1.1.0 → v1.1.1）。第一位只在用户明确要求时升。
- 版本号在合入 `master` 时确定，取当时 `master` 上 `package.json` 的版本再递增。并行分支上的中间提交不各自占号，合入时压成或归并为一个带版本号的提交。
- `docs/体验版更新记录.md` 记的是微信体验版的构建记录，由发布流程维护，不随每次提交改动。

## 验证

- 测试：`node --test tests/game.test.js tests/audio.test.js tests/cloud.test.js tests/mountain.test.js tests/balance.test.js`。
- 平衡基线：改了规则或内容数值后，`tests/balance.test.js` 会因模拟结果变化而失败。运行 `node tools/balance/sim.js` 看全量差异，确认符合预期后运行 `node tools/balance/sim.js --write` 更新 `tools/balance/baseline.json` 和 `docs/平衡基线.md`，与规则改动一起提交。
- 浏览器预览：`node tools/preview/build.js` 生成 `tools/preview/index.html`（不入库）。预览需要 `utils/cloud-config.js`，没有时从 `utils/cloud-config.example.js` 复制一份，该文件不提交。
