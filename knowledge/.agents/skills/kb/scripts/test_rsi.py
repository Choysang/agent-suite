"""Governance tests use synthetic evidence; no production card receives test feedback."""
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys

import pytest

import kb
import kb_rsi as rsi
from test_kb import LESSON, TAXONOMY, TOOL, write

TODAY = dt.date(2026, 10, 17)


@pytest.fixture
def vault(tmp_path):
    write(tmp_path / kb.TAXONOMY, TAXONOMY)
    write(tmp_path / kb.WIKI / "lessons/prod-pull.md", LESSON)
    return tmp_path


def submit(meta, body, task, outcome="helpful", **kwargs):
    return rsi.feedback(meta, body, task=task, outcome=outcome, reason="observed in test",
                        evidence=f"test:{task}", expected_revision=rsi.revision(meta, body), today=TODAY, **kwargs)


def cli(vault, *args):
    return subprocess.run([sys.executable, "-B", kb.__file__, "--vault", str(vault), *args],
                          capture_output=True, text=True, encoding="utf-8", timeout=15)


def test_distinct_feedback_needs_review_and_misleading_quarantines_immediately():
    meta, body = kb.parse(LESSON)
    for task in ("a", "b", "c"):
        meta, _ = submit(meta, body, task)
    signal = rsi.summary(meta, body)
    assert signal["promotion_ready"] and signal["rsi_status"] == "candidate"
    meta, _ = submit(meta, body, "d", confirm_review=True)
    assert rsi.summary(meta, body)["rsi_status"] == "verified"
    meta, _ = submit(meta, body, "e", "misleading")
    signal = rsi.summary(meta, body)
    assert signal["utility_score"] == 2 and signal["rsi_status"] == "stale"
    assert meta.get("retrieved_count") is None


def test_retry_is_idempotent_and_conflicting_feedback_is_rejected():
    meta, body = kb.parse(LESSON)
    meta, changed = submit(meta, body, "task-1")
    again, changed = submit(meta, body, "task-1")
    assert not changed and again == meta and len(meta["feedback_log"]) == 1
    with pytest.raises(ValueError, match="不同反馈"):
        submit(meta, body, "task-1", "misleading")
    with pytest.raises(ValueError, match="至少 3"):
        submit(meta, body, "task-2", confirm_review=True)


def test_edit_invalidates_old_feedback_and_old_revision_cannot_be_scored():
    meta, body = kb.parse(LESSON)
    meta, _ = submit(meta, body, "task-1", "misleading")
    new_body = body + "新的已修正方案\n"
    signal = rsi.summary(meta, new_body)
    assert signal["rsi_status"] == "candidate" and signal["feedback_count"] == 0
    assert len(meta["feedback_log"]) == 1
    with pytest.raises(ValueError, match="卡片已改变"):
        rsi.feedback(meta, new_body, task="task-2", outcome="helpful", reason="r", evidence="e",
                     expected_revision=rsi.revision(meta, body), today=TODAY)
    meta["when"] = ["改变适用条件也须重新评价"]
    assert rsi.summary(meta, body)["feedback_count"] == 0


def test_noop_does_not_claim_verification_or_require_evidence():
    meta, body = kb.parse(LESSON)
    meta, _ = rsi.feedback(meta, body, task="x", outcome="noop", reason="采用后没有作用", evidence="",
                            expected_revision=rsi.revision(meta, body), today=TODAY)
    assert meta["last_verified"] == "" and meta["utility_score"] == 0
    with pytest.raises(ValueError, match="evidence"):
        rsi.feedback(meta, body, task="y", outcome="helpful", reason="r", evidence="",
                     expected_revision=rsi.revision(meta, body), today=TODAY)


def test_feedback_does_not_clear_a_legacy_manual_quarantine():
    meta, body = kb.parse(LESSON)
    with pytest.raises(ValueError, match="人工隔离"):
        submit({**meta, "rsi_status": "stale"}, body, "new-task")


def test_read_and_search_omit_history_but_keep_later_boundaries_and_fenced_headings(vault):
    path = vault / kb.WIKI / "lessons/prod-pull.md"
    content = LESSON + "\n## 变更记录\noldonlykeyword\n## 边界\ncritical boundary\n```md\n## 变更记录\nfenced text\n```\n"
    write(path, content)
    result = cli(vault, "read", "30.Wiki/lessons/prod-pull.md", "--json")
    assert result.returncode == 0, result.stderr
    body = json.loads(result.stdout)["body"]
    assert "oldonlykeyword" not in body and "critical boundary" in body and "fenced text" in body
    assert "oldonlykeyword" in cli(vault, "read", str(path), "--full").stdout
    assert kb.rank(kb.load(vault)[0], "oldonlykeyword") == []


def test_budget_checks_lines_and_long_single_lines_without_requiring_new_alias_fields():
    meta, body = kb.parse(LESSON)
    assert rsi.lint(meta, body) == []  # legacy kind/when remains sufficient
    assert any("max_lines 超标" in e for e in rsi.lint({**meta, "max_lines": 1}, "a\nb\n"))
    assert any("max_chars 超标" in e for e in rsi.lint({**meta, "max_chars": 10}, "x" * 11))
    assert rsi.lint({**meta, "max_lines": 1}, "ok\n## 变更记录\n" + "log\n" * 200) == []
    assert any("when" in e for e in rsi.lint({**meta, "when": []}, body))


def test_feedback_cli_preserves_body_and_unknown_metadata_and_releases_lock(vault):
    path = vault / kb.WIKI / "lessons/prod-pull.md"
    write(path, LESSON.replace("kind: lesson", "kind: lesson\ncustom: keep-me"))
    meta, before = kb.read_card_file(path)
    args = ("feedback", str(path), "--task", "project:stage-1", "--revision", rsi.revision(meta, before),
            "--outcome", "misleading", "--reason", "反例", "--evidence", "test:counterexample")
    result = cli(vault, *args)
    assert result.returncode == 0, result.stderr
    meta, after = kb.read_card_file(path)
    assert before == after and meta["custom"] == "keep-me" and meta["utility_score"] == -2
    first_bytes = path.read_bytes()
    assert cli(vault, *args).returncode == 0 and path.read_bytes() == first_bytes
    assert not list(path.parent.glob("*.lock")) and not list(path.parent.glob("*.tmp"))
    assert json.loads(cli(vault, "find", "生产机", "--json").stdout) == []
    assert len(json.loads(cli(vault, "find", "生产机", "--include-stale", "--json").stdout)) == 1
    assert "feedback_log" not in json.loads(cli(vault, "read", str(path), "--json").stdout)["metadata"]
    assert "feedback_log" in cli(vault, "read", str(path), "--full").stdout
    assert kb.build(vault, TODAY).errors == []
    assert "prod-pull" not in (vault / "ROUTER.md").read_text(encoding="utf-8")
    assert "prod-pull" not in (vault / kb.ROUTES / "ops.md").read_text(encoding="utf-8")


def test_feedback_path_and_lock_boundaries(vault):
    with pytest.raises(ValueError, match="30.Wiki"):
        kb.card_path(vault, "../outside.md")
    with pytest.raises(ValueError, match="原文"):
        kb.card_path(vault, "30.Wiki/raw/a.md")
    path = vault / kb.WIKI / "lessons/prod-pull.md"
    lock = path.with_suffix(".md.feedback.lock")
    lock.write_text("other writer", encoding="utf-8")
    with pytest.raises(ValueError, match="写入正在进行"):
        kb.apply_feedback(path)
    assert lock.read_text(encoding="utf-8") == "other writer"


def test_lint_cli_checks_templates_errors_and_missing_targets(vault):
    assert cli(vault, "lint").returncode == 0
    write(vault / kb.WIKI / "notes/bad.md", "---\nkind: note\nwhen: []\n---\na\n")
    result = cli(vault, "lint")
    assert result.returncode == 1 and "bad.md" in result.stderr
    assert cli(vault, "lint", "missing").returncode == 1


def test_golden_retrieval_replay(vault):
    base, body = kb.parse(LESSON)
    helpful = base
    for index in range(3):
        helpful, _ = submit(helpful, body, f"task-{index}", confirm_review=index == 2)
    cards = [kb.Card("baseline", "30.Wiki/lessons/baseline", base, body),
             kb.Card("validated", "30.Wiki/lessons/validated", helpful, body),
             kb.Card("stale", "30.Wiki/lessons/stale", {**base, "rsi_status": "stale"}, body)]
    tool, tool_body = kb.parse(TOOL)
    cards.append(kb.Card("trivy", "30.Wiki/tools/trivy", tool, tool_body))
    cases = json.loads((Path(__file__).parent / "fixtures/retrieval-cases.json").read_text(encoding="utf-8"))
    for case in cases:
        ids = [card.id for _, card in kb.rank(cards, case["query"], 10)]
        assert (ids[0] if ids else None) == case["first"], case
        assert "stale" not in ids
    # A popular unrelated card never wins against a relevant tool.
    assert kb.rank(cards, "镜像漏洞扫描")[0][1].id == "trivy"


def test_failed_atomic_replace_preserves_card_and_cleans_own_files(vault, monkeypatch):
    path = vault / kb.WIKI / "lessons/prod-pull.md"
    original = path.read_bytes()
    meta, body = kb.read_card_file(path)
    def fail_replace(*args):
        raise OSError("simulated replace failure")
    monkeypatch.setattr(kb.os, "replace", fail_replace)
    with pytest.raises(OSError, match="simulated"):
        kb.apply_feedback(path, task="x", outcome="helpful", reason="r", evidence="e",
                          expected_revision=rsi.revision(meta, body), today=TODAY)
    assert path.read_bytes() == original
    assert not list(path.parent.glob("*.tmp")) and not list(path.parent.glob("*.lock"))


def test_concurrent_editor_is_not_overwritten(vault, monkeypatch):
    path = vault / kb.WIKI / "lessons/prod-pull.md"
    meta, body = kb.read_card_file(path)
    apply = rsi.feedback
    changed = LESSON + "\n其他编辑者的内容\n"
    def edit_during_feedback(*args, **kwargs):
        result = apply(*args, **kwargs)
        path.write_text(changed, encoding="utf-8")
        return result
    monkeypatch.setattr(rsi, "feedback", edit_during_feedback)
    with pytest.raises(ValueError, match="其他编辑者"):
        kb.apply_feedback(path, task="x", outcome="helpful", reason="r", evidence="e",
                          expected_revision=rsi.revision(meta, body), today=TODAY)
    assert path.read_text(encoding="utf-8") == changed


def test_build_keeps_previous_routes_when_budget_validation_fails(vault):
    assert not kb.build(vault, TODAY).errors
    router = (vault / "ROUTER.md").read_bytes()
    path = vault / kb.WIKI / "lessons/prod-pull.md"
    write(path, LESSON.replace("status: active", "status: active\nmax_lines: 1") + "too many lines\n")
    assert any("max_lines" in error for error in kb.build(vault, TODAY).errors)
    assert (vault / "ROUTER.md").read_bytes() == router
