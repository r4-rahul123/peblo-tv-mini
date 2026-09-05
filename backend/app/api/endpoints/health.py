import time
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.services.storage import get_storage_provider
from app.services.catalog_publisher import CATALOG_DESTINATION_PATH

router = APIRouter()

@router.get("/")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Production health & readiness endpoint.
    Checks: Database connectivity, storage backend readiness, catalogue status.
    """
    # 1. DB ping
    db_ok = True
    db_latency_ms = 0.0
    try:
        t0 = time.time()
        await db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception:
        db_ok = False

    # 2. Storage & Catalog check
    storage = get_storage_provider()
    catalog_published = await storage.file_exists(CATALOG_DESTINATION_PATH)

    overall_status = "healthy" if (db_ok and catalog_published) else "degraded"

    return {
        "status": overall_status,
        "database": {
            "connected": db_ok,
            "latency_ms": db_latency_ms
        },
        "catalogue": {
            "published": catalog_published,
            "path": CATALOG_DESTINATION_PATH
        },
        "version": "1.0.0"
    }
