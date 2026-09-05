from abc import ABC, abstractmethod


class StorageProvider(ABC):
    @abstractmethod
    async def save_file(
        self,
        file_content: bytes,
        destination_path: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """Save a file and return its accessible URL or path."""

    @abstractmethod
    async def read_file(self, path: str) -> bytes:
        """Read raw content of a stored file."""

    @abstractmethod
    async def atomic_write(self, content: str | bytes, destination_path: str) -> str:
        """
        Atomically write content to destination_path so that readers never observe
        a partial or corrupt state.
        """

    @abstractmethod
    async def file_exists(self, path: str) -> bool:
        """Check if a file exists."""
