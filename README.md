# handoff

**把一次 Agent 会话封存成一个编号，换任何 Agent、开任何新会话，输入编号接着干。**

```
[Claude Code]  > /handoff
  已封存 #7 · myapp · main · a1b2c3d · 工作区未提交改动已快照
  下一步：实现 refresh-token 轮换
  验收：npm test -- auth 全绿
  接手：任意 Agent 输入 /handoff 7（Codex：$handoff 7）

[Codex]  > $handoff 7
  # 交接 #7 · myapp · relay · 来自 claude-code（claude-opus-5-5）
  现场：HEAD 一致 · 工作区与封存一致 · 已认领
  第一步：实现 refresh-token 轮换 …（开始执行）
```

- **零基础设施**：交接存在仓库自己的 git 引用 `refs/handoff/*` 里，不污染工作区，不需要服务。
- **一手来源**：用户原话从 Claude Code / Codex 的原始会话记录逐字抽取，账本来自 git；模型只做蒸馏，且每次都从一手来源重新蒸馏。
- **确定性内核**：`handoff` 从不调用模型；判断全部在一份 `SKILL.md` 里交给宿主 Agent。模型越强，交接越好。
- **原生并行**：`fork.md` 一写就分叉成 N 条 lane（各带分支、worktree、路径所有权）；`take` 原子认领；`join` 汇合。

设计见 [ARCHITECTURE.md](ARCHITECTURE.md)，协议见 [protocol/SPEC.md](protocol/SPEC.md)。

## 安装

需要 Node ≥ 24（直接运行 TypeScript，无构建）与 git。

```bash
npm install
npm link
handoff install
```

`handoff install` 做三件事：把 `skill/` 以目录链接装进 `~/.claude/skills/handoff` 与 `~/.codex/skills/handoff`；在 `~/.claude/settings.json` 与 `~/.codex/config.toml` 注册 SessionStart hook（仓库有未接续的交接时，新会话开头自动出现一张 ≤5 行的路由卡）。重复运行无副作用。

## 用法

| 在 Agent 里 | 效果 |
|---|---|
| `/handoff` | 封存当前会话，返回编号 |
| `/handoff 7` | 接手 #7：认领、对账、直接执行第一步 |
| `/handoff myapp-7` | 跨目录接手 |
| `/handoff join 7` | 汇合 #7 分出去的所有 lane |
| `/handoff take` | 并行 worker：认领最早的待接手交接 |

命令行：`handoff ls`（看板）、`handoff show 7 [brief|state|lane|voice|ledger|history|manifest]`、`handoff show v7.3`（一条原话全文）、`handoff sync`（推送/拉取交接引用）。

## 开发

```bash
npm test        # node:test，全部在临时 git 仓库里真跑
npm run check   # TypeScript 7 类型检查
```

分层规则由 `test/architecture.test.ts` 强制。给新 Agent 接入原话：在 `src/adapters/` 实现 `TranscriptSource`，加进 `src/wire.ts`，在 `protocol/fixtures/` 放夹具。

## 下一步

- Relay Eval：用真实交接回放，量化「冷启动 Agent 接手后答对目标、下一步、被否决方案」的比例，按模型比较。
- 更多 Agent 的原话适配器（Gemini CLI、Cursor 等）。
