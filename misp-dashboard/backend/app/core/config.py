from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    WS_BROADCAST_INTERVAL_SECONDS: float = 2.0
    GOD_MODE_BURST_COUNT: int = 100
    GOD_MODE_BURST_INTERVAL: float = 0.05
    MAX_ARCS_ON_GLOBE: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
