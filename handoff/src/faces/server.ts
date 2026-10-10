// faces/server.ts — HTTP server and Cognitive Mission Control Web Dashboard.
// Zero external runtime dependencies; runs natively on Node >= 24.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { exec } from 'node:child_process';
import { show, showTurn } from '../kernel/show.ts';
import { views } from '../kernel/prepare.ts';
import { caller } from '../agents.ts';
import { wire } from '../wire.ts';
import type { SealView } from '../core/types.ts';

export interface ServerOptions {
  readonly port?: number;
  readonly openBrowser?: boolean;
  readonly cwd?: string;
}

export async function startServer(opts: ServerOptions = {}): Promise<{ port: number; close: () => Promise<void> }> {
  const port = opts.port ?? Number(process.env.HANDOFF_PORT ?? 4040);
  const cwd = opts.cwd ?? process.cwd();
  const at = () => wire(cwd, { agent: caller(), session: null });

  const clients = new Set<ServerResponse>();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    // CORS headers for multi-agent mesh communication
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // 1. A2A v1.0 Agent Card
      if (pathname === '/.well-known/agent.json') {
        const ctx = await at();
        const all = await views(ctx);
        const card = {
          name: 'handoff',
          version: '3.0.0',
          description: 'Cross-agent session relay & cognitive continuity mesh',
          url: `http://localhost:${port}`,
          protocol: 'A2A/1.0',
          capabilities: ['session.seal', 'session.relay', 'task.fork', 'task.join', 'voice.provenance'],
          active_seals: all.length,
          schema: 'https://handoff.dev/schemas/v3/agent.json',
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(card, null, 2));
        return;
      }

      // 2. Real-time SSE Stream
      if (pathname === '/api/mesh/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
      }

      // 3. API: DAG & Mesh Summary
      if (pathname === '/api/mesh/dag') {
        const ctx = await at();
        const all = await views(ctx);
        const head = ctx.desk.head();
        const branch = await ctx.ws.branch();

        const data = {
          project: {
            slug: ctx.ws.root.split(/[\\/]/).pop() ?? 'project',
            root: ctx.ws.root,
            head,
            branch,
          },
          seals: all.map((v: SealView) => ({
            id: v.manifest.id,
            kind: v.manifest.kind,
            parents: v.manifest.parents,
            status: v.status,
            claim: v.claim,
            lane: v.manifest.lane,
            next: v.manifest.next,
            accept: v.manifest.accept,
            owns: v.manifest.owns,
            author: v.manifest.source,
            created: v.manifest.created,
            children: v.children,
          })),
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
      }

      // 4. API: Single Seal details
      const sealMatch = pathname.match(/^\/api\/mesh\/seal\/(\d+)$/);
      if (sealMatch) {
        const id = Number(sealMatch[1]);
        const ctx = await at();
        const [brief, state, lane, manifest] = await Promise.all([
          show(ctx, id, 'brief').catch(() => ''),
          show(ctx, id, 'state').catch(() => ''),
          show(ctx, id, 'lane').catch(() => ''),
          show(ctx, id, 'manifest').catch(() => '{}'),
        ]);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ id, brief, state, lane, manifest: JSON.parse(manifest || '{}') }));
        return;
      }

      // 5. API: Single Voice Turn
      const voiceMatch = pathname.match(/^\/api\/mesh\/voice\/(v\d+\.\d+)$/);
      if (voiceMatch && voiceMatch[1]) {
        const turnId = voiceMatch[1];
        const ctx = await at();
        const turnText = await showTurn(ctx, turnId);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ id: turnId, text: turnText }));
        return;
      }

      // 6. Root: Cognitive Mission Control HTML
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboardHtml(port));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    } catch (err: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => resolve());
    server.on('error', reject);
  });

  if (opts.openBrowser) {
    const url = `http://localhost:${port}`;
    const cmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(cmd, () => {});
  }

  return {
    port,
    close: async () => {
      for (const client of clients) client.end();
      await new Promise<void>(res => server.close(() => res()));
    },
  };
}

function renderDashboardHtml(port: number): string {
  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HANDOFF · Cognitive Mission Control</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#1e1b4b' },
            mesh: { dark: '#0a0d14', card: '#111622', border: '#1f293d' }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #080a10; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; }
    .glow-dot { box-shadow: 0 0 12px #10b981; }
    .pulse-amber { box-shadow: 0 0 12px #f59e0b; }
    .pulse-indigo { box-shadow: 0 0 12px #6366f1; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Top Bar -->
  <header class="border-b border-mesh-border bg-mesh-dark/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
    <div class="flex items-center space-x-3">
      <div class="w-3 h-3 rounded-full bg-emerald-500 glow-dot animate-pulse"></div>
      <h1 class="font-mono text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
        <span>HANDOFF</span>
        <span class="text-xs px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-semibold">v3 COGNITIVE MESH</span>
      </h1>
      <span class="text-xs text-slate-400 font-mono hidden md:inline">| Zero-Loss Session Relay & Swarm Mesh</span>
    </div>
    <div class="flex items-center space-x-4 text-xs font-mono">
      <div class="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span id="connStatus">SSE LIVE</span>
      </div>
      <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
        <span>SWARM:</span>
        <span class="text-indigo-400 font-semibold">GPT-6 · FABLE 5.1 · OPUS 5.5n · CODEX</span>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
    <!-- Left Navigation / Stats -->
    <aside class="w-full md:w-72 border-r border-mesh-border bg-mesh-card/40 p-5 flex flex-col justify-between">
      <div class="space-y-6">
        <div>
          <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">项目现场</h2>
          <div class="bg-slate-900/90 rounded-lg p-3 border border-mesh-border space-y-2 font-mono text-xs">
            <div class="flex justify-between"><span class="text-slate-500">项目:</span> <span id="projSlug" class="text-indigo-300 font-bold">-</span></div>
            <div class="flex justify-between"><span class="text-slate-500">分支:</span> <span id="projBranch" class="text-slate-300">-</span></div>
            <div class="flex justify-between"><span class="text-slate-500">HEAD:</span> <span id="projHead" class="text-emerald-400">-</span></div>
          </div>
        </div>

        <div>
          <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">架构阶梯仲裁 (4-TIER)</h2>
          <div class="space-y-1.5 text-xs">
            <div class="p-2 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 flex items-center justify-between">
              <span>Tier 0: 路径正交</span> <span class="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded">&lt;5ms Fast</span>
            </div>
            <div class="p-2 rounded bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 flex items-center justify-between">
              <span>Tier 1: AST 语义织入</span> <span class="text-[10px] bg-indigo-900/60 px-1.5 py-0.5 rounded">Semantic</span>
            </div>
            <div class="p-2 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-center justify-between">
              <span>Tier 2: 独立仲裁 Agent</span> <span class="text-[10px] bg-amber-900/60 px-1.5 py-0.5 rounded">Autonomous</span>
            </div>
            <div class="p-2 rounded bg-purple-950/40 border border-purple-800/50 text-purple-300 flex items-center justify-between">
              <span>Tier 3: 原话时光机拍板</span> <span class="text-[10px] bg-purple-900/60 px-1.5 py-0.5 rounded">Human In Loop</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-6 border-t border-mesh-border text-[11px] text-slate-500 font-mono">
        <div>PROTOCOL v3 · MERKLE MESH</div>
        <div>PORT: ${port} · NODE 24+ TS</div>
      </div>
    </aside>

    <!-- Center Content: Neuro-DAG Canvas & Details -->
    <main class="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
      <!-- Section Title & Tabs -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>NEURO-DAG 认知拓扑树</span>
            <span id="sealCount" class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">0 个交接节点</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">事件溯源不可变节点链 · 点击任一节点可展开原始投影与决策凭证</p>
        </div>
        <button onclick="loadDag()" class="px-3 py-1.5 text-xs font-mono rounded bg-indigo-600 hover:bg-indigo-500 text-white transition">刷新拓扑</button>
      </div>

      <!-- DAG Visual Canvas -->
      <div id="dagContainer" class="bg-slate-950/80 rounded-xl border border-mesh-border p-6 min-h-[300px] flex items-center justify-start overflow-x-auto space-x-6">
        <div class="text-slate-500 text-xs font-mono m-auto">正在加载 Mesh 拓扑...</div>
      </div>

      <!-- Detail Inspector -->
      <div id="detailSection" class="hidden bg-mesh-card rounded-xl border border-mesh-border p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-mesh-border pb-3">
          <div class="flex items-center space-x-3">
            <span id="detailBadge" class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-indigo-900 text-indigo-200">#0</span>
            <h3 id="detailTitle" class="text-base font-bold text-slate-100">交接详情</h3>
          </div>
          <button onclick="closeDetail()" class="text-xs text-slate-400 hover:text-slate-200 font-mono">✕ 关闭</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div class="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
            <h4 class="text-slate-400 font-bold mb-1.5 text-[11px] uppercase">brief.md (目标与验收)</h4>
            <pre id="detailBrief" class="text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">加载中...</pre>
          </div>
          <div class="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
            <h4 class="text-slate-400 font-bold mb-1.5 text-[11px] uppercase">state.md (动态状态与凭证)</h4>
            <pre id="detailState" class="text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">加载中...</pre>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    async function loadDag() {
      try {
        const res = await fetch('/api/mesh/dag');
        const data = await res.json();
        document.getElementById('projSlug').textContent = data.project.slug;
        document.getElementById('projBranch').textContent = data.project.branch;
        document.getElementById('projHead').textContent = (data.project.head || 'none').slice(0, 7);
        document.getElementById('sealCount').textContent = data.seals.length + ' 个交接节点';

        const container = document.getElementById('dagContainer');
        if (!data.seals || data.seals.length === 0) {
          container.innerHTML = '<div class="text-slate-500 text-xs font-mono m-auto">当前仓库暂未封存任何交接包。输入 /handoff 或 handoff seal 生成第一个节点。</div>';
          return;
        }

        container.innerHTML = '';
        data.seals.forEach((s, idx) => {
          const node = document.createElement('div');
          node.className = 'flex-shrink-0 w-64 bg-slate-900/90 rounded-lg border border-mesh-border p-4 hover:border-indigo-500 transition cursor-pointer shadow-lg space-y-2';
          node.onclick = () => showDetail(s.id);

          const kindColor = s.kind === 'fork' ? 'text-amber-400 border-amber-800/60 bg-amber-950/40' : s.kind === 'join' ? 'text-purple-400 border-purple-800/60 bg-purple-950/40' : 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40';
          const statusBadge = s.status === 'done' ? 'bg-slate-800 text-slate-400' : s.status === 'claimed' ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200';

          node.innerHTML = \`
            <div class="flex items-center justify-between">
              <span class="font-mono text-base font-bold text-slate-100">#\${s.id}</span>
              <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded border \${kindColor}">\${s.kind}</span>
            </div>
            <div class="text-xs text-slate-300 font-medium line-clamp-2">\${s.next || '无明确第一步'}</div>
            <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>\${s.author.agent || 'agent'}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] \${statusBadge}">\${s.status}</span>
            </div>
          \`;
          container.appendChild(node);

          if (idx < data.seals.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'text-slate-600 font-mono text-xl flex-shrink-0 select-none';
            arrow.textContent = '──▶';
            container.appendChild(arrow);
          }
        });
      } catch (err) {
        console.error(err);
      }
    }

    async function showDetail(id) {
      const section = document.getElementById('detailSection');
      section.classList.remove('hidden');
      document.getElementById('detailBadge').textContent = '#' + id;
      document.getElementById('detailTitle').textContent = '交接包 #' + id + ' 详细数据';
      document.getElementById('detailBrief').textContent = '正在获取 brief.md...';
      document.getElementById('detailState').textContent = '正在获取 state.md...';

      try {
        const res = await fetch('/api/mesh/seal/' + id);
        const data = await res.json();
        document.getElementById('detailBrief').textContent = data.brief || '（无 brief）';
        document.getElementById('detailState').textContent = data.state || '（无 state）';
      } catch (e) {
        document.getElementById('detailBrief').textContent = '加载失败: ' + e.message;
      }
    }

    function closeDetail() {
      document.getElementById('detailSection').classList.add('hidden');
    }

    // Connect SSE
    const es = new EventSource('/api/mesh/stream');
    es.onmessage = (e) => {
      console.log('SSE message:', e.data);
      loadDag();
    };
    es.onerror = () => {
      document.getElementById('connStatus').textContent = 'POLLING';
    };

    loadDag();
  </script>
</body>
</html>`;
}
