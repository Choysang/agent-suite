# 入门配置

按需要配置工作指南、知识库和会话交接。先让一个方法可用，再逐步加上其他部分。

## 先准备什么

| 要用的部分 | 需要的环境 |
|---|---|
| 工作指南 | 能加载项目规则或自定义指令的 Agent |
| 知识入库和整理 | 能读写本地文件、执行命令的 Agent；Python 3.11 或以上、PyYAML；一个本地知识库目录 |
| 会话交接 | Git 项目、Node.js 24 或以上，以及原项目的 `handoff` 命令行工具 |

知识库里的文件都是 Markdown，可以用 Obsidian 查看，也可以用普通编辑器。

先下载方法合集，再按下面三个部分配置：

```bash
git clone https://github.com/Choysang/agent-suite.git
```

## 1. 给 Agent 配工作指南

选择适合自己的版本，将需要的内容合并到已有规则中。

| 使用环境 | 指南入口 | 放在哪里 |
|---|---|---|
| Codex | [Codex 版](https://github.com/Choysang/agent-working-guidelines/blob/main/codex/AGENTS.md) | 项目根目录的 `AGENTS.md` |
| Claude Code | [本仓库的简版模板](../templates/agents/CLAUDE.md) | 项目根目录的 `CLAUDE.md`；使用其中的命令前，先完成下文的工具配置 |
| Claude 网页或账号指令 | [Claude 账号版](https://github.com/Choysang/agent-working-guidelines/blob/main/claude/INSTRUCTIONS.md) | 账号的自定义指令中；本地知识库和命令仍需具备相应访问能力 |
| 其他 Agent | [通用版](https://github.com/Choysang/agent-working-guidelines/blob/main/universal/AGENTS.md) | 按当前工具支持的规则文件或自定义指令入口配置 |

Codex 的规则文件和 Claude Code 的项目指令入口分别见 [OpenAI 官方说明](https://developers.openai.com/codex/guides/agents-md) 与 [Claude Code 官方说明](https://code.claude.com/docs/en/memory)。规则里已经有项目要求时，保留它们，合并共用原则即可。

## 2. 配置知识库

### 安装知识库技能

从本仓库的 `skills/` 中选择 `kb`、`capture`、`sink`、`daily`、`tidy`。复制或链接整个技能文件夹，保留 `SKILL.md` 和配套脚本。常见位置如下：

| Agent | 项目内的技能目录 | 用户级技能目录 |
|---|---|---|
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |

这些位置来自 [OpenAI Skills 文档](https://developers.openai.com/codex/skills) 和 [Claude Code Skills 文档](https://code.claude.com/docs/en/skills)。其他 Agent 按其当前文档配置。

知识库的五个技能建议先放在 `<你的知识库>/.agents/skills/` 下：`kb`、`capture`、`sink`、`daily`、`tidy`。Claude Code 等工具需要其他目录时，再从其技能目录链接到这里，让脚本和知识库规则使用同一份配置。

已有同名技能时先比较版本和本地修改。会话交接所需的运行工具按第 3 步安装；只复制本仓库的 `skills/handoff/` 还不能执行交接。

### 新建知识库

选择一个目录存放自己的知识，和下载的 `agent-suite` 仓库分开。可以把原项目的 [BOOTSTRAP.md](https://github.com/Choysang/Obsidian-Wiki-llm/blob/main/BOOTSTRAP.md) 发给 Agent，按引导完成建库。

最小配置需要：

- `AGENTS.md`：知识库的卡片格式、读取和写入规则，可参考 [原项目规范](https://github.com/Choysang/Obsidian-Wiki-llm/blob/main/AGENTS.md)。
- `.agents/skills/`：上述五个知识库技能及 `kb/scripts/kb.py`。
- `30.Wiki/taxonomy.yml`：知识分类表，可从 [分类示例](../templates/wiki/taxonomy.yml) 起步，改成自己的主题。
- `30.Wiki/` 下的 `lessons/`、`playbooks/`、`tools/`、`sources/`、`notes/` 和 `raw/`：分别存经验、项目档案、工具、资料、笔记和原文。
- `00.Inbox/`、`Clippings/`：放待处理资料和网页剪藏。要使用 `daily` 时，再准备 `50.Daily/TODO.md`；会议功能按自己的情况配置。

已经有知识库时，让 Agent 先检查现有结构和规则，只补缺少的部分。

### 改成自己的路径

本仓库的知识库技能仍保留了作者的本机路径。安装后，把各 `SKILL.md` 中的知识库路径和 `kb.py` 命令路径改成自己的实际位置，工作指南中的知识库路径也保持一致。`daily` 中的待办分组、会议文件按需要调整。

脚本可用 `--vault` 或环境变量 `KB_VAULT` 指定知识库目录；这只改变脚本操作的目录，技能说明里的路径仍要同步配置。

在知识库根目录运行：

```bash
python -m pip install "pyyaml>=6"
python .agents/skills/kb/scripts/kb.py --vault "." check
python .agents/skills/kb/scripts/kb.py --vault "." build
```

`check` 检查卡片和分类表，`build` 还会生成 `ROUTER.md` 与 `30.Wiki/routes/`。空库可能提示某些分类还没有内容；出现 `ERROR` 时，先按提示修复。

### 让新任务查得到知识

在 Agent 实际加载的规则文件里，加入下面这段，并填上自己的绝对路径：

```text
知识库目录：<你的知识库绝对路径>。
开始任务时，先读这个目录下的 ROUTER.md。
有相关主题才继续读对应卡片；目录没命中但库里可能有时，用 kb find 检索。
解决了值得复用的问题，用 sink 记经验；需要收录外部资料时，用 capture。
```

规则可以放在常用项目中，或按 Agent 支持的方式配置为用户级规则。生成 `ROUTER.md` 后，还需要把这个读取入口接到实际加载的规则里。

先用一句话检查读取是否可用：

```text
查查知识库里有没有关于“我正在处理的问题”的经验，告诉我读了哪些卡片。
```

第一次入库时，可以发一个文章链接说“存一下”，检查是否生成了带来源、适用条件的卡片，以及知识目录是否已更新。

## 3. 配置会话交接

完整运行工具在 [handoff 原项目](https://github.com/Choysang/handoff)，本仓库提供联合使用时的技能说明。

按原项目的安装方式，在准备存放工具的目录运行：

```bash
git clone https://github.com/Choysang/handoff.git
cd handoff
npm install
npm link
handoff install
```

`handoff install` 会尝试向支持的 Agent 注册技能和相关配置，以实际输出为准。已安装时先确认当前版本和配置，避免再用本仓库的副本覆盖它。

回到需要交接的 Git 项目，运行 `handoff ls`，确认命令可用。然后在 Agent 对话里使用：

| 操作 | Claude Code | Codex |
|---|---|---|
| 保存当前会话 | `/handoff` | `$handoff` |
| 接手返回的编号，例如 7 | `/handoff 7` | `$handoff 7` |

新会话需要能访问对应项目及其交接记录。让接手 Agent 先核对当前代码、未完成事项和下一步，再继续工作。不同机器之间的同步、并行任务和汇合方法见原项目说明。

## 配好以后怎么用

看到资料说“存一下”，解决问题说“沉淀一下”，换会话时交接，项目结束后复盘。下次任务开始时，先读知识目录，再查看相关卡片。

工作指南决定怎么做事，交接记录帮助当前任务继续，知识库保存以后还用得上的资料和经验。
