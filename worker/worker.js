// GLOBAL DEAL HUB | 全球羊毛情报中心 — Cloudflare Worker v5（自动更新版）
// 数据: KV(DEALS_KV) 缓存 + Cron 每2小时自动抓取 + 数据过期时请求触发刷新
// 来源: 人工核实种子(官方) / free-for-dev(GitHub社区清单) / public-apis(免费API目录) / GitHub Search(最新免费项目)
// 不再有手动添加: 全部自动聚合, 过期自动归档到「已结束」。

const SEED = [
  {id:"ms365",title:"Microsoft 365 Premium 1个月免费试用",cat:"AI 与订阅",sub:"办公订阅",type:"免费试用",trust:"official",valueLabel:"$19.99/月",valueNum:20,desc:"试用后自动续费 $19.99/月，需在微软账户取消",endISO:null,endLabel:"长期试用入口",url:"https://www.microsoft.com/en-us/microsoft-365/try-premium",source:"microsoft.com 官方",srcDate:"2026-11-20"},
  {id:"gai-student",title:"Google AI Pro 学生版 1年免费",cat:"AI 与订阅",sub:"学生优惠",type:"学生优惠",trust:"official",valueLabel:"$239.88",valueNum:240,desc:"美国高校学生 18+，需验证学生身份，需要绑卡；到期自动续费 $19.99/月",endISO:"2026-12-31T23:59:59Z",endLabel:"2026-12-31 截止领取",url:"https://gemini.google/students/",source:"gemini.google 官方",srcDate:"2026-11-20"},
  {id:"gai-plus-student",title:"Google AI Plus 学生版 1年免费（140+市场）",cat:"AI 与订阅",sub:"学生优惠",type:"学生优惠",trust:"official",valueLabel:"$59.88",valueNum:60,desc:"美国以外 140+ 市场高校学生，需要绑卡；到期自动续费 $4.99/月",endISO:"2026-12-31T23:59:59Z",endLabel:"2026-12-31 截止领取",url:"https://gemini.google/students/",source:"gemini.google 官方",srcDate:"2026-11-20"},
  {id:"chatgpt-vet",title:"ChatGPT Plus 美军/退伍军人 1年免费",cat:"AI 与订阅",sub:"定向优惠",type:"定向优惠",trust:"unverified",valueLabel:"$240",valueNum:240,desc:"离现役 12 个月内美国服役人员/退伍军人，ID.me 验证",endISO:null,endLabel:"名额/期限以官方页为准",url:"https://openai.com/",source:"OpenAI 官方说明（聚合核实）",srcDate:"2026-11-20"},
  {id:"oracle",title:"Oracle Cloud Always Free 永久免费云主机",cat:"云与开发",sub:"云厂商免费层",type:"永久免费",trust:"official",valueLabel:"永久免费层",valueNum:300,desc:"需要银行卡验证，Arm 容量常紧张；闲置实例可能被回收",endISO:null,endLabel:"永久免费层无截止",url:"https://www.oracle.com/cloud/free/",source:"oracle.com 官方",srcDate:"2026-11-20"},
  {id:"gcp",title:"Google Cloud $300 / 90天 + e2-micro 永久免费",cat:"云与开发",sub:"云厂商免费层",type:"免费额度",trust:"official",valueLabel:"$300",valueNum:300,desc:"新用户，需要绑卡；超免费层按标准价计费",endISO:null,endLabel:"试用 90 天",url:"https://cloud.google.com/free",source:"cloud.google.com 官方",srcDate:"2026-11-20"},
  {id:"aws",title:"AWS 新用户最高 $200 额度（最长6个月）",cat:"云与开发",sub:"云厂商免费层",type:"免费额度",trust:"official",valueLabel:"$200",valueNum:200,desc:"新 AWS 账户，$100 注册 + 完成任务再得 $100；Free 计划结束需升级付费计划",endISO:null,endLabel:"最长 6 个月",url:"https://aws.amazon.com/free/",source:"aws.amazon.com 官方",srcDate:"2026-11-20"},
  {id:"azure",title:"Azure $200 / 30天 + 12个月免费服务",cat:"云与开发",sub:"云厂商免费层",type:"免费额度",trust:"official",valueLabel:"$200",valueNum:200,desc:"新 Azure 账户，需要验证；注意超额计费",endISO:null,endLabel:"额度 30 天 / 免费服务 12 个月",url:"https://azure.microsoft.com/en-us/free/",source:"azure.microsoft.com 官方",srcDate:"2026-11-20"},
  {id:"mexc",title:"MEXC 新用户最高 10,000 USDT 任务奖励",cat:"免费搞钱",sub:"交易所活动",type:"需交易量",trust:"unverified",valueLabel:"最高 10,000 USDT",valueNum:10000,desc:"需注册/KYC/入金/交易量任务，非无条件赠送；高宣传额需高交易量，加密资产风险高",endISO:null,endLabel:"以活动页为准",url:"https://www.mexc.com/",source:"聚合站汇总，未在官方活动页完全核实",srcDate:"2026-11-20"},
  {id:"gate-kor",title:"Gate.io CandyDrop #190 KOR 空投",cat:"免费搞钱",sub:"交易所活动",type:"空投·积分",trust:"unverified",valueLabel:"18,000,000 KOR 奖池",valueNum:100,desc:"需 KYC、现货交易量任务；交易有风险",endISO:"2026-11-20T08:00:00Z",endLabel:"2026-11-20 08:00 UTC",url:"https://www.gate.io/",source:"Gate 公告（聚合核实）",srcDate:"2026-11-20"}
];

const UA = {"user-agent":"GlobalDealHub/5.0 (+https://global-deal-hunter.u20261103.workers.dev)","accept":"*/*"};

async function fetchText(url){
  const r = await fetch(url,{headers:UA, signal:AbortSignal.timeout(20000)});
  if(!r.ok) throw new Error(url+" -> "+r.status);
  return r.text();
}
async function fetchJSON(url){
  const r = await fetch(url,{headers:{...UA,"accept":"application/vnd.github+json"}, signal:AbortSignal.timeout(20000)});
  if(!r.ok) throw new Error(url+" -> "+r.status);
  return r.json();
}
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "x"; }

function parseFreeForDev(text){
  const out=[]; const perSection={}; let section="";
  for(const line of text.split("\n")){
    const h=line.match(/^##\s+(.+)/); if(h){ section=h[1].trim(); continue; }
    const m=line.match(/^\s*\*\s+\[([^\]]{1,120})\]\((https?:[^)\s]+)\)\s*[-–—]?\s*(.*)$/);
    if(!m) continue;
    const name=m[1].trim(), url=m[2], desc=(m[3]||"").replace(/\s+/g," ").trim().slice(0,220);
    if(/full.*list|see all/i.test(name) || url.includes("#")) continue;
    perSection[section]=(perSection[section]||0)+1;
    if(perSection[section]>10) continue;
    out.push({id:"ffd-"+slug(name), title:name+" — 免费层", cat:"云与开发", sub:(section||"云服务"), type:"永久免费层", trust:"list", valueLabel:section||"免费层", valueNum:0, desc:desc||"free-for-dev 社区清单收录的免费层服务", endISO:null, endLabel:"长期（以官网为准）", url, source:"free-for-dev · "+(section||"清单"), srcDate:null});
    if(out.length>=140) break;
  }
  return out;
}

function parsePublicApis(text){
  const out=[]; const perSection={}; let section="";
  for(const line of text.split("\n")){
    const h=line.match(/^###\s+(.+)/); if(h){ section=h[1].trim(); continue; }
    if(!line.startsWith("| [")) continue;
    const cells=line.split("|").map(c=>c.trim());
    // cells: ["", "[Name](url)", "Desc", "Auth", "HTTPS", "CORS", ""]
    if(cells.length<6) continue;
    const m=cells[1].match(/\[([^\]]+)\]\((https?:[^)\s]+)\)/); if(!m) continue;
    const auth=cells[3]||"";
    perSection[section]=(perSection[section]||0)+1;
    if(perSection[section]>8) continue;
    out.push({id:"pa-"+slug(m[1]), title:m[1]+" API", cat:"免费API", sub:(section||"API 目录"), type:(auth==="No"?"免费API·免Key":"免费API·需Key"), trust:"list", valueLabel:section||"免费 API", valueNum:0, desc:(cells[2]||"").slice(0,200), endISO:null, endLabel:"长期（以官网为准）", url:m[2], source:"public-apis · "+(section||"目录"), srcDate:null});
    if(out.length>=120) break;
  }
  return out;
}


function stripTags(x){ return String(x||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim(); }
function parseRSS(xml, cfg){
  const out=[];
  const blocks = xml.split(/<item>|<entry>/).slice(1);
  for(const b of blocks){
    const tm=b.match(/<title>([\s\S]*?)<\/title>/); if(!tm) continue;
    const title=stripTags(tm[1]).slice(0,160); if(!title) continue;
    let link="";
    const lm=b.match(/<link>([\s\S]*?)<\/link>/); if(lm) link=stripTags(lm[1]);
    if(!link){ const am=b.match(/<link[^>]*href="([^"]+)"/); if(am) link=am[1]; }
    if(!link) continue;
    const dm=b.match(/<(?:description|summary|content)>([\s\S]*?)<\/(?:description|summary|content)>/);
    const desc=dm?stripTags(dm[1]).slice(0,200):"";
    const pm=b.match(/<(?:pubDate|published|updated)>([\s\S]*?)<\/(?:pubDate|published|updated)>/);
    let srcDate=null; if(pm){ const d=new Date(stripTags(pm[1])); if(!isNaN(d)) srcDate=d.toISOString().slice(0,10); }
    if(cfg.keywords && !cfg.keywords.test(title+" "+desc)) continue;
    out.push({id:cfg.prefix+"-"+slug(title).slice(0,40)+"-"+Math.abs([...link].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)), title, cat:cfg.cat, sub:cfg.sub||cfg.region||"", type:cfg.type, trust:"community", valueLabel:cfg.region, valueNum:0, desc:desc||cfg.fallback, endISO:null, endLabel:"社区帖子（时效以原帖为准）", url:link, source:cfg.source, srcDate});
    if(out.length>=cfg.cap) break;
  }
  return out;
}
const TG_CHANNELS=[["GrabFreeGames","GrabFreeGames · 免费游戏"],["freegames","freegames · 免费游戏"]];

const SEED_UCARD=[
 {id:"u-redotpay",title:"RedotPay — USDT 虚拟/实体支付卡",cat:"免费搞钱",sub:"U 卡 · 加密支付卡",type:"加密支付卡",trust:"official",valueLabel:"开卡活动以官网为准",valueNum:0,desc:"香港团队的加密支付卡，支持 USDT 消费，常有免开卡费/返现活动；需 KYC，部分国家和地区受限",endISO:null,endLabel:"长期（以官网为准）",url:"https://www.redotpay.com",source:"官方页",srcDate:null},
 {id:"u-bybit",title:"Bybit Card — 交易所官方加密支付卡",cat:"免费搞钱",sub:"U 卡 · 加密支付卡",type:"加密支付卡",trust:"official",valueLabel:"返现活动以官网为准",valueNum:0,desc:"Bybit 官方 Mastercard，可绑 Apple Pay/Google Pay；开放地区与开卡奖励以官网为准，需 KYC",endISO:null,endLabel:"长期（以官网为准）",url:"https://www.bybit.com/cards",source:"官方页",srcDate:null},
 {id:"u-okx",title:"OKX Card — OKX 加密支付卡",cat:"免费搞钱",sub:"U 卡 · 加密支付卡",type:"加密支付卡",trust:"official",valueLabel:"以官网为准",valueNum:0,desc:"OKX 官方支付卡（目前以欧洲经济区等地区为主），消费返现与费用以官网为准，需 KYC",endISO:null,endLabel:"长期（以官网为准）",url:"https://www.okx.com/card",source:"官方页",srcDate:null},
 {id:"u-cryptocom",title:"Crypto.com Visa Card — 基础档免年费",cat:"免费搞钱",sub:"U 卡 · 加密支付卡",type:"加密支付卡",trust:"official",valueLabel:"基础档免年费",valueNum:0,desc:"老牌加密 Visa 卡，Midnight Blue 基础档免年费；高档需质押 CRO，返现与开放地区以官网为准",endISO:null,endLabel:"长期（以官网为准）",url:"https://crypto.com/cards",source:"官方页",srcDate:null},
 {id:"u-coinbase",title:"Coinbase Card — 美国加密借记卡",cat:"免费搞钱",sub:"U 卡 · 加密支付卡",type:"加密支付卡",trust:"official",valueLabel:"以官网为准",valueNum:0,desc:"Coinbase 官方 Visa 借记卡，主要面向美国用户，消费可得加密返现；需 KYC 与地区资格",endISO:null,endLabel:"长期（以官网为准）",url:"https://www.coinbase.com/card",source:"官方页",srcDate:null},
 {id:"u-nexo",title:"Nexo Card — 欧洲加密信用卡",cat:"免费搞钱",sub:"U 卡 · 加密支付卡",type:"加密支付卡",trust:"official",valueLabel:"以官网为准",valueNum:0,desc:"Nexo 官方 Mastercard，以加密资产抵押消费，主要面向欧洲用户；费用与返现以官网为准，需 KYC",endISO:null,endLabel:"长期（以官网为准）",url:"https://nexo.com/nexo-card",source:"官方页",srcDate:null}
];

const SEED_MEDIA=[
 {id:"m-pollinations",title:"Pollinations — 免费出图 API（免 Key）",cat:"AI 与订阅",sub:"免费出图出视频",type:"官方免费额度",trust:"official",valueLabel:"免费 · 免注册",valueNum:0,desc:"开源免费生成 API：文本/图片生成可直接通过 URL 调用，匿名可用，自媒体配图神器",endISO:null,endLabel:"长期（以官网为准）",url:"https://pollinations.ai",source:"官方页",srcDate:null},
 {id:"m-silicon-img",title:"硅基流动 — 免费生图模型（Kolors 等）",cat:"AI 与订阅",sub:"免费出图出视频",type:"官方免费额度",trust:"official",valueLabel:"部分模型免费",valueNum:0,desc:"国内直连，平台有多个免费生图/语言模型，注册后在控制台拿 Key 调用",endISO:null,endLabel:"长期（以官网为准）",url:"https://cloud.siliconflow.cn",source:"官方页",srcDate:null},
 {id:"m-modelscope-img",title:"ModelScope 魔搭 — 免费生图/视频模型 API",cat:"AI 与订阅",sub:"免费出图出视频",type:"官方免费额度",trust:"official",valueLabel:"每日免费调用次数",valueNum:0,desc:"阿里魔搭社区 3000+ 模型，API-Inference 每日有免费调用额度，含生图与视频模型",endISO:null,endLabel:"长期（以官网为准）",url:"https://modelscope.cn",source:"官方页",srcDate:null},
 {id:"m-cf-img",title:"Cloudflare Workers AI — 含生图模型免费额度",cat:"AI 与订阅",sub:"免费出图出视频",type:"官方免费额度",trust:"official",valueLabel:"每日 10,000 Neurons",valueNum:0,desc:"Workers 免费计划每日赠推理额度，模型目录含 Stable Diffusion / FLUX 等生图模型",endISO:null,endLabel:"长期（以官网为准）",url:"https://developers.cloudflare.com/workers-ai/",source:"官方页",srcDate:null},
 {id:"m-hf-img",title:"Hugging Face — 免费调用生图/视频模型",cat:"AI 与订阅",sub:"免费出图出视频",type:"官方免费额度",trust:"list",valueLabel:"每月免费额度",valueNum:0,desc:"Inference Providers 每月赠免费额度，可调用大量开源生图/视频模型，超额按量付费",endISO:null,endLabel:"长期（以官网为准）",url:"https://huggingface.co/inference-api",source:"官方页",srcDate:null},
 {id:"m-volc-img",title:"火山方舟 — 豆包生图/生视频模型免费额度",cat:"AI 与订阅",sub:"免费出图出视频",type:"官方免费额度",trust:"list",valueLabel:"每模型每日免费额度",valueNum:0,desc:"火山引擎方舟平台，新用户各模型有免费推理额度，含 Seedream 生图与 Seedance 生视频",endISO:null,endLabel:"以官网为准",url:"https://www.volcengine.com/product/ark",source:"官方页",srcDate:null},
 {id:"m-pexels",title:"Pexels API — 免费图片/视频素材",cat:"AI 与订阅",sub:"免费素材 API",type:"免费素材",trust:"official",valueLabel:"免费 API",valueNum:0,desc:"海量免费版权图片与视频素材 API，自媒体做视频找 B-roll 素材直接调用",endISO:null,endLabel:"长期",url:"https://www.pexels.com/api/",source:"官方页",srcDate:null},
 {id:"m-pixabay",title:"Pixabay API — 免费图片/视频/音乐素材",cat:"AI 与订阅",sub:"免费素材 API",type:"免费素材",trust:"official",valueLabel:"免费 API",valueNum:0,desc:"免费素材库 API，图片、视频、音乐都有，做短视频和图文号常用",endISO:null,endLabel:"长期",url:"https://pixabay.com/api/docs/",source:"官方页",srcDate:null},
 {id:"m-unsplash",title:"Unsplash API — 免费高质量图片素材",cat:"AI 与订阅",sub:"免费素材 API",type:"免费素材",trust:"official",valueLabel:"免费 API（演示额度）",valueNum:0,desc:"高质量摄影图库 API，图文内容配图常用，演示模式每小时 50 次请求",endISO:null,endLabel:"长期",url:"https://unsplash.com/developers",source:"官方页",srcDate:null}
];

const RSS_FEEDS=[
 {prefix:"oz", url:"https://www.ozbargain.com.au/deals/feed", cat:"全球购物羊毛", sub:"澳洲社区", type:"社区爆料", region:"澳大利亚", source:"OzBargain 社区", cap:30, fallback:"OzBargain 社区最新爆料"},
 {prefix:"v2ex", url:"https://www.v2ex.com/index.xml", cat:"科技情报", sub:"中文社区", type:"社区爆料", region:"中文社区", source:"V2EX 社区", cap:20, keywords:/免费|优惠|折扣|促销|羊毛|赠送|领取|白嫖|0\s?元|free|deal/i, fallback:"V2EX 社区优惠相关帖子"},
 {prefix:"doc", url:"https://www.doctorofcredit.com/feed/", cat:"免费搞钱", sub:"银行与卡奖励", type:"社区爆料", region:"美国", source:"Doctor of Credit", cap:15, fallback:"美国银行开户奖励与信用卡优惠情报"},
 {prefix:"fm", url:"https://frequentmiler.com/feed/", cat:"免费搞钱", sub:"里程积分", type:"社区爆料", region:"美国", source:"Frequent Miler", cap:15, fallback:"里程与积分优惠情报"},
 {prefix:"air", url:"https://airdrops.io/feed/", cat:"免费搞钱", sub:"加密空投", type:"空投清单", region:"全球", source:"Airdrops.io", cap:10, fallback:"最新加密空投清单"},
 {prefix:"sd", url:"https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1", cat:"全球购物羊毛", sub:"美国社区", type:"社区爆料", region:"美国", source:"Slickdeals", cap:25, fallback:"Slickdeals 首页热门优惠"},
 {prefix:"gotd", url:"https://www.giveawayoftheday.com/feed/", cat:"免费软件游戏", sub:"每日免费软件", type:"限时免费", region:"全球", source:"Giveaway of the Day", cap:10, fallback:"每日限时免费正版软件"},
 {prefix:"ithome", url:"https://www.ithome.com/rss/", cat:"科技情报", sub:"中文社区", type:"社区爆料", region:"中文社区", source:"IT之家", cap:12, keywords:/免费|优惠|折扣|限免|促销|降价|秒杀|赠送|领取/, fallback:"IT之家优惠相关资讯"},
 {prefix:"appinn", url:"https://www.appinn.com/feed/", cat:"免费软件游戏", sub:"软件发现", type:"社区爆料", region:"中文社区", source:"小众软件", cap:10, keywords:/免费|限免|优惠|折扣|赠送|正版/, fallback:"小众软件的免费/限免软件发现"},
 {prefix:"iplay", url:"https://www.iplaysoft.com/feed", cat:"免费软件游戏", sub:"软件发现", type:"社区爆料", region:"中文社区", source:"异次元软件世界", cap:12, keywords:/免费|限免|优惠|折扣|赠送|正版/, fallback:"异次元软件世界的免费/限免软件资讯"},
 {prefix:"leb", url:"https://lowendbox.com/feed/", cat:"云与开发", sub:"VPS 特价", type:"商家特价", region:"全球", source:"LowEndBox", cap:15, fallback:"LowEndBox 最新 VPS 特价"},
 {prefix:"uccg", url:"https://www.uscreditcardguide.com/feed/", cat:"免费搞钱", sub:"银行与卡奖励", type:"社区爆料", region:"美国", source:"美国信用卡指南", cap:10, fallback:"美国信用卡与银行奖励中文指南"},
 {prefix:"dans", url:"https://www.dansdeals.com/feed/", cat:"全球购物羊毛", sub:"美国社区", type:"社区爆料", region:"美国", source:"DansDeals", cap:25, fallback:"DansDeals 最新优惠"},
 {prefix:"toys", url:"https://9to5toys.com/feed/", cat:"全球购物羊毛", sub:"数码特价", type:"社区爆料", region:"美国", source:"9to5Toys", cap:20, fallback:"9to5Toys 数码产品特价"},
 {prefix:"sos", url:"https://sharewareonsale.com/feed", cat:"免费软件游戏", sub:"软件限免", type:"限时免费", region:"全球", source:"SharewareOnSale", cap:20, fallback:"SharewareOnSale 软件限免"},
 {prefix:"fcc", url:"https://www.freecodecamp.org/news/rss/", cat:"科技情报", sub:"免费教程", type:"免费教程", region:"全球", source:"freeCodeCamp", cap:10, fallback:"freeCodeCamp 免费编程教程"},
 {prefix:"yt-dm", url:"https://www.youtube.com/feeds/videos.xml?channel_id=UCrF3EFFx8eCWrKrX8ez60VQ", cat:"全球购物羊毛", sub:"YouTube 博主", type:"视频分享", region:"北美", source:"YouTube · DealMoon 北美省钱君", cap:8, fallback:"北美省钱君 DealMoon 的优惠视频"},
 {prefix:"yt-dg", url:"https://www.youtube.com/feeds/videos.xml?channel_id=UC5Qbo0AR3CwpmEq751BIy0g", cat:"全球购物羊毛", sub:"YouTube 博主", type:"视频分享", region:"美国", source:"YouTube · The Deal Guy", cap:8, fallback:"The Deal Guy 的省钱优惠视频"},
 {prefix:"yt-h2s", url:"https://www.youtube.com/feeds/videos.xml?channel_id=UC3WvpVKk_QgfNgzE5BvzdEw", cat:"全球购物羊毛", sub:"YouTube 博主", type:"视频分享", region:"美国", source:"YouTube · Hip2Save", cap:8, fallback:"Hip2Save 的优惠视频"},
 {prefix:"yt-sd", url:"https://www.youtube.com/feeds/videos.xml?channel_id=UC1Izvzn-5-PZ0SGPe03ThnA", cat:"全球购物羊毛", sub:"YouTube 博主", type:"视频分享", region:"美国", source:"YouTube · Slickdeals", cap:8, fallback:"Slickdeals 官方频道视频"},
 {prefix:"yt-kcl", url:"https://www.youtube.com/feeds/videos.xml?channel_id=UCrev69_lU9aDtEZylQnI54A", cat:"全球购物羊毛", sub:"YouTube 博主", type:"视频分享", region:"美国", source:"YouTube · Krazy Coupon Lady", cap:8, fallback:"Krazy Coupon Lady 的优惠券视频"},
 {prefix:"yt-lg", url:"https://www.youtube.com/feeds/videos.xml?channel_id=UCj7hwd3wEYYp5l9LRPAo7YA", cat:"科技情报", sub:"YouTube 博主", type:"视频分享", region:"中文", source:"YouTube · 老郭种树", cap:8, fallback:"老郭种树的技巧与羊毛视频"}
];
async function fetchHN(){
  const out=[]; const seen=new Set();
  for(const q of ["free tier","free credits"]){
    const j=await fetchJSON("https://hn.algolia.com/api/v1/search?query="+encodeURIComponent(q)+"&tags=story&hitsPerPage=15");
    for(const h of (j.hits||[])){
      if(!h.title || seen.has(h.objectID)) continue; seen.add(h.objectID);
      out.push({id:"hn-"+h.objectID, title:h.title, cat:"科技情报", sub:"Hacker News", type:"科技情报", trust:"community", valueLabel:"Hacker News", valueNum:h.points||0, desc:"Hacker News 热议的免费层/免费额度相关发布，点开看原文与讨论", endISO:null, endLabel:"情报贴", url:h.url||("https://news.ycombinator.com/item?id="+h.objectID), source:"Hacker News · "+(h.author||""), srcDate:(h.created_at||"").slice(0,10)||null});
    }
  }
  return out.slice(0,30);
}
async function fetchTelegramChannel(ch, label){
  const txt=await fetchText("https://t.me/s/"+ch);
  const out=[];
  const blocks=txt.split("tgme_widget_message ").slice(1);
  for(const b of blocks){
    const tm=b.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/); if(!tm) continue;
    const text=stripTags(tm[1]); if(text.length<10) continue;
    const lm=b.match(/href="(https:\/\/t\.me\/[^"]+)"/); const link=lm?lm[1]:("https://t.me/"+ch);
    const title=text.slice(0,120);
    out.push({id:"tg-"+ch+"-"+slug(title).slice(0,36), title, cat:"免费软件游戏", sub:"免费游戏", type:"Telegram 频道", trust:"community", valueLabel:"Telegram", valueNum:0, desc:text.slice(0,200), endISO:null, endLabel:"频道消息（时效以原帖为准）", url:link, source:"Telegram · "+label, srcDate:null});
    if(out.length>=12) break;
  }
  return out.reverse();
}

async function fetchGitHub(){
  const queries=[
    ["topic:llm-gateway","AI 网关/中转","stars"],
    ["one-api in:name","AI 中转/网关","stars"],
    ["MoneyPrinter in:name","自媒体工具","stars","GitHub 开源"],
    ["topic:short-video","自媒体工具","stars","GitHub 开源"],
    ["side-hustle in:name,description","搞钱电子书与指南","stars","免费搞钱"],
    ["副业赚钱 in:name,description","搞钱电子书与指南","stars","免费搞钱"],
    ["text-to-image api in:name,description stars:>100","出图/视频项目","stars","GitHub 开源"],
    ["free-llm-api in:name,description","免费 LLM 清单","stars"],
    ["topic:free-tier","免费层项目","updated"],
    ["topic:free-api","免费 API 项目","updated"],
    ["topic:freebies","免费好物","updated"],
    ["free tier in:description stars:>100","热门免费层","updated"],
    ["awesome free apis in:name,description","Awesome 清单","updated"]
  ];
  const out=[]; const seen=new Set();
  for(const [q,qlabel,qsort,qcat] of queries){
    let j=null;
    try{ j=await fetchJSON("https://api.github.com/search/repositories?q="+encodeURIComponent(q)+"&sort="+(qsort||"updated")+"&order=desc&per_page=20"); }catch(e){ continue; }
    for(const r of (j.items||[])){
      if(seen.has(r.full_name)) continue; seen.add(r.full_name);
      out.push({id:"gh-"+r.id, title:r.full_name, cat:qcat||"GitHub 开源", sub:qlabel, type:"开源项目", trust:"list", valueLabel:"★ "+r.stargazers_count, valueNum:r.stargazers_count||0, desc:(r.description||"GitHub 最新免费/免费层相关开源项目").slice(0,220), endISO:null, endLabel:"开源项目", url:r.html_url, source:"GitHub Search · "+(r.language||""), srcDate:(r.pushed_at||"").slice(0,10)||null, stars:r.stargazers_count||0});
    }
  }
  return out;
}


function parseFreeNewapi(text){
  const out=[]; let section="";
  for(const line of text.split("\n")){
    const h=line.match(/^##\s+(.+)/); if(h){ section=h[1]; continue; }
    if(!line.startsWith("|")) continue;
    const cells=line.split("|").map(c=>c.trim());
    if(cells.length<5) continue;
    const name=cells[1].replace(/[`*]/g,"").trim();
    if(!name || name==="平台" || name==="名称" || name==="项目" || /^---/.test(name)) continue;
    const raw=cells[2]||"";
    let url=""; const lm=raw.match(/\((https?:[^)]+)\)/); if(lm) url=lm[1];
    if(!url){ const bm=raw.match(/`([^`]+)`/); if(bm) url=bm[1]; }
    if(!url){ const hm=raw.match(/https?:[^\s)]+/); if(hm) url=hm[0]; }
    if(!url) continue;
    if(!/^https?:\/\//.test(url)) url="https://"+url;
    url=url.replace(/([?&])(aff|utm_source|utm_medium|utm_campaign)=[^&]+&?/g,"$1").replace(/[?&]$/,"").replace(/\?&/,"?");
    const isRelay=/公益中转站/.test(section), isTool=/开源/.test(section);
    const quota=(cells[3]||"").replace(/<[^>]+>/g,"").trim();
    const note=(cells[4]||"").replace(/<[^>]+>/g,"").trim();
    out.push({id:"rna-"+slug(name)+"-"+Math.abs([...url].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)), title:name, cat:isTool?"GitHub 开源":"AI 与订阅", sub:isTool?"AI 中转/网关":(isRelay?"公益中转站":"免费 AI API 渠道"), type:isTool?"开源项目":(isRelay?"公益中转站":"官方免费额度"), trust:isRelay?"community":"list", valueLabel:quota.slice(0,60)||"免费额度", valueNum:0, desc:((quota?quota+"。":"")+(note||"")).slice(0,200)+(isRelay?" ⚠ 公益站由社区维护，可能掺水/跑路：勿传敏感数据、勿大额充值":""), endISO:null, endLabel:"以官网为准", url, source:"free-newapi 导航 · "+(section.replace(/^[一二三四]、/,"")||"清单"), srcDate:null});
    if(out.length>=70) break;
  }
  // 公益中转站 section is an HTML table in this README
  const seg=text.split("## 一、公益中转站")[1]; 
  if(seg){
    const body=seg.split("## 二、")[0];
    const rows=body.match(/<tr>[\s\S]*?<\/tr>/g)||[];
    for(const r of rows){
      const tds=[...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1]);
      if(tds.length<5) continue;
      const name=stripTags(tds[0]).trim(); if(!name) continue;
      const hm=r.match(/href="(https?:[^"]+)"/); if(!hm) continue;
      const url=hm[1].replace(/([?&])(aff|utm_source|utm_medium|utm_campaign)=[^&]+&?/g,"$1").replace(/[?&]$/,"").replace(/\?&/,"?");
      const quota=stripTags(tds[2]).trim(), models=stripTags(tds[3]).trim(), note=stripTags(tds[4]).trim();
      if(/付费中转站|疑似跑路|已跑路/.test(note+quota)) continue;
      out.push({id:"relay-"+slug(name)+"-"+Math.abs([...url].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)), title:name+"（公益中转站）", cat:"AI 与订阅", sub:"公益中转站", type:"公益中转站", trust:"community", valueLabel:(quota||"免费额度").slice(0,60), valueNum:0, desc:((quota?quota+"。":"")+(models?"覆盖："+models+"。":"")+(note||"")).slice(0,200)+" ⚠ 公益站由社区维护，可能掺水/跑路：勿传敏感数据、勿大额充值", endISO:null, endLabel:"以官网为准", url, source:"free-newapi 导航 · 公益中转站", srcDate:null});
    }
  }
  return out;
}
function parseAwesomeFreeLLM(text){
  const out=[]; const lines=text.split("\n");
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^### \[([^\]]+)\]\((https?:[^)]+)\)/); if(!m) continue;
    let desc="";
    for(let k=i+1;k<Math.min(i+5,lines.length);k++){ const t=lines[k].trim(); if(t && !t.startsWith("<")){ desc=t.replace(/<[^>]+>/g,"").slice(0,200); break; } }
    out.push({id:"afl-"+slug(m[1]), title:m[1]+" — 免费 LLM API", cat:"AI 与订阅", sub:"免费 AI API 渠道", type:"官方免费额度", trust:"list", valueLabel:"永久免费层", valueNum:0, desc:desc||"awesome-free-llm-apis 收录的永久免费层 LLM API，自己注册拿 Key", endISO:null, endLabel:"长期（以官网为准）", url:m[2], source:"awesome-free-llm-apis", srcDate:null});
    if(out.length>=60) break;
  }
  return out;
}


async function fetchGamerPower(){
  const j=await fetchJSON("https://www.gamerpower.com/api/giveaways?platform=pc&type=game");
  const out=[];
  for(const g of (Array.isArray(j)?j:[])){
    if(!g.title || !g.open_giveaway_url) continue;
    const end=g.end_date && g.end_date!=="N/A" ? new Date(g.end_date.replace(" ","T")) : null;
    out.push({id:"gp-"+g.id, title:g.title, cat:"免费软件游戏", sub:"限时免费游戏", type:"限时免费", trust:"community", valueLabel:g.worth?("原价 "+g.worth+" 免费领"):"免费领", valueNum:parseFloat(String(g.worth||"").replace(/[^0-9.]/g,""))||0, desc:String(g.description||"").slice(0,200), endISO:end&&!isNaN(end)?end.toISOString():null, endLabel:end&&!isNaN(end)?String(g.end_date).slice(0,10):"限时（先到先得）", url:g.open_giveaway_url, source:"GamerPower", srcDate:null});
    if(out.length>=20) break;
  }
  return out;
}
async function fetchEpic(){
  const j=await fetchJSON("https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US");
  const els=(((j||{}).data||{}).Catalog||{}).searchStore ? j.data.Catalog.searchStore.elements||[] : [];
  const out=[];
  for(const el of els){
    const promos=(el.promotions&&el.promotions.promotionalOffers)||[];
    const upcoming=(el.promotions&&el.promotions.upcomingPromotionalOffers)||[];
    let offer=null, isUpcoming=false;
    for(const grp of promos){ for(const o of (grp.promotionalOffers||[])){ if(o.discountSetting && o.discountSetting.discountPercentage===0) offer=o; } }
    if(!offer){ for(const grp of upcoming){ for(const o of (grp.promotionalOffers||[])){ if(o.discountSetting && o.discountSetting.discountPercentage===0){ offer=o; isUpcoming=true; } } } }
    if(!offer) continue;
    const slugPart=el.productSlug||el.urlSlug||"";
    const end=new Date(offer.endDate), start=new Date(offer.startDate);
    out.push({id:"epic-"+slug(el.title), title:el.title+(isUpcoming?"（即将免费）":"（本周免费）"), cat:"免费软件游戏", sub:"Epic 免费游戏", type:"限时免费", trust:"official", valueLabel:"Epic 本周免费", valueNum:0, desc:String(el.description||"").slice(0,200), endISO:isNaN(end)?null:end.toISOString(), endLabel:isNaN(end)?"以 Epic 商店为准":(isUpcoming?("开始："+start.toISOString().slice(0,10)+" · 截止："): "截止：")+end.toISOString().slice(0,10), url:slugPart?("https://store.epicgames.com/en-US/p/"+slugPart):"https://store.epicgames.com/en-US/free-games", source:"Epic Games Store", srcDate:null});
    if(out.length>=6) break;
  }
  return out;
}
async function fetchCheapShark(){
  const j=await fetchJSON("https://www.cheapshark.com/api/1.0/deals?upperPrice=0&pageSize=30&sortBy=Price",{"User-Agent":"GlobalDealHub/9.0 (+https://global-deal-hunter.u20261103.workers.dev)"});
  const out=[];
  for(const d of (Array.isArray(j)?j:[])){
    if(!d.title || !d.dealID) continue;
    out.push({id:"cs-"+d.dealID, title:d.title+"（Steam 免费领）", cat:"免费软件游戏", sub:"Steam 免费游戏", type:"限时免费", trust:"community", valueLabel:"原价 $"+(d.normalPrice||"?")+" 免费领", valueNum:parseFloat(d.normalPrice)||0, desc:"CheapShark 监测到 Steam 当前售价 $0 的游戏，点击直达领取页", endISO:null, endLabel:"限时（以 Steam 为准）", url:"https://www.cheapshark.com/redirect?dealID="+encodeURIComponent(d.dealID), source:"CheapShark · Steam", srcDate:null});
    if(out.length>=20) break;
  }
  return out;
}

async function refresh(env){
  const counts={seed:SEED.length+SEED_MEDIA.length+SEED_UCARD.length, freeForDev:0, publicApis:0, github:0, rss:0, hackerNews:0, telegram:0, relayNav:0, freeLlm:0, gamerPower:0, epic:0};
  const errors=[]; let items=[...SEED, ...SEED_MEDIA, ...SEED_UCARD];
  for(const f of RSS_FEEDS){ try{ const t=await fetchText(f.url); const p=parseRSS(t,f); counts.rss+=p.length; items=items.concat(p); }catch(e){ errors.push(f.prefix+": "+e.message); } }
  for(const [ch,label] of TG_CHANNELS){ try{ const p=await fetchTelegramChannel(ch,label); counts.telegram+=p.length; items=items.concat(p); }catch(e){ errors.push("tg-"+ch+": "+e.message); } }
  try{ const p=await fetchHN(); counts.hackerNews=p.length; items=items.concat(p); }catch(e){ errors.push("hn: "+e.message); }
  try{ const t=await fetchText("https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md"); const p=parseFreeForDev(t); counts.freeForDev=p.length; items=items.concat(p); }catch(e){ errors.push("free-for-dev: "+e.message); }
  try{ const t=await fetchText("https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"); const p=parsePublicApis(t); counts.publicApis=p.length; items=items.concat(p); }catch(e){ errors.push("public-apis: "+e.message); }
  try{ const t=await fetchText("https://raw.githubusercontent.com/kirito8/free-newapi/main/README.md"); const p=parseFreeNewapi(t); counts.relayNav=p.length; items=items.concat(p); }catch(e){ errors.push("free-newapi: "+e.message); }
  try{ const t=await fetchText("https://raw.githubusercontent.com/mnfst/awesome-free-llm-apis/main/README.md"); const p=parseAwesomeFreeLLM(t); counts.freeLlm=p.length; items=items.concat(p); }catch(e){ errors.push("awesome-free-llm: "+e.message); }
  try{ const p=await fetchGamerPower(); counts.gamerPower=p.length; items=items.concat(p); }catch(e){ errors.push("gamerpower: "+e.message); }
  try{ const p=await fetchEpic(); counts.epic=p.length; items=items.concat(p); }catch(e){ errors.push("epic: "+e.message); }
  try{ const p=await fetchGitHub(); counts.github=p.length; items=items.concat(p); }catch(e){ errors.push("github: "+e.message); }
  const seen=new Set(); items=items.filter(d=>{ const k=d.title+'|'+d.url; if(seen.has(k)) return false; seen.add(k); return true; });
  const meta={updatedAt:new Date().toISOString(), counts, errors, total:items.length};
  if(env && env.DEALS_KV){ await env.DEALS_KV.put("deals", JSON.stringify(items)); await env.DEALS_KV.put("meta", JSON.stringify(meta)); }
  return {items, meta};
}

async function getData(env){
  if(env && env.DEALS_KV){
    try{
      const [d,m]=await Promise.all([env.DEALS_KV.get("deals","json"), env.DEALS_KV.get("meta","json")]);
      if(d && m && (Date.now()-new Date(m.updatedAt).getTime()) < 6*3600*1000) return {items:d, meta:m, cached:true};
      if(d && m){ const r=await refresh(env); return {...r, cached:false}; }
    }catch(e){ /* fall through to live refresh */ }
  }
  const r=await refresh(env); return {...r, cached:false};
}

const SEED_IDS=new Set([...(typeof SEED!=="undefined"?SEED:[]), ...(typeof SEED_MEDIA!=="undefined"?SEED_MEDIA:[]), ...(typeof SEED_UCARD!=="undefined"?SEED_UCARD:[])].map(x=>x.id));
function scoreItem(d, now){
  let sc=0;
  if(SEED_IDS.has(d.id)) sc+=100;                 // 人工核实种子 = 最高优先
  if(d.trust==="official") sc+=40; else if(d.trust==="list") sc+=20;
  if(d.source==="Epic Games Store") sc+=50;               // Epic 每周免费
  if(d.source==="GamerPower") sc+=45;                      // 限时免费游戏聚合
  if(d.valueNum>=30000) sc+=45; else if(d.valueNum>=10000) sc+=30; else if(d.valueNum>=20) sc+=20;
  if(d.endISO){ const left=new Date(d.endISO).getTime()-now; if(left>0 && left<48*3600*1000) sc+=25; } // 48 小时内截止加急
  return sc;
}
function withStatus(items){
  const now=Date.now();
  return items.map(d=>{ const ended=d.endISO ? (new Date(d.endISO).getTime()<now) : false; const score=scoreItem(d, now); return {...d, ended, score, featured: !ended && score>=60}; });
}

const RES = [
 {n:"Kaggle 免费 GPU T4 x2",spec:"约30 GPU小时/周 · 单次最长12h · 20GB 持久输出",st:"等待登录/手机验证",verify:"Notebook 选 T4 x2 + Internet + Persistence → !nvidia-smi 验证",note:"必须先手机验证才能开 GPU 和联网",url:"https://www.kaggle.com/code"},
 {n:"Google Colab 免费 T4",spec:"T4 不保证 · 额度不公开 · 单次最长12h · 不绑卡",st:"等待登录",verify:"新建 Notebook → 切 GPU → !nvidia-smi + 小测试",note:"免费版禁止代理/网页服务器/SSH，ComfyUI 只能 Notebook 内实验",url:"https://colab.research.google.com/"},
 {n:"Simular Box 免费云电脑",spec:"一次性 5,000 credits 约50小时 · 90天有效 · 1账号1台",st:"等待登录",verify:"登录确认机器 → 终端跑 Python 小程序",note:"闲置休眠，连续休眠14天删除（含文件）",url:"https://box.simular.ai"},
 {n:"InstaBox 免费云电脑",spec:"1台 4核/8GB · 20GB · 100GB/月出站 · Debian 13",st:"等待登录",verify:"创建机器 → 终端跑 Python",note:"闲置30分钟暂停，单次最长480分钟，无入站公网IPv4，不是常驻VPS",url:"https://instabox.sh"},
 {n:"Cloady 免费档",spec:"0.5 vCPU / 1GB / 5GB · 美国免费区",st:"待核实",verify:"登录后先确认区域和 $0.00/mo，未确认不部署",note:"ToS 未明确禁止个人代理，但禁止 Tor/挖矿/转售，免费月流量很低",url:"https://cloady.com"},
 {n:"Railway VLESS",spec:"$5 一次性试用，非长期免费",st:"政策禁止 · 已停止",verify:"不部署，不生成节点链接",note:"Railway 官方明确禁止 proxies/VPN/anonymization",url:"https://railway.com"}
];

function html(){
  const res = JSON.stringify(RES).replace(/</g,"\\u003c");
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GLOBAL DEAL HUB | 全球羊毛情报中心</title>
<script>try{var th=localStorage.getItem('theme')||'light';document.documentElement.dataset.theme=th;}catch(e){document.documentElement.dataset.theme='light'}<\/script>
<style>
:root{--ink:#221e16;--mut:#7a7261;--gold:#9a7b2d;--line:#ded2b8;--paper:#f6f1e6;--card:#fffdf6;--desc:#4c463a;--btnbg:#221e16;--btnfg:#f6f1e6}
html[data-theme="dark"]{--ink:#ede4cf;--mut:#a79b7d;--gold:#c9a44e;--line:#3d3626;--paper:#14120d;--card:#1d1a13;--desc:#cfc4a8;--btnbg:#c9a44e;--btnfg:#171410}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;transition:background .25s,color .25s}
.serif{font-family:Georgia,"Times New Roman","Songti SC","Noto Serif SC",serif}
.wrap{max-width:1060px;margin:0 auto;padding:34px 18px 64px}
.kicker{text-align:center;letter-spacing:.42em;font-size:11px;color:var(--gold);text-transform:uppercase}
h1{text-align:center;font-size:40px;margin:10px 0 2px;font-weight:600;letter-spacing:.06em}
.sub{text-align:center;color:var(--mut);font-size:14px;letter-spacing:.5em;margin:0}
.rule{height:1px;background:var(--gold);opacity:.55;margin:20px auto 6px;max-width:720px}
.rule2{height:1px;background:var(--line);margin:6px auto 0;max-width:720px}
.meta{text-align:center;color:var(--mut);font-size:12.5px;margin:14px 0 0;line-height:1.7}
.stats{display:grid;grid-template-columns:repeat(4,1fr);margin:22px 0 6px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.stat{text-align:center;padding:16px 6px}.stat+.stat{border-left:1px solid var(--line)}
.stat b{display:block;font-size:32px;font-weight:600}.stat span{font-size:12px;color:var(--mut);letter-spacing:.28em}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:center;margin-top:18px}
.btn{background:var(--btnbg);color:var(--btnfg);border:1px solid var(--btnbg);padding:11px 20px;cursor:pointer;font-size:13.5px;letter-spacing:.12em}
.btn2{background:transparent;color:var(--ink);border:1px solid var(--line);padding:10px 16px;cursor:pointer;font-size:13.5px;letter-spacing:.08em}
.btn2.on{background:var(--btnbg);color:var(--btnfg);border-color:var(--btnbg)}
.btn2:disabled{opacity:.35;cursor:default}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:20px 0 0}
.chip{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:7px 14px;cursor:pointer;font-size:13px}
.chip.on{background:var(--btnbg);color:var(--btnfg);border-color:var(--btnbg)}
.subs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0 0}
.schip{border:1px solid transparent;background:transparent;color:var(--gold);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:12.5px}
.schip.on{border-color:var(--gold);background:var(--card)}
input,select{background:var(--card);color:var(--ink);border:1px solid var(--line);padding:11px 13px;font-size:14px;border-radius:2px}
input{flex:1;min-width:220px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
@media(max-width:760px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:30px}}
.card{background:var(--card);border:1px solid var(--line);border-radius:3px;padding:18px}
.card h3{margin:9px 0 6px;font-size:16.5px;font-weight:600;line-height:1.45}
.tag{display:inline-block;border:1px solid var(--btnbg);background:var(--btnbg);color:var(--btnfg);padding:2px 8px;margin-right:6px;font-size:11.5px;letter-spacing:.06em}
.stag{display:inline-block;color:var(--gold);border:1px solid var(--gold);padding:2px 8px;margin-right:6px;font-size:11.5px}
.wtag{display:inline-block;color:var(--gold);border:1px dashed var(--gold);padding:2px 8px;margin-right:6px;font-size:11.5px}
.ptag{display:inline-block;color:var(--mut);border:1px solid var(--line);padding:2px 8px;margin-right:6px;font-size:11.5px}
.desc{color:var(--desc);font-size:13.5px;line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:4px 0}
.mut{color:var(--mut);font-size:12.5px;line-height:1.7;margin:3px 0}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
.foot{color:var(--mut);font-size:12.5px;line-height:1.8;margin-top:30px;border-top:1px solid var(--line);padding-top:16px}
.sect{text-align:center;letter-spacing:.42em;font-size:13px;color:var(--gold);margin:26px 0 2px}
.card.glow{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 0 16px rgba(154,123,45,.35);animation:glowPulse 2.8s ease-in-out infinite}
html[data-theme="dark"] .card.glow{box-shadow:0 0 0 1px var(--gold),0 0 22px rgba(201,164,78,.5)}
@keyframes glowPulse{50%{box-shadow:0 0 0 1px var(--gold),0 0 30px rgba(201,164,78,.7)}}
.fbadge{display:inline-block;background:var(--gold);color:#fffdf6;padding:2px 8px;margin-right:6px;font-size:11.5px;letter-spacing:.08em}
html[data-theme="dark"] .fbadge{color:#171410}
</style></head><body><div class="wrap">
<p class="kicker" id="kicker">Worldwide Free Signals · Est. 2026</p>
<h1 class="serif">GLOBAL DEAL HUB</h1>
<p class="sub" id="subtitle">全 球 羊 毛 情 报 中 心</p>
<div class="rule"></div><div class="rule2"></div>
<p class="meta" id="metaLine">正在加载数据…</p>
<div class="stats"><div class="stat"><b class="serif" id="sTotal">–</b><span id="stTotal">进 行 中</span></div><div class="stat"><b class="serif" id="sToday">–</b><span id="stToday">今 日 更 新</span></div><div class="stat"><b class="serif" id="sSoon">–</b><span id="stSoon">七 日 内 截 止</span></div><div class="stat"><b class="serif" id="sPending">–</b><span id="stPending">待 核 实</span></div></div>
<div class="row">
<button class="btn" id="btnRefresh">立即自动抓取最新</button>
<button class="btn2 on" id="tabDeals">优惠情报</button>
<button class="btn2" id="tabRes">免费算力组合</button>
<button class="btn2" id="btnTheme">深色</button>
<button class="btn2" id="btnLang">EN</button>
</div>
<div id="viewDeals">
<div id="viewFeat"><p class="sect" id="featTitle">优 先 推 荐</p><div class="grid" id="feat"></div></div>
<div class="chips" id="chips"></div>
<div class="subs" id="subs"></div>
<div class="row"><input id="q" placeholder="搜索：Gemini、免费 API、银行奖励、空投、免费游戏…"><select id="sort"><option value="new">最新更新</option><option value="hot">热度最高</option><option value="end">即将截止</option></select></div>
<div class="grid" id="list"></div>
<div id="pager" style="text-align:center;margin-top:20px"></div>
</div>
<div id="viewRes" style="display:none"><div class="grid" id="res"></div>
<p class="foot" id="footRes"></p></div>
<p class="foot" id="footMain"></p>
</div><script>
const RES=${res};
const I18N={
 zh:{loading:'正在加载数据…',active:'进 行 中',today:'今 日 更 新',soon:'七 日 内 截 止',pending:'待 核 实',refresh:'立即自动抓取最新',fetching:'抓取中…',deals:'优惠情报',compute:'免费算力组合',themeTo:'深色',themeBack:'浅色',langBtn:'EN',subtitle:'全 球 羊 毛 情 报 中 心',searchPh:'搜索：Gemini、免费 API、银行奖励、空投、免费游戏…',sortNew:'最新更新',sortHot:'热度最高',sortEnd:'即将截止',official:'官方核实',listed:'清单收录',community:'社区爆料',unverified:'待核实',value:'价值/规格',deadline:'截止',updated:'更新',source:'来源',visit:'前往官方 / 原帖 →',empty:'暂无符合条件的条目',first:'首页',prev:'上一页',next:'下一页',last:'末页',pageInfo:function(t,p,q,n){return '共 '+t+' 条 · 第 '+p+' / '+q+' 页 · 每页 '+n+' 条'},featuredTitle:'优 先 推 荐',featuredBadge:'优先推荐',lastUpdate:'上次自动更新',totalW:'共',someFail:'部分来源失败',loadFail:'加载失败，请稍后刷新页面重试',resRule:'规则：只用免费计划，不绑卡、不升级、不付费。遇登录、授权、验证码、密码立即停下由你接管；每项先实际验证可用再进入下一项。状态为信息整理，不代表已开通。',foot:'数据来源：人工核实种子（官方页）· free-for-dev · public-apis · GitHub Search（含 AI 网关/中转、自媒体工具、搞钱电子书）· Slickdeals · OzBargain · Doctor of Credit · Frequent Miler · Airdrops.io · Giveaway of the Day · Hacker News · V2EX · Telegram 免费游戏 · free-newapi 中转站导航 · awesome-free-llm-apis · 官方免费出图/视频与素材 API。系统每 6 小时自动抓取（省流模式），过期自动归档。公益中转站由社区维护，存在掺水/跑路风险：只建议注册领免费额度试用，勿传敏感数据、勿大额充值；公开共享 Key 类渠道不收录。所有卡片均可点击直达来源页。'},
 en:{loading:'Loading…',active:'A C T I V E',today:'U P D A T E D · T O D A Y',soon:'E N D I N G · 7 D',pending:'U N V E R I F I E D',refresh:'Fetch latest now',fetching:'Fetching…',deals:'Deals',compute:'Free compute',themeTo:'Dark',themeBack:'Light',langBtn:'中文',subtitle:'G L O B A L · D E A L · I N T E L',searchPh:'Search: Gemini, free API, bank bonuses, airdrops, free games…',sortNew:'Newest',sortHot:'Most popular',sortEnd:'Ending soon',official:'Official',listed:'Listed',community:'Community',unverified:'Unverified',value:'Value',deadline:'Ends',updated:'Updated',source:'Source',visit:'Visit source →',empty:'No matching items',first:'First',prev:'Prev',next:'Next',last:'Last',pageInfo:function(t,p,q,n){return t+' items · Page '+p+' / '+q+' · '+n+' per page'},featuredTitle:'F E A T U R E D · P I C K S',featuredBadge:'Featured',lastUpdate:'Last auto-update',totalW:'total',someFail:'Some sources failed',loadFail:'Load failed, please refresh later',resRule:'Rules: free plans only — no card binding, no upgrades, no payments. Stop at any login, authorization, captcha or password step and hand over to the owner; verify each resource actually works before moving on. Statuses are informational, not activations.',foot:'Sources: hand-verified seeds (official pages) · free-for-dev · public-apis · GitHub Search (incl. AI gateways/relays, creator tools, money ebooks) · Slickdeals · OzBargain · Doctor of Credit · Frequent Miler · Airdrops.io · Giveaway of the Day · Hacker News · V2EX · Telegram free games · free-newapi relay index · awesome-free-llm-apis · official free image/video & stock APIs. Auto-refreshed every 6 hours (quota-saving mode); expired deals are archived automatically. Community relays may shut down or degrade: use free quotas only, never send sensitive data or deposit large sums. Shared public key channels are not listed. Every card links directly to its source.'}
};
const CAT_EN={'全部':'All','优先推荐':'Featured','即将截止':'Ending soon','已结束':'Ended','我的收藏':'Favorites','AI 与订阅':'AI & Subscriptions','云与开发':'Cloud & Dev','免费 API':'Free APIs','免费API':'Free APIs','GitHub 开源':'GitHub Open Source','全球购物羊毛':'Global Shopping','免费搞钱':'Free Money','免费软件游戏':'Free Software & Games','科技情报':'Tech Intel'};
const SUB_EN={'全部小类':'All subcategories','免费 AI API 渠道':'Free AI API channels','公益中转站':'Community relays','免费出图出视频':'Free image/video APIs','免费素材 API':'Free stock APIs','自媒体工具':'Creator tools','搞钱电子书与指南':'Money ebooks & guides','银行与卡奖励':'Bank & card bonuses','里程积分':'Miles & points','加密空投':'Crypto airdrops','交易所活动':'Exchange promos','美国社区':'US community','澳洲社区':'AU community','每日免费软件':'Daily free software','免费游戏':'Free games','中文社区':'Chinese community','学生优惠':'Student deals','办公订阅':'Productivity subs','定向优惠':'Targeted deals','云厂商免费层':'Cloud free tiers','AI 网关/中转':'AI gateways','AI 中转/网关':'AI gateways & relays','免费 LLM 清单':'Free LLM lists','出图/视频项目':'Image/video projects'};
const TYPE_EN={'免费试用':'Free trial','学生优惠':'Student deal','免费额度':'Free credits','开源项目':'Open source','限时免费':'Limited free','限时优惠':'Limited deal','社区爆料':'Community post','官方免费额度':'Official free tier','公益中转站':'Community relay','免费素材':'Free stock','加密支付卡':'Crypto card','视频分享':'Video','免费教程':'Free tutorial','商家特价':'Store deal','空投清单':'Airdrop list','科技情报':'Tech intel','任务奖励':'Task rewards','定向优惠':'Targeted deal','免费API·免Key':'Free API · No key','免费API·需Key':'Free API · Key needed','免费 API':'Free API'};
function TY(x){return lang==='en'?(TYPE_EN[x]||x):x}
let lang=localStorage.getItem('lang')||'zh';
let theme=document.documentElement.dataset.theme||'light';
function T(){return I18N[lang]}
function L(c){return lang==='en'?(CAT_EN[c]||c):c}
function SL(x){return lang==='en'?(SUB_EN[x]||x):x}
let deals=[], meta=null, filter='全部', subFilter='全部小类', page=1; const PAGE_SIZE=24;
let favs=new Set(JSON.parse(localStorage.getItem('favs')||'[]'));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function trustTag(d){const t=T();return d.trust==='official'?'<span class="ptag">'+t.official+'</span>':d.trust==='list'?'<span class="ptag">'+t.listed+'</span>':d.trust==='community'?'<span class="ptag">'+t.community+'</span>':'<span class="wtag">'+t.unverified+'</span>'}
function catCounts(){const m={};deals.filter(d=>!d.ended).forEach(d=>{m[d.cat]=(m[d.cat]||0)+1});return Object.keys(m).sort((a,b)=>m[b]-m[a]).map(c=>[c,m[c]])}
function subCounts(){if(filter==='全部'||filter==='优先推荐'||filter==='即将截止'||filter==='已结束'||filter==='我的收藏')return[];const m={};deals.filter(d=>!d.ended&&d.cat===filter&&d.sub).forEach(d=>{m[d.sub]=(m[d.sub]||0)+1});return Object.keys(m).sort((a,b)=>m[b]-m[a]).map(c=>[c,m[c]])}
function renderChips(){const base=['全部','优先推荐','即将截止','已结束','我的收藏'];const cc=catCounts();
 document.getElementById('chips').innerHTML=base.concat(cc.map(x=>x[0])).map(c=>{let n='';if(c==='我的收藏')n=' ('+favs.size+')';else{const f=cc.find(x=>x[0]===c);if(f)n=' ('+f[1]+')'}return '<button class="chip '+(filter===c?'on':'')+'" onclick="setF(\\''+c.replace(/'/g,"")+'\\')">'+esc(L(c))+n+'</button>'}).join('');
 const sc=subCounts();
 document.getElementById('subs').innerHTML=sc.length?['全部小类'].concat(sc.map(x=>x[0])).map(c=>{const f=sc.find(x=>x[0]===c);return '<button class="schip '+(subFilter===c?'on':'')+'" onclick="setSub(\\''+c.replace(/'/g,"")+'\\')">'+esc(SL(c))+(f?' ('+f[1]+')':'')+'</button>'}).join(''):'';
}
function setF(c){filter=c;subFilter='全部小类';page=1;render()}
function setSub(x){subFilter=x;page=1;render()}
function soon7(d){return d.endISO && !d.ended && (new Date(d.endISO).getTime()-Date.now())<7*864e5}
function cardHTML(d){
 const t=T();
 return '<div class="card'+(d.featured?' glow':'')+'">'+(d.featured?'<span class="fbadge">'+t.featuredBadge+'</span>':'')+'<span class="tag">'+esc(L(d.cat))+'</span>'+(d.sub?'<span class="stag">'+esc(SL(d.sub))+'</span>':'')+'<span class="ptag">'+esc(TY(d.type))+'</span>'+trustTag(d)+' <a href="#" onclick="toggleFav(&quot;'+d.id+'&quot;);return false" style="float:right">'+(favs.has(d.id)?'★':'☆')+'</a><h3>'+esc(d.title)+'</h3><p class="desc">'+esc(d.desc||'')+'</p><p class="mut">'+t.value+'：'+esc(d.valueLabel||'—')+' · '+t.deadline+'：'+esc(d.endLabel||'—')+(d.srcDate?' · '+t.updated+'：'+esc(d.srcDate):'')+'</p><p class="mut">'+t.source+'：'+esc(d.source)+'</p><a href="'+esc(d.url)+'" target="_blank" rel="noopener">'+t.visit+'</a></div>';
}
function render(){
 const t=T(); const today=new Date().toISOString().slice(0,10);
 const active=deals.filter(d=>!d.ended);
 sTotal.textContent=active.length;
 sToday.textContent=deals.filter(d=>d.srcDate===today).length;
 sSoon.textContent=deals.filter(soon7).length;
 sPending.textContent=active.filter(d=>d.trust==='unverified').length;
 if(meta){const names=lang==='en'?{seed:'Verified',freeForDev:'free-for-dev',publicApis:'public-apis',github:'GitHub',rss:'Communities',hackerNews:'Hacker News',telegram:'Telegram',relayNav:'Relay index',freeLlm:'Free LLM lists',gamerPower:'GamerPower',epic:'Epic'}:{seed:'人工核实',freeForDev:'free-for-dev',publicApis:'public-apis',github:'GitHub',rss:'全球社区',hackerNews:'Hacker News',telegram:'Telegram',relayNav:'中转站导航',freeLlm:'免费LLM清单',gamerPower:'GamerPower',epic:'Epic'};metaLine.textContent=t.lastUpdate+'：'+new Date(meta.updatedAt).toLocaleString(lang==='en'?'en-US':'zh-CN')+' · '+t.totalW+' '+meta.total+(lang==='en'?' items':' 条')+' · '+Object.keys(meta.counts).map(k=>(names[k]||k)+' '+meta.counts[k]).join(' · ')+(meta.errors&&meta.errors.length?' · '+t.someFail+'：'+meta.errors.join('；'):'')}
 renderChips();
 let q=document.getElementById('q').value.toLowerCase();
 let arr=deals.filter(d=>{
   if(filter==='全部'&&d.ended)return false;
   if(filter==='已结束'&&!d.ended)return false;
   if(filter==='即将截止'&&!soon7(d))return false;
   if(filter==='我的收藏'&&!favs.has(d.id))return false;
   if(filter==='优先推荐'&&!d.featured)return false;
   if(filter!=='全部'&&filter!=='优先推荐'&&filter!=='已结束'&&filter!=='即将截止'&&filter!=='我的收藏'&&d.cat!==filter)return false;
   if(subFilter!=='全部小类'&&d.sub!==subFilter)return false;
   return (d.title+' '+d.cat+' '+(d.sub||'')+' '+d.type+' '+(d.desc||'')).toLowerCase().includes(q);
 });
 const sv=document.getElementById('sort').value;
 if(sv==='hot')arr.sort((a,b)=>(b.valueNum||0)-(a.valueNum||0));
 else if(sv==='end')arr.sort((a,b)=>(a.endISO?new Date(a.endISO).getTime():9e15)-(b.endISO?new Date(b.endISO).getTime():9e15));
 else arr.sort((a,b)=>String(b.srcDate||'').localeCompare(String(a.srcDate||''))||(b.valueNum||0)-(a.valueNum||0));
 const pages=Math.max(1,Math.ceil(arr.length/PAGE_SIZE)); if(page>pages)page=pages;
 const pageItems=arr.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 document.getElementById('list').innerHTML=pageItems.map(cardHTML).join('')||'<p class="mut" style="text-align:center">'+t.empty+'</p>';
 renderFeatured();
 renderPager(arr.length,pages);
}
function renderPager(total,pages){
 const t=T(); const el=document.getElementById('pager'); if(!el)return;
 if(total===0){el.innerHTML='';return}
 let nums=[]; for(let i=1;i<=pages;i++){ if(i===1||i===pages||Math.abs(i-page)<=2) nums.push(i); }
 let html='<button class="btn2" onclick="goPage(1)" '+(page===1?'disabled':'')+'>'+t.first+'</button> <button class="btn2" onclick="goPage(page-1)" '+(page===1?'disabled':'')+'>'+t.prev+'</button> ';
 let last=0; for(const n of nums){ if(last&&n-last>1) html+='<span class="mut">…</span> '; html+='<button class="btn2 '+(n===page?'on':'')+'" onclick="goPage('+n+')">'+n+'</button> '; last=n; }
 html+='<button class="btn2" onclick="goPage(page+1)" '+(page===pages?'disabled':'')+'>'+t.next+'</button> <button class="btn2" onclick="goPage('+pages+')" '+(page===pages?'disabled':'')+'>'+t.last+'</button>';
 html+='<p class="mut" style="margin-top:9px">'+t.pageInfo(total,page,pages,PAGE_SIZE)+'</p>';
 el.innerHTML=html;
}

function renderFeatured(){
 const show = filter==='全部' && subFilter==='全部小类' && !document.getElementById('q').value;
 const box=document.getElementById('viewFeat');
 if(!show){ box.style.display='none'; return; }
 const feat=deals.filter(d=>d.featured).sort((a,b)=>(b.score||0)-(a.score||0)||String(b.srcDate||'').localeCompare(String(a.srcDate||''))).slice(0,8);
 if(!feat.length){ box.style.display='none'; return; }
 box.style.display='';
 document.getElementById('feat').innerHTML=feat.map(cardHTML).join('');
}
function goPage(n){page=n;render();window.scrollTo({top:0,behavior:'smooth'})}
function toggleFav(id){favs.has(id)?favs.delete(id):favs.add(id);localStorage.setItem('favs',JSON.stringify([...favs]));render()}
function applyLang(){
 const t=T();
 document.title=lang==='en'?'GLOBAL DEAL HUB | Global Deal Intelligence':'GLOBAL DEAL HUB | 全球羊毛情报中心';
 subtitle.textContent=t.subtitle;
 stTotal.textContent=t.active; stToday.textContent=t.today; stSoon.textContent=t.soon; stPending.textContent=t.pending;
 btnRefresh.textContent=t.refresh; tabDeals.textContent=t.deals; tabRes.textContent=t.compute;
 btnTheme.textContent=theme==='dark'?t.themeBack:t.themeTo; btnLang.textContent=t.langBtn;
 document.getElementById('q').placeholder=t.searchPh;
 const so=document.getElementById('sort').options; so[0].text=t.sortNew; so[1].text=t.sortHot; so[2].text=t.sortEnd;
 footRes.textContent=t.resRule; footMain.textContent=t.foot; featTitle.textContent=t.featuredTitle;
 if(!meta) metaLine.textContent=t.loading;
 render();
}
async function load(force){
 const t=T(); btnRefresh.textContent=t.fetching;
 try{const r=await fetch(force?'/api/refresh':'/api/deals');const j=await r.json();deals=j.deals||[];meta=j.meta||null;}catch(e){metaLine.textContent=T().loadFail}
 btnRefresh.textContent=T().refresh; render();
}
btnRefresh.onclick=()=>{page=1;load(true)};
document.getElementById('q').addEventListener('input',()=>{page=1;render()});
document.getElementById('sort').addEventListener('change',()=>{page=1;render()});
tabDeals.onclick=()=>{viewDeals.style.display='';viewRes.style.display='none';tabDeals.classList.add('on');tabRes.classList.remove('on')};
tabRes.onclick=()=>{viewDeals.style.display='none';viewRes.style.display='';tabRes.classList.add('on');tabDeals.classList.remove('on')};
btnTheme.onclick=()=>{theme=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme);applyLang()};
btnLang.onclick=()=>{lang=lang==='zh'?'en':'zh';localStorage.setItem('lang',lang);applyLang()};
document.getElementById('res').innerHTML=RES.map(r=>'<div class="card"><span class="wtag">'+esc(r.st)+'</span><h3>'+esc(r.n)+'</h3><p class="desc">'+esc(r.spec)+'</p><p class="mut">验证：'+esc(r.verify)+'</p><p class="mut">注意：'+esc(r.note)+'</p><a href="'+esc(r.url)+'" target="_blank" rel="noopener">官方入口 →</a></div>').join('');
applyLang();
load(false);
</script></body></html>`;
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url);
    if(url.pathname==="/api/deals"){ const {items, meta}=await getData(env); return Response.json({deals:withStatus(items), meta},{headers:{"cache-control":"public,max-age=60,s-maxage=600"}}); }
    if(url.pathname==="/api/refresh"){
      if(url.searchParams.get("force")!=="1" && env && env.DEALS_KV){
        try{ const m=await env.DEALS_KV.get("meta","json"); if(m && (Date.now()-new Date(m.updatedAt).getTime()) < 30*60*1000){ const {items, meta}=await getData(env); return Response.json({deals:withStatus(items), meta, throttled:true}); } }catch(e){}
      }
      const {items, meta}=await refresh(env); return Response.json({deals:withStatus(items), meta});
    }
    if(url.pathname==="/health") return new Response("ok");
    return new Response(html(),{headers:{"content-type":"text/html;charset=utf-8","cache-control":"public,max-age=300"}});
  },
  async scheduled(event, env, ctx){ ctx.waitUntil(refresh(env)); }
};
