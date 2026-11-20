// 给云请求加超时与断线重试。手机网络偶尔会在请求中途断开连接（ERR_CONNECTION_CLOSED 之类），
// 不重试的话一次抖动就让整轮同步失败。
// 云 SDK 自己会把读请求（GET、HEAD）重试 3 次，这里再重试会叠成十几次，所以只补它不管的 PATCH：
// 回写存档和更新成绩都是按 id 覆盖，重发无害。POST 可能已被服务端处理（新建记录、刷新令牌），不重发。
const RETRY_METHODS = ['PATCH'];
// wx.request 默认等 60 秒才算超时，连同 SDK 的重试会让「正在同步…」挂上几分钟。
const DEFAULTS = { timeout: 10000, delays: [500, 1500] };
const PASS_THROUGH = ['getStorageSync', 'setStorageSync', 'removeStorageSync', 'getAccountInfoSync', 'getRandomValues', 'navigateToMiniProgram'];

function canRetry(method, errMsg) {
  if (RETRY_METHODS.indexOf(String(method || 'GET').toUpperCase()) < 0) return false;
  const msg = String(errMsg || '').toLowerCase();
  // 主动取消不重试；超时已经等满一轮，再重试只会让界面卡得更久。
  return msg.indexOf('abort') < 0 && msg.indexOf('timeout') < 0 && msg.indexOf('time out') < 0 && msg.indexOf('timed out') < 0;
}

function createRetryWx(originalWx, options) {
  const config = Object.assign({}, DEFAULTS, options);
  const wait = config.setTimeout || setTimeout;
  const cancelWait = config.clearTimeout || clearTimeout;

  const retryWx = {
    request(req) {
      // 流式请求的数据是边到边交给调用方的，重发会让调用方收到两遍。
      if (req.enableChunked) return originalWx.request(req);
      let attempt = 0;
      let aborted = false;
      let task = null;
      let timer = null;
      const finish = (name, result) => {
        if (req[name]) req[name](result);
        if (req.complete) req.complete(result);
      };
      const send = () => {
        timer = null;
        task = originalWx.request(Object.assign({ timeout: config.timeout }, req, {
          success: (result) => finish('success', result),
          fail: (result) => {
            const errMsg = result && result.errMsg;
            if (aborted || attempt >= config.delays.length || !canRetry(req.method, errMsg)) {
              finish('fail', result);
              return;
            }
            timer = wait(send, config.delays[attempt]);
            attempt += 1;
          },
          complete: undefined
        }));
      };
      send();
      return {
        abort() {
          if (aborted) return;
          aborted = true;
          if (timer !== null) {
            cancelWait(timer);
            timer = null;
            finish('fail', { errMsg: 'request:fail abort' });
          } else if (task && typeof task.abort === 'function') {
            task.abort();
          }
        }
      };
    }
  };
  PASS_THROUGH.forEach((method) => {
    if (typeof originalWx[method] === 'function') retryWx[method] = originalWx[method].bind(originalWx);
  });
  return retryWx;
}

module.exports = { createRetryWx, canRetry };
