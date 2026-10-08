---
name: tidy
description: 整理 第二大脑：处理 00.Inbox、合并同类卡片、修复校验问题、归档已完成的待办。用户说「整理一下知识库」「tidy」，或距离上次整理超过两周时使用。
---

# tidy — 整理

规范以 Vault `AGENTS.md` 为准。`kb` = `python .agents/skills/kb/scripts/kb.py`。

1. **收件箱**：`00.Inbox/` 和 `Clippings/` 里的链接、文章、剪藏走 `capture`；工作文件（xlsx、docx 等）移到 `10.Projects/` 或 `20.Areas/`；没价值的列给用户。
2. **合并**：找出上次 tidy 以来新增或修改的卡（`git log --since=<上次 tidy> --name-only -- 30.Wiki`），逐张 `kb find "<summary>"` 找同类，按吸收规则合并；「更优」和「冲突」列给用户拍板。
3. **体检**：`kb build` 把 ERROR 修完。WARN 里超过 180 天没验证的卡，列给用户确认是否仍成立。空主题、含义重叠的主题，提议合并（改 taxonomy 时同步改卡片标签）。
4. **待办**：`50.Daily/TODO.md` 里完成超过 30 天的项，移到 `50.Daily/TODO-done.md`。
5. **收尾**：`git add -A && git commit -m "tidy: <日期>"`，汇报控制在一屏内。
