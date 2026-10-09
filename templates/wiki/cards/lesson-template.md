---
kind: lesson
title: "卡片标题：一句话讲清解决的特定问题"
summary: "规则要点：遇到 X 情况，使用 Y 方案解决"
tags: ["general/准则与规范"]
when:
  - "用户原话或遇到具体报错信息时（例如：'连接池超时 504'）"
  - "需要处理特定边界条件的场景"
not_when:
  - "明确的排除边界（例如：'单机本地内存环境不要使用此方案'）"
evidence: "实测" # 实测(Empirical) | 拍板(Decision) | 外部(External) | 推断(Inferred)
verified: "2026-10-09"
source: "项目源码或踩坑链接"
status: "active" # active(有效) | conflict(冲突) | superseded(已被更好方案替代)
created: 2026-10-09
---

## 做法
具体的操作步骤、代码片段或推荐配置。

## 为什么
为什么采用此方案？背后的根本原因或原理是什么？

## 边界
在什么情况下不能用？有什么已知的副作用？

## 变更记录
- 2026-10-09 新建
