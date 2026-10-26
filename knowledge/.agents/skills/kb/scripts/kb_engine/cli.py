"""Command-line adapter; all stateful operations live in domain modules."""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path
import yaml
from . import governance as rsi
from . import experiment
from .model import WIKI, TAXONOMY, KINDS, Report, Card
from .repository import load, card_path, read_card_file, apply_feedback, lint_path
from .search import tokens, rank, card_record, find_needs
from .routing import build
from .intake import new_card, intake

def default_vault() -> Path:
    return Path(os.environ.get("KB_VAULT") or Path(__file__).resolve().parents[5]).expanduser().resolve()


def print_report(report: Report) -> int:
    print("  ".join(f"{slug}:{n}" for slug, n in report.counts.items()))
    for path in report.removed:
        print(f"删除过期路由页 {path}")
    for warning in report.warnings:
        print(f"WARN  {warning}")
    for error in report.errors:
        print(f"ERROR {error}")
    print("OK" if not report.errors else f"{len(report.errors)} 个错误")
    return 1 if report.errors else 0


def print_hits(hits: list[tuple[float, Card]], as_json: bool) -> None:
    if as_json:
        print(json.dumps([{"score": round(s, 2), **card_record(c)} for s, c in hits],
                         ensure_ascii=False, indent=1))
        return
    for score, card in hits:
        print(f"{score:5.1f}  {KINDS[card.kind][1]}  {card.path}.md  {card.text('summary')}")
    if not hits:
        print("未找到词面匹配的候选卡片；可换同义词或查路由。")


def print_needs(report: dict, as_json: bool) -> None:
    if as_json:
        print(json.dumps(report, ensure_ascii=False, indent=1))
        return
    print(report["notice"])
    for requirement in report["requirements"]:
        print(f"\n{requirement['id']}  {requirement['query']}  [覆盖待核对]")
        for hit in requirement["hits"]:
            print(f"{hit['score']:5.1f}  {hit['path']}")
        if not requirement["hits"]:
            print("未找到词面匹配的候选卡片")


def add_experiment_parser(sub) -> None:
    parser = sub.add_parser("experiment", help="冻结候选并记录独立任务对照；不自动晋升")
    commands = parser.add_subparsers(dest="experiment_cmd", required=True)
    init = commands.add_parser("init", help="冻结一项候选改动和评估计划")
    init.add_argument("path", type=Path)
    init.add_argument("--task", required=True)
    init.add_argument("--hypothesis", required=True)
    init.add_argument("--change", required=True, type=Path, help="本次单项改动的 UTF-8 diff 文件")
    init.add_argument("--baseline", required=True, help="基线版本引用")
    init.add_argument("--candidate", required=True, help="候选版本引用")
    init.add_argument("--development", action="append", required=True, help="开发任务 ID，可重复")
    init.add_argument("--acceptance", action="append", required=True, help="独立验收任务 ID，可重复")
    init.add_argument("--metric", action="append", required=True, metavar="NAME:higher|lower")
    init.add_argument("--cost", action="append", required=True, metavar="UNIT", help="成本单位，例如 tokens、usd")
    init.add_argument("--card", action="append", default=[], help="实际采用的卡片路径，冻结当前 revision")
    record = commands.add_parser("record", help="记录一次实际结果，重试幂等")
    record.add_argument("path", type=Path)
    record.add_argument("--phase", required=True, choices=experiment.PHASES)
    record.add_argument("--variant", required=True, choices=experiment.VARIANTS)
    record.add_argument("--task", required=True)
    record.add_argument("--metric", action="append", required=True, metavar="NAME=NUMBER")
    record.add_argument("--cost", action="append", required=True, metavar="UNIT=NUMBER")
    record.add_argument("--evidence", required=True)
    report = commands.add_parser("report", help="按同一任务配对比较收益、成本与缺失项")
    report.add_argument("path", type=Path)
    report.add_argument("--json", action="store_true")


def pairs(values: list[str], separator: str, *, numeric: bool = False) -> dict:
    result = {}
    for entry in values:
        key, found, value = entry.partition(separator)
        if not found or not key.strip() or not value.strip() or key in result:
            raise ValueError(f"参数应为不重复的 NAME{separator}VALUE：{entry}")
        result[key] = float(value) if numeric else value
    return result


def run_experiment(args, vault: Path) -> None:
    if args.experiment_cmd == "init":
        result = experiment.init(args.path, vault=vault, task=args.task, hypothesis=args.hypothesis,
                                 change=args.change, baseline=args.baseline, candidate=args.candidate,
                                 development=args.development, acceptance=args.acceptance,
                                 metrics=pairs(args.metric, ":"), costs=args.cost, cards=args.card)
    elif args.experiment_cmd == "record":
        result = experiment.record(args.path, phase=args.phase, variant=args.variant, task=args.task,
                                   metrics=pairs(args.metric, "=", numeric=True), costs=pairs(args.cost, "=", numeric=True),
                                   evidence=args.evidence)
    else:
        result = experiment.report(args.path)
        if not args.json:
            print(f"{result['task']}  {result['status']}\n{result['hypothesis']}")
            for phase, item in result["phases"].items():
                print(f"{phase}: {item['paired']}/{item['planned']} 个任务有成对结果")
                for name, metric in item["metrics"].items():
                    print(f"  {name}: {metric['baseline']} -> {metric['candidate']}  delta={metric['delta']}")
                print(f"  paired costs: {json.dumps(item['paired_costs'], ensure_ascii=False)}")
                if item["missing"]:
                    print(f"  missing: {json.dumps(item['missing'], ensure_ascii=False)}")
            print(result["notice"] + " 不自动晋升。")
            return
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="kb", description="第二大脑引擎")
    parser.add_argument("--vault", type=Path, default=default_vault())
    sub = parser.add_subparsers(dest="cmd", required=True)
    add_experiment_parser(sub)
    sub.add_parser("build", help="校验并重新生成路由")
    sub.add_parser("check", help="只校验")
    find = sub.add_parser("find", help="按任务检索卡片")
    find.add_argument("query")
    find.add_argument("-k", type=int, default=5)
    find.add_argument("--need", action="append", default=[], metavar="QUERY",
                      help="完整子需求，可重复；每项独立检索，-k 对每项生效")
    find.add_argument("--json", action="store_true")
    find.add_argument("--include-stale", action="store_true", help="仅排查时读取已隔离卡片")
    read = sub.add_parser("read", help="读取当前内容，默认移除演进日志和反馈历史")
    read.add_argument("path")
    read.add_argument("--full", action="store_true")
    read.add_argument("--json", action="store_true")
    lint = sub.add_parser("lint", help="检查正文预算与治理字段；兼容旧卡片")
    lint.add_argument("path", nargs="?")
    feedback = sub.add_parser("feedback", help="对实际采用的卡片版本结算一次使用反馈")
    feedback.add_argument("path")
    feedback.add_argument("--task", required=True)
    feedback.add_argument("--revision", required=True)
    feedback.add_argument("--outcome", required=True, choices=list(rsi.OUTCOMES))
    feedback.add_argument("--reason", required=True)
    feedback.add_argument("--evidence", default="")
    feedback.add_argument("--confirm-review", action="store_true")
    new = sub.add_parser("new", help="生成卡片骨架")
    new.add_argument("kind", choices=list(KINDS))
    new.add_argument("id")
    new.add_argument("--title")
    take = sub.add_parser("intake", help="URL 或剪藏 .md 去重入库")
    take.add_argument("url", metavar="URL|CLIP.md")
    take.add_argument("--id")
    args = parser.parse_args(argv)
    if args.cmd == "find":
        if args.k < 1:
            parser.error("find -k 必须大于 0")
        if any(not tokens(need) for need in args.need):
            parser.error("--need 必须包含可检索的文字")
    vault, today = args.vault.expanduser().resolve(), dt.date.today()
    if args.cmd not in ("lint", "experiment") and not (vault / TAXONOMY).exists():
        print(f"找不到 {vault / TAXONOMY}；用 --vault 或环境变量 KB_VAULT 指定 vault")
        return 2
    try:
        if args.cmd == "experiment":
            run_experiment(args, vault)
            return 0
        if args.cmd == "lint":
            errors = lint_path(vault / args.path if args.path else vault / WIKI)
            for error in errors:
                print(f"ERROR {error}", file=sys.stderr)
            print(f"{len(errors)} 个错误" if errors else "OK")
            return int(bool(errors))
        if args.cmd == "read":
            path = card_path(vault, args.path)
            meta, body = read_card_file(path)
            signal = rsi.summary(meta, body)
            if not args.full:
                meta = {key: value for key, value in meta.items() if key not in ("feedback_log", "review_revision")}
                body = rsi.current_body(body)
            if args.json:
                effective = {**meta, **{key: signal[key] for key in ("rsi_status", "utility_score", "feedback_count", "last_verified")}}
                print(json.dumps({"path": path.relative_to(vault.resolve()).as_posix(), "metadata": effective,
                                  **signal, "body": body}, ensure_ascii=False, indent=1, default=str))
            else:
                print(yaml.safe_dump({**meta, **signal}, allow_unicode=True, sort_keys=False).rstrip())
                print(body)
            return 0
        if args.cmd == "feedback":
            result = apply_feedback(card_path(vault, args.path), task=args.task, outcome=args.outcome,
                                    reason=args.reason, evidence=args.evidence, expected_revision=args.revision,
                                    today=today, confirm_review=args.confirm_review)
            print(json.dumps(result, ensure_ascii=False))
            return 0
        if args.cmd in ("build", "check"):
            return print_report(build(vault, today, write=args.cmd == "build"))
        if args.cmd == "find":
            cards, errors, warnings = load(vault)
            for warning in warnings:
                print(f"WARN  {warning}", file=sys.stderr)
            if errors:
                for error in errors:
                    print(f"ERROR {error}", file=sys.stderr)
                return 1
            if args.need:
                print_needs(find_needs(cards, args.query, args.need, args.k, args.include_stale), args.json)
            else:
                print_hits(rank(cards, args.query, args.k, args.include_stale), args.json)
        elif args.cmd == "new":
            print(new_card(vault, args.kind, args.id, today, args.title).relative_to(vault).as_posix())
        else:
            path, created = intake(vault, args.url, today, args.id)
            print(f"{'新建' if created else '已存在'} {path.relative_to(vault).as_posix()}")
    except (ValueError, OSError, yaml.YAMLError) as exc:
        print(f"失败：{exc}", file=sys.stderr)
        return 1
    return 0
