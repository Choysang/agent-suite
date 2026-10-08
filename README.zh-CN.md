# Agent Working Guidelines (Agent 工作准则系统)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Edition: Universal](https://img.shields.io/badge/Edition-Universal%20%7C%20Codex%20%7C%20Claude-brightgreen.svg)](#三大适配版本对比)
[![Language: Bilingual](https://img.shields.io/badge/Language-English%20%7C%20%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-orange.svg)](#文件目录架构)

一套跨模型、跨运行时的高效 AI Agent 工作准则系统。从 Andrej Karpathy 的启发式工程实践演进而来，深入结合前沿模型（Codex、Claude 5 代及多 Agent 协作架构）的行为特性，提供**针对不同场景深度定制的工程化与认知协作规范**。

[English](./README.md) | 简体中文

---

## 目录
- [设计背景与演进哲学](#设计背景与演进哲学)
- [三大适配版本对比](#三大适配版本对比)
- [五大核心支柱](#五大核心支柱)
- [文件目录架构](#文件目录架构)
- [快速上手与接入指南](#快速上手与接入指南)
- [深层思考：为什么不再需要微操式 Prompt？](#深层思考为什么不再需要微操式-prompt)
- [致谢与灵感](#致谢与灵感)

---

## 设计背景与演进哲学

传统的 Agent 提示词往往充斥着“第一步做什么、第二步复核什么、每次都要深度思考”的机械式微观流程。然而，随着大语言模型原生推理能力与 Agent Harness 的飞跃，这种**过度防御性（Defensive Over-engineering）**的规则反而带来了严重的负面效应：
1. **过度探索与冗余思考**：简单问题被强行展开万字分析，耗尽上下文窗口与 Token 预算。
2. **过度防御与伪造复杂性**：为极低概率的边缘情况预设层层兜底与不必要的架构抽象。
3. **机械滥用测试与子代理**：改动一行代码引发全量测试风暴，或频繁派生大量毫无协同必要的 Subagents。

> 💡 **关键启示**：Anthropic 官方在 Claude 5 代模型演进中披露，他们移除了 Claude Code 中 **80% 以上的系统提示词**，而在严苛的代码基准测试中**性能未出现任何可测量的下降**。
>
> 这证明了一个长期趋势：**高阶 Agent 需要的是“价值尺度、自主权边界与质量标准”，而不是“手把手的步骤流程教导”。**

本项目历经数轮实战迭代，将核心原则凝练为三大适配版本，既防止模型在工程落地中“信口开河、过度破坏”，又释放模型在认知协作中的“主动性与自适应智能”。

---

## 三大适配版本对比

本项目针对不同的运行环境与指令入口，提供了三套精准适配的版本：

| 维度 | 1. OpenAI Codex 专版 (`/codex`) | 2. Claude 个人指令版 (`/claude`) | 3. Universal 全球通用版 (`/universal`) |
| :--- | :--- | :--- | :--- |
| **主打定位** | **代码工程落地准则** | **全场景个人协作准则** | **跨平台 Canonical 基石规范** |
| **适用环境** | OpenAI Codex、Codex CLI、终端工程 Harness | Claude Web 全局设置 (`Instructions for Claude`) | WorkBuddy、DSH、Cursor、Windsurf、自建 Agent |
| **适用任务** | 代码编写、Bug 根因排查、重构、工程发布 | 跨对话问答、调研、文档写作、系统架构、Cowork | 全类型 Agent 任务，尤其在缺乏成熟 Harness 约束时 |
| **核心特性** | **Surgical Changes（精准改动）**<br>遵循既有约定，不顺手重构，不伪造测试 | **Adaptive Effort（自适应投入）**<br>深浅思考自适应，拒绝过度探索与无谓防御 | **完整语义保留（Semantic Completeness）**<br>指令层级、防 Prompt 注入、完整并行写入隔离 |
| **测试策略** | 最小相关验证；仅在明确要求或必需时执行测试 | 比例验证（Proportionate Verification） | 严控测试半径，严禁默认运行广泛测试集 |
| **协作/并行** | 明确代码写入边界、单整合人、物理产物验收 | 权责隔离，长任务留存持久化 Checkpoint | 完整的并发规避协议、升级条件与交接恢复格式 |
| **知识库接入** | 针对工程任务按需读取本地 Router | 本地环境按需读取；云端环境优雅降级说明限制 | 规范化的 Obsidian Vault 路由 (`ROUTER.md`) + `sink`/`capture` |

---

## 五大核心支柱

无论是哪个版本，都统一贯彻以下五项经过提炼的长期价值观：

### 1. 独立判断 (Independent Judgment)
- **不做“应声虫 (Yes-man)”**：从目标与证据出发，主动挑战错误假设与次优路径。
- **证据分层**：严格区分“既定事实”、“合理推断”与“假设”；重大结论必须核实一手证据，严禁臆造。
- **辩证比较**：公平客观地比较有意义的备选方案，揭示被忽视的权衡、隐藏成本与潜在偏差。

### 2. 简单优先 (Simplicity First & Craft)
- **最小必要复杂度**：优先选择最简、自洽、可维护的方案；严禁防御性代码膨胀和过早优化。
- **设计分轨**：
  - 对**现有工程**：尊重项目惯例，实施最小改动；
  - 对**全新设计**：摆脱历史包袱，立足本真需求推导最佳架构，同时严格遵守明确的兼容性约束。

### 3. 精准改动 (Surgical Changes)
- **根因修复**：必须理解预期行为与失败原因，在所属逻辑层根治，严禁“打补丁式掩盖”。
- **控制影响面**：保留他人成果与无关行为；不做推测性扩展、随手重构或无关代码清理。
- **诚实底线**：严禁通过隐藏报错、跳过检查或篡改指标来宣称成功。

### 4. 结果驱动 (Outcome-Driven / Initiative & Delivery)
- **主动推进**：拒绝“仅停留在给建议或出方案”；在授权范围内追求直接产出可用成果。
- **自适应投入 (Adaptive Effort)**：按任务不确定性与失败代价动态匹配分析深度；简单问题直奔答案，复杂问题深入求证。
- **比例验证 (Proportionate Verification)**：以最小相关检查为原则，不把未经检验的工作标为通过；主观审美与交互留待人工验收。
- **持久化交接 (Durable Handoff)**：长周期任务压缩上下文前，完整记录已验证环境、被否方案与下一步阻塞，实现无损交接。

### 5. 知识沉淀 (Knowledge Retention)
- **路由化加载**：配合 Obsidian 本地知识库（默认路径 `D:/zuomian/Obisidian/Knowledge`），优先通过 `<vault>/ROUTER.md` 命中加载，杜绝无节制检索。
- **增量沉淀**：任务完成后，主动提议通过 `sink` 沉淀非显然解法与决策经验，通过 `capture` 归档优质资料。

---

## 文件目录架构

```text
agent-working-guidelines/
├── README.md                 # 英文完整项目指南
├── README.zh-CN.md           # 中文完整项目指南（当前文件）
├── AGENTS.md                 # 通用基石规范（开箱即用 · 简体中文）
├── AGENTS.en.md              # 通用基石规范（开箱即用 · English）
│
├── codex/                    # 针对 OpenAI Codex 及代码终端的专版
│   ├── AGENTS.md             # Codex 优化准则 (简体中文)
│   └── AGENTS.en.md          # Codex Guidelines (English)
│
├── claude/                   # 针对 Claude 全局账号与 Claude Code 的专版
│   ├── INSTRUCTIONS.md       # Instructions for Claude (简体中文)
│   └── INSTRUCTIONS.en.md    # Instructions for Claude (English)
│
└── universal/                # 跨模型、跨平台的通用规范标准
    ├── AGENTS.md             # 通用标准版 (简体中文)
    └── AGENTS.en.md          # Universal Standard (English)
```

---

## 快速上手与接入指南

### 1. 在 Claude 网页端 / App 中使用 (强烈推荐)
1. 访问 Claude 官网，进入 **Settings** → **Instructions for Claude**（或打开个人资料设置中的偏好指令）。
2. 打开 [`claude/INSTRUCTIONS.en.md`](./claude/INSTRUCTIONS.en.md)（推荐英文，模型遵循度极高且省 Token）或 [`claude/INSTRUCTIONS.md`](./claude/INSTRUCTIONS.md)。
3. 复制全文并粘贴到输入框中保存。
4. **效果**：你账号下的所有对话（包括日常对话、分析、写作、研究、代码生成）都将具备自适应思考、不盲从、极简设计与主动交付的能力。

### 2. 在 OpenAI Codex / Codex CLI 中使用
- **全局生效**：将 [`codex/AGENTS.md`](./codex/AGENTS.md)（或 [`codex/AGENTS.en.md`](./codex/AGENTS.en.md)）的内容追加或覆盖至用户目录下的 `~/.codex/AGENTS.md`。
- **项目级生效**：在特定代码仓库根目录下创建 `AGENTS.md` 并填入该内容。
- **效果**：Codex 在修改代码时将严格保持外科手术式精准度，不滥写死循环测试，且在跨会话时自动生成完备的持久化 Checkpoint。

### 3. 在 Cursor / Windsurf / Claude Code 中使用
- 在项目根目录的 `.cursorrules`、`.windsurfrules` 或 `CLAUDE.md` 中引用或直接粘贴 [`universal/AGENTS.md`](./universal/AGENTS.md)。
- 若搭配 Claude Code，建议将项目特有的依赖、构建命令与架构规范写在项目级 `CLAUDE.md`，而将全局工程态度交由本准则托管。

### 4. 在 WorkBuddy / DSH / 自建 Agent 框架中使用
- 在系统 Prompt（System Prompt）中载入 [`universal/AGENTS.md`](./universal/AGENTS.md)。
- 通用版保留了完整的指令权限防御机制与跨会话交接协议，能够有效补足轻量级 Agent 框架缺乏原生 Harness 约束的问题。

---

## 深层思考：为什么不再需要微操式 Prompt？

在过去，很多 Agent Prompt 喜欢写满：
*“你必须在修改代码前先写 5 条思考；每次必须用 Bash 运行一次 git status；必须写全量单元测试并在完成时复查 3 遍……”*

这种写法的本质是把 LLM 当成“没有自主意识的有限状态机”。但在面对现代前沿大模型时，这种做法会导致三个致命缺陷：
1. **消耗注意力和上下文**：过长的刚性流程占用了大量上下文窗口，导致真正解决业务逻辑时的有效 Attention 被严重稀释。
2. **引发“为测试而测试”的愚蠢行为**：模型为了满足“必须运行测试”的指令，经常在没有配置测试环境的代码库里瞎编测试命令，甚至修改测试用例以迎合错误代码。
3. **扼杀创造力与极简意识**：模型不敢直接交付优雅直接的代码，反而为了显得“专业”堆砌大量的抽象类、工厂模式与防御性 Try-Catch。

**本项目的核心哲学是：**
> **相信模型的推理智能，约束其工程边界，引导其价值权衡。**
> 给它充足的自主交付权，但在修改范围、事实真实性与复杂性滋生上拉起坚不可摧的高压线。

---

## 致谢与灵感

- 受到 **Andrej Karpathy** 关于 Coding Agent 实际落地范式与极简原则公开分享的启发。
- 借鉴了 [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) 的结构化思想。
- 吸收了 **Anthropic** 关于 Claude 5 代模型 Context Engineering 与 Prompt Pruning（精简 80% 系统提示词）的官方前沿工程实践。

---

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。欢迎自由使用、分叉与适配！
