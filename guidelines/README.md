# 工作指南

[返回 Agent Suite](https://github.com/Choysang/agent-suite) · [English](README.en.md) · [单独下载](https://github.com/Choysang/agent-suite/releases/latest/download/guidelines.zip)

给 Agent 一份做事约定：先核对问题，主动推进，少加没用的复杂度，保留别人的改动，验证到什么程度就说明到什么程度。

## 选一个版本

| 你用什么 | 中文 | English | 怎样使用 |
|---|---|---|---|
| Codex / 终端代码 Agent | [Codex 版](codex/AGENTS.md) | [Codex edition](codex/AGENTS.en.md) | 放进项目根目录的 `AGENTS.md`；全局使用可放到 `~/.codex/AGENTS.md` |
| Claude 聊天 | [Claude 版](claude/INSTRUCTIONS.md) | [Claude edition](claude/INSTRUCTIONS.en.md) | 粘到 Claude 的个人偏好设置中 |
| Claude Code / 其他 Agent | [通用版](universal/AGENTS.md) | [Universal edition](universal/AGENTS.en.md) | Claude Code 使用项目 `CLAUDE.md`；其他工具按其规则入口加载 |

只取需要的一个版本就行。文件是文本，可以直接在 GitHub 打开复制；也可以下载本模块后再挑。

已有规则时，把需要的条目合进去。指南里的 `<vault>` 表示你的知识库绝对路径：用知识库时替换为实际路径，暂时不用就删掉相关条目。

## 这些规则管什么

- **独立判断**：区分事实、推断和假设，发现前提有问题就说明依据。
- **简单优先**：完成目标所需的事情先做好，再考虑增加复杂度。
- **精准改动**：找到问题所在，保留无关行为和他人的工作。
- **推进与验证**：在授权内把事情做完，如实说明检查结果和未验证项。
- **知识积累**：按需读知识库，把以后还能用的做法留下来。

## 和另外两个模块怎么配合

用[知识库](https://github.com/Choysang/agent-suite/tree/main/knowledge)时，在规则中填好知识库路径，让 Agent 开始任务前先读 `ROUTER.md`。

用[会话交接](https://github.com/Choysang/agent-suite/tree/main/handoff)时，长任务换会话前执行交接，再由新会话接手。

完整示例见[联合使用说明](https://github.com/Choysang/agent-suite/blob/main/docs/00-quickstart.md)。

## 来源与许可

迁自 `Choysang/agent-working-guidelines`，现在只在 Agent Suite 中维护。原始提交历史保留；结构参考了 [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)。

[MIT License](LICENSE)
