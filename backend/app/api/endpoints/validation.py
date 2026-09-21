from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_editor
from app.core.database import get_db
from app.schemas.schemas import ValidationReport
from app.services.validation_engine import generate_validation_report

router = APIRouter()


@router.get("", response_model=ValidationReport)
@router.get("/", response_model=ValidationReport)
@router.get("/report", response_model=ValidationReport)
@router.get("/validation-report", response_model=ValidationReport)
async def get_validation_report(
    db: AsyncSession = Depends(get_db), user: CurrentUser = Depends(require_editor)
):
    """
    Surfaces all current publish blockers grouped cleanly for non-technical editors.
    """
    return await generate_validation_report(db)
