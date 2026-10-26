import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { SOURCE_ROOT } from '../src/runtime.mjs';

const checks = [
  [process.execPath, ['--test', 'test/*.test.mjs'], SOURCE_ROOT],
  [process.env.AGENT_SUITE_PYTHON || 'python', ['-m', 'pytest', 'knowledge/.agents/skills/kb/scripts', '-q'], SOURCE_ROOT],
  [process.env.AGENT_SUITE_PYTHON || 'python', ['knowledge/.agents/skills/kb/scripts/kb.py', '--vault', 'knowledge', 'lint', 'Templates'], SOURCE_ROOT],
  [process.execPath, ['--test', 'test/*.test.ts'], join(SOURCE_ROOT, 'handoff')],
  [process.execPath, ['node_modules/typescript/bin/tsc'], join(SOURCE_ROOT, 'handoff')],
];
for (const [command, args, cwd] of checks) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const child = spawnSync(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  if (child.error) throw child.error;
  if (child.status !== 0) process.exit(child.status ?? 1);
}
for (const directory of ['guidelines/codex', 'guidelines/claude', 'guidelines/universal']) {
  for (const file of readdirSync(join(SOURCE_ROOT, directory))) {
    const text = readFileSync(join(SOURCE_ROOT, directory, file), 'utf8');
    if (/D:[/\\]zuomian|C:[/\\]Users[/\\]华为/.test(text)) throw new Error(`Machine-specific path in ${directory}/${file}`);
  }
}
console.log('\nAll verification checks passed.');
