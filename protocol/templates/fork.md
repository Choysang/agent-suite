<!-- 示例。要并行时，把它复制成 fork.md 再改；没有 fork.md 就是普通接力。
每条 lane 得到一个子交接、一个分支 lane/<编号>-<名称>、一个兄弟目录 <仓库>@<编号>-<名称>。 -->

## lane: auth
next: 实现 refresh-token 轮换
accept: npm test -- auth 全绿
owns: src/auth/**, test/auth/**

这条 lane 的任务说明：边界、接口约定、不许碰的目录。

## lane: ui
next: 登录页接入新 token 接口
accept: e2e 登录用例通过
owns: src/ui/**
