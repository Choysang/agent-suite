// install: link the one skill into every agent, and register the SessionStart hook. Idempotent.

import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const SKILL_DIR = join(import.meta.dirname, '..', '..', 'skill');
const HOOK = 'handoff hook';

export function install(home = homedir()): string {
  const claude = process.env.CLAUDE_CONFIG_DIR ?? join(home, '.claude');
  const codex = process.env.CODEX_HOME ?? join(home, '.codex');
  return [
    link(join(claude, 'skills', 'handoff')),
    link(join(codex, 'skills', 'handoff')),
    claudeHook(join(claude, 'settings.json')),
    codexHook(join(codex, 'config.toml')),
  ].join('\n');
}

/** A directory junction, so the installed skill always matches this checkout. */
function link(at: string): string {
  if (existsSync(at) && !lstatSync(at).isSymbolicLink()) return `跳过 ${at}：已存在且不是链接`;
  if (existsSync(at)) unlinkSync(at);
  mkdirSync(dirname(at), { recursive: true });
  symlinkSync(SKILL_DIR, at, 'junction');
  return `skill  ${at} → ${SKILL_DIR}`;
}

function claudeHook(file: string): string {
  const settings = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : {};
  if (JSON.stringify(settings.hooks ?? {}).includes(HOOK)) return `hook   ${file}（已存在）`;
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const entry = { hooks: [{ type: 'command', command: HOOK, timeout: 10 }] };
  const next = { ...settings, hooks: { ...hooks, SessionStart: [...(hooks.SessionStart ?? []), entry] } };
  writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  return `hook   ${file}：SessionStart → ${HOOK}`;
}

function codexHook(file: string): string {
  const toml = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (toml.includes(HOOK)) return `hook   ${file}（已存在）`;
  const block = `\n[[hooks.SessionStart]]\n\n[[hooks.SessionStart.hooks]]\ntype = "command"\ncommand = "${HOOK}"\ntimeout = 10\n`;
  writeFileSync(file, toml.replace(/\s*$/, '\n') + block);
  return `hook   ${file}：SessionStart → ${HOOK}`;
}
