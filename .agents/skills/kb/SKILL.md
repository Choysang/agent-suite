---
name: kb
description: 查询或写入 第二大脑（Obsidian 知识库 30.Wiki：经验卡、项目档案、工具库、资料、笔记）。ROUTER 表之外还想在库里找经验或工具、确认某个工具或做法是否已收录、新建或修改知识卡片时使用。提供 kb 命令：find / new / intake / check / build。
---

# kb — 第二大脑引擎

Vault：`.`（vault 根目录）。完整规范在 Vault 的 `AGENTS.md`，这里只讲怎么操作。

下文 `kb` = `python .agents/skills/kb/scripts/kb.py`（装了 uv 也可以 `uv run --script` 运行）。

| 命令 | 做什么 |
|---|---|
| `kb find "任务描述" [-k 5] [--json]` | 按相关度列出卡片（BM25，中文按双字切词；标题、一句话、何时用加权） |
| `kb new <kind> <id> [--title 标题]` | 生成卡片骨架；kind 是 lesson / playbook / tool / source / note；id 就是文件名，全库唯一 |
| `kb intake <url> [--id slug]` | 按规范化 URL 去重；GitHub 仓库自动抓元数据和 README，生成待评估工具卡 |
| `kb check` | 只校验，不写文件 |
| `kb build` | 校验，并重新生成 `ROUTER.md` 与 `30.Wiki/routes/` |

卡片契约（frontmatter）：

- 共有：`kind`、`title`、`summary`（一句话）、`tags`（`30.Wiki/taxonomy.yml` 里的「域/主题」）、`when`（何时用：用户原话或症状）、`not_when`（何时不用）、`created`。
- lesson：`evidence`（实测/拍板/外部/推断）、`verified`、`source`、`status`（active/conflict/superseded）。
- playbook：`project`、`status`（active/done/paused）、`updated`、`source`。
- tool：`url`、`adoption`（candidate/reference/adopted/rejected）。
- source：`source`（原文地址或出处）。

改完任何卡片都运行 `kb build`；ERROR 修完再提交。
