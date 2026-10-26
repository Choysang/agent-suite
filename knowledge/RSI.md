# 受控的经验改进闭环

本协议改进 Agent 的知识、流程与工具，不训练模型权重，也不承诺无限递归提升。卡片仍是唯一知识状态；反馈记录保存在卡片 frontmatter，路由和计分是投影。`handoff` 保存项目记录，两个模块通过可追溯引用连接，不相互写入。

## 三阶段流程

1. **Pre-flight**：按 ROUTER 渐进读取。复杂任务列关键需求，必要时 `find --need` 分项召回。用 `read --json` 读正文，核对边界、日期、冲突和原文；记录真正采用的卡片路径、revision 和稳定 task ID。命中、打开、引用、采用、有效是不同事件，不能混计。
2. **In-flight**：连续报错、方案回退或用户纠偏时，在当前项目记录简短摩擦条目：观察、错误假设、根因（已验证/待查）、修复与证据定位。优先修任务，已有 handoff state 就复用它；不强迫为一次报错新建知识卡，不复制密钥和整段日志。
3. **Post-flight**：先检查采用清单，有可观察结果才 `feedback`。证据不足则保留待评价，不能捏造 noop，也不阻断交接。再 `sink` 合并当前方案、提炼可复用失败教训；对变更卡运行 `lint`，再 `build`。只提交本轮文件。

## 字段兼容与评价

- 保留 `kind / when / not_when / evidence / status / adoption`，文件名仍是 id。`triggers` 是可选附加检索词，不替代 when，也不另加重复的 type/id。
- 新卡可声明 `rsi_status: candidate`、`max_lines: 60`（lesson，其他 120）、`max_chars: 6000`（lesson，其他 12000）。旧卡不强制批量改写，修改时逐步纳入预算。
- `feedback_log` 保存 task、内容 revision、outcome、reason、evidence、at。`utility_score`、`feedback_count`、`last_verified` 是当前版本的投影，不能手改当作证明。`retrieved_count` 不用反馈冒充；当前实现不收集曝光遥测。
- helpful +1、noop 0、misleading -2，只是整理线索，不是置信概率。helpful/misleading 都必须有证据定位。noop 不更新 last_verified；普通检索没有写入副作用。
- 同一卡片同一 task 只能结算一次；相同重试无副作用，不同重试报错。续接不换 task ID。内容或适用条件变化后，旧记录保留但不为新版本加分；旧 revision 不能写反馈。
- 当前版本存在一次有证据 misleading 即隔离为 stale，不让历史正分抵消反例。至少三个独立任务的有证据 helpful 仅产生 `promotion_ready`；还需复核这些证据的独立性、边界和反例，并在下一条符合条件的反馈中显式 `--confirm-review` 才标 verified。标签表示在记录场景中的复用经过审阅，不证明普遍正确，也不升级原有 evidence。
- 自动隔离记录 `quarantine_revision`，修复正文或适用条件产生新 revision 后重新以 candidate 评估；纯历史变化不改变版本。没有自动隔离标记的显式 `rsi_status: stale` 视为人工隔离，即使已有正反馈也不能自动解除。人工隔离时删除旧 `quarantine_revision`；复核修复后显式改为 candidate。旧卡没有反馈记录时沿用显式状态，它不是自动验证结果。

## 读取、预算与排序

`find` 保持相关度第一，仅同分时按复用状态/得分排序。stale 默认不进检索与生成路由；`--include-stale` 仅供排查，不恢复 superseded 经验或 candidate/rejected 工具。显式 `read` 可读隔离卡并显示状态。

`read` 默认隐藏反馈明细和变更记录；`--full` 可追溯全文。只移除历史章节本身，保留其后的同级边界章节，并识别代码围栏。历史不参与 BM25；正文以非空行数和字符数双重限额检查，避免把长文挤成一行绕过预算。字符数是体积代理，不宣称精确 token 数。

项目档案保留原有八节，原地更新当前方案；笔记保留当前结论、边界与反例、来源和变更记录。护栏可以去重、限定范围、退役，必须留下理由与出处。原始证据留在 raw / source / Git / 项目日志，不为压缩预算删除证据。

## 修改和晋升

`new/intake/feedback/build` 共用 `.kb-write.lock` 协调引擎写入；`feedback` 另用单卡写锁、版本核对、同目录临时文件和原子替换；重写 YAML 的排版，保留未知字段和正文。不要与编辑器同时编辑同一张卡。若进程崩溃留下 `.kb-write.lock` 或 `.feedback.lock`，先确认无写入者、检查原卡与 Git 差异，再手动删除锁重试；不自动抢锁。

`tidy` 将高频、跨场景有效经验列为晋升候选，不按分数自动修改全局规则。提案需要：复用记录、适用范围、一个最小改动、独立验收任务、上下文/执行成本与回滚提交。先优先放项目规则或局部 Skill；确实普适才提炼短全局规则，固定流程才脚本化。沿用已有授权，授权不足时先完成可审阅 Diff 再请求新增授权。

## 验证范围

`python -m pytest .agents/skills/kb/scripts -q` 包含反馈、读取、预算、兼容性及固定查询夹具。夹具回归验证排序和隔离，不等于真实任务效用提升。后续维护独立于规则设计的留出任务，比较遗漏需求、错误采用、成功率与上下文/运行成本；出现退化先回滚再分析，不修改测试答案迎合改动。

## 离线候选实验

`kb experiment init/record/report` 把候选研究与效果验收分开，实验文件保存在项目内。它不调用模型、不执行任务，也不自动改规则。

- `init <manifest.json>` 必填 task、hypothesis、change（UTF-8 diff 文件）、baseline、candidate、development、acceptance、metric 和 cost。任务列表不能重叠；metric 如 `success:higher`、`errors:lower`；cost 如 `tokens`、`usd`。可重复 `--card <path>` 固定实际采用卡片 revision。完整参数用 `kb experiment init --help` 查看。
- manifest 内保存 diff 正文及 SHA256、两个版本引用、任务列表、指标方向和成本单位。改变候选或评估协议须另建实验，不在看过结果后修改原清单。
- `record <manifest.json> --phase acceptance --variant candidate --task <id> --metric success=1 --cost tokens=1200 --evidence <原始结果定位>` 记录一次实际结果。所有声明的指标与成本都要填写。同任务同版本的相同重试幂等，不同结果不可覆盖；开发阶段与基线版本同理。
- `report <manifest.json> --json` 只比较同一任务两版本都有记录的成对结果，显示未完成任务、成对成本与全部已记录成本。`ready_for_review` 仅表示记录齐全，仍可能效果退化。

任务独立性、证据真伪和实际执行版本由复核者查原始运行记录；工具只验证记录结构和计算，不提供统计显著性或泛化保证。不要用本轮为了修复缺陷新增的单元测试，冒充针对提示词收益的独立验收任务。

## 写入恢复边界

新卡 ID 必须是单个合法文件名；全库重复 ID 与同名不同内容的原文都会拒绝覆盖。剪藏先保留原文再发布卡片，清理源文件失败可重试；路由先暂存全部产物，普通 I/O 失败时恢复已替换文件。多文件操作不宣称断电时的事务一致性，路由可重新 build。编辑器不参与引擎锁，不要同时编辑正在反馈的卡片。
