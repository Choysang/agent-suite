import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { agents, caller } from '../src/agents.ts';
import { install } from '../src/faces/install.ts';
import { tempDir } from './helpers.ts';

test('install links the skill and registers the hook for every agent present, once', () => {
  const home = tempDir('handoff-install-');
  for (const dir of ['.claude', '.codex', '.workbuddy-ai']) mkdirSync(join(home, dir));
  writeFileSync(join(home, '.claude', 'settings.json'), JSON.stringify({ hooks: { SessionStart: [{ matcher: 'startup', hooks: [] }] } }));
  mkdirSync(join(home, '.workbuddy-ai', 'skills', 'handoff'), { recursive: true });
  writeFileSync(join(home, '.workbuddy-ai', 'skills', 'handoff', 'SKILL.md'), 'someone else');
  const list = agents({}, home);

  const out = install(list);
  assert.match(out, /跳过：codebuddy/);
  for (const dir of ['.claude', '.codex', '.workbuddy-ai']) {
    assert.ok(readFileSync(join(home, dir, 'skills', 'handoff', 'SKILL.md'), 'utf8').includes('handoff:skill'));
  }
  assert.match(out, /原有同名 skill 已移到/);
  const claude = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
  assert.equal(claude.hooks.SessionStart.length, 2, 'existing SessionStart hooks are kept');
  assert.match(readFileSync(join(home, '.codex', 'config.toml'), 'utf8'), /command = "handoff hook"/);
  assert.ok(existsSync(join(home, '.workbuddy-ai', 'settings.json')));

  const again = install(list);
  assert.equal(again.match(/已存在/g)?.length, 3);
  assert.ok(realpathSync(join(home, '.codex', 'skills', 'handoff')).endsWith('skill'));
});

test('the calling agent is the innermost harness', () => {
  assert.equal(caller({ CLAUDECODE: '1', CODEX_THREAD_ID: 'x' }), 'codex');
  assert.equal(caller({ WORKBUDDY_X: '1', CLAUDECODE: '1' }), 'workbuddy');
  assert.equal(caller({ CLAUDECODE: '1' }), 'claude-code');
  assert.equal(caller({}), null);
});
