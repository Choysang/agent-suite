"""Writer races and failures are exercised in disposable vaults only."""
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest

import kb
from kb_engine import intake as intake_module, storage
from test_kb import LESSON, TAXONOMY, write

TODAY = dt.date(2026, 10, 18)


@pytest.fixture
def vault(tmp_path):
    write(tmp_path / kb.TAXONOMY, TAXONOMY)
    return tmp_path


@pytest.mark.parametrize("card_id", ["../../AGENTS", "nested/name", r"nested\name", "C:target", "..", "NUL", "aux.txt", "trailing."])
def test_new_rejects_ids_that_are_paths_or_windows_devices(vault, card_id):
    write(vault / "AGENTS.md", "keep instructions")
    with pytest.raises(ValueError, match="id"):
        kb.new_card(vault, "note", card_id, TODAY)
    assert (vault / "AGENTS.md").read_text() == "keep instructions"
    assert not list((vault / kb.WIKI).rglob("*.md"))


def test_create_refuses_stale_snapshot_and_unparsed_existing_card(vault):
    kb.write_card(vault, "note", "same", "first writer", set())
    with pytest.raises(FileExistsError):
        kb.write_card(vault, "source", "SAME", "second writer", set())
    assert (vault / kb.WIKI / "notes/same.md").read_text() == "first writer"


def test_multiprocess_creation_keeps_global_id_unique(vault):
    program = """
import datetime as dt, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import kb
print('ready', flush=True)
sys.stdin.readline()
try:
    kb.new_card(Path(sys.argv[2]), sys.argv[3], 'shared', dt.date(2026,10,18))
    print('created', flush=True)
except FileExistsError:
    print('duplicate', flush=True)
"""
    processes = [subprocess.Popen([sys.executable, "-B", "-c", program, str(Path(kb.__file__).parent),
                                   str(vault), kind], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=subprocess.PIPE, text=True, encoding="utf-8")
                 for kind in ("note", "source")]
    try:
        for process in processes:
            assert process.stdout.readline().strip() == "ready"
        for process in processes:
            process.stdin.write("start\n")
            process.stdin.flush()
        outputs = []
        for process in processes:
            process.wait(timeout=15)
            assert process.returncode == 0, process.stderr.read()
            outputs.append(process.stdout.read().strip())
        assert sorted(outputs) == ["created", "duplicate"]
        assert len(list((vault / kb.WIKI).rglob("shared.md"))) == 1
    finally:
        for process in processes:
            if process.poll() is None:
                process.kill()
            process.communicate()


def clip_file(vault):
    clip = vault / "Clippings/article.md"
    write(clip, "---\ntitle: Article\nsource: https://example.com/article\n---\noriginal article\n")
    return clip


def test_intake_preserves_existing_original(vault):
    clip = clip_file(vault)
    raw = vault / kb.RAW_CLIPS / "article.md"
    write(raw, "previous evidence")
    with pytest.raises(FileExistsError, match="原文"):
        kb.intake(vault, str(clip), TODAY, "article")
    assert raw.read_text() == "previous evidence" and clip.exists()
    assert not (vault / kb.WIKI / "sources/article.md").exists()


def test_intake_failed_card_publish_rolls_back_own_archive_and_retries(vault, monkeypatch):
    clip = clip_file(vault)
    archive = vault / kb.RAW_CLIPS / "article.md"
    create = intake_module._create_card
    with monkeypatch.context() as context:
        context.setattr(intake_module, "_create_card", lambda *args, **kwargs: (_ for _ in ()).throw(OSError("publish failed")))
        with pytest.raises(OSError, match="publish failed"):
            kb.intake(vault, str(clip), TODAY, "article")
    assert clip.exists() and not archive.exists()
    path, created = kb.intake(vault, str(clip), TODAY, "article")
    assert created and path.exists() and archive.exists() and not clip.exists()
    assert intake_module._create_card is create


def test_intake_cleanup_failure_has_complete_evidence_and_retry_finishes(vault, monkeypatch):
    clip = clip_file(vault)
    raw = vault / kb.RAW_CLIPS / "article.md"
    unlink = Path.unlink
    def fail_cleanup(path, *args, **kwargs):
        if path.name.startswith('.kb-claimed-'):
            raise OSError("cleanup failed")
        return unlink(path, *args, **kwargs)
    with monkeypatch.context() as context:
        context.setattr(Path, "unlink", fail_cleanup)
        with pytest.raises(OSError, match="cleanup failed"):
            kb.intake(vault, str(clip), TODAY, "article")
    assert raw.read_bytes() == clip.read_bytes()
    path, created = kb.intake(vault, str(clip), TODAY, "article")
    assert not created and path.exists() and raw.exists() and not clip.exists()


def test_intake_cleanup_does_not_delete_an_editor_save_to_original_path(vault, monkeypatch):
    clip = clip_file(vault)
    original = clip.read_bytes()
    unlink = Path.unlink
    def save_during_cleanup(path, *args, **kwargs):
        if path.name.startswith('.kb-claimed-'):
            clip.write_text('new editor save', encoding='utf-8')
        return unlink(path, *args, **kwargs)
    monkeypatch.setattr(Path, 'unlink', save_during_cleanup)
    kb.intake(vault, str(clip), TODAY, 'article')
    assert clip.read_text(encoding='utf-8') == 'new editor save'
    assert (vault / kb.RAW_CLIPS / 'article.md').read_bytes() == original


def test_intake_title_only_clip_recovers_cleanup_failure(vault, monkeypatch):
    clip = vault / 'Clippings/article.md'
    write(clip, '---\ntitle: Article\n---\nsource without a URL\n')
    unlink = Path.unlink
    def fail(path, *args, **kwargs):
        if path.name.startswith('.kb-claimed-'):
            raise OSError('cleanup failed')
        return unlink(path, *args, **kwargs)
    with monkeypatch.context() as context:
        context.setattr(Path, 'unlink', fail)
        with pytest.raises(OSError, match='cleanup failed'):
            kb.intake(vault, str(clip), TODAY)
    path, created = kb.intake(vault, str(clip), TODAY)
    assert not created and path.exists() and not clip.exists()


def test_github_cache_failure_does_not_publish_card_and_retry_recovers(vault, monkeypatch):
    publish = intake_module.atomic_write
    def fail(path, *args, **kwargs):
        if '.intake' in path.parts:
            raise OSError('cache failed')
        return publish(path, *args, **kwargs)
    fetch = lambda *args: ({'name': 'project'}, '# README')
    with monkeypatch.context() as context:
        context.setattr(intake_module, 'atomic_write', fail)
        with pytest.raises(OSError, match='cache failed'):
            kb.intake(vault, 'https://github.com/example/project', TODAY, 'project', fetch)
    assert not (vault / kb.WIKI / 'tools/project.md').exists()
    path, created = kb.intake(vault, 'https://github.com/example/project', TODAY, 'project', fetch)
    assert created and path.exists()
    assert (vault / kb.INTAKE_CACHE / 'project.md').read_text() == '# README'


def test_github_conflicting_cache_preserved_without_publishing_wrong_source(vault):
    cache = vault / kb.INTAKE_CACHE / 'project.md'
    write(cache, 'README for another repository')
    with pytest.raises(FileExistsError, match='README'):
        kb.intake(vault, 'https://github.com/example/project', TODAY, 'project',
                  lambda *args: ({'name': 'project'}, '# Actual README'))
    assert cache.read_text() == 'README for another repository'
    assert not (vault / kb.WIKI / 'tools/project.md').exists()


def test_intake_repairs_legacy_card_whose_archive_move_failed(vault):
    clip = clip_file(vault)
    card = kb.skeleton("source", "Article", TODAY, source="https://example.com/article")
    write(vault / kb.WIKI / "sources/article.md", card + "\n[[30.Wiki/raw/clips/article]]\n")
    _, created = kb.intake(vault, str(clip), TODAY, "article")
    assert not created and (vault / kb.RAW_CLIPS / "article.md").exists() and not clip.exists()


def test_intake_dedupes_list_sources(vault):
    card = kb.skeleton("source", "Existing", TODAY, source=["https://example.com/article", "https://example.com/other"])
    write(vault / kb.WIKI / "sources/existing.md", card)
    path, created = kb.intake(vault, "https://example.com/article", TODAY, "duplicate")
    assert not created and path.name == "existing.md"


@pytest.mark.parametrize("failure", ["stage", "publish"])
def test_build_failure_restores_entire_previous_projection(vault, monkeypatch, failure):
    write(vault / kb.WIKI / "lessons/card.md", LESSON)
    kb.build(vault, TODAY)
    files = [vault / "ROUTER.md", *sorted((vault / kb.ROUTES).rglob("*.md"))]
    before = {path: path.read_bytes() for path in files}
    write(vault / kb.TAXONOMY, TAXONOMY.replace("name: 服务器", "name: 新服务器"))
    if failure == "stage":
        stage = storage.stage_bytes
        def fail(path, content):
            if path.name == "ROUTER.md":
                raise OSError("injected stage failure")
            return stage(path, content)
        monkeypatch.setattr(storage, "stage_bytes", fail)
    else:
        replace = storage.os.replace
        def fail(source, target):
            if Path(target).name == "ROUTER.md":
                raise OSError("injected publication failure")
            return replace(source, target)
        monkeypatch.setattr(storage.os, "replace", fail)
    with pytest.raises(OSError, match="injected"):
        kb.build(vault, TODAY)
    assert {path: path.read_bytes() for path in files} == before
    assert not list(vault.rglob("*.tmp")) and not (vault / ".kb-write.lock").exists()


def test_relative_vault_build_embeds_absolute_portable_commands(vault, monkeypatch):
    write(vault / kb.WIKI / "lessons/card.md", LESSON)
    monkeypatch.chdir(vault)
    kb.build(Path("."), TODAY)
    router = (vault / "ROUTER.md").read_text(encoding="utf-8")
    assert f'--vault "{vault.as_posix()}"' in router
    assert f'python "{Path(kb.__file__).as_posix()}"' in router
