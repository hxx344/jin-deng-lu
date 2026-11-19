// 云存档与全局排行榜的数据层。只负责云端读写与登录，不碰游戏状态、不改本地存档格式。
// 归属字段 owner_id 由服务端 DEFAULT auth.uid() 与 RLS 决定，客户端一律不传。
const { cloud, unavailableReason } = require('./cloud');
const { createTableAccess } = require('./workbuddy-data-access');

const UNAVAILABLE = { code: 'CLOUD_UNAVAILABLE', message: unavailableReason || '云服务未就绪' };

let saves = null;

function savesAccess() {
  if (!saves && cloud) {
    saves = createTableAccess(cloud, {
      table: 'game_saves',
      columns: ['id', 'owner_id', 'state', 'saved_at', 'updated_at'],
      fromRow: (row) => ({
        id: row.id,
        ownerId: row.owner_id,
        state: row.state,
        savedAt: Number(row.saved_at) || 0,
        updatedAt: row.updated_at
      }),
      toRow: (payload) => {
        const row = {};
        if (payload && payload.state !== undefined) row.state = payload.state;
        if (payload && payload.savedAt !== undefined) row.saved_at = payload.savedAt;
        return row;
      }
    });
  }
  return saves;
}

function fail(error) {
  return { data: null, error: error };
}

async function safe(executor) {
  try {
    return await executor();
  } catch (e) {
    return fail({ code: 'CLIENT_EXCEPTION', message: e && e.message ? e.message : '云服务请求失败' });
  }
}

function isAvailable() {
  return !!cloud;
}

function getSession() {
  if (!cloud) return Promise.resolve(fail(UNAVAILABLE));
  return safe(() => cloud.auth.getSession());
}

// 微信一键登录：wx.login 拿 code，SDK 用它换取 WorkBuddy 会话。
// appid 取当前运行时的真实 appid，体验版/正式版各用自己的值，不用 WorkBuddy 应用 ID 代替。
function signInWithWechat() {
  if (!cloud) return Promise.resolve(fail(UNAVAILABLE));
  return new Promise((resolve) => {
    wx.login({
      success: ({ code }) => {
        try {
          const appid = wx.getAccountInfoSync().miniProgram.appId;
          cloud.auth.signInWithWechat(code, appid).then(resolve, (e) => {
            console.error('[WorkBuddy Cloud] login failed', JSON.stringify({
              stage: 'wechat-login-handler',
              message: e && e.message ? e.message : '微信登录失败，请重试'
            }));
            resolve(fail({ message: '微信登录失败，请重试' }));
          });
        } catch (e) {
          console.error('[WorkBuddy Cloud] login failed', JSON.stringify({
            stage: 'wechat-login-handler',
            message: e && e.message ? e.message : '微信登录失败，请重试'
          }));
          resolve(fail({ message: '微信登录失败，请重试' }));
        }
      },
      fail: (err) => {
        console.error('[WorkBuddy Cloud] login failed', JSON.stringify({
          stage: 'wx.login',
          message: err && err.errMsg ? err.errMsg : 'wx.login 失败'
        }));
        resolve(fail({ message: '微信登录失败，请重试' }));
      }
    });
  });
}

function signOut() {
  if (!cloud) return Promise.resolve(fail(UNAVAILABLE));
  return safe(() => cloud.auth.signOut());
}

// jsonb 一般已解析成对象；个别链路会回字符串，这里统一兜底，避免整份存档被当成空档。
function parseState(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

// 云存档：RLS 只放行本人这一行，list() 最多返回一条。
function pullSave() {
  const access = savesAccess();
  if (!access) return Promise.resolve(fail(UNAVAILABLE));
  return safe(async () => {
    const { data, error } = await access.list();
    if (error) return fail(error);
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) return { data: null, error: null };
    const row = rows[0];
    return { data: Object.assign({}, row, { state: parseState(row.state) }), error: null };
  });
}

function pushSave(state, savedAt, id) {
  const access = savesAccess();
  if (!access) return Promise.resolve(fail(UNAVAILABLE));
  return safe(async () => {
    const payload = { state: state, savedAt: savedAt };
    if (id) {
      const result = await access.update(id, payload);
      if (result.error && result.error.code === 'NOT_FOUND_OR_FORBIDDEN') {
        return access.create(payload);
      }
      return result;
    }
    return access.create(payload);
  });
}

// 排行榜：公开读，本人可写自己的一行。先查后写，避免依赖 upsert 对缺省列的兼容差异。
function submitScore(uid, payload) {
  if (!cloud) return Promise.resolve(fail(UNAVAILABLE));
  if (!uid) return Promise.resolve(fail({ message: '需要先登录才能上报成绩' }));
  return safe(async () => {
    const own = await cloud.database.from('leaderboard')
      .select('id')
      .eq('owner_id', uid)
      .maybeSingle();
    if (own.error) return fail(own.error);

    if (own.data) {
      const updated = await cloud.database.from('leaderboard')
        .update(payload)
        .eq('id', own.data.id)
        .select('id');
      if (updated.error) return fail(updated.error);
      if (!Array.isArray(updated.data) || updated.data.length === 0) {
        return fail({ message: '成绩更新未生效，请重新登录后重试' });
      }
      return { data: true, error: null };
    }

    const inserted = await cloud.database.from('leaderboard').insert(payload);
    if (!inserted.error) return { data: true, error: null };
    // 两台设备同时首次上报时会撞唯一约束，重新读一次自己的行再更新。
    if (inserted.error.code === '23505') {
      const again = await cloud.database.from('leaderboard')
        .select('id')
        .eq('owner_id', uid)
        .maybeSingle();
      if (again.error || !again.data) return fail(inserted.error);
      const retry = await cloud.database.from('leaderboard')
        .update(payload)
        .eq('id', again.data.id)
        .select('id');
      if (retry.error) return fail(retry.error);
      if (!Array.isArray(retry.data) || retry.data.length === 0) {
        return fail({ message: '成绩更新未生效，请重新登录后重试' });
      }
      return { data: true, error: null };
    }
    return fail(inserted.error);
  });
}

function fetchBoard() {
  if (!cloud) return Promise.resolve({ data: [], error: UNAVAILABLE });
  return safe(async () => {
    const { data, error } = await cloud.database.from('leaderboard')
      .select('owner_id,dao_name,realm_index,realm_name,total_wick,lives')
      .order('realm_index', { ascending: false })
      .order('total_wick', { ascending: false })
      .limit(20);
    if (error) return { data: [], error: error };
    return { data: Array.isArray(data) ? data : [], error: null };
  });
}

// 名次 = 比自己强的人数 + 1。排序口径必须与 fetchBoard 一致：
// 先比境界，再比累计灯芯。用 count + head 只回计数，不拉整表。
function fetchMyRank(score) {
  if (!cloud) return Promise.resolve({ data: 0, error: UNAVAILABLE });
  const s = score || {};
  const rawRealm = Math.floor(Number(s.realm_index));
  const rawWick = Math.floor(Number(s.total_wick));
  const realm = Number.isFinite(rawRealm) ? rawRealm : -1;
  const wick = Number.isFinite(rawWick) ? Math.max(0, rawWick) : 0;
  return safe(async () => {
    const { count, error } = await cloud.database.from('leaderboard')
      .select('id', { count: 'exact', head: true })
      .or('realm_index.gt.' + realm + ',and(realm_index.eq.' + realm + ',total_wick.gt.' + wick + ')');
    if (error) return { data: 0, error: error };
    const better = Number(count);
    return { data: (Number.isFinite(better) ? better : 0) + 1, error: null };
  });
}

module.exports = {
  isAvailable,
  unavailableReason,
  getSession,
  signInWithWechat,
  signOut,
  pullSave,
  pushSave,
  submitScore,
  fetchBoard,
  fetchMyRank
};
