import assert from 'node:assert/strict';
import { test } from 'node:test';
import { board, defaultParent, frontier, nextId, takeable } from '../src/core/dag.ts';
import { clean, front, goal, lanes, validate } from '../src/core/draft.ts';
import type { Manifest, RawTurn } from '../src/core/types.ts';
import { citations, delta, fromJsonl, numbered, renumber, toJsonl } from '../src/core/voice.ts';
import { BRIEF, state } from './helpers.ts';

const turn = (session: string, k: number, ts: string, text = `m${k}`): RawTurn => ({
  ts,
  agent: 'claude-code',
  session,
  key: `claude-code:${session}:${k}`,
  text,
});

test('delta keeps uncaptured turns: all of the sealing session, others only after the cutoff', () => {
  const raw = [
    turn('live', 1, '2026-10-01T00:00:00Z'),
    turn('other', 1, '2026-10-01T00:00:00Z'),
    turn('other', 2, '2026-10-03T00:00:00Z'),
    turn('live', 2, '2026-10-04T00:00:00Z'),
  ];
  const known = new Set(['claude-code:live:2']);
  const got = delta(raw, known, { cutoff: '2026-10-02T00:00:00Z', session: 'live' });
  assert.deepEqual(got.map(t => t.key), ['claude-code:live:1', 'claude-code:other:2']);
});

test('voice ids are seal-qualified, round-trip through jsonl, and renumber on a lost race', () => {
  const turns = numbered(7, [turn('s', 1, '2026-10-01T00:00:00Z'), turn('s', 2, '2026-10-01T00:01:00Z')]);
  assert.deepEqual(turns.map(t => t.id), ['v7.1', 'v7.2']);
  assert.deepEqual(fromJsonl(toJsonl(turns)), turns);
  assert.equal(renumber('见 [v7.2] 与 [v17.2]', 7, 8), '见 [v8.2] 与 [v17.2]');
  assert.deepEqual(citations('[v3.1][v12.40] v1'), ['v3.1', 'v12.40']);
});

test('a complete draft validates; template comments are not content', () => {
  const brief = BRIEF.replace(' CITE', ' [v1.1]') + '<!-- [v99.9] -->\n';
  assert.deepEqual(validate({ brief, state: state('做 X', '- [user] 用中文 [v1.1]'), fork: null, recalled: null }, new Set(['v1.1'])), []);
  assert.ok(!clean(brief).includes('v99.9'));
});

test('validation names every violation', () => {
  const problems = validate(
    {
      brief: '# 目标\nx\n',
      state: '---\nnext: \naccept: \n---\n# 决定\n- 没标签\n- [user] 没引用\n- [agent] 引用不存在 [v9.9]\n',
      fork: null,
      recalled: null,
    },
    new Set(),
  );
  const text = problems.join('\n');
  for (const want of ['缺少章节「# 范围」', '缺 next', '缺 accept', '决定缺标签', '[user] 决定必须引用原话', '不存在的原话 v9.9']) {
    assert.ok(text.includes(want), `missing: ${want}\n${text}`);
  }
});

test('front matter, goal, and fenced code are parsed precisely', () => {
  assert.deepEqual(front('---\nnext: a b\naccept: c\n---\nbody'), { next: 'a b', accept: 'c', body: 'body' });
  assert.equal(goal('# 目标\n\n- 交付 X\n# 范围\n'), '交付 X');
  const withCode = state('x').replace('# 未决问题', '```bash\n# not a heading\n```\n# 未决问题');
  assert.deepEqual(validate({ brief: BRIEF.replace(' CITE', ''), state: withCode, fork: null, recalled: null }, new Set()), []);
});

test('fork.md lanes parse, and bad lanes are rejected', () => {
  const fork = '## lane: auth\nnext: a\naccept: b\nowns: src/auth/**, test/auth/**\n\n说明\n\n## lane: ui\nnext: c\naccept: d\n';
  const [auth, ui] = lanes(fork);
  assert.equal(auth?.name, 'auth');
  assert.deepEqual(auth?.owns, ['src/auth/**', 'test/auth/**']);
  assert.ok(auth?.text.includes('说明'));
  assert.equal(ui?.next, 'c');
  const bad = validate({ brief: BRIEF.replace(' CITE', ''), state: state('x'), fork: '## lane: Bad_Name\n', recalled: null }, new Set());
  assert.ok(bad.some(p => p.includes('Bad_Name')) && bad.some(p => p.includes('缺 next')));
});

const m = (id: number, parents: number[], lane = 'main'): Manifest =>
  ({ id, parents, lane, created: '2026-10-01T00:00:00Z' }) as unknown as Manifest;

test('the DAG derives status, parents, frontiers and work to take', () => {
  // 1 → 2 → {3, 4 (lanes)} ; 4 → 5
  const all = [m(1, []), m(2, [1]), m(3, [2], 'lane/3-a'), m(4, [2], 'lane/4-b'), m(5, [4], 'lane/4-b')];
  const views = board(all, new Map([[3, { agent: 'codex', session: null, at: '' }]]));
  const status = Object.fromEntries(views.map(v => [v.manifest.id, v.status]));
  assert.deepEqual(status, { 1: 'done', 2: 'done', 3: 'claimed', 4: 'done', 5: 'open' });
  assert.equal(nextId(views), 6);
  assert.equal(defaultParent(views, null, 'main'), 2);
  assert.equal(defaultParent(views, 4, 'main'), 4);
  assert.equal(defaultParent(views, null, 'feature'), null);
  assert.deepEqual(frontier(views, [2]), [3, 5]);
  assert.deepEqual(frontier(views, [3, 5]), [3, 5]);
  assert.deepEqual(takeable(views).map(v => v.manifest.id), [5]);
});
