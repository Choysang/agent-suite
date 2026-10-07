import { readFileSync, writeFileSync } from 'node:fs';
const edit = (p, pairs) => { let s = readFileSync(p, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(p + ' missing: ' + a.slice(0, 70)); s = s.replace(a, b); } writeFileSync(p, s); };
edit('src/kernel/load.ts', [[
`  const previous = alreadyClaimed ? null : (await ctx.store.claim(id, claimant(ctx, null, null), true)).previous;`,
`  const claimed = alreadyClaimed ? { ok: true, previous: null } : await ctx.store.claim(id, claimant(ctx, null, null), true);
  if (!claimed.ok) throw new Error(\`#\${id} 刚被 \${claimed.previous?.agent ?? '另一个会话'} 认领（\${claimed.previous?.at ?? ''}）；确实要接手就重试\`);
  const previous = claimed.previous;`]]);
edit('src/adapters/git.ts', [[
`    const old = (await this.git.refs(CLAIMS)).get(n) ?? null;
    const previous = (await this.claims()).get(n) ?? null;
    return { ok: force && old !== null && (await this.git.cas(ref, commit, old)), previous };`,
`    const old = (await this.git.refs(CLAIMS)).get(n) ?? null;
    const previous = (await this.claims()).get(n) ?? null;
    if (force && old !== null && (await this.git.cas(ref, commit, old))) return { ok: true, previous };
    // Lost to a concurrent claimant: report the winner, not the claim we read before losing.
    return { ok: false, previous: (await this.claims()).get(n) ?? previous };`]]);
edit('src/faces/cli.ts', [
[`function agentHint(): string | null {
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE_ENTRYPOINT) return 'claude-code';
  if (Object.keys(process.env).some(k => k.startsWith('CODEX_'))) return 'codex';
  return null;
}`,
`/** Codex first: an agent launched from inside Claude Code inherits Claude's variables, never the reverse here. */
function agentHint(): string | null {
  if (Object.keys(process.env).some(k => k.startsWith('CODEX_'))) return 'codex';
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE_ENTRYPOINT) return 'claude-code';
  return null;
}`],
[`  const { values, positionals } = parseArgs({
    args: argv,`,
`  const { values, positionals } = parseArgs({
    args: withoutEmptySession(argv),`],
[`/** In Codex the skill's \`\${CLAUDE_SESSION_ID}\` stays unexpanded; treat that as no hint. */`,
`/** Hosts that do not expand \`\${CLAUDE_SESSION_ID}\` may pass \`--session\` with nothing after it. */
function withoutEmptySession(argv: string[]): string[] {
  return argv.flatMap((a, i) => (a === '--session' && (argv[i + 1] === undefined || argv[i + 1]!.startsWith('-')) ? [] : [a]));
}

/** In Codex the skill's \`\${CLAUDE_SESSION_ID}\` stays unexpanded; treat that as no hint. */`],
]);
edit('src/faces/render.ts', [[
`  const lines = [\`[handoff] 本仓库有 \${live.length} 个未接续的交接\${goal ? \`；目标：\${goal}\` : ''}\`];`,
`  const brief = goal?.replace(/\[v\d+\.\d+\]/g, '').trim();
  const shown = brief && brief.length > 60 ? \`\${brief.slice(0, 60)}…\` : brief;
  const lines = [\`[handoff] 本仓库有 \${live.length} 个未接续的交接\${shown ? \`；目标：\${shown}\` : ''}\`];`],
[`  return out.filter(l => l !== '').join('\n').replace(/\n## /g, '\n\n## ');`,
`  return out.filter(l => l !== '').join('\n').replace(/\n## (.*)\n/g, '\n\n## $1\n\n');`]]);
console.log('ok');
