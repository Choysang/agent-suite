// Line-oriented JSON reading shared by the transcript adapters.

import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

export type Json = Record<string, unknown>;

/** Every parseable line; damaged lines (e.g. a half-written tail) are skipped. */
export async function lines(path: string): Promise<Json[]> {
  const out: Json[] = [];
  for (const line of (await readFile(path, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as Json);
    } catch {
      // Live transcripts are appended while we read; a torn last line is expected.
    }
  }
  return out;
}

/** The first value `pick` finds in the first `max` lines, reading no further than needed. */
export async function first<T>(path: string, pick: (o: Json) => T | undefined, max = 50): Promise<T | undefined> {
  const reader = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let seen = 0;
  try {
    for await (const line of reader) {
      if (++seen > max) break;
      try {
        const found = pick(JSON.parse(line) as Json);
        if (found !== undefined) return found;
      } catch {
        // see lines()
      }
    }
  } finally {
    reader.close();
  }
  return undefined;
}

export function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function obj(v: unknown): Json | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : undefined;
}

export function arr(v: unknown): Json[] {
  return Array.isArray(v) ? (v.filter(x => obj(x)) as Json[]) : [];
}
