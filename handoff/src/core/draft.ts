// Draft: what the sending agent writes. Parsed and checked here so every seal honours the protocol.

import { citations } from './voice.ts';
import { LIMITS, type LaneTask } from './types.ts';

export interface Draft {
  readonly brief: string;
  readonly state: string;
  /** Present when the agent splits the work into parallel lanes. */
  readonly fork: string | null;
  /** The agent's verbatim recollection of user messages, used only when no transcript exists. */
  readonly recalled: string | null;
}

export const BRIEF_HEADINGS = ['目标', '范围', '最终验收标准', '用户的持久要求', '被否决的方案', '架构与约定'] as const;
export const STATE_HEADINGS = ['进度', '决定', '下一步', '未决问题', '现场'] as const;
export const DECISION_TAGS = ['user', 'proven', 'agent', 'open'] as const;

/** Any `## lane:` line opens a lane; a malformed name is reported, never merged into the previous lane. */
const LANE = /^## lane:\s*(.*?)\s*$/;
const LANE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Template comments guide the writer; receivers never see them. */
export function clean(md: string): string {
  return md.replace(/<!--[\s\S]*?-->/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** `next` and `accept` live in state.md's front matter. */
export function front(state: string): { next: string; accept: string; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(state);
  const fields = new Map<string, string>();
  for (const line of (m?.[1] ?? '').split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) fields.set(kv[1]!, kv[2]!.trim());
  }
  return { next: fields.get('next') ?? '', accept: fields.get('accept') ?? '', body: m ? state.slice(m[0].length) : state };
}

/** Level-1 sections of a markdown text, keyed by heading. */
export function sections(md: string): Map<string, string> {
  const out = new Map<string, string>();
  let heading: string | null = null;
  let body: string[] = [];
  let fenced = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const h = fenced ? null : /^#\s+(.+?)\s*$/.exec(line);
    if (h) {
      if (heading !== null) out.set(heading, body.join('\n').trim());
      heading = h[1]!;
      body = [];
    } else body.push(line);
  }
  if (heading !== null) out.set(heading, body.join('\n').trim());
  return out;
}

/** The first line of `# 目标`; shown in session-start cards. */
export function goal(brief: string): string | null {
  const text = section(sections(brief), '目标');
  return text?.split('\n').find(l => l.trim())?.replace(/^[-*]\s*/, '').trim() ?? null;
}

export function lanes(fork: string): LaneTask[] {
  const out: LaneTask[] = [];
  let current: { name: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const field = (k: string) => current!.lines.map(l => new RegExp(`^${k}:\\s*(.*)$`).exec(l)?.[1]?.trim()).find(Boolean) ?? '';
    const owns = field('owns').split(',').map(s => s.trim()).filter(Boolean);
    out.push({ name: current.name, next: field('next'), accept: field('accept'), owns, text: current.lines.join('\n').trim() + '\n' });
  };
  for (const line of clean(fork).split('\n')) {
    const m = LANE.exec(line);
    if (m) {
      flush();
      current = { name: m[1]!, lines: [line] };
    } else current?.lines.push(line);
  }
  flush();
  return out;
}

/** Every protocol violation in a draft; empty means sealable. `voice` holds all citable ids. */
export function validate(draft: Draft, voice: ReadonlySet<string>): string[] {
  const brief = clean(draft.brief);
  const { next, accept, body } = front(draft.state);
  const state = clean(body);
  const errors: string[] = [];

  const lines = (s: string) => s.trimEnd().split('\n').length;
  if (lines(brief) > LIMITS.briefLines) errors.push(`brief.md ${lines(brief)} 行，上限 ${LIMITS.briefLines}`);
  if (lines(state) > LIMITS.stateLines) errors.push(`state.md ${lines(state)} 行，上限 ${LIMITS.stateLines}`);
  errors.push(...missing('brief.md', brief, BRIEF_HEADINGS), ...missing('state.md', state, STATE_HEADINGS));
  if (!next) errors.push('state.md front matter 缺 next（第一步，可立即执行）');
  if (!accept) errors.push('state.md front matter 缺 accept（第一步的验收）');

  for (const line of (section(sections(state), '决定') ?? '').split('\n')) {
    const item = /^\s*-\s+(.*)$/.exec(line)?.[1];
    if (item === undefined) continue;
    const tag = /^\[(\w+)\]/.exec(item)?.[1];
    if (!tag || !(DECISION_TAGS as readonly string[]).includes(tag)) {
      errors.push(`决定缺标签 [${DECISION_TAGS.join('|')}]：${item}`);
    } else if (tag === 'user' && citations(item).length === 0) {
      errors.push(`[user] 决定必须引用原话 [vN.K]：${item}`);
    }
  }

  const cited = new Set([...citations(brief), ...citations(state), ...citations(draft.fork ?? '')]);
  for (const id of cited) if (!voice.has(id)) errors.push(`引用了不存在的原话 ${id}`);

  if (draft.fork !== null && draft.fork.trim()) errors.push(...checkLanes(lanes(draft.fork)));
  return errors;
}

function checkLanes(list: readonly LaneTask[]): string[] {
  if (list.length === 0) return ['fork.md 没有 lane（格式：## lane: 名称）'];
  const errors: string[] = [];
  const names = new Set<string>();
  for (const lane of list) {
    if (!LANE_NAME.test(lane.name)) errors.push(`lane 名只能用小写字母、数字、连字符：${lane.name}`);
    if (names.has(lane.name)) errors.push(`lane 重名：${lane.name}`);
    names.add(lane.name);
    if (!lane.next) errors.push(`lane ${lane.name} 缺 next:`);
    if (!lane.accept) errors.push(`lane ${lane.name} 缺 accept:`);
  }
  return errors;
}

function missing(file: string, md: string, required: readonly string[]): string[] {
  const present = [...sections(md).keys()];
  return required.filter(h => !present.some(p => p.startsWith(h))).map(h => `${file} 缺少章节「# ${h}」`);
}

/** Headings may carry a suffix, e.g. `# 范围（做 / 不做）`. */
function section(all: Map<string, string>, name: string): string | undefined {
  for (const [heading, body] of all) if (heading.startsWith(name)) return body;
  return undefined;
}
