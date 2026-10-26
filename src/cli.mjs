#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { paths, version, loadConfig, pythonCommand } from './runtime.mjs';
import { install } from './install.mjs';
import { doctor } from './doctor.mjs';

const help = `agent-suite — local agent tooling

  version [--json]                  Show implementation versions and source revision
  doctor [--json]                   Check runtimes, vault, and installed skill targets
  config [--json]                   Show the configured vault and installation paths
  install --vault <path>            Link an existing vault and agent skills to this source
    [--agents codex,claude,workbuddy,codebuddy] [--python <executable>]
    [--guidelines] [--dry-run]
  kb <args...>                      Run knowledge CLI with the configured vault
  handoff <args...>                 Run handoff CLI in the current working directory

Node.js 24+, Python 3.11+ with PyYAML, Git. Configuration: ~/.agent-suite/config.json
Independent module commands and Markdown data remain supported.\n`;

function forward(command, args) {
  const child = spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
  if (child.error) throw child.error;
  return child.status ?? 1;
}

function main(args) {
  const p = paths();
  const [command, ...rest] = args;
  if (!command || ['help', '--help', '-h'].includes(command)) { console.log(help); return 0; }
  if (command === 'kb') {
    const config = loadConfig(p);
    const explicitVault = rest.some(arg => arg === '--vault' || arg.startsWith('--vault='));
    if (!config && !explicitVault && !rest.includes('--help')) throw new Error('Configure a vault with install, or supply kb --vault <path>.');
    return forward(pythonCommand(config), [join(p.root, 'knowledge/.agents/skills/kb/scripts/kb.py'), ...(!explicitVault && config ? ['--vault', config.vault] : []), ...rest]);
  }
  if (command === 'handoff') return forward(process.execPath, [join(p.root, 'handoff/src/faces/cli.ts'), ...rest]);
  const { values } = parseArgs({ args: rest, options: {
    json: { type: 'boolean' }, vault: { type: 'string' }, agents: { type: 'string' }, python: { type: 'string' },
    guidelines: { type: 'boolean' }, 'dry-run': { type: 'boolean' },
  }, strict: true, allowPositionals: false });
  if (command === 'version' || command === '--version') {
    const result = version(p);
    console.log(values.json ? JSON.stringify(result, null, 2) : `agent-suite ${result.suite}\nhandoff ${result.handoff}\nsource ${result.revision || 'archive'}${result.modified ? ' (modified)' : ''}\n${result.sourceRoot}`);
    return 0;
  }
  if (command === 'install') {
    const result = install(p, { vault: values.vault, agents: values.agents?.split(',').map(value => value.trim()), python: values.python, guidelines: values.guidelines, dryRun: values['dry-run'] });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (command === 'config') {
    const config = loadConfig(p);
    if (!config) throw new Error('Configure a vault with agent-suite install --vault <path>.');
    const { schemaVersion, vault, agents, python, sourceRoot, guidelines = false } = config;
    const result = { schemaVersion, vault, agents, python, sourceRoot, guidelines };
    console.log(values.json ? JSON.stringify(result, null, 2) : `vault ${vault}\nsource ${sourceRoot}\nagents ${agents.join(',')}\nguidelines ${guidelines}`);
    return 0;
  }
  if (command === 'doctor') {
    const result = doctor(p);
    console.log(values.json ? JSON.stringify(result, null, 2) : `${result.checks.map(check => `${check.status === 'ok' ? 'OK' : 'ERROR'} ${check.id}: ${check.observed}${check.action ? `\n  ${check.action}` : ''}`).join('\n')}\n${result.hostRuntime}`);
    return result.ok ? 0 : 1;
  }
  throw new Error(`Unknown command: ${command}. Run agent-suite --help.`);
}

try { process.exitCode = main(process.argv.slice(2)); }
catch (error) { console.error(`agent-suite: ${error.message}`); process.exitCode = 1; }
