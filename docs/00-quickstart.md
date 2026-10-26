# 快速入门：统一安装与独立模块

[返回首页](../README.md)

推荐完整套件使用统一入口；已有独立模块可以继续使用下方流程。需要 Node.js 24+、Python 3.11+、PyYAML 和 Git。

## 统一安装

先按 [BOOTSTRAP](../knowledge/BOOTSTRAP.md) 准备知识库；安装器要求已有 `30.Wiki/taxonomy.yml`，不替用户设计领域分类。

```sh
git clone https://github.com/Choysang/agent-suite.git
cd agent-suite
python -m pip install "PyYAML>=6"
npm link
agent-suite install --vault "<vault>" --agents codex,claude,workbuddy,codebuddy --guidelines
agent-suite doctor
agent-suite version --json
```

`<vault>` 换成真实路径。五个 vault Skills 指向源码，四种宿主使用同一份实现。Codex 的知识技能位于 `~/.agents/skills`，handoff 位于 `~/.codex/skills`；Claude、WorkBuddy、CodeBuddy 分别使用 `~/.claude/skills`、`~/.workbuddy-ai/skills`、`~/.codebuddy/skills`。替换的文件或目录会记录备份位置；重复执行可修复断链。

`--guidelines` 为 Codex 的 `~/.codex/AGENTS.md` 和 Claude Code 的 `~/.claude/CLAUDE.md` 写入托管标记区，保留其余文字。Claude Code 使用通用模板，Claude 网页版模板仍需在账户设置中使用。当前会话可能需要重载；doctor 只核对本机依赖和链接，不把链接存在当作 hook 已触发。统一安装不改宿主 hook 配置。

从任意项目运行：

```sh
agent-suite kb find "当前任务" --need "关键知识需求" --json
agent-suite kb read "30.Wiki/lessons/example.md" --json
agent-suite handoff --help
```

如有多个库，显式覆盖默认值：`agent-suite kb --vault "<另一个库>" find "任务"`。安装其他 Python 时加 `--python "<解释器路径>"`。需要查看改动计划可加 `--dry-run`；它不写入配置。

以下为独立模块与日常流程。

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

## 把经验变成可验收的候选

准备修改提示、规则或工具时，使用 [experiment 工作流](experiments.md) 冻结 Diff 和独立任务；记录实际运行质量、成本和出处。先检查缺失项与退化，再决定是否应用。日常 feedback 与候选实验的用途不同，不能互相替代。
