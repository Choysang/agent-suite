// Git adapter: the Store lives in refs/handoff/*, the Workspace is the working tree. Plumbing only.

import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { LIMITS, type Claim, type Manifest } from '../core/types.ts';
import type { Bundle, Commit, FileIn, Snapshot, Store, Workspace } from '../ports.ts';

const SEALS = 'refs/handoff/seal/';
const CLAIMS = 'refs/handoff/claim/';
const WIPS = 'refs/handoff/wip/';
/** Seals and claims are tool records; they never borrow the user's identity. */
const IDENTITY = ['-c', 'user.name=handoff', '-c', 'user.email=handoff@localhost'];

interface RunOptions {
  readonly input?: string | Buffer;
  readonly env?: Record<string, string>;
  readonly ok?: (code: number) => boolean;
}

export class Git {
  readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  async raw(args: readonly string[], opts: RunOptions = {}): Promise<{ code: number; out: Buffer; err: string }> {
    return new Promise((done, fail) => {
      const child = spawn('git', ['-c', 'core.quotepath=off', ...args], {
        cwd: this.cwd,
        env: { ...process.env, ...opts.env },
        windowsHide: true,
      });
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      // A rejected command can close stdin early; preserve its exit status and stderr.
      let inputError: Error | null = null;
      child.stdin.on('error', (error: Error) => { inputError = error; });
      child.stdout.on('data', (b: Buffer) => out.push(b));
      child.stderr.on('data', (b: Buffer) => err.push(b));
      child.on('error', fail);
      child.on('close', code => {
        const result = { code: code ?? 1, out: Buffer.concat(out), err: Buffer.concat(err).toString('utf8') };
        if (result.code === 0 && inputError) fail(new Error(`git ${args.join(' ')}: stdin ${inputError.message}`, { cause: inputError }));
        else if ((opts.ok ?? (c => c === 0))(result.code)) done(result);
        else fail(new Error(`git ${args.join(' ')}: ${result.err.trim() || `exit ${result.code}`}`));
      });
      if (opts.input?.length) child.stdin.end(opts.input);
      else child.stdin.end();
    });
  }

  async run(args: readonly string[], opts: RunOptions = {}): Promise<string> {
    return (await this.raw(args, opts)).out.toString('utf8').trim();
  }

  async succeeds(args: readonly string[], opts: RunOptions = {}): Promise<boolean> {
    return (await this.raw(args, { ...opts, ok: () => true })).code === 0;
  }

  /** Read many objects (`<oid>` or `<rev>:<path>`) in one process. Missing objects map to null. */
  async cat(names: readonly string[]): Promise<Map<string, string | null>> {
    const found = new Map<string, string | null>();
    if (names.length === 0) return found;
    const { out } = await this.raw(['cat-file', '--batch'], { input: names.join('\n') + '\n' });
    let at = 0;
    for (const name of names) {
      const eol = out.indexOf(0x0a, at);
      const header = out.subarray(at, eol).toString('utf8');
      at = eol + 1;
      if (header.endsWith(' missing') || header.endsWith(' ambiguous')) {
        found.set(name, null);
        continue;
      }
      const size = Number(header.split(' ')[2]);
      found.set(name, out.subarray(at, at + size).toString('utf8'));
      at += size + 1;
    }
    return found;
  }

  async blob(content: string): Promise<string> {
    return this.run(['hash-object', '-w', '--no-filters', '--stdin'], { input: content });
  }

  /** Build a tree from `path -> blob` entries, nesting directories. */
  async mktree(entries: ReadonlyMap<string, string>): Promise<string> {
    const here: string[] = [];
    const dirs = new Map<string, Map<string, string>>();
    for (const [path, oid] of entries) {
      const slash = path.indexOf('/');
      if (slash < 0) here.push(`100644 blob ${oid}\t${path}`);
      else {
        const dir = path.slice(0, slash);
        dirs.set(dir, (dirs.get(dir) ?? new Map()).set(path.slice(slash + 1), oid));
      }
    }
    for (const [dir, sub] of dirs) here.push(`040000 tree ${await this.mktree(sub)}\t${dir}`);
    return this.run(['mktree', '-z'], { input: here.map(l => l + '\0').join('') });
  }

  /** Create `ref` only if absent, or move it only if it still points at `old`. Atomic either way. */
  async cas(ref: string, oid: string, old: string | null): Promise<boolean> {
    const command = old === null ? `create ${ref} ${oid}` : `update ${ref} ${oid} ${old}`;
    const result = await this.raw(['update-ref', '--stdin'], { input: command + '\n', ok: () => true });
    if (result.code === 0) return true;
    // Losing the race means the ref exists (or moved); anything else is a real failure.
    const now = await this.raw(['rev-parse', '--verify', '-q', ref], { ok: () => true });
    const lost = old === null ? now.code === 0 : now.out.toString('utf8').trim() !== old;
    if (lost) return false;
    throw new Error(`git update-ref ${ref}: ${result.err.trim()}`);
  }

  async refs(prefix: string): Promise<Map<number, string>> {
    const out = await this.run(['for-each-ref', '--format=%(refname) %(objectname)', prefix]);
    const refs = new Map<number, string>();
    for (const line of out.split('\n').filter(Boolean)) {
      const [ref = '', oid = ''] = line.split(' ');
      const n = Number(ref.slice(prefix.length));
      if (Number.isInteger(n) && n > 0) refs.set(n, oid);
    }
    return refs;
  }
}

export class GitStore implements Store {
  private readonly git: Git;

  constructor(git: Git) {
    this.git = git;
  }

  async manifests(): Promise<Manifest[]> {
    const seals = await this.git.refs(SEALS);
    const blobs = await this.git.cat([...seals.values()].map(oid => `${oid}:manifest.json`));
    return [...blobs.values()].flatMap(text => (text ? [JSON.parse(text) as Manifest] : []));
  }

  async bundle(n: number): Promise<Bundle> {
    const oid = (await this.git.refs(SEALS)).get(n);
    if (!oid) throw new Error(`没有交接 #${n}（handoff ls 查看全部）`);
    const listing = (await this.git.raw(['ls-tree', '-r', '-z', oid])).out.toString('utf8');
    const files = new Map<string, string>();
    for (const entry of listing.split('\0').filter(Boolean)) {
      const [meta = '', path = ''] = entry.split('\t');
      files.set(path, meta.split(' ')[2] ?? '');
    }
    const texts = async (paths: readonly string[]) => {
      const wanted = paths.filter(p => files.has(p));
      const blobs = await this.git.cat(wanted.map(p => files.get(p)!));
      return new Map(wanted.map(p => [p, blobs.get(files.get(p)!) ?? '']));
    };
    const manifest = JSON.parse((await texts(['manifest.json'])).get('manifest.json') ?? 'null') as Manifest;
    return { manifest, files, texts, text: async p => (await texts([p])).get(p) ?? null };
  }

  async put(n: number, files: readonly FileIn[], parents: readonly number[], message: string): Promise<boolean> {
    const entries = new Map<string, string>();
    for (const f of files) entries.set(f.path, 'oid' in f ? f.oid : await this.git.blob(f.content));
    const tree = await this.git.mktree(entries);
    const seals = await this.git.refs(SEALS);
    const parentArgs = parents.flatMap(p => ['-p', seals.get(p) ?? fail(`没有父交接 #${p}`)]);
    const commit = await this.git.run([...IDENTITY, 'commit-tree', tree, ...parentArgs, '-m', message]);
    return this.git.cas(`${SEALS}${n}`, commit, null);
  }

  async claims(): Promise<Map<number, Claim>> {
    const refs = await this.git.refs(CLAIMS);
    const bodies = await this.git.cat([...refs.values()]);
    const claims = new Map<number, Claim>();
    for (const [n, oid] of refs) {
      const body = bodies.get(oid) ?? '';
      claims.set(n, JSON.parse(body.slice(body.indexOf('\n\n') + 2)) as Claim);
    }
    return claims;
  }

  async claim(n: number, claim: Claim, force: boolean): Promise<{ ok: boolean; previous: Claim | null }> {
    const empty = await this.git.run(['mktree'], { input: '' });
    const commit = await this.git.run([...IDENTITY, 'commit-tree', empty, '-m', JSON.stringify(claim)]);
    const ref = `${CLAIMS}${n}`;
    if (await this.git.cas(ref, commit, null)) return { ok: true, previous: null };
    const old = (await this.git.refs(CLAIMS)).get(n) ?? null;
    const previous = (await this.claims()).get(n) ?? null;
    if (force && old !== null && (await this.git.cas(ref, commit, old))) return { ok: true, previous };
    // Lost to a concurrent claimant: report the winner, not the claim we read before losing.
    return { ok: false, previous: (await this.claims()).get(n) ?? previous };
  }

  async keep(n: number, commit: string): Promise<string> {
    const ref = `${WIPS}${n}`;
    await this.git.run(['update-ref', ref, commit]);
    return ref;
  }

  async sync(remote: string): Promise<string> {
    // Seals are immutable, so a rejected seal ref means two machines minted the same number: surface it.
    const pushed = await this.git.raw(['push', remote, 'refs/handoff/*:refs/handoff/*']);
    const fetched = await this.git.raw(['fetch', remote, 'refs/handoff/*:refs/handoff/*']);
    return [pushed.err, fetched.err].map(s => s.trim()).filter(Boolean).join('\n') || '已同步';
  }
}

export class GitWorkspace implements Workspace {
  private readonly git: Git;
  readonly root: string;
  private readonly gitDir: string;

  private constructor(git: Git, root: string, gitDir: string) {
    this.git = git;
    this.root = root;
    this.gitDir = gitDir;
  }

  /** The worktree containing `cwd`, or null outside git. */
  static async open(cwd: string): Promise<GitWorkspace | null> {
    const probe = new Git(cwd);
    const out = await probe.raw(['rev-parse', '--show-toplevel', '--absolute-git-dir'], { ok: () => true });
    if (out.code !== 0) return null;
    const [top = '', dir = ''] = out.out.toString('utf8').trim().split('\n');
    const root = resolve(top);
    return new GitWorkspace(new Git(root), root, resolve(dir));
  }

  get repo(): Git {
    return this.git;
  }

  async head(): Promise<string | null> {
    const out = await this.git.raw(['rev-parse', '--verify', '-q', 'HEAD'], { ok: () => true });
    return out.code === 0 ? out.out.toString('utf8').trim() : null;
  }

  async branch(): Promise<string> {
    const out = await this.git.raw(['symbolic-ref', '--short', '-q', 'HEAD'], { ok: () => true });
    return out.code === 0 ? out.out.toString('utf8').trim() : 'HEAD';
  }

  /**
   * The whole worktree as a tree, built in a throwaway index so the real index and files stay untouched.
   * Starts from a copy of the real index, so only changed files are hashed.
   */
  async snapshot(): Promise<Snapshot> {
    const index = join(this.gitDir, `handoff-index-${process.pid}-${Date.now()}`);
    const real = join(this.gitDir, 'index');
    const env = { GIT_INDEX_FILE: index };
    const head = await this.head();
    try {
      if (existsSync(real)) copyFileSync(real, index);
      else if (head) await this.git.run(['read-tree', head], { env });
      await this.git.run(['add', '-u'], { env });
      const untracked = (await this.git.raw(['ls-files', '-o', '--exclude-standard', '-z'], { env })).out
        .toString('utf8')
        .split('\0')
        .filter(Boolean);
      // Nested repositories (`dir/`) and paths that vanished mid-scan stay out of the snapshot.
      const sized = untracked.filter(p => !p.endsWith('/')).flatMap(p => {
        const size = sizeOf(join(this.root, p));
        return size === null ? [] : [{ p, size }];
      });
      const big = sized.filter(f => f.size > LIMITS.snapshotBytes).map(f => f.p);
      const small = sized.filter(f => f.size <= LIMITS.snapshotBytes).map(f => f.p);
      if (small.length) {
        await this.git.run(['add', '--pathspec-from-file=-', '--pathspec-file-nul'], { env, input: small.join('\0') });
      }
      const tree = await this.git.run(['write-tree'], { env });
      const base = head ? await this.tree(head) : await this.git.run(['mktree'], { input: '' });
      if (tree === base) return { tree, commit: null, dirty: false, skipped: big };
      const parent = head ? ['-p', head] : [];
      const commit = await this.git.run([...IDENTITY, 'commit-tree', tree, ...parent, '-m', 'handoff: worktree snapshot']);
      return { tree, commit, dirty: true, skipped: big };
    } finally {
      rmSync(index, { force: true });
    }
  }

  async tree(commit: string): Promise<string> {
    return this.git.run(['rev-parse', `${commit}^{tree}`]);
  }

  async restore(commit: string): Promise<void> {
    await this.git.run(['restore', `--source=${commit}`, '--worktree', '--', ':/']);
  }

  async log(from: string | null, to: string, limit: number): Promise<{ commits: Commit[]; total: number }> {
    const known = from !== null && (await this.git.succeeds(['cat-file', '-e', `${from}^{commit}`]));
    const range = known ? `${from}..${to}` : to;
    const total = Number(await this.git.run(['rev-list', '--count', range]));
    const out = await this.git.run(['log', `-n${limit}`, '--format=%h%x1f%aI%x1f%s%x1f%b%x1e', range]);
    const commits = out
      .split('\x1e')
      .map(r => r.trim())
      .filter(Boolean)
      .map(r => {
        const [short = '', date = '', subject = '', body = ''] = r.split('\x1f');
        return { short, date, subject, body: body.trim() };
      });
    return { commits, total };
  }

  async diffStat(from: string, to: string): Promise<string> {
    return this.git.run(['diff', '--stat=100', from, to]);
  }

  async status(): Promise<string> {
    return this.git.run(['status', '--short']);
  }

  exists(path: string): boolean {
    return existsSync(isAbsolute(path) ? path : join(this.root, path));
  }

  async addWorktree(path: string, branch: string, at: string): Promise<void> {
    await this.git.run(['worktree', 'add', '-b', branch, path, at]);
  }
}

function sizeOf(path: string): number | null {
  try {
    return lstatSync(path).size;
  } catch {
    return null;
  }
}

function fail(message: string): never {
  throw new Error(message);
}
