from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Artwork
class ArtworkValidationResult(BaseModel):
    is_valid: bool
    artwork_type: str
    width: int
    height: int
    aspect_ratio: float
    file_size_bytes: int
    file_size_kb: float
    errors: list[str] = []
    warnings: list[str] = []


class ArtworkResponse(BaseModel):
    id: str
    artwork_type: str
    file_name: str
    file_url: str
    file_size_bytes: int
    width: int
    height: int
    aspect_ratio: float
    content_type: str
    created_at: datetime


# Episodes
class EpisodeBase(BaseModel):
    episode_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1)
    synopsis: str | None = None
    duration_seconds: int = Field(..., ge=0)
    content_group: str = Field(..., min_length=1)
    language: str = Field(..., min_length=2, max_length=10)
    video_url: str | None = None
    thumbnail_url: str | None = None
    status: str = "draft"


class EpisodeCreate(EpisodeBase):
    pass


class EpisodeUpdate(BaseModel):
    episode_number: int | None = None
    title: str | None = None
    synopsis: str | None = None
    duration_seconds: int | None = None
    content_group: str | None = None
    language: str | None = None
    video_url: str | None = None
    thumbnail_url: str | None = None
    status: str | None = None


class EpisodeResponse(EpisodeBase):
    id: str
    season_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Seasons
class SeasonBase(BaseModel):
    season_number: int = Field(..., ge=0)  # 0 is trailer
    title: str | None = None


class SeasonCreate(SeasonBase):
    pass


class SeasonResponse(SeasonBase):
    id: str
    show_id: str
    created_at: datetime
    episodes: list[EpisodeResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Shows
class ShowBase(BaseModel):
    title: str = Field(..., min_length=1)
    synopsis: str | None = None
    section: str | None = None
    category: str | None = None
    target_age_group: str | None = "4-8"
    is_featured: bool = False
    status: str = "draft"
    poster_url: str | None = None
    banner_url: str | None = None


class ShowCreate(ShowBase):
    pass


class ShowUpdate(BaseModel):
    title: str | None = None
    synopsis: str | None = None
    section: str | None = None
    category: str | None = None
    target_age_group: str | None = None
    is_featured: bool | None = None
    status: str | None = None
    poster_url: str | None = None
    banner_url: str | None = None


class ShowResponse(ShowBase):
    id: str
    created_at: datetime
    updated_at: datetime
    seasons: list[SeasonResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Validation Report
class ValidationIssue(BaseModel):
    entity_type: str  # "show" or "episode"
    entity_id: str
    entity_title: str
    severity: str  # "BLOCKER" or "WARNING"
    field: str
    message: str
    action_required: str


class ValidationReport(BaseModel):
    is_publishable: bool
    total_blockers: int
    total_warnings: int
    published_shows_count: int
    published_episodes_count: int
    issues_by_show: dict[str, list[ValidationIssue]] = {}
    general_issues: list[ValidationIssue] = []


# Published Catalog Schema
class CatalogLanguageVariant(BaseModel):
    language: str
    title: str
    synopsis: str | None
    video_url: str | None
    thumbnail_url: str | None
    duration_seconds: int


class CatalogEpisode(BaseModel):
    episode_number: int
    content_group: str
    default_title: str
    default_synopsis: str | None
    duration_seconds: int
    thumbnail_url: str | None
    available_languages: list[str]
    variants: dict[str, CatalogLanguageVariant]


class CatalogSeason(BaseModel):
    season_number: int
    title: str | None
    episodes: list[CatalogEpisode]


class CatalogTrailer(BaseModel):
    episode_number: int
    content_group: str
    title: str
    synopsis: str | None
    duration_seconds: int
    video_url: str | None
    thumbnail_url: str | None
    available_languages: list[str]


class CatalogShow(BaseModel):
    id: str
    title: str
    synopsis: str | None
    section: str
    category: str | None
    target_age_group: str | None
    is_featured: bool
    poster_url: str | None
    banner_url: str | None
    seasons: list[CatalogSeason]
    trailers: list[CatalogTrailer] = []  # Separated Season 0 trailers
    total_episodes: int


class CatalogSection(BaseModel):
    name: str
    shows: list[CatalogShow]


class PublishedCatalog(BaseModel):
    catalog_version: str
    published_at: str
    published_by: str
    total_shows: int
    total_episodes: int
    sections: list[CatalogSection]
    featured_shows: list[CatalogShow]


class PublishRunResponse(BaseModel):
    run_id: str
    triggered_by: str
    status: str
    shows_count: int
    episodes_count: int
    sections_count: int
    catalogue_path: str | None
    error_message: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
