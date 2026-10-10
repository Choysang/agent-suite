// `.handoff/` in a worktree: the draft the agent edits, and HEAD (the seal this worktree is on).
// A `.gitignore` holding `*` makes the directory ignore itself, so git never sees it.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Desk } from '../ports.ts';

export class FsDesk implements Desk {
  readonly dir: string;

  constructor(root: string) {
    this.dir = join(root, '.handoff');
  }

  head(): number | null {
    const path = join(this.dir, 'HEAD');
    if (!existsSync(path)) return null;
    const n = Number(readFileSync(path, 'utf8').trim());
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  setHead(n: number): void {
    this.ensure();
    writeFileSync(join(this.dir, 'HEAD'), `${n}\n`);
  }

  read(name: string): string | null {
    const path = join(this.dir, 'draft', name);
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  }

  write(name: string, content: string): void {
    this.ensure();
    writeFileSync(join(this.dir, 'draft', name), content);
  }

  clear(): void {
    rmSync(join(this.dir, 'draft'), { recursive: true, force: true });
  }

  private ensure(): void {
    mkdirSync(join(this.dir, 'draft'), { recursive: true });
    const ignore = join(this.dir, '.gitignore');
    if (!existsSync(ignore)) writeFileSync(ignore, '*\n');
  }
}
