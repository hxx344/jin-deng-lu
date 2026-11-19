// 复制为 cloud-config.js，并填入云服务激活时下发的公开配置。
// 实际 cloud-config.js 只保留在本机，已被 .gitignore 排除。
module.exports = {
  endpoint: 'https://example.com',
  publishableKey: 'YOUR_API_KEY_HERE'
};
