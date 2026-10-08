<div align="center">

# handoff ⚡
### 跨 Agent 会话接力 · 蜂群协同网格 · 事件溯源认知架构
**Cross-Agent Cognitive Session Relay & Swarm Mesh for Super-Intelligent AI Agents**

[![Protocol](https://img.shields.io/badge/Protocol-v3.0-indigo.svg)](protocol/SPEC.md)
[![Runtime](https://img.shields.io/badge/Runtime-Node%20≥%2024%20Native%20TS-emerald.svg)](https://nodejs.org)
[![Zero-Dependencies](https://img.shields.io/badge/Dependencies-0%20Runtime%20Deps-blue.svg)](package.json)
[![Standard](https://img.shields.io/badge/Standards-A2A%20v1.0%20%7C%20MCP%20v2.0-purple.svg)](protocol/SPEC.md)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

[**中文文档**](README.md) · [**English Documentation**](README_EN.md)

</div>

---

> **“把一次 Agent 会话封存为一个不可变编号，换任何 Agent、切任何模型、开任何新会话，输入编号瞬间无损复活并接着干。”**

```bash
# 1. 在任何宿主 Agent (Claude Code / Codex / Cursor / Gemini) 中封存
[Claude Code]  > /handoff
  ✔ 已封存 #7 · myapp · main · a1b2c3d · 工作区未提交改动已快照
  ✔ 一手原话: 3 条人类指令已锚定 (v7.1, v7.2, v7.3)
  ✔ 下一步: 实现 refresh-token 轮换机制
  ✔ 验收标准: npm test -- auth 全绿
  ✔ 接手口令: /handoff 7  (或 $handoff 7)

# 2. 换由超智能模型 (GPT-6 / Opus 5.5n / Claude Fable 5.1) 接手
[GPT-6 / Codex]  > $handoff 7
  # 接手交接包 #7 · myapp · relay · 来自 claude-code (claude-opus-5-5)
  现场: HEAD 一致 · 物理工作区已原子校验 · 凭证无损认领
  第一步: 实现 refresh-token 轮换 … (开始执行)
```

---

## 🌟 为什么需要 handoff？（2026 智能体时代的认知危机）

随着大模型能力从辅助补全跨越至 **自主长程工程开发（Autonomous Engineering）**，传统的多智能体开发遇到了三大致命瓶颈：

1. **“摘要的摘要”导致的认知退化（Summary Entropic Collapse）**  
   长任务上下文耗尽时，传统方案让模型压缩前一轮对话。经过 3~4 轮接力后，用户的原话约束（如“绝对禁止引入第三方运行时依赖”、“密码必须使用 Ed25519”）被层层稀释磨损，最后演变为 Agent 自行编造的虚假需求。
2. **多 Agent 盲目并发的代码脏写灾难（Context Collision）**  
   数十个 Agent 并行操作同一目录，引发文件写锁竞争、未提交改动互相覆盖，以及测试套件的幽灵污染。
3. **沉重脆弱的基础设施（Infrastructure Bloat）**  
   为了记几个会话编号与状态，动辄要求开发者搭建 Redis、PostgreSQL、消息队列与常驻微服务网关，极难在无状态沙箱或本机敏捷流动。

**handoff 彻底终结了这一切。**

---

## 💎 核心架构基石（First Principles & 2026 Textbook Design）

### 1. 事实-投影对偶（Fact-Projection Duality）
- **一手事实（Immutable Facts）**：只有两样东西是绝对客观事实——**人类用户的原始发言逐字稿（Verbatim Voice Token `vN.K`）** 与 **Git Commit 账本（Ledger）**。它们只追加、绝对不可变、具备因果防篡改凭证。
- **动态投影（Ephemeral Projections）**：项目简报 `brief.md`、状态列表 `state.md`、任务 DAG 仅仅是模型根据一手事实在当前时间点计算出来的**投影**。
- **长生演进**：未来模型无论从 GPT-6 升级到 Opus 5.5n 还是 Claude Fable 5.1，随时可以拿同一套原始原话重新以更高智力蒸馏出更精准的投影，**系统底座无需任何重构升级**。

### 2. Git 即数据库（Zero-Infra Merkle Engine）
- 交接包存在项目仓库自己的 Git 引用命名空间中（`refs/handoff/*`）。
- **零锁 CAS 原子认领**：利用 `git update-ref` 原子指令，多个 Agent 并发封存或抢占任务时，天然实现零锁竞争排队，无需外部数据库。
- **血统天然追溯**：Git Commit Parent 就是交接历史树，`git log` 即可回放整个多 Agent 开发历程。

### 3. Spine-Branch 物理 Worktree 隔离与原生并行蜂群
- **Fork into Lanes**：一句指令将复杂任务分派成 $N$ 个并行泳道（`lane/auth`, `lane/ui` 等）。
- **物理环境沙箱**：每个 Agent 分配专属的兄弟目录 Worktree（`<repo>@<id>-<name>`），共享底层对象库，物理隔离工作区，各自独享测试与编译。
- **四阶级联仲裁机制（4-Tier Cascade Arbitration）**：
  - **Tier 0**：文件路径正交时，执行 `<5ms` 确定性快速合流。
  - **Tier 1**：同一文件不同 AST 节点修改时，执行抽象语法树无损织入。
  - **Tier 1.5**：STALE 防御——执行多模块集成测试，防御“单测各自全绿、合并后隐式撕裂”。
  - **Tier 2**：逻辑冲突时，自动唤醒独立仲裁 Agent（Arbiter Agent）根据双方原话生成调和方案。
  - **Tier 3**：人类原话时光机一键拍板介入。

### 4. 前后端完全解耦：Cognitive Mission Control 网页控制台
内置极具未来感的控制中心（通过 `handoff ui` 启动），提供高维可视化协作体验：
- **Neuro-DAG 拓扑画布**：实时呈现串行接力（Relay）、并行分叉（Fork）与汇合点（Join）。
- **蜂群实时泳道监视器**：实时洞察并发 Agent 运行状态、占用模块（`owns`）与构建心跳。
- **原话时光机（Voice Time Machine）**：点击代码或决定，毫秒级反向高亮最初的人类原话出处与因果链。
- **实时事件流**：内置原生 SSE（Server-Sent Events）推流与 A2A v1.0 Agent Card（`/.well-known/agent.json`）。

---

## ⚡ 极速起步

### 系统要求
- **Node.js ≥ 24**（直接运行原生 TypeScript，无需构建，无需 Babel/Vite/Webpack）
- **Git**

```bash
# 全局安装并链接
npm install
npm link

# 自动注册进本机所有 Agent (Claude Code / Codex / WorkBuddy / Cursor)
handoff install
```

`handoff install` 会自动扫描本机环境，对已存在的 Agent 安装目录软链接 `skill/` 并挂载 `SessionStart` 路由钩子（新会话启动时，若仓库有在途交接，终端自动展示 ≤5 行极简接力卡片）。

---

## 🛠 命令行与智能体交互速查

### 在宿主 Agent 内交互（通过 Skill）
| 命令 | 行为与效果 |
|---|---|
| `/handoff` | 封存当前会话并输出交接编号（如 `#7`） |
| `/handoff 7` | 接手编号为 7 的交接，原子校验工作区，直接开干第一步 |
| `/handoff myapp-7` | 跨目录从其他项目接手任务 |
| `/handoff join 7` | 汇合编号为 7 的所有并行泳道，启动级联仲裁 |
| `/handoff take` | 并行 Worker 抢占最早的待接手任务 |

### 终端独立命令
```bash
# 查看当前仓库所有交接包与看板拓扑
handoff ls

# 启动 Cognitive Mission Control 网页控制台（自动打开浏览器）
handoff ui --port 4040

# 启动无头实时 Mesh API 服务 (提供 SSE、REST 与 A2A 协议)
handoff serve --port 4040

# 查看指定交接的组成部分 (brief | state | lane | voice | ledger | history | manifest)
handoff show 7 brief
handoff show 7 state

# 一秒还原任意人类原话全文
handoff show v7.3

# 同步远端 Git 引用
handoff sync origin
```

---

## 📐 严格分层六边形架构设计（Hexagonal Ports & Adapters）

为了确保系统纯净可靠，代码遵循不可撼动的六边形架构，且由 `test/architecture.test.ts` 自动化强制检查：

```
 faces     cli.ts · render.ts · server.ts · install.ts · skill/SKILL.md
   │       （外部表现层：文本终端、HTTP/SSE 实时服务、网页控制台、Agent 规则）
 kernel    prepare · join · seal · load · take · show · capture
   │       （纯用例层：协调领域模型与端口，严禁直接调用任何 Node IO 模块）
 ports     Store · Workspace · TranscriptSource · Desk · Registry
   │       （抽象接口契约）
 core      types · dag · voice · draft · lamport · provenance   （纯数学领域函数，零 IO）
 
 adapters  git（Store + Workspace）· claude · codex · codebuddy · desk · registry
 wire.ts   （全局组装根：唯一知悉适配器与端口绑定关系的入口）
```

- **零运行时依赖**：所有底层能力完全基于 Node 24 原生标准库（`node:http`, `node:child_process`, `node:fs`, `node:crypto`）。
- **可擦除语法**：纯 TypeScript 7 原生运行，无 Enum、无 Namespace，极致轻量，冷启动 `<20ms`。

---

## 🤝 开放互联协议标准支持

1. **A2A v1.0 (Agent-to-Agent Protocol)**  
   通过 `http://localhost:4040/.well-known/agent.json` 对外声明智能体能力规范，允许分布式多 Agent 网格自主发现并接力。
2. **MCP v2.0 (Model Context Protocol)**  
   与 Claude Code、Cursor、Codex 等开发生态的标准工具总线天然兼容。
3. **Protocol v3 规范**  
   详见规范文档 [protocol/SPEC.md](protocol/SPEC.md) 与架构白皮书 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 🧪 自动化测试验证

```bash
# 运行 24+ 项真实临时 Git 仓库端到端沙箱集成测试
npm test

# 执行 TypeScript 7 静态类型全量检查
npm run check
```

---

<div align="center">

**handoff — 构建面向未来的超级智能体协作基石。**  
Designed for 2026+ Super-Intelligence Swarms (GPT-6, Claude Fable 5.1, Opus 5.5n & Beyond).

</div>
