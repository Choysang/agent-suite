// load / take: claim a seal, reconcile it with the worktree, hand the receiving agent everything it needs.

import { takeable } from '../core/dag.ts';
import { FILES, type Claim, type Manifest, type Turn } from '../core/types.ts';
import { fromJsonl, sorted } from '../core/voice.ts';
import { claimant, type Ctx } from './context.ts';
import { views } from './prepare.ts';

export interface Reconcile {
  readonly head: { readonly same: boolean; readonly actual: string | null; readonly since: readonly string[]; readonly ahead: number };
  /** same: worktree equals the sealed state. restored: rebuilt from the snapshot. differs: left alone, see diff. */
  readonly worktree: 'same' | 'restored' | 'differs' | 'unknown';
  readonly diff: string;
  /** Paths named in `next` that no longer exist. */
  readonly missing: readonly string[];
}

export interface Loaded {
  readonly manifest: Manifest;
  readonly brief: string;
  readonly state: string;
  readonly lane: string | null;
  readonly recent: readonly Turn[];
  readonly voice: number;
  readonly reconcile: Reconcile;
  readonly previous: Claim | null;
}

const RECENT = 6;

export async function load(ctx: Ctx, n: number | null, alreadyClaimed = false): Promise<Loaded> {
  const id = n ?? ctx.desk.head();
  if (id === null) throw new Error('要接手哪个交接？用法：handoff load <编号>（handoff ls 查看全部）');
  const bundle = await ctx.store.bundle(id);
  const previous = alreadyClaimed ? null : (await ctx.store.claim(id, claimant(ctx, null, null), true)).previous;
  const reconcile = await reconcileWith(ctx, bundle.manifest);
  ctx.desk.setHead(id);

  const voicePaths = [...bundle.files.keys()].filter(p => p.startsWith('voice/'));
  const texts = await bundle.texts([FILES.brief, FILES.state, FILES.lane, ...voicePaths]);
  const voice = sorted(voicePaths.flatMap(p => fromJsonl(texts.get(p) ?? '')));
  return {
    manifest: bundle.manifest,
    brief: texts.get(FILES.brief) ?? '',
    state: texts.get(FILES.state) ?? '',
    lane: texts.get(FILES.lane) ?? null,
    recent: voice.slice(-RECENT),
    voice: voice.length,
    reconcile,
    previous: previous && previous.session !== ctx.hint.session ? previous : null,
  };
}

/** Atomically claim the oldest open seal and load it. For swarm workers that pull work. */
export async function take(ctx: Ctx): Promise<Loaded> {
  for (const v of takeable(await views(ctx))) {
    if ((await ctx.store.claim(v.manifest.id, claimant(ctx, null, null), false)).ok) return load(ctx, v.manifest.id, true);
  }
  throw new Error('没有待接手的交接（handoff ls 查看全部）');
}

/** Three checks, all informational: HEAD, worktree, and the paths the next step names. */
export async function reconcileWith(ctx: Ctx, m: Manifest): Promise<Reconcile> {
  const actual = await ctx.ws.head();
  const same = actual === m.repo.head;
  const between = !same && actual && m.repo.head ? await ctx.ws.log(m.repo.head, actual, 10).catch(() => null) : null;
  const head = {
    same,
    actual,
    since: between?.commits.map(c => `${c.short} ${c.subject}`) ?? [],
    ahead: between?.total ?? 0,
  };

  const snap = await ctx.ws.snapshot();
  const target = await ctx.ws.tree(m.repo.wip ?? m.repo.head ?? '').catch(() => null);
  let worktree: Reconcile['worktree'] = 'unknown';
  let diff = '';
  if (target === snap.tree) worktree = 'same';
  else if (target !== null && same && !snap.dirty && m.repo.wip) {
    await ctx.ws.restore(m.repo.wip);
    worktree = 'restored';
  } else if (target !== null) {
    worktree = 'differs';
    diff = await ctx.ws.diffStat(target, snap.tree);
  }

  const missing = paths(m.next).filter(p => !ctx.ws.exists(p));
  return { head, worktree, diff, missing };
}

/** Back-ticked tokens that look like paths: contain `/` or a file extension. `:line` suffixes dropped. */
export function paths(text: string): string[] {
  return [...text.matchAll(/`([^`\s]+)`/g)]
    .map(m => m[1]!.replace(/:\d+(:\d+)?$/, ''))
    .filter(p => !/^[a-z]+:\/\//i.test(p) && (p.includes('/') || /\.[a-z0-9]{1,6}$/i.test(p)));
}
