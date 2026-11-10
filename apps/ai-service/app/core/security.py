from secrets import compare_digest

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def verify_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """
    FastAPI dependency enforcing that only the Express API (holder of the
    shared secret) can call this service — it is never exposed to the
    frontend or the public internet directly.
    """
    settings = get_settings()
    if not settings.ai_service_internal_token or not x_internal_token or not compare_digest(
        x_internal_token.encode(), settings.ai_service_internal_token.encode()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service token",
        )
