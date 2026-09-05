import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_loader import load_seed_data
from app.services.catalog_publisher import publish_catalog
from app.api.endpoints import shows, episodes, seasons, artwork, catalog, validation, auth, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist and seed data
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await load_seed_data(session)
        # Automatically generate initial catalogue.json on startup
        try:
            await publish_catalog(session, triggered_by="system-startup")
        except Exception as e:
            print("Initial publish skipped or failed:", e)

    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local storage folder for artwork and catalogue file access
storage_dir = os.path.abspath(settings.LOCAL_STORAGE_DIR)
os.makedirs(storage_dir, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")

# Include API Routers with API_V1_STR prefix (for frontend client requests)
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(shows.router, prefix=f"{settings.API_V1_STR}/shows", tags=["Shows"])
app.include_router(seasons.router, prefix=f"{settings.API_V1_STR}/seasons", tags=["Seasons"])
app.include_router(episodes.router, prefix=f"{settings.API_V1_STR}/episodes", tags=["Episodes"])
app.include_router(artwork.router, prefix=f"{settings.API_V1_STR}/artwork", tags=["Artwork"])
app.include_router(catalog.router, prefix=f"{settings.API_V1_STR}/catalog", tags=["Viewer Catalog"])
app.include_router(catalog.router, prefix=f"{settings.API_V1_STR}/admin/catalog", tags=["Admin Catalog Publishing"])
app.include_router(validation.router, prefix=f"{settings.API_V1_STR}/admin/validation", tags=["Admin Validation"])
app.include_router(validation.router, prefix=f"{settings.API_V1_STR}/admin/validation-report", tags=["Admin Validation Spec"])

# Also mount at root for direct browser / REST access
app.include_router(catalog.router, prefix="/catalog", tags=["Viewer Catalog Direct"])
app.include_router(catalog.router, prefix="/admin/catalog", tags=["Admin Catalog Direct"])
app.include_router(validation.router, prefix="/admin/validation", tags=["Admin Validation Direct"])
app.include_router(validation.router, prefix="/admin/validation-report", tags=["Admin Validation Report Direct"])

@app.get("/")
def root():
    return {
        "message": "Welcome to Peblo TV Mini Platform API",
        "docs": "/docs",
        "health": "/health",
        "catalog": "/api/v1/catalog"
    }
