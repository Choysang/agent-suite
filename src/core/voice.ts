// Voice: the user's words, verbatim. Captured from transcripts, numbered per seal, never paraphrased.

import type { RawTurn, Turn } from './types.ts';

/** A citation is always bracketed, `[v7.3]`, so version strings like `v24.1` never count. */
const CITE = /\[(v\d+\.\d+)\]/g;

export interface Scope {
  /** Turns older than this belong to earlier seals; null means "no lower bound". */
  readonly cutoff: string | null;
  /** The sealing session: all of its turns count, whatever their age. */
  readonly session: string | null;
}

/** Turns a new seal captures: not yet captured, and either from the sealing session or after the cutoff. */
export function delta(raw: readonly RawTurn[], known: ReadonlySet<string>, scope: Scope): RawTurn[] {
  const after = scope.cutoff === null ? -Infinity : Date.parse(scope.cutoff);
  const seen = new Set(known);
  const out: RawTurn[] = [];
  for (const t of [...raw].sort(chronological)) {
    if (seen.has(t.key)) continue;
    if (t.session !== scope.session && Date.parse(t.ts) < after) continue;
    seen.add(t.key);
    out.push(t);
  }
  return out;
}

/** Ids are `v<seal>.<k>`: unique across forks without coordination, because seal numbers are. */
export function numbered(seal: number, turns: readonly RawTurn[]): Turn[] {
  return turns.map((t, i) => ({ id: `v${seal}.${i + 1}`, ...t }));
}

export function toJsonl(turns: readonly Turn[]): string {
  return turns
    .map(t => JSON.stringify({ id: t.id, ts: t.ts, agent: t.agent, session: t.session, key: t.key, text: t.text }))
    .join('\n') + (turns.length ? '\n' : '');
}

export function fromJsonl(text: string): Turn[] {
  return text.split('\n').filter(Boolean).map(line => JSON.parse(line) as Turn);
}

/** Order voice files' turns by birth: seal number, then position. */
export function sorted(turns: readonly Turn[]): Turn[] {
  return [...turns].sort((a, b) => compareIds(a.id, b.id));
}

export function render(turns: readonly Turn[], clip = Infinity): string {
  return turns.map(t => `[${t.id}] ${stamp(t.ts)} · ${t.agent}\n${quote(clipped(t, clip))}`).join('\n\n');
}

/** Every `vN.K` cited in a text. */
export function citations(text: string): string[] {
  return [...text.matchAll(CITE)].map(m => m[1]!);
}

/** Rewrite citations born in seal `from` as born in seal `to`; used when a seal number is lost to a race. */
export function renumber(text: string, from: number, to: number): string {
  return from === to ? text : text.replace(new RegExp(`\\[v${from}\\.(\\d+)\\]`, 'g'), `[v${to}.$1]`);
}

/** Local `YYYY-MM-DD HH:mm`. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function clipped(t: Turn, clip: number): string {
  if (t.text.length <= clip) return t.text;
  const kb = (Buffer.byteLength(t.text) / 1024).toFixed(1);
  return `${t.text.slice(0, clip)}… ⟦全文 ${kb}KB：handoff show ${t.id}⟧`;
}

function quote(text: string): string {
  return text.split('\n').map(line => `> ${line}`).join('\n');
}

function chronological(a: RawTurn, b: RawTurn): number {
  return Date.parse(a.ts) - Date.parse(b.ts) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

function compareIds(a: string, b: string): number {
  const [sa = 0, ka = 0] = a.slice(1).split('.').map(Number);
  const [sb = 0, kb = 0] = b.slice(1).split('.').map(Number);
  return sa - sb || ka - kb;
}
