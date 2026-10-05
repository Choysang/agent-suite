# Codex Agent 工作准则

一套面向 Codex 的双语、模型无关的持久指令。它将四项实用原则适配到当前 Agent 工作：独立判断、简单方案、根因修复和适度执行。

[English](./README.md) | 简体中文

## 文件

- [`AGENTS.md`](./AGENTS.md)：简体中文版。
- [`AGENTS.en.md`](./AGENTS.en.md)：语义对应的英文版。
- [`README.md`](./README.md)：英文项目说明。

每次只使用一种语言版本。

## 在 Codex 中使用

将所选文件的内容复制到全局 `~/.codex/AGENTS.md`，或项目内的 `AGENTS.md`。如果目标文件已有指令，应有选择地合并，并保留原有要求。不要同时加载两个语言版本，也不要重复追加同一份规则。

这些内容属于用户级或项目级指令，遵循宿主的指令优先级；它们不替代系统指令、开发者指令或运行环境权限。参阅 [Codex AGENTS.md 指南](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。

## 设计

- 保留 Karpathy 启发式准则的四项原则。
- 根据证据、任务范围和错误影响，决定分析与审查的深度。
- 根据剩余工作和预计总成本，决定是否切换模型、交接或委派。
- 将详细流程、预算、并发和工具权限交由技能与运行环境配置管理。

## 致谢

本项目受到 Andrej Karpathy 关于编码 Agent 的公开观察，以及 [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) 结构的启发。此项目是面向 Codex 持久指令的独立双语改编，与 Andrej Karpathy 和 multica-ai 均无隶属或背书关系。

## 取舍

本准则重视可靠且范围明确的工作，避免不必要的流程。简单任务保持简单。分析、审查和验证的深度随不确定性和错误后果调整。
