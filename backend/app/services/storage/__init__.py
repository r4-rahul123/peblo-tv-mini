from app.core.config import settings
from app.services.storage.base import StorageProvider
from app.services.storage.local import LocalDiskStorageProvider
from app.services.storage.r2 import CloudflareR2StorageProvider


def get_storage_provider() -> StorageProvider:
    if settings.STORAGE_BACKEND == "r2" and settings.R2_ACCESS_KEY_ID:
        return CloudflareR2StorageProvider()
    return LocalDiskStorageProvider(base_dir=settings.LOCAL_STORAGE_DIR)
