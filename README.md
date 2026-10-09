# 🚀 agent-suite: 智能体全流程协同与认知套件

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-2026_SOTA-00f2fe?style=for-the-badge" alt="Architecture" />
  <img src="https://img.shields.io/badge/Agent_Ready-Claude_Code_|_Codex_|_Cursor_|_Windsurf-4facfe?style=for-the-badge" alt="Agent Ready" />
  <img src="https://img.shields.io/badge/Memory-Git_Native_&_Zero_Pollution-10b981?style=for-the-badge" alt="Memory" />
  <img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>面向个人与团队的下一代 AI 编程工作流方案：给 AI 装上「严谨的自律灵魂」、「无损的接力记忆」与「越用越聪明的第二大脑」。</strong>
</p>

---

## 📖 目录
- [💡 为什么需要这一套联合体？](#-为什么需要这一套联合体)
- [🛠️ 核心架构逻辑：全生命周期工程闭环](#-核心架构逻辑全生命周期工程闭环)
- [✨ 三大核心支柱详解](#-三大核心支柱详解)
  - [1. 行动指南：行为准则与提示词 (Rules & Prompts)](#1-行动指南行为准则与提示词-rules--prompts)
  - [2. 会话接力：工作流状态与多泳道 (Handoff & Lanes)](#2-会话接力工作流状态与多泳道-handoff--lanes)
  - [3. 第二大脑：结构化知识资产库 (Obsidian-Wiki)](#3-第二大脑结构化知识资产库-obsidian-wiki)
- [⚡ 3 分钟极速上手 (Quickstart)](#-3-分钟极速上手-quickstart)
- [🎬 实战案例：开发者真实的一天](#-实战案例开发者真实的一天)
- [📂 仓库架构全景图](#-仓库架构全景图)
- [❓ 常见问题答疑 (FAQ)](#-常见问题答疑-faq)
- [🗺️ 未来迭代路线 (Roadmap)](#-未来迭代路线-roadmap)

---

## 💡 为什么需要这一套联合体？

当你在日常使用 AI 编程助手（Claude Code、Cursor、OpenAI Codex、Windsurf 等）开发复杂项目时，一定会经历这 **三大绝望时刻**：

```
                    【传统 AI 开发的三大痛点】
                    
  [痛点 1: 瞎改乱编]      [痛点 2: 会话失忆]      [痛点 3: 重复踩坑]
  AI 擅自大拆大改，     聊久了窗口变卡变笨，    今天花半天解决的坑，
  凭空虚构不存在的库，  换个新窗口彻底失忆，    明天新开会话又在
  导致原本代码瘫痪。    前人走过的弯路又走一遍。 同一个坑里摔倒。
         │                      │                      │
         ▼                      ▼                      ▼
    【行动指南】           【会话接力】           【第二大脑】
   明确质量与改动红线     Git 原生无损快照       结构化知识卡片
```

**`agent-suite`** 彻底终结了这些问题！它将三个经过实战淬炼的核心项目无缝熔铸为一套**标准化工作流与开箱即用套件**。

---

## 🛠️ 核心架构逻辑：全生命周期工程闭环

在实际开发中，整套系统通过「规范约束 $\to$ 状态接力 $\to$ 经验沉淀」构成了一个完整的自进化开发闭环：

```
┌────────────────────────────────────────────────────────────────────────┐
│                   agent-suite 软件工程全生命周期闭环                    │
├────────────────────────────────────────────────────────────────────────┤
│  1. 行为规范层 (行动指南 · Guidelines)                                 │
│     • 质量红线：独立判断、实测为王（实测 > 拍板 > 外部 > 推断）          │
│     • 改动纪律：微创修改，只动目标代码，不破坏原有架构与代码风格        │
├────────────────────────────────────────────────────────────────────────┤
│  2. 会话执行与接力层 (会话接力 · Handoff & Lanes)                      │
│     • 并行隔离：基于 Git Worktree 开辟独立工作区，多 Agent 并行开发零冲突│
│     • 无损接力：会话打满或切换模型时，现场状态封存至 refs/handoff/*    │
│     • 新 Agent 载入快照即可无缝接棒，无需重复解释背景                   │
├────────────────────────────────────────────────────────────────────────┤
│  3. 长期知识资产层 (第二大脑 · Obsidian-Wiki)                          │
│     • 经验提炼：解决复杂 Bug 后即时提炼为标准 Markdown 经验卡           │
│     • 渐进路由：通过 L0 路由 -> L1 目录 -> L2 卡片按需披露，极度省 Token │
│     • 资产复利：沉淀的避坑规则自动反哺下一次开工，全团队终生复用        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ 三大核心支柱详解

### 1. 行动指南：行为准则与提示词 (Rules & Prompts)
> 对应模块：[`templates/agents/`](templates/agents/) 与 [`docs/01-agent-guidelines.md`](docs/01-agent-guidelines.md)

让 AI 从“随性发挥的聊天助手”转变为“严谨纪律的工程师”：
- **独立判断，证据第一**：代码实测结果高于一切推论。承认未知，不确定必须标明“未验证”。
- **简约至上，拒绝臃肿**：用最少必要的代码实现需求，不进行未经许可的过早优化或引入沉重外部库。
- **外科手术式修改**：微创切口！只修改引发 Bug 的那几行，完整保留原作者的代码风格、注释和无关代码。
- **开箱模板支持**：直接提供 Claude Code（`CLAUDE.md`）、Cursor（`.cursorrules`）、Codex（`CODEX.md`）和通用宪法（`AGENTS.md`）。

---

### 2. 会话接力：工作流状态与多泳道 (Handoff & Lanes)
> 对应模块：[`skills/handoff/`](skills/handoff/) 与 [`docs/02-session-handoff.md`](docs/02-session-handoff.md)

告别失真严重的“让 AI 自己写摘要”：
- **Git 原生事件溯源**：每次交接将当前进展、已验证事实、被否决方案以及工作区快照封存至专用 Git 引用空间 `refs/handoff/<编号>`。
- **秒级换模型与换窗口**：
  - 老窗口输入 `/handoff` 获得编号 `#8`；
  - 新窗口（或更强模型）输入 `/handoff 8`，**零废话，1 秒自动读取现场并动工！**
- **并行工作泳道 (Lanes)**：通过 Git Worktree 实现多 Agent 独立物理工作树，各做各的分支，开发完毕后通过 `/handoff join` 自动汇合。

---

### 3. 第二大脑：结构化知识资产库 (Obsidian-Wiki)
> 对应模块：[`skills/kb/`](skills/kb/)、[`skills/capture/`](skills/capture/) 与 [`docs/03-knowledge-intake.md`](docs/03-knowledge-intake.md)

告别堆积如山的收藏夹与充满噪声的纯向量检索：
- **四大多维入库通道**：
  1. **外部链接**：直接对 AI 说“帮我入库这个项目/文章” $\to$ 触发 `capture` 查重评估并写卡；
  2. **网页剪藏**：Obsidian Web Clipper 剪藏到 `Clippings/` $\to$ 对 AI 说“处理剪藏”自动提炼；
  3. **聊天粘贴**：在对话框随手粘贴文字 $\to$ 做法自动分流为经验卡，资料自动分流为资料卡；
  4. **踩坑复盘**：搞定疑难 Bug 触发 `sink` 写经验卡；项目收尾触发 `sink 复盘` 写项目全景档案。
- **渐进式披露网络 (Progressive Disclosure)**：
  - **L0 路由表 (`ROUTER.md`)**：仅 1-2KB，常驻注入每个新会话；
  - **L1 领域清单 (`routes/<域>.md`)**：按需按主题索引；
  - **L2 契约卡片 (`lessons/`)**：明确标注 `when`（何时用）与 `not_when`（何时不用），精准命中，Token 节省 99%！

---

## ⚡ 3 分钟极速上手 (Quickstart)

```bash
# 1. 克隆本项目
git clone https://github.com/Choysang/agent-suite.git
cd agent-suite
```

### 第一步：为你的工具配置行为指南
根据你日常使用的工具，复制对应配置文件到你的项目根目录：
- **Claude Code 开发者**：把 `templates/agents/CLAUDE.md` 拷贝到你的项目根目录或 `~/.claude/`；
- **Cursor 开发者**：把 `templates/agents/.cursorrules` 拷贝到项目根目录；
- **Codex 开发者**：把 `templates/agents/CODEX.md` 拷贝到项目根目录。

### 第二步：挂载 Agent 技能工具包
将 `skills/` 目录软链接（或复制）到你的 Agent 技能目录：
```bash
# 例如挂载到 Claude Code
ln -s "$(pwd)/skills/handoff" ~/.claude/skills/handoff
ln -s "$(pwd)/skills/capture" ~/.claude/skills/capture
ln -s "$(pwd)/skills/sink" ~/.claude/skills/sink
ln -s "$(pwd)/skills/kb" ~/.claude/skills/kb
```

### 第三步：享受流畅的协同体验
- **换班接力**：在聊天窗口直接输入 `/handoff` 封存；新窗口打 `/handoff 1` 恢复。
- **沉淀经验**：踩坑解决后，直接在聊天窗口打 `sink`。
- **收录好项目**：在聊天窗口发链接并说“帮我入库这个项目”。

---

## 🎬 实战案例：开发者真实的一天

想知道这套系统在实际工作日中有多丝滑？请阅读完整实操案例：  
👉 [《模块四：串联全流程的每日开发闭环 (真实案例实操)》](docs/04-daily-workflow.md)

```
09:30 晨间开工 ──> AI 读取 TODO.md 与 L0 路由，进入就绪态
11:00 踩坑解决 ──> 排查死锁完毕，AI 自动生成经验卡并更新路由
15:30 会话打满 ──> 输入 /handoff 封存为 #8；换更强模型输入 /handoff 8 秒级接力
18:00 项目收尾 ──> 输入 sink 复盘，自动生成项目 Playbook 档案
```

---

## 📂 仓库架构全景图

```
agent-suite/
├── README.md                          # 🌟 本文档（全流程指南大门）
│
├── docs/                              # 📖 四大深度实操进阶手册
│   ├── 01-agent-guidelines.md         # 模块一：不同 Agent 的行动指南与配置详解
│   ├── 02-session-handoff.md          # 模块二：各个会话交接手 (Handoff 跨模型接力实战)
│   ├── 03-knowledge-intake.md         # 模块三：知识入库的各种不同方式 (全通道入库详解)
│   └── 04-daily-workflow.md           # 模块四：串联全流程的每日开发闭环 (真实案例实操)
│
├── templates/                         # 📋 开箱即用模版库
│   ├── agents/                        # 各 Agent 配置文件模板
│   │   ├── CLAUDE.md                  # 适用 Claude Code
│   │   ├── CODEX.md                   # 适用 OpenAI Codex
│   │   ├── .cursorrules               # 适用 Cursor IDE
│   │   └── AGENTS.md                  # 通用 Agent 宪法
│   └── wiki/                          # 第二大脑初始骨架模版 (100% 兼容 Obsidian)
│       ├── taxonomy.yml               # 受控标签表与领域定义示例
│       ├── ROUTER.md                  # L0 渐进式全局路由示例
│       └── cards/                     # 标准卡片模版 (经验卡/工具卡/项目档案/资料卡)
│
└── skills/                            # 🛠️ 完整的 Agent 技能插件集
    ├── capture/                       # 知识入库技能 (收录链接、剪藏、剪贴板)
    ├── handoff/                       # 会话接力技能 (封存与跨会话秒级接手)
    ├── sink/                          # 经验沉淀技能 (踩坑单卡沉淀与项目档案复盘)
    ├── kb/                            # 第二大脑管理引擎 (含自动校验与路由编译脚本 kb.py)
    ├── daily/                         # 每日开工待办与工作日志自动化
    └── tidy/                          # 定期知识库去重与合并清理
```

---

## ❓ 常见问题答疑 (FAQ)

<details>
<summary><strong>Q1: 这个系统需要买服务器或搭复杂的后端吗？</strong></summary>
<strong>完全不需要！</strong><br>
整套系统坚持极简的纯本地原则。会话接力直接使用仓库底层的 Git 自定义引用（<code>refs/handoff/*</code>），知识库是纯粹的 Markdown 文件（兼容 Obsidian），零云端依赖、零基础设施成本。
</details>

<details>
<summary><strong>Q2: 为什么我不直接用 ChatGPT 或 Claude 官方自带的 Memory 功能？</strong></summary>
官方自带的 Memory 存在三大局限：<br>
1. <strong>无法跨工具同步</strong>：Claude 里的记忆无法流转给 Cursor 或 Codex；<br>
2. <strong>无法记录代码现场</strong>：官方 Memory 无法快照当前 Git 工作区的具体未提交代码和报错；<br>
3. <strong>缺乏严格契约</strong>：官方 Memory 会不断积累非结构化的文本垃圾，最终引起模型注意力漂移。
</details>

<details>
<summary><strong>Q3: 知识库随着时间变大后，会不会把 Agent 的上下文窗口撑爆？</strong></summary>
<strong>绝对不会！</strong><br>
本系统采用了 <strong>L0 路由 -> L1 目录 -> L2 卡片</strong> 的渐进式披露机制。注入新会话的只有不到 2KB 的 L0 路由纲要，只有当任务明确匹配某一领域时，Agent 才会按需翻阅单张卡片，极大节省 Token 开销。
</details>

---

## 🗺️ 未来迭代路线 (Roadmap)

`agent-suite` 是一个持续演进的母体系统，后续规划包括：
- [ ] 支持更多新兴 Agent 客户端的原话适配与配置模版（Devin-like CLI、Windsurf 等）；
- [ ] 跨平台一键安装 CLI（`agent-suite install`）；
- [ ] 知识库质量与断链自动检测增强；
- [ ] 多 Agent 并行协作的自动化看板与可视化回放工具。

---

## 🤝 贡献与鸣谢
欢迎提交 PR 补充你在其他 Agent 客户端上的优质配置模版与踩坑经验！  
如果你觉得本项目对你的日常 AI 开发有所帮助，请给一个 ⭐ **Star** 支持我们持续迭代！

**License**: [MIT](LICENSE)
