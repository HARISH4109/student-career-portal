from fastapi import APIRouter
from app.core.llm import get_llm_provider, get_llm_model

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "provider": get_llm_provider(),
        "model": get_llm_model(),
    }
