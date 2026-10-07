// Domain vocabulary of the handoff protocol. Pure data, no behaviour, no IO.

export const PROTOCOL = 1;

/** relay: one agent hands over to the next. fork: one of N parallel lanes. join: lanes merged back. */
export type Kind = 'relay' | 'fork' | 'join';

/** Where the voice of a seal came from: harness transcripts, the agent's recollection, or nowhere. */
export type VoiceMode = 'native' | 'recalled' | 'none';

/** One user message, verbatim. `id` is `v<seal>.<k>`: born in seal <seal>, k-th new message there. */
export interface Turn {
  readonly id: string;
  readonly ts: string;
  readonly agent: string;
  readonly session: string;
  /** Dedupe key `<agent>:<session>:<message>`; stable across re-reads of the same transcript. */
  readonly key: string;
  readonly text: string;
}

/** A user message read from a transcript, before it is numbered into a seal. */
export type RawTurn = Omit<Turn, 'id'>;

export interface Manifest {
  readonly protocol: number;
  readonly id: number;
  readonly kind: Kind;
  readonly parents: readonly number[];
  readonly project: { readonly slug: string; readonly root: string };
  readonly repo: {
    readonly branch: string;
    readonly head: string | null;
    readonly dirty: boolean;
    /** Ref holding the full worktree snapshot when dirty, e.g. `refs/handoff/wip/7`. */
    readonly wip: string | null;
    /** Untracked files too large to snapshot. */
    readonly skipped: readonly string[];
  };
  readonly source: {
    readonly agent: string;
    readonly model: string | null;
    readonly session: string | null;
    readonly voice: VoiceMode;
  };
  /** Branch the seal belongs to; a relay's default parent is the latest seal on the same lane. */
  readonly lane: string;
  readonly created: string;
  /** The first step, executable without reading anything else. */
  readonly next: string;
  /** How the next step is accepted: a command or an observable result. */
  readonly accept: string;
  /** Fork lanes only: paths this lane owns. */
  readonly owns: readonly string[];
}

export interface Claim {
  readonly agent: string;
  readonly session: string | null;
  readonly at: string;
}

/** open: leaf nobody claimed. claimed: leaf being worked on. done: has children. */
export type Status = 'open' | 'claimed' | 'done';

export interface SealView {
  readonly manifest: Manifest;
  readonly status: Status;
  readonly claim: Claim | null;
  readonly children: readonly number[];
}

/** One parallel lane declared in a draft's fork.md. */
export interface LaneTask {
  readonly name: string;
  readonly next: string;
  readonly accept: string;
  readonly owns: readonly string[];
  /** The lane's whole section, verbatim; becomes the child seal's lane.md. */
  readonly text: string;
}

/** Files of a sealed bundle. Carried-forward files keep their blob ids, so carrying is free. */
export const FILES = {
  manifest: 'manifest.json',
  brief: 'brief.md',
  state: 'state.md',
  lane: 'lane.md',
  voice: (n: number) => `voice/${n}.jsonl`,
  ledger: (n: number) => `ledger/${n}.md`,
} as const;

export const LIMITS = {
  briefLines: 120,
  stateLines: 200,
  /** Untracked files above this size stay out of the worktree snapshot. */
  snapshotBytes: 5 * 1024 * 1024,
  ledgerCommits: 50,
} as const;
