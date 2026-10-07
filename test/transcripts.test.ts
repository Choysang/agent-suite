// Conformance: real-shaped transcript lines from each harness map to exactly the user's words.

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ClaudeTranscripts } from '../src/adapters/claude.ts';
import { CodexTranscripts } from '../src/adapters/codex.ts';
import { tempDir } from './helpers.ts';

const FIXTURES = join(import.meta.dirname, '..', 'protocol', 'fixtures');

interface Expect {
  readonly texts: readonly string[];
  readonly model: string;
  readonly cwd: string;
}

for (const [agent, layout] of [
  ['claude', (root: string) => join(root, 'D--work-app', 'sess-1.jsonl')],
  ['codex', (root: string) => join(root, '2026', '10', '07', 'rollout-2026-10-07T16-00-00-sess-1.jsonl')],
] as const) {
  test(`${agent} transcripts yield only the user's words`, async () => {
    const root = tempDir(`handoff-${agent}-`);
    const path = layout(root);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, readFileSync(join(FIXTURES, `${agent}.jsonl`), 'utf8'));
    const want = JSON.parse(readFileSync(join(FIXTURES, `${agent}.expect.json`), 'utf8')) as Expect;

    const source = agent === 'claude' ? new ClaudeTranscripts(root) : new CodexTranscripts(root);
    const [session, ...rest] = await source.sessions(Date.parse('2026-10-01T00:00:00Z'));
    assert.equal(rest.length, 0);
    assert.equal(session?.cwd, want.cwd);
    assert.equal(session?.id, 'sess-1');
    const turns = await source.turns(session!);
    assert.deepEqual(turns.map(t => t.text), want.texts);
    assert.equal(new Set(turns.map(t => t.key)).size, turns.length);
    assert.equal(await source.model(session!), want.model);
    assert.deepEqual(await source.sessions(Date.now() + 60_000), []);
  });
}
