import io
import json
from pathlib import Path

from PIL import Image

from app.schemas.schemas import ArtworkValidationResult

REF_FILE = Path(__file__).parent.parent / "data" / "reference.json"
if REF_FILE.exists():
    with open(REF_FILE, "r", encoding="utf-8") as f:
        REFERENCE_DATA = json.load(f)
else:
    REFERENCE_DATA = {}

ARTWORK_SPECS = REFERENCE_DATA.get(
    "artwork_specs",
    {
        "poster": {
            "ratio_float": 2 / 3,
            "ratio_tolerance": 0.05,
            "max_size_bytes": 204800,
            "min_width": 400,
            "min_height": 600,
            "aspect_ratio": "2:3",
        },
        "banner": {
            "ratio_float": 16 / 9,
            "ratio_tolerance": 0.05,
            "max_size_bytes": 204800,
            "min_width": 960,
            "min_height": 540,
            "aspect_ratio": "16:9",
        },
        "thumbnail": {
            "ratio_float": 16 / 9,
            "ratio_tolerance": 0.05,
            "max_size_bytes": 204800,
            "min_width": 320,
            "min_height": 180,
            "aspect_ratio": "16:9",
        },
    },
)


def validate_artwork_image(
    file_bytes: bytes, artwork_type: str
) -> ArtworkValidationResult:
    """
    Strictly validates artwork image against the specifications in reference.json:
    - 200 KB ceiling (204,800 bytes)
    - Aspect ratio tolerances
    - Minimum dimension floors
    - Returns human-friendly, actionable error messages for non-technical editors.
    """
    errors: list[str] = []
    warnings: list[str] = []
    file_size_bytes = len(file_bytes)
    file_size_kb = round(file_size_bytes / 1024, 1)

    spec = ARTWORK_SPECS.get(artwork_type)
    if not spec:
        return ArtworkValidationResult(
            is_valid=False,
            artwork_type=artwork_type,
            width=0,
            height=0,
            aspect_ratio=0.0,
            file_size_bytes=file_size_bytes,
            file_size_kb=file_size_kb,
            errors=[
                f"Unknown artwork slot type '{artwork_type}'. Valid types are: poster, banner, thumbnail."
            ],
        )

    # 1. Enforce 200 KB ceiling (204,800 bytes)
    max_bytes = spec.get("max_size_bytes", 204800)
    if file_size_bytes > max_bytes:
        errors.append(
            f"File size ({file_size_kb} KB) exceeds the maximum allowed limit of 200 KB. "
            f"Please compress your image before uploading."
        )

    # 2. Inspect image dimensions using Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        width, height = image.size
        calculated_ratio = width / height if height > 0 else 0
    except Exception as e:
        errors.append(f"Corrupt or invalid image file format. ({e!s})")
        return ArtworkValidationResult(
            is_valid=False,
            artwork_type=artwork_type,
            width=0,
            height=0,
            aspect_ratio=0.0,
            file_size_bytes=file_size_bytes,
            file_size_kb=file_size_kb,
            errors=errors,
        )

    # 3. Enforce minimum dimensions
    min_w = spec.get("min_width", 100)
    min_h = spec.get("min_height", 100)
    if width < min_w or height < min_h:
        errors.append(
            f"Resolution is too low ({width}x{height}px). "
            f"For {artwork_type}, the minimum required resolution is {min_w}x{min_h}px."
        )

    # 4. Enforce aspect ratio with tolerance
    target_ratio = spec.get("ratio_float", 1.0)
    tolerance = spec.get("ratio_tolerance", 0.05)
    expected_ratio_str = spec.get("aspect_ratio", "specified ratio")

    ratio_diff = abs(calculated_ratio - target_ratio)
    if ratio_diff > tolerance:
        errors.append(
            f"Invalid aspect ratio ({calculated_ratio:.2f}). "
            f"{artwork_type.capitalize()} artwork must be {expected_ratio_str} "
            f"(target ratio ~{target_ratio:.2f}, got {width}x{height}px). "
            f"Please crop the image to {expected_ratio_str} before uploading."
        )

    is_valid = len(errors) == 0
    return ArtworkValidationResult(
        is_valid=is_valid,
        artwork_type=artwork_type,
        width=width,
        height=height,
        aspect_ratio=round(calculated_ratio, 3),
        file_size_bytes=file_size_bytes,
        file_size_kb=file_size_kb,
        errors=errors,
        warnings=warnings,
    )
