// seal: validate the draft, capture first-hand sources again, allocate a number by compare-and-swap.
// A draft with fork.md also spawns one child seal, branch and worktree per lane.

import { basename, dirname, join } from 'node:path';
import { board, nextId } from '../core/dag.ts';
import { clean, front, lanes as parseLanes, validate, type Draft } from '../core/draft.ts';
import { FILES, PROTOCOL, type LaneTask, type Manifest, type RawTurn, type Turn, type VoiceMode } from '../core/types.ts';
import { delta, numbered, renumber, toJsonl } from '../core/voice.ts';
import type { FileIn } from '../ports.ts';
import { capture, ledger } from './capture.ts';
import { isoLocal, type Ctx } from './context.ts';
import type { DraftMeta } from './prepare.ts';

export class DraftError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`草稿未通过校验：\n${problems.map(p => `- ${p}`).join('\n')}`);
    this.problems = problems;
  }
}

export interface LaneSeal {
  readonly manifest: Manifest;
  readonly path: string;
}

export interface Sealed {
  readonly manifest: Manifest;
  readonly fresh: number;
  readonly voice: number;
  readonly lanes: readonly LaneSeal[];
}

export async function seal(ctx: Ctx): Promise<Sealed> {
  if (ctx.desk.read('sealed.json') !== null) return recover(ctx);
  const raw = ctx.desk.read('draft.json');
  if (raw === null) throw new Error('没有草稿：先运行 handoff prepare（或 handoff join）');
  const meta = JSON.parse(raw) as DraftMeta;
  const draft: Draft = {
    brief: ctx.desk.read(FILES.brief) ?? '',
    state: ctx.desk.read(FILES.state) ?? '',
    fork: ctx.desk.read('fork.md'),
    recalled: ctx.desk.read('recalled.md'),
  };

  // The next seal's cutoff is this instant: anything said after it belongs to the next seal.
  const created = isoLocal(ctx.now());
  const parents = await Promise.all(meta.parents.map(p => ctx.store.bundle(p)));
  const cap = await capture(ctx, parents);
  const known = new Set(cap.known.map(t => t.key));
  const recollected = cap.source.voice === 'none' && draft.recalled?.trim() ? recollect(draft.recalled, ctx.now()) : [];
  const recalled = delta(recollected, known, { cutoff: null, session: null });
  const voiceMode: VoiceMode = recalled.length ? 'recalled' : cap.source.voice;
  const turns = recalled.length ? recalled : cap.fresh;

  const ids = new Set([...cap.known, ...numbered(meta.n, turns)].map(t => t.id));
  const problems = validate(draft, ids);
  const forking = Boolean(draft.fork?.trim()) && parseLanes(draft.fork!).length > 0;
  const snap = await ctx.ws.snapshot();
  const head = await ctx.ws.head();
  if (forking && snap.dirty) problems.push('分叉前先提交：lane 从 HEAD 开分支，未提交的改动带不过去');
  if (forking && !head) problems.push('分叉需要至少一个提交');
  if (problems.length) throw new DraftError(problems);

  const branch = await ctx.ws.branch();
  const ledgerText = await ledger(ctx, parents[0]?.manifest.repo.head ?? null);
  const laneMd = parents.length === 1 && parents[0]!.manifest.lane === branch ? parents[0]!.files.get(FILES.lane) : undefined;

  const make = (n: number): { manifest: Manifest; files: FileIn[]; fresh: Turn[] } => {
    const fresh = numbered(n, turns);
    const { next, accept, body } = front(renumber(draft.state, meta.n, n));
    const manifest: Manifest = {
      protocol: PROTOCOL,
      id: n,
      kind: meta.kind,
      parents: meta.parents,
      project: { slug: ctx.registry.slug(ctx.ws.root), root: ctx.ws.root },
      repo: { branch, head, dirty: snap.dirty, wip: snap.commit ? `refs/handoff/wip/${n}` : null, skipped: snap.skipped },
      source: { ...cap.source, voice: voiceMode },
      lane: branch,
      created,
      next,
      accept,
      owns: laneMd ? parents[0]!.manifest.owns : [],
    };
    const files: FileIn[] = [
      ...cap.carried,
      { path: FILES.manifest, content: JSON.stringify(manifest, null, 2) + '\n' },
      { path: FILES.brief, content: clean(renumber(draft.brief, meta.n, n)) },
      { path: FILES.state, content: `---\nnext: ${next}\naccept: ${accept}\n---\n${clean(body)}` },
      { path: FILES.ledger(n), content: ledgerText },
      ...(fresh.length ? [{ path: FILES.voice(n), content: toJsonl(fresh) }] : []),
      ...(laneMd ? [{ path: FILES.lane, oid: laneMd }] : []),
    ];
    return { manifest, files, fresh };
  };

  const sealed = await allocate(ctx, meta.n, n => make(n), meta.parents, m => `handoff #${m.id} ${m.kind}: ${m.next}`);
  const lanes = forking ? parseLanes(renumber(draft.fork!, meta.n, sealed.manifest.id)) : [];
  // Retain the committed identity before side effects. A failed worktree or WIP
  // write is resumed against this seal instead of minting another parent.
  const pending: PendingSeal = {
    id: sealed.manifest.id, snapshot: snap.commit, lanes,
    fresh: sealed.fresh.length, voice: cap.known.length + sealed.fresh.length,
  };
  ctx.desk.write('sealed.json', JSON.stringify(pending) + '\n');
  return recover(ctx);
}

interface PendingSeal {
  readonly id: number;
  readonly snapshot: string | null;
  readonly lanes: readonly LaneTask[];
  readonly fresh: number;
  readonly voice: number;
}

/** Finish side effects of an already sealed draft; repeated attempts reuse its children. */
export async function recover(ctx: Ctx): Promise<Sealed> {
  const raw = ctx.desk.read('sealed.json');
  if (raw === null) throw new Error('没有待恢复的封存');
  const pending = JSON.parse(raw) as PendingSeal;
  const { manifest } = await ctx.store.bundle(pending.id);
  try {
    if (pending.snapshot) await ctx.store.keep(pending.id, pending.snapshot);
    ctx.desk.setHead(pending.id);
    const children = await fork(ctx, manifest, pending.lanes);
    ctx.desk.clear();
    return { manifest, fresh: pending.fresh, voice: pending.voice, lanes: children };
  } catch (error) {
    throw new Error(`#${pending.id} 已封存，后续操作未完成；修正原因后运行 handoff recover（或重试 handoff seal）。${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

/** One child seal, branch `lane/<n>-<name>` and sibling worktree `<repo>@<n>-<name>` per lane. */
async function fork(ctx: Ctx, parent: Manifest, lanes: readonly LaneTask[]): Promise<LaneSeal[]> {
  const base = await ctx.store.bundle(parent.id);
  const shared = [...base.files].filter(([p]) => p !== FILES.manifest && p !== FILES.lane).map(([path, oid]) => ({ path, oid }));
  const out: LaneSeal[] = [];
  for (const lane of lanes) {
    const make = (n: number) => {
      const manifest: Manifest = {
        ...parent,
        id: n,
        kind: 'fork',
        parents: [parent.id],
        repo: { ...parent.repo, dirty: false, wip: null },
        lane: `lane/${n}-${lane.name}`,
        next: lane.next,
        accept: lane.accept,
        owns: lane.owns,
      };
      const files: FileIn[] = [
        ...shared,
        { path: FILES.manifest, content: JSON.stringify(manifest, null, 2) + '\n' },
        { path: FILES.lane, content: lane.text },
      ];
      return { manifest, files, fresh: [] };
    };
    const existing = (await ctx.store.manifests()).find(m =>
      m.kind === 'fork' && m.parents.length === 1 && m.parents[0] === parent.id && m.lane === `lane/${m.id}-${lane.name}`);
    const manifest = existing ?? (await allocate(ctx, parent.id + 1, make, [parent.id], m => `handoff #${m.id} fork ${lane.name}: ${m.next}`)).manifest;
    const path = join(dirname(ctx.ws.root), `${basename(ctx.ws.root)}@${manifest.id}-${lane.name}`);
    await ctx.ws.addWorktree(path, manifest.lane, parent.repo.head ?? 'HEAD');
    ctx.deskAt(path).setHead(manifest.id);
    out.push({ manifest, path });
  }
  return out;
}

/** Claim the lowest free number at or above `from`; losing a race just moves to the next one. */
async function allocate(
  ctx: Ctx,
  from: number,
  make: (n: number) => { manifest: Manifest; files: FileIn[]; fresh: Turn[] },
  parents: readonly number[],
  message: (m: Manifest) => string,
): Promise<{ manifest: Manifest; fresh: Turn[] }> {
  let n = Math.max(from, nextId(board(await ctx.store.manifests(), new Map())));
  for (;;) {
    const built = make(n);
    if (await ctx.store.put(n, built.files, parents, message(built.manifest))) return built;
    n++;
  }
}

/** The agent's recollection: one user message per paragraph. Marked as such in the manifest. */
function recollect(text: string, now: Date): RawTurn[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, i) => ({ ts: new Date(now.getTime() + i).toISOString(), agent: 'recalled', session: 'recalled', key: `recalled:${hash(p)}`, text: p }));
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}
