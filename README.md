# ⚡ agent-suite

<p align="center">
  <img src="https://img.shields.io/badge/Agent_Skills-Collection-00f2fe?style=for-the-badge" alt="Agent Skills" />
  <img src="https://img.shields.io/badge/Supports-Claude_Code_|_Codex_|_Cursor_|_Antigravity-4facfe?style=for-the-badge" alt="Supports" />
  <img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>面向现代 AI 编程助手的 Agent Skill / 方法合集。即插即用，赋予你的 Agent 严谨的工程纪律、无损的接力记忆与持续复利的知识沉淀能力。</strong>
</p>

---

## 🔗 关联上游项目 (Upstream Projects)

本项目是以下三个核心开源项目的 **Skill / 方法合集统一实现**。每个 Skill 均深度绑定并驱动这三个底座：

| 项目 | 定位与核心价值 | 驱动的 Skills |
|---|---|---|
| 📜 **[agent-working-guidelines](https://github.com/Choysang/agent-working-guidelines)** | **行为准则与工程纪律**：明确代码质量红线、实测第一、微创切口防破坏性重构 | [`guidelines`](skills/guidelines/) |
| 🔄 **[handoff](https://github.com/Choysang/handoff)** | **跨会话接力与多工作区**：基于 Git 原生事件溯源的秒级无损接力、并行 Worktree 泳道 | [`handoff`](skills/handoff/) |
| 🧠 **[Obsidian-Wiki-llm](https://github.com/Choysang/Obsidian-Wiki-llm)** | **第二大脑知识库**：Karpathy LLM-Wiki 范式、多通道入库、L0–L2 渐进式路由 | [`capture`](skills/capture/)、[`sink`](skills/sink/)、[`kb`](skills/kb/)、[`daily`](skills/daily/)、[`tidy`](skills/tidy/) |

---

## 🛠️ 技能合集清单 (Skills Catalog)

所有方法均封装为符合业界标准的 **Agent Skill（`skills/<name>/SKILL.md`）**，支持直接软链或挂载至任意支持 Skill 规范的运行时：

| Skill 标识 | 中文名称 | 核心能力 (做什么 → 得到什么) | 触发方式 / 口令 | 关联项目 |
|---|---|---|---|---|
| [`guidelines`](skills/guidelines/) | **行动准则** | 约束 AI 行为：实测第一、外科手术式微创修改、拒绝幻觉与无关重构 | 默认常驻 / 执行前自检 | `agent-working-guidelines` |
| [`handoff`](skills/handoff/) | **会话接力** | 封存当前会话与未提交代码快照；换模型或新窗口输入编号秒级无损接棒 | `/handoff`、`$handoff` | `handoff` |
| [`capture`](skills/capture/) | **知识入库** | 收录外部 GitHub 仓库、深度文章链接、网页剪藏或聊天粘贴文本，查重写卡 | “存一下这个”、“处理剪藏” | `Obsidian-Wiki-llm` |
| [`sink`](skills/sink/) | **经验沉淀** | 排查搞定复杂 Bug 后沉淀单场景经验卡；项目收尾时提炼完整 Playbook 档案 | “沉淀经验”、“复盘” | `Obsidian-Wiki-llm` |
| [`kb`](skills/kb/) | **知识引擎** | 知识库校验、关键词/BM25 检索，自动编译 L0 渐进式全局路由表 (`ROUTER.md`) | `kb build`、`kb find` | `Obsidian-Wiki-llm` |
| [`daily`](skills/daily/) | **工作流日志** | 晨间开工任务检索、待办推进与自动生成结构化工作日志 | “开工”、“今天有什么” | `Obsidian-Wiki-llm` |
| [`tidy`](skills/tidy/) | **知识库整理** | 知识库同类卡片吸收合并（补充/细化/更优/冲突标记）、过期待办归档 | “整理知识库”、“tidy” | `Obsidian-Wiki-llm` |

---

## 🚀 极速安装与挂载 (Installation)

克隆本项目到本地任意目录：
```bash
git clone https://github.com/Choysang/agent-suite.git
cd agent-suite
```

### 1. 挂载到 Claude Code
将技能目录软链接到 Claude Code 的全局 Skills 目录：
```bash
# Linux / macOS
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/"* ~/.claude/skills/

# Windows (PowerShell)
Get-ChildItem -Path ".\skills" | ForEach-Object {
    New-Item -ItemType Junction -Path "$HOME\.claude\skills\$($_.Name)" -Target $_.FullName -Force
}
```
*提示：同时可将 `templates/agents/CLAUDE.md` 拷贝到 `~/.claude/` 享受默认常驻准则。*

### 2. 挂载到 OpenAI Codex
```bash
# 软链到 ~/.codex/skills/
mkdir -p ~/.codex/skills
ln -s "$(pwd)/skills/"* ~/.codex/skills/
```

### 3. 挂载到 Antigravity / Gemini
软链至当前项目的 `.agents/skills/` 或用户全局目录 `~/.gemini/antigravity/skills/` 即可被 Agent 自动识别。

### 4. 在 Cursor / Windsurf 中使用
对于暂未原生支持 Skills 规范的 IDE 助手，直接将 `templates/agents/.cursorrules` 复制到项目根目录即可直接激活全部行为规范。

---

## 💡 典型工作流协同场景

当各个 Skill 组合使用时，将形成极度丝滑的开发闭环：

```
                    【一次典型的日常工程开发闭环】

  [09:30 晨间开工] ────> 触发 daily：自动检索待办与 L0 知识库路由，进入就绪态
          │
          ▼
  [11:00 踩坑解决] ────> 遵循 guidelines 微创改动，调通后触发 sink 沉淀经验卡
          │
          ▼
  [15:00 换棒接力] ────> 会话打满，打 /handoff 封存；新会话打 /handoff 8 秒级接续
          │
          ▼
  [18:00 项目收尾] ────> 触发 sink 复盘 生成 Playbook，并由 kb build 刷新路由
```

---

## 📂 仓库结构

```
agent-suite/
├── skills/                            # 🛠️ 核心 Skill / 方法合集 (可直接软链挂载)
│   ├── guidelines/                    # 行为准则技能 (来自 agent-working-guidelines)
│   ├── handoff/                       # 会话接力技能 (来自 handoff)
│   ├── capture/                       # 知识入库技能 (来自 Obsidian-Wiki-llm)
│   ├── sink/                          # 经验沉淀技能 (来自 Obsidian-Wiki-llm)
│   ├── kb/                            # 知识库管理与路由编译引擎
│   ├── daily/                         # 每日开工与日志
│   └── tidy/                          # 定期知识整理
├── templates/                         # 📋 辅助模板库 (供非 Skill 环境复制生效)
│   ├── agents/                        # 各客户端 Prompt 模板 (CLAUDE.md / .cursorrules 等)
│   └── wiki/                          # 知识库初始结构骨架与 4 类卡片契约模板
└── docs/                              # 📖 深度进阶手册与各通道实操详解
```

---

## 🤝 贡献与扩展

`agent-suite` 是一个不断迭代扩展的 Skills 合集。欢迎提交 PR 贡献新的方法与工具 Skill！

**License**: [MIT](LICENSE)
