import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startServer } from '../src/faces/server.ts';

test('server starts, responds to A2A agent card and dashboard, and closes cleanly', async () => {
  // Use port 0 or a high test port
  const port = 49152 + Math.floor(Math.random() * 1000);
  const server = await startServer({ port, openBrowser: false, cwd: process.cwd() });

  try {
    // 1. Test A2A card
    const resA2A = await fetch(`http://localhost:${server.port}/.well-known/agent.json`);
    assert.equal(resA2A.status, 200);
    const card = await resA2A.json() as { name: string; protocol: string };
    assert.equal(card.name, 'handoff');
    assert.equal(card.protocol, 'A2A/1.0');

    // 2. Test Dashboard HTML
    const resHtml = await fetch(`http://localhost:${server.port}/`);
    assert.equal(resHtml.status, 200);
    const text = await resHtml.text();
    assert.ok(text.includes('HANDOFF'));
    assert.ok(text.includes('COGNITIVE MESH'));

    // 3. Test DAG API
    const resDag = await fetch(`http://localhost:${server.port}/api/mesh/dag`);
    assert.equal(resDag.status, 200);
    const dag = await resDag.json() as { project: { slug: string }; seals: unknown[] };
    assert.ok(dag.project);
    assert.ok(Array.isArray(dag.seals));
  } finally {
    await server.close();
  }
});
