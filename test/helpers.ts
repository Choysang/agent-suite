// Test kit: real git in temp directories, transcripts from memory.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsDesk } from '../src/adapters/desk.ts';
import { GitStore, GitWorkspace } from '../src/adapters/git.ts';
import { FileRegistry } from '../src/adapters/registry.ts';
import type { RawTurn } from '../src/core/types.ts';
import type { Ctx } from '../src/kernel/context.ts';
import type { Session, TranscriptSource } from '../src/ports.ts';
import { templates } from '../src/wire.ts';

export function tempDir(prefix = 'handoff-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim();
}

/** A repository with one commit. */
export function repo(): string {
  const dir = tempDir('handoff-repo-');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'core.autocrlf', 'false');
  writeFileSync(join(dir, 'app.txt'), 'v1\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

export function commit(dir: string, file: string, content: string, message: string): void {
  writeFileSync(join(dir, file), content);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', message);
}

/** A transcript store holding whatever sessions a test puts in it. */
export class MemorySource implements TranscriptSource {
  readonly agent: string;
  readonly store = new Map<string, { session: Session; turns: RawTurn[]; model: string | null }>();

  constructor(agent = 'claude-code') {
    this.agent = agent;
  }

  say(id: string, cwd: string, text: string, ts = new Date().toISOString()): void {
    const entry = this.store.get(id) ?? {
      session: { agent: this.agent, id, path: `${id}.jsonl`, cwd, mtime: 0 },
      turns: [],
      model: 'test-model',
    };
    const turn: RawTurn = { ts, agent: this.agent, session: id, key: `${this.agent}:${id}:${entry.turns.length}`, text };
    this.store.set(id, { ...entry, session: { ...entry.session, mtime: Date.parse(ts) }, turns: [...entry.turns, turn] });
  }

  async sessions(since: number): Promise<Session[]> {
    return [...this.store.values()].map(e => e.session).filter(s => s.mtime >= since);
  }

  async turns(session: Session): Promise<RawTurn[]> {
    return this.store.get(session.id)?.turns ?? [];
  }

  async model(session: Session): Promise<string | null> {
    return this.store.get(session.id)?.model ?? null;
  }
}

export async function context(root: string, source = new MemorySource(), session: string | null = null): Promise<Ctx> {
  const ws = (await GitWorkspace.open(root))!;
  return {
    ws,
    store: new GitStore(ws.repo),
    sources: [source],
    desk: new FsDesk(ws.root),
    deskAt: r => new FsDesk(r),
    registry: new FileRegistry(join(tempDir('handoff-home-'), 'projects.json')),
    templates: templates(),
    now: () => new Date(),
    hint: { session, agent: null },
  };
}

export const BRIEF = `# 目标
做一个待办应用

# 范围
- 做：增删改查

# 最终验收标准
- npm test 全绿

# 用户的持久要求
- 界面用中文 CITE

# 被否决的方案
- 用数据库 — 太重 — 用户

# 架构与约定
- 单文件
`;

export function state(next: string, decision = '- [agent] 先写存储层 — 依赖最少'): string {
  return `---
next: ${next}
accept: npm test 全绿
---
# 进度
- 完成：初始化

# 决定
${decision}

# 下一步
- ${next}

# 未决问题

# 现场
`;
}

/** Fill the draft the way an agent would. */
export function write(ctx: Ctx, files: { brief?: string; state?: string; fork?: string }): void {
  ctx.desk.write('brief.md', files.brief ?? BRIEF.replace(' CITE', ''));
  ctx.desk.write('state.md', files.state ?? state('实现存储层'));
  if (files.fork) ctx.desk.write('fork.md', files.fork);
}
