# 三个模块一起用

[返回首页](../README.md)

按「开始一个项目 → 保存资料和经验 → 换会话 → 项目收尾」走一遍。每个模块都可以独立使用，不需要一次装齐。

## 1. 给 Agent 一份工作指南

在[工作指南](../guidelines/)里选适合你的版本：

- Codex：把 `guidelines/codex/AGENTS.md` 的内容放进项目根目录的 `AGENTS.md`。
- Claude Code：把 `guidelines/universal/AGENTS.md` 的内容放进项目根目录的 `CLAUDE.md`。
- Claude 聊天：把 `guidelines/claude/INSTRUCTIONS.md` 粘到个人偏好设置中。
- 其他 Agent：使用通用版，通过它支持的规则文件或自定义指令加载。

如果已有项目规则，把需要的条目合进去。使用知识库时，把指南里的 `<vault>` 替换成自己的知识库绝对路径。

## 2. 建自己的知识库

单独下载[知识库模块](../knowledge/)，准备一个空目录作为自己的知识库。给能读写本地文件的 Agent 发：

```text
知识库安装资料在 <下载后的 knowledge 绝对路径>。
目标知识库在 <我准备的空目录绝对路径>。
请读取安装资料里的 BOOTSTRAP.md，按它的流程帮我搭建。
```

Agent 会帮你确认分类，放入规则、模板、五个 Skill 和 `kb.py`，再生成 `ROUTER.md`。

如果在项目目录里做事，补一条规则：

```text
我的知识库在 <vault 的绝对路径>。
任务开始时读取该目录的 ROUTER.md，按路由只读相关内容。
需要知识库 Skill 时，读取该目录 .agents/skills/<名称>/SKILL.md 并执行；
运行知识库命令时使用该知识库的路径。
```

个人知识库放在自己的目录里；分享用的 Agent Suite 仓库保存模板和工具。

## 3. 收资料、记经验、查记录

这些动作都是知识库功能：

| 你想做什么 | 可以怎么说 | 对应 Skill |
|---|---|---|
| 收藏文章、项目、剪藏或文字 | 「存一下这个链接」「处理一下剪藏」 | `capture` |
| 记下解决问题的做法和条件 | 「沉淀一下刚才的经验」 | `sink` |
| 查以前的经验和资料 | 「查查知识库里有没有类似问题」 | `kb` |
| 看待办、记录完成事项 | 「开工」「加个待办」「这件事完成了」 | `daily` |
| 清收件箱、合并同类、检查过时卡片 | 「整理一下知识库」 | `tidy` |

在知识库根目录也可以直接运行脚本：

```bash
python .agents/skills/kb/scripts/kb.py find "会话交接"
python .agents/skills/kb/scripts/kb.py build
```

从项目目录访问另一个知识库时，用带引号的绝对路径，`--vault` 放在子命令前：

```bash
python "<vault>/.agents/skills/kb/scripts/kb.py" --vault "<vault>" find "会话交接"
```

## 4. 安装交接工具，换个会话继续

下载并解压[会话交接模块](../handoff/)，在 `handoff` 目录中运行（需要 Node.js 24+ 和 Git）：

```bash
npm link
handoff install
```

保留解压目录，命令和 Skill 都链接到这里。安装会配置个人 Agent 的 Skill 与 hook；支持情况见[交接介绍](../handoff/)。

之后回到自己的项目 Git 仓库：

- Claude Code：当前会话输入 `/handoff`，得到编号后在新会话输入 `/handoff 7`。
- Codex：当前会话输入 `$handoff`，在新会话输入 `$handoff 7`。
- 其他能执行本地命令的 Agent：让它读取 `handoff/skill/SKILL.md`，按流程操作。

`7` 是示例，使用实际返回的编号。同机切换会话直接使用；跨机器需要另外同步交接记录。

## 5. 收尾时复盘

告诉 Agent：

```text
复盘这个项目：结合项目文件和交接记录，整理最终做法、验证结果、
关键决策和踩过的坑。可复用的内容写进知识库，一次性进度留在项目里。
```

知识库的 `sink` 会整理项目档案和经验卡，再更新知识目录。

## 用 Git 只获取一个模块

例如只取知识库：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/Choysang/agent-suite.git
cd agent-suite
git sparse-checkout set knowledge
```

取工作指南就把 `knowledge` 换成 `guidelines`；取交接工具就换成 `handoff`。同时取两个模块，可以运行 `git sparse-checkout set guidelines knowledge`。后续用 `git pull` 更新。
