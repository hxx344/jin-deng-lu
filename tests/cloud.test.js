const assert = require('node:assert');
const test = require('node:test');
const { scoreOf, scoreKey, autoDaoName, cleanDaoName, isBlankSave, pickSave, friendlyError } = require('../utils/cloud-score');
const { createRetryWx, canRetry } = require('../utils/cloud-retry');

// 只造 scoreOf 真正会读的字段，避免把规则层整份状态搬进测试。
function aliveState(realm, stage, extra) {
  return Object.assign({ run: { phase: 'alive', realm: realm, stage: stage }, best: -1, totalWick: 0, lives: 0 }, extra);
}

test('名次分：尚未投胎记 -1', () => {
  const score = scoreOf({ run: { phase: 'root' }, best: -1, totalWick: 0, lives: 0 });
  assert.strictEqual(score.realm_index, -1);
  assert.strictEqual(score.realm_name, '尚未投胎');
});

test('名次分：按境界和阶段算出序号与名字', () => {
  assert.deepStrictEqual(scoreOf(aliveState(0, 0)).realm_name, '凡胎前期');
  const mid = scoreOf(aliveState(2, 1));
  assert.strictEqual(mid.realm_index, 7);
  assert.strictEqual(mid.realm_name, '筑基中期');
  assert.strictEqual(scoreOf(aliveState(3, 2)).realm_index, 11);
  const yuan = scoreOf(aliveState(4, 0));
  assert.strictEqual(yuan.realm_index, 12);
  assert.strictEqual(yuan.realm_name, '元婴前期');
});

test('名次分：取身死最高境界和当前境界里更高的那个', () => {
  const dead = scoreOf({ run: { phase: 'root' }, best: 5, totalWick: 10, lives: 2 });
  assert.strictEqual(dead.realm_index, 5);
  assert.strictEqual(dead.realm_name, '引气后期');
  const climbed = scoreOf(aliveState(1, 0, { best: 2 }));
  assert.strictEqual(climbed.realm_index, 3);
});

test('名次分：best 为 0 不能被当成缺失值', () => {
  const score = scoreOf({ run: { phase: 'root' }, best: 0, totalWick: 4, lives: 1 });
  assert.strictEqual(score.realm_index, 0);
  assert.strictEqual(score.realm_name, '凡胎前期');
});

test('名次分：越界与脏数据都被夹住', () => {
  const high = scoreOf(aliveState(99, 99, { totalWick: 1e18, lives: -3 }));
  const content = require('../utils/content');
  assert.strictEqual(high.realm_index, content.REALMS.length * content.STAGES.length - 1);
  assert.strictEqual(high.total_wick, 9000000000000000);
  assert.strictEqual(high.lives, 0);
  const dirty = scoreOf({ run: { phase: 'alive', realm: 'x', stage: null }, best: NaN, totalWick: 'bad', lives: 2.7 });
  assert.strictEqual(dirty.realm_index, 0);
  assert.strictEqual(dirty.total_wick, 0);
  assert.strictEqual(dirty.lives, 2);
});

test('同步取舍：云端更新才用云端，其余保留本地', () => {
  assert.strictEqual(pickSave(100, 200), 'cloud');
  assert.strictEqual(pickSave(200, 100), 'local');
  assert.strictEqual(pickSave(200, 200), 'local');
  assert.strictEqual(pickSave(0, 0), 'local');
  assert.strictEqual(pickSave(200, 0), 'local');
  assert.strictEqual(pickSave(0, 200), 'cloud');
});

test('同步取舍：本地还是空档时让位给云端，哪怕本地时间戳更新', () => {
  // 新装设备先玩了几秒再登录：本地更新但没进度，不能覆盖云端老档。
  assert.strictEqual(pickSave(500, 100, true), 'cloud');
  assert.strictEqual(pickSave(500, 0, true), 'local');
  assert.strictEqual(pickSave(100, 500, false), 'cloud');
});

test('空档判定：有轮回、灯芯、论道积分或选择记录时视为已有进度', () => {
  assert.strictEqual(isBlankSave({ run: { phase: 'root', choices: 0 }, lives: 0, totalWick: 0, wick: 0 }), true);
  assert.strictEqual(isBlankSave({ run: { phase: 'root', choices: 1 }, lives: 0, totalWick: 0, wick: 0 }), false);
  assert.strictEqual(isBlankSave({ run: { phase: 'root' }, lives: 1, totalWick: 0, wick: 0 }), false);
  assert.strictEqual(isBlankSave({ run: { phase: 'root' }, lives: 0, totalWick: 3, wick: 0 }), false);
  assert.strictEqual(isBlankSave({ run: { phase: 'root' }, lives: 0, totalWick: 0, wick: 5 }), false);
  assert.strictEqual(isBlankSave({ run: { phase: 'alive', choices: 0 }, arenaPoints: 3 }), false);
  assert.strictEqual(isBlankSave(null), true);
});

test('道号：去空白、去控制字符、最多 12 个字', () => {
  assert.strictEqual(cleanDaoName('  无名  '), '无名');
  assert.strictEqual(cleanDaoName('灯\u0000客\n一'), '灯客一');
  assert.strictEqual(cleanDaoName('一二三四五六七八九十十一十二'), '一二三四五六七八九十十一');
  assert.strictEqual(cleanDaoName(null), '');
  assert.strictEqual(cleanDaoName(123), '123');
});

test('默认道号：同一 uid 稳定，空 uid 不生成', () => {
  const name = autoDaoName('user-abc');
  assert.strictEqual(name, autoDaoName('user-abc'));
  assert.ok(name.indexOf('灯客') === 0);
  assert.notStrictEqual(name, autoDaoName('user-abd'));
  assert.strictEqual(autoDaoName(''), '');
});

test('上报去重键：名次、灯芯、世数或道号任一变化都要重报', () => {
  const base = scoreOf(aliveState(1, 1, { totalWick: 50, lives: 3 }));
  const key = scoreKey(base, '灯客A');
  assert.strictEqual(scoreKey(base, '灯客A'), key);
  assert.notStrictEqual(scoreKey(scoreOf(aliveState(1, 2, { totalWick: 50, lives: 3 })), '灯客A'), key);
  assert.notStrictEqual(scoreKey(scoreOf(aliveState(1, 1, { totalWick: 51, lives: 3 })), '灯客A'), key);
  assert.notStrictEqual(scoreKey(scoreOf(aliveState(1, 1, { totalWick: 50, lives: 4 })), '灯客A'), key);
  assert.notStrictEqual(scoreKey(base, '灯客B'), key);
});

test('错误文案：常见错误码翻成人话，未知错误保留原消息', () => {
  assert.strictEqual(friendlyError({ code: '42P01' }), '云端数据表尚未创建');
  assert.strictEqual(friendlyError({ code: '42501' }), '没有权限访问云端数据');
  assert.strictEqual(friendlyError({ code: 'PGRST301' }), '登录已过期，请重新登录');
  assert.strictEqual(friendlyError({ message: '网络超时' }), '网络超时');
  assert.strictEqual(friendlyError(null), '云端暂时不可用');
});

test('错误文案：断网、连接被关闭这类网络错误不把原始报错甩给玩家', () => {
  const text = '网络不稳，暂时连不上云端，请稍后再试';
  assert.strictEqual(friendlyError({ message: 'Error: wx.request failed: request:fail errcode:-100 cronet_error_code:-100 error_msg:net::ERR_CONNECTION_CLOSED' }), text);
  assert.strictEqual(friendlyError({ code: 'CLIENT_EXCEPTION', message: 'wx.request failed: request:fail timeout' }), text);
  assert.strictEqual(friendlyError(new Error('wx.request failed: request:fail -109:net::ERR_ADDRESS_UNREACHABLE')), text);
});

// 假的 wx.request：按脚本依次回成功或失败，记录每次发出的请求。
function fakeWx(script) {
  const sent = [];
  return {
    sent: sent,
    request(req) {
      sent.push(req);
      const step = script[sent.length - 1];
      const task = { aborted: false, abort() { task.aborted = true; req.fail({ errMsg: 'request:fail abort' }); } };
      if (step === 'hang') return task;
      if (step === 'ok') req.success({ statusCode: 200, data: '[]', header: {} });
      else req.fail({ errMsg: step });
      return task;
    },
    getStorageSync: (key) => 'value-of-' + key
  };
}

const CLOSED = 'request:fail errcode:-100 cronet_error_code:-100 error_msg:net::ERR_CONNECTION_CLOSED';
// 不真的等：把重试间隔记下来，由测试手动放行。
function manualTimers() {
  const pending = [];
  return {
    pending: pending,
    setTimeout: (fn, ms) => { pending.push({ fn: fn, ms: ms }); return pending.length; },
    clearTimeout: (id) => { pending[id - 1] = null; },
    run() { const next = pending.shift(); if (next) next.fn(); }
  };
}

test('断线重试：回写中途断开会自动重发，成功后只回调一次', () => {
  const wx = fakeWx([CLOSED, CLOSED, 'ok']);
  const timers = manualTimers();
  const results = [];
  createRetryWx(wx, timers).request({ url: 'u', method: 'PATCH', success: (r) => results.push(r.statusCode), fail: (r) => results.push(r.errMsg) });
  assert.strictEqual(wx.sent.length, 1);
  assert.strictEqual(wx.sent[0].timeout, 10000);
  assert.deepStrictEqual(results, []);
  timers.run();
  timers.run();
  assert.strictEqual(wx.sent.length, 3);
  assert.deepStrictEqual(results, [200]);
});

test('断线重试：一直连不上时重发两次后把最后的错误交回去', () => {
  const wx = fakeWx([CLOSED, CLOSED, CLOSED, CLOSED]);
  const timers = manualTimers();
  const results = [];
  createRetryWx(wx, timers).request({ url: 'u', method: 'PATCH', success: () => results.push('ok'), fail: (r) => results.push(r.errMsg) });
  timers.run();
  timers.run();
  timers.run();
  assert.strictEqual(wx.sent.length, 3);
  assert.deepStrictEqual(results, [CLOSED]);
});

test('断线重试：新建类请求、SDK 自己会重试的读请求、超时和流式请求不重发', () => {
  assert.strictEqual(canRetry('POST', CLOSED), false);
  assert.strictEqual(canRetry('GET', CLOSED), false);
  assert.strictEqual(canRetry(undefined, CLOSED), false);
  assert.strictEqual(canRetry('patch', CLOSED), true);
  assert.strictEqual(canRetry('PATCH', 'request:fail timeout'), false);
  assert.strictEqual(canRetry('PATCH', 'request:fail abort'), false);
  const wx = fakeWx([CLOSED, CLOSED]);
  const timers = manualTimers();
  const results = [];
  const retry = createRetryWx(wx, timers);
  retry.request({ url: 'u', method: 'POST', fail: (r) => results.push(r.errMsg) });
  const chunked = { url: 'u', method: 'PATCH', enableChunked: true, fail: (r) => results.push(r.errMsg) };
  retry.request(chunked);
  assert.strictEqual(timers.pending.length, 0);
  assert.strictEqual(wx.sent[1], chunked);
  assert.deepStrictEqual(results, [CLOSED, CLOSED]);
});

test('断线重试：等待重发期间取消就不再发，进行中的请求照常取消；存储接口原样透传', () => {
  const timers = manualTimers();
  const waiting = fakeWx([CLOSED, 'ok']);
  const results = [];
  const task = createRetryWx(waiting, timers).request({ url: 'u', method: 'PATCH', fail: (r) => results.push(r.errMsg) });
  task.abort();
  timers.run();
  assert.strictEqual(waiting.sent.length, 1);
  assert.deepStrictEqual(results, ['request:fail abort']);

  const flying = fakeWx(['hang']);
  const retry = createRetryWx(flying, timers);
  const flyingResults = [];
  retry.request({ url: 'u', fail: (r) => flyingResults.push(r.errMsg) }).abort();
  assert.strictEqual(flying.sent.length, 1);
  assert.deepStrictEqual(flyingResults, ['request:fail abort']);
  assert.strictEqual(retry.getStorageSync('k'), 'value-of-k');
});
