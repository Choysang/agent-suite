// install: link the one skill into every agent found on this machine, and register its SessionStart hook.
// Idempotent. Driven entirely by the agent table in src/agents.ts.

import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { agents, type Agent } from '../agents.ts';

const SKILL_DIR = join(import.meta.dirname, '..', '..', 'skill');
const HOOK = 'handoff hook';

export function install(list: readonly Agent[] = agents()): string {
  const found = list.filter(a => existsSync(a.home));
  const skipped = list.filter(a => !existsSync(a.home)).map(a => `${a.name}（未安装：${a.home}）`);
  const done = found.flatMap(a => [`[${a.name}]`, `  ${link(a)}`, `  ${hook(a)}`]);
  return [...done, ...(skipped.length ? [`跳过：${skipped.join('、')}`] : [])].join('\n');
}

/** A directory junction, so the installed skill always matches this checkout. A foreign `handoff` skill is moved aside. */
function link(a: Agent): string {
  const at = join(a.home, 'skills', 'handoff');
  let note = '';
  if (existsSync(at) && !lstatSync(at).isSymbolicLink()) {
    const backup = join(a.home, `handoff-skill.backup-${Date.now()}`);
    renameSync(at, backup);
    note = `（原有同名 skill 已移到 ${backup}）`;
  }
  if (existsSync(at) || isLink(at)) unlinkSync(at);
  mkdirSync(dirname(at), { recursive: true });
  symlinkSync(SKILL_DIR, at, 'junction');
  return `skill → ${at}${note}`;
}

function hook(a: Agent): string {
  const file = join(a.home, a.settings.file);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (text.includes(HOOK)) return `hook  ${file}（已存在）`;
  writeFileSync(file, a.settings.format === 'json' ? jsonHook(text) : tomlHook(text));
  return `hook  ${file}：SessionStart → ${HOOK}`;
}

function jsonHook(text: string): string {
  const settings = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const entry = { hooks: [{ type: 'command', command: HOOK, timeout: 10 }] };
  return JSON.stringify({ ...settings, hooks: { ...hooks, SessionStart: [...(hooks.SessionStart ?? []), entry] } }, null, 2) + '\n';
}

function tomlHook(text: string): string {
  const block = `\n[[hooks.SessionStart]]\n\n[[hooks.SessionStart.hooks]]\ntype = "command"\ncommand = "${HOOK}"\ntimeout = 10\n`;
  return text.replace(/\s*$/, '\n') + block;
}

function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
