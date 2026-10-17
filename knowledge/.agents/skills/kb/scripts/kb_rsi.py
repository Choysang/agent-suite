"""Pure, version-bound reuse feedback and bounded reading. No model or IO calls."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re

OUTCOMES = {"helpful": 1, "noop": 0, "misleading": -2}
STATES = {"candidate", "verified", "stale"}
DERIVED = {"rsi_status", "utility_score", "feedback_count", "last_verified", "feedback_log",
           "review_revision", "retrieved_count", "updated", "verified", "max_lines", "max_chars"}
HISTORY = re.compile(r"^(?:\d+[.、]\s*)?(?:变更记录|演进增量日志(?:\s*\(Evolution Changelog\))?|Evolution Changelog|Changelog)$", re.I)


def current_body(body: str) -> str:
    """Omit only history sections, respecting fences and following peer headings."""
    output = []
    fence = ""
    hidden_level = 0
    for line in body.splitlines(keepends=True):
        mark = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
        if mark:
            run = mark[1]
            if not fence:
                fence = run
            elif run[0] == fence[0] and len(run) >= len(fence):
                fence = ""
        elif not fence:
            heading = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", line)
            if heading:
                level = len(heading[1])
                if hidden_level and level <= hidden_level:
                    hidden_level = 0
                if not hidden_level and HISTORY.fullmatch(heading[2]):
                    hidden_level = level
        if not hidden_level:
            output.append(line)
    return "".join(output)


def revision(meta: dict, body: str) -> str:
    content = {key: value for key, value in meta.items() if key not in DERIVED}
    payload = json.dumps([content, current_body(body).replace('\r\n', '\n')],
                         ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def events(meta: dict) -> list[dict]:
    log = meta.get("feedback_log", [])
    if not isinstance(log, list):
        raise ValueError("feedback_log 必须是列表")
    seen = set()
    for event in log:
        if not isinstance(event, dict):
            raise ValueError("feedback_log 项必须是对象")
        if event.get("outcome") not in OUTCOMES:
            raise ValueError("feedback_log outcome 无效")
        for key in ("task", "revision", "reason", "at"):
            if not isinstance(event.get(key), str) or not event[key].strip():
                raise ValueError(f"feedback_log 缺 {key}")
        if not re.fullmatch(r"[0-9a-f]{64}", event["revision"]):
            raise ValueError("feedback_log revision 必须是内容 SHA256")
        dt.date.fromisoformat(event["at"])
        if event["outcome"] != "noop" and not str(event.get("evidence", "")).strip():
            raise ValueError("有用/误导反馈必须带证据定位")
        if event["task"] in seen:
            raise ValueError("同一卡片同一 task 只能结算一次")
        seen.add(event["task"])
    return log


def summary(meta: dict, body: str) -> dict:
    rev = revision(meta, body)
    log = events(meta)
    active = [event for event in log if event["revision"] == rev]
    helpful = [event for event in active if event["outcome"] == "helpful"]
    misleading = any(event["outcome"] == "misleading" for event in active)
    ready = len(helpful) >= 3 and not misleading
    state = meta.get("rsi_status", "candidate")
    if log:
        state = "stale" if misleading else "verified" if ready and meta.get("review_revision") == rev else "candidate"
    return {"revision": rev, "rsi_status": state,
            "utility_score": sum(OUTCOMES[event["outcome"]] for event in active),
            "feedback_count": len(active), "promotion_ready": ready,
            "last_verified": max((event["at"] for event in helpful), default="")}


def feedback(meta: dict, body: str, *, task: str, outcome: str, reason: str, evidence: str,
             expected_revision: str, today: dt.date, confirm_review: bool = False) -> tuple[dict, bool]:
    """One task = one observation; history survives edits but cannot validate new content."""
    if not task.strip() or not reason.strip() or outcome not in OUTCOMES:
        raise ValueError("feedback 需要 task、reason 和有效 outcome")
    if outcome != "noop" and not evidence.strip():
        raise ValueError("helpful/misleading 需要 --evidence（命令结果、提交或原文定位）")
    if expected_revision != revision(meta, body):
        raise ValueError("卡片已改变：先重新 read 并核对实际采用的版本，不能给未使用版本评分")
    log = events(meta)
    if not log and meta.get("rsi_status") == "stale":
        raise ValueError("历史卡片已被人工隔离；先复核修复并显式改为 candidate，再评价使用结果")
    event = {"task": task, "revision": expected_revision, "outcome": outcome,
             "reason": reason, "evidence": evidence, "at": today.isoformat()}
    previous = next((item for item in log if item["task"] == task), None)
    if previous:
        if any(previous[key] != event[key] for key in ("revision", "outcome", "reason", "evidence")):
            raise ValueError("task 已有不同反馈；不要覆盖原始观察或重复结算")
        if confirm_review and meta.get("review_revision") != expected_revision:
            raise ValueError("重试不升级治理状态；请在下一次独立复用后执行 review")
        return meta, False
    updated = {**meta, "feedback_log": [*log, event]}
    result = summary(updated, body)
    if confirm_review:
        if not result["promotion_ready"]:
            raise ValueError("晋升需当前版本至少 3 个独立 task 的有证据 helpful，且无 misleading")
        updated["review_revision"] = expected_revision
        result = summary(updated, body)
    for key in ("rsi_status", "utility_score", "feedback_count", "last_verified"):
        updated[key] = result[key]
    return updated, True


def lint(meta: dict, body: str) -> list[str]:
    errors = []
    if meta.get("kind") not in ("lesson", "playbook", "note", "tool", "source"):
        return ["缺有效 kind；继续使用现有 kind/when 契约"]
    when = meta.get("when")
    pending_tool = meta.get("kind") == "tool" and meta.get("adoption") == "candidate"
    if not pending_tool and (not isinstance(when, list) or not when or any(not isinstance(v, str) or not v.strip() for v in when)):
        errors.append("when 必须是非空场景列表")
    if "triggers" in meta:
        triggers = meta["triggers"]
        if not isinstance(triggers, list) or not triggers or any(not isinstance(v, str) or not v.strip() for v in triggers):
            errors.append("triggers 若提供，必须是非空列表；通常直接使用 when")
    if not isinstance(meta.get("rsi_status", "candidate"), str) or meta.get("rsi_status", "candidate") not in STATES:
        errors.append("rsi_status 只能是 candidate/verified/stale")
    text = current_body(body)
    for key, actual, default in (("max_lines", sum(bool(line.strip()) for line in text.splitlines()), 120),
                                  ("max_chars", len(text), 12000)):
        limit = meta.get(key, default)
        if type(limit) is not int or limit < 1:
            errors.append(f"{key} 必须是正整数")
        elif actual > limit:
            errors.append(f"{key} 超标：{actual} > {limit}；精简当前内容，原始证据保留在 source")
    try:
        summary(meta, body)
    except (ValueError, TypeError) as exc:
        errors.append(str(exc))
    return errors
