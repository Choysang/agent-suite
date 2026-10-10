// Composition root: the only place that knows which adapter backs which port.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ClaudeTranscripts } from './adapters/claude.ts';
import { CodeBuddyTranscripts } from './adapters/codebuddy.ts';
import { CodexTranscripts } from './adapters/codex.ts';
import { FsDesk } from './adapters/desk.ts';
import { GitStore, GitWorkspace } from './adapters/git.ts';
import { FileRegistry } from './adapters/registry.ts';
import { agents, type Agent } from './agents.ts';
import type { Ctx, Templates } from './kernel/context.ts';
import type { TranscriptSource } from './ports.ts';

export const HOME = process.env.HANDOFF_HOME ?? join(homedir(), '.handoff');
export const PROTOCOL_DIR = join(import.meta.dirname, '..', 'protocol');

export function registry(): FileRegistry {
  return new FileRegistry(join(HOME, 'projects.json'));
}

export function templates(): Templates {
  const read = (name: string) => readFileSync(join(PROTOCOL_DIR, 'templates', name), 'utf8');
  return { brief: read('brief.md'), state: read('state.md'), fork: read('fork.md') };
}

export function transcripts(agent: Agent): TranscriptSource {
  const root = join(agent.home, agent.sessions);
  switch (agent.transcripts) {
    case 'claude':
      return new ClaudeTranscripts(root);
    case 'codex':
      return new CodexTranscripts(root);
    case 'codebuddy':
      return new CodeBuddyTranscripts(agent.name, root);
  }
}

export async function wire(cwd: string, hint: Ctx['hint']): Promise<Ctx> {
  const ws = await GitWorkspace.open(cwd);
  if (!ws) throw new Error(`不在 git 仓库里：${cwd}（handoff 把交接存在 git 引用中；先 git init）`);
  return {
    ws,
    store: new GitStore(ws.repo),
    sources: agents().map(transcripts),
    desk: new FsDesk(ws.root),
    deskAt: root => new FsDesk(root),
    registry: registry(),
    templates: templates(),
    now: () => new Date(),
    hint,
  };
}
