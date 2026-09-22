import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.endpoints import (
    artwork,
    auth,
    catalog,
    episodes,
    health,
    seasons,
    shows,
    validation,
)
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine, init_database_connection
from app.models.models import Show
from app.services.catalog_publisher import publish_catalog
from app.services.seed_loader import load_seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB with retries and fallback
    await init_database_connection()

    try:
        async with AsyncSessionLocal() as session:
            # Check if shows exist in database
            result = await session.execute(select(Show))
            existing_shows = result.scalars().all()
            if not existing_shows:
                print("No shows found in database. Seeding sample shows...")
                await load_seed_data(session, force_reload=True)

            # Check if demo family account exists
            from app.models.models import ViewerAccount, UserProfileModel
            from app.core.security import hash_password
            demo_email = "family@peblo.tv"
            acc_res = await session.execute(select(ViewerAccount).where(ViewerAccount.email == demo_email))
            if not acc_res.scalar_one_or_none():
                print("Seeding default demo family account (family@peblo.tv)...")
                demo_acc = ViewerAccount(
                    email=demo_email,
                    password_hash=hash_password("password123"),
                )
                session.add(demo_acc)
                await session.flush()
                demo_profiles = [
                    UserProfileModel(id="prof-kabir", account_id=demo_acc.id, name="Kabir", age_group="2-4", is_kid=True, avatar_color="from-amber-500 to-orange-400"),
                    UserProfileModel(id="prof-siya", account_id=demo_acc.id, name="Siya", age_group="5-8", is_kid=True, avatar_color="from-purple-500 to-pink-500"),
                    UserProfileModel(id="prof-aarav", account_id=demo_acc.id, name="Aarav", age_group="9-12", is_kid=True, avatar_color="from-emerald-500 to-teal-400"),
                    UserProfileModel(id="prof-family", account_id=demo_acc.id, name="Family", age_group="All Ages", is_kid=False, avatar_color="from-blue-600 to-cyan-400"),
                ]
                session.add_all(demo_profiles)
                await session.commit()
                print("Default demo family account seeded successfully.")

            # Automatically generate initial catalogue.json on startup
            try:
                pub_result = await publish_catalog(session, triggered_by="system-startup")
                print("Initial publish status:", pub_result.get("status"))
            except Exception as e:
                print("Initial publish skipped or failed:", e)
    except Exception as e:
        import traceback
        print("Initial seed data load error:", e)
        traceback.print_exc()

    yield
    # Shutdown
    try:
        await engine.dispose()
    except Exception:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "type": type(exc).__name__,
            "traceback": traceback.format_exc(),
        },
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local storage folder for artwork and catalogue file access
candidate_dirs = [
    Path(settings.LOCAL_STORAGE_DIR).resolve(),
    Path(__file__).resolve().parent.parent / "storage",
    Path(__file__).resolve().parent.parent.parent / "storage",
]
storage_path = candidate_dirs[0]
for d in candidate_dirs:
    if (d / "artwork").exists():
        storage_path = d
        break

os.makedirs(storage_path, exist_ok=True)
os.makedirs(storage_path / "artwork", exist_ok=True)
os.makedirs(storage_path / "catalog", exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")

# Include API Routers with API_V1_STR prefix (for frontend client requests)
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(shows.router, prefix=f"{settings.API_V1_STR}/shows", tags=["Shows"])
app.include_router(
    seasons.router, prefix=f"{settings.API_V1_STR}/seasons", tags=["Seasons"]
)
app.include_router(
    episodes.router, prefix=f"{settings.API_V1_STR}/episodes", tags=["Episodes"]
)
app.include_router(
    artwork.router, prefix=f"{settings.API_V1_STR}/artwork", tags=["Artwork"]
)
app.include_router(
    catalog.router, prefix=f"{settings.API_V1_STR}/catalog", tags=["Viewer Catalog"]
)
app.include_router(
    catalog.router,
    prefix=f"{settings.API_V1_STR}/admin/catalog",
    tags=["Admin Catalog Publishing"],
)
app.include_router(
    validation.router,
    prefix=f"{settings.API_V1_STR}/admin/validation",
    tags=["Admin Validation"],
)
app.include_router(
    catalog.router,
    prefix="/admin/catalog",
    tags=["Admin Catalog Publishing"],
)
app.include_router(
    validation.router,
    prefix="/admin/validation",
    tags=["Admin Validation"],
)
app.include_router(
    validation.router,
    prefix=f"{settings.API_V1_STR}/validation",
    tags=["Admin Validation"],
)



@app.get("/")
def root():
    return {
        "message": "Welcome to Peblo TV Mini Platform API",
        "docs": "/docs",
        "health": "/health",
        "catalog": "/api/v1/catalog",
    }
