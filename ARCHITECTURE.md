# handoff 架构 v2

*2026-10-07 · 由《Handoff v1：跨 Agent 会话接力》设计稿演进 · 绿地实现，零运行时依赖*

## 1. 一个核心思想：事件溯源式记忆

Agent 的上下文窗口是易逝的。handoff 把一次会话拆成两类东西分开存：

| | 内容 | 谁产生 | 性质 |
|---|---|---|---|
| **事件**（一手来源） | 用户原话 `voice/`、git 账本 `ledger/`、工作区快照 `wip`、交接 DAG | 内核，确定性抽取 | 只追加、不可变、可复核 |
| **投影**（蒸馏） | `brief.md` 项目提示词、`state.md` 动态状态 | Agent，判断 | 可随时由更强的模型从事件重新计算 |

推论：

1. **没有「摘要的摘要」。** 每次封存都从事件重新蒸馏；上一份 state 只是参考，不是输入的唯一来源。
2. **模型越强，交接越好，代码不用改。** 内核从不调用模型；未来的模型可以拿同样的事件算出更好的投影。
3. **证据可追溯。** `[user]` 决定必须引用原话 `[v7.3]`，校验器拒绝不存在的引用。

## 2. 分层（六边形架构，依赖只向内）

```
 faces     cli.ts · render.ts · install.ts · skill/SKILL.md · SessionStart hook
   │       （文本进出；Agent 的"智能"全部写在 SKILL.md 这一份契约里）
 kernel    prepare · join · seal · load · take · show · capture
   │       （用例；只依赖 core 与 ports，不碰 IO 模块）
 ports     Store · Workspace · TranscriptSource · Desk · Registry
   │
 core      types · voice · draft · dag   （纯函数，零 IO）

 adapters  git（Store + Workspace）· claude · codex（TranscriptSource）· desk · registry
 wire.ts   组装根：唯一知道哪个适配器接哪个端口的地方
```

`test/architecture.test.ts` 把分层写成可执行的契约：任何 Agent（包括并行开发本仓库的 Agent）越界导入，测试即红。

## 3. 存储：git 就是数据库

```
refs/handoff/seal/<n>    交接包：一个 commit，tree 即 bundle；git 父提交 = 父交接
refs/handoff/wip/<n>     封存瞬间的完整工作区快照（含未跟踪文件，不含 >5MB 的未跟踪大文件）
refs/handoff/claim/<n>   认领记录
```

- **编号 = 原子创建引用。** `git update-ref --stdin` 的 `create` 指令在引用已存在时失败，失败就取下一个编号。多个 Agent 同时封存不会撞号，不需要锁、服务或数据库。
- **血统 = git 历史。** `git log refs/handoff/seal/12` 就是交接链；`git log -p … -- brief.md` 就是项目提示词的演变史。
- **零拷贝承继。** 每个 bundle 都带着全部祖先的 `voice/<n>.jsonl` 与 `ledger/<n>.md`，但只是引用同一个 blob id，不占额外空间；单个 bundle 自包含。
- **快照不碰现场。** 用临时索引文件（从真实索引复制，所以只哈希改动过的文件）构造 tree，真实索引与工作区不变。
- **同步显式。** `handoff sync` 推送/拉取 `refs/handoff/*`，默认不推。

## 4. 原话（voice）

- 来源：Claude Code `~/.claude/projects/*/<session>.jsonl`、Codex `~/.codex/sessions/**/rollout-*.jsonl`。适配器只取人类输入：过滤工具结果、meta、压缩摘要、harness 注入（AGENTS.md、environment_context 等）；斜杠命令还原成 `/handoff 7` 的形式。
- 范围：本工作区内的所有会话 + 当前会话。父交接之后的新消息全部收入，所以忘了封存也不丢原话。
- **编号 `v<交接号>.<序号>`。** v1 设计用全局递增序号，分叉后两条 lane 会撞号；交接号本身原子唯一，所以 `v7.3` 天然全局唯一，汇合时直接取并集。
- 拿不到原始记录的 Agent：由 Agent 逐字回忆写入 `recalled.md`，manifest 标 `voice: recalled`。

## 5. 并行：一个概念覆盖串行与并行

交接是工作 DAG 上的一条边：`relay`（接力）、`fork`（分派）、`join`（汇合）。

```
 #1 ── #2 ──┬── #3 lane/3-auth ── #5 ──┐
            └── #4 lane/4-ui ──────────┴── #6 join ── #7 …
```

- **fork**：草稿里多一个 `fork.md` 就是分叉。每条 lane 得到子交接、分支 `lane/<n>-<名>`、兄弟目录 `<仓库>@<n>-<名>`（worktree，`.handoff/HEAD` 已指向它的交接），以及 `owns` 路径所有权。
- **take**：并行 worker 用 `handoff take` 原子认领最早的待接手交接——拉取式调度，无协调者。
- **join**：`handoff join 2` 自动展开为 #2 子树的所有末端；内核准备汇合草稿与 `_lanes.md`，合并分支和裁决冲突由 Agent 完成。
- **状态是推导出来的**：有子交接 = 已接续；无子交接且被认领 = 进行中；否则待接手。从不另存状态，所以不会不一致。

## 6. 读取侧挂在必经路径上

经验库的教训（[[process-must-hook-into-required-path]]）：依赖自觉的流程必然断。所以：

- **SessionStart hook**（Claude Code 与 Codex 都注册）在仓库有未接续交接时注入 ≤5 行路由卡：编号、状态、目标、下一步、怎么接手。只放路由不放内容（[[skill-preflight-routing]]）。
- **`.handoff/HEAD`** 记录本工作区所在的交接（类比 git HEAD），下一次封存默认以它为父。
- **一份 SKILL.md** 同时安装到 Claude Code 与 Codex（目录链接，仓库更新即生效）。

## 7. 与 v1 设计稿的差异

| v1 | v2 | 原因 |
|---|---|---|
| voice 全局序号 `v12` | `v<交接号>.<序号>` | 分叉后撞号；交接号已原子唯一 |
| `voice.md`、`ledger.md` 单文件 | `voice/<n>.jsonl`、`ledger/<n>.md` 按交接分片，零拷贝承继 | 不可变事件 + 汇合取并集 |
| 决定标签 user / agent / open | 加 `proven` | 与经验库证据级别对齐：user=拍板、proven=实测、agent=推断 |
| `tasks.md` | 草稿 `fork.md` 触发分叉；bundle 中 `lane.md` 随 lane 内接力承继 | 分叉意图与 lane 任务分开 |
| `refs/handoff/pin` 常驻 brief | SessionStart 路由卡 + `.handoff/HEAD` | 常驻上下文只放路由 |
| 大粘贴折叠为摘要 | 原话全文入库，展示时裁剪，`handoff show v7.3` 看全文 | 无损 |
| Faces 含 MCP | CLI + Skill + Hook | 目标 Agent 都能跑 shell；加一个 face 只是加一个文件 |
| Relay Eval | 未做（见 README「下一步」） | 先有真实交接数据再建评测 |

保留 v1 的全部原则：仓库即记忆、一手来源、确定性内核、协议先于产品、编号即引用、渐进披露、并行为默认、零仪式。

## 8. 与第二大脑（Obsidian 经验库）的关系

handoff 不是入库流程。交接是**项目自己的工作记录**，沉淀在项目仓库里，跟着项目走（2026-10-07 choysun 拍板）。进经验库的只有项目经验总结凝练后的内容：

```
会话 ──/handoff──▶ 交接（项目仓库 refs/handoff/*，只服务这个项目的接力）
                        │
          项目收尾 /sink 复盘：把交接链当作项目的一手记录来读，凝练出经验
                        ▼
                  经验卡 / 项目档案（经验库，跨项目）
```

复盘时交接链的价值：`[user]` 决定是拍板、`[proven]` 是实测、brief 里的「被否决的方案」直接对应档案的关键决策；经验卡的 `source` 可写 `handoff:<项目>#<n> [vN.K]` 追溯原话。交接包本身从不复制进经验库。

## 9. 扩展点

- 新 Agent 的原话：实现 `TranscriptSource`（一个文件），加进 `wire.ts`，在 `protocol/fixtures/` 放一份夹具。
- 新的存储（例如共享服务）：实现 `Store`。
- 新的入口（例如 MCP）：在 `faces/` 加一个文件，调用同一组 kernel 用例。
