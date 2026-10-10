# 从空目录搭建知识库

[模块介绍](README.md) · [完整方法说明](GUIDE.md)

需要 Python 3.11+ 和能读写本地文件的 Agent。先下载本模块，再准备一个独立的空目录作为知识库。在提示词中填好两处绝对路径；Agent 可以据此读取本地资料，不需要访问原来的仓库。

```text
你是我的知识库整理助手。
安装资料目录：<下载解压后的 knowledge 绝对路径>
目标知识库目录：<我的空目录绝对路径>

请从安装资料读取 AGENTS.md、taxonomy.example.yml 和 .agents/skills/，
在目标目录搭建知识库。资料目录只用来读模板，个人内容写到目标目录。
如果目标目录已有内容，先检查并合并，不覆盖已有规则和记录。

1. 先确认我的称呼、当前工作或学习重心、想积累的几个知识领域。
   根据实际需要设置分类、检索关键词和常见注意事项，不预设几十个分类。

2. 建立目录：
   00.Inbox/、10.Projects/、20.Areas/、40.Archive/、50.Daily/、Clippings/；
   30.Wiki/ 下建 lessons/、playbooks/、tools/、sources/、notes/、raw/、routes/。
   工作台放过程记录，30.Wiki 放可复用知识。

3. 从安装资料复制 .agents/skills/ 和 Templates/ 到目标目录。
   五个 Skill 是 capture、sink、kb、daily、tidy；kb/scripts/kb.py 是引擎。
   不复制资料仓库的 Git 历史，也不把目标知识库建在资料仓库里。
   在目标目录运行 python -m pip install "PyYAML>=6"；使用可用的 Python 3.11+。

4. 从 taxonomy.example.yml 生成 30.Wiki/taxonomy.yml，按我的领域调整。
   卡片 tags 只用这个词表中的「域/主题」，新主题先登记再使用。

5. 将安装资料的 AGENTS.md 复制到目标根目录，填好占位项。
   它负责卡片字段、路由、写入与合并规则。
   Claude Code 使用资料里的 CLAUDE.md 作为读取 AGENTS.md 的入口；
   为 Claude Code 配置 .claude/skills/：每个 Skill 目录链接到同一个
   .agents/skills/<名称>。不能建目录链接时复制并说明更新时要同步。
   Codex 在知识库目录使用 .agents/skills/。
   其他 Agent 直接读取对应的 SKILL.md。
   如果已有个人工作指南，合并规则，不保留两份相互冲突的全文。

6. 创建 memory.md 记录偏好，50.Daily/TODO.md 按工作/学习/其他分组。
   会议文件可选，没有就让 daily 跳过会议步骤。

7. 在目标目录建立或沿用 Git 仓库，提交前检查本次改动。
   忽略 Python 缓存、.intake/ 缓存与 Obsidian workspace 文件。
   个人知识库默认留在本地，不自动连接公开远端或上传个人内容。

8. 在目标知识库根目录运行：
   python .agents/skills/kb/scripts/kb.py build
   确认生成 ROUTER.md 和 30.Wiki/routes/，修好 ERROR 后再继续。
   没有卡片的新库允许出现空分类 WARN。

9. 让我提供一条资料，演示 capture 入库；查卡片确认能找到。
   演示 daily 开工；告诉我如何记经验、复盘和整理。
   汇报实际完成了什么、检查结果，以及未完成的配置。

日常只要说「存一下」「沉淀一下经验」「先查知识库」「开工」「整理一下」。
任务开始时先读取 ROUTER.md，只往下读相关路由和卡片。
写完卡片运行 kb build，让目录跟着内容更新。
```

从其他项目中使用这份知识库时，把知识库路径写进工作指南。给 Agent 明确路径后，它可以读取相应 Skill 并运行脚本，见[联合使用说明](https://github.com/Choysang/agent-suite/blob/main/docs/00-quickstart.md)。
