# GLOBAL DEAL HUNTER | 全球羊毛情报中心

> 每 2 小时自动巡检全球优惠、免费资源、限时活动和金融服务优惠。AI 自动发现、验证、分类、整理值得关注的优惠信息。

线上 Worker 版：https://global-deal-hunter.u20261103.workers.dev/

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

- Muse Space 版：负责每 2 小时 AI 巡检和数据库。
- Worker 版：独立镜像看板，数据内置 + 本地收藏/手动添加。
