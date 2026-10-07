// End to end on real git: prepare → seal → load, races, reconcile, fork → join, take.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join as path } from 'node:path';
import { test } from 'node:test';
import { load, take } from '../src/kernel/load.ts';
import { join, prepare, views } from '../src/kernel/prepare.ts';
import { DraftError, seal } from '../src/kernel/seal.ts';
import { show, showTurn } from '../src/kernel/show.ts';
import { BRIEF, commit, context, git, MemorySource, repo, state, write } from './helpers.ts';

test('relay: prepare captures voice and ledger, seal numbers it, load hands it over', async () => {
  const dir = repo();
  const voice = new MemorySource();
  voice.say('s1', dir, '做个待办应用，界面用中文');
  const ctx = await context(dir, voice, 's1');

  const p = await prepare(ctx);
  assert.equal(p.n, 1);
  assert.deepEqual(p.fresh.map(t => t.id), ['v1.1']);
  assert.ok(ctx.desk.read('_ledger.md')?.includes('init'));
  write(ctx, { brief: BRIEF.replace(' CITE', ' [v1.1]'), state: state('实现存储层 `app.txt`', '- [user] 中文界面 [v1.1]') });
  const s = await seal(ctx);

  assert.equal(s.manifest.id, 1);
  assert.equal(s.manifest.source.voice, 'native');
  assert.equal(s.manifest.source.model, 'test-model');
  assert.equal(s.manifest.next, '实现存储层 `app.txt`');
  assert.equal(ctx.desk.head(), 1);
  assert.equal(ctx.desk.read('draft.json'), null);
  assert.equal(git(dir, 'status', '--porcelain'), '', '.handoff/ must be invisible to git');
  assert.ok(!(await show(ctx, 1, 'brief')).includes('<!--'));
  assert.ok((await showTurn(ctx, 'v1.1')).includes('界面用中文'));

  const l = await load(ctx, 1);
  assert.equal(l.reconcile.head.same, true);
  assert.equal(l.reconcile.worktree, 'same');
  assert.deepEqual(l.reconcile.missing, []);
  assert.equal(l.recent[0]?.text, '做个待办应用，界面用中文');
});

test('a second relay links to the first and never re-captures a turn', async () => {
  const dir = repo();
  const voice = new MemorySource();
  voice.say('s1', dir, '第一句');
  const ctx = await context(dir, voice, 's1');
  await prepare(ctx);
  write(ctx, {});
  await seal(ctx);

  voice.say('s1', dir, '第二句', new Date(Date.now() + 1000).toISOString());
  commit(dir, 'app.txt', 'v2\n', 'feat: storage\n\nWhy: 用户要求先做存储');
  const p = await prepare(ctx);
  assert.deepEqual(p.parents, [1]);
  assert.deepEqual(p.fresh.map(t => t.text), ['第二句']);
  assert.ok(ctx.desk.read('state.md')?.startsWith('---\nnext: \naccept: \n---'), 'next/accept are restated every seal');
  assert.ok(ctx.desk.read('_ledger.md')?.includes('Why: 用户要求先做存储'));
  write(ctx, { state: state('实现界面') });
  const s = await seal(ctx);
  assert.deepEqual(s.manifest.parents, [1]);
  assert.equal(s.voice, 2);
  assert.ok((await show(ctx, 2, 'voice')).includes('[v1.1]'));
  assert.ok((await show(ctx, 2, 'history')).includes('feat: storage'));
  assert.deepEqual((await views(ctx)).map(v => v.status), ['open', 'done']);
});

test('an invalid draft is refused with every problem listed, and stays editable', async () => {
  const dir = repo();
  const ctx = await context(dir);
  await prepare(ctx);
  ctx.desk.write('state.md', '# 进度\n');
  await assert.rejects(seal(ctx), (e: unknown) => e instanceof DraftError && e.problems.length >= 3);
  assert.notEqual(ctx.desk.read('draft.json'), null);
});

test('concurrent seals never share a number', async () => {
  const dir = repo();
  const a = await context(dir);
  await prepare(a);
  write(a, {});
  const draft = ['draft.json', 'brief.md', 'state.md'].map(n => [n, a.desk.read(n)!] as const);
  const [x, y] = await Promise.all([seal(a), (async () => {
    const b = await context(dir);
    const other = path(dir, 'other');
    git(dir, 'worktree', 'add', '-q', other);
    const c = { ...b, desk: b.deskAt(other) };
    for (const [n, text] of draft) c.desk.write(n, text);
    return seal(c);
  })()]);
  assert.notEqual(x.manifest.id, y.manifest.id);
  assert.deepEqual([x.manifest.id, y.manifest.id].sort(), [1, 2]);
});

test('reconcile: restores the sealed worktree when clean, reports when it moved on', async () => {
  const dir = repo();
  writeFileSync(path(dir, 'app.txt'), 'work in progress\n');
  writeFileSync(path(dir, 'new.txt'), 'untracked\n');
  const ctx = await context(dir);
  await prepare(ctx);
  write(ctx, {});
  const s = await seal(ctx);
  assert.equal(s.manifest.repo.dirty, true);
  assert.equal(s.manifest.repo.wip, 'refs/handoff/wip/1');

  git(dir, 'checkout', '-q', '--', '.');
  git(dir, 'clean', '-qfd', '-e', '.handoff');
  assert.equal(git(dir, 'status', '--porcelain'), '');
  const restored = await load(ctx, 1);
  assert.equal(restored.reconcile.worktree, 'restored');
  assert.equal(readFileSync(path(dir, 'app.txt'), 'utf8'), 'work in progress\n');
  assert.equal(readFileSync(path(dir, 'new.txt'), 'utf8'), 'untracked\n');

  commit(dir, 'app.txt', 'v3\n', 'feat: later');
  const moved = await load(ctx, 1);
  assert.equal(moved.reconcile.head.same, false);
  assert.equal(moved.reconcile.head.ahead, 1);
  assert.equal(moved.reconcile.worktree, 'differs');
  assert.ok(moved.reconcile.diff.includes('app.txt'));
});

test('snapshots skip large untracked files and report them', async () => {
  const dir = repo();
  writeFileSync(path(dir, 'big.bin'), Buffer.alloc(6 * 1024 * 1024));
  const ctx = await context(dir);
  await prepare(ctx);
  write(ctx, {});
  const s = await seal(ctx);
  assert.deepEqual(s.manifest.repo.skipped, ['big.bin']);
  assert.equal(s.manifest.repo.dirty, false);
});

test('fork into lanes with worktrees, work each lane, join them back', async () => {
  const dir = repo();
  const voice = new MemorySource();
  voice.say('s1', dir, '并行做 a 和 b');
  const ctx = await context(dir, voice, 's1');
  await prepare(ctx);
  const fork = '## lane: a\nnext: 做 a\naccept: a 通过\nowns: a/**\n\n## lane: b\nnext: 做 b\naccept: b 通过\n';
  write(ctx, { fork });
  const s = await seal(ctx);
  assert.equal(s.manifest.id, 1);
  assert.deepEqual(s.lanes.map(l => [l.manifest.id, l.manifest.lane, l.manifest.kind]), [[2, 'lane/2-a', 'fork'], [3, 'lane/3-b', 'fork']]);
  for (const l of s.lanes) {
    assert.ok(existsSync(l.path));
    assert.equal(git(l.path, 'branch', '--show-current'), l.manifest.lane);
    assert.equal((await context(l.path)).desk.head(), l.manifest.id);
  }
  assert.deepEqual(s.lanes[0]!.manifest.owns, ['a/**']);
  assert.ok((await show(ctx, 2, 'lane')).includes('做 a'));

  // Lane a: a worker loads its seal, commits, relays within the lane.
  const laneA = await context(s.lanes[0]!.path);
  const loaded = await load(laneA, null);
  assert.equal(loaded.manifest.id, 2);
  assert.ok(loaded.lane?.includes('owns: a/**'));
  commit(s.lanes[0]!.path, 'a.txt', 'a\n', 'feat: a');
  const pa = await prepare(laneA);
  assert.deepEqual(pa.parents, [2]);
  write(laneA, { state: state('等待汇合') });
  const a2 = await seal(laneA);
  assert.equal(a2.manifest.lane, 'lane/2-a');
  assert.ok((await show(laneA, a2.manifest.id, 'lane')).includes('做 a'), 'the lane task follows relays in the lane');

  const j = await join(ctx, [1]);
  assert.deepEqual(j.parents, [3, a2.manifest.id]);
  assert.ok(ctx.desk.read('_lanes.md')?.includes('lane/2-a'));
  git(dir, 'merge', '-q', '--no-edit', 'lane/2-a');
  write(ctx, { state: state('发布') });
  const joined = await seal(ctx);
  assert.equal(joined.manifest.kind, 'join');
  assert.deepEqual(joined.manifest.parents, [3, 4]);
  assert.ok((await views(ctx)).every(v => v.status === 'done' || v.manifest.id === joined.manifest.id));
});

test('take hands each worker a different open seal', async () => {
  const dir = repo();
  const ctx = await context(dir);
  await prepare(ctx);
  write(ctx, { fork: '## lane: a\nnext: a\naccept: a\n\n## lane: b\nnext: b\naccept: b\n' });
  await seal(ctx);
  const [first, second] = await Promise.all([take(await context(dir)), take(await context(dir))]);
  assert.deepEqual([first.manifest.id, second.manifest.id].sort(), [2, 3]);
  await assert.rejects(take(await context(dir)), /没有待接手/);
});
