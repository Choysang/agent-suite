// CodeBuddy-family transcripts (WorkBuddy: ~/.workbuddy-ai/projects, CodeBuddy CLI: ~/.codebuddy/projects).
// One entry per line; user turns are `{type:"message", role:"user", content:[{type:"input_text"}]}`.
// WorkBuddy wraps the typed text in <user_query> inside an injected context block.

import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { RawTurn } from '../core/types.ts';
import type { Session, TranscriptSource } from '../ports.ts';
import { arr, first, lines, obj, str, type Json } from './jsonl.ts';

export class CodeBuddyTranscripts implements TranscriptSource {
  readonly agent: string;
  private readonly projects: string;

  constructor(agent: string, projects: string) {
    this.agent = agent;
    this.projects = projects;
  }

  async sessions(since: number): Promise<Session[]> {
    if (!existsSync(this.projects)) return [];
    const found: Session[] = [];
    for (const dir of await readdir(this.projects, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const base = join(this.projects, dir.name);
      for (const name of await readdir(base)) {
        if (!name.endsWith('.jsonl')) continue;
        const path = join(base, name);
        const { mtimeMs } = await stat(path);
        if (mtimeMs < since) continue;
        const cwd = await first(path, o => str(o.cwd));
        if (cwd) found.push({ agent: this.agent, id: name.slice(0, -'.jsonl'.length), path, cwd, mtime: mtimeMs });
      }
    }
    return found;
  }

  async turns(session: Session): Promise<RawTurn[]> {
    const turns: RawTurn[] = [];
    for (const entry of await lines(session.path)) {
      const text = spoken(entry);
      const ms = typeof entry.timestamp === 'number' ? entry.timestamp : Date.parse(str(entry.timestamp) ?? '');
      const id = str(entry.id);
      if (text && id && Number.isFinite(ms)) {
        turns.push({ ts: new Date(ms).toISOString(), agent: this.agent, session: session.id, key: `${this.agent}:${session.id}:${id}`, text });
      }
    }
    return turns;
  }

  async model(session: Session): Promise<string | null> {
    let model: string | null = null;
    for (const entry of await lines(session.path)) {
      if (entry.role === 'assistant') model = str(obj(entry.providerData)?.model) ?? model;
    }
    return model;
  }
}

/** The typed text: `<user_query>` contents when present; otherwise plain text that is not a harness injection. */
export function spoken(entry: Json): string | undefined {
  if (entry.type !== 'message' || entry.role !== 'user') return undefined;
  const texts = arr(entry.content).map(b => str(b.text) ?? '');
  const queries = texts.flatMap(t => [...t.matchAll(/<user_query>([\s\S]*?)<\/user_query>/g)].map(m => m[1]!.trim()));
  if (queries.length) return queries.join('\n') || undefined;
  return texts.filter(t => !t.trimStart().startsWith('<')).join('\n').trim() || undefined;
}
