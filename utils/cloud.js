// 单一云客户端实例。小程序使用 SDK 的 /miniprogram 子路径；诊断适配器只包裹本客户端的 wx。
// 非微信小程序运行时（例如 tools/preview 的浏览器预览）没有 wx.request，此时 cloud 为 null，
// 页面会明确显示「当前环境不支持云服务」，不会假装同步成功。
const publicConfig = require('./cloud-config');
const { createDiagnosticWx } = require('./workbuddy-cloud-diagnostics');
const { createRetryWx } = require('./cloud-retry');

let cloud = null;
let unavailableReason = '';

if (typeof wx === 'undefined' || typeof wx.request !== 'function') {
  unavailableReason = '当前不是微信小程序运行环境，云同步与排行榜需在微信中打开';
} else {
  try {
    const { createMiniProgramWorkBuddyCloud } = require('@tencent-ai/workbuddy-cloud-sdk/miniprogram');
    cloud = createMiniProgramWorkBuddyCloud({
      endpoint: publicConfig.endpoint,
      publishableKey: publicConfig.publishableKey,
      wx: createDiagnosticWx(createRetryWx(wx))
    });
  } catch (e) {
    unavailableReason = '云 SDK 初始化失败：' + (e && e.message ? e.message : '未知错误');
  }
}

module.exports = { cloud, unavailableReason };
