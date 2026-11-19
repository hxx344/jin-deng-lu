const { cloud } = require('./utils/cloud');

App({
  // 会话只缓存一次；登录、退出后由页面调用 resetSession() 清掉。
  ensureSession() {
    if (!cloud) return Promise.resolve({ data: null, error: { message: '当前环境不支持云服务' } });
    if (!this.sessionPromise) this.sessionPromise = cloud.auth.getSession();
    return this.sessionPromise;
  },

  resetSession() {
    this.sessionPromise = null;
  }
});
