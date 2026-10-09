# OpenAI Codex 系统配置与行动指令 (CODEX.md)

> 放置在项目根目录或在 `~/.codex/config.toml` 中引用。

## 执行准则
1. **严格证据阶梯**：代码实测 > 架构决策 > 外部文档 > 逻辑推断。
2. **严禁破坏性重构**：任何改动必须是外科手术式、局部的，以最小代价满足测试需求。
3. **会话接力支持**：
   - 封存会话：运行 `$handoff` 或 `handoff seal`。
   - 接手会话：运行 `$handoff <id>` 或 `handoff load <id>`。
   - 认领后通读 `brief.md`（稳定项目提示词）和 `state.md`（动态状态），立即执行 `next` 步骤。
