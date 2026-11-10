from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All environment access in the AI service goes through this module — never
    `os.environ` scattered across files. Pydantic validates types/required-ness
    at import time so misconfiguration fails at boot, not mid-request.
    """

    model_config = SettingsConfigDict(env_file=("../../.env", ".env"), extra="ignore")

    node_env: str = "development"
    ai_service_port: int = 8000

    # NVIDIA NIM Microservices Configuration
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "meta/llama-3.3-70b-instruct"

    # OpenAI (Optional / Alternative)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Shared secret used to authenticate calls from apps/api -> ai-service,
    # since this service is never exposed directly to the frontend/internet.
    ai_service_internal_token: str = "career-portal-internal-secret-token"

    api_base_url: str = "http://localhost:4000"

    log_level: str = "info"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
