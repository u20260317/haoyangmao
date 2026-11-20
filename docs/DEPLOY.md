# Cloudflare Worker 部署说明

Worker 名称：`global-deal-hunter`
入口文件：`worker/worker.js`
线上地址：https://global-deal-hunter.u20261103.workers.dev/

## 前置条件

- 一个 Cloudflare 账号
- 一个 API Token，使用官方模板 “Edit Cloudflare Workers” 创建
- Token 只通过安全方式保存和使用，绝不写进代码、README 或 Git 提交

## 用 API 部署（概要）

1. 验证 Token：`GET https://api.cloudflare.com/client/v4/user/tokens/verify`
2. 查 Account ID：`GET https://api.cloudflare.com/client/v4/accounts`
3. 上传脚本（multipart，`metadata` + `worker.js` 模块）：
   `PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/global-deal-hunter`
   - metadata: `{"main_module":"worker.js","compatibility_date":"2024-11-01"}`
4. 启用 workers.dev：`POST .../workers/scripts/global-deal-hunter/subdomain`，body `{"enabled":true}`
5. 验证：打开线上地址，检查首页和 `/api/deals` 是否正常返回。

## 回滚

重新上传上一个已知可用的 `worker.js` 版本即可。Git 历史里保留每次备份的版本。
