import os
import shutil
import aiofiles
from pathlib import Path
from typing import Union
from app.services.storage.base import StorageProvider

class LocalDiskStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = "./storage"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        (self.base_dir / "artwork").mkdir(parents=True, exist_ok=True)
        (self.base_dir / "catalog").mkdir(parents=True, exist_ok=True)

    async def save_file(self, file_content: bytes, destination_path: str, content_type: str = "image/jpeg") -> str:
        # Normalize relative path
        clean_path = destination_path.lstrip("/").replace("storage/", "")
        target_path = self.base_dir / clean_path
        target_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(target_path, "wb") as f:
            await f.write(file_content)

        return f"/storage/{clean_path}".replace("\\", "/")

    async def read_file(self, path: str) -> bytes:
        clean_path = path.lstrip("/").replace("storage/", "")
        target_path = self.base_dir / clean_path
        if not target_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        async with aiofiles.open(target_path, "rb") as f:
            return await f.read()

    async def atomic_write(self, content: Union[str, bytes], destination_path: str) -> str:
        """
        Atomic write implementation:
        1. Write content to a temporary staging file (destination_path.tmp.<pid>)
        2. Flush and sync to disk
        3. Use os.replace() which performs an atomic rename/swap on POSIX and modern Windows NTFS.
        """
        clean_path = destination_path.lstrip("/").replace("storage/", "")
        target_path = self.base_dir / clean_path
        target_path.parent.mkdir(parents=True, exist_ok=True)

        tmp_path = target_path.with_suffix(f".tmp.{os.getpid()}")

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
        clean_path = path.lstrip("/").replace("storage/", "")
        target_path = self.base_dir / clean_path
        return target_path.exists()
