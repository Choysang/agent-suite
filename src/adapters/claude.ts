// Claude Code transcripts: ~/.claude/projects/<cwd-slug>/<session>.jsonl, one JSON entry per line.

import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { RawTurn } from '../core/types.ts';
import type { Session, TranscriptSource } from '../ports.ts';
import { arr, first, lines, obj, str, type Json } from './jsonl.ts';

const AGENT = 'claude-code';

export class ClaudeTranscripts implements TranscriptSource {
  readonly agent = AGENT;

  private readonly projects: string;

  constructor(projects: string) {
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
        if (cwd) found.push({ agent: AGENT, id: name.slice(0, -'.jsonl'.length), path, cwd, mtime: mtimeMs });
      }
    }
    return found;
  }

  async turns(session: Session): Promise<RawTurn[]> {
    const turns: RawTurn[] = [];
    for (const entry of await lines(session.path)) {
      const text = spoken(entry);
      const ts = str(entry.timestamp);
      const uuid = str(entry.uuid);
      if (text && ts && uuid) turns.push({ ts, agent: AGENT, session: session.id, key: `${AGENT}:${session.id}:${uuid}`, text });
    }
    return turns;
  }

  async model(session: Session): Promise<string | null> {
    let model: string | null = null;
    for (const entry of await lines(session.path)) {
      if (entry.type === 'assistant') model = str(obj(entry.message)?.model) ?? model;
    }
    return model === '<synthetic>' ? null : model;
  }
}

/** What the human typed, or undefined for tool results, meta entries, compaction summaries and harness echoes. */
export function spoken(entry: Json): string | undefined {
  if (entry.type !== 'user' || entry.isMeta || entry.isSidechain || entry.isCompactSummary) return undefined;
  if (entry.toolUseResult !== undefined) return undefined;
  const origin = obj(entry.origin);
  if (origin && origin.kind !== 'human') return undefined;
  const content = obj(entry.message)?.content;
  const blocks = arr(content);
  if (blocks.some(b => b.type === 'tool_result')) return undefined;
  const raw =
    str(content) ??
    blocks.map(b => (b.type === 'text' ? str(b.text) : b.type === 'image' ? '[图片]' : undefined)).filter(Boolean).join('\n');
  return command(raw.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()) || undefined;
}

/** Slash commands and `!` shell input are stored as XML-ish markup; keep what the user typed. */
function command(text: string): string {
  if (/^<(local-command-(stdout|stderr|caveat)|bash-(stdout|stderr))>/.test(text)) return '';
  if (/^\[Request interrupted/.test(text)) return '';
  const bash = /^<bash-input>([\s\S]*?)<\/bash-input>$/.exec(text);
  if (bash) return `!${bash[1]!.trim()}`;
  const name = /<command-name>([^<]*)<\/command-name>/.exec(text)?.[1]?.trim();
  if (!name) return text;
  const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text)?.[1]?.trim();
  return args ? `${name} ${args}` : name;
}
