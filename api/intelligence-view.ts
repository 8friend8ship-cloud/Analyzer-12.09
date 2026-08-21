export default async function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Central Intelligence Hub</title>
<style>
body{margin:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:1200px;margin:auto;padding:24px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.card{background:#111827;border:1px solid #263244;border-radius:14px;padding:16px}.muted{color:#94a3b8;font-size:13px}button,select,input{background:#182235;color:#fff;border:1px solid #334155;border-radius:8px;padding:9px}button{cursor:pointer}pre{white-space:pre-wrap;word-break:break-word;max-height:420px;overflow:auto;background:#070b14;padding:14px;border-radius:10px}.ok{color:#4ade80}.bad{color:#f87171}.tag{display:inline-block;padding:3px 8px;border:1px solid #334155;border-radius:999px;margin:2px;font-size:12px}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}h1{margin:0 0 4px}h2{font-size:17px}
</style></head><body><div class="wrap">
<div class="top"><div><h1>Central Intelligence Hub</h1><div class="muted">중앙에이전트 관할 · Queens / Seed / T1 / T2 / Trend / Platform 공유 버스</div></div><button onclick="loadAll()">새로고침</button></div>
<div class="grid" style="margin-top:18px">
<div class="card"><h2>Backend Health</h2><div id="health" class="muted">확인 중...</div></div>
<div class="card"><h2>App Data Feed</h2><div class="row"><select id="app"><option>ALL_APPS</option><option>APP_DRYWRITE</option><option>APP_TRAVEL</option><option>APP_INTERIOR</option><option>APP_BIBLE365</option><option>APP_KFOOD</option><option>APP_ANIMATION</option><option>APP_BOTS</option></select><button onclick="loadEvents()">불러오기</button></div><div class="muted">각 앱은 자기 APP_ID로 같은 데이터 버스를 조회합니다.</div></div>
<div class="card"><h2>Evolution Rule</h2><span class="tag">QUEENS_EXPAND</span><span class="tag">SEED_UPDATE</span><span class="tag">T1_UPDATE</span><span class="tag">T2_RULE_UPDATE</span><span class="tag">FUNCTION_CHANGE</span><span class="tag">FRONT_UI_CHANGE</span><span class="tag">PLATFORM_EXPERIMENT</span></div>
</div>
<div class="card" style="margin-top:14px"><h2>Shared Intelligence Events</h2><pre id="events">Loading...</pre></div>
<script>
async function j(url,opt){const r=await fetch(url,opt);let b;try{b=await r.json()}catch{b={ok:false,error:'NON_JSON'}};return {status:r.status,body:b}}
async function loadHealth(){const x=await j('/api/intelligence?action=health');const el=document.getElementById('health');el.className=x.body&&x.body.ok?'ok':'bad';el.textContent=x.body&&x.body.ok?'CONNECTED · '+(x.body.version||'READY'):'NOT LIVE · '+(x.body.error||x.status)}
async function loadEvents(){const a=document.getElementById('app').value;const x=await j('/api/intelligence?action=events&app_id='+encodeURIComponent(a)+'&limit=100');document.getElementById('events').textContent=JSON.stringify(x.body,null,2)}
async function loadAll(){await loadHealth();await loadEvents()}loadAll();
</script></div></body></html>`);
}
