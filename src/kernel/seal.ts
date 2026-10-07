// seal: validate the draft, capture first-hand sources again, allocate a number by compare-and-swap.
// A draft with fork.md also spawns one child seal, branch and worktree per lane.

import { basename, dirname, join } from 'node:path';
import { board, nextId } from '../core/dag.ts';
import { clean, front, lanes as parseLanes, validate, type Draft } from '../core/draft.ts';
import { FILES, PROTOCOL, type LaneTask, type Manifest, type RawTurn, type Turn, type VoiceMode } from '../core/types.ts';
import { numbered, renumber, toJsonl } from '../core/voice.ts';
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
  const raw = ctx.desk.read('draft.json');
  if (raw === null) throw new Error('没有草稿：先运行 handoff prepare（或 handoff join）');
  const meta = JSON.parse(raw) as DraftMeta;
  const draft: Draft = {
    brief: ctx.desk.read(FILES.brief) ?? '',
    state: ctx.desk.read(FILES.state) ?? '',
    fork: ctx.desk.read('fork.md'),
    recalled: ctx.desk.read('recalled.md'),
  };

  const parents = await Promise.all(meta.parents.map(p => ctx.store.bundle(p)));
  const cap = await capture(ctx, parents);
  const recalled = cap.source.voice === 'none' && draft.recalled?.trim() ? recollect(draft.recalled, ctx.now()) : [];
  const voiceMode: VoiceMode = recalled.length ? 'recalled' : cap.source.voice;
  const turns = recalled.length ? recalled : cap.fresh;

  const ids = new Set([...cap.known, ...numbered(meta.n, turns)].map(t => t.id));
  const problems = validate(draft, ids);
  const lanes = draft.fork?.trim() ? parseLanes(draft.fork) : [];
  const snap = await ctx.ws.snapshot();
  if (lanes.length && snap.dirty) problems.push('分叉前先提交：lane 从 HEAD 开分支，未提交的改动带不过去');
  if (problems.length) throw new DraftError(problems);

  const branch = await ctx.ws.branch();
  const head = await ctx.ws.head();
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
      created: isoLocal(ctx.now()),
      next,
      accept,
      owns: [],
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
  if (snap.commit) await ctx.store.keep(sealed.manifest.id, snap.commit);
  const children = lanes.length ? await fork(ctx, sealed.manifest, lanes) : [];

  ctx.desk.clear();
  ctx.desk.setHead(sealed.manifest.id);
  return { manifest: sealed.manifest, fresh: sealed.fresh.length, voice: cap.known.length + sealed.fresh.length, lanes: children };
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
        created: isoLocal(ctx.now()),
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
    const { manifest } = await allocate(ctx, parent.id + 1, make, [parent.id], m => `handoff #${m.id} fork ${lane.name}: ${m.next}`);
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
