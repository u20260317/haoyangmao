// GLOBAL DEAL HUNTER | 全球羊毛情报中心 — Cloudflare Worker 单文件版
// 部署: PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/global-deal-hunter
// 说明: 本版为独立看板（数据内置 + 浏览器本地收藏/手动添加）。
// Muse Space 版仍负责每 2 小时 AI 巡检；Worker 版不含 Muse 后台巡检/KV 数据库。

const DEALS = [
  {id:"ms365",title:"Microsoft 365 Premium 1个月免费试用",cat:"AI 订阅",type:"免费试用",verified:true,value:"$19.99",valueNum:20,cond:"试用后自动续费 $19.99/月，需在微软账户取消",region:"全球（以微软商店地区为准）",end:"长期试用入口",steps:"打开官方试用页 → 登录微软账户 → 开通试用 → 设置到期前提醒取消",url:"https://www.microsoft.com/en-us/microsoft-365/try-premium",source:"microsoft.com 官方",risk:"忘记取消会扣费"},
  {id:"gai-student",title:"Google AI Pro 学生版 1年免费",cat:"AI 订阅",type:"学生优惠",verified:true,value:"$239.88",valueNum:240,cond:"美国高校学生 18+，需验证学生身份，需要绑卡",region:"美国",end:"2026-12-31",steps:"打开 Gemini 学生优惠页 → 验证学生身份 → 绑卡开通 → 到期前取消",url:"https://gemini.google/students/",source:"gemini.google 官方",risk:"到期自动续费 $19.99/月"},
  {id:"gai-plus-student",title:"Google AI Plus 学生版 1年免费（140+市场）",cat:"AI 订阅",type:"学生优惠",verified:true,value:"$59.88",valueNum:60,cond:"美国以外 140+ 市场高校学生，需要绑卡",region:"140+ 市场（不含加拿大）",end:"2026-12-31",steps:"打开官方学生页 → 验证身份 → 开通 AI Plus → 记录取消日期",url:"https://gemini.google/students/",source:"gemini.google 官方",risk:"到期自动续费 $4.99/月"},
  {id:"chatgpt-vet",title:"ChatGPT Plus 美军/退伍军人 1年免费",cat:"AI 订阅",type:"定向优惠",verified:false,value:"$240",valueNum:240,cond:"离现役 12 个月内美国服役人员/退伍军人，ID.me 验证",region:"美国",end:"名额/期限以官方页为准",steps:"打开 OpenAI 优惠说明 → ID.me 验证 → 领取 Plus",url:"https://openai.com/",source:"OpenAI 官方说明（聚合核实）",risk:"资格不符无法领取，标待核实"},
  {id:"oracle",title:"Oracle Cloud Always Free 永久免费云主机",cat:"VPS·云",type:"永久免费",verified:true,value:"$300 试用 + 永久免费",valueNum:300,cond:"需要银行卡验证，Arm 容量常紧张",region:"全球（分区库存不同）",end:"永久免费层无截止",steps:"注册 Oracle Cloud → 验证 → 开通 Always Free Arm 2 OCPU/12GB + 2台 AMD 微型机",url:"https://www.oracle.com/cloud/free/",source:"oracle.com 官方",risk:"闲置实例可能被回收，预付卡不接受"},
  {id:"gcp",title:"Google Cloud $300 / 90天 + e2-micro 永久免费",cat:"VPS·云",type:"免费额度",verified:true,value:"$300",valueNum:300,cond:"新用户，需要绑卡",region:"全球",end:"试用 90 天",steps:"开通 Google Cloud 试用 → 使用 $300 额度 → 保留 1台 e2-micro 免费层",url:"https://cloud.google.com/free",source:"cloud.google.com 官方",risk:"超免费层按标准价计费"},
  {id:"aws",title:"AWS 新用户最高 $200 额度（最长6个月）",cat:"VPS·云",type:"免费额度",verified:true,value:"$200",valueNum:200,cond:"新 AWS 账户，$100 注册 + 完成任务再得 $100",region:"全球",end:"最长 6 个月",steps:"注册 AWS Free 计划 → 领取 $100 → 完成新手任务得额外额度",url:"https://aws.amazon.com/free/",source:"aws.amazon.com 官方",risk:"Free 计划结束需升级付费计划"},
  {id:"azure",title:"Azure $200 / 30天 + 12个月免费服务",cat:"VPS·云",type:"免费额度",verified:true,value:"$200",valueNum:200,cond:"新 Azure 账户，需要验证",region:"全球",end:"额度 30 天 / 免费服务 12 个月",steps:"开通 Azure 免费账户 → 30天内用 $200 → 使用 12个月免费 VM 等服务",url:"https://azure.microsoft.com/en-us/free/",source:"azure.microsoft.com 官方",risk:"超额计费，注意用量"},
  {id:"mexc",title:"MEXC 新用户最高 10,000 USDT 任务奖励",cat:"Crypto",type:"需交易量",verified:false,value:"最高 10,000 USDT",valueNum:10000,cond:"需注册/KYC/入金/交易量任务，非无条件赠送",region:"受限地区除外",end:"以活动页为准",steps:"先看官方活动规则 → 再决定是否注册/KYC → 按任务完成",url:"https://www.mexc.com/",source:"聚合站汇总，未在官方活动页完全核实",risk:"高宣传额需高交易量，加密资产风险高，标待核实"},
  {id:"gate-kor",title:"Gate.io CandyDrop #190 KOR 空投",cat:"Crypto",type:"空投·积分",verified:false,value:"18,000,000 KOR 奖池",valueNum:100,cond:"需 KYC、现货交易量任务",region:"受限地区除外",end:"2026-11-20 08:00 UTC",steps:"打开 Gate 公告 → 报名 → 完成现货/签到任务",url:"https://www.gate.io/",source:"Gate 公告（聚合核实）",risk:"即将截止，交易有风险，标待核实"}
];

function html(){
  const data = JSON.stringify(DEALS).replace(/</g,"\\u003c");
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GLOBAL DEAL HUNTER | 全球羊毛情报中心</title>
<style>
body{margin:0;background:#0b0f0c;color:#e8f0e8;font-family:system-ui,-apple-system,Segoe UI,Roboto,"PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:20px 14px 60px}
.dot{color:#b7f28a}.muted{color:#9db09d}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
.stat{background:#151a15;border:1px solid #263026;border-radius:16px;padding:16px;text-align:center}.stat b{font-size:32px;color:#b7f28a;display:block}
.btn{background:#b7f28a;color:#0b0f0c;border:0;border-radius:14px;padding:14px 18px;font-weight:700;cursor:pointer}
.btn2{background:#1a211a;color:#e8f0e8;border:1px solid #2c382c;border-radius:14px;padding:14px 18px;cursor:pointer}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.chip{border:1px solid #2c382c;background:#151a15;color:#e8f0e8;border-radius:999px;padding:9px 14px;cursor:pointer}.chip.on{background:#b7f28a;color:#0b0f0c;font-weight:700}
input,select{width:100%;box-sizing:border-box;background:#121612;color:#e8f0e8;border:1px solid #2c382c;border-radius:12px;padding:13px;margin:6px 0}
.card{background:#121612;border:1px solid #263026;border-radius:18px;padding:18px;margin:12px 0}.tag{display:inline-block;border:1px solid #3a4a3a;border-radius:8px;padding:3px 8px;margin-right:6px;font-size:12px}.warn{color:#f2c14e;border-style:dashed}.ok{color:#b7f28a}
a{color:#b7f28a} @media(max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}}
</style></head><body><div class="wrap">
<p><span class="dot">●</span> LIVE SIGNAL · 每 2 小时自动巡检（Muse Space 版） · Worker 镜像版</p>
<h1>GLOBAL DEAL HUNTER｜全球羊毛情报中心</h1>
<div class="stats"><div class="stat"><b id="sTotal"></b>进行中</div><div class="stat"><b id="sToday"></b>今日更新</div><div class="stat"><b style="color:#f2c14e" id="sSoon"></b>7天内截止</div><div class="stat"><b id="sPending"></b>待核实</div></div>
<button class="btn" onclick="location.reload()">↻ 立即巡检新优惠</button> <button class="btn2" onclick="document.getElementById('add').style.display='block'">+ 手动添加</button>
<p class="muted">未在官方域名核实的条目均标「待核实」。区分真免费、免费试用、需充值、需交易量和需邀请条件。</p>
<h2 style="margin-top:28px">免费算力组合 · 算力管理</h2>
<p class="muted">规则：只用免费计划，不绑卡、不升级、不付费。遇登录、Google 授权、手机验证码、人脸、协议确认、密码输入立即停下，由你接管。每项先实际验证可用再进入下一项。</p>
<div id="res"></div>
<div class="chips" id="chips"></div>
<input id="q" placeholder="搜索：ChatGPT、空投、开户奖励、免费 VPS...">
<div id="add" style="display:none"><input id="aTitle" placeholder="活动名称*"><input id="aCat" placeholder="类别，如 AI 订阅"><input id="aUrl" placeholder="官方链接*"><button class="btn" onclick="addDeal()">提交添加（存本地）</button></div>
<div id="list"></div>
</div><script>
const seed=${data}; let deals=[...seed,...JSON.parse(localStorage.getItem('extra')||'[]')]; let favs=new Set(JSON.parse(localStorage.getItem('favs')||'[]')); let filter='全部';
const cats=['全部','今日最新','高价值排行','AI 订阅','Crypto','VPS·云','软件·数字','即将截止','我的收藏'];
function renderChips(){document.getElementById('chips').innerHTML=cats.map(c=>'<button class="chip '+(filter===c?'on':'')+'" onclick="setF(\\''+c+'\\')">'+c+(c==='我的收藏'?' ('+favs.size+')':'')+'</button>').join('')}
function setF(c){filter=c;render()}
function addDeal(){const t=aTitle.value.trim(),u=aUrl.value.trim();if(!t||!u)return alert('名称和链接必填');const d={id:Date.now()+'',title:t,cat:aCat.value||'其他',type:'手动添加',verified:false,value:'—',valueNum:0,cond:'手动添加，待核实',region:'—',end:'—',steps:'打开官方链接查看',url:u,source:'手动添加',risk:'待核实'};let ex=JSON.parse(localStorage.getItem('extra')||'[]');ex.push(d);localStorage.setItem('extra',JSON.stringify(ex));deals.push(d);render()}
function toggleFav(id){favs.has(id)?favs.delete(id):favs.add(id);localStorage.setItem('favs',JSON.stringify([...favs]));render()}
function render(){renderChips();sTotal.textContent=deals.length;sToday.textContent=deals.length;sSoon.textContent=deals.filter(d=>String(d.end).includes('2026-11')).length;sPending.textContent=deals.filter(d=>!d.verified).length;
 let q=document.getElementById('q').value.toLowerCase(); let arr=deals.filter(d=>(filter==='全部'||filter==='今日最新'||(filter==='高价值排行')||d.cat===filter||(filter==='我的收藏'&&favs.has(d.id)))&&(d.title+d.cat+d.type).toLowerCase().includes(q)); if(filter==='高价值排行')arr.sort((a,b)=>b.valueNum-a.valueNum);
 document.getElementById('list').innerHTML=arr.map(d=>'<div class="card"><span class="tag ok">'+d.cat+'</span><span class="tag">'+d.type+'</span><span class="tag '+(d.verified?'ok':'warn')+'">'+(d.verified?'已核实':'待核实')+'</span> <a href="#" onclick="toggleFav(\\''+d.id+'\\');return false" style="float:right;text-decoration:none">'+(favs.has(d.id)?'★':'☆')+'</a><h3>'+d.title+'</h3><p>'+d.cond+'</p><p class="muted">价值：'+d.value+' · 地区：'+d.region+' · 截止：'+d.end+'</p><p class="muted">步骤：'+d.steps+'</p><p class="muted">来源：'+d.source+' · 风险：'+d.risk+'</p><a href="'+d.url+'" target="_blank" rel="noopener">前往官方活动 →</a></div>').join('')||'<p class="muted">暂无符合条件的优惠</p>'}
const RES=[
 {n:'P1 Kaggle 免费 GPU T4 x2',spec:'约30 GPU小时/周 · 单次最长12h · 20GB 持久输出',st:'等待用户登录/验证',cls:'warn',verify:'新建 Notebook → GPU T4 x2 + Internet + Persistence → !nvidia-smi + 简单 Python 计算',note:'必须先手机验证才能开 GPU 和联网，这是第一个停点',url:'https://www.kaggle.com/code'},
 {n:'P1 Google Colab 免费 T4',spec:'T4 不保证 · 额度不公开 · 单次最长12h · 不绑卡',st:'等待用户登录/验证',cls:'warn',verify:'新建 Notebook → 切 GPU → !nvidia-smi + 小型测试',note:'免费版禁止代理/网页服务器/SSH/绕过 Notebook 界面用 Web UI，ComfyUI 只能做 Notebook 内实验',url:'https://colab.research.google.com/'},
 {n:'P2 Simular Box 免费云电脑',spec:'一次性 5,000 credits 约50小时 · 90天有效 · 1账号1台',st:'等待用户登录/验证',cls:'warn',verify:'登录确认机器可用 → 终端跑小 Python 程序',note:'闲置休眠，连续休眠14天会删除（含文件）',url:'https://box.simular.ai'},
 {n:'P2 InstaBox 免费云电脑',spec:'1台 4核/8GB · 20GB · 100GB/月出站 · Debian 13',st:'等待用户登录/验证',cls:'warn',verify:'创建机器 → 终端跑 Python → 单次会话内可测 ComfyUI',note:'闲置30分钟暂停，单次最长480分钟，无入站公网IPv4，不是常驻VPS，不适合常驻节点',url:'https://instabox.sh'},
 {n:'P3 Cloady 免费档（Xray 谨慎尝试）',spec:'0.5 vCPU / 1GB / 5GB · 美国 USE1/USW1 免费区',st:'待核实',cls:'warn',verify:'登录后先确认区域和 $0.00/mo，未确认不部署、不生成节点链接',note:'ToS 未明确禁止个人代理，但禁止 Tor/挖矿/转售/绕过限制，免费月流量很低',url:'https://cloady.com'},
 {n:'P3 Railway VLESS',spec:'$5 一次性试用，非长期免费',st:'政策禁止 · 已停止',cls:'warn',verify:'不部署，不生成 Shadowrocket 链接',note:'Railway 官方明确禁止 proxies/VPN/anonymization，私人单用户 Xray/VLESS 也不例外',url:'https://railway.com'}
];
document.getElementById('res').innerHTML=RES.map(r=>'<div class="card"><span class="tag '+(r.st.includes('政策')?'warn':'ok')+'">'+r.st+'</span><h3>'+r.n+'</h3><p>'+r.spec+'</p><p class="muted">验证：'+r.verify+'</p><p class="muted">注意：'+r.note+'</p><a href="'+r.url+'" target="_blank" rel="noopener">官方入口 →</a></div>').join('');
document.getElementById('q').addEventListener('input',render); render();
</script></body></html>`;
}

export default {
  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==="/api/deals") return Response.json({deals:DEALS,updated:new Date().toISOString()});
    if(url.pathname==="/health") return new Response("ok");
    return new Response(html(),{headers:{"content-type":"text/html;charset=utf-8","cache-control":"public,max-age=300"}});
  }
};
