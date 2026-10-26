import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, realpathSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { paths, SKILLS, SOURCE_ROOT, loadConfig } from '../src/runtime.mjs';
import { install, guidelineContent } from '../src/install.mjs';
import { doctor } from '../src/doctor.mjs';

function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'agent-suite 中文 '));
  // This exact freshly-created directory owns every test artifact, including links.
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const root = join(temp, 'source'), home = join(temp, 'home'), vault = join(temp, '知识库');
  for (const skill of SKILLS) {
    mkdirSync(join(root, 'knowledge/.agents/skills', skill), { recursive: true });
    writeFileSync(join(root, 'knowledge/.agents/skills', skill, 'SKILL.md'), `# ${skill}`);
  }
  for (const directory of ['handoff/skill', 'guidelines/codex', 'guidelines/universal']) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.2.0' }));
  writeFileSync(join(root, 'handoff/package.json'), JSON.stringify({ version: '1.0.0' }));
  writeFileSync(join(root, 'guidelines/codex/AGENTS.en.md'), '# Guideline\nVault: `<vault>`\n');
  writeFileSync(join(root, 'guidelines/universal/AGENTS.en.md'), '# Universal\nVault: `<vault>`\n');
  mkdirSync(join(vault, '30.Wiki'), { recursive: true });
  writeFileSync(join(vault, '30.Wiki/taxonomy.yml'), 'domains: {}\n');
  writeFileSync(join(vault, 'ROUTER.md'), '# existing router\n');
  return { temp, root, home, vault, p: paths({ root, home, env: {}, configHome: join(home, '.agent-suite') }) };
}

test('suite and handoff honor the same host configuration directories', t => {
  const { p, temp, vault, root } = fixture(t);
  const codexHome = join(temp, 'custom codex'), claudeHome = join(temp, 'custom claude');
  const custom = { ...p, env: { CODEX_HOME: codexHome, CLAUDE_CONFIG_DIR: claudeHome } };
  install(custom, { vault, agents: ['codex', 'claude'], guidelines: true });
  assert.equal(realpathSync(join(codexHome, 'skills/handoff')), realpathSync(join(root, 'handoff/skill')));
  assert.equal(realpathSync(join(claudeHome, 'skills/kb')), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
  assert.match(readFileSync(join(codexHome, 'AGENTS.md'), 'utf8'), /agent-suite:start/);
  assert.match(readFileSync(join(claudeHome, 'CLAUDE.md'), 'utf8'), /agent-suite:start/);
  assert.equal(doctor(custom).ok, true);
  assert.equal(existsSync(join(p.home, '.codex')), false);
});

test('install preserves data, backs up old code, links every profile, and is idempotent', t => {
  const { p, root, home, vault } = fixture(t);
  const old = join(vault, '.agents/skills/kb');
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, 'old.txt'), 'old implementation');
  const note = join(vault, '30.Wiki/my-note.md');
  writeFileSync(note, 'private knowledge');
  const result = install(p, { vault, agents: ['codex', 'claude', 'workbuddy', 'codebuddy'], guidelines: true });
  assert.equal(result.changed, 31);
  assert.equal(result.backups.length, 1);
  assert.equal(readFileSync(join(result.backups[0].backup, 'old.txt'), 'utf8'), 'old implementation');
  assert.equal(realpathSync(join(home, '.agents/skills/kb')), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
  assert.equal(readFileSync(note, 'utf8'), 'private knowledge');
  assert.equal(install(p, { guidelines: true }).changed, 0);
  assert.equal(doctor(p).ok, true);
});

test('dry-run does not write config, links or guidelines', t => {
  const { p, vault, home } = fixture(t);
  const result = install(p, { vault, agents: ['codex'], guidelines: true, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal(existsSync(p.config), false);
  assert.equal(existsSync(join(vault, '.agents')), false);
  assert.equal(existsSync(home), false);
});

test('existing host skills can migrate into a vault with no skill directories', t => {
  const { p, home, vault, root } = fixture(t);
  const old = join(home, '.agents/skills/kb');
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, 'SKILL.md'), '# old local skill');
  const result = install(p, { vault });
  assert.equal(result.backups.length, 1);
  assert.equal(realpathSync(old), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
  assert.equal(readFileSync(join(result.backups[0].backup, 'SKILL.md'), 'utf8'), '# old local skill');
});

test('backups follow relocated host profiles instead of crossing filesystem volumes', t => {
  const { p, home, vault, temp } = fixture(t);
  const relocated = join(temp, 'relocated-profile');
  mkdirSync(join(relocated, 'skills/kb'), { recursive: true });
  writeFileSync(join(relocated, 'skills/kb/SKILL.md'), 'keep custom skill');
  mkdirSync(home, { recursive: true });
  symlinkSync(relocated, join(home, '.workbuddy-ai'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = install(p, { vault, agents: ['workbuddy'] });
  const backup = result.backups.find(item => item.path === join(home, '.workbuddy-ai/skills/kb'));
  assert.ok(backup.backup.startsWith(join(realpathSync(relocated), '.agent-suite/backups')));
  assert.equal(readFileSync(join(backup.backup, 'SKILL.md'), 'utf8'), 'keep custom skill');
  assert.equal(doctor(p).ok, true);
});

test('host and vault aliases install each physical destination once', t => {
  const { p, home, vault, root } = fixture(t);
  mkdirSync(join(vault, '.agents/skills/kb'), { recursive: true });
  writeFileSync(join(vault, '.agents/skills/kb/SKILL.md'), 'old implementation');
  mkdirSync(home, { recursive: true });
  symlinkSync(join(vault, '.agents'), join(home, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = install(p, { vault });
  assert.equal(result.changed, 6);
  assert.equal(realpathSync(join(home, '.agents/skills/kb')), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
  assert.equal(install(p).changed, 0);
  assert.equal(doctor(p).ok, true);
});

test('host aliases to an uncreated vault directory do not create self links', t => {
  const { p, home, vault, root } = fixture(t);
  mkdirSync(home, { recursive: true });
  symlinkSync(join(vault, '.agents'), join(home, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(install(p, { vault }).changed, 6);
  assert.equal(realpathSync(join(home, '.agents/skills/kb')), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
  assert.equal(install(p).changed, 0);
  assert.equal(doctor(p).ok, true);
});

test('direct custom host directories keep backups on their own filesystem', t => {
  const { p, temp, vault } = fixture(t);
  const host = join(temp, 'direct-host');
  mkdirSync(join(host, 'skills/kb'), { recursive: true });
  writeFileSync(join(host, 'skills/kb/SKILL.md'), 'preserve direct host');
  const custom = { ...p, env: { CLAUDE_CONFIG_DIR: host } };
  const result = install(custom, { vault, agents: ['claude'] });
  const backup = result.backups.find(item => item.path === join(host, 'skills/kb'));
  assert.ok(backup.backup.startsWith(join(realpathSync(host), '.agent-suite/backups')));
  assert.equal(readFileSync(join(backup.backup, 'SKILL.md'), 'utf8'), 'preserve direct host');
});

test('upgrading a checkout repairs host links that directly target the old source', t => {
  const { p, home, vault, root, temp } = fixture(t);
  install(p, { vault });
  const oldSource = join(temp, 'old-source', 'kb');
  mkdirSync(oldSource, { recursive: true });
  const vaultLink = join(vault, '.agents/skills/kb');
  const hostLink = join(home, '.agents/skills/kb');
  for (const link of [vaultLink, hostLink]) {
    unlinkSync(link);
    symlinkSync(oldSource, link, process.platform === 'win32' ? 'junction' : 'dir');
  }
  install(p);
  assert.equal(realpathSync(hostLink), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
  assert.equal(doctor(p).ok, true);
});

test('managed guideline updates retain user text and reject malformed blocks', () => {
  const first = guidelineContent('My preferences\n', '# Rules for <vault>', 'D:\\My Vault');
  const second = guidelineContent(first + '\nPersonal footer\n', '# New rules for <vault>', 'D:\\My Vault');
  assert.match(second, /^My preferences/);
  assert.match(second, /# New rules for D:\/My Vault/);
  assert.match(second, /Personal footer/);
  assert.equal(second.split('<!-- agent-suite:start -->').length, 2);
  assert.throws(() => guidelineContent('<!-- agent-suite:start -->oops', 'template', '/vault'), /Malformed/);
});

test('managed guidelines remain enabled on upgrades and doctor detects source or marker drift', t => {
  const { p, root, home, vault } = fixture(t);
  const file = join(home, '.codex/AGENTS.md');
  mkdirSync(join(home, '.codex'), { recursive: true });
  writeFileSync(file, 'Keep my personal routing\n');
  install(p, { vault, guidelines: true });
  assert.equal(loadConfig(p).guidelines, true);
  writeFileSync(join(root, 'guidelines/codex/AGENTS.en.md'), '# Updated rule\nVault: `<vault>`\n');
  const drift = doctor(p);
  assert.equal(drift.ok, false);
  assert.equal(drift.checks.find(check => check.id === 'codex:guidelines').status, 'error');
  assert.equal(install(p).changed, 1);
  assert.match(readFileSync(file, 'utf8'), /^Keep my personal routing/);
  assert.match(readFileSync(file, 'utf8'), /# Updated rule/);
  assert.equal(doctor(p).ok, true);
  writeFileSync(file, '<!-- agent-suite:start -->incomplete');
  const malformed = doctor(p);
  assert.equal(malformed.ok, false);
  assert.match(malformed.checks.find(check => check.id === 'codex:guidelines').observed, /Malformed/);
});

test('broken skill links are repaired and detected by doctor', t => {
  const { p, home, vault, temp, root } = fixture(t);
  install(p, { vault });
  const link = join(home, '.agents/skills/kb');
  unlinkSync(link);
  symlinkSync(join(temp, 'missing'), link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(doctor(p).ok, false);
  assert.equal(install(p).changed, 1);
  assert.equal(realpathSync(link), realpathSync(join(root, 'knowledge/.agents/skills/kb')));
});

test('failed installation restores earlier directory moves and leaves config unchanged', t => {
  const { p, vault, home } = fixture(t);
  const old = join(vault, '.agents/skills/kb');
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, 'old.txt'), 'preserve');
  mkdirSync(home, { recursive: true });
  // A file blocks creation of the host profile after the vault links are installed.
  writeFileSync(join(home, '.agents'), 'blocked');
  assert.throws(() => install(p, { vault }), /EEXIST|ENOTDIR/);
  assert.equal(readFileSync(join(old, 'old.txt'), 'utf8'), 'preserve');
  assert.equal(existsSync(p.config), false);
  assert.equal(existsSync(join(vault, '.agents/skills/sink')), false);
});

test('missing Python and invalid agent names fail before mutation', t => {
  const { p, vault } = fixture(t);
  assert.throws(() => install(p, { vault, python: 'agent-suite-nonexistent-python' }), /Python 3.11/);
  assert.throws(() => install(p, { vault, agents: ['unknown'] }), /--agents/);
  assert.equal(existsSync(p.config), false);
});

test('CLI resolves configured vault across working directories and forwards failure status', t => {
  const { p, vault, temp } = fixture(t);
  install(p, { vault });
  const env = { ...process.env, AGENT_SUITE_HOME: p.configHome };
  const run = args => spawnSync(process.execPath, [join(SOURCE_ROOT, 'src/cli.mjs'), ...args], { cwd: temp, env, encoding: 'utf8' });
  assert.equal(loadConfig(p).vault, vault);
  writeFileSync(join(vault, '30.Wiki/note.md'), '---\nkind: note\ntitle: Cross-directory evidence\n---\n\n# Configured vault\n');
  const found = run(['kb', 'read', '30.Wiki/note.md', '--json']);
  assert.equal(found.status, 0, found.stderr);
  assert.equal(JSON.parse(found.stdout).metadata.title, 'Cross-directory evidence');
  const read = run(['kb', 'read', '30.Wiki/missing.md', '--json']);
  assert.notEqual(read.status, 0);
  const help = run(['kb', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /feedback/);
  const handoff = run(['handoff', '--help']);
  assert.equal(handoff.status, 0, handoff.stderr);
  assert.match(handoff.stdout, /handoff/);
  const config = run(['config', '--json']);
  assert.equal(config.status, 0, config.stderr);
  assert.equal(JSON.parse(config.stdout).vault, vault);
  assert.equal(JSON.parse(config.stdout).sourceRoot, p.root);
});
