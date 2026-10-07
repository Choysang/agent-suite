// Codex transcripts: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl; line 1 is session_meta.

import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { RawTurn } from '../core/types.ts';
import type { Session, TranscriptSource } from '../ports.ts';
import { arr, first, lines, obj, str, type Json } from './jsonl.ts';

const AGENT = 'codex';
const DAY = 24 * 3600 * 1000;

/** Context the harness injects as user-role text; never the user's own words. */
const INJECTED = [
  '<environment_context>',
  '# AGENTS.md instructions',
  '<INSTRUCTIONS>',
  '<user_instructions>',
  '<codex_internal_context',
  '<external_codex_apps_',
  '<recommended_plugins>',
  '<codex_delegation>',
  '<turn_aborted>',
  '<skill>',
  '<!-- handoff:skill -->',
  '## Code review guidelines:',
  '</image>',
];

export class CodexTranscripts implements TranscriptSource {
  readonly agent = AGENT;

  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async sessions(since: number): Promise<Session[]> {
    if (!existsSync(this.root)) return [];
    const floor = day(since - DAY);
    const found: Session[] = [];
    for (const dir of await this.days(floor)) {
      for (const name of await readdir(dir)) {
        if (!name.startsWith('rollout-') || !name.endsWith('.jsonl')) continue;
        const path = join(dir, name);
        const { mtimeMs } = await stat(path);
        if (mtimeMs < since) continue;
        const meta = await first(path, o => (o.type === 'session_meta' ? obj(o.payload) : undefined), 3);
        const id = str(meta?.id);
        const cwd = str(meta?.cwd);
        if (id && cwd) found.push({ agent: AGENT, id, path, cwd, mtime: mtimeMs });
      }
    }
    return found;
  }

  async turns(session: Session): Promise<RawTurn[]> {
    const turns: RawTurn[] = [];
    (await lines(session.path)).forEach((entry, i) => {
      const text = spoken(entry);
      const ts = str(entry.timestamp);
      if (text && ts) turns.push({ ts, agent: AGENT, session: session.id, key: `${AGENT}:${session.id}:${i}`, text });
    });
    return turns;
  }

  async model(session: Session): Promise<string | null> {
    let model: string | null = null;
    for (const entry of await lines(session.path)) {
      if (entry.type === 'turn_context') model = str(obj(entry.payload)?.model) ?? model;
    }
    return model;
  }

  /** Date directories at or after `floor` (YYYY/MM/DD as a sortable string). */
  private async days(floor: string): Promise<string[]> {
    const out: string[] = [];
    const sub = async (path: string) =>
      existsSync(path) ? (await readdir(path, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name) : [];
    for (const y of await sub(this.root))
      for (const m of await sub(join(this.root, y)))
        for (const d of await sub(join(this.root, y, m))) if (`${y}/${m}/${d}` >= floor) out.push(join(this.root, y, m, d));
    return out;
  }
}

/** The user's text of a user-role message, with harness injections removed. */
export function spoken(entry: Json): string | undefined {
  const p = obj(entry.payload);
  if (entry.type !== 'response_item' || p?.type !== 'message' || p.role !== 'user') return undefined;
  const parts = arr(p.content)
    .map(b => str(b.text))
    .filter((t): t is string => t !== undefined && !INJECTED.some(prefix => t.trimStart().startsWith(prefix)))
    .map(t => t.replace(/^<image name=(\[[^\]]+\])[^>]*>$/, '$1').trim())
    .filter(Boolean);
  return parts.join('\n') || undefined;
}

function day(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
