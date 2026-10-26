import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { dashboardScript } from '../src/faces/dashboard.ts';
import { startServer } from '../src/faces/server.ts';
import { versionInfo } from '../src/faces/version.ts';
import { prepare } from '../src/kernel/prepare.ts';
import { seal } from '../src/kernel/seal.ts';
import { context, repo, tempDir, write } from './helpers.ts';

test('local read-only API reports versions, populated project and real failures', async () => {
  const dir = repo(); const ctx = await context(dir);
  await prepare(ctx); write(ctx, {}); await seal(ctx);
  const server = await startServer({ port: 0, cwd: dir });
  assert.equal(server.host, '127.0.0.1');
  assert.ok(server.port > 0);
  const base = `http://${server.host}:${server.port}`;
  try {
    const status = await (await fetch(base + '/api/status')).json() as Record<string, unknown>;
    assert.equal(status.protocol, versionInfo.protocol); assert.equal(status.updates, 'poll');
    const response = await fetch(base + '/api/handoffs');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    const dag = await response.json() as { project: { head: string; seal: number }; seals: { parents: number[] }[] };
    assert.match(dag.project.head, /^[0-9a-f]{40,64}$/); assert.equal(dag.project.seal, 1);
    assert.deepEqual(dag.seals[0]!.parents, []);
    assert.equal((await fetch(base + '/api/handoffs/1')).status, 200);
    assert.equal((await fetch(base + '/api/handoffs/999')).status, 404);
    assert.equal((await fetch(base + '/api/mesh/seal/999')).status, 404);
    assert.equal((await fetch(base + '/.well-known/agent.json')).status, 404);
    assert.equal((await fetch(base + '/api/mesh/stream')).status, 404);
    assert.equal((await fetch(base + '/api/handoffs', { method: 'POST' })).status, 405);
    const html = await (await fetch(base)).text();
    assert.ok(html.includes('本地只读交接看板')); assert.ok(!html.includes('cdn.tailwindcss'));
    // Malformed stored data is not disguised as a missing or empty successful seal.
    await ctx.store.put(2, [{ path: 'manifest.json', content: '{broken' }], [], 'damaged fixture');
    assert.equal((await fetch(base + '/api/handoffs/2')).status, 500);
  } finally { await server.close(); }
});

test('dashboard renders only parent edges, keeps text inert and actually polls', async () => {
  class Element {
    readonly children: Element[] = [];
    readonly attrs: Record<string, string> = {};
    textContent = ''; hidden = false;
    setAttribute(key: string, value: string) { this.attrs[key] = value; }
    append(...nodes: Element[]) { this.children.push(...nodes); }
    replaceChildren() { this.children.splice(0); }
    addEventListener() {}
    set innerHTML(_value: string) { throw new Error('HTML insertion is forbidden for repository text'); }
  }
  const ids = new Map<string, Element>();
  const element = (id: string) => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id)!; };
  const calls: string[] = []; let interval: (() => Promise<void>) | undefined;
  const malicious = '<img src=x onerror=alert(1)>';
  const data = { project: { root: malicious, branch: 'main', head: 'abcdef1234567890', seal: 4 }, seals: [
    { id: 4, parents: [2, 3], lane: 'main', next: malicious, status: 'open', kind: 'join' },
    { id: 3, parents: [1], lane: 'lane/3-ui', next: 'ui', status: 'done', kind: 'fork' },
    { id: 2, parents: [1], lane: 'lane/2-api', next: 'api', status: 'done', kind: 'fork' },
    { id: 1, parents: [], lane: 'main', next: 'start', status: 'done', kind: 'relay' },
  ] };
  runInNewContext(dashboardScript, {
    document: { getElementById: element, createElementNS: () => new Element() },
    fetch: async (url: string) => { calls.push(url); return { ok: true, json: async () => data }; },
    setInterval: (callback: () => Promise<void>, ms: number) => { assert.equal(ms, 5000); interval = callback; },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(element('head').textContent, 'abcdef123456'); assert.equal(element('seal').textContent, '#4');
  assert.equal(element('root').textContent, malicious); assert.equal(element('error').textContent, '');
  const nodes = (root: Element): Element[] => [root, ...root.children.flatMap(nodes)];
  const edges = nodes(element('graph')).filter(n => n.attrs['data-parent']).map(n => `${n.attrs['data-parent']}->${n.attrs['data-child']}`).sort();
  assert.deepEqual(edges, ['1->2', '1->3', '2->4', '3->4']);
  assert.ok(interval); await interval(); assert.equal(calls.length, 2);
});

test('CLI version is available outside a Git repository and agrees with server metadata', () => {
  const cli = fileURLToPath(new URL('../src/faces/cli.ts', import.meta.url));
  const output = execFileSync(process.execPath, [cli, '--version', '--json'], { encoding: 'utf8', cwd: tempDir() });
  assert.deepEqual(JSON.parse(output), versionInfo);
});
