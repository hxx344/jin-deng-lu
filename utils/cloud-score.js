// 云存档与排行榜的纯计算：分数换算、道号清洗、同步取舍、错误文案。
// 不依赖 wx，也不修改传入的状态，便于单测。
const game = require('./game');

const MAX_WICK = 9000000000000000;
const MAX_NAME = 12;

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function toInt(value, fallback) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

// 榜上的名次取「身死时的最高境界」和「这一世当前境界」里更高的那个：
// 活着的人也该在榜上，不必等到死。尚未投胎记 -1。
function scoreOf(state) {
  const s = state || {};
  const run = s.run || {};
  const stages = game.STAGES.length;
  const realms = game.REALMS.length;
  const maxIndex = stages * realms - 1;
  const born = run.phase && run.phase !== 'root';
  const current = born
    ? clamp(toInt(run.realm, 0), 0, realms - 1) * stages + clamp(toInt(run.stage, 0), 0, stages - 1)
    : -1;
  const best = toInt(s.best, -1);
  const index = clamp(Math.max(best, current), -1, maxIndex);
  return {
    realm_index: index,
    realm_name: index < 0
      ? '尚未投胎'
      : game.REALMS[Math.floor(index / stages)].name + game.STAGES[index % stages].name,
    total_wick: clamp(toInt(s.totalWick, 0), 0, MAX_WICK),
    lives: Math.max(0, toInt(s.lives, 0))
  };
}

// 上报去重：这几项没变就不用重复写库。
function scoreKey(score, name) {
  const s = score || {};
  return [toInt(s.realm_index, -1), toInt(s.total_wick, 0), toInt(s.lives, 0), String(name || '')].join('|');
}

// 没设道号时按 uid 生成一个稳定的名字，同一账号每次登录都一致。
function autoDaoName(uid) {
  const id = String(uid || '');
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // 空 uid 不生成名字，避免所有人都叫「灯客0000」。
  if (!id) return '';
  return '灯客' + h.toString(36).toUpperCase().slice(0, 4);
}

function cleanDaoName(raw) {
  const text = String(raw === null || raw === undefined ? '' : raw)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_NAME);
}

// 空档：没有轮回、积分或选择记录。新装设备登录时要让位给云端进度，
// 否则「装好先玩十秒再登录」会把另一台设备上的老档覆盖掉。
function isBlankSave(state) {
  const s = state || {};
  const run = s.run || {};
  return toInt(s.lives, 0) === 0
    && toInt(s.totalWick, 0) === 0
    && toInt(s.wick, 0) === 0
    && toInt(s.arenaPoints, 0) === 0
    && toInt(run.choices, 0) === 0;
}

// 云端比本地新才用云端的；本地还是空档时无条件让给云端。
// 时间戳相同或缺失都保留本地，避免被旧档覆盖。
function pickSave(localSavedAt, cloudSavedAt, localBlank) {
  const local = toInt(localSavedAt, 0);
  const cloud = toInt(cloudSavedAt, 0);
  if (cloud <= 0) return 'local';
  if (localBlank) return 'cloud';
  return cloud > local ? 'cloud' : 'local';
}

function friendlyError(error) {
  if (!error) return '云端暂时不可用';
  const code = error.code ? String(error.code) : '';
  if (code === 'CLOUD_UNAVAILABLE') return error.message || '当前环境不支持云服务';
  if (code === '42P01') return '云端数据表尚未创建';
  if (code === '42501') return '没有权限访问云端数据';
  if (code === '23505') return '成绩已存在，稍后会自动覆盖';
  if (code === 'PGRST301') return '登录已过期，请重新登录';
  if (code === '401' || code === '403') return '登录状态失效，请重新登录';
  // wx.request 在连接层失败时只有一串底层报错，玩家看不懂也处理不了。
  if (/wx\.request failed|request:fail|net::ERR_/i.test(String(error.message || ''))) return '网络不稳，暂时连不上云端，请稍后再试';
  return error.message || '云端暂时不可用';
}

module.exports = {
  MAX_WICK,
  MAX_NAME,
  scoreOf,
  scoreKey,
  autoDaoName,
  cleanDaoName,
  isBlankSave,
  pickSave,
  friendlyError
};
