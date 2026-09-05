import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Show(Base):
    __tablename__ = "shows"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=False, index=True)
    synopsis = Column(Text, nullable=True)
    section = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)
    target_age_group = Column(String(50), nullable=True)
    is_featured = Column(Boolean, default=False)
    status = Column(String(50), default="draft")  # draft, published, archived
    poster_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seasons = relationship(
        "Season",
        back_populates="show",
        cascade="all, delete-orphan",
        order_by="Season.season_number",
    )


class Season(Base):
    __tablename__ = "seasons"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    show_id = Column(
        String(64),
        ForeignKey("shows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    season_number = Column(
        Integer, nullable=False, default=1
    )  # 0 is reserved for Trailers per spec
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("show_id", "season_number", name="uq_show_season_number"),
    )

    show = relationship("Show", back_populates="seasons")
    episodes = relationship(
        "Episode",
        back_populates="season",
        cascade="all, delete-orphan",
        order_by="Episode.episode_number",
    )


class Episode(Base):
    __tablename__ = "episodes"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    season_id = Column(
        String(64),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    episode_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False, index=True)
    synopsis = Column(Text, nullable=True)
    duration_seconds = Column(Integer, default=0)
    content_group = Column(
        String(100), nullable=False, index=True
    )  # group ID for language variants
    language = Column(String(20), nullable=False, index=True)  # 'en', 'hi', etc.
    video_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    status = Column(String(50), default="draft")  # draft, published
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("content_group", "language", name="uq_content_group_language"),
    )

    season = relationship("Season", back_populates="episodes")


class Artwork(Base):
    __tablename__ = "artworks"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    artwork_type = Column(String(50), nullable=False)  # poster, banner, thumbnail
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    aspect_ratio = Column(Float, nullable=False)
    content_type = Column(String(100), nullable=False)
    uploaded_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PublishRun(Base):
    __tablename__ = "publish_runs"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    run_id = Column(String(100), nullable=False, unique=True, index=True)
    triggered_by = Column(String(100), nullable=False)  # e.g. "admin@mypeblo.com"
    status = Column(String(50), nullable=False)  # SUCCESS, FAILED, BLOCKED
    shows_count = Column(Integer, default=0)
    episodes_count = Column(Integer, default=0)
    sections_count = Column(Integer, default=0)
    catalogue_size_bytes = Column(Integer, default=0)
    catalogue_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    validation_snapshot = Column(
        Text, nullable=True
    )  # JSON snapshot of validation issues if any
    created_at = Column(DateTime, default=datetime.utcnow)
