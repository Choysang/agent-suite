"""Frozen, project-local candidate experiments. No model calls or rule promotion."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
from pathlib import Path

from . import governance
from .repository import card_path, read_card_file
from .storage import atomic_write, file_lock

SCHEMA = "agent-suite.experiment/v1"
PHASES = ("development", "acceptance")
VARIANTS = ("baseline", "candidate")


def encode(value: dict) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode("utf-8")


def fingerprint(value: dict) -> str:
    payload = {key: item for key, item in value.items() if key != "manifest_id"}
    return hashlib.sha256(encode(payload)).hexdigest()


def text(value, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} 必须是非空文字")
    return value


def unique_strings(value, field: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{field} 必须是非空列表")
    for item in value:
        text(item, field)
    if len(set(value)) != len(value):
        raise ValueError(f"{field} 不能重复")
    return value


def validate_manifest(manifest: dict) -> None:
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("实验 schema 无效")
    for field in ("task", "hypothesis", "created"):
        text(manifest.get(field), field)
    tasks = manifest.get("tasks")
    if not isinstance(tasks, dict) or set(tasks) != set(PHASES):
        raise ValueError("实验须同时声明 development 和 acceptance 任务")
    for phase in PHASES:
        unique_strings(tasks[phase], phase)
    if set(tasks["development"]) & set(tasks["acceptance"]):
        raise ValueError("开发任务和独立验收任务不能重叠")
    variants = manifest.get("variants")
    if not isinstance(variants, dict) or set(variants) != set(VARIANTS):
        raise ValueError("实验须冻结 baseline/candidate 的版本引用")
    for variant in VARIANTS:
        text(variants[variant], variant)
    if variants["baseline"] == variants["candidate"]:
        raise ValueError("baseline 和 candidate 必须是不同版本")
    change = manifest.get("change")
    if not isinstance(change, dict):
        raise ValueError("实验缺少冻结改动")
    patch = text(change.get("patch"), "change.patch")
    text(change.get("source"), "change.source")
    if change.get("sha256") != hashlib.sha256(patch.encode("utf-8")).hexdigest():
        raise ValueError("冻结改动的 SHA256 不一致")
    metrics = manifest.get("metrics")
    if not isinstance(metrics, dict) or not metrics:
        raise ValueError("实验须声明指标及 higher/lower 方向")
    for name, direction in metrics.items():
        text(name, "metric name")
        if direction not in ("higher", "lower"):
            raise ValueError("指标方向只能是 higher/lower")
    unique_strings(manifest.get("costs"), "costs")
    cards = manifest.get("cards")
    if not isinstance(cards, list):
        raise ValueError("cards 必须是列表")
    for card in cards:
        if not isinstance(card, dict):
            raise ValueError("card 必须是对象")
        text(card.get("path"), "card.path")
        revision = text(card.get("revision"), "card.revision")
        if len(revision) != 64 or any(char not in "0123456789abcdef" for char in revision):
            raise ValueError("card.revision 必须是内容 SHA256")
    if manifest.get("manifest_id") != fingerprint(manifest):
        raise ValueError("实验 manifest 已改变；保留原实验并为新候选 init 新文件")


def read_manifest(path: Path) -> dict:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    validate_manifest(manifest)
    return manifest


def init(path: Path, *, vault: Path, task: str, hypothesis: str, change: Path,
         baseline: str, candidate: str, development: list[str], acceptance: list[str],
         metrics: dict[str, str], costs: list[str], cards: list[str]) -> dict:
    patch = change.read_text(encoding="utf-8")
    adopted = []
    for target in dict.fromkeys(cards):
        card = card_path(vault, target)
        meta, body = read_card_file(card)
        adopted.append({"path": card.relative_to(vault.resolve()).as_posix(),
                        "revision": governance.revision(meta, body)})
    manifest = {"schema": SCHEMA, "task": task, "hypothesis": hypothesis,
                "created": dt.datetime.now(dt.timezone.utc).isoformat(),
                "change": {"source": str(change.resolve()), "patch": patch,
                           "sha256": hashlib.sha256(patch.encode("utf-8")).hexdigest()},
                "variants": {"baseline": baseline, "candidate": candidate}, "cards": adopted,
                "tasks": {"development": development, "acceptance": acceptance},
                "metrics": metrics, "costs": costs}
    manifest["manifest_id"] = fingerprint(manifest)
    validate_manifest(manifest)
    atomic_write(path.resolve(), encode(manifest), create=True)
    return {"status": "frozen", "path": str(path.resolve()), "manifest_id": manifest["manifest_id"]}


def measurements(values: dict, names, field: str, *, nonnegative: bool = False) -> None:
    if not isinstance(values, dict) or set(values) != set(names):
        raise ValueError(f"{field} 必须完整匹配冻结的指标：{', '.join(names)}")
    for name, value in values.items():
        if type(value) not in (int, float) or not math.isfinite(value) or (nonnegative and value < 0):
            raise ValueError(f"{field}.{name} 必须是有限数值" + ("且非负" if nonnegative else ""))


def validate_record(manifest: dict, record: dict) -> None:
    if not isinstance(record, dict) or record.get("manifest_id") != manifest["manifest_id"]:
        raise ValueError("结果不属于当前冻结实验")
    phase, variant, task = (record.get(key) for key in ("phase", "variant", "task"))
    if phase not in PHASES or variant not in VARIANTS or task not in manifest["tasks"][phase]:
        raise ValueError("结果的阶段、版本或任务不在冻结清单中")
    if record.get("version") != manifest["variants"][variant]:
        raise ValueError("结果的版本引用与 manifest 不符")
    text(record.get("evidence"), "evidence")
    text(record.get("at"), "at")
    measurements(record.get("metrics"), manifest["metrics"], "metrics")
    measurements(record.get("costs"), manifest["costs"], "costs", nonnegative=True)


def result_directory(path: Path) -> Path:
    return path.with_name(path.name + ".results")


def record(path: Path, *, phase: str, variant: str, task: str, metrics: dict,
           costs: dict, evidence: str) -> dict:
    path = path.resolve()
    manifest = read_manifest(path)
    value = {"manifest_id": manifest["manifest_id"], "phase": phase, "variant": variant,
             "task": task, "version": manifest["variants"].get(variant), "metrics": metrics,
             "costs": costs, "evidence": evidence, "at": dt.datetime.now(dt.timezone.utc).isoformat()}
    validate_record(manifest, value)
    key = hashlib.sha256(json.dumps([phase, variant, task], ensure_ascii=False).encode()).hexdigest()
    directory = result_directory(path)
    with file_lock(directory / ".write.lock", wait_seconds=5):
        if read_manifest(path)["manifest_id"] != manifest["manifest_id"]:
            raise ValueError("实验在记录期间改变，请检查原文件")
        output = directory / f"{key}.json"
        if output.exists():
            previous = json.loads(output.read_text(encoding="utf-8"))
            validate_record(manifest, previous)
            if {k: v for k, v in previous.items() if k != "at"} != {k: v for k, v in value.items() if k != "at"}:
                raise ValueError("该任务版本已有不同结果；不能覆盖原观察")
            return {"status": "duplicate", "path": str(output)}
        atomic_write(output, encode(value), create=True)
    return {"status": "recorded", "path": str(output)}


def report(path: Path) -> dict:
    path = path.resolve()
    manifest = read_manifest(path)
    records = {}
    for result in sorted(result_directory(path).glob("*.json")):
        item = json.loads(result.read_text(encoding="utf-8"))
        validate_record(manifest, item)
        key = item["phase"], item["variant"], item["task"]
        if key in records:
            raise ValueError("实验含重复的任务版本结果")
        records[key] = item
    phases = {}
    for phase in PHASES:
        tasks = manifest["tasks"][phase]
        paired = [task for task in tasks if all((phase, variant, task) in records for variant in VARIANTS)]
        missing = [{"task": task, "variants": [variant for variant in VARIANTS if (phase, variant, task) not in records]}
                   for task in tasks if task not in paired]
        comparisons = {}
        for name, direction in manifest["metrics"].items():
            means = {variant: sum(records[phase, variant, task]["metrics"][name] for task in paired) / len(paired)
                     if paired else None for variant in VARIANTS}
            delta = means["candidate"] - means["baseline"] if paired else None
            comparisons[name] = {**means, "delta": delta, "direction": direction,
                                 "improvement": delta * (1 if direction == "higher" else -1) if paired else None}
        cost_comparisons = {}
        for name in manifest["costs"]:
            totals = {variant: sum(records[phase, variant, task]["costs"][name] for task in paired)
                      for variant in VARIANTS}
            cost_comparisons[name] = {**totals, "delta": totals["candidate"] - totals["baseline"],
                                     "change_percent": (totals["candidate"] / totals["baseline"] - 1) * 100
                                     if totals["baseline"] else None}
        phases[phase] = {"planned": len(tasks), "paired": len(paired), "paired_tasks": paired,
                         "complete": not missing, "missing": missing, "metrics": comparisons,
                         "paired_costs": cost_comparisons,
                         "all_recorded_costs": {name: sum(item["costs"][name] for key, item in records.items() if key[0] == phase)
                                                for name in manifest["costs"]}}
    return {"manifest_id": manifest["manifest_id"], "task": manifest["task"],
            "hypothesis": manifest["hypothesis"], "variants": manifest["variants"],
            "cards": manifest["cards"], "phases": phases, "automatic_promotion": False,
            "status": "ready_for_review" if all(value["complete"] for value in phases.values()) else "incomplete",
            "notice": "结果为有出处的人工录入；只比较相同任务的成对记录，不证明任务独立性、统计显著性或真实运行版本。"}
