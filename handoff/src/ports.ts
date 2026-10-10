// Ports: everything the kernel needs from the outside world. Adapters implement them; the kernel sees only these.

import type { Claim, Manifest, RawTurn } from './core/types.ts';

/** A file headed into a bundle: new content, or an existing blob carried forward for free. */
export type FileIn = { readonly path: string; readonly content: string } | { readonly path: string; readonly oid: string };

export interface Bundle {
  readonly manifest: Manifest;
  /** Every file of the bundle tree with its blob id. */
  readonly files: ReadonlyMap<string, string>;
  text(path: string): Promise<string | null>;
  texts(paths: readonly string[]): Promise<Map<string, string>>;
}

/** Where seals live: `refs/handoff/*` of the repository. Allocation and claims are compare-and-swap. */
export interface Store {
  manifests(): Promise<Manifest[]>;
  bundle(n: number): Promise<Bundle>;
  /** Create seal n atomically; false when n is already taken. */
  put(n: number, files: readonly FileIn[], parents: readonly number[], message: string): Promise<boolean>;
  claims(): Promise<Map<number, Claim>>;
  /** Claim seal n. `force` takes over an existing claim; returns the claim it replaced, if any. */
  claim(n: number, claim: Claim, force: boolean): Promise<{ ok: boolean; previous: Claim | null }>;
  /** Keep a worktree snapshot reachable as `refs/handoff/wip/<n>`; returns the ref name. */
  keep(n: number, commit: string): Promise<string>;
  sync(remote: string): Promise<string>;
}

export interface Snapshot {
  readonly tree: string;
  /** Commit holding the snapshot on top of HEAD; null when the worktree equals HEAD. */
  readonly commit: string | null;
  readonly dirty: boolean;
  readonly skipped: readonly string[];
}

export interface Commit {
  readonly short: string;
  readonly date: string;
  readonly subject: string;
  readonly body: string;
}

/** The git working tree an agent works in. */
export interface Workspace {
  readonly root: string;
  head(): Promise<string | null>;
  branch(): Promise<string>;
  snapshot(): Promise<Snapshot>;
  tree(commit: string): Promise<string>;
  /** Make the worktree equal the snapshot commit, without touching HEAD or the index. */
  restore(commit: string): Promise<void>;
  /** Commits in `from..to` (all of `to` when from is null), newest first, at most `limit`, plus the total. */
  log(from: string | null, to: string, limit: number): Promise<{ commits: Commit[]; total: number }>;
  diffStat(from: string, to: string): Promise<string>;
  status(): Promise<string>;
  exists(path: string): boolean;
  /** Add a worktree at `path` on a new branch starting at `at`. */
  addWorktree(path: string, branch: string, at: string): Promise<void>;
}

export interface Session {
  readonly agent: string;
  readonly id: string;
  readonly path: string;
  readonly cwd: string;
  /** Last modification, epoch ms: the live session is the one being written right now. */
  readonly mtime: number;
}

/** A harness's transcript store, e.g. Claude Code or Codex. */
export interface TranscriptSource {
  readonly agent: string;
  /** Sessions modified at or after `since` (epoch ms). */
  sessions(since: number): Promise<Session[]>;
  turns(session: Session): Promise<RawTurn[]>;
  model(session: Session): Promise<string | null>;
}

/** The per-worktree scratch space `.handoff/`: draft files and the HEAD pointer. Invisible to git. */
export interface Desk {
  readonly dir: string;
  head(): number | null;
  setHead(n: number): void;
  read(name: string): string | null;
  write(name: string, content: string): void;
  clear(): void;
}

/** Project slug to repository root, so `/handoff myapp-7` works from any directory. */
export interface Registry {
  root(slug: string): string | null;
  /** Register a root and return its slug. */
  slug(root: string): string;
}
