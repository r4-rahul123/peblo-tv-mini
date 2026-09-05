from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=".env", extra="ignore"
    )

    PROJECT_NAME: str = "Peblo TV Mini API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecret_peblo_tv_mini_dev_key_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./peblo.db"

    # Storage
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_DIR: str = "./storage"

    # R2 / S3 configuration
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str | None = "peblo-tv-mini-catalogue"
    R2_PUBLIC_URL: str | None = None

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]


settings = Settings()
