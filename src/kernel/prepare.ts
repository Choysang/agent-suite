// prepare / join: lay out a draft in .handoff/draft for the agent to complete, then `seal`.

import { board, defaultParent, frontier, nextId } from '../core/dag.ts';
import { FILES, type Kind, type SealView, type Turn } from '../core/types.ts';
import { numbered, render } from '../core/voice.ts';
import type { Bundle } from '../ports.ts';
import { capture, ledger } from './capture.ts';
import type { Ctx } from './context.ts';

export interface DraftMeta {
  readonly kind: Exclude<Kind, 'fork'>;
  readonly parents: readonly number[];
  /** Tentative seal number; voice ids in the draft are minted with it. */
  readonly n: number;
}

export interface Prepared extends DraftMeta {
  readonly dir: string;
  readonly fresh: readonly Turn[];
  readonly lanes: readonly SealView[];
}

export async function views(ctx: Ctx): Promise<SealView[]> {
  return board(await ctx.store.manifests(), await ctx.store.claims());
}

export async function prepare(ctx: Ctx, parent: number | null = null): Promise<Prepared> {
  const all = await views(ctx);
  const chosen = parent ?? defaultParent(all, ctx.desk.head(), await ctx.ws.branch());
  return draft(ctx, { kind: 'relay', parents: chosen === null ? [] : [chosen], n: nextId(all) }, []);
}

export async function join(ctx: Ctx, refs: readonly number[]): Promise<Prepared> {
  const all = await views(ctx);
  const parents = frontier(all, refs);
  if (parents.length < 2) throw new Error(`join 需要至少两条 lane 的末端，得到：${parents.map(n => `#${n}`).join(' ') || '无'}`);
  const lanes = all.filter(v => parents.includes(v.manifest.id));
  return draft(ctx, { kind: 'join', parents, n: nextId(all) }, lanes);
}

async function draft(ctx: Ctx, meta: DraftMeta, lanes: readonly SealView[]): Promise<Prepared> {
  const bundles = await Promise.all(meta.parents.map(p => ctx.store.bundle(p)));
  const cap = await capture(ctx, bundles);
  const fresh = numbered(meta.n, cap.fresh);
  const first = bundles[0];

  ctx.desk.clear();
  ctx.desk.write('draft.json', JSON.stringify(meta, null, 2) + '\n');
  ctx.desk.write(FILES.brief, first ? ((await first.text(FILES.brief)) ?? ctx.templates.brief) : ctx.templates.brief);
  ctx.desk.write(FILES.state, first ? restate((await first.text(FILES.state)) ?? ctx.templates.state) : ctx.templates.state);
  ctx.desk.write('_voice.md', `# 新增原话（${fresh.length} 条，本次封存前只读）\n\n${render(fresh)}\n`);
  ctx.desk.write('_ledger.md', await ledger(ctx, first?.manifest.repo.head ?? null));
  ctx.desk.write('_fork.example.md', ctx.templates.fork);
  if (lanes.length) ctx.desk.write('_lanes.md', await laneDigest(bundles));
  return { ...meta, dir: ctx.desk.dir, fresh, lanes };
}

/** A relay restates next/accept every time: blank them so a stale step can never pass validation. */
function restate(state: string): string {
  return '---\nnext: \naccept: \n---\n' + state.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

async function laneDigest(bundles: readonly Bundle[]): Promise<string> {
  const parts = ['# 待汇合的 lane（只读）', ''];
  for (const b of bundles) {
    const m = b.manifest;
    const texts = await b.texts([FILES.lane, FILES.state]);
    parts.push(
      `## #${m.id} · ${m.lane} · HEAD ${m.repo.head?.slice(0, 7) ?? '—'}`,
      '',
      `- 分支：\`${m.lane}\`（汇合时合并它）`,
      `- 下一步：${m.next}｜验收：${m.accept}`,
      '',
      texts.get(FILES.lane) ?? '',
      texts.get(FILES.state) ?? '',
    );
  }
  return parts.join('\n') + '\n';
}
