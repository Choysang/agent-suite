"""Scaffold cards and preserve source documents without overwriting evidence."""
from __future__ import annotations
import datetime as dt
import json
import os
import re
import urllib.request
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import yaml
from .model import (WIKI, INTAKE_CACHE, RAW_CLIPS, NOT_CARDS, KINDS, EXTRA, DEFAULTS, BODY, Card)
from .repository import load, parse, to_date
from .storage import atomic_write, vault_lock, validate_id, checked_path

def skeleton(kind: str, title: str, today: dt.date, **extra) -> str:
    meta: dict = {"kind": kind, "title": title, "summary": "", "tags": [], "when": [], "not_when": []}
    if kind in ("lesson", "playbook", "note", "tool"):
        meta.update(rsi_status="candidate", max_lines=60 if kind == "lesson" else 120,
                    max_chars=6000 if kind == "lesson" else 12000)
    for key in EXTRA[kind]:
        meta[key] = today if key in ("verified", "updated") else DEFAULTS.get(key, "")
    meta.update(extra)
    meta["created"] = today
    front = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False, default_flow_style=None, width=1000)
    return f"---\n{front}---\n\n# {title}\n\n{BODY[kind].format(date=today.isoformat())}"


GITHUB_REPO = re.compile(r"https://github\.com/([^/]+)/([^/]+)")


def canonical_url(url: str) -> str:
    parts = urlsplit(url.strip())
    host = parts.netloc.lower().removeprefix("www.")
    path = parts.path.rstrip("/")
    if host == "github.com":
        segments = [s for s in path.split("/") if s]
        if len(segments) < 2:
            raise ValueError(f"不是 GitHub 仓库地址：{url}")
        return f"https://github.com/{segments[0].lower()}/{segments[1].lower().removesuffix('.git')}"
    return urlunsplit(("https", host, path, parts.query, ""))


def find_by_url(cards: list[Card], url: str) -> Card | None:
    for card in cards:
        for key in ("url", "source"):
            for value in card.items(key):
                try:
                    if value.startswith("http") and canonical_url(value) == url:
                        return card
                except ValueError:
                    continue
    return None


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9\u3400-\u9fff]+", "-", text.lower()).strip("-")[:60] or "untitled"


def fetch_github(owner: str, repo: str) -> tuple[dict, str]:
    def get(url: str, accept: str) -> str:
        headers = {"User-Agent": "kb-intake", "Accept": accept}
        if token := os.environ.get("GITHUB_TOKEN"):
            headers["Authorization"] = f"Bearer {token}"
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
            return response.read().decode("utf-8", errors="replace")

    api = f"https://api.github.com/repos/{owner}/{repo}"
    meta = json.loads(get(api, "application/vnd.github+json"))
    try:
        readme = get(f"{api}/readme", "application/vnd.github.raw")
    except OSError:
        readme = ""
    return meta, readme


def _create_card(vault: Path, kind: str, card_id: str, text: str,
                 existing: set[str] = frozenset()) -> Path:
    validate_id(card_id)
    if kind not in KINDS:
        raise ValueError(f"未知卡片类型：{kind}")
    root = vault / WIKI
    occupied = {p.stem.casefold() for p in root.rglob("*.md")
                if p.relative_to(root).parts[0] not in NOT_CARDS}
    if card_id.casefold() in occupied | {value.casefold() for value in existing}:
        raise FileExistsError(f"id 已存在：{card_id}（文件名必须全库唯一）")
    path = checked_path(root / KINDS[kind][0], f"{card_id}.md")
    atomic_write(path, text.encode("utf-8"), create=True)
    return path


def write_card(vault: Path, kind: str, card_id: str, text: str, existing: set[str]) -> Path:
    vault = vault.resolve()
    with vault_lock(vault):
        return _create_card(vault, kind, card_id, text, existing)


def new_card(vault: Path, kind: str, card_id: str, today: dt.date, title: str | None = None) -> Path:
    return write_card(vault, kind, card_id, skeleton(kind, title or card_id, today), set())


def _archive_clip(clip: Path, raw: Path) -> bool:
    """Return whether this call created the archive; preserve conflicting originals."""
    original = clip.read_bytes()
    if raw.exists():
        if raw.read_bytes() != original:
            raise FileExistsError(f"原文已存在且内容不同，不能覆盖：{raw}")
        return False
    atomic_write(raw, original, create=True)
    return True


def _finish_clip(clip: Path, raw: Path) -> None:
    if clip.resolve() == raw.resolve():
        return
    claimed = clip.with_name(f".kb-claimed-{uuid.uuid4().hex}-{clip.name}")
    clip.rename(claimed)
    try:
        if claimed.read_bytes() != raw.read_bytes():
            raise ValueError("剪藏在入库时改变；已保留内容，请检查后重试")
        claimed.unlink()
    except BaseException as error:
        if claimed.exists():
            if not clip.exists():
                claimed.rename(clip)
            else:
                raise OSError(f"剪藏已被重新创建；原认领内容保留在 {claimed}") from error
        raise


def intake(vault: Path, target: str, today: dt.date, card_id: str | None = None,
           fetch=fetch_github) -> tuple[Path, bool]:
    vault = vault.resolve()
    if card_id is not None:
        validate_id(card_id)
    clip, clip_meta, url = None, {}, target
    if target.lower().endswith(".md"):
        clip = (Path(target) if Path(target).is_absolute() else vault / target).resolve()
        clip_meta = parse(clip.read_text(encoding="utf-8"))[0]
        url = str(clip_meta.get("source") or "")
    canonical = canonical_url(url) if url.startswith("http") else ""
    # Network access is outside the write lock; deduplication is repeated inside it.
    cards, errors, _ = load(vault)
    if errors:
        raise ValueError("; ".join(errors))
    known = find_by_url(cards, canonical) if canonical else None
    github = GITHUB_REPO.fullmatch(canonical) if canonical else None
    fetched = fetch(*github.groups()) if github and known is None else None
    with vault_lock(vault):
        cards, errors, _ = load(vault)
        if errors:
            raise ValueError("; ".join(errors))
        existing = find_by_url(cards, canonical) if canonical else None
        if existing is None and clip and not canonical:
            requested_id = card_id or slugify(str(clip_meta.get("title") or ""))
            raw_rel = f"{RAW_CLIPS}/{requested_id}.md"
            existing = next((card for card in cards if card.id == requested_id and card.kind == "source"
                             and card.text("source") == raw_rel
                             and f"[[{raw_rel.removesuffix('.md')}]]" in card.body), None)
        if existing:
            path = vault / f"{existing.path}.md"
            # Also recover an interrupted archive cleanup, including older intake versions.
            if clip and existing.kind == "source":
                raw_rel = f"{RAW_CLIPS}/{existing.id}.md"
                if f"[[{raw_rel.removesuffix('.md')}]]" in existing.body:
                    raw = checked_path(vault, raw_rel)
                    _archive_clip(clip, raw)
                    _finish_clip(clip, raw)
            return path, False
        if github:
            if fetched is None:
                raise ValueError("资源在读取期间被移除，请重试入库")
            metadata, readme = fetched
            card_id = card_id or slugify("-".join(github.groups()))
            extra = {"summary": metadata.get("description") or "", "url": canonical, "adoption": "candidate",
                     "stars": metadata.get("stargazers_count"), "license": (metadata.get("license") or {}).get("spdx_id"),
                     "language": metadata.get("language"), "pushed": to_date(str(metadata.get("pushed_at") or "")[:10])}
            kind, title = "tool", metadata.get("name") or github.group(2)
            raw, created_raw = None, False
            cache = checked_path(vault / INTAKE_CACHE, f"{card_id}.md")
            if cache.exists() and cache.read_bytes() != readme.encode("utf-8"):
                raise FileExistsError(f"README 缓存已存在且内容不同，不能覆盖：{cache}")
            if not cache.exists():
                atomic_write(cache, readme.encode("utf-8"), create=True)
        else:
            parts = urlsplit(canonical)
            title = str(clip_meta.get("title") or "") or Path(parts.path).name or parts.netloc
            if not title:
                raise ValueError(f"剪藏没有 title 和 source：{target}")
            card_id = card_id or slugify(title)
            raw_rel = f"{RAW_CLIPS}/{card_id}.md"
            kind = "source"
            extra = {"source": canonical or raw_rel, "summary": str(clip_meta.get("description") or "")}
            raw = checked_path(vault, raw_rel) if clip else None
            created_raw = _archive_clip(clip, raw) if raw is not None else False
        text = skeleton(kind, title, today, **{key: value for key, value in extra.items() if value is not None})
        if raw is not None:
            text += f"\n## 原文\n\n[[{raw_rel.removesuffix('.md')}]]\n"
        try:
            path = _create_card(vault, kind, card_id, text)
        except BaseException:
            if created_raw:
                raw.unlink()
            raise
        if raw is not None:
            _finish_clip(clip, raw)  # A failed cleanup is retryable via the existing-card branch.
        return path, True
