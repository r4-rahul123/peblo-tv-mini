import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.models import Episode, Season, Show
from app.services.catalog_publisher import publish_catalog


@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    async with Session() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_catalog_content_group_collapsing(test_db):
    # Setup a valid show with Hindi and English episodes sharing same content_group
    show = Show(
        id="test-show-1",
        title="Bilingual Moti",
        section="Top Picks for You",
        status="published",
        poster_url="/storage/artwork/poster.jpg",
        banner_url="/storage/artwork/banner.jpg",
    )
    test_db.add(show)
    await test_db.flush()

    s1 = Season(show_id=show.id, season_number=1, title="Season 1")
    s0 = Season(show_id=show.id, season_number=0, title="Trailers")
    test_db.add_all([s1, s0])
    await test_db.flush()

    # Ep 1 English & Hindi
    ep1_en = Episode(
        season_id=s1.id,
        episode_number=1,
        title="Hello World",
        duration_seconds=300,
        content_group="cg-1",
        language="en",
        thumbnail_url="/storage/artwork/thumb.jpg",
        status="published",
    )
    ep1_hi = Episode(
        season_id=s1.id,
        episode_number=2,
        title="नमस्ते दुनिया",
        duration_seconds=300,
        content_group="cg-1",
        language="hi",
        thumbnail_url="/storage/artwork/thumb.jpg",
        status="published",
    )
    # Trailer
    t1 = Episode(
        season_id=s0.id,
        episode_number=1,
        title="Official Trailer",
        duration_seconds=60,
        content_group="cg-trailer-1",
        language="en",
        thumbnail_url="/storage/artwork/thumb_t.jpg",
        status="published",
    )
    test_db.add_all([ep1_en, ep1_hi, t1])
    await test_db.commit()

    # Trigger publish
    res = await publish_catalog(test_db, triggered_by="admin@test.com")
    assert res["success"] is True
    catalog = res["published_catalog"]

    # Verify Season 0 trailers separated
    show_entry = catalog["sections"][0]["shows"][0]
    assert len(show_entry["trailers"]) == 1
    assert show_entry["trailers"][0]["content_group"] == "cg-trailer-1"

    # Verify content_group collapsed into single episode with 2 languages
    season_1 = show_entry["seasons"][0]
    assert len(season_1["episodes"]) == 1
    collapsed_ep = season_1["episodes"][0]
    assert collapsed_ep["content_group"] == "cg-1"
    assert "en" in collapsed_ep["available_languages"]
    assert "hi" in collapsed_ep["available_languages"]
    assert len(collapsed_ep["variants"]) == 2


@pytest.mark.asyncio
async def test_catalog_rollback(test_db):
    from app.services.catalog_publisher import rollback_to_run

    show = Show(
        id="test-show-rollback",
        title="Rollback Show",
        section="Featured",
        status="published",
        poster_url="/storage/artwork/poster.jpg",
        banner_url="/storage/artwork/banner.jpg",
    )
    test_db.add(show)
    await test_db.flush()

    s1 = Season(show_id=show.id, season_number=1, title="Season 1")
    test_db.add(s1)
    await test_db.flush()

    ep1 = Episode(
        season_id=s1.id,
        episode_number=1,
        title="Ep 1",
        duration_seconds=120,
        content_group="cg-rb-1",
        language="en",
        thumbnail_url="/storage/artwork/thumb.jpg",
        status="published",
    )
    test_db.add(ep1)
    await test_db.commit()

    # 1. Publish Run 1
    res1 = await publish_catalog(test_db, triggered_by="admin@test.com")
    assert res1["success"] is True
    run_1_id = res1["run_id"]

    # 2. Add second episode and Publish Run 2
    ep2 = Episode(
        season_id=s1.id,
        episode_number=2,
        title="Ep 2",
        duration_seconds=180,
        content_group="cg-rb-2",
        language="en",
        thumbnail_url="/storage/artwork/thumb2.jpg",
        status="published",
    )
    test_db.add(ep2)
    await test_db.commit()
    test_db.expire_all()

    res2 = await publish_catalog(test_db, triggered_by="admin@test.com")
    assert res2["success"] is True
    assert res2["episodes_count"] == 2

    # 3. Rollback to Run 1
    rb_res = await rollback_to_run(test_db, target_run_id=run_1_id, triggered_by="admin@test.com")
    assert rb_res["success"] is True
    assert rb_res["status"] == "SUCCESS"
    assert rb_res["restored_from"] == run_1_id
    assert rb_res["published_catalog"]["total_episodes"] == 1

