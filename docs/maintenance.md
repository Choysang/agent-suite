# 维护与升级

[返回首页](../README.md) · [模块边界](architecture.md)

## 单一源码与部署

完整安装的代码来自同一个 checkout。`src/` 负责入口，`knowledge/` 负责知识和实验，`handoff/` 负责接力，`guidelines/` 负责行为约定。私人卡片、taxonomy、偏好、项目 Git 交接数据不会随公开包分发。

更新前查看工作区状态和远端差异。取得预期版本后安装依赖、验证，再运行安装器和诊断：

```sh
npm ci
npm ci --prefix handoff
python -m pip install PyYAML pytest
npm run verify
agent-suite install --vault "<vault>" --agents codex,claude,workbuddy,codebuddy --guidelines
agent-suite doctor --json
agent-suite kb check
agent-suite kb build
```

不要用自动 reset 覆盖未提交工作。源码路径改变后从新目录重新 `npm link`、`agent-suite install`。独立知识模块更新时同步整个 `scripts/` 包，不能只复制 `kb.py`；独立 handoff 继续使用其安装命令。

配置在 `~/.agent-suite/config.json`，测试可以用 `AGENT_SUITE_HOME` 隔离。安装器将被替换的目录或文件重命名到备份处，返回原路径与备份路径。备份始终留在目标实际目录所在文件系统：Skill 备份放在其真实 skills 父目录的 `.agent-suite/backups/`，指南备份放在指南真实父目录的 `.agent-suite/backups/`。直接指定另一磁盘的宿主目录和通过目录链接搬迁均适用，以安装结果返回的路径为准。宿主和 vault 共用物理目录时，每个目标只安装一次。常规失败会撤回已经完成的操作，再写配置表示成功。断电后的状态须用 doctor 检查；按返回的备份路径恢复，不删除私人内容。

托管指南只维护 `agent-suite:start/end` 区块，原有非托管文字保持不变。首次迁移旧版完整指南时应检查重复规则，保留用户自定义内容后再整合。`RSI.md` 和个人工作指南属于文档，升级时核对并合并当前版本；它们不会被 Skills 链接替换。Obsidian vault 的 Git 可忽略 `.agent-suite/` 备份和机器特定的引擎链接，不上传到公开仓库。

## 检查与发布

`agent-suite config --json` 是 Skills 读取 vault 和源码位置的统一入口，与当前工作目录无关。`--guidelines` 的选择保存在配置中，后续无参数 `install` 会继续更新托管区；`doctor` 检查其内容漂移和破损标记。宿主目录复用 handoff 的注册表，支持 `CODEX_HOME`、`CLAUDE_CONFIG_DIR`、`WORKBUDDY_CONFIG_DIR` 和 `CODEBUDDY_CONFIG_DIR`；Codex 的通用 Skills 仍使用 `~/.agents/skills`。改变目录环境变量后重新安装并诊断。

个人称呼、会议来源和工作习惯保留在 vault 规范中；共享 Skill 不再嵌入机器路径或默认当前目录。升级旧定制 Skill 前核对差异，将仍适用的个人规则迁入 vault 规范；备份保留原文件。

`npm run verify` 执行根安装测试、知识模块测试、模板 lint、handoff 测试、TypeScript 检查，以及指南本机路径检查。CI 对 Windows 和 Linux 运行同一入口。本机通过与远端 CI 通过要分别报告。

有用户可见变动时，README 更新记录须包含日期、源码版本/发布状态、行为变化和验证入口。经验证提交后，推送新的版本标签才生成 Release。`.github/workflows/release.yml` 从提交内容生成 `agent-suite.zip` 和三个独立模块 zip，并附 SHA256SUMS。源码 main 领先 Release 时不得宣称下载包已更新。

Prompt、检索或编排候选通过单元测试并不证明任务收益。使用 [experiment](experiments.md) 保留开发与独立验收任务的质量、成本、反例和原始证据；报告只做计算，不自动晋升。变更回退使用明确的 revert 或安装备份，保留其他人的工作。

## 原项目迁移

2026-10-10 导入了以下三个公开仓库：

| 原仓库 | 新位置 | 导入的原始提交 |
|---|---|---|
| `Choysang/agent-working-guidelines` | `guidelines/` | `87c1e39849c2d430bdbba408cccd3cc316814c20` |
| `Choysang/Obsidian-Wiki-llm` | `knowledge/` | `19de0a4773a83e5dedc737723c9844820e3d9dcd` |
| `Choysang/handoff` | `handoff/` | `7ab67f4e7254759fa1a1aec094211883339393fa` |

通过未压缩的 Git subtree 合并保留原始提交历史。导入后先核对了三个目录的 Git tree，均与原始提交一致，再整理入口和说明。

整理时移除了旧 Agent Suite 中重复的 `skills/`、`templates/` 与分散教程；工作指南按三种版本保留正文；知识库内部保留五个 Skill；handoff 的 CLI、协议、适配器和测试完整保留。安装与引导不再依赖旧仓库地址，下载包只包含对应模块。

迁移前另行保存了原仓库镜像、可恢复的 Git bundle 和仓库元数据。handoff 原仓库的项目交接引用包含在本地备份中，不放进分享用的模块下载包。个人 Obsidian 知识库内容未参与迁移。

原有许可证分别保留；handoff 的 `package.json` 已声明 MIT，本次补齐许可证文件。工作指南仍保留 Caixin Cai 的版权声明。
