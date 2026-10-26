import { lstatSync, realpathSync, readlinkSync, existsSync, mkdirSync, renameSync, symlinkSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, basename, join, resolve, relative, isAbsolute } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { SKILLS, AGENTS, profile, atomicWrite, loadConfig, inspectCommand, pythonCommand } from './runtime.mjs';

const START = '<!-- agent-suite:start -->';
const END = '<!-- agent-suite:end -->';
export const digest = text => createHash('sha256').update(text).digest('hex');

function stat(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export function sameTarget(destination, source) {
  try { return realpathSync(destination) === realpathSync(source); } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return false;
    throw error;
  }
}

function resolvedPath(path, visited = new Set()) {
  if (visited.has(path)) throw new Error(`Cyclic installation path: ${path}`);
  visited.add(path);
  try { return realpathSync(path); } catch (error) {
    if (error.code !== 'ENOENT' || dirname(path) === path) throw error;
    if (stat(path)?.isSymbolicLink()) {
      return resolvedPath(resolve(dirname(path), readlinkSync(path)), visited);
    }
    return join(resolvedPath(dirname(path), visited), basename(path));
  }
}

function destinationKey(path) {
  // Resolve the parent, never the leaf link that the installer will replace.
  const physical = join(resolvedPath(dirname(path)), basename(path));
  return process.platform === 'win32' ? physical.toLowerCase() : physical;
}

export function guidelineContent(existing, template, vault) {
  const rendered = template.replaceAll('<vault>', vault.replaceAll('\\', '/')).trim();
  const block = `${START}\n${rendered}\n${END}`;
  const start = existing.indexOf(START), end = existing.indexOf(END);
  if ((start < 0) !== (end < 0) || (start >= 0 && end < start)
      || (start >= 0 && existing.indexOf(START, start + START.length) >= 0)
      || (end >= 0 && existing.indexOf(END, end + END.length) >= 0)) {
    throw new Error('Malformed agent-suite guideline markers; repair the marked block before installing.');
  }
  if (start >= 0) return `${existing.slice(0, start)}${block}${existing.slice(end + END.length)}`;
  if (existing.trim() === rendered) return `${block}\n`;
  return `${existing.trimEnd()}${existing.trim() ? '\n\n' : ''}${block}\n`;
}

export function installationPlan(p, options) {
  const previous = loadConfig(p);
  const vault = resolve(options.vault || previous?.vault || '.');
  if (!options.vault && !previous?.vault) throw new Error('Supply --vault <path> for the first installation.');
  if (!existsSync(join(vault, '30.Wiki/taxonomy.yml'))) throw new Error(`Not an initialized knowledge vault: ${vault}. Follow knowledge/BOOTSTRAP.md first.`);
  const agents = [...new Set(options.agents || previous?.agents || ['codex'])];
  if (!agents.length || agents.some(agent => !AGENTS.includes(agent))) throw new Error(`--agents must be a comma-separated subset of ${AGENTS.join(',')}`);
  const python = options.python || pythonCommand(previous);
  const guidelines = options.guidelines ?? previous?.guidelines ?? false;
  const check = inspectCommand(python, ['-c', 'import sys, yaml; assert sys.version_info >= (3, 11); print(sys.version.split()[0])']);
  if (!check.ok) throw new Error(`Python 3.11+ with PyYAML is required (${python}): ${check.output}`);
  const actions = [];
  for (const skill of SKILLS) actions.push({ type: 'link', path: join(vault, '.agents/skills', skill), source: join(p.root, 'knowledge/.agents/skills', skill) });
  for (const agent of agents) {
    const host = profile(p, agent);
    for (const skill of SKILLS) actions.push({ type: 'link', path: join(host.skills, skill), source: join(vault, '.agents/skills', skill) });
    actions.push({ type: 'link', path: host.handoff, source: join(p.root, 'handoff/skill') });
    if (guidelines && host.guideline) {
      const existing = existsSync(host.guideline) ? readFileSync(host.guideline, 'utf8') : '';
      const content = guidelineContent(existing, readFileSync(join(p.root, host.template), 'utf8'), vault);
      actions.push({ type: 'guideline', path: host.guideline, content, changed: content !== existing });
    }
  }
  for (const action of actions.filter(action => action.type === 'link')) {
    const plannedSource = actions.find(other => other.type === 'link' && other.path === action.source)?.source;
    if (!existsSync(action.source) && !plannedSource) throw new Error(`Missing installation source: ${action.source}`);
    // Never relocate an ancestor of the code being installed, including through a junction.
    if (existsSync(action.path)) {
      const from = realpathSync(action.path);
      const to = realpathSync(plannedSource || action.source);
      const rel = relative(from, to);
      if (rel && rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel)) {
        throw new Error(`Installation destination contains its source: ${action.path}`);
      }
    }
    action.changed = !sameTarget(action.path, plannedSource || action.source);
  }
  const unique = new Map();
  const finalSource = action => {
    const visited = new Set([action.path]);
    let source = action.source;
    for (;;) {
      if (visited.has(source)) throw new Error(`Cyclic installation source: ${action.path}`);
      visited.add(source);
      const next = actions.find(other => other.type === 'link' && other.path === source);
      if (!next) return realpathSync(source);
      source = next.source;
    }
  };
  for (const action of actions) {
    const key = destinationKey(action.path);
    const previousAction = unique.get(key);
    if (!previousAction) unique.set(key, action);
    else if (previousAction.type !== action.type || (action.type === 'link'
      ? finalSource(previousAction) !== finalSource(action)
      : previousAction.content !== action.content)) {
      throw new Error(`Conflicting installation destinations: ${previousAction.path} and ${action.path}`);
    }
  }
  return { schemaVersion: 1, vault, agents, python, guidelines, sourceRoot: p.root, actions: [...unique.values()] };
}

export function install(p, options = {}) {
  const plan = installationPlan(p, options);
  if (options.dryRun) return { ...plan, dryRun: true, actions: plan.actions.map(({ content, ...action }) => action) };
  const transaction = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
  const undo = [];
  const backups = [];
  try {
    for (const [index, action] of plan.actions.entries()) {
      if (!action.changed) continue;
      const old = stat(action.path);
      if (old) {
        const parent = dirname(action.path);
        const physicalParent = realpathSync(parent);
        // Both direct overrides and directory links can cross volumes. Back up
        // on the destination filesystem, outside the scanned skills directory.
        const backupHome = join(action.type === 'link' ? dirname(physicalParent) : physicalParent, '.agent-suite');
        const backup = join(backupHome, 'backups', transaction, `${index}-${action.type}`);
        mkdirSync(dirname(backup), { recursive: true });
        renameSync(action.path, backup);
        backups.push({ path: action.path, backup });
        undo.push(() => renameSync(backup, action.path));
      }
      mkdirSync(dirname(action.path), { recursive: true });
      if (action.type === 'link') symlinkSync(action.source, action.path, process.platform === 'win32' ? 'junction' : 'dir');
      else atomicWrite(action.path, action.content);
      undo.push(() => unlinkSync(action.path));
    }
    const config = { schemaVersion: 1, vault: plan.vault, agents: plan.agents, python: plan.python, guidelines: plan.guidelines, sourceRoot: p.root };
    // Config is the commit point: all links and optional guidelines exist first.
    atomicWrite(p.config, `${JSON.stringify(config, null, 2)}\n`);
    return { ...config, changed: plan.actions.filter(action => action.changed).length, backups, guidelineFiles: plan.actions.filter(action => action.type === 'guideline').map(action => ({ path: action.path, sha256: digest(action.content) })) };
  } catch (error) {
    const failures = [];
    for (const rollback of undo.reverse()) { try { rollback(); } catch (failure) { failures.push(failure.message); } }
    if (failures.length) throw new AggregateError([error, ...failures.map(message => new Error(message))], `Installation failed; rollback incomplete: ${error.message}; ${failures.join('; ')}`);
    throw error;
  }
}
