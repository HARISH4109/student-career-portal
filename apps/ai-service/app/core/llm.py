import logging
from urllib.parse import urlparse
from openai import AsyncOpenAI
from app.core.config import get_settings

logger = logging.getLogger("career_portal.ai_service.llm")


def mask_api_key(key: str | None) -> str:
    """Masks secret API keys for safe logging and diagnostics without leaking credentials."""
    if not key or len(key.strip()) < 8:
        return "not-configured"
    trimmed = key.strip()
    return f"{trimmed[:4]}...{trimmed[-4:]}"


def is_safe_base_url(url_str: str, allow_local: bool = True) -> bool:
    """
    Validates LLM base URLs against SSRF threats and unauthorized protocols.
    Prevents redirection to cloud metadata or unencrypted protocols in production.
    """
    try:
        parsed = urlparse(url_str)
        if parsed.scheme not in ("http", "https"):
            return False
        if not allow_local and parsed.scheme != "https":
            return False
        hostname = (parsed.hostname or "").lower()
        if not allow_local:
            blocked = {
                "localhost",
                "127.0.0.1",
                "0.0.0.0",
                "::1",
                "169.254.169.254",
                "metadata.google.internal",
                "instance-data",
            }
            if (
                hostname in blocked
                or hostname.endswith(".internal")
                or hostname.endswith(".local")
            ):
                return False
        return True
    except Exception:
        return False


def get_llm_provider() -> str:
    """Returns the name of the currently active LLM provider based on configured credentials or explicit switch."""
    settings = get_settings()
    requested = (settings.ai_provider or "auto").strip().lower()

    if requested == "groq" and settings.groq_api_key and settings.groq_api_key.strip():
        return "groq"
    elif requested == "nvidia" and settings.nvidia_api_key and settings.nvidia_api_key.strip():
        return "nvidia"
    elif requested == "openai" and settings.openai_api_key and settings.openai_api_key.strip():
        return "openai"

    # Default "auto" resolution by availability:
    if settings.groq_api_key and settings.groq_api_key.strip():
        return "groq"
    if settings.nvidia_api_key and settings.nvidia_api_key.strip():
        return "nvidia"
    if settings.openai_api_key and settings.openai_api_key.strip():
        return "openai"
    return "none"


def get_llm_client() -> AsyncOpenAI:
    """
    Returns an AsyncOpenAI client configured for the active LLM provider
    (Groq, NVIDIA NIM, or OpenAI) with timeouts, max retries, and SSRF protection.
    """
    settings = get_settings()
    provider = get_llm_provider()
    is_prod = settings.node_env.lower() == "production"

    if provider == "groq":
        base_url = settings.groq_base_url.strip() or "https://api.groq.com/openai/v1"
        if not is_safe_base_url(base_url, allow_local=not is_prod):
            logger.error(
                "Insecure or invalid GROQ_BASE_URL detected: %s. Defaulting to official Groq API endpoint.",
                base_url,
            )
            base_url = "https://api.groq.com/openai/v1"
        return AsyncOpenAI(
            api_key=settings.groq_api_key.strip(),
            base_url=base_url,
            timeout=30.0,
            max_retries=2,
        )

    elif provider == "nvidia":
        base_url = (
            settings.nvidia_base_url.strip()
            or "https://integrate.api.nvidia.com/v1"
        )
        if not is_safe_base_url(base_url, allow_local=not is_prod):
            logger.error(
                "Insecure or invalid NVIDIA_BASE_URL detected: %s. Defaulting to official NVIDIA NIM endpoint.",
                base_url,
            )
            base_url = "https://integrate.api.nvidia.com/v1"
        return AsyncOpenAI(
            api_key=settings.nvidia_api_key.strip(),
            base_url=base_url,
            timeout=30.0,
            max_retries=2,
        )

    elif provider == "openai":
        return AsyncOpenAI(
            api_key=settings.openai_api_key.strip(),
            timeout=30.0,
            max_retries=2,
        )

    else:
        # Fallback to local or unauthenticated NIM endpoint if configured
        return AsyncOpenAI(
            api_key="not-needed",
            base_url=settings.nvidia_base_url,
            timeout=10.0,
            max_retries=1,
        )


def get_llm_model() -> str:
    """
    Returns the active model name based on provider settings.
    """
    settings = get_settings()
    provider = get_llm_provider()
    if provider == "groq":
        return settings.groq_model or "llama-3.3-70b-versatile"
    elif provider == "nvidia":
        return settings.nvidia_model or "meta/llama-3.3-70b-instruct"
    elif provider == "openai":
        return settings.openai_model or "gpt-4o-mini"
    return settings.groq_model or settings.nvidia_model or "llama-3.3-70b-versatile"
