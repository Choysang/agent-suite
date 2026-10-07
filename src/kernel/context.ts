// What every use case receives: ports, templates, a clock, and hints from the calling face.

import type { Claim } from '../core/types.ts';
import type { Desk, Registry, Store, TranscriptSource, Workspace } from '../ports.ts';

export interface Templates {
  readonly brief: string;
  readonly state: string;
  readonly fork: string;
}

export interface Ctx {
  readonly ws: Workspace;
  readonly store: Store;
  readonly sources: readonly TranscriptSource[];
  readonly desk: Desk;
  /** The desk of another worktree, e.g. a freshly created lane. */
  readonly deskAt: (root: string) => Desk;
  readonly registry: Registry;
  readonly templates: Templates;
  readonly now: () => Date;
  /** Identity of the caller as far as the face knows it (CLI flag, env). */
  readonly hint: { readonly session: string | null; readonly agent: string | null };
}

/** Local ISO-8601 with offset, e.g. 2026-10-07T16:40:00+08:00. */
export function isoLocal(d: Date): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.trunc(off / 60))}:${p(off % 60)}`
  );
}

export function claimant(ctx: Ctx, agent: string | null, session: string | null): Claim {
  return { agent: agent ?? ctx.hint.agent ?? 'unknown', session: session ?? ctx.hint.session, at: isoLocal(ctx.now()) };
}
