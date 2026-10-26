# 会话交接 · handoff

[返回 Agent Suite](https://github.com/Choysang/agent-suite) · [English](README_EN.md) · [单独下载](https://github.com/Choysang/agent-suite/releases/latest/download/handoff.zip)

长任务做到一半，要开新会话或换 Agent 时，把当前目标、约束、进度、决定和下一步封存成一个编号。新会话读取这个编号后继续。

交接包保存在**正在做的项目仓库**里；能读取到的用户原话、Git 记录和工作区快照也一起保留。拿不到原始会话记录时会标明回忆补录，接手时仍要核对现场。

## 安装

需要 **Node.js 24+** 和 **Git**。

1. 下载本模块，解压到准备长期保留的位置。
2. 在解压后的 `handoff` 目录中运行：

```bash
npm link
handoff install
```

`npm link` 提供 `handoff` 命令；`handoff install` 给检测到的 Claude Code、Codex、WorkBuddy、CodeBuddy 配置目录链接 Skill 并登记 `SessionStart` hook。配置写入不代表已经触发；自动提示还取决于宿主是否支持、启用并信任该 hook。Codex 可在 `/hooks` 查看和信任配置。

安装会修改这些 Agent 的个人配置。保留解压目录，移动或删除它会使命令和 Skill 链接失效。已有安装时，在这里重新运行两条命令即可切换来源。

其他能读写本地文件、执行命令的 Agent 可以直接读取 [skill/SKILL.md](skill/SKILL.md)，按同一个流程使用。

## 最常用的两步

在自己的项目 Git 仓库中操作：

| Agent | 当前会话封存 | 新会话接手 |
|---|---|---|
| Claude Code | `/handoff` | `/handoff 7` |
| Codex | `$handoff` | `$handoff 7` |

`7` 换成实际返回的编号。Skill 会先准备资料，由 Agent 填写简报和状态，再校验封存；接手会读取资料并检查工作区。

终端也可以查看交接：

```bash
handoff ls
handoff show 7 brief
handoff show 7 state
handoff show v7.3
```

编号是项目内的编号。跨项目使用 `<项目名>-<编号>`；跨机器先按下面的方式同步，并在接收端准备好相应项目。

## 和知识库怎么配合

交接负责让当前项目继续。项目结束后，再用[知识库](https://github.com/Choysang/agent-suite/tree/main/knowledge)的 `sink` 从交接链中整理经验和项目复盘。交接包留在项目里，不整包复制进知识库。

## 需要时再看

- **同步**：普通 `git push` 不会同步交接引用；需要共享时运行 `handoff sync origin`，会推送和拉取 `refs/handoff/*`，其中包含会话记录与快照。
- **并行与汇合**：Skill 支持 `fork`、`take`、`join`；具体步骤见 [Skill](skill/SKILL.md)。新 fork 必须明确每条 lane 的 `owns:`；空值为只读，路径支持末尾 `/**`，封存前拒绝越界写法和跨 lane 重叠（按斜杠统一、忽略大小写的路径比较）。这是协作约定，不隔离进程权限，旧交接仍可读取。`take/load` 会给出执行目录与分支，在其他 lane 认领时不会恢复文件到当前目录。分支合并和冲突处理仍由 Agent 完成。
- **中断恢复**：分叉工作区创建失败后，运行 `handoff recover` 或重试 `handoff seal`，继续原来的封存，不重复生成父交接。待恢复期间 `prepare` 不会覆盖恢复记录。
- **查看页面**：`handoff ui --port 4040` 打开本地只读看板；`handoff serve --port 4040` 启动同一 HTTP 服务，仅监听 `127.0.0.1`。看板按实际 `parents` 展示关系，每 5 秒轮询；数据端点为 `/api/status`、`/api/handoffs`、`/api/handoffs/<编号>`，不提供远程调度或写操作。
- **版本**：`handoff --version`；机器读取用 `handoff version --json`，实现版本与 bundle 协议版本分开报告。
- **协议与实现**：[协议](protocol/SPEC.md)、[架构](ARCHITECTURE.md)、[Agent 适配表](src/agents.ts)。
- **修改代码后验证**：`npm ci`、`npm test`、`npm run check`。

迁自 `Choysang/handoff`，现在只在 Agent Suite 中维护。原始提交历史保留。

2026-10-18：修复旧 Codex 会话续写遗漏、lane 所有权继承和分叉失败恢复；重写只读看板，移除未实现的 A2A、SSE 与自动仲裁宣称；补充版本入口和行为回归测试。

[MIT License](LICENSE)
