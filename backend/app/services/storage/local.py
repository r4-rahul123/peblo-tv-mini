import os
import uuid
from pathlib import Path

import aiofiles

from app.services.storage.base import StorageProvider


class LocalDiskStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = "./storage"):
        resolved = Path(base_dir).resolve()
        candidate_dirs = [
            resolved,
            Path(__file__).resolve().parent.parent.parent / "storage",
            Path(__file__).resolve().parent.parent.parent.parent / "storage",
        ]
        chosen = resolved
        for d in candidate_dirs:
            if (d / "artwork").exists():
                chosen = d
                break
        self.base_dir = chosen
        self.base_dir.mkdir(parents=True, exist_ok=True)
        (self.base_dir / "artwork").mkdir(parents=True, exist_ok=True)
        (self.base_dir / "catalog").mkdir(parents=True, exist_ok=True)

    def _safe_path(self, destination_path: str) -> Path:
        """Sanitize path to prevent directory traversal attacks."""
        clean_path = destination_path.lstrip("/").replace("storage/", "")
        target_path = (self.base_dir / clean_path).resolve()
        if not target_path.is_relative_to(self.base_dir.resolve()):
            raise ValueError(f"Path traversal detected: {destination_path}")
        return target_path

    async def save_file(
        self,
        file_content: bytes,
        destination_path: str,
        content_type: str = "image/jpeg",
    ) -> str:
        # Normalize relative path
        target_path = self._safe_path(destination_path)
        clean_path = target_path.relative_to(self.base_dir.resolve())
        target_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(target_path, "wb") as f:
            await f.write(file_content)

        return f"/storage/{clean_path}".replace("\\", "/")

    async def read_file(self, path: str) -> bytes:
        target_path = self._safe_path(path)
        if not target_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        async with aiofiles.open(target_path, "rb") as f:
            return await f.read()

    async def atomic_write(self, content: str | bytes, destination_path: str) -> str:
        """
        Atomic write implementation:
        1. Write content to a temporary staging file (destination_path.tmp.<pid>)
        2. Flush and sync to disk
        3. Use os.replace() which performs an atomic rename/swap on POSIX and modern Windows NTFS.
        """
        target_path = self._safe_path(destination_path)
        clean_path = target_path.relative_to(self.base_dir.resolve())
        target_path.parent.mkdir(parents=True, exist_ok=True)

        tmp_path = target_path.with_name(f"{target_path.name}.{uuid.uuid4().hex}.tmp")

        if isinstance(content, str):
            data = content.encode("utf-8")
        else:
            data = content

        async with aiofiles.open(tmp_path, "wb") as f:
            await f.write(data)
            await f.flush()

        # Atomic rename swap
        os.replace(tmp_path, target_path)

        return f"/storage/{clean_path}".replace("\\", "/")

    async def file_exists(self, path: str) -> bool:
        target_path = self._safe_path(path)
        return target_path.exists()
