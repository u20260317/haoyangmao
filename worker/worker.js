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
const TG_CHANNELS=[["GrabFreeGames","GrabFreeGames · 免费游戏"]];
const RSS_FEEDS=[
 {prefix:"oz", url:"https://www.ozbargain.com.au/deals/feed", cat:"全球购物羊毛", sub:"澳洲社区", type:"社区爆料", region:"澳大利亚", source:"OzBargain 社区", cap:30, fallback:"OzBargain 社区最新爆料"},
 {prefix:"v2ex", url:"https://www.v2ex.com/index.xml", cat:"科技情报", sub:"中文社区", type:"社区爆料", region:"中文社区", source:"V2EX 社区", cap:20, keywords:/免费|优惠|折扣|促销|羊毛|赠送|领取|白嫖|0\s?元|free|deal/i, fallback:"V2EX 社区优惠相关帖子"},
 {prefix:"doc", url:"https://www.doctorofcredit.com/feed/", cat:"免费搞钱", sub:"银行与卡奖励", type:"社区爆料", region:"美国", source:"Doctor of Credit", cap:15, fallback:"美国银行开户奖励与信用卡优惠情报"},
 {prefix:"fm", url:"https://frequentmiler.com/feed/", cat:"免费搞钱", sub:"里程积分", type:"社区爆料", region:"美国", source:"Frequent Miler", cap:15, fallback:"里程与积分优惠情报"},
 {prefix:"air", url:"https://airdrops.io/feed/", cat:"免费搞钱", sub:"加密空投", type:"空投清单", region:"全球", source:"Airdrops.io", cap:10, fallback:"最新加密空投清单"},
 {prefix:"sd", url:"https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1", cat:"全球购物羊毛", sub:"美国社区", type:"社区爆料", region:"美国", source:"Slickdeals", cap:25, fallback:"Slickdeals 首页热门优惠"},
 {prefix:"gotd", url:"https://www.giveawayoftheday.com/feed/", cat:"免费软件游戏", sub:"每日免费软件", type:"限时免费", region:"全球", source:"Giveaway of the Day", cap:10, fallback:"每日限时免费正版软件"}
];
async function fetchHN(){
  const out=[]; const seen=new Set();
  for(const q of ["free tier","free plan","free credits"]){
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
    ["topic:free-tier","免费层项目"],
    ["topic:free-api","免费 API 项目"],
    ["topic:freebies","免费好物"],
    ["free tier in:description stars:>100","热门免费层"],
    ["awesome free apis in:name,description","Awesome 清单"]
  ];
  const out=[]; const seen=new Set();
  for(const [q,qlabel] of queries){
    const j=await fetchJSON("https://api.github.com/search/repositories?q="+encodeURIComponent(q)+"&sort=updated&order=desc&per_page=20");
    for(const r of (j.items||[])){
      if(seen.has(r.full_name)) continue; seen.add(r.full_name);
      out.push({id:"gh-"+r.id, title:r.full_name, cat:"GitHub 开源", sub:qlabel, type:"开源项目", trust:"list", valueLabel:"★ "+r.stargazers_count, valueNum:r.stargazers_count||0, desc:(r.description||"GitHub 最新免费/免费层相关开源项目").slice(0,220), endISO:null, endLabel:"开源项目", url:r.html_url, source:"GitHub Search · "+(r.language||""), srcDate:(r.pushed_at||"").slice(0,10)||null, stars:r.stargazers_count||0});
    }
  }
  return out;
}

async function refresh(env){
  const counts={seed:SEED.length, freeForDev:0, publicApis:0, github:0, rss:0, hackerNews:0, telegram:0};
  const errors=[]; let items=[...SEED];
  try{ const t=await fetchText("https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md"); const p=parseFreeForDev(t); counts.freeForDev=p.length; items=items.concat(p); }catch(e){ errors.push("free-for-dev: "+e.message); }
  try{ const t=await fetchText("https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"); const p=parsePublicApis(t); counts.publicApis=p.length; items=items.concat(p); }catch(e){ errors.push("public-apis: "+e.message); }
  try{ const p=await fetchGitHub(); counts.github=p.length; items=items.concat(p); }catch(e){ errors.push("github: "+e.message); }
  for(const f of RSS_FEEDS){ try{ const t=await fetchText(f.url); const p=parseRSS(t,f); counts.rss+=p.length; items=items.concat(p); }catch(e){ errors.push(f.prefix+": "+e.message); } }
  try{ const p=await fetchHN(); counts.hackerNews=p.length; items=items.concat(p); }catch(e){ errors.push("hn: "+e.message); }
  for(const [ch,label] of TG_CHANNELS){ try{ const p=await fetchTelegramChannel(ch,label); counts.telegram+=p.length; items=items.concat(p); }catch(e){ errors.push("tg-"+ch+": "+e.message); } }
  const seen=new Set(); items=items.filter(d=>{ const k=d.title+'|'+d.url; if(seen.has(k)) return false; seen.add(k); return true; });
  const meta={updatedAt:new Date().toISOString(), counts, errors, total:items.length};
  if(env && env.DEALS_KV){ await env.DEALS_KV.put("deals", JSON.stringify(items)); await env.DEALS_KV.put("meta", JSON.stringify(meta)); }
  return {items, meta};
}

async function getData(env){
  if(env && env.DEALS_KV){
    try{
      const [d,m]=await Promise.all([env.DEALS_KV.get("deals","json"), env.DEALS_KV.get("meta","json")]);
      if(d && m && (Date.now()-new Date(m.updatedAt).getTime()) < 2*3600*1000) return {items:d, meta:m, cached:true};
      if(d && m){ const r=await refresh(env); return {...r, cached:false}; }
    }catch(e){ /* fall through to live refresh */ }
  }
  const r=await refresh(env); return {...r, cached:false};
}

function withStatus(items){
  const now=Date.now();
  return items.map(d=>({...d, ended: d.endISO ? (new Date(d.endISO).getTime()<now) : false}));
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
<style>
:root{--ink:#221e16;--mut:#7a7261;--gold:#9a7b2d;--line:#ded2b8;--paper:#f6f1e6;--card:#fffdf6}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
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
.btn{background:var(--ink);color:#f6f1e6;border:1px solid var(--ink);padding:11px 20px;cursor:pointer;font-size:13.5px;letter-spacing:.12em}
.btn2{background:transparent;color:var(--ink);border:1px solid var(--line);padding:10px 16px;cursor:pointer;font-size:13.5px;letter-spacing:.08em}
.btn2.on{background:var(--ink);color:#f6f1e6;border-color:var(--ink)}
.btn2:disabled{opacity:.35;cursor:default}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:20px 0 0}
.chip{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:7px 14px;cursor:pointer;font-size:13px}
.chip.on{background:var(--ink);color:#f6f1e6;border-color:var(--ink)}
.subs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0 0}
.schip{border:1px solid transparent;background:transparent;color:var(--gold);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:12.5px}
.schip.on{border-color:var(--gold);background:#fffdf6}
input,select{background:var(--card);color:var(--ink);border:1px solid var(--line);padding:11px 13px;font-size:14px;border-radius:2px}
input{flex:1;min-width:220px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
@media(max-width:760px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:30px}}
.card{background:var(--card);border:1px solid var(--line);border-radius:3px;padding:18px}
.card h3{margin:9px 0 6px;font-size:16.5px;font-weight:600;line-height:1.45}
.tag{display:inline-block;border:1px solid var(--ink);background:var(--ink);color:#f6f1e6;padding:2px 8px;margin-right:6px;font-size:11.5px;letter-spacing:.06em}
.stag{display:inline-block;color:var(--gold);border:1px solid var(--gold);padding:2px 8px;margin-right:6px;font-size:11.5px}
.wtag{display:inline-block;color:#8a6d1f;border:1px dashed #b89b4e;padding:2px 8px;margin-right:6px;font-size:11.5px}
.ptag{display:inline-block;color:var(--mut);border:1px solid var(--line);padding:2px 8px;margin-right:6px;font-size:11.5px}
.desc{color:#4c463a;font-size:13.5px;line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:4px 0}
.mut{color:var(--mut);font-size:12.5px;line-height:1.7;margin:3px 0}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
.foot{color:var(--mut);font-size:12.5px;line-height:1.8;margin-top:30px;border-top:1px solid var(--line);padding-top:16px}
</style></head><body><div class="wrap">
<p class="kicker">Worldwide Free Signals · Est. 2026</p>
<h1 class="serif">GLOBAL DEAL HUB</h1>
<p class="sub">全 球 羊 毛 情 报 中 心</p>
<div class="rule"></div><div class="rule2"></div>
<p class="meta" id="metaLine">正在加载数据…</p>
<div class="stats"><div class="stat"><b class="serif" id="sTotal">–</b><span>进 行 中</span></div><div class="stat"><b class="serif" id="sToday">–</b><span>今 日 更 新</span></div><div class="stat"><b class="serif" id="sSoon">–</b><span>七 日 内 截 止</span></div><div class="stat"><b class="serif" id="sPending">–</b><span>待 核 实</span></div></div>
<div class="row">
<button class="btn" id="btnRefresh">立即自动抓取最新</button>
<button class="btn2 on" id="tabDeals">优惠情报</button>
<button class="btn2" id="tabRes">免费算力组合</button>
</div>
<div id="viewDeals">
<div class="chips" id="chips"></div>
<div class="subs" id="subs"></div>
<div class="row"><input id="q" placeholder="搜索：Gemini、免费 API、银行奖励、空投、免费游戏…"><select id="sort"><option value="new">最新更新</option><option value="hot">热度最高</option><option value="end">即将截止</option></select></div>
<div class="grid" id="list"></div>
<div id="pager" style="text-align:center;margin-top:20px"></div>
</div>
<div id="viewRes" style="display:none"><div class="grid" id="res"></div>
<p class="foot">规则：只用免费计划，不绑卡、不升级、不付费。遇登录、授权、验证码、密码立即停下由你接管；每项先实际验证可用再进入下一项。状态为信息整理，不代表已开通。</p></div>
<p class="foot">数据来源：人工核实种子（官方页）· free-for-dev 社区清单 · public-apis 免费 API 目录 · GitHub Search 最新项目 · Slickdeals（美国）· OzBargain（澳洲）· Doctor of Credit（银行与卡奖励）· Frequent Miler（里程积分）· Airdrops.io（加密空投）· Giveaway of the Day（每日免费软件）· Hacker News · V2EX（关键词过滤）· Telegram GrabFreeGames（免费游戏）。系统每 2 小时自动抓取，过期自动归档。Pepper 系（mydealz / hotukdeals / dealabs）与 Reddit 服务端抓取被对方拒绝，未接入。社区爆料时效以原帖为准，请以官方页核实后参与。</p>
</div><script>
const RES=${res};
let deals=[], meta=null, filter='全部', subFilter='全部小类', page=1; const PAGE_SIZE=24;
let favs=new Set(JSON.parse(localStorage.getItem('favs')||'[]'));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function trustTag(d){return d.trust==='official'?'<span class="ptag">官方核实</span>':d.trust==='list'?'<span class="ptag">清单收录</span>':d.trust==='community'?'<span class="ptag">社区爆料</span>':'<span class="wtag">待核实</span>'}
function catCounts(){const m={};deals.filter(d=>!d.ended).forEach(d=>{m[d.cat]=(m[d.cat]||0)+1});return Object.keys(m).sort((a,b)=>m[b]-m[a]).map(c=>[c,m[c]])}
function subCounts(){if(filter==='全部'||filter==='即将截止'||filter==='已结束'||filter==='我的收藏')return[];const m={};deals.filter(d=>!d.ended&&d.cat===filter&&d.sub).forEach(d=>{m[d.sub]=(m[d.sub]||0)+1});return Object.keys(m).sort((a,b)=>m[b]-m[a]).map(c=>[c,m[c]])}
function renderChips(){const base=['全部','即将截止','已结束','我的收藏'];const cc=catCounts();
 document.getElementById('chips').innerHTML=base.concat(cc.map(x=>x[0])).map(c=>{let n='';if(c==='我的收藏')n=' ('+favs.size+')';else{const f=cc.find(x=>x[0]===c);if(f)n=' ('+f[1]+')'}return '<button class="chip '+(filter===c?'on':'')+'" onclick="setF(\\''+c.replace(/'/g,"")+'\\')">'+esc(c)+n+'</button>'}).join('');
 const sc=subCounts();
 document.getElementById('subs').innerHTML=sc.length?['全部小类'].concat(sc.map(x=>x[0])).map(c=>{const f=sc.find(x=>x[0]===c);return '<button class="schip '+(subFilter===c?'on':'')+'" onclick="setSub(\\''+c.replace(/'/g,"")+'\\')">'+esc(c)+(f?' ('+f[1]+')':'')+'</button>'}).join(''):'';
}
function setF(c){filter=c;subFilter='全部小类';page=1;render()}
function setSub(x){subFilter=x;page=1;render()}
function soon7(d){return d.endISO && !d.ended && (new Date(d.endISO).getTime()-Date.now())<7*864e5}
function render(){
 const today=new Date().toISOString().slice(0,10);
 const active=deals.filter(d=>!d.ended);
 sTotal.textContent=active.length;
 sToday.textContent=deals.filter(d=>d.srcDate===today).length;
 sSoon.textContent=deals.filter(soon7).length;
 sPending.textContent=active.filter(d=>d.trust==='unverified').length;
 if(meta){const names={seed:'人工核实',freeForDev:'free-for-dev',publicApis:'public-apis',github:'GitHub',rss:'全球社区',hackerNews:'Hacker News',telegram:'Telegram'};metaLine.textContent='上次自动更新：'+new Date(meta.updatedAt).toLocaleString('zh-CN')+' · 共 '+meta.total+' 条 · '+Object.keys(meta.counts).map(k=>(names[k]||k)+' '+meta.counts[k]).join(' · ')+(meta.errors&&meta.errors.length?' · 部分来源失败：'+meta.errors.join('；'):'')}
 renderChips();
 let q=document.getElementById('q').value.toLowerCase();
 let arr=deals.filter(d=>{
   if(filter==='全部'&&d.ended)return false;
   if(filter==='已结束'&&!d.ended)return false;
   if(filter==='即将截止'&&!soon7(d))return false;
   if(filter==='我的收藏'&&!favs.has(d.id))return false;
   if(filter!=='全部'&&filter!=='已结束'&&filter!=='即将截止'&&filter!=='我的收藏'&&d.cat!==filter)return false;
   if(subFilter!=='全部小类'&&d.sub!==subFilter)return false;
   return (d.title+' '+d.cat+' '+(d.sub||'')+' '+d.type+' '+(d.desc||'')).toLowerCase().includes(q);
 });
 const sv=document.getElementById('sort').value;
 if(sv==='hot')arr.sort((a,b)=>(b.valueNum||0)-(a.valueNum||0));
 else if(sv==='end')arr.sort((a,b)=>(a.endISO?new Date(a.endISO).getTime():9e15)-(b.endISO?new Date(b.endISO).getTime():9e15));
 else arr.sort((a,b)=>String(b.srcDate||'').localeCompare(String(a.srcDate||''))||(b.valueNum||0)-(a.valueNum||0));
 const pages=Math.max(1,Math.ceil(arr.length/PAGE_SIZE)); if(page>pages)page=pages;
 const pageItems=arr.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 document.getElementById('list').innerHTML=pageItems.map(d=>'<div class="card"><span class="tag">'+esc(d.cat)+'</span>'+(d.sub?'<span class="stag">'+esc(d.sub)+'</span>':'')+'<span class="ptag">'+esc(d.type)+'</span>'+trustTag(d)+' <a href="#" onclick="toggleFav(\\''+d.id+'\\');return false" style="float:right">'+(favs.has(d.id)?'★':'☆')+'</a><h3>'+esc(d.title)+'</h3><p class="desc">'+esc(d.desc||'')+'</p><p class="mut">价值/规格：'+esc(d.valueLabel||'—')+' · 截止：'+esc(d.endLabel||'长期')+(d.srcDate?' · 更新：'+esc(d.srcDate):'')+'</p><p class="mut">来源：'+esc(d.source)+'</p><a href="'+esc(d.url)+'" target="_blank" rel="noopener">前往官方 / 原帖 →</a></div>').join('')||'<p class="mut" style="text-align:center">暂无符合条件的条目</p>';
 renderPager(arr.length,pages);
}
function renderPager(total,pages){
 const el=document.getElementById('pager'); if(!el)return;
 if(total===0){el.innerHTML='';return}
 let nums=[]; for(let i=1;i<=pages;i++){ if(i===1||i===pages||Math.abs(i-page)<=2) nums.push(i); }
 let html='<button class="btn2" onclick="goPage(1)" '+(page===1?'disabled':'')+'>首页</button> <button class="btn2" onclick="goPage(page-1)" '+(page===1?'disabled':'')+'>上一页</button> ';
 let last=0; for(const n of nums){ if(last&&n-last>1) html+='<span class="mut">…</span> '; html+='<button class="btn2 '+(n===page?'on':'')+'" onclick="goPage('+n+')">'+n+'</button> '; last=n; }
 html+='<button class="btn2" onclick="goPage(page+1)" '+(page===pages?'disabled':'')+'>下一页</button> <button class="btn2" onclick="goPage('+pages+')" '+(page===pages?'disabled':'')+'>末页</button>';
 html+='<p class="mut" style="margin-top:9px">共 '+total+' 条 · 第 '+page+' / '+pages+' 页 · 每页 '+PAGE_SIZE+' 条</p>';
 el.innerHTML=html;
}
function goPage(n){page=n;render();window.scrollTo({top:0,behavior:'smooth'})}
function toggleFav(id){favs.has(id)?favs.delete(id):favs.add(id);localStorage.setItem('favs',JSON.stringify([...favs]));render()}
async function load(force){
 document.getElementById('btnRefresh').textContent='抓取中…';
 try{const r=await fetch(force?'/api/refresh':'/api/deals');const j=await r.json();deals=j.deals||[];meta=j.meta||null;}catch(e){metaLine.textContent='加载失败，请稍后刷新页面重试'}
 document.getElementById('btnRefresh').textContent='立即自动抓取最新';render();
}
document.getElementById('btnRefresh').onclick=()=>{page=1;load(true)};
document.getElementById('q').addEventListener('input',()=>{page=1;render()});
document.getElementById('sort').addEventListener('change',()=>{page=1;render()});
document.getElementById('tabDeals').onclick=()=>{viewDeals.style.display='';viewRes.style.display='none';tabDeals.classList.add('on');tabRes.classList.remove('on')};
document.getElementById('tabRes').onclick=()=>{viewDeals.style.display='none';viewRes.style.display='';tabRes.classList.add('on');tabDeals.classList.remove('on')};
document.getElementById('res').innerHTML=RES.map(r=>'<div class="card"><span class="wtag">'+esc(r.st)+'</span><h3>'+esc(r.n)+'</h3><p class="desc">'+esc(r.spec)+'</p><p class="mut">验证：'+esc(r.verify)+'</p><p class="mut">注意：'+esc(r.note)+'</p><a href="'+esc(r.url)+'" target="_blank" rel="noopener">官方入口 →</a></div>').join('');
load(false);
</script></body></html>`;
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url);
    if(url.pathname==="/api/deals"){ const {items, meta}=await getData(env); return Response.json({deals:withStatus(items), meta}); }
    if(url.pathname==="/api/refresh"){ const {items, meta}=await refresh(env); return Response.json({deals:withStatus(items), meta}); }
    if(url.pathname==="/health") return new Response("ok");
    return new Response(html(),{headers:{"content-type":"text/html;charset=utf-8","cache-control":"public,max-age=300"}});
  },
  async scheduled(event, env, ctx){ ctx.waitUntil(refresh(env)); }
};
