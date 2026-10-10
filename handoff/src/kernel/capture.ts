// Capture the first-hand sources of a seal: user voice from transcripts, the git ledger. No model involved.

import { isAbsolute, relative } from 'node:path';
import { LIMITS, type RawTurn, type Turn, type VoiceMode } from '../core/types.ts';
import { delta, fromJsonl } from '../core/voice.ts';
import type { Bundle, FileIn, Session } from '../ports.ts';
import type { Ctx } from './context.ts';

const DAY = 24 * 3600 * 1000;

export interface Capture {
  /** Voice and ledger files of all parents, carried by blob id. */
  readonly carried: FileIn[];
  /** Every turn already captured upstream. */
  readonly known: Turn[];
  /** Turns this seal adds, in order, not yet numbered. */
  readonly fresh: RawTurn[];
  readonly source: { agent: string; model: string | null; session: string | null; voice: VoiceMode };
}

export async function capture(ctx: Ctx, parents: readonly Bundle[]): Promise<Capture> {
  const carried = new Map<string, string>();
  for (const b of parents) for (const [path, oid] of b.files) if (/^(voice|ledger)\//.test(path)) carried.set(path, oid);
  const known = (await Promise.all(parents.map(b => b.texts([...b.files.keys()].filter(p => p.startsWith('voice/'))))))
    .flatMap(m => [...m.values()])
    .flatMap(fromJsonl);
  const unique = [...new Map(known.map(t => [t.id, t])).values()];

  const created = parents.map(b => Date.parse(b.manifest.created));
  const cutoffMs = created.length ? Math.min(...created) : null;
  const since = Math.min(cutoffMs ?? Infinity, ctx.now().getTime() - DAY);
  const sessions = (await Promise.all(ctx.sources.map(s => s.sessions(since)))).flat();
  const current = live(sessions, ctx.ws.root, ctx.hint.session);
  const scoped = sessions.filter(s => s === current || inside(s.cwd, ctx.ws.root));
  const source = (s: Session) => ctx.sources.find(x => x.agent === s.agent)!;
  const raw = (await Promise.all(scoped.map(s => source(s).turns(s)))).flat();
  const start = current ? raw.filter(t => t.session === current.id).map(t => t.ts).sort()[0] ?? null : null;
  const cutoff = cutoffMs !== null ? new Date(cutoffMs).toISOString() : start;
  const fresh = delta(raw, new Set(unique.map(t => t.key)), { cutoff, session: current?.id ?? null });

  return {
    carried: [...carried].map(([path, oid]) => ({ path, oid })),
    known: unique,
    fresh,
    source: {
      agent: current?.agent ?? ctx.hint.agent ?? 'unknown',
      model: current ? await source(current).model(current) : null,
      session: current?.id ?? ctx.hint.session,
      voice: scoped.length ? 'native' : 'none',
    },
  };
}

/** The calling session: the one named by the face, else the most recently written one at or above this worktree. */
function live(sessions: readonly Session[], root: string, id: string | null): Session | null {
  if (id) return sessions.find(s => s.id === id) ?? null;
  const related = sessions.filter(s => inside(s.cwd, root) || inside(root, s.cwd));
  return related.sort((a, b) => b.mtime - a.mtime)[0] ?? null;
}

export function inside(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/** The ledger: commits since the parent seal, straight from git. Commit bodies are the decision log. */
export async function ledger(ctx: Ctx, from: string | null): Promise<string> {
  const head = await ctx.ws.head();
  const out = [`# 账本`];
  if (!head) out.push('', '仓库还没有提交。');
  else {
    const { commits, total } = await ctx.ws.log(from, head, LIMITS.ledgerCommits);
    out.push('', `范围：${from ? `${from.slice(0, 7)}..` : ''}${head.slice(0, 7)} · 提交 ${total} 个${total > commits.length ? `（显示最近 ${commits.length} 个）` : ''}`, '');
    for (const c of commits) {
      out.push(`- ${c.short} ${c.date.slice(0, 16).replace('T', ' ')} ${c.subject}`);
      for (const line of c.body.split('\n').filter(Boolean).slice(0, 8)) out.push(`  ${line}`);
    }
    if (from && commits.length) out.push('', '## 改动统计', '', '```', await ctx.ws.diffStat(from, head), '```');
  }
  const status = await ctx.ws.status();
  if (status) out.push('', '## 未提交', '', '```', ...status.split('\n').slice(0, 40), '```');
  return out.join('\n') + '\n';
}
