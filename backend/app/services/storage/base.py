from abc import ABC, abstractmethod
from typing import BinaryIO, Optional, Union

class StorageProvider(ABC):
    @abstractmethod
    async def save_file(self, file_content: bytes, destination_path: str, content_type: str = "image/jpeg") -> str:
        """Save a file and return its accessible URL or path."""
        pass

    @abstractmethod
    async def read_file(self, path: str) -> bytes:
        """Read raw content of a stored file."""
        pass

    @abstractmethod
    async def atomic_write(self, content: Union[str, bytes], destination_path: str) -> str:
        """
        Atomically write content to destination_path so that readers never observe
        a partial or corrupt state.
        """
        pass

    @abstractmethod
    async def file_exists(self, path: str) -> bool:
        """Check if a file exists."""
        pass
