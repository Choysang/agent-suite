// Text for humans and agents. Every word the CLI prints is composed here.

import type { SealView } from '../core/types.ts';
import { render as voice, stamp } from '../core/voice.ts';
import type { Loaded } from '../kernel/load.ts';
import type { Prepared } from '../kernel/prepare.ts';
import type { Sealed } from '../kernel/seal.ts';

const VOICE_PREVIEW = 30;

export function age(iso: string, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60000));
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  if (min < 48 * 60) return `${Math.round(min / 60)} 小时前`;
  return `${Math.round(min / 1440)} 天前`;
}

export function prepared(p: Prepared): string {
  const from = p.parents.length ? `父 ${p.parents.map(n => `#${n}`).join(' ')}` : '新链';
  const out = [
    `草稿已就绪：#${p.n}（${p.kind}，${from}）· ${p.dir}${sep()}draft`,
    `新增原话 ${p.fresh.length} 条${p.fresh.length ? `（v${p.n}.1–v${p.n}.${p.fresh.length}）` : ''}，全文 _voice.md；git 账本 _ledger.md`,
  ];
  if (p.kind === 'join') out.push(`待汇合：${p.lanes.map(v => `#${v.manifest.id} ${v.manifest.lane}`).join('、')}（详情 _lanes.md）`);
  out.push(
    '',
    '请完成（都在 draft 目录）：',
    '  brief.md  项目提示词 ≤120 行：持久要求、被否决方案引用原话 [vN.K]',
    '  state.md  动态状态 ≤200 行：front matter 必填 next / accept；决定标 [user|proven|agent|open]',
    '  fork.md   可选：要并行就按 _fork.example.md 写，每条 lane 一个子交接',
    p.kind === 'join' ? '  先合并各 lane 分支（git merge），再写汇合后的 state.md' : '',
    '然后运行：handoff seal',
  );
  if (p.fresh.length) out.push('', '## 新增原话', '', voice(p.fresh.slice(-VOICE_PREVIEW), 300));
  return out.filter(l => l !== '').join('\n').replace(/\n## /g, '\n\n## ');
}

export function sealed(s: Sealed): string {
  const m = s.manifest;
  const tree = m.repo.dirty ? '工作区未提交改动已快照' : '工作区干净';
  const out = [
    `已封存 #${m.id} · ${m.project.slug} · ${m.lane} · ${m.repo.head?.slice(0, 7) ?? '无提交'} · ${tree}`,
    `下一步：${m.next}`,
    `验收：${m.accept}`,
    `原话：+${s.fresh} 条（共 ${s.voice} 条，来源 ${m.source.voice}）`,
  ];
  if (m.repo.skipped.length) out.push(`未快照的大文件：${m.repo.skipped.join('、')}`);
  if (s.lanes.length) {
    out.push('', `已分叉为 ${s.lanes.length} 条 lane：`);
    for (const l of s.lanes) out.push(`  #${l.manifest.id} ${l.manifest.lane} → ${l.path}`, `      下一步：${l.manifest.next}`);
    out.push('', '每条 lane 在对应目录开一个 Agent 输入 /handoff <编号>；全部完成后：handoff join ' + m.id);
  } else {
    out.push('', `接手：任意 Agent 输入 /handoff ${m.id}（Codex：$handoff ${m.id}；跨目录：/handoff ${m.project.slug}-${m.id}；兜底：handoff load ${m.id}）`);
  }
  return out.join('\n');
}

export function loaded(l: Loaded): string {
  const m = l.manifest;
  const r = l.reconcile;
  const from = `${m.source.agent}${m.source.model ? `（${m.source.model}）` : ''}`;
  const head = r.head.same
    ? `一致（${m.repo.head?.slice(0, 7) ?? '无提交'}）`
    : `不一致：封存于 ${m.repo.head?.slice(0, 7) ?? '无提交'}，现在 ${r.head.actual?.slice(0, 7) ?? '无提交'}` +
      (r.head.ahead ? `，其后 ${r.head.ahead} 个提交：${r.head.since.join('；')}` : '');
  const tree = {
    same: '与封存一致',
    restored: '已从封存快照恢复未提交改动',
    differs: '与封存不同（未改动，差异见下）',
    unknown: '无法比对（快照不在本机，可 handoff sync）',
  }[r.worktree];
  const out = [
    `# 交接 #${m.id} · ${m.project.slug} · ${m.kind} · 来自 ${from} · ${stamp(m.created)}`,
    '',
    '## 现场报告',
    `- 仓库：${m.project.root}`,
    `- HEAD：${head}`,
    `- 工作区：${tree}`,
    ...(r.diff ? ['```', r.diff, '```'] : []),
    `- 下一步涉及的路径：${r.missing.length ? `缺失 ${r.missing.map(p => `\`${p}\``).join(' ')}` : '无缺失'}`,
    `- 认领：${l.previous ? `接替 ${l.previous.agent}（${l.previous.at}）` : '已认领'}`,
    '',
    '## 第一步',
    `${m.next}`,
    `验收：${m.accept}`,
  ];
  if (l.lane) out.push('', '## 本 lane 任务', '', l.lane.trim(), m.owns.length ? `\n只改这些路径：${m.owns.join(', ')}` : '');
  out.push('', '## Brief', '', demote(l.brief), '', '## State', '', demote(l.state));
  if (l.recent.length) out.push('', `## 最近原话（共 ${l.voice} 条，全部：handoff show ${m.id} voice）`, '', voice(l.recent, 500));
  out.push(
    '',
    '## 接手规则',
    '冲突时以高者为准：仓库文件、测试、git > 用户原话 > brief/state > 你的记忆。现场报告是信息不是关卡：核对后直接执行第一步。',
  );
  return out.join('\n');
}

export function table(views: readonly SealView[], now: Date): string {
  if (!views.length) return '还没有交接。在 Agent 中输入 /handoff 封存当前会话。';
  const label = { open: '待接手', claimed: '进行中', done: '已接续' } as const;
  return views
    .map(v => {
      const m = v.manifest;
      const who = v.status === 'claimed' && v.claim ? ` · ${v.claim.agent} 认领` : '';
      return `#${m.id}  ${label[v.status]}${who}  ${m.kind}  ${m.lane}  ${age(m.created, now)}  ${m.source.agent}\n     下一步：${m.next}`;
    })
    .join('\n');
}

/** The session-start card: a few lines, routing only, never content. */
export function card(views: readonly SealView[], here: number | null, goal: string | null, now: Date): string {
  const live = views.filter(v => v.status !== 'done');
  if (!live.length) return '';
  const first = [...live].sort((a, b) => Number(b.manifest.id === here) - Number(a.manifest.id === here) || b.manifest.id - a.manifest.id);
  const lines = [`[handoff] 本仓库有 ${live.length} 个未接续的交接${goal ? `；目标：${goal}` : ''}`];
  for (const v of first.slice(0, 3)) {
    const m = v.manifest;
    const state = v.status === 'open' ? '待接手' : `进行中（${v.claim?.agent ?? '?'}）`;
    lines.push(`- #${m.id}${m.id === here ? '（本工作区）' : ''} ${state} · ${m.lane} · ${age(m.created, now)} · 下一步：${m.next}`);
  }
  lines.push(`接手：/handoff <编号>（Codex：$handoff <编号>）；全部：handoff ls`);
  return lines.join('\n');
}

/** Bundle files use `#` headings; nest them under the report's `##` sections. */
function demote(md: string): string {
  return md.replace(/^(#+) /gm, '$1## ').trim();
}

function sep(): string {
  return process.platform === 'win32' ? '\\' : '/';
}
