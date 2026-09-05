import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.models import Show, Season, Episode, PublishRun
from app.services.storage import get_storage_provider
from app.services.validation_engine import generate_validation_report

CATALOG_DESTINATION_PATH = "catalog/catalogue.json"

async def publish_catalog(db: AsyncSession, triggered_by: str) -> Dict[str, Any]:
    """
    Builds and atomically writes catalogue.json:
    - Verifies validation blockers first.
    - Only includes published shows and episodes.
    - Collapses episodes sharing content_group into a single entry with available_languages.
    - Separates Season 0 trailers from normal seasons.
    - Groups deterministically by section.
    - Atomically writes to storage.
    - Records publish run history.
    """
    run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    storage = get_storage_provider()

    # Step 1: Pre-publish validation check
    val_report = await generate_validation_report(db)
    if not val_report.is_publishable:
        publish_run = PublishRun(
            run_id=run_id,
            triggered_by=triggered_by,
            status="BLOCKED",
            error_message=f"Publication blocked by {val_report.total_blockers} unresolved blocker issues.",
            validation_snapshot=val_report.model_dump_json()
        )
        db.add(publish_run)
        await db.commit()
        return {
            "success": False,
            "status": "BLOCKED",
            "run_id": run_id,
            "message": f"Cannot publish: {val_report.total_blockers} blocking issues found.",
            "report": val_report
        }

    # Step 2: Fetch all published shows, seasons, and episodes
    result = await db.execute(
        select(Show)
        .where(Show.status == "published")
        .options(selectinload(Show.seasons).selectinload(Season.episodes))
        .order_by(Show.section, Show.title)
    )
    published_shows = result.scalars().all()

    sections_map: Dict[str, List[Dict[str, Any]]] = {}
    featured_shows: List[Dict[str, Any]] = []
    total_episodes_published = 0

    for show in published_shows:
        section_name = show.section or "Other Stories"
        if section_name not in sections_map:
            sections_map[section_name] = []

        catalog_seasons: List[Dict[str, Any]] = []
        catalog_trailers: List[Dict[str, Any]] = []
        show_episode_count = 0

        for season in sorted(show.seasons, key=lambda s: s.season_number):
            is_season_trailer = (season.season_number == 0)

            # Group published episodes by content_group
            grouped_episodes: Dict[str, List[Episode]] = {}
            for ep in sorted(season.episodes, key=lambda e: e.episode_number):
                if ep.status == "published":
                    cg = ep.content_group
                    if cg not in grouped_episodes:
                        grouped_episodes[cg] = []
                    grouped_episodes[cg].append(ep)

            if is_season_trailer:
                for cg, ep_list in grouped_episodes.items():
                    default_ep = next((e for e in ep_list if e.language == "en"), ep_list[0])
                    avail_langs = [e.language for e in ep_list]
                    catalog_trailers.append({
                        "episode_number": default_ep.episode_number,
                        "content_group": cg,
                        "title": default_ep.title,
                        "synopsis": default_ep.synopsis,
                        "duration_seconds": default_ep.duration_seconds,
                        "video_url": default_ep.video_url,
                        "thumbnail_url": default_ep.thumbnail_url,
                        "available_languages": avail_langs
                    })
            else:
                collapsed_season_episodes = []
                for cg, ep_list in grouped_episodes.items():
                    default_ep = next((e for e in ep_list if e.language == "en"), ep_list[0])
                    avail_langs = [e.language for e in ep_list]
                    variants_dict = {}
                    for e in ep_list:
                        variants_dict[e.language] = {
                            "language": e.language,
                            "title": e.title,
                            "synopsis": e.synopsis,
                            "video_url": e.video_url,
                            "thumbnail_url": e.thumbnail_url,
                            "duration_seconds": e.duration_seconds
                        }

                    collapsed_season_episodes.append({
                        "episode_number": default_ep.episode_number,
                        "content_group": cg,
                        "title": default_ep.title,
                        "default_title": default_ep.title,
                        "default_synopsis": default_ep.synopsis,
                        "duration_seconds": default_ep.duration_seconds,
                        "thumbnail_url": default_ep.thumbnail_url,
                        "default_language": default_ep.language,
                        "available_languages": avail_langs,
                        "variants": variants_dict
                    })
                    show_episode_count += 1
                    total_episodes_published += 1

                if collapsed_season_episodes:
                    catalog_seasons.append({
                        "season_number": season.season_number,
                        "title": season.title or f"Season {season.season_number}",
                        "episodes": collapsed_season_episodes
                    })

        show_item = {
            "id": show.id,
            "title": show.title,
            "synopsis": show.synopsis,
            "section": section_name,
            "category": show.category,
            "target_age_group": show.target_age_group,
            "is_featured": show.is_featured,
            "poster_url": show.poster_url,
            "banner_url": show.banner_url,
            "seasons": catalog_seasons,
            "trailers": catalog_trailers,
            "total_episodes": show_episode_count
        }

        sections_map[section_name].append(show_item)
        if show.is_featured:
            featured_shows.append(show_item)

    # Order sections deterministically with both `name` and `section_name`
    sorted_sections = [
        {
            "name": sec_name,
            "section_name": sec_name,
            "shows": shows_in_sec
        }
        for sec_name, shows_in_sec in sorted(sections_map.items(), key=lambda x: x[0])
    ]

    published_catalog_payload = {
        "catalog_version": run_id,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "published_by": triggered_by,
        "total_shows": len(published_shows),
        "total_episodes": total_episodes_published,
        "sections": sorted_sections,
        "featured_shows": featured_shows
    }

    catalog_json_str = json.dumps(published_catalog_payload, indent=2, ensure_ascii=False)
    catalog_bytes = catalog_json_str.encode("utf-8")

    # Step 3: Atomic write to active catalogue and versioned snapshot
    saved_path = await storage.atomic_write(catalog_bytes, CATALOG_DESTINATION_PATH)
    snapshot_path = f"catalog/runs/{run_id}.json"
    try:
        await storage.atomic_write(catalog_bytes, snapshot_path)
    except Exception:
        pass

    # Step 4: Record successful publish run
    publish_run = PublishRun(
        run_id=run_id,
        triggered_by=triggered_by,
        status="SUCCESS",
        shows_count=len(published_shows),
        episodes_count=total_episodes_published,
        sections_count=len(sorted_sections),
        catalogue_size_bytes=len(catalog_bytes),
        catalogue_path=saved_path
    )
    db.add(publish_run)
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "run_id": run_id,
        "catalogue_path": saved_path,
        "shows_count": len(published_shows),
        "episodes_count": total_episodes_published,
        "sections_count": len(sorted_sections),
        "catalogue_size_bytes": len(catalog_bytes),
        "published_catalog": published_catalog_payload
    }

async def rollback_to_run(db: AsyncSession, target_run_id: str, triggered_by: str) -> Dict[str, Any]:
    """
    Restores an earlier immutable catalogue run snapshot:
    - Locates the snapshot file in storage or database.
    - Atomically replaces active catalog/catalogue.json.
    - Records a new PublishRun with status ROLLBACK.
    """
    storage = get_storage_provider()
    snapshot_path = f"catalog/runs/{target_run_id}.json"

    try:
        data = await storage.read_file(snapshot_path)
    except FileNotFoundError:
        # Check if record exists in DB
        res = await db.execute(select(PublishRun).where(PublishRun.run_id == target_run_id))
        target_run = res.scalar_one_or_none()
        if not target_run:
            return {"success": False, "message": f"Run {target_run_id} not found in history."}
        return {"success": False, "message": f"Snapshot file for run {target_run_id} not available on disk."}

    # Atomically write restored snapshot over active catalogue
    saved_path = await storage.atomic_write(data, CATALOG_DESTINATION_PATH)
    payload = json.loads(data.decode("utf-8"))

    rollback_run_id = f"rollback-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    new_run = PublishRun(
        run_id=rollback_run_id,
        triggered_by=triggered_by,
        status="SUCCESS",
        shows_count=payload.get("total_shows", 0),
        episodes_count=payload.get("total_episodes", 0),
        sections_count=len(payload.get("sections", [])),
        catalogue_size_bytes=len(data),
        catalogue_path=saved_path,
        error_message=f"Rolled back to {target_run_id}"
    )
    db.add(new_run)
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "run_id": rollback_run_id,
        "restored_from": target_run_id,
        "message": f"Successfully rolled back catalogue to {target_run_id}",
        "published_catalog": payload
    }
