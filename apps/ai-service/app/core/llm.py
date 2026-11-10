from openai import AsyncOpenAI
from app.core.config import get_settings


def get_llm_client() -> AsyncOpenAI:
    """
    Returns an AsyncOpenAI client configured for NVIDIA NIM Microservices
    or OpenAI depending on environment settings.
    """
    settings = get_settings()
    
    if settings.nvidia_api_key:
        return AsyncOpenAI(
            api_key=settings.nvidia_api_key,
            base_url=settings.nvidia_base_url,
        )
    elif settings.openai_api_key:
        return AsyncOpenAI(
            api_key=settings.openai_api_key,
        )
    else:
        # Fallback to local or unauthenticated NIM endpoint if configured
        return AsyncOpenAI(
            api_key="not-needed",
            base_url=settings.nvidia_base_url,
        )


def get_llm_model() -> str:
    """
    Returns the active model name based on provider settings.
    """
    settings = get_settings()
    if settings.nvidia_api_key or settings.nvidia_base_url != "https://integrate.api.nvidia.com/v1":
        return settings.nvidia_model
    elif settings.openai_api_key:
        return settings.openai_model
    return settings.nvidia_model
