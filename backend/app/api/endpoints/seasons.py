from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_editor
from app.core.database import get_db
from app.models.models import Season, Show
from app.schemas.schemas import SeasonCreate, SeasonResponse

router = APIRouter()


@router.post(
    "/show/{show_id}",
    response_model=SeasonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_season(
    show_id: str,
    season_in: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor),
):
    res = await db.execute(select(Show).where(Show.id == show_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Show '{show_id}' not found.")

    res_exist = await db.execute(
        select(Season).where(
            Season.show_id == show_id, Season.season_number == season_in.season_number
        )
    )
    if res_exist.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Season {season_in.season_number} already exists for this show.",
        )

    season = Season(show_id=show_id, **season_in.model_dump())
    db.add(season)
    await db.commit()
    await db.refresh(season)
    return season
