import io
from pathlib import Path

from PIL import Image

from app.services.artwork_validator import validate_artwork_image


def create_image_bytes(width, height, format="JPEG", quality=85):
    img = Image.new("RGB", (width, height), color=(50, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format=format, quality=quality)
    return buf.getvalue()


def test_valid_poster_artwork():
    # 2:3 ratio (~600x900)
    data = create_image_bytes(600, 900)
    res = validate_artwork_image(data, "poster")
    assert res.is_valid is True
    assert len(res.errors) == 0
    assert res.width == 600
    assert res.height == 900


def test_valid_banner_artwork():
    # 16:9 ratio (~1280x720)
    data = create_image_bytes(1280, 720)
    res = validate_artwork_image(data, "banner")
    assert res.is_valid is True
    assert len(res.errors) == 0


def test_valid_thumbnail_artwork():
    # 16:9 ratio (~640x360)
    data = create_image_bytes(640, 360)
    res = validate_artwork_image(data, "thumbnail")
    assert res.is_valid is True


def test_reject_wrong_aspect_ratio():
    # 1:1 square for poster (expected 2:3)
    data = create_image_bytes(600, 600)
    res = validate_artwork_image(data, "poster")
    assert res.is_valid is False
    assert any("Invalid aspect ratio" in err for err in res.errors)


def test_reject_too_small_resolution():
    # 100x100 is below minimum dimension floor
    data = create_image_bytes(100, 100)
    res = validate_artwork_image(data, "thumbnail")
    assert res.is_valid is False
    assert any("Resolution is too low" in err for err in res.errors)


def test_reject_oversized_file():
    # Read genuine oversized PNG
    oversized_file = (
        Path(__file__).parent.parent / "app" / "data" / "assets" / "banner_too_big.png"
    )
    if not oversized_file.exists():
        oversized_file = Path("backend/app/data/assets/banner_too_big.png")
    oversized_data = oversized_file.read_bytes()
    assert len(oversized_data) > 204800
    res = validate_artwork_image(oversized_data, "banner")
    assert res.is_valid is False
    assert any(
        "exceeds the maximum allowed limit of 200 KB" in err for err in res.errors
    )
