#!/usr/bin/env node
// CLI face: argv in, kernel call, text out. The skill, the hook and humans all come through here.

import { parseArgs } from 'node:util';
import { goal } from '../core/draft.ts';
import type { Ctx } from '../kernel/context.ts';
import { load, take } from '../kernel/load.ts';
import { join, prepare, views } from '../kernel/prepare.ts';
import { DraftError, seal } from '../kernel/seal.ts';
import { PARTS, show, showTurn, type Part } from '../kernel/show.ts';
import { registry, wire } from '../wire.ts';
import { install } from './install.ts';
import { card, loaded, prepared, sealed, table } from './render.ts';

const HELP = `handoff — 跨 Agent 会话接力

  handoff                      看板（同 handoff ls）
  handoff prepare [--parent N] 起草接力：.handoff/draft/ 里写 brief.md、state.md（可选 fork.md）
  handoff seal                 校验草稿并封存，得到编号
  handoff load [N|项目-N]      认领 + 对账 + 输出交接包（不带编号则用本工作区的 .handoff/HEAD）
  handoff take                 原子认领最早的待接手交接并载入（并行 worker 用）
  handoff join N...            起草汇合：N 为分叉点或各 lane 末端
  handoff ls [--json]          看板
  handoff show N [${PARTS.join('|')}]
  handoff show vN.K            一条原话全文
  handoff sync [remote]        推送并拉取 refs/handoff/*
  handoff install              安装 skill（Claude Code、Codex）与 SessionStart hook
  通用选项：--session <id>     调用方会话 id（Claude Code skill 自动传入）`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: withoutEmptySession(argv),
    allowPositionals: true,
    options: {
      session: { type: 'string' },
      parent: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command = 'ls', ...rest] = positionals;
  const hint = { session: sessionHint(values.session), agent: agentHint() };
  const at = (cwd = process.cwd()) => wire(cwd, hint);

  if (values.help || command === 'help') return say(HELP);
  switch (command) {
    case 'ls': {
      const ctx = await at();
      const all = await views(ctx);
      return say(values.json ? JSON.stringify(all, null, 2) : table(all, ctx.now()));
    }
    case 'prepare':
      return say(prepared(await prepare(await at(), values.parent ? int(values.parent) : null)));
    case 'seal':
      return say(sealed(await seal(await at())));
    case 'load': {
      const ref = rest[0] ? resolveRef(rest[0]) : null;
      return say(loaded(await load(await at(ref?.root), ref?.n ?? null)));
    }
    case 'take':
      return say(loaded(await take(await at())));
    case 'join':
      return say(prepared(await join(await at(), rest.map(r => resolveRef(r).n))));
    case 'show': {
      const [target = '', part = 'state'] = rest;
      if (/^v\d+\.\d+$/.test(target)) return say(await showTurn(await at(), target));
      if (!(PARTS as readonly string[]).includes(part)) throw new Error(`show 的部分只能是：${PARTS.join(' ')}`);
      const ref = resolveRef(target);
      return say(await show(await at(ref.root), ref.n, part as Part));
    }
    case 'sync':
      return say(await (await at()).store.sync(rest[0] ?? 'origin'));
    case 'hook':
      return hook();
    case 'install':
      return say(install());
    default:
      throw new Error(`未知命令：${command}\n\n${HELP}`);
  }

  /** SessionStart hook: print a routing card when the repo has live handoffs; otherwise stay silent. */
  async function hook(): Promise<number> {
    try {
      const input = process.stdin.isTTY ? '' : await text(process.stdin);
      const cwd = (input.trim() ? (JSON.parse(input) as { cwd?: string }).cwd : undefined) ?? process.cwd();
      const ctx: Ctx = await at(cwd);
      const all = await views(ctx);
      const here = ctx.desk.head();
      const latest = all.find(v => v.status !== 'done');
      const brief = latest ? await (await ctx.store.bundle(latest.manifest.id)).text('brief.md') : null;
      const out = card(all, here, brief ? goal(brief) : null, ctx.now());
      if (out) process.stdout.write(out + '\n');
    } catch {
      // A broken hook must never get in the way of starting a session.
    }
    return 0;
  }
}

/** `7`, `#7`, `myapp-7`, `myapp#7`. A project prefix resolves through ~/.handoff/projects.json. */
function resolveRef(ref: string): { n: number; root: string | undefined } {
  const m = /^(?:(.+?)[-#])?#?(\d+)$/.exec(ref);
  if (!m) throw new Error(`看不懂的交接编号：${ref}（例如 7、myapp-7）`);
  if (!m[1]) return { n: Number(m[2]), root: undefined };
  const root = registry().root(m[1]);
  if (!root) throw new Error(`未登记的项目：${m[1]}（在该仓库封存过一次才会登记）`);
  return { n: Number(m[2]), root };
}

/** Hosts that do not expand `${CLAUDE_SESSION_ID}` may pass `--session` with nothing after it. */
function withoutEmptySession(argv: string[]): string[] {
  return argv.flatMap((a, i) => (a === '--session' && (argv[i + 1] === undefined || argv[i + 1]!.startsWith('-')) ? [] : [a]));
}

/** In Codex the skill's `${CLAUDE_SESSION_ID}` stays unexpanded; treat that as no hint. */
function sessionHint(raw: string | undefined): string | null {
  return raw && !raw.includes('$') && !raw.includes('{') ? raw : null;
}

/** Codex first: an agent launched from inside Claude Code inherits Claude's variables, never the reverse here. */
function agentHint(): string | null {
  if (Object.keys(process.env).some(k => k.startsWith('CODEX_'))) return 'codex';
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE_ENTRYPOINT) return 'claude-code';
  return null;
}

function int(s: string): number {
  const n = Number(s.replace(/^#/, ''));
  if (!Number.isInteger(n) || n < 1) throw new Error(`不是交接编号：${s}`);
  return n;
}

async function text(stream: NodeJS.ReadStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function say(s: string): number {
  process.stdout.write(s.endsWith('\n') ? s : s + '\n');
  return 0;
}

main(process.argv.slice(2)).then(
  code => process.exit(code),
  (e: unknown) => {
    process.stderr.write(`${e instanceof DraftError || e instanceof Error ? e.message : String(e)}\n`);
    process.exit(e instanceof DraftError ? 2 : 1);
  },
);
