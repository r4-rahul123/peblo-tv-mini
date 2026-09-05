import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_admin, require_editor
from app.core.database import get_db
from app.models.models import PublishRun
from app.schemas.schemas import PublishRunResponse
from app.services.catalog_publisher import (
    CATALOG_DESTINATION_PATH,
    publish_catalog,
    rollback_to_run,
)
from app.services.storage import get_storage_provider

router = APIRouter()


@router.get("", summary="Viewer Catalogue Endpoint (no slash)")
@router.get("/", summary="Viewer Catalogue Endpoint")
async def get_catalogue(db: AsyncSession = Depends(get_db)):
    """
    Serves the pre-published catalogue.json file directly from storage.
    Fast, atomic, and isolated from live operational DB transactions.
    """
    storage = get_storage_provider()
    try:
        data = await storage.read_file(CATALOG_DESTINATION_PATH)
        return json.loads(data.decode("utf-8"))
    except FileNotFoundError:
        # Fallback: if not published yet, publish automatically for smooth local DX
        result = await publish_catalog(db, triggered_by="system_init")
        if result.get("success"):
            return result.get("published_catalog")
        raise HTTPException(
            status_code=404,
            detail="Catalogue not published yet. Please publish the catalogue from the Admin CMS.",
        )


@router.get("/search", summary="Composed Catalogue Search")
async def search_catalogue(
    q: str | None = Query(
        None, description="Matches show title, synopsis, or episode title"
    ),
    category: str | None = Query(None, description="Exact category filter"),
    language: str | None = Query(None, description="Available language (e.g. en, hi)"),
    section: str | None = Query(None, description="Section filter"),
    db: AsyncSession = Depends(get_db),
):
    """
    Full composed search matching show titles, episode titles, and categories.
    All filter parameters compose together smoothly.
    """
    storage = get_storage_provider()
    try:
        data = await storage.read_file(CATALOG_DESTINATION_PATH)
        catalog = json.loads(data.decode("utf-8"))
    except FileNotFoundError:
        return {
            "results": [],
            "total": 0,
            "query": {
                "q": q,
                "category": category,
                "language": language,
                "section": section,
            },
        }

    matched_shows = []
    q_lower = q.lower().strip() if q else ""

    # Flatten all shows from all sections
    seen_show_ids = set()
    all_shows = []
    for sec in catalog.get("sections", []):
        for s in sec.get("shows", []):
            if s["id"] not in seen_show_ids:
                seen_show_ids.add(s["id"])
                all_shows.append(s)

    for show in all_shows:
        # 1. Section filter
        if section and show.get("section") != section:
            continue

        # 2. Category filter
        if category and show.get("category") != category:
            continue

        # 3. Language filter (check if any episode offers this language)
        if language:
            has_lang = False
            for season in show.get("seasons", []):
                for ep in season.get("episodes", []):
                    if language in ep.get("available_languages", []):
                        has_lang = True
                        break
                if has_lang:
                    break
            if not has_lang:
                continue

        # 4. Text query `q` filter (matches show title, synopsis, or any episode title)
        if q_lower:
            match_title = q_lower in show.get("title", "").lower()
            match_synopsis = q_lower in (show.get("synopsis") or "").lower()
            match_category = q_lower in (show.get("category") or "").lower()
            match_episode = False
            for season in show.get("seasons", []):
                for ep in season.get("episodes", []):
                    if q_lower in ep.get("default_title", "").lower():
                        match_episode = True
                        break
                    for variant in ep.get("variants", {}).values():
                        if q_lower in variant.get("title", "").lower():
                            match_episode = True
                            break
                    if match_episode:
                        break
            if not (match_title or match_synopsis or match_category or match_episode):
                continue

        matched_shows.append(show)

    return {
        "results": matched_shows,
        "total": len(matched_shows),
        "filters_applied": {
            "q": q,
            "category": category,
            "language": language,
            "section": section,
        },
    }


@router.post("/publish", summary="Trigger Catalogue Publish (Admin Only)")
async def trigger_publish(
    db: AsyncSession = Depends(get_db), user: CurrentUser = Depends(require_admin)
):
    """
    Enforced Admin-only endpoint: validates content and atomically publishes catalogue.json.
    Returns 403 Forbidden for editor role.
    """
    result = await publish_catalog(db, triggered_by=user.username)
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result)
    return result


@router.post(
    "/rollback/{run_id}", summary="Rollback Catalogue to Snapshot (Admin Only)"
)
async def trigger_rollback(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_admin),
):
    """
    Restores catalogue.json to a specific historical publish run snapshot.
    Admin role enforced.
    """
    result = await rollback_to_run(db, target_run_id=run_id, triggered_by=user.username)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Rollback failed"),
        )
    return result


@router.get("/runs", response_model=list[PublishRunResponse])
async def list_publish_runs(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor),
):
    """Returns audit history of publish runs."""
    res = await db.execute(
        select(PublishRun).order_by(desc(PublishRun.created_at)).limit(limit)
    )
    return res.scalars().all()
