import { readFileSync, existsSync, mkdirSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { agents as handoffAgents } from '../handoff/src/agents.ts';

export const SOURCE_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SKILLS = ['kb', 'capture', 'sink', 'tidy', 'daily'];
export const AGENTS = ['codex', 'claude', 'workbuddy', 'codebuddy'];

export function paths({ root = SOURCE_ROOT, home = homedir(), env = process.env, configHome = env.AGENT_SUITE_HOME || join(home, '.agent-suite') } = {}) {
  return { root: resolve(root), home: resolve(home), env, configHome: resolve(configHome), config: resolve(configHome, 'config.json') };
}

export function readJson(path) { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }

export function loadConfig(p) {
  if (!existsSync(p.config)) return null;
  const config = readJson(p.config);
  if (config.schemaVersion !== 1 || typeof config.vault !== 'string' || !Array.isArray(config.agents)
      || config.agents.some(agent => !AGENTS.includes(agent)) || typeof config.python !== 'string'
      || typeof config.sourceRoot !== 'string'
      || (config.guidelines !== undefined && typeof config.guidelines !== 'boolean')) {
    throw new Error(`Unsupported or invalid configuration: ${p.config}`);
  }
  return config;
}

export function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, content, { flag: 'wx' });
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}

export function inspectCommand(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 15000, windowsHide: true, ...options });
  return { ok: !result.error && result.status === 0, output: (result.stdout || result.stderr || result.error?.message || '').trim(), status: result.status };
}

export function pythonCommand(config) { return process.env.AGENT_SUITE_PYTHON || config?.python || 'python'; }

export function version(p) {
  const pkg = readJson(join(p.root, 'package.json'));
  const handoff = readJson(join(p.root, 'handoff/package.json'));
  const git = inspectCommand('git', ['-C', p.root, 'rev-parse', 'HEAD']);
  const dirty = inspectCommand('git', ['-C', p.root, 'status', '--porcelain']);
  return { suite: pkg.version, handoff: handoff.version, revision: git.ok ? git.output : null, modified: dirty.ok ? Boolean(dirty.output) : null, node: process.version, sourceRoot: p.root };
}

export function profile(p, agent) {
  if (!AGENTS.includes(agent)) throw new Error(`Unknown agent: ${agent}`);
  const host = handoffAgents(p.env, p.home).find(host => host.name === (agent === 'claude' ? 'claude-code' : agent));
  return {
    skills: agent === 'codex' ? join(p.home, '.agents', 'skills') : join(host.home, 'skills'),
    handoff: join(host.home, 'skills', 'handoff'),
    guideline: agent === 'codex' ? join(host.home, 'AGENTS.md') : agent === 'claude' ? join(host.home, 'CLAUDE.md') : null,
    template: agent === 'codex' ? 'guidelines/codex/AGENTS.en.md' : 'guidelines/universal/AGENTS.en.md',
  };
}
