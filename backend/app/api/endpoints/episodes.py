from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.api.deps import require_editor, CurrentUser
from app.models.models import Episode, Season, Show
from app.schemas.schemas import EpisodeCreate, EpisodeUpdate, EpisodeResponse

router = APIRouter()

@router.post("/season/{season_id}", response_model=EpisodeResponse, status_code=status.HTTP_201_CREATED)
async def create_episode(
    season_id: str,
    ep_in: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor)
):
    # Verify season exists
    res = await db.execute(select(Season).where(Season.id == season_id))
    season = res.scalar_one_or_none()
    if not season:
        raise HTTPException(status_code=404, detail=f"Season '{season_id}' not found.")

    # Enforce (content_group, language) uniqueness
    res_dup = await db.execute(
        select(Episode).where(
            and_(
                Episode.content_group == ep_in.content_group,
                Episode.language == ep_in.language
            )
        )
    )
    if res_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An episode with content_group '{ep_in.content_group}' and language '{ep_in.language}' already exists."
        )

    episode = Episode(season_id=season_id, **ep_in.model_dump())
    db.add(episode)
    await db.commit()
    await db.refresh(episode)
    return episode

@router.put("/{episode_id}", response_model=EpisodeResponse)
async def update_episode(
    episode_id: str,
    ep_in: EpisodeUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor)
):
    res = await db.execute(select(Episode).where(Episode.id == episode_id))
    ep = res.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail=f"Episode '{episode_id}' not found.")

    data = ep_in.model_dump(exclude_unset=True)
    new_cg = data.get("content_group", ep.content_group)
    new_lang = data.get("language", ep.language)

    if new_cg != ep.content_group or new_lang != ep.language:
        res_dup = await db.execute(
            select(Episode).where(
                and_(
                    Episode.content_group == new_cg,
                    Episode.language == new_lang,
                    Episode.id != ep.id
                )
            )
        )
        if res_dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Conflict: (content_group='{new_cg}', language='{new_lang}') already in use by another episode."
            )

    for k, v in data.items():
        setattr(ep, k, v)

    await db.commit()
    await db.refresh(ep)
    return ep

@router.delete("/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_episode(
    episode_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor)
):
    res = await db.execute(select(Episode).where(Episode.id == episode_id))
    ep = res.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail=f"Episode '{episode_id}' not found.")
    await db.delete(ep)
    await db.commit()
    return None
