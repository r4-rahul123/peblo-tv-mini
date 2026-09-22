from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import ValidationReport
from app.services.validation_engine import generate_validation_report

router = APIRouter()


@router.get("", response_model=ValidationReport)
@router.get("/", response_model=ValidationReport)
@router.get("/report", response_model=ValidationReport)
@router.get("/validation-report", response_model=ValidationReport)
async def get_validation_report(
    db: AsyncSession = Depends(get_db),
):
    """
    Surfaces all current publish blockers grouped cleanly for non-technical editors.
    Tokenless — no authentication required.
    """
    return await generate_validation_report(db)
