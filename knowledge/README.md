# 知识库

[返回 Agent Suite](https://github.com/Choysang/agent-suite) · [English](README.en.md) · [单独下载](https://github.com/Choysang/agent-suite/releases/latest/download/knowledge.zip)

把文章、工具和做事经验保存成 Markdown 卡片。以后遇到相似问题，Agent 先查已有记录，再开始工作。你可以用 Obsidian 阅读和编辑，也可以直接使用文件夹。

## 知识库里有哪些功能

下面五个 Skill 都属于这个模块：

| 功能 | 做什么 | 可以怎么说 |
|---|---|---|
| [capture · 收资料](.agents/skills/capture/SKILL.md) | 收录文章、GitHub 项目、网页剪藏和粘贴文字 | 「存一下这个链接」「处理一下剪藏」 |
| [sink · 记经验](.agents/skills/sink/SKILL.md) | 记录解决办法与适用条件，项目结束后整理复盘 | 「沉淀一下刚才的经验」「复盘这个项目」 |
| [kb · 查知识库](.agents/skills/kb/SKILL.md) | 查经验和资料、建卡、检查格式、更新知识目录 | 「查查知识库里有没有类似问题」 |
| [daily · 待办与日志](.agents/skills/daily/SKILL.md) | 看待办、记完成事项和当天的工作 | 「开工」「加个待办」「这件事完成了」 |
| [tidy · 整理知识库](.agents/skills/tidy/SKILL.md) | 清收件箱、合并同类卡片、检查过时记录 | 「整理一下知识库」 |

Skill 负责告诉 Agent 怎么做，`kb.py` 负责检索、建卡、去重、校验和生成目录。网页阅读、总结与判断由你使用的 Agent 完成。

## 第一次使用

需要能读写本地文件的 Agent，以及 **Python 3.11+**。使用 Obsidian 是可选的。

1. 下载本模块，解压得到 `knowledge/`。
2. 准备另一个空目录作为自己的知识库。
3. 给 Agent 发下面这段话，把两处路径换成实际的绝对路径。

```text
安装资料在 <knowledge 目录的绝对路径>，
我的知识库在 <准备好的空目录绝对路径>。
请读取安装资料中的 BOOTSTRAP.md，按它的流程搭建我的知识库。
```

[BOOTSTRAP.md](BOOTSTRAP.md) 会引导 Agent 确认分类，复制规则、模板和 Skills，安装 PyYAML，生成 `ROUTER.md` 并检查结果。安装资料和个人知识库各自放在自己的目录里。

在知识库根目录中，Codex 可以发现 `.agents/skills/`；Claude Code 可以按引导配置 `.claude/skills/`。其他 Agent 可以直接读取相应 `SKILL.md`。从项目里访问知识库的方法见[联合使用说明](https://github.com/Choysang/agent-suite/blob/main/docs/00-quickstart.md)。

## 日常怎么用

- 丢一个链接或一篇文章，说「存一下」。
- 解决一个有复用价值的问题，说「沉淀一下经验」。
- 遇到新任务，说「先查查知识库」。
- 开始一天的工作，说「开工」。
- 项目做完，说「复盘这个项目」。

查资料时先看 `ROUTER.md`，再读匹配的目录、卡片和原文。写完卡片运行 `kb build`，知识目录就随卡片更新。

## 文件入口

| 文件 | 用途 |
|---|---|
| [BOOTSTRAP.md](BOOTSTRAP.md) | 建库步骤 |
| [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) | 知识库规则与 Claude Code 读取入口 |
| [taxonomy.example.yml](taxonomy.example.yml) | 分类与关键词示例 |
| [Templates/](Templates/) | 经验、项目、工具、资料、笔记和日志模板 |
| [.agents/skills/](.agents/skills/) | 五个 Skill，`kb` 目录中含 Python 脚本与测试 |
| [GUIDE.md](GUIDE.md) | 需要了解原理时再读的详细说明 |

卡片、原始资料、待办和个人偏好都保存在你自己的知识库中。公开分享前自行检查内容。

## 来源与许可

迁自 `Choysang/Obsidian-Wiki-llm`，现在只在 Agent Suite 中维护。方法参考 [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 和 [LLM Wiki v2](https://gist.github.com/rohitg00/2067ab416f7bbe447c1977edaaa681e2)。

[MIT License](LICENSE)
