# agent-suite

我把自己使用的 Agent 工作指南、知识入库方法和会话交接工具整理在这里，方便大家一起用。

你可以用这套方法约定 Agent 的工作方式，把文章和经验存进知识库，并在换会话时继续之前的任务。仓库里放的是 Skills、规则模板和使用说明，按需要选用即可。

## 这套方法分三部分

### 1. 工作指南

给 Agent 约定做事方式：核实事实、保留已有工作、只改与任务有关的内容，并如实说明做了什么、哪些还没验证。

不同 Agent 可以选择对应的规则版本。配置后让规则随任务加载，也可以用 [guidelines](skills/guidelines/SKILL.md) 在具体任务里提醒它：“按工作指南处理这个任务”。

### 2. 知识库

把文章、工具、排查经验和项目复盘存进本地知识库，遇到类似任务时再查阅。下面这些都是知识库里的功能，分别负责收资料、记经验、检索和日常维护：

| 知识库功能 | 用来做什么 | 可以怎么说 |
|---|---|---|
| [capture · 收资料](skills/capture/SKILL.md) | 收录文章、GitHub 项目、网页剪藏或粘贴的文字 | “存一下这个链接”“处理一下剪藏” |
| [sink · 记经验](skills/sink/SKILL.md) | 问题解决后记录做法和适用条件；项目结束后整理复盘 | “沉淀一下刚才的经验”“复盘这个项目” |
| [kb · 查找与维护](skills/kb/SKILL.md) | 查以前的经验和资料，检查卡片、更新知识目录 | “查查知识库里有没有类似问题” |
| [daily · 开工与待办](skills/daily/SKILL.md) | 看待办、记录完成事项和当天的工作 | “开工”“加个待办”“这件事完成了” |
| [tidy · 整理知识库](skills/tidy/SKILL.md) | 处理收件箱、合并重复内容、检查断链和过时记录 | “整理一下知识库” |

知识库用 Markdown 文件保存内容，可以用 Obsidian 查看。`capture` 收外部资料，`sink` 记自己的经验，`kb` 帮助以后找到它们；`daily` 和 `tidy` 按需要使用。

### 3. 会话交接

一个任务还没做完，需要换会话或换 Agent 时，用 [handoff](skills/handoff/SKILL.md) 保存目标、进度、重要决定和下一步。

在当前会话输入 `/handoff`，拿到编号后，在新会话输入 `/handoff 7` 接手。Codex 对应使用 `$handoff` 和 `$handoff 7`。这里的 `7` 换成实际返回的编号，新会话需要能访问对应项目的交接记录。

交接记录帮助当前任务继续；其中值得以后复用的经验，再通过知识库的 `sink` 保存。

## 怎么开始

可以先用工作指南。经常做长任务，就加上会话交接；想积累资料和经验，再配置知识库。

把下面这段发给能读写本地文件、执行命令的 Agent：

```text
帮我配置 https://github.com/Choysang/agent-suite。
先读 README 和 docs/00-quickstart.md，按我当前使用的 Agent 配置需要的部分。
把工作指南合并到已有规则中，保留原来的项目要求和已安装技能。
如果要用知识入库，先确认我的知识库目录；如果要用会话交接，检查 handoff 命令是否已安装。
```

会话交接需要另装 `handoff` 工具，知识入库需要配置本地知识库和 Python 环境。详细步骤见 [入门配置](docs/00-quickstart.md)。

## 一次任务怎么串起来

比如让 Agent 修复一个问题：

1. 开始前，按工作指南确认目标，并查知识库里有没有相关经验。配置好读取入口后，Agent 可以先看 `ROUTER.md` 这个知识目录，再读与任务有关的卡片。
2. 查到有用的文章或项目，把链接发给 Agent，说“存一下”。
3. 问题解决后，说“沉淀一下刚才的排查经验”，留下做法、证据和适用条件。
4. 需要换会话时，用 `handoff` 保存进度。在能访问同一项目交接记录的新会话里，输入返回的编号，核对现场后继续。
5. 项目结束后，说“复盘这个项目”，整理成以后可以参考的项目档案。

下次遇到类似任务，Agent 就能从知识库里查到这些资料和经验。

## 三个原项目

本仓库把三个项目的使用方法串在一起，具体实现和完整说明可以到原项目查看：

- [agent-working-guidelines](https://github.com/Choysang/agent-working-guidelines)：Agent 的工作原则，提供 Codex、Claude 账号和通用版本。
- [Obsidian-Wiki-llm](https://github.com/Choysang/Obsidian-Wiki-llm)：用 Markdown 卡片积累资料和经验，让 Agent 按任务查阅、入库和整理。
- [handoff](https://github.com/Choysang/handoff)：保存和接手会话的命令行工具，也包含并行任务的交接方法。

本仓库的 [skills/](skills/) 放方法和脚本，[templates/](templates/) 放规则与卡片示例，[docs/00-quickstart.md](docs/00-quickstart.md) 说明如何把三者配合使用。
