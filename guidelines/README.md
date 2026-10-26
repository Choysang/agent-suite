# 工作指南

[返回首页](../README.md) · [English](README.en.md)

把稳定的行为约定交给 Agent：区分目标与建议、核对重要假设、按证据纠偏、清晰分工、完成必要验证。检索、交接和经验治理的具体步骤留在相应 Skill 与协议中。

## 选择一个版本

| 使用场景 | 中文 | English | 入口 |
|---|---|---|---|
| Codex | [完整版](codex/AGENTS.md) | [Full](codex/AGENTS.en.md) | 项目 `AGENTS.md` 或个人 `~/.codex/AGENTS.md` |
| Claude Code / 通用 Agent | [完整版](universal/AGENTS.md) | [Full](universal/AGENTS.en.md) | Claude Code 使用 `CLAUDE.md`；其他宿主使用其确认支持的规则入口 |
| 简短规则 | [精简版](universal/AGENTS.compact.md) | [Compact](universal/AGENTS.compact.en.md) | 选精简版即可，无需叠加完整版 |
| Claude 网页 / 桌面聊天 | [个人指令](claude/INSTRUCTIONS.md) | [Chat instructions](claude/INSTRUCTIONS.en.md) | 聊天产品的个人指令设置，区别于 Claude Code 本地规则 |

文件中的 `<vault>` 是占位符。手动安装时替换为自己的知识库路径；不用知识库就移除相关段落。

## 用统一入口安装

在完整 Agent Suite 安装后运行：

```bash
agent-suite install --vault "<vault>" --agents codex,claude --guidelines
```

安装器为 Codex 和 Claude Code 渲染英文完整版，在个人规则文件中维护 `agent-suite:start` / `agent-suite:end` 标记区，保留区外内容。重复执行会更新该区而非追加另一套规则。WorkBuddy、CodeBuddy 当前安装 Skills，不推测其全局规则位置。安装不注册未确认支持的宿主 hook。

公共模板保持可移植，真实路径只出现在本机配置与渲染后的规则中。已有旧规则时，检查区外是否保留重复全文；统一入口不会擅自删除用户自定义规则。

## 如何验证修改

检查中英规则表达一致、完整版与精简版独立、无私人路径。行为测试应同时包含错误建议、正确建议、合法偏好和新证据纠正助手，避免把独立判断训练成机械反驳。文本校验通过不代表已测得任务收益。

迁自 `Choysang/agent-working-guidelines`，保留原始历史；结构参考 [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)。[MIT License](LICENSE)。
