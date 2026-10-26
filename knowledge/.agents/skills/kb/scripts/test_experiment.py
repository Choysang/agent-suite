"""Experiment ledgers compare observed results without evaluating or promoting rules."""
import json
from pathlib import Path
import subprocess
import sys

import pytest

import kb
from kb_engine import experiment
from test_kb import LESSON, write


@pytest.fixture
def prepared(tmp_path):
    vault = tmp_path / "vault"
    write(vault / kb.WIKI / "lessons/card.md", LESSON)
    patch = tmp_path / "candidate.diff"
    patch.write_text("-old behavior\n+one improved behavior\n", encoding="utf-8")
    manifest = tmp_path / "project" / "experiment.json"
    options = dict(vault=vault, task="project/improvement-1", hypothesis="same correctness with fewer tokens",
                   change=patch, baseline="commit:base", candidate="commit:candidate",
                   development=["dev-a"], acceptance=["holdout-a", "holdout-b"],
                   metrics={"success": "higher", "errors": "lower"}, costs=["tokens"],
                   cards=["30.Wiki/lessons/card.md"])
    return manifest, options


def add(manifest, phase="acceptance", variant="baseline", task="holdout-a", success=1, errors=0, tokens=100):
    return experiment.record(manifest, phase=phase, variant=variant, task=task,
                             metrics={"success": success, "errors": errors}, costs={"tokens": tokens},
                             evidence=f"test://{phase}/{variant}/{task}")


def test_manifest_freezes_diff_cards_and_disjoint_task_sets(prepared):
    path, options = prepared
    result = experiment.init(path, **options)
    manifest = experiment.read_manifest(path)
    assert result["status"] == "frozen" and len(manifest["cards"][0]["revision"]) == 64
    options["change"].write_text("later edit", encoding="utf-8")
    assert "later edit" not in experiment.read_manifest(path)["change"]["patch"]
    assert not experiment.result_directory(path).exists()
    with pytest.raises(FileExistsError):
        experiment.init(path, **options)


def test_overlapping_tasks_do_not_create_a_manifest(prepared):
    path, options = prepared
    options["acceptance"] = ["dev-a"]
    with pytest.raises(ValueError, match="不能重叠"):
        experiment.init(path, **options)
    assert not path.exists()


def test_edited_manifest_cannot_accept_or_report_old_results(prepared):
    path, options = prepared
    experiment.init(path, **options)
    add(path)
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["hypothesis"] = "changed after seeing results"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ValueError, match="manifest 已改变"):
        add(path, variant="candidate")
    with pytest.raises(ValueError, match="manifest 已改变"):
        experiment.report(path)


def test_results_are_idempotent_and_conflicting_retries_are_rejected(prepared):
    path, options = prepared
    experiment.init(path, **options)
    first = add(path)
    before = Path(first["path"]).read_bytes()
    assert add(path)["status"] == "duplicate"
    with pytest.raises(ValueError, match="不同结果"):
        add(path, success=0)
    assert Path(first["path"]).read_bytes() == before


@pytest.mark.parametrize("overrides", [{"task": "unplanned"}, {"tokens": -1}, {"tokens": float("nan")}, {"success": float("inf")}])
def test_invalid_results_do_not_create_files(prepared, overrides):
    path, options = prepared
    experiment.init(path, **options)
    with pytest.raises(ValueError):
        add(path, **overrides)
    assert not experiment.result_directory(path).exists()


def test_report_compares_identical_tasks_and_separates_unpaired_spend(prepared):
    path, options = prepared
    experiment.init(path, **options)
    add(path, success=0, errors=2, tokens=100)
    add(path, variant="candidate", success=1, errors=1, tokens=60)
    add(path, task="holdout-b", success=1, errors=0, tokens=200)
    result = experiment.report(path)
    acceptance = result["phases"]["acceptance"]
    assert acceptance["paired"] == 1 and not acceptance["complete"]
    assert acceptance["metrics"]["success"]["delta"] == 1
    assert acceptance["metrics"]["errors"]["improvement"] == 1
    assert acceptance["paired_costs"]["tokens"]["change_percent"] == -40
    assert acceptance["all_recorded_costs"]["tokens"] == 360
    assert acceptance["missing"] == [{"task": "holdout-b", "variants": ["candidate"]}]
    assert result["status"] == "incomplete" and result["automatic_promotion"] is False


def test_complete_experiment_only_requests_review_and_never_changes_card(prepared):
    path, options = prepared
    card = options["vault"] / kb.WIKI / "lessons/card.md"
    before = card.read_bytes()
    experiment.init(path, **options)
    for phase, tasks in (("development", options["development"]), ("acceptance", options["acceptance"])):
        for task in tasks:
            for variant in experiment.VARIANTS:
                add(path, phase=phase, task=task, variant=variant)
    result = experiment.report(path)
    assert result["status"] == "ready_for_review" and result["automatic_promotion"] is False
    assert card.read_bytes() == before


def test_report_rejects_corrupt_results_instead_of_partial_success(prepared):
    path, options = prepared
    experiment.init(path, **options)
    result = add(path)
    record = json.loads(Path(result["path"]).read_text())
    record["costs"] = {}
    Path(result["path"]).write_text(json.dumps(record))
    with pytest.raises(ValueError, match="costs"):
        experiment.report(path)


def test_experiment_cli_works_in_project_without_taxonomy(prepared):
    path, options = prepared
    def cli(*args):
        return subprocess.run([sys.executable, "-B", kb.__file__, "--vault", str(options["vault"]),
                               "experiment", *map(str, args)], capture_output=True, encoding="utf-8", timeout=15)
    result = cli("init", path, "--task", "project/cli", "--hypothesis", "less cost",
                 "--change", options["change"], "--baseline", "base", "--candidate", "next",
                 "--development", "dev", "--acceptance", "holdout", "--metric", "success:higher", "--cost", "tokens")
    assert result.returncode == 0, result.stderr
    result = cli("record", path, "--phase", "acceptance", "--variant", "baseline", "--task", "holdout",
                 "--metric", "success=1", "--cost", "tokens=100", "--evidence", "test:run")
    assert result.returncode == 0, result.stderr
    result = cli("report", path, "--json")
    assert result.returncode == 0 and json.loads(result.stdout)["status"] == "incomplete"
