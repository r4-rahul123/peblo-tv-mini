from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, require_editor
from app.core.database import get_db
from app.models.models import Season, Show
from app.schemas.schemas import ShowCreate, ShowResponse, ShowUpdate

router = APIRouter()


@router.get("/", response_model=list[ShowResponse])
async def list_shows(
    db: AsyncSession = Depends(get_db),
    section: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    category: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    query = select(Show).options(
        selectinload(Show.seasons).selectinload(Season.episodes)
    )
    if section:
        query = query.where(Show.section == section)
    if status_filter:
        query = query.where(Show.status == status_filter)
    if category:
        query = query.where(Show.category == category)
    if q:
        query = query.where(
            or_(Show.title.ilike(f"%{q}%"), Show.synopsis.ilike(f"%{q}%"))
        )

    query = query.order_by(Show.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{show_id}", response_model=ShowResponse)
async def get_show(show_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Show)
        .where(Show.id == show_id)
        .options(selectinload(Show.seasons).selectinload(Season.episodes))
    )
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail=f"Show '{show_id}' not found.")
    return show


@router.post("/", response_model=ShowResponse, status_code=status.HTTP_201_CREATED)
async def create_show(
    show_in: ShowCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor),
):
    show = Show(**show_in.model_dump())
    db.add(show)
    await db.commit()
    await db.refresh(show)
    # create default Season 1 and Season 0 (Trailers)
    s0 = Season(show_id=show.id, season_number=0, title="Trailers & Clips")
    s1 = Season(show_id=show.id, season_number=1, title="Season 1")
    db.add_all([s0, s1])
    await db.commit()

    result = await db.execute(
        select(Show)
        .where(Show.id == show.id)
        .options(selectinload(Show.seasons).selectinload(Season.episodes))
    )
    return result.scalar_one()


@router.put("/{show_id}", response_model=ShowResponse)
async def update_show(
    show_id: str,
    show_in: ShowUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor),
):
    result = await db.execute(
        select(Show)
        .where(Show.id == show_id)
        .options(selectinload(Show.seasons).selectinload(Season.episodes))
    )
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail=f"Show '{show_id}' not found.")

    for field, val in show_in.model_dump(exclude_unset=True).items():
        setattr(show, field, val)

    await db.commit()
    await db.refresh(show)
    return show


@router.delete("/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor),
):
    result = await db.execute(select(Show).where(Show.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail=f"Show '{show_id}' not found.")
    await db.delete(show)
    await db.commit()
