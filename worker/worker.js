// GLOBAL DEAL HUNTER | 全球羊毛情报中心 — Cloudflare Worker v3（自动更新版）
// 数据: KV(DEALS_KV) 缓存 + Cron 每2小时自动抓取 + 数据过期时请求触发刷新
// 来源: 人工核实种子(官方) / free-for-dev(GitHub社区清单) / public-apis(免费API目录) / GitHub Search(最新免费项目)
// 不再有手动添加: 全部自动聚合, 过期自动归档到「已结束」。

const SEED = [
  {id:"ms365",title:"Microsoft 365 Premium 1个月免费试用",cat:"AI 订阅",type:"免费试用",trust:"official",valueLabel:"$19.99/月",valueNum:20,desc:"试用后自动续费 $19.99/月，需在微软账户取消",endISO:null,endLabel:"长期试用入口",url:"https://www.microsoft.com/en-us/microsoft-365/try-premium",source:"microsoft.com 官方",srcDate:"2026-11-20"},
  {id:"gai-student",title:"Google AI Pro 学生版 1年免费",cat:"AI 订阅",type:"学生优惠",trust:"official",valueLabel:"$239.88",valueNum:240,desc:"美国高校学生 18+，需验证学生身份，需要绑卡；到期自动续费 $19.99/月",endISO:"2026-12-31T23:59:59Z",endLabel:"2026-12-31 截止领取",url:"https://gemini.google/students/",source:"gemini.google 官方",srcDate:"2026-11-20"},
  {id:"gai-plus-student",title:"Google AI Plus 学生版 1年免费（140+市场）",cat:"AI 订阅",type:"学生优惠",trust:"official",valueLabel:"$59.88",valueNum:60,desc:"美国以外 140+ 市场高校学生，需要绑卡；到期自动续费 $4.99/月",endISO:"2026-12-31T23:59:59Z",endLabel:"2026-12-31 截止领取",url:"https://gemini.google/students/",source:"gemini.google 官方",srcDate:"2026-11-20"},
  {id:"chatgpt-vet",title:"ChatGPT Plus 美军/退伍军人 1年免费",cat:"AI 订阅",type:"定向优惠",trust:"unverified",valueLabel:"$240",valueNum:240,desc:"离现役 12 个月内美国服役人员/退伍军人，ID.me 验证",endISO:null,endLabel:"名额/期限以官方页为准",url:"https://openai.com/",source:"OpenAI 官方说明（聚合核实）",srcDate:"2026-11-20"},
  {id:"oracle",title:"Oracle Cloud Always Free 永久免费云主机",cat:"VPS·云",type:"永久免费",trust:"official",valueLabel:"永久免费层",valueNum:300,desc:"需要银行卡验证，Arm 容量常紧张；闲置实例可能被回收",endISO:null,endLabel:"永久免费层无截止",url:"https://www.oracle.com/cloud/free/",source:"oracle.com 官方",srcDate:"2026-11-20"},
  {id:"gcp",title:"Google Cloud $300 / 90天 + e2-micro 永久免费",cat:"VPS·云",type:"免费额度",trust:"official",valueLabel:"$300",valueNum:300,desc:"新用户，需要绑卡；超免费层按标准价计费",endISO:null,endLabel:"试用 90 天",url:"https://cloud.google.com/free",source:"cloud.google.com 官方",srcDate:"2026-11-20"},
  {id:"aws",title:"AWS 新用户最高 $200 额度（最长6个月）",cat:"VPS·云",type:"免费额度",trust:"official",valueLabel:"$200",valueNum:200,desc:"新 AWS 账户，$100 注册 + 完成任务再得 $100；Free 计划结束需升级付费计划",endISO:null,endLabel:"最长 6 个月",url:"https://aws.amazon.com/free/",source:"aws.amazon.com 官方",srcDate:"2026-11-20"},
  {id:"azure",title:"Azure $200 / 30天 + 12个月免费服务",cat:"VPS·云",type:"免费额度",trust:"official",valueLabel:"$200",valueNum:200,desc:"新 Azure 账户，需要验证；注意超额计费",endISO:null,endLabel:"额度 30 天 / 免费服务 12 个月",url:"https://azure.microsoft.com/en-us/free/",source:"azure.microsoft.com 官方",srcDate:"2026-11-20"},
  {id:"mexc",title:"MEXC 新用户最高 10,000 USDT 任务奖励",cat:"Crypto",type:"需交易量",trust:"unverified",valueLabel:"最高 10,000 USDT",valueNum:10000,desc:"需注册/KYC/入金/交易量任务，非无条件赠送；高宣传额需高交易量，加密资产风险高",endISO:null,endLabel:"以活动页为准",url:"https://www.mexc.com/",source:"聚合站汇总，未在官方活动页完全核实",srcDate:"2026-11-20"},
  {id:"gate-kor",title:"Gate.io CandyDrop #190 KOR 空投",cat:"Crypto",type:"空投·积分",trust:"unverified",valueLabel:"18,000,000 KOR 奖池",valueNum:100,desc:"需 KYC、现货交易量任务；交易有风险",endISO:"2026-11-20T08:00:00Z",endLabel:"2026-11-20 08:00 UTC",url:"https://www.gate.io/",source:"Gate 公告（聚合核实）",srcDate:"2026-11-20"}
];

const UA = {"user-agent":"GlobalDealHunter/3.0 (+https://global-deal-hunter.u20261103.workers.dev)","accept":"*/*"};

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
    out.push({id:"ffd-"+slug(name), title:name+" — 免费层", cat:"免费API·云服务", type:"永久免费层", trust:"list", valueLabel:section||"免费层", valueNum:0, desc:desc||"free-for-dev 社区清单收录的免费层服务", endISO:null, endLabel:"长期（以官网为准）", url, source:"free-for-dev · "+(section||"清单"), srcDate:null});
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
    out.push({id:"pa-"+slug(m[1]), title:m[1]+" API", cat:"免费API", type:(auth==="No"?"免费API·免Key":"免费API·需Key"), trust:"list", valueLabel:section||"免费 API", valueNum:0, desc:(cells[2]||"").slice(0,200), endISO:null, endLabel:"长期（以官网为准）", url:m[2], source:"public-apis · "+(section||"目录"), srcDate:null});
    if(out.length>=120) break;
  }
  return out;
}

async function fetchGitHub(){
  const queries=[
    "topic:free-tier",
    "topic:free-api",
    "free tier in:description stars:>100"
  ];
  const out=[]; const seen=new Set();
  for(const q of queries){
    const j=await fetchJSON("https://api.github.com/search/repositories?q="+encodeURIComponent(q)+"&sort=updated&order=desc&per_page=20");
    for(const r of (j.items||[])){
      if(seen.has(r.full_name)) continue; seen.add(r.full_name);
      out.push({id:"gh-"+r.id, title:r.full_name, cat:"GitHub 最新", type:"开源项目", trust:"list", valueLabel:"★ "+r.stargazers_count, valueNum:r.stargazers_count||0, desc:(r.description||"GitHub 最新免费/免费层相关开源项目").slice(0,220), endISO:null, endLabel:"开源项目", url:r.html_url, source:"GitHub Search · "+(r.language||""), srcDate:(r.pushed_at||"").slice(0,10)||null, stars:r.stargazers_count||0});
    }
  }
  return out;
}

async function refresh(env){
  const counts={seed:SEED.length, freeForDev:0, publicApis:0, github:0};
  const errors=[]; let items=[...SEED];
  try{ const t=await fetchText("https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md"); const p=parseFreeForDev(t); counts.freeForDev=p.length; items=items.concat(p); }catch(e){ errors.push("free-for-dev: "+e.message); }
  try{ const t=await fetchText("https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"); const p=parsePublicApis(t); counts.publicApis=p.length; items=items.concat(p); }catch(e){ errors.push("public-apis: "+e.message); }
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
<title>GLOBAL DEAL HUNTER | 全球羊毛情报中心</title>
<style>
body{margin:0;background:#0b0f0c;color:#e8f0e8;font-family:system-ui,-apple-system,Segoe UI,Roboto,"PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:20px 14px 60px}
.dot{color:#b7f28a}.muted{color:#9db09d;font-size:13px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
.stat{background:#151a15;border:1px solid #263026;border-radius:16px;padding:14px;text-align:center}.stat b{font-size:30px;color:#b7f28a;display:block}
.btn{background:#b7f28a;color:#0b0f0c;border:0;border-radius:12px;padding:12px 18px;font-weight:700;cursor:pointer}
.btn2{background:#1a211a;color:#e8f0e8;border:1px solid #2c382c;border-radius:12px;padding:12px 16px;cursor:pointer}
.btn2.on{background:#b7f28a;color:#0b0f0c;font-weight:700}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.chip{border:1px solid #2c382c;background:#151a15;color:#e8f0e8;border-radius:999px;padding:8px 13px;cursor:pointer;font-size:13px}.chip.on{background:#b7f28a;color:#0b0f0c;font-weight:700}
input,select{background:#121612;color:#e8f0e8;border:1px solid #2c382c;border-radius:12px;padding:12px;font-size:14px}
input{flex:1;min-width:200px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:760px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}
.card{background:#121612;border:1px solid #263026;border-radius:16px;padding:16px}.card h3{margin:8px 0 6px;font-size:16px}.card p{margin:4px 0}
.tag{display:inline-block;border:1px solid #3a4a3a;border-radius:8px;padding:2px 8px;margin-right:6px;font-size:12px}.warn{color:#f2c14e}.ok{color:#b7f28a}
.desc{color:#c8d6c8;font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
a{color:#b7f28a}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
</style></head><body><div class="wrap">
<p><span class="dot">●</span> LIVE SIGNAL · 全自动更新 · 无需手动添加</p>
<h1 style="margin:6px 0">GLOBAL DEAL HUNTER｜全球羊毛情报中心</h1>
<p class="muted" id="metaLine">正在加载数据…</p>
<div class="stats"><div class="stat"><b id="sTotal">–</b>进行中</div><div class="stat"><b id="sToday">–</b>今日更新</div><div class="stat"><b style="color:#f2c14e" id="sSoon">–</b>7天内截止</div><div class="stat"><b id="sPending">–</b>待核实</div></div>
<div class="row">
<button class="btn" id="btnRefresh">↻ 立即自动抓取最新</button>
<button class="btn2 on" id="tabDeals">优惠情报</button>
<button class="btn2" id="tabRes">免费算力组合</button>
</div>
<div id="viewDeals">
<div class="chips" id="chips"></div>
<div class="row"><input id="q" placeholder="搜索：Gemini、免费 API、VPS、空投、开源项目..."><select id="sort"><option value="new">最新更新</option><option value="hot">热度最高</option><option value="end">即将截止</option></select></div>
<div class="grid" id="list" style="margin-top:14px"></div>
<p style="text-align:center;margin-top:18px"><button class="btn2" id="btnMore" style="display:none">显示更多</button></p>
</div>
<div id="viewRes" style="display:none"><div class="grid" id="res" style="margin-top:14px"></div>
<p class="muted">规则：只用免费计划，不绑卡、不升级、不付费。遇登录/授权/验证码/密码立即停下由你接管；每项先实际验证可用再进入下一项。状态为信息整理，不代表已开通。</p></div>
<p class="muted" style="margin-top:26px">数据来源：人工核实种子（官方页）· free-for-dev 社区清单 · public-apis 免费 API 目录 · GitHub Search 最新项目。系统每 2 小时自动抓取一次，打开页面时若数据超过 2 小时也会自动刷新；过期活动自动归档到「已结束」。社区清单条目标「清单收录」，未在官方页核实的标「待核实」，请以官方页为准。</p>
</div><script>
const RES=${res};
let deals=[], meta=null, filter='全部', shown=80;
let favs=new Set(JSON.parse(localStorage.getItem('favs')||'[]'));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function trustTag(d){return d.trust==='official'?'<span class="tag ok">官方核实</span>':d.trust==='list'?'<span class="tag">清单收录</span>':'<span class="tag warn">待核实</span>'}
function cats(){const m={};deals.filter(d=>!d.ended).forEach(d=>{m[d.cat]=(m[d.cat]||0)+1});return Object.keys(m).sort((a,b)=>m[b]-m[a]).map(c=>[c,m[c]])}
function renderChips(){const base=['全部','即将截止','已结束','我的收藏'];const cc=cats();document.getElementById('chips').innerHTML=base.concat(cc.map(x=>x[0])).map(c=>{let n='';if(c==='我的收藏')n=' ('+favs.size+')';else{const f=cc.find(x=>x[0]===c);if(f)n=' ('+f[1]+')'}return '<button class="chip '+(filter===c?'on':'')+'" onclick="setF(\\''+c.replace(/'/g,"")+'\\')">'+esc(c)+n+'</button>'}).join('')}
function setF(c){filter=c;shown=80;render()}
function soon7(d){return d.endISO && !d.ended && (new Date(d.endISO).getTime()-Date.now())<7*864e5}
function render(){
 const today=new Date().toISOString().slice(0,10);
 const active=deals.filter(d=>!d.ended);
 sTotal.textContent=active.length;
 sToday.textContent=deals.filter(d=>d.srcDate===today).length;
 sSoon.textContent=deals.filter(soon7).length;
 sPending.textContent=active.filter(d=>d.trust==='unverified').length;
 if(meta){metaLine.textContent='上次自动更新：'+new Date(meta.updatedAt).toLocaleString('zh-CN')+' · 共 '+meta.total+' 条 · 来源：人工核实 '+meta.counts.seed+' / free-for-dev '+meta.counts.freeForDev+' / public-apis '+meta.counts.publicApis+' / GitHub '+meta.counts.github+(meta.errors&&meta.errors.length?' · 部分来源抓取失败：'+meta.errors.join('；'):'')}
 renderChips();
 let q=document.getElementById('q').value.toLowerCase();
 let arr=deals.filter(d=>{
   if(filter==='全部'&&d.ended)return false;
   if(filter==='已结束'&&!d.ended)return false;
   if(filter==='即将截止'&&!soon7(d))return false;
   if(filter==='我的收藏'&&!favs.has(d.id))return false;
   if(filter!=='全部'&&filter!=='已结束'&&filter!=='即将截止'&&filter!=='我的收藏'&&d.cat!==filter)return false;
   return (d.title+' '+d.cat+' '+d.type+' '+(d.desc||'')).toLowerCase().includes(q);
 });
 const sv=document.getElementById('sort').value;
 if(sv==='hot')arr.sort((a,b)=>(b.valueNum||0)-(a.valueNum||0));
 else if(sv==='end')arr.sort((a,b)=>(a.endISO?new Date(a.endISO).getTime():9e15)-(b.endISO?new Date(b.endISO).getTime():9e15));
 else arr.sort((a,b)=>String(b.srcDate||'').localeCompare(String(a.srcDate||''))||(b.valueNum||0)-(a.valueNum||0));
 document.getElementById('list').innerHTML=arr.slice(0,shown).map(d=>'<div class="card"><span class="tag ok">'+esc(d.cat)+'</span><span class="tag">'+esc(d.type)+'</span>'+trustTag(d)+' <a href="#" onclick="toggleFav(\\''+d.id+'\\');return false" style="float:right;text-decoration:none">'+(favs.has(d.id)?'★':'☆')+'</a><h3>'+esc(d.title)+'</h3><p class="desc">'+esc(d.desc||'')+'</p><p class="muted">价值/规格：'+esc(d.valueLabel||'—')+' · 截止：'+esc(d.endLabel||'长期')+(d.srcDate?' · 更新：'+esc(d.srcDate):'')+'</p><p class="muted">来源：'+esc(d.source)+'</p><a href="'+esc(d.url)+'" target="_blank" rel="noopener">前往官方/项目页 →</a></div>').join('')||'<p class="muted">暂无符合条件的条目</p>';
 document.getElementById('btnMore').style.display=arr.length>shown?'':'none';
}
function toggleFav(id){favs.has(id)?favs.delete(id):favs.add(id);localStorage.setItem('favs',JSON.stringify([...favs]));render()}
async function load(force){
 document.getElementById('btnRefresh').textContent='抓取中…';
 try{const r=await fetch(force?'/api/refresh':'/api/deals');const j=await r.json();deals=j.deals||[];meta=j.meta||null;}catch(e){metaLine.textContent='加载失败，请稍后刷新页面重试'}
 document.getElementById('btnRefresh').textContent='↻ 立即自动抓取最新';render();
}
document.getElementById('btnRefresh').onclick=()=>{shown=80;load(true)};
document.getElementById('btnMore').onclick=()=>{shown+=80;render()};
document.getElementById('q').addEventListener('input',()=>{shown=80;render()});
document.getElementById('sort').addEventListener('change',render);
document.getElementById('tabDeals').onclick=()=>{viewDeals.style.display='';viewRes.style.display='none';tabDeals.classList.add('on');tabRes.classList.remove('on')};
document.getElementById('tabRes').onclick=()=>{viewDeals.style.display='none';viewRes.style.display='';tabRes.classList.add('on');tabDeals.classList.remove('on')};
document.getElementById('res').innerHTML=RES.map(r=>'<div class="card"><span class="tag warn">'+esc(r.st)+'</span><h3>'+esc(r.n)+'</h3><p class="desc">'+esc(r.spec)+'</p><p class="muted">验证：'+esc(r.verify)+'</p><p class="muted">注意：'+esc(r.note)+'</p><a href="'+esc(r.url)+'" target="_blank" rel="noopener">官方入口 →</a></div>').join('');
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
