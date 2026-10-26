// Browser presentation only. Repository content is inserted through textContent.
export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Handoff · 本地交接看板</title><style>
:root{font:15px/1.6 system-ui,sans-serif;color:#222;background:#f6f5f2}body{max-width:1200px;margin:0 auto;padding:32px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;padding-bottom:20px}h1{font-size:26px;margin:0}h2{font-size:18px}p{margin:8px 0}.muted{color:#666}button{font:inherit;border:1px solid #aaa;border-radius:5px;padding:6px 12px;background:#fff;cursor:pointer}button:hover,button:focus-visible{border-color:#175b4b;background:#eaf3ef}#graph{overflow:auto;border:1px solid #ddd;background:white;border-radius:6px;min-height:150px;margin:22px 0}svg{display:block}#error{color:#9b2525;white-space:pre-wrap}#details{padding:20px;background:white;border:1px solid #ddd}pre{font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:100px 1fr}dt{color:#666}dd{margin:0;overflow-wrap:anywhere}.node{cursor:pointer}.node rect{fill:#f7f9f8;stroke:#9aaba4}.node:focus rect,.node:hover rect{stroke:#175b4b;stroke-width:2}svg text{font:13px system-ui,sans-serif;fill:#222}.edge{stroke:#83938b;fill:none;stroke-width:1.5}@media(max-width:600px){body{padding:16px}header{align-items:start;gap:16px}}
</style></head><body>
<header><div><h1>Handoff</h1><p class="muted">本地只读交接看板 · 按父子关系展示分叉与汇合</p></div><button id="refresh">刷新</button></header>
<p id="connection" class="muted" role="status">每 5 秒刷新</p><p id="error" role="alert"></p>
<dl><dt>项目</dt><dd id="root">—</dd><dt>分支</dt><dd id="branch">—</dd><dt>Git HEAD</dt><dd id="head">—</dd><dt>当前交接</dt><dd id="seal">—</dd></dl>
<div id="graph" aria-label="交接关系图"></div><section id="details" hidden><h2 id="detail-title"></h2><pre id="detail"></pre></section>
<script>${dashboardScript}</script></body></html>`;
}

export const dashboardScript = String.raw`
const byId = id => document.getElementById(id);
const text = (id, value) => { byId(id).textContent = value; };
const svgNode = (name, attrs, label) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, String(value)));
  if (label !== undefined) node.textContent = label;
  return node;
};
async function read(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '读取失败：' + response.status);
  return body;
}
function draw(seals) {
  const graph = byId('graph'); graph.replaceChildren();
  if (!seals.length) { graph.textContent = '还没有交接。运行 handoff prepare 开始。'; return; }
  const nodes = new Map(seals.map(s => [s.id,s]));
  const depths = new Map();
  function depth(id, visiting = new Set()) {
    if (depths.has(id)) return depths.get(id);
    if (visiting.has(id)) throw new Error('交接关系包含循环');
    visiting.add(id);
    const parents = (nodes.get(id).parents || []).filter(p => nodes.has(p));
    const d = parents.length ? 1 + Math.max(...parents.map(p => depth(p, new Set(visiting)))) : 0;
    depths.set(id,d); return d;
  }
  const rows = new Map(); const positions = new Map();
  [...seals].sort((a,b) => a.id-b.id).forEach(s => {
    const col = depth(s.id); const row = rows.get(col) || 0; rows.set(col,row+1);
    positions.set(s.id,{x:24+col*280,y:24+row*120});
  });
  const svg = svgNode('svg',{width:(Math.max(...depths.values())+1)*280+24,height:Math.max(...rows.values())*120+24,role:'img','aria-label':'交接 DAG'});
  const defs = svgNode('defs',{}); const marker = svgNode('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
  marker.append(svgNode('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#83938b'})); defs.append(marker); svg.append(defs);
  seals.forEach(s => (s.parents || []).forEach(parent => {
    const a=positions.get(parent), b=positions.get(s.id); if (!a || !b) return;
    svg.append(svgNode('path',{class:'edge',d:'M '+(a.x+230)+' '+(a.y+42)+' C '+(a.x+255)+' '+(a.y+42)+', '+(b.x-25)+' '+(b.y+42)+', '+b.x+' '+(b.y+42),'marker-end':'url(#arrow)','data-parent':parent,'data-child':s.id}));
  }));
  const labels = {open:'待接手',claimed:'进行中',done:'已接续'};
  seals.forEach(s => {
    const p=positions.get(s.id); const group=svgNode('g',{class:'node',tabindex:0,role:'button','aria-label':'交接 '+s.id,transform:'translate('+p.x+','+p.y+')'});
    group.append(svgNode('rect',{width:230,height:84,rx:6}),svgNode('text',{x:12,y:24},'#'+s.id+' · '+s.kind+' · '+labels[s.status]),svgNode('text',{x:12,y:47},s.lane),svgNode('text',{x:12,y:69},(s.next || '').slice(0,25)));
    group.addEventListener('click',()=>details(s.id));
    group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();details(s.id);}}); svg.append(group);
  });
  graph.append(svg);
}
let busy=false;
async function refresh() {
  if(busy) return; busy=true;
  try {
    const data=await read('/api/handoffs');
    text('root',data.project.root); text('branch',data.project.branch);
    text('head',data.project.head ? String(data.project.head).slice(0,12) : '无提交');
    text('seal',data.project.seal === null ? '未载入' : '#'+data.project.seal);
    draw(data.seals); text('error',''); text('connection','每 5 秒刷新 · 最近成功 '+new Date().toLocaleTimeString());
  } catch(error) { text('error',error.message); text('connection','读取失败，5 秒后重试'); }
  finally { busy=false; }
}
async function details(id) {
  byId('details').hidden=false; text('detail-title','交接 #'+id); text('detail','读取中…');
  try { const data=await read('/api/handoffs/'+id); text('detail',[data.brief,data.state,data.lane].filter(Boolean).join('\n\n')); }
  catch(error) { text('detail',error.message); }
}
byId('refresh').addEventListener('click',refresh);
refresh(); setInterval(refresh,5000);
`;
