"""Read and validate Markdown cards; persist revision-bound feedback."""
from __future__ import annotations
import datetime as dt
import os
import re
from collections import Counter
from pathlib import Path
import yaml
from . import governance as rsi
from .model import (WIKI, TAXONOMY, NOT_CARDS, KINDS, CORE, EXTRA, STATE,
                    EVIDENCE, STALE_DAYS, Card)
from .storage import atomic_write, file_lock, vault_lock

FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n(.*))?\Z", re.S)


def parse(text: str) -> tuple[dict, str]:
    match = FRONTMATTER.match(text)
    if not match:
        return {}, text
    meta = yaml.safe_load(match.group(1)) or {}
    return (meta if isinstance(meta, dict) else {}), match.group(2) or ""


def load(vault: Path) -> tuple[list[Card], list[str], list[str]]:
    cards, errors, warnings = [], [], []
    root = vault / WIKI
    for path in sorted(root.rglob("*.md")):
        if path.relative_to(root).parts[0] in NOT_CARDS:
            continue
        rel = path.relative_to(vault).as_posix()
        try:
            meta, body = parse(path.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            errors.append(f"{rel}: frontmatter 不是合法 YAML")
            continue
        if meta.get("kind") in KINDS:
            cards.append(Card(path.stem, rel[:-3], meta, body))
        else:
            warnings.append(f"{rel}: 没有 kind，不是卡片，不进路由")
    return cards, errors, warnings


def load_taxonomy(vault: Path) -> dict:
    return yaml.safe_load((vault / TAXONOMY).read_text(encoding="utf-8"))


def all_tags(taxonomy: dict) -> set[str]:
    return {f"{d}/{t}" for d, spec in taxonomy["domains"].items() for t in spec["topics"]}


def to_date(value) -> dt.date | None:
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, dt.date):
        return value
    try:
        return dt.date.fromisoformat(str(value))
    except ValueError:
        return None


def blank(value) -> bool:
    return value is None or value == "" or value == [] or value == {}


def check_card(card: Card, tags: set[str], ids: set[str], today: dt.date) -> tuple[list[str], list[str]]:
    where, kind = f"{card.path}.md", card.kind
    pending = (kind, card.state) == ("tool", "candidate")
    required = EXTRA[kind] if pending else CORE + EXTRA[kind]
    errors = [f"{where}: 缺 {key}" for key in required if blank(card.meta.get(key))]
    errors += [f"{where}: 标签 {t} 未在 taxonomy 登记" for t in card.items("tags") if t not in tags]
    if kind in STATE and card.state not in STATE[kind][1]:
        errors.append(f"{where}: {STATE[kind][0]} 只能是 {'/'.join(STATE[kind][1])}")
    if kind == "lesson" and card.text("evidence") not in EVIDENCE:
        errors.append(f"{where}: evidence 只能是 {'/'.join(EVIDENCE)}")
    errors += [f"{where}: {key} 不是 YYYY-MM-DD" for key in ("created", "verified", "updated")
               if not blank(card.meta.get(key)) and to_date(card.meta[key]) is None]
    if any(key in card.meta for key in ("rsi_status", "max_lines", "max_chars", "feedback_log")):
        errors += [f"{where}: {error}" for error in rsi.lint(card.meta, card.body)]
    warnings = []
    folder = KINDS[kind][0]
    if f"/{folder}/" not in f"/{card.path}":
        warnings.append(f"{where}: kind={kind}，应放在 {WIKI}/{folder}/")
    verified = to_date(card.meta.get("verified"))
    if verified and card.routed and (today - verified).days > STALE_DAYS:
        warnings.append(f"{where}: {verified} 之后没再验证，超过 {STALE_DAYS} 天")
    if card.state == "conflict":
        warnings.append(f"{where}: 冲突待拍板")
    if card.state == "superseded" and card.text("superseded_by").strip("[]").lower() not in ids:
        warnings.append(f"{where}: superseded_by 没有指向现有卡片")
    return errors, warnings


def validate(cards: list[Card], taxonomy: dict, today: dt.date) -> tuple[list[str], list[str]]:
    tags = all_tags(taxonomy)
    ids = Counter(card.id.lower() for card in cards)
    errors = [f"id 重复（文件名必须全库唯一）：{i}" for i, n in ids.items() if n > 1]
    warnings: list[str] = []
    for card in cards:
        card_errors, card_warnings = check_card(card, tags, set(ids), today)
        errors += card_errors
        warnings += card_warnings
    return errors, warnings


WIKILINK = re.compile(r"!?\[\[([^\]|#^]+)")


def vault_index(vault: Path) -> tuple[set[str], set[str]]:
    paths, names = set(), set()
    for dirpath, dirnames, filenames in os.walk(vault):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in filenames:
            paths.add((Path(dirpath) / name).relative_to(vault).as_posix().lower())
            names.add(name.lower())
    return paths, names


def resolves(target: str, paths: set[str], names: set[str]) -> bool:
    target = target.strip().lower()
    candidate = target if Path(target).suffix else f"{target}.md"
    if "/" not in candidate:
        return candidate in names
    return any(path == candidate or path.endswith("/" + candidate) for path in paths)


def broken_links(vault: Path, cards: list[Card]) -> list[str]:
    paths, names = vault_index(vault)
    return [f"{card.path}.md: 断链 [[{target}]]" for card in cards
            for target in WIKILINK.findall(card.body) if not resolves(target, paths, names)]


def card_path(vault: Path, target: str) -> Path:
    path = (vault / target).resolve()
    root = (vault / WIKI).resolve()
    if not path.is_relative_to(root) or path.suffix != ".md":
        raise ValueError("目标必须是当前 vault 的 30.Wiki 内的 Markdown 卡片")
    if path.relative_to(root).parts[0] in NOT_CARDS:
        raise ValueError("不能把原文或生成路由当作卡片")
    return path


def read_card_file(path: Path) -> tuple[dict, str]:
    meta, body = parse(path.read_text(encoding="utf-8"))
    if meta.get("kind") not in KINDS:
        raise ValueError(f"不是有效卡片：{path}")
    return meta, body


def apply_feedback(path: Path, **kwargs) -> dict:
    path = path.resolve()
    wiki = next((parent for parent in path.parents if parent.name == WIKI), None)
    if wiki is None:
        raise ValueError("反馈目标必须位于 30.Wiki")
    with vault_lock(wiki.parent), file_lock(path.with_suffix(path.suffix + ".feedback.lock")):
        original = path.read_bytes()
        meta, body = parse(original.decode("utf-8"))
        if meta.get("kind") not in KINDS:
            raise ValueError("不是有效卡片")
        updated, changed = rsi.feedback(meta, body, **kwargs)
        if changed:
            newline = "\r\n" if b"\r\n" in original else "\n"
            front = yaml.safe_dump(updated, allow_unicode=True, sort_keys=False, width=1000).replace("\n", newline)
            content = f"---{newline}{front}---{newline}{body}".encode("utf-8")
            atomic_write(path, content, expected=original)
        return {"status": "recorded" if changed else "duplicate", "changed": changed,
                **rsi.summary(updated, body), "next_actions": ["kb build"] if changed else []}


def lint_path(target: Path) -> list[str]:
    if not target.exists():
        raise ValueError(f"目标不存在：{target}")
    paths = sorted(target.rglob("*.md")) if target.is_dir() else [target]
    errors = []
    checked = 0
    for path in paths:
        if any(part in NOT_CARDS or part.startswith(".") for part in path.relative_to(target.parent).parts[:-1]):
            continue
        try:
            meta, body = parse(path.read_text(encoding="utf-8"))
            if not meta.get("kind") and target.is_dir():
                continue
            checked += 1
            errors += [f"{path}: {error}" for error in rsi.lint(meta, body)]
        except (yaml.YAMLError, ValueError) as exc:
            errors.append(f"{path}: {exc}")
    if not checked and not errors:
        errors.append(f"{target}: 没有可检查的卡片")
    return errors
