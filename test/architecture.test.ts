// The layering is a contract, enforced so parallel agents cannot erode it:
//   core     pure domain        imports only core
//   kernel   use cases          imports core, ports, kernel; no IO modules
//   adapters infrastructure     imports core, ports, adapters
//   faces    presentation       anything but adapters (wiring goes through wire.ts)

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const SRC = join(import.meta.dirname, '..', 'src');
const IO = /^node:(fs|fs\/promises|child_process|os|readline|net|http|https)$/;

const RULES: Record<string, (target: string) => boolean> = {
  core: t => t.startsWith('core/'),
  kernel: t => /^(core|kernel)\//.test(t) || t === 'ports.ts' || (t.startsWith('node:') && !IO.test(t)),
  adapters: t => /^(core|adapters)\//.test(t) || t === 'ports.ts' || t.startsWith('node:'),
  faces: t => !t.startsWith('adapters/'),
};

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
}

test('every import respects its layer', () => {
  const violations: string[] = [];
  for (const file of files(SRC).filter(f => f.endsWith('.ts'))) {
    const from = relative(SRC, file).replaceAll('\\', '/');
    const layer = from.split('/')[0]!;
    const allowed = RULES[layer];
    if (!allowed) continue;
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
      const target = spec!.startsWith('.') ? relative(SRC, join(file, '..', spec!)).replaceAll('\\', '/') : spec!;
      if (!allowed(target)) violations.push(`${from} → ${target}`);
    }
  }
  assert.deepEqual(violations, []);
});
