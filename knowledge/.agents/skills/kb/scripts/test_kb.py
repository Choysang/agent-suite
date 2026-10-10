"""Tests for kb.py. Run: python -m pytest .agents/skills/kb/scripts -q"""
import datetime as dt
from pathlib import Path

import pytest

import kb

TODAY = dt.date(2026, 10, 7)

TAXONOMY = """
split_threshold: 40
domains:
  ops:
    name: 服务器
    keywords: [docker, 部署]
    redline: 生产机只 pull
    topics:
      发布部署: [docker]
      远程长任务: [nohup]
"""

LESSON = """---
kind: lesson
title: 生产机只 pull
summary: 生产机只 pull 不 build
tags: [ops/发布部署]
when: [往云主机部署 docker 服务]
not_when: [本地开发]
evidence: 实测
created: 2026-10-07
verified: 2026-10-07
source: 测试
status: active
---

# 生产机只 pull
"""

TOOL = """---
kind: tool
title: Trivy
summary: 扫描镜像漏洞
tags: [ops/发布部署]
when: [扫描镜像漏洞]
url: https://github.com/aquasecurity/trivy
adoption: reference
created: 2026-10-07
---

# Trivy
"""


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


@pytest.fixture
def vault(tmp_path: Path) -> Path:
    write(tmp_path / kb.TAXONOMY, TAXONOMY)
    write(tmp_path / kb.WIKI / "lessons" / "prod-pull.md", LESSON)
    write(tmp_path / kb.WIKI / "tools" / "trivy.md", TOOL)
    return tmp_path


def test_build_writes_router_hub_and_tool_shelf(vault):
    report = kb.build(vault, TODAY)
    assert report.errors == []
    router = (vault / "ROUTER.md").read_text(encoding="utf-8")
    assert "| 服务器 |" in router and "发布部署(2)" in router and "工具库 1 个" in router
    hub = (vault / kb.ROUTES / "ops.md").read_text(encoding="utf-8")
    assert "[[30.Wiki/lessons/prod-pull\\|prod-pull]]" in hub
    assert hub.index("prod-pull") < hub.index("trivy")  # lessons outrank tools
    assert "本地开发" in hub  # not_when is shown for precise routing
    assert "## 参考（1）" in (vault / kb.ROUTES / "tools.md").read_text(encoding="utf-8")


def test_check_does_not_write(vault):
    assert kb.build(vault, TODAY, write=False).errors == []
    assert not (vault / "ROUTER.md").exists()


def test_unregistered_tag_and_missing_field_are_errors(vault):
    write(vault / kb.WIKI / "lessons" / "bad.md", LESSON.replace("ops/发布部署", "ops/不存在").replace("evidence: 实测\n", ""))
    errors = kb.build(vault, TODAY).errors
    assert any("ops/不存在" in e for e in errors)
    assert any("bad.md: 缺 evidence" in e for e in errors)


def test_candidate_tool_is_exempt_and_unrouted(vault):
    candidate = TOOL.replace("adoption: reference", "adoption: candidate").replace("summary: 扫描镜像漏洞\n", "")
    write(vault / kb.WIKI / "tools" / "trivy.md", candidate)
    report = kb.build(vault, TODAY)
    assert report.errors == []
    assert "trivy" not in (vault / kb.ROUTES / "ops.md").read_text(encoding="utf-8")
    assert "## 待评估（1）" in (vault / kb.ROUTES / "tools.md").read_text(encoding="utf-8")


def test_find_ranks_the_relevant_card_first(vault):
    hits = kb.rank(kb.load(vault)[0], "怎么往云主机部署服务")
    assert hits and hits[0][1].id == "prod-pull"


def test_split_domain_into_topic_pages(vault):
    write(vault / kb.TAXONOMY, TAXONOMY.replace("split_threshold: 40", "split_threshold: 1"))
    assert kb.build(vault, TODAY).errors == []
    assert "[[30.Wiki/routes/ops/发布部署\\|发布部署]]" in (vault / kb.ROUTES / "ops.md").read_text(encoding="utf-8")
    assert "trivy" in (vault / kb.ROUTES / "ops" / "发布部署.md").read_text(encoding="utf-8")


def test_stale_route_pages_are_removed(vault):
    write(vault / kb.ROUTES / "old.md", "stale")
    assert f"{kb.ROUTES}/old.md" in kb.build(vault, TODAY).removed


@pytest.mark.parametrize("raw", [
    "https://github.com/AquaSecurity/Trivy",
    "https://www.github.com/aquasecurity/trivy.git/",
    "http://github.com/aquasecurity/trivy/tree/main/docs",
])
def test_canonical_url(raw):
    assert kb.canonical_url(raw) == "https://github.com/aquasecurity/trivy"


def test_intake_dedupes_existing_url(vault):
    path, created = kb.intake(vault, "https://github.com/AquaSecurity/trivy.git", TODAY, fetch=None)
    assert not created and path.name == "trivy.md"


def test_intake_scaffolds_github_candidate(vault):
    def fake_fetch(owner, repo):
        return {"name": "markitdown", "description": "convert files", "stargazers_count": 5,
                "license": {"spdx_id": "MIT"}, "pushed_at": "2026-09-01T00:00:00Z"}, "# README"

    path, created = kb.intake(vault, "https://github.com/microsoft/markitdown", TODAY, fetch=fake_fetch)
    card = kb.load(vault)[0]
    assert created and path.name == "microsoft-markitdown.md"
    assert (vault / kb.INTAKE_CACHE / "microsoft-markitdown.md").read_text(encoding="utf-8") == "# README"
    meta = next(c for c in card if c.id == "microsoft-markitdown").meta
    assert meta["adoption"] == "candidate" and meta["license"] == "MIT" and meta["summary"] == "convert files"
    assert kb.build(vault, TODAY).errors == []


CLIP = """---
title: "Prompt 缓存实战"
source: "https://example.com/blog/prompt-cache/"
description: 讲 prompt cache 怎么省钱
tags: [clippings]
---
正文
"""


def test_intake_clip_article_moves_original_to_raw(vault):
    write(vault / "Clippings" / "a.md", CLIP)
    path, created = kb.intake(vault, "Clippings/a.md", TODAY)
    text = path.read_text(encoding="utf-8")
    assert created and path.parent.name == "sources"
    assert "source: https://example.com/blog/prompt-cache" in text and "[[30.Wiki/raw/clips/prompt-缓存实战]]" in text
    assert not (vault / "Clippings" / "a.md").exists()
    assert (vault / kb.RAW_CLIPS / "prompt-缓存实战.md").read_text(encoding="utf-8") == CLIP
    assert kb.intake(vault, "https://example.com/blog/prompt-cache", TODAY)[1] is False


def test_intake_clip_of_known_github_repo_dedupes(vault):
    write(vault / "Clippings" / "t.md", CLIP.replace("https://example.com/blog/prompt-cache/",
                                                     "https://github.com/aquasecurity/trivy/tree/main/docs"))
    path, created = kb.intake(vault, "Clippings/t.md", TODAY, fetch=None)
    assert not created and path.name == "trivy.md"


def test_new_card_refuses_duplicate_id(vault):
    with pytest.raises(FileExistsError):
        kb.new_card(vault, "lesson", "Prod-Pull", TODAY)
    path = kb.new_card(vault, "lesson", "fresh-card", TODAY, title="新卡")
    assert kb.load(vault)[0] and "kind: lesson" in path.read_text(encoding="utf-8")


def test_router_line_limit(vault):
    many = "\n".join(f"  d{i}:\n    name: D{i}\n    keywords: [k]\n    topics:\n      t: [k]" for i in range(80))
    write(vault / kb.TAXONOMY, f"split_threshold: 40\ndomains:\n{many}\n")
    assert any("超过" in e for e in kb.build(vault, TODAY).errors)
