import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Git } from '../src/adapters/git.ts';
import { repo } from './helpers.ts';

test('commands with no payload finish without writing an empty chunk to stdin', async () => {
  const git = new Git(repo());
  const head = await git.run(['rev-parse', 'HEAD']);
  const results = await Promise.all(Array.from({ length: 16 }, () => git.run(['rev-parse', 'HEAD'])));
  assert.ok(results.every(result => result === head));
  assert.equal(await git.run(['mktree'], { input: '' }), '4b825dc642cb6eb9a060e54bf8d69288fbee4904');
});

test('a Git failure reports stderr when it closes stdin before a large payload', async () => {
  const git = new Git(repo());
  await assert.rejects(
    git.raw(['handoff-does-not-exist'], { input: Buffer.alloc(2 * 1024 * 1024) }),
    /git handoff-does-not-exist:.*not a git command/,
  );
});

test('callers can inspect an expected nonzero Git exit even if stdin closes early', async () => {
  const git = new Git(repo());
  const result = await git.raw(['handoff-does-not-exist'], {
    input: Buffer.alloc(2 * 1024 * 1024), ok: () => true,
  });
  assert.notEqual(result.code, 0);
  assert.match(result.err, /not a git command/);
});
