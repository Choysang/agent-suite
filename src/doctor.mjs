import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SKILLS, profile, loadConfig, pythonCommand, inspectCommand, version } from './runtime.mjs';
import { sameTarget, guidelineContent } from './install.mjs';

export function doctor(p) {
  const checks = [];
  const add = (id, ok, observed, action) => checks.push({ id, status: ok ? 'ok' : 'error', observed, ...(ok ? {} : { action }) });
  const config = loadConfig(p);
  add('node', Number(process.versions.node.split('.')[0]) >= 24, process.version, 'Install Node.js 24 or newer.');
  for (const [id, command, args, action] of [
    ['git', 'git', ['--version'], 'Install Git and add it to PATH.'],
    ['python', pythonCommand(config), ['-c', 'import sys, yaml; assert sys.version_info >= (3, 11); print(sys.version.split()[0] + "; PyYAML " + yaml.__version__)'], 'Install Python 3.11+ and PyYAML, then configure --python.'],
  ]) {
    const check = inspectCommand(command, args);
    add(id, check.ok, check.output, action);
  }
  add('configuration', Boolean(config), p.config, 'Run agent-suite install --vault <path>.');
  if (config) {
    add('source', resolve(config.sourceRoot) === resolve(p.root), p.root, 'Run install again from this checkout to update its links.');
    for (const file of ['30.Wiki/taxonomy.yml', 'ROUTER.md']) add(`vault:${file}`, existsSync(join(config.vault, file)), join(config.vault, file), 'Initialize the vault and run agent-suite kb build.');
    for (const skill of SKILLS) {
      const destination = join(config.vault, '.agents/skills', skill);
      add(`vault-skill:${skill}`, sameTarget(destination, join(p.root, 'knowledge/.agents/skills', skill)), destination, 'Run agent-suite install to repair the skill link.');
    }
    for (const agent of config.agents) {
      const host = profile(p, agent);
      for (const skill of SKILLS) add(`${agent}:${skill}`, sameTarget(join(host.skills, skill), join(p.root, 'knowledge/.agents/skills', skill)), join(host.skills, skill), 'Run agent-suite install to repair the skill link.');
      add(`${agent}:handoff`, sameTarget(host.handoff, join(p.root, 'handoff/skill')), host.handoff, 'Run agent-suite install to repair the handoff link.');
      if (config.guidelines && host.guideline) {
        try {
          const existing = existsSync(host.guideline) ? readFileSync(host.guideline, 'utf8') : '';
          const expected = guidelineContent(existing, readFileSync(join(p.root, host.template), 'utf8'), config.vault);
          add(`${agent}:guidelines`, existing === expected, host.guideline, 'Run agent-suite install to refresh the managed guideline block.');
        } catch (error) {
          add(`${agent}:guidelines`, false, `${host.guideline}: ${error.message}`, 'Repair the guideline markers or file access, then run agent-suite install.');
        }
      }
    }
  }
  return { ok: checks.every(check => check.status === 'ok'), version: version(p), checks, hostRuntime: 'Skill links are checked on disk. Host loading and hook execution are not asserted.' };
}
