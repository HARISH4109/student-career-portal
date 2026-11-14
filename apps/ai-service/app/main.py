import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.resume import router as resume_router
from app.core.config import get_settings

settings = get_settings()

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("career_portal.ai_service")

app = FastAPI(
    title="Career Portal — AI Service",
    description=(
        "Internal microservice powering AI features: resume parsing/scoring, "
        "job posting extraction, interview feedback generation, and "
        "recommendation scoring. Not exposed directly to the frontend — "
        "only apps/api calls this service."
    ),
    version="0.1.0",
    docs_url="/docs" if settings.node_env != "production" else None,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Translate FastAPI's default validation errors into our shared error envelope."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": exc.errors(),
            },
        },
    )


app.include_router(health_router, prefix="/v1")
app.include_router(health_router)
app.include_router(resume_router, prefix="/v1")

# Phase 3+: app.include_router(job_extraction_router, prefix="/v1/jobs")
# Phase 4+: app.include_router(interview_router, prefix="/v1/interviews")

