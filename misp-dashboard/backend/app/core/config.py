from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    OTX_API_KEY: str = ""
    WS_BROADCAST_INTERVAL_SECONDS: float = 2.0
    GOD_MODE_BURST_COUNT: int = 100
    GOD_MODE_BURST_INTERVAL: float = 0.05
    MAX_ARCS_ON_GLOBE: int = 50
    DEFAULT_DEMO_MODE: bool = True
    DEFAULT_DATA_SOURCE: str = "public_misp"
    DEFAULT_SIMULATION_PROFILE: str = "balanced"
    DEFAULT_ACTIVE_HQ_IDS: str = "nyc,mumbai,bengaluru"
    PUBLIC_MISP_FEED_URL: str = "https://www.botvrij.eu/data/feed-osint/manifest.json"
    PUBLIC_MISP_EVENT_LIMIT: int = 14
    PUBLIC_MISP_MAX_ITEMS: int = 90
    PUBLIC_MISP_IPS_PER_EVENT: int = 3
    LIVE_FEED_REFRESH_MINUTES: int = 30
    LIVE_FEED_REQUEST_TIMEOUT_SECONDS: float = 20.0
    AUTO_REFRESH_LIVE_FEED: bool = True
    ENABLE_IP_GEOLOOKUP: bool = True
    IP_GEOLOOKUP_URL_TEMPLATE: str = "https://ipwho.is/{ip}"
    OTX_PULSES_URL: str = "https://otx.alienvault.com/api/v1/pulses/subscribed"
    OTX_PULSE_PAGE_SIZE: int = 4
    OTX_PULSE_MAX_PAGES: int = 2
    OTX_MAX_ITEMS: int = 90
    OTX_IPS_PER_PULSE: int = 3

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
