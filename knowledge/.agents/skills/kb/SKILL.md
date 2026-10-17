---
name: kb
description: 查询、读取和维护 Obsidian 知识卡片，按需求检索、反馈实际采用效果、校验预算和生成路由。提供 find/read/feedback/lint/new/intake/check/build。
---

# kb — 知识库引擎

规范以 Vault `AGENTS.md` 和 `RSI.md` 为准。以下 `kb` 指 `python "<vault>/.agents/skills/kb/scripts/kb.py" --vault "<vault>"`；从其他项目运行时始终用绝对路径。`KB_VAULT` 可设默认库。

| 命令 | 作用 |
|---|---|
| `kb find "任务" [-k 5] [--json] [--need "完整子需求"] [--include-stale]` | BM25 候选；need 可重复，每项独立召回，k 对每项生效；无命中不代表知识不存在 |
| `kb read <path> [--json] [--full]` | 读取卡片与 revision；默认隐藏历史正文和反馈明细，full 看全量 |
| `kb feedback <path> --task <id> --revision <hash> --outcome <outcome> --reason "影响" [--evidence "定位"] [--confirm-review]` | outcome 为 helpful/noop/misleading；结算实际采用结果，helpful/misleading 必须有证据，重复调用不重复加分 |
| `kb lint [path-or-dir]` | 检查 when、可选治理字段、正文行数和字符预算；默认检查 30.Wiki，明确路径可检查 Templates |
| `kb new <kind> <id> [--title 标题]` | 建卡；kind 为 lesson/playbook/note/source/tool，文件名即 id |
| `kb intake <url-or-clip> [--id slug]` | 去重并建资源骨架，不运行收录项目 |
| `kb check` / `kb build` | 校验既有卡片契约；build 同时重建路由 |

## 检索与读取

`find --json` 保留候选数组；含 path、kind、summary、when/not_when、source（字符串数组）、url、日期、证据、内容 revision 与复用状态。路径相对 vault。分项查询返回 requirements 和去重 candidates，每项 hits 按 path 引用，score 只属于该查询；coverage 始终为 unassessed，需要读正文和原文判断。

相关度优先，只有同分时参考复用反馈。stale 默认排除，include-stale 仅用于排查；不会恢复 superseded 经验或 candidate/rejected 工具。普通查询不记录曝光，不写文件。解析失败返回非零，错误写 stderr，不用部分结果伪装完整检索。

## 反馈与写入

先 `read --json`，记下实际采用卡片的 revision 和稳定 task ID（如项目/阶段/任务编号）；结束时记录观察和证据。续接沿用 ID，缺结果写待评价，不捏造 noop。内容改变后不得评价未采用的新版本。

至少三个独立、有证据的 helpful 产生 promotion_ready；复核证据独立性、反例与适用边界后，在符合条件的反馈中显式 confirm-review。任何 misleading 隔离当前版本，修复后按新版本重新评价。反馈不改变原始 evidence；计分不是概率或事实核验。

修改卡片后 lint，再 build；新建 lesson 默认推断，依据实际来源改成实测/拍板/外部，不能以刚创建或检索命中为验证。项目档案保留八节，当前方案原地整合，护栏可以去重或退役留痕。只提交本次文件。详细字段、锁恢复及晋升规范见 Vault `RSI.md`。
