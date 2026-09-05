import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_editor
from app.core.database import get_db
from app.models.models import Artwork
from app.schemas.schemas import ArtworkResponse, ArtworkValidationResult
from app.services.artwork_validator import validate_artwork_image
from app.services.storage import get_storage_provider

router = APIRouter()


@router.post("/validate", response_model=ArtworkValidationResult)
async def validate_artwork(
    artwork_type: str = Form(..., pattern="^(poster|banner|thumbnail)$"),
    file: UploadFile = File(...),
):
    """Pre-validation endpoint allowing CMS editors to check dimensions/size before uploading."""
    content = await file.read()
    return validate_artwork_image(content, artwork_type)


@router.post(
    "/upload", response_model=ArtworkResponse, status_code=status.HTTP_201_CREATED
)
async def upload_artwork(
    artwork_type: str = Form(..., pattern="^(poster|banner|thumbnail)$"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_editor),
):
    """
    Strictly validates and uploads artwork per reference.json specifications:
    - poster: 2:3 ratio, max 200KB
    - banner: 16:9 ratio, max 200KB
    - thumbnail: 16:9 ratio, max 200KB
    Returns actionable human-readable errors on failure.
    """
    content = await file.read()
    validation = validate_artwork_image(content, artwork_type)

    if not validation.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": f"Artwork validation failed for '{artwork_type}' slot.",
                "errors": validation.errors,
                "specs": {
                    "width": validation.width,
                    "height": validation.height,
                    "aspect_ratio": validation.aspect_ratio,
                    "size_kb": validation.file_size_kb,
                },
            },
        )

    # Save to storage abstraction
    storage = get_storage_provider()
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    safe_filename = f"{artwork_type}_{uuid.uuid4().hex[:8]}.{ext}"
    dest_path = f"artwork/{safe_filename}"

    file_url = await storage.save_file(
        content, dest_path, content_type=file.content_type or "image/jpeg"
    )

    # Record in database
    artwork_record = Artwork(
        artwork_type=artwork_type,
        file_name=file.filename,
        file_url=file_url,
        file_size_bytes=validation.file_size_bytes,
        width=validation.width,
        height=validation.height,
        aspect_ratio=validation.aspect_ratio,
        content_type=file.content_type or "image/jpeg",
        uploaded_by=user.username,
    )
    db.add(artwork_record)
    await db.commit()
    await db.refresh(artwork_record)

    return artwork_record
