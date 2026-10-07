// ~/.handoff/projects.json: slug -> repository root, so `/handoff myapp-7` resolves from anywhere.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import type { Registry } from '../ports.ts';

export class FileRegistry implements Registry {
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  root(slug: string): string | null {
    return this.load()[slug] ?? null;
  }

  slug(root: string): string {
    const all = this.load();
    const mine = Object.entries(all).find(([, r]) => same(r, root));
    if (mine) return mine[0];
    const base = basename(root).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'repo';
    let slug = base;
    for (let i = 2; all[slug]; i++) slug = `${base}-${i}`;
    this.save({ ...all, [slug]: resolve(root) });
    return slug;
  }

  private load(): Record<string, string> {
    return existsSync(this.file) ? (JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, string>) : {};
  }

  private save(all: Record<string, string>): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(all, null, 2) + '\n');
  }
}

export function same(a: string, b: string): boolean {
  const norm = (p: string) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));
  return norm(a) === norm(b);
}
