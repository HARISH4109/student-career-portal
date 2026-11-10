from fastapi import APIRouter, Depends

from app.core.security import verify_internal_token
from app.schemas.resume import (
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
    ResumeEnhanceTextRequest,
    ResumeEnhanceTextResponse,
    ResumeOpportunityMatchRequest,
    ResumeOpportunityMatchResponse,
)
from app.services.resume_analyzer import ResumeAnalyzerService

router = APIRouter(
    prefix="/resume", tags=["Resume Intelligence"], dependencies=[Depends(verify_internal_token)]
)
analyzer_service = ResumeAnalyzerService()


@router.post(
    "/analyze",
    response_model=ResumeAnalysisResponse,
    summary="Analyze resume ATS, skill, format, and keyword scores",
)
async def analyze_resume(
    request: ResumeAnalysisRequest,
) -> ResumeAnalysisResponse:
    data = await analyzer_service.analyze_resume(request.content, target_role=request.targetRole or "")
    return ResumeAnalysisResponse(success=True, data=data)


@router.post(
    "/enhance-text",
    response_model=ResumeEnhanceTextResponse,
    summary="Enhance resume bullet points or descriptions using AI",
)
async def enhance_text(
    request: ResumeEnhanceTextRequest,
) -> ResumeEnhanceTextResponse:
    data = await analyzer_service.enhance_text(
        text=request.text,
        section_type=request.sectionType,
        context=request.context or {},
    )
    return ResumeEnhanceTextResponse(success=True, data=data)


@router.post(
    "/match-opportunity",
    response_model=ResumeOpportunityMatchResponse,
    summary="Match candidate resume with opportunity requirements and eligibility",
)
async def match_opportunity(
    request: ResumeOpportunityMatchRequest,
) -> ResumeOpportunityMatchResponse:
    eligibility_dict = (
        request.eligibilityContext.model_dump()
        if request.eligibilityContext
        else None
    )
    data = analyzer_service.match_opportunity(
        content=request.resumeContent,
        opportunity_skills=request.opportunitySkills,
        eligibility=eligibility_dict,
    )
    return ResumeOpportunityMatchResponse(success=True, data=data)
