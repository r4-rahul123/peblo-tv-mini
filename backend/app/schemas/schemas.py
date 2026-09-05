from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl, ConfigDict

# Artwork
class ArtworkValidationResult(BaseModel):
    is_valid: bool
    artwork_type: str
    width: int
    height: int
    aspect_ratio: float
    file_size_bytes: int
    file_size_kb: float
    errors: List[str] = []
    warnings: List[str] = []

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
    synopsis: Optional[str] = None
    duration_seconds: int = Field(..., ge=0)
    content_group: str = Field(..., min_length=1)
    language: str = Field(..., min_length=2, max_length=10)
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: str = "draft"

class EpisodeCreate(EpisodeBase):
    pass

class EpisodeUpdate(BaseModel):
    episode_number: Optional[int] = None
    title: Optional[str] = None
    synopsis: Optional[str] = None
    duration_seconds: Optional[int] = None
    content_group: Optional[str] = None
    language: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: Optional[str] = None

class EpisodeResponse(EpisodeBase):
    id: str
    season_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Seasons
class SeasonBase(BaseModel):
    season_number: int = Field(..., ge=0) # 0 is trailer
    title: Optional[str] = None

class SeasonCreate(SeasonBase):
    pass

class SeasonResponse(SeasonBase):
    id: str
    show_id: str
    created_at: datetime
    episodes: List[EpisodeResponse] = []

    model_config = ConfigDict(from_attributes=True)

# Shows
class ShowBase(BaseModel):
    title: str = Field(..., min_length=1)
    synopsis: Optional[str] = None
    section: Optional[str] = None
    category: Optional[str] = None
    target_age_group: Optional[str] = "4-8"
    is_featured: bool = False
    status: str = "draft"
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None

class ShowCreate(ShowBase):
    pass

class ShowUpdate(BaseModel):
    title: Optional[str] = None
    synopsis: Optional[str] = None
    section: Optional[str] = None
    category: Optional[str] = None
    target_age_group: Optional[str] = None
    is_featured: Optional[bool] = None
    status: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None

class ShowResponse(ShowBase):
    id: str
    created_at: datetime
    updated_at: datetime
    seasons: List[SeasonResponse] = []

    model_config = ConfigDict(from_attributes=True)

# Validation Report
class ValidationIssue(BaseModel):
    entity_type: str # "show" or "episode"
    entity_id: str
    entity_title: str
    severity: str # "BLOCKER" or "WARNING"
    field: str
    message: str
    action_required: str

class ValidationReport(BaseModel):
    is_publishable: bool
    total_blockers: int
    total_warnings: int
    published_shows_count: int
    published_episodes_count: int
    issues_by_show: Dict[str, List[ValidationIssue]] = {}
    general_issues: List[ValidationIssue] = []

# Published Catalog Schema
class CatalogLanguageVariant(BaseModel):
    language: str
    title: str
    synopsis: Optional[str]
    video_url: Optional[str]
    thumbnail_url: Optional[str]
    duration_seconds: int

class CatalogEpisode(BaseModel):
    episode_number: int
    content_group: str
    default_title: str
    default_synopsis: Optional[str]
    duration_seconds: int
    thumbnail_url: Optional[str]
    available_languages: List[str]
    variants: Dict[str, CatalogLanguageVariant]

class CatalogSeason(BaseModel):
    season_number: int
    title: Optional[str]
    episodes: List[CatalogEpisode]

class CatalogTrailer(BaseModel):
    episode_number: int
    content_group: str
    title: str
    synopsis: Optional[str]
    duration_seconds: int
    video_url: Optional[str]
    thumbnail_url: Optional[str]
    available_languages: List[str]

class CatalogShow(BaseModel):
    id: str
    title: str
    synopsis: Optional[str]
    section: str
    category: Optional[str]
    target_age_group: Optional[str]
    is_featured: bool
    poster_url: Optional[str]
    banner_url: Optional[str]
    seasons: List[CatalogSeason]
    trailers: List[CatalogTrailer] = [] # Separated Season 0 trailers
    total_episodes: int

class CatalogSection(BaseModel):
    name: str
    shows: List[CatalogShow]

class PublishedCatalog(BaseModel):
    catalog_version: str
    published_at: str
    published_by: str
    total_shows: int
    total_episodes: int
    sections: List[CatalogSection]
    featured_shows: List[CatalogShow]

class PublishRunResponse(BaseModel):
    run_id: str
    triggered_by: str
    status: str
    shows_count: int
    episodes_count: int
    sections_count: int
    catalogue_path: Optional[str]
    error_message: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
