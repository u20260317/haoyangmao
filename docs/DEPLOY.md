# 手把手部署教程：GLOBAL DEAL HUB Worker（v11）

跟着做，零基础也能部署成功。全程免费（Cloudflare Workers 免费计划足够），不需要绑卡。

- Worker 名称：`global-deal-hunter`
- 唯一代码文件：`worker/worker.js`（单文件，包含页面、抓取、解析、接口全部逻辑）
- KV 绑定名：`DEALS_KV`（KV 命名空间标题：`global-deal-hunter-deals`）
- Cron：`23 */6 * * *`（每 6 小时自动抓取一次，时间为 UTC）
- 线上实例：https://global-deal-hunter.u20261103.workers.dev/

---

## 方法 A：在 Cloudflare 网页后台手动部署（推荐新手）

### 第 1 步：注册并登录 Cloudflare
1. 打开 https://dash.cloudflare.com/ ，用邮箱注册/登录。
2. 如果它让你添加网站/域名，可以跳过，Workers 不需要自己的域名。

### 第 2 步：先建 KV 存储（页面数据存这里）
1. 左侧菜单点 **Storage & Databases → KV**。
2. 点 **Create namespace**，名字填 `global-deal-hunter-deals`，点 Add。
3. 建好后不用管它，下一步绑定。

### 第 3 步：创建 Worker 并粘贴代码
1. 左侧菜单点 **Compute (Workers) → Workers & Pages → Create → Worker**。
2. 名字填 `global-deal-hunter`，点 Deploy（先部署一个默认的 Hello World）。
3. 部署完成后点 **Edit code**，把编辑器里的默认代码**全选删掉**。
4. 打开本仓库的 `worker/worker.js`，把全部内容复制粘贴进去（也可以把文件直接拖进编辑器区域）。
5. 点右上角 **Deploy**。

### 第 4 步：给 Worker 绑定 KV（不绑这步数据存不住）
1. 回到这个 Worker 的页面，点 **Settings → Bindings → Add → KV namespace**。
2. Variable name 填 `DEALS_KV`（必须一字不差，全大写）。
3. KV namespace 下拉选择 `global-deal-hunter-deals`。
4. 保存后重新 Deploy 一次。

### 第 5 步：设置每 6 小时自动抓取（Cron）
1. 还在这个 Worker 页面，点 **Settings → Triggers → Cron Triggers → Add Cron Trigger**。
2. 填 `23 */6 * * *`，保存。
3. 含义：每 6 小时的第 7 分钟自动运行一次抓取（避开整点高峰）。

### 第 6 步：验证成功
1. 打开 `https://global-deal-hunter.<你的子域>.workers.dev/` ，能看到深色面板即成功。
2. 打开 `https://global-deal-hunter.<你的子域>.workers.dev/api/deals` ，返回一大段 JSON、里面 `meta.total` 是几百条，即抓取正常。
3. 第一次打开 `/api/deals` 时如果 KV 是空的，它会自动现场抓一次，大约等 10-20 秒，属正常。
4. 想立刻强制刷新：访问 `/api/refresh`。

---

## 方法 B：用 API 部署（适合批量/自动化，也就是本项目实际用的方式）

### 第 1 步：创建 API Token
1. Cloudflare 右上角头像 → **My Profile → API Tokens → Create Token**。
2. 选择模板 **“Edit Cloudflare Workers”**（它包含 Workers Scripts 编辑、KV 编辑、Account 读取等所需权限）。
3. 创建后复制 Token。**Token 只保存到密码管理器/安全保险库，不要写进代码、不要提交到 GitHub、不要发到聊天里。**

### 第 2 步：验证 Token 并查 Account ID
```bash
curl -s https://api.cloudflare.com/client/v4/user/tokens/verify -H "Authorization: Bearer <TOKEN>"
curl -s https://api.cloudflare.com/client/v4/accounts -H "Authorization: Bearer <TOKEN>"
```
记下返回的 account `id`（下文记为 `<ACCOUNT_ID>`）。

### 第 3 步：创建 KV 命名空间
```bash
curl -s -X POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/storage/kv/namespaces \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"title":"global-deal-hunter-deals"}'
```
记下返回的 namespace `id`（下文记为 `<KV_ID>`）。

### 第 4 步：上传 Worker（带 KV 绑定）
准备 `metadata.json`：
```json
{"main_module":"worker.js","compatibility_date":"2024-11-01","bindings":[{"type":"kv_namespace","name":"DEALS_KV","namespace_id":"<KV_ID>"}]}
```
上传：
```bash
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/global-deal-hunter" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "worker.js=@worker/worker.js;type=application/javascript+module"
```

### 第 5 步：启用 workers.dev 子域
```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/global-deal-hunter/subdomain" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"enabled":true}'
```

### 第 6 步：设置 Cron
```bash
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/global-deal-hunter/schedules" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '[{"cron":"23 */6 * * *"}]'
```

### 第 7 步：验证（同方法 A 第 6 步）

---

## 日常更新怎么做（以后都按这个流程）

1. 改 `worker/worker.js`（加数据源、改页面都在这一个文件里，见 `docs/SOURCES.md`）。
2. 本地先过语法检查：`node --check worker/worker.js`。
3. 重新部署（方法 A 重新粘贴，或方法 B 第 4 步重新上传；KV 绑定和 Cron 不用重设，上传时带上 metadata 里的 bindings 即可）。
4. 访问 `/api/refresh` 强制抓一次，检查 `/api/deals` 里 `meta.counts` 各来源条数和 `meta.errors` 是否为空。
5. 把新版 `worker.js` 和文档同步提交回本 GitHub 仓库，保持仓库与线上一致。

## 常见问题

- **页面能开但列表是空的/一直加载**：多半是 KV 没绑定或绑定名写错，必须是 `DEALS_KV`。
- **`/api/deals` 里某个来源是 0 或报错**：看 `meta.errors`。对方站点限流/改版时单个来源失败不会拖垮全站，其余来源照常。
- **改了代码但线上没变化**：浏览器缓存，地址后面加 `?v=2` 强刷；或 KV 是最终一致性，写入后全球同步最多约 1 分钟。
- **Cron 没跑**：确认 Triggers 里 Cron 还在；注意 Cron 时间是 UTC。也可以随时用 `/api/refresh` 手动触发。
- **免费额度**：Workers 免费计划每天 100,000 次请求、KV 免费额度对本项目（每 6 小时写 2 个键）绰绰有余。
- **安全**：仓库和代码里永远不要出现 Token、密码、验证码、节点链接。GitHub 仓库的 `.gitignore` 已拦截 `.env` 和 `*secret*` 等文件。
