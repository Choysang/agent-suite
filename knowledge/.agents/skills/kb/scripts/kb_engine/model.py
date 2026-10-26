"""Card contracts and values shared by storage, retrieval and routing."""
from __future__ import annotations
from dataclasses import dataclass, field
from . import governance as rsi

WIKI = "30.Wiki"


ROUTES = f"{WIKI}/routes"


TAXONOMY = f"{WIKI}/taxonomy.yml"


INTAKE_CACHE = "00.Inbox/.intake"


RAW_CLIPS = f"{WIKI}/raw/clips"  # Web Clipper articles kept as L3 originals


NOT_CARDS = {"routes", "raw"}  # folders under 30.Wiki that hold no cards


KINDS = {  # kind: (folder, label); order = routing priority
    "lesson": ("lessons", "经验卡"),
    "playbook": ("playbooks", "项目档案"),
    "note": ("notes", "笔记"),
    "source": ("sources", "资料"),
    "tool": ("tools", "工具"),
}


CORE = ("title", "summary", "tags", "when", "created")


EXTRA = {
    "lesson": ("evidence", "verified", "source", "status"),
    "playbook": ("project", "status", "updated", "source"),
    "note": (),
    "source": ("source",),
    "tool": ("url", "adoption"),
}


STATE = {  # kind: (field, allowed values)
    "lesson": ("status", ("active", "conflict", "superseded")),
    "playbook": ("status", ("active", "done", "paused")),
    "tool": ("adoption", ("adopted", "reference", "candidate", "rejected")),
}


STATE_LABEL = {
    "active": "有效", "conflict": "⚠冲突", "superseded": "已替代", "done": "已完成", "paused": "暂停",
    "adopted": "在用", "reference": "参考", "candidate": "待评估", "rejected": "已否决",
}


EVIDENCE = ("实测", "拍板", "外部", "推断")


UNROUTED = {("lesson", "superseded"), ("tool", "candidate"), ("tool", "rejected")}


DEFAULTS = {"evidence": "推断", "status": "active", "adoption": "candidate"}


STALE_DAYS = 180


ROUTER_MAX_LINES = 80


BODY = {
    "lesson": "## 触发场景与报错特征\n\n## 错误假设与根因\n\n## 正确解法与适用边界\n\n## 变更记录\n\n- {date} 新建\n",
    "playbook": (
        "## 1. 项目画像\n\n- 目标：\n- 交付物：\n- 规模：\n- 技术栈：\n- 仓库与关键文件：\n\n"
        "## 2. 关键决策\n\n| 决策 | 选择 | 理由 | 被拒方案 |\n|---|---|---|---|\n\n"
        "## 3. 最终方案\n\n## 4. 结果与数字\n\n## 5. 踩坑 → 经验卡\n\n## 6. 可复用资产\n\n"
        "## 7. 下次起步清单\n\n- [ ] \n\n## 8. 遗留问题\n\n## 变更记录\n\n- {date} 新建\n"
    ),
    "note": "## 当前结论\n\n## 适用边界与反例\n\n## 来源\n\n## 变更记录\n\n- {date} 新建\n",
    "source": "## 核心要点\n\n## 关键信息\n\n## 对我的用处\n",
    "tool": "## 它解决什么\n\n## 怎么用\n\n## 和现有方案比\n\n## 风险与限制\n\n## 变更记录\n\n- {date} 入库\n",
}


@dataclass(frozen=True)
class Card:
    id: str
    path: str  # vault-relative posix path without ".md"
    meta: dict = field(compare=False, hash=False, repr=False)
    body: str = field(compare=False, hash=False, repr=False)

    @property
    def kind(self) -> str:
        return str(self.meta.get("kind") or "")

    @property
    def state(self) -> str:
        return str(self.meta.get(STATE[self.kind][0]) or "") if self.kind in STATE else ""

    @property
    def routed(self) -> bool:
        return (self.kind, self.state) not in UNROUTED and rsi.summary(self.meta, self.body)["rsi_status"] != "stale"

    def text(self, key: str) -> str:
        value = self.meta.get(key)
        return "" if value is None else str(value)

    def items(self, key: str) -> list[str]:
        value = self.meta.get(key)
        if value is None or value == "":
            return []
        return [str(v) for v in value] if isinstance(value, (list, tuple)) else [str(value)]


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)
    removed: list[str] = field(default_factory=list)
