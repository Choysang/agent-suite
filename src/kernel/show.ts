// show: read any part of a seal, or one user message in full by its voice id.

import { FILES } from '../core/types.ts';
import { fromJsonl, render, sorted } from '../core/voice.ts';
import type { Ctx } from './context.ts';

export const PARTS = ['brief', 'state', 'lane', 'voice', 'ledger', 'history', 'manifest'] as const;
export type Part = (typeof PARTS)[number];

export async function show(ctx: Ctx, n: number, part: Part): Promise<string> {
  const bundle = await ctx.store.bundle(n);
  const paths = [...bundle.files.keys()];
  if (part === 'voice') {
    const texts = await bundle.texts(paths.filter(p => p.startsWith('voice/')));
    const turns = sorted([...texts.values()].flatMap(fromJsonl));
    return turns.length ? render(turns) : '（没有原话）';
  }
  if (part === 'history') return history(ctx, n);
  if (part === 'ledger') {
    const own = FILES.ledger(n);
    return (await bundle.text(own)) ?? '（没有账本）';
  }
  const file = { brief: FILES.brief, state: FILES.state, lane: FILES.lane, manifest: FILES.manifest }[part];
  return (await bundle.text(file)) ?? `（#${n} 没有 ${file}）`;
}

/** `v7.3`: the third new user message captured by seal 7, in full. */
export async function showTurn(ctx: Ctx, id: string): Promise<string> {
  const n = Number(/^v(\d+)\.\d+$/.exec(id)?.[1]);
  const text = (await (await ctx.store.bundle(n)).text(FILES.voice(n))) ?? '';
  const turn = fromJsonl(text).find(t => t.id === id);
  if (!turn) throw new Error(`没有原话 ${id}`);
  return render([turn]);
}

/** Every seal's ledger along the ancestry, for retrospectives. */
export async function history(ctx: Ctx, n: number): Promise<string> {
  const bundle = await ctx.store.bundle(n);
  const ledgers = [...bundle.files.keys()].filter(p => p.startsWith('ledger/'));
  const texts = await bundle.texts(ledgers);
  return ledgers
    .sort((a, b) => Number(a.slice(7, -3)) - Number(b.slice(7, -3)))
    .map(p => `<!-- #${p.slice(7, -3)} -->\n${texts.get(p) ?? ''}`)
    .join('\n');
}
