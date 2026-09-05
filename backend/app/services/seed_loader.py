import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Episode, Season, Show

SEED_FILE = Path(__file__).parent.parent / "data" / "seed_shows.json"


async def load_seed_data(db: AsyncSession, force_reload: bool = False):
    """
    Seeds the database with seed_shows.json if not already populated.
    """
    result = await db.execute(select(Show))
    existing_shows = result.scalars().all()
    if existing_shows and not force_reload:
        return {"message": "Database already contains data. Seed skipped."}

    if not SEED_FILE.exists():
        return {"error": f"Seed file {SEED_FILE} not found."}

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        shows_data = json.load(f)

    for s_data in shows_data:
        show = Show(
            id=s_data.get("id"),
            title=s_data["title"],
            synopsis=s_data.get("synopsis"),
            section=s_data.get("section"),
            category=s_data.get("category"),
            target_age_group=s_data.get("target_age_group", "4-8"),
            is_featured=s_data.get("is_featured", False),
            status=s_data.get("status", "draft"),
            poster_url=s_data.get("poster_url"),
            banner_url=s_data.get("banner_url"),
        )
        db.add(show)
        await db.flush()

        for season_data in s_data.get("seasons", []):
            season = Season(
                show_id=show.id,
                season_number=season_data.get("season_number", 1),
                title=season_data.get("title"),
            )
            db.add(season)
            await db.flush()

            for ep_data in season_data.get("episodes", []):
                ep = Episode(
                    season_id=season.id,
                    episode_number=ep_data.get("episode_number", 1),
                    title=ep_data["title"],
                    synopsis=ep_data.get("synopsis"),
                    duration_seconds=ep_data.get("duration_seconds", 0),
                    content_group=ep_data["content_group"],
                    language=ep_data.get("language", "en"),
                    video_url=ep_data.get("video_url"),
                    thumbnail_url=ep_data.get("thumbnail_url"),
                    status=ep_data.get("status", "draft"),
                )
                db.add(ep)

    await db.commit()
    return {"message": f"Successfully loaded {len(shows_data)} shows into database."}
