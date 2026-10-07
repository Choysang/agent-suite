// The handoff DAG: seals are nodes, `parents` are edges. Status and topology are derived, never stored.

import type { Claim, Manifest, SealView } from './types.ts';

/** All seals, newest first, with derived status. */
export function board(manifests: readonly Manifest[], claims: ReadonlyMap<number, Claim>): SealView[] {
  const children = new Map<number, number[]>();
  for (const m of manifests) for (const p of m.parents) children.set(p, [...(children.get(p) ?? []), m.id]);
  return manifests
    .map(manifest => {
      const kids = children.get(manifest.id) ?? [];
      const claim = claims.get(manifest.id) ?? null;
      return { manifest, children: kids, claim, status: kids.length ? 'done' : claim ? 'claimed' : 'open' } as const;
    })
    .sort((a, b) => b.manifest.id - a.manifest.id);
}

export function nextId(views: readonly SealView[]): number {
  return Math.max(0, ...views.map(v => v.manifest.id)) + 1;
}

/** A relay continues the seal this worktree is on, else the latest seal of its lane, else starts a chain. */
export function defaultParent(views: readonly SealView[], here: number | null, lane: string): number | null {
  if (here !== null && views.some(v => v.manifest.id === here)) return here;
  return views.find(v => v.manifest.lane === lane)?.manifest.id ?? null;
}

/** What a join merges: for each given seal, the leaves of its subtree (itself when it is a leaf). */
export function frontier(views: readonly SealView[], roots: readonly number[]): number[] {
  const byId = new Map(views.map(v => [v.manifest.id, v]));
  const leaves = new Set<number>();
  const walk = (id: number) => {
    const v = byId.get(id);
    if (!v) throw new Error(`没有交接 #${id}`);
    if (v.children.length === 0) leaves.add(id);
    else v.children.forEach(walk);
  };
  roots.forEach(walk);
  return [...leaves].sort((a, b) => a - b);
}

/** Seals a worker may take, oldest first. */
export function takeable(views: readonly SealView[]): SealView[] {
  return views.filter(v => v.status === 'open').sort((a, b) => a.manifest.id - b.manifest.id);
}
