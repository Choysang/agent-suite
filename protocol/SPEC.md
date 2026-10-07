# handoff 协议 v1（规范）

本文件与 `templates/`、`fixtures/` 一起构成协议。任何语言的实现，只要满足本文并通过夹具，即与本实现互通。

## 1. 引用

| 引用 | 指向 | 写入方式 |
|---|---|---|
| `refs/handoff/seal/<n>` | bundle commit；父提交为各父交接的 seal commit | `update-ref --stdin` 的 `create`，已存在则失败，改用 n+1 |
| `refs/handoff/wip/<n>` | 工作区快照 commit（父提交为封存时的 HEAD） | 仅当工作区与 HEAD 不同 |
| `refs/handoff/claim/<n>` | 空 tree 的 commit，提交信息为 Claim JSON | `create`；接管用 `update <new> <old>` |

`n` 为正整数，取当前最大编号 + 1。seal、claim 的 commit 身份固定为 `handoff <handoff@localhost>`。

## 2. Bundle tree

| 路径 | 必有 | 内容 |
|---|---|---|
| `manifest.json` | 是 | 见 §3 |
| `brief.md` | 是 | 项目提示词，≤120 行，必含章节：目标、范围、最终验收标准、用户的持久要求、被否决的方案、架构与约定 |
| `state.md` | 是 | front matter `next`、`accept`；正文 ≤200 行，必含章节：进度、决定、下一步、未决问题、现场 |
| `voice/<m>.jsonl` | 否 | 交接 m 新收入的原话；承继全部祖先的文件 |
| `ledger/<m>.md` | 是（本交接） | 交接 m 的 git 账本；承继全部祖先的文件 |
| `lane.md` | 否 | fork 子交接的 lane 任务；同 lane 内接力时承继 |

承继的文件必须与祖先 bundle 中的 blob 完全相同。HTML 注释在封存时删除。

## 3. manifest.json

```json
{
  "protocol": 1,
  "id": 7,
  "kind": "relay | fork | join",
  "parents": [6],
  "project": { "slug": "myapp", "root": "D:\\work\\myapp" },
  "repo": { "branch": "main", "head": "<oid>|null", "dirty": true, "wip": "refs/handoff/wip/7|null", "skipped": [] },
  "source": { "agent": "claude-code", "model": "claude-opus-5-5", "session": "<id>", "voice": "native | recalled | none" },
  "lane": "main",
  "created": "2026-10-07T16:40:00+08:00",
  "next": "第一步",
  "accept": "第一步的验收",
  "owns": []
}
```

## 4. 原话

每行一个 JSON：`{"id":"v7.3","ts":"<ISO>","agent":"codex","session":"<id>","key":"<agent>:<session>:<消息>","text":"<逐字>"}`。

- `id` = `v<收入它的交接号>.<序号>`，序号从 1 起按 `ts`、`key` 排序。
- `key` 去重：已出现在任一祖先 voice 文件中的 key 不再收入。
- 收入范围：当前会话的全部用户消息，加上 cwd 在本工作区内的会话中、晚于最早父交接 `created` 的用户消息（无父交接时，晚于当前会话第一条消息）。
- 用户消息的判定见 `fixtures/*.jsonl` 与 `*.expect.json`。

## 5. 决定标签

`state.md` 的「决定」章节中每个列表项以标签开头：

| 标签 | 含义 | 要求 | 经验库证据级别 |
|---|---|---|---|
| `[user]` | 用户拍板 | 至少引用一条原话 `[vN.K]` | 拍板 |
| `[proven]` | 被测试或运行证明 | 写明证据 | 实测 |
| `[agent]` | Agent 判断，未验证 | 写明理由 | 推断 |
| `[open]` | 待决 | 列出选项 | — |

brief、state、fork 中引用的每个 `vN.K` 都必须存在。

## 6. 分叉

草稿含 `fork.md` 即分叉。格式：`## lane: <名称>` 起一节，节内 `next:`、`accept:`、`owns:`（逗号分隔）各一行，其余为任务说明。名称 `[a-z0-9][a-z0-9-]*`。工作区必须干净。每条 lane：子交接（kind fork，lane `lane/<n>-<名称>`）、同名分支、兄弟 worktree `<仓库目录>@<n>-<名称>`。

## 7. 对账（load）

1. HEAD 与 `repo.head` 比较；不同则列出其间提交。
2. 当前工作区快照 tree 与 `wip`（无则 `head`）的 tree 比较：相同 → 一致；HEAD 相同且工作区干净且有 wip → 从 wip 恢复工作区；否则报告 `diff --stat`，不改动。
3. `next` 中反引号括起、像路径的记号，逐个检查是否存在。

三项都只报告，不阻断。

## 8. 状态

由 DAG 推导，不存储：有子交接 → done；无子交接且有 claim → claimed；否则 open。
