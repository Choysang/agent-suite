# 维护与迁移记录

[返回首页](../README.md)

## 以后改哪里

只维护 `Choysang/agent-suite`，三个目录各自负责一部分：

| 目录 | 内容 |
|---|---|
| `guidelines/` | Codex、Claude、通用版工作指南，中英文本 |
| `knowledge/` | 建库提示词、知识库规则、五个 Skill、Python 引擎和卡片模板 |
| `handoff/` | 交接 Skill、命令行程序、协议、Agent 适配与测试 |

首页负责介绍和导航；每个模块的 README 负责自己的安装与用法。规则正文、脚本与模板各保留一个维护位置。

## 怎样发布

改完提交到 `main`。知识库和交接工具的测试通过后，给需要发布的提交打版本标签并推送：

```bash
git tag v1.0.1
git push origin v1.0.1
```

`v1.0.1` 是后续版本的示例。`.github/workflows/release.yml` 会先跑测试，再从该标签的三个目录分别生成 `guidelines.zip`、`knowledge.zip`、`handoff.zip`，附带 `SHA256SUMS`，发布到 GitHub Releases。打包只读取 Git 已提交内容。

README 的下载链接始终指向最近一次正式发布。提交源码后需要发布版本，下载包才会更新；Git 用户可直接拉取源码。

安装了 handoff 的用户应保留原目录，更新其中的源码；换目录后重新运行 `npm link` 和 `handoff install`。知识库用户更新 Skills 与模板时，保留个人卡片、分类和偏好，不用安装资料覆盖整个知识库。

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
