# 数据来源说明（v4）

面板不靠人工添加，全部由 Worker 自动抓取公开来源，存入 KV，每 2 小时更新一次；打开页面时数据超过 2 小时也会自动刷新。过期活动（有明确截止时间且已过）自动归档到「已结束」。

## 已接入来源（2026-11-20 实测条数）

| 来源 | 类型 | 条数 | 分类 | 抓取方式 | 信任标注 |
|---|---|---:|---|---|---|
| 人工核实种子 SEED | 大牌官方优惠 | 10 | AI 订阅 / VPS·云 / Crypto | 写在 worker.js 里，改种子需改代码重部署 | 官方核实 / 待核实 |
| free-for-dev | GitHub 社区清单 | 140 | 免费API·云服务 | raw README 解析，每分类最多 10 条 | 清单收录 |
| public-apis | 免费 API 目录 | 120 | 免费API | raw README 表格解析，区分免 Key / 需 Key | 清单收录 |
| GitHub Search | 最新免费项目 | 91 | GitHub 最新 | 官方 Search API，5 个查询去重 | 清单收录 |
| OzBargain | 澳洲羊毛社区 RSS | 30 | 全球羊毛 | RSS 解析 | 社区爆料 |
| V2EX | 中文社区 Atom | 0-20 | 全球羊毛 | Atom 解析 + 关键词过滤（免费/优惠/折扣/促销/羊毛等）；当天无相关帖时为 0，属正常 | 社区爆料 |
| Hacker News (Algolia) | 科技情报 | 30 | 全球羊毛 | Algolia 搜索 free tier / free plan / free credits | 社区爆料 |
| Telegram GrabFreeGames | 免费游戏频道 | 12 | 全球羊毛 | t.me/s 公开预览页解析 | 社区爆料 |

合计约 433 条（去重后）。

## 试过但没接入的来源（原因写清楚，不造假）

| 来源 | 结果 |
|---|---|
| Pepper 系：mydealz（德国）、hotukdeals（英国）、dealabs（法国）、chollometro（西语） | 官方 RSS 路径全部 404/被拒，服务端抓不到，未接入 |
| Reddit r/freebies、r/deals | 服务端请求被 Reddit 拒绝（404/限流），未接入 |
| Telegram @freebies 等泛赠品频道 | 能抓但内容是低质抽奖刷屏，经质量筛选后放弃；只保留 GrabFreeGames 这类垂直优质频道 |

## 怎么加新来源（改 worker.js 一个文件）

1. **RSS/Atom 站**：在 `RSS_FEEDS` 数组加一项 `{prefix, url, cat, type, region, source, cap}`，可选 `keywords` 正则过滤。解析器 `parseRSS` 通用，不用改。
2. **Telegram 公开频道**：在 `TG_CHANNELS` 数组加 `[频道名, 显示名]`。只加有公开预览（t.me/s/ 能打开）且内容优质的频道。
3. **GitHub 搜索**：在 `fetchGitHub` 的 `queries` 数组加查询字符串即可。
4. **新的结构化 API**：仿照 `fetchHN` 写一个 fetcher，在 `refresh()` 里 try/catch 接入，并在 `counts` 里加计数键。单个来源失败只记 `meta.errors`，不影响其他来源。
5. 改完按 `docs/DEPLOY.md` 的「日常更新」流程部署，并访问 `/api/refresh` 验证 `meta.counts`。

## 质量规则

- 不编造优惠：抓不到就写抓不到，条数以 `/api/deals` 的 `meta` 为准。
- 社区来源统一标「社区爆料」，时效以原帖为准；清单来源标「清单收录」；只有在官方域名核实过的种子标「官方核实」。
- 灰产内容（卖号、共享账号、来路不明的 Key）不收录。
