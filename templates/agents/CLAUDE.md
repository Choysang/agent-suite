# Claude Code 项目开发与行为准则

> 本文件放置在项目根目录（或 `~/.claude/CLAUDE.md`），Claude Code 启动时会自动读取并注入上下文。

## 角色定位与行为原则
- 默认使用**简体中文**进行技术沟通，回答精准、简洁、直击要害。
- **证据第一**：区分事实与推断。代码验证优先，严禁虚构命令结果或文件路径。
- **外科手术式改动**：只改动目标功能所需的最小代码行，严禁做无关重构或随意更改代码风格。
- **开箱技能支持**：
  - 会话换班/上下文快满：输入 `/handoff` 封存；新会话输入 `/handoff <id>` 接手。
  - 遇到踩坑解决：输入 `sink` 沉淀经验卡。
  - 外部链接与文章收录：输入 `capture <url>`。

## 常用命令与工作流
```bash
# 知识库维护
python .agents/skills/kb/scripts/kb.py check     # 校验知识库卡片格式
python .agents/skills/kb/scripts/kb.py build     # 重新编译渐进式路由表
python .agents/skills/kb/scripts/kb.py find "任务" # 检索过往经验与工具

# 会话接力
handoff ls                                       # 查看交接看板
handoff prepare                                  # 准备交接草稿
handoff seal                                     # 封存交接并获得编号
```
