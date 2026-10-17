# Agent Suite

让 Agent 按约定做事，把有用的资料和经验留下来，换会话时接着干。

这里收集我日常使用的工作指南、知识库方法和会话交接工具。三个部分可以一起用，也可以只取你需要的那一个。

## 按需选择

| 模块 | 解决什么问题 | 单独下载 |
|---|---|---|
| [工作指南](guidelines/) | 让 Agent 先判断、少绕路，只改必要的地方，并如实说明验证结果 | [guidelines.zip](https://github.com/Choysang/agent-suite/releases/latest/download/guidelines.zip) |
| [知识库](knowledge/) | 收资料、记经验、查旧记录，用 Markdown 保存，支持在 Obsidian 中查看 | [knowledge.zip](https://github.com/Choysang/agent-suite/releases/latest/download/knowledge.zip) |
| [会话交接](handoff/) | 保存当前任务的目标、约束、进度和下一步，换会话或换 Agent 后继续 | [handoff.zip](https://github.com/Choysang/agent-suite/releases/latest/download/handoff.zip) |

**点模块名看介绍；点下载只获取那个模块。** 工作指南是配置文本，知识库带五个 Skill 和 Python 检索与治理引擎，会话交接带 Skill 与命令行工具。

## 一起怎么用

以做一个项目为例：

1. **开始前用工作指南**：告诉 Agent 怎样判断问题、推进任务和验证结果。
2. **做事时用知识库**：查以前的做法，收下有用的文章和工具，把解决问题的经验记成卡片。
3. **换会话时用交接**：封存当前现场，拿到编号，让下一个会话从下一步继续。
4. **收尾时回到知识库**：从项目和交接记录里整理可复用的经验。

交接记录跟着项目走，知识库保存以后还能用的资料和经验。`capture`、`sink`、`kb`、`daily`、`tidy` 都属于知识库，具体用法在[知识库介绍](knowledge/)里。

## 从哪里开始

- 只想让 Agent 更好配合你：先用[工作指南](guidelines/)。
- 想搭自己的知识库：按[知识库入门](knowledge/)准备一个空目录。
- 经常开新会话、换模型：安装[会话交接](handoff/)。
- 想三个一起用：看[联合使用示例](docs/00-quickstart.md)。

习惯用 Git 的人也可以[只检出一个模块](docs/00-quickstart.md#用-git-只获取一个模块)。下载包是发布时的版本，Git 获取的是当前源码。

## 后续维护

以后只维护 **`Choysang/agent-suite`**：工作指南改 `guidelines/`，知识库改 `knowledge/`，会话交接改 `handoff/`。发布一个版本时，自动生成三个独立下载包。

这三个模块分别迁自 `agent-working-guidelines`、`Obsidian-Wiki-llm` 和 `handoff`。原项目的提交历史已保留在本仓库，迁移记录与发布方式见[维护说明](docs/maintenance.md)。

[MIT License](LICENSE)

## 让经验接受反馈

知识库支持按需求补查证据、按实际采用结果记录版本绑定的反馈、隔离有反例的经验，并用正文预算控制上下文。handoff 记录知识引用与摩擦出处，阶段结束后再沉淀可复用结论；全局规则和工具的晋升需要独立验收及可回退的改动。

参见 [运行协议](knowledge/RSI.md) 和 [设计取舍](docs/rsi-design.md)。这是可检查的工程闭环，不代表已经证明递归能力提升。

已有知识库的标签、摘要和长文整理，参见 [全库整理方法](docs/knowledge-curation.md)：保留原文和验证历史，改善检索入口，个人内容不进入公开包。
