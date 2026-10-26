"""Small filesystem boundary shared by every knowledge write operation."""
from __future__ import annotations

import os
import re
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path


def validate_id(value: str) -> str:
    """IDs are portable single filenames, never paths or Windows devices."""
    if (not value or value != value.strip() or value in {".", ".."}
            or re.search(r'[\\/:*?"<>|\x00-\x1f]', value)
            or value.endswith((".", " "))
            or re.fullmatch(r"(?i)(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?", value)):
        raise ValueError("id 必须是有效的单个文件名，不能包含路径或保留设备名")
    return value


def checked_path(root: Path, relative: str | Path) -> Path:
    root = root.resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or target == root:
        raise ValueError(f"路径超出目标目录：{relative}")
    return target


@contextmanager
def file_lock(path: Path, wait_seconds: float = 0):
    """Serialize cooperating writers; never steal an unknown owner's lock."""
    path.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + wait_seconds
    while True:
        try:
            descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except FileExistsError as exc:
            if time.monotonic() >= deadline:
                raise ValueError(f"有写入正在进行：{path}；确认写入进程结束后再重试") from exc
            time.sleep(0.02)
    try:
        with os.fdopen(descriptor, "w", encoding="ascii") as handle:
            handle.write(str(os.getpid()))
        yield
    finally:
        path.unlink()


def vault_lock(vault: Path):
    return file_lock(vault.resolve() / ".kb-write.lock", wait_seconds=5)


def stage_bytes(path: Path, content: bytes) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".kb-", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        return temporary
    except BaseException:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        raise


def atomic_write(path: Path, content: bytes, *, create: bool = False,
                 expected: bytes | None = None) -> None:
    temporary = stage_bytes(path, content)
    try:
        if expected is not None and path.read_bytes() != expected:
            raise ValueError("卡片被其他编辑者修改，停止覆盖；请重新 read")
        if create:
            # Linking a complete temporary file publishes it exclusively on NTFS/POSIX.
            os.link(temporary, path)
        else:
            os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def publish_files(changes: dict[Path, bytes | None]) -> None:
    """Stage all projection files, restore applied files after an ordinary IO failure.

    Readers may briefly observe different generations. This is not a filesystem-wide
    transaction across process termination or power loss; projections are rebuildable.
    """
    originals = {path: path.read_bytes() if path.exists() else None for path in changes}
    changes = {path: content for path, content in changes.items() if originals[path] != content}
    staged: dict[Path, Path] = {}
    applied: list[Path] = []
    try:
        for path, content in changes.items():
            if content is not None:
                staged[path] = stage_bytes(path, content)
        for path, content in changes.items():
            if content is None:
                path.unlink()
            else:
                os.replace(staged[path], path)
            applied.append(path)
    except BaseException as error:
        failures = []
        for path in reversed(applied):
            try:
                original = originals[path]
                if original is None:
                    path.unlink(missing_ok=True)
                else:
                    atomic_write(path, original)
            except OSError as rollback_error:
                failures.append(f"{path}: {rollback_error}")
        if failures:
            raise OSError(f"发布失败且部分恢复失败；重新 build：{'; '.join(failures)}") from error
        raise
    finally:
        for path in staged.values():
            path.unlink(missing_ok=True)
