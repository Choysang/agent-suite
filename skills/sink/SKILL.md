---
name: sink
description: 把经验沉淀进 choysun 的第二大脑。会话中踩坑并解决、找到不显然的做法、用户拍板了口径，或用户说「沉淀」「记一下经验」「复盘」时使用；项目或大更新收尾时用复盘模式写项目档案。
---

# sink — 沉淀

参数里有「复盘」就走复盘模式，否则走单条模式。规范以 Vault `AGENTS.md` 为准。`kb` = `python D:/zuomian/Obisidian/Knowledge/.agents/skills/kb/scripts/kb.py`。

## 单条模式

1. **挑经验**：从本次会话里找踩过的坑、验证有效的做法、用户拍板的口径。门槛是说得出下次在什么任务里会用到；项目进度、一次性修复、账号和密钥不收。2. **查同类**：每条先运行 `kb find "<一句话规则>"`。命中同主题、同对象的卡，就按 AGENTS.md 的「吸收」规则并进去；没有就 `kb new lesson <英文-slug> --title <标题>`。
3. **填卡**：`summary` 写一句可执行规则；`tags`；`when` 写任务说法或症状，可以带错误码；`not_when`；`evidence`；`source`。正文写做法、为什么、边界。
4. **收尾**：运行 `kb build`，再 `git add -A && git commit -m "sink: <摘要>"`。
5. **汇报**：分新建、合并、待用户拍板（更优、冲突）三类列出。

## 复盘模式

1. **收集**：本次会话，加上项目的交接链和 README、`git log`。项目用了 handoff 时：`handoff ls` 看交接链；最新交接的 `brief`（目标、验收、被否决的方案 → 档案的关键决策）和 `state`（决定与证据）；`handoff show <编号> history` 是逐次账本。没有 handoff 就读 HANDOFF 文档。只用能核实的信息，数字注明来源。
2. **找档案**：`kb find "<项目名>"`。已有档案就更新；没有就 `kb new playbook <项目-slug> --title <项目名>`。
3. **填 8 节**：`when` 写「做类似项目时用户会怎么说」；踩坑的每一条按单条模式写成经验卡，档案里只放 `[[卡片]]` 链接。
4. **收尾**：`kb build`，提交，汇报。
