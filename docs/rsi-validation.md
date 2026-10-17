# 本次验证记录

日期：2026-10-17。环境：Windows，Python 3.13.15，Node 24.19.0；本地验证，未运行远端 CI。

| 检查 | 基线 | 升级后 |
|---|---|---|
| `python -B -m pytest knowledge/.agents/skills/kb/scripts -q` | 17 通过 | 40 通过 |
| `python knowledge/.agents/skills/kb/scripts/kb.py --vault knowledge lint Templates` | 原来无命令 | 通过 |
| `npm test`（handoff） | 27 通过 | 28 通过 |
| `npm run check`（handoff） | 通过 | 通过 |
| 个人库 `kb check / build` | 通过 | 通过 |
| 真实库分项检索 | — | 相关需求找到候选，无匹配需求保留为空、coverage 未判断 |

新增用例覆盖版本失效、重复反馈、显式复核、反例隔离、预算、正文裁剪、候选回归、旧卡兼容、原子替换失败、外部编辑保护，以及 v2 可选投影对旧草稿的兼容。

本机 CLI 与已有 handoff Skill 的链接已统一到本仓库模块，已有配置与个人规则先留备份；个人知识库引擎/模板/治理入口同步。全局指令只追加简短协议，没有替换个人偏好。安装器额外添加的 Codex hook 已撤回，保留原有运行配置，不把未验证的宿主 hook 支持当作已生效。

已知边界：个人库有 3 张历史笔记超出新默认预算，其中一张有用户未提交修改，未自动裁剪。旧卡兼容检查通过不等于所有历史文本达到新预算。固定检索夹具不是独立任务评测，尚无长期效用或回答质量提升的实测结论；本轮没有给生产卡片写入测试评分。
