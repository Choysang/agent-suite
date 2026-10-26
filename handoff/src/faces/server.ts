// Local, read-only projection of the same bundles used by the CLI.
import { createServer, type ServerResponse } from 'node:http';
import { exec } from 'node:child_process';
import { FILES } from '../core/types.ts';
import { fromJsonl, render } from '../core/voice.ts';
import { views } from '../kernel/prepare.ts';
import { caller } from '../agents.ts';
import { wire } from '../wire.ts';
import { dashboardHtml } from './dashboard.ts';
import { versionInfo } from './version.ts';

export interface ServerOptions {
  readonly port?: number;
  readonly openBrowser?: boolean;
  readonly cwd?: string;
}

export async function startServer(opts: ServerOptions = {}): Promise<{ port: number; host: string; close: () => Promise<void> }> {
  const requestedPort = opts.port ?? Number(process.env.HANDOFF_PORT ?? 4040);
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) throw new Error('端口须为 0–65535 的整数');
  const host = '127.0.0.1';
  const cwd = opts.cwd ?? process.cwd();
  const at = () => wire(cwd, { agent: caller(), session: null });
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return json(res, 405, { error: '只读接口，仅支持 GET / HEAD' });
    }
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (path === '/' || path === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(dashboardHtml());
        return;
      }
      if (path === '/api/status') return json(res, 200, { ...versionInfo, mode: 'read-only', updates: 'poll', pollIntervalMs: 5000 });
      if (path === '/api/handoffs' || path === '/api/mesh/dag') {
        const ctx = await at();
        const [all, branch, head] = await Promise.all([views(ctx), ctx.ws.branch(), ctx.ws.head()]);
        return json(res, 200, {
          project: { slug: ctx.ws.root.split(/[\\/]/).pop(), root: ctx.ws.root, head, seal: ctx.desk.head(), branch },
          seals: all.map(v => ({ ...v.manifest, status: v.status, claim: v.claim, children: v.children, author: v.manifest.source })),
        });
      }
      const detail = /^\/api\/(?:handoffs|mesh\/seal)\/(\d+)$/.exec(path);
      const voice = /^\/api\/(?:voice|mesh\/voice)\/(v(\d+)\.\d+)$/.exec(path);
      if (detail || voice) {
        const id = Number(detail?.[1] ?? voice?.[2]);
        const ctx = await at();
        const all = await ctx.store.manifests();
        if (!all.some(m => m.id === id)) return json(res, 404, { error: `没有交接 #${id}` });
        const bundle = await ctx.store.bundle(id);
        if (voice) {
          const turns = fromJsonl((await bundle.text(FILES.voice(id))) ?? '');
          const turn = turns.find(t => t.id === voice[1]);
          return turn ? json(res, 200, { id: turn.id, text: render([turn]) }) : json(res, 404, { error: `没有原话 ${voice[1]}` });
        }
        const texts = await bundle.texts([FILES.brief, FILES.state, FILES.lane]);
        if (!texts.has(FILES.brief) || !texts.has(FILES.state)) throw new Error(`交接 #${id} 缺失必需投影文件`);
        return json(res, 200, { id, brief: texts.get(FILES.brief), state: texts.get(FILES.state), lane: texts.get(FILES.lane) ?? null, manifest: bundle.manifest });
      }
      json(res, 404, { error: '没有此只读接口' });
    } catch (error) {
      json(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, host, resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('无法取得监听端口');
  const port = address.port;
  if (opts.openBrowser) {
    const url = `http://${host}:${port}`;
    const command = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(command, { windowsHide: true }, () => {});
  }
  return { port, host, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
