# GLOBAL DEAL HUB | 全球羊毛情报中心

> 每 2 小时自动巡检全球优惠、免费资源、限时活动和金融服务优惠。AI 自动发现、验证、分类、整理值得关注的优惠信息。

线上 Worker 版（主面板）：https://global-deal-hunter.u20261103.workers.dev/

v14 新增关键词订阅「我的关注」：用户自填关键词（存浏览器本地，零额外请求），命中的羊毛朱红高亮 + 专区展示 + 专属筛选，附一键添加的推荐关键词。v13 补齐空投与免费 VPS：空投任务平台（Galxe/Layer3/Zealy/Intract/TaskOn/Earni.fi）、免费搞 U（Coinbase Earn/OKX/Bitget 新人任务/Freecash）、AirdropAlert RSS、3 个 Telegram 空投频道（加密空投类共 56 条）、免费 VPS/主机种子（波兰 Serv00/CT8、Hax、Alwaysdata、InfinityFree），总量 858 条。v12 新增优先推荐模块：服务端评分（人工核实种子/Epic 周免/高星项目/高价值限免/48 小时内截止加急），精选卡片金色发光高亮，首页顶部有优先推荐专区，另有同名筛选标签。v11 省流模式：Cron 改为每 6 小时、页面过期阈值 6 小时、手动刷新 30 分钟节流、API 边缘缓存 10 分钟，保护 Workers 免费额度。v10 新增 U 卡（RedotPay/Bybit/OKX/Crypto.com/Coinbase/Nexo 官方页）与 6 个 YouTube 羊毛频道（DealMoon 北美省钱君、The Deal Guy、Hip2Save、Slickdeals、Krazy Coupon Lady、老郭种树）。v9 新增 9 个 RSS 源（IT之家/小众软件/异次元/LowEndBox/美国信用卡指南/DansDeals/9to5Toys/SharewareOnSale/freeCodeCamp）+ GamerPower 与 Epic 免费游戏 API，总量 800+ 条。v8 新增界面开关：中英双语切换 + 明暗双主题（暗色也是深炭金线贵族风），偏好保存在浏览器本地。v7 新增免费出图/视频 API 官方渠道、免费素材 API、GitHub 自媒体工具（MoneyPrinterTurbo 等 39 条）、搞钱电子书与指南（38 条），总量 655 条。v6 新增 AI 中转生态：free-newapi 导航（官方免费额度渠道 16 + 公益中转站 14 + 自建工具）、awesome-free-llm-apis 永久免费 LLM 清单（15 家）、GitHub 网关项目扩搜（LiteLLM / New-API / One-API / OmniRoute 等），总量 612 条。品牌为 **GLOBAL DEAL HUB**。Worker 为主面板并**全自动更新**：Cron 每 2 小时抓取 12+ 公开来源（人工核实种子、free-for-dev、public-apis、GitHub Search、Slickdeals、OzBargain、Doctor of Credit、Frequent Miler、Airdrops.io、Giveaway of the Day、Hacker News、V2EX、Telegram 免费游戏频道）写入 KV，共 500+ 条；两级分类（大类 + 小类）+ 分页浏览（每页 24 条）；过期自动归档。不再有手动添加，不依赖 Muse Space。来源明细见 docs/SOURCES.md，手把手部署见 docs/DEPLOY.md。

## 功能

- 深色信号风看板：进行中 / 今日更新 / 7 天内截止 / 待核实
- 分类：AI 订阅、Crypto 空投·积分、U 卡、海外银行、VPS·云、软件·数字
- 搜索、条件类型筛选、收藏、手动添加（Worker 版存浏览器本地）
- 未在官方域名核实的条目标「待核实」，不编造优惠
- 新增「免费算力组合 · 算力管理」专区：
  - Kaggle 免费 GPU T4 x2（等待用户登录/手机验证）
  - Google Colab 免费 T4（等待用户登录，免费版禁止代理/网页服务器）
  - Simular Box 免费云电脑（5,000 credits / 90 天）
  - InstaBox 免费云电脑（4 核 8G，闲置 30 分钟暂停）
  - Cloady 免费档（待核实，未确认 $0.00/mo 不部署）
  - Railway VLESS（政策禁止，已停止）

## 目录

```text
worker/
  worker.js   Cloudflare Worker 单文件版（看板 + /api/deals）
docs/
  DEPLOY.md   Cloudflare Worker 部署说明
  RESOURCES.md 免费算力组合的规格、限制与验证方法
```

## 快速部署（Cloudflare Worker）

见 [docs/DEPLOY.md](docs/DEPLOY.md)。不要把任何 API 令牌写进代码或提交到本仓库。

## 安全说明

- 本仓库不包含任何令牌、密码、验证码、支付信息或节点链接。
- 免费资源开通时，遇到登录、授权、手机验证码、密码输入，应由账号本人完成。
- 节点链接、UUID 等敏感信息只保存在本地，不要提交到 GitHub。

## 状态

- Worker 版：主面板，自动抓取 + KV 缓存 + Cron 定时更新。
- Muse Space 版：已停用为主数据源（历史版本）。
