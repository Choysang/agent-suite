import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Git } from '../src/adapters/git.ts';
import { repo } from './helpers.ts';

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
