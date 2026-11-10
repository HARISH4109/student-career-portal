from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    id: Optional[str] = None
    institution: str = ""
    degree: str = ""
    fieldOfStudy: Optional[str] = ""
    startDate: Optional[str] = ""
    endDate: Optional[str] = None
    isCurrent: bool = False
    grade: Optional[str] = None
    description: Optional[str] = None


class ExperienceItem(BaseModel):
    id: Optional[str] = None
    company: str = ""
    position: str = ""
    location: Optional[str] = None
    startDate: Optional[str] = ""
    endDate: Optional[str] = None
    isCurrent: bool = False
    description: Optional[str] = ""
    highlights: List[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    id: Optional[str] = None
    title: str = ""
    role: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None
    githubUrl: Optional[str] = None
    description: Optional[str] = ""
    highlights: List[str] = Field(default_factory=list)


class CertificationItem(BaseModel):
    id: Optional[str] = None
    name: str = ""
    issuer: str = ""
    issueDate: Optional[str] = None
    expiryDate: Optional[str] = None
    credentialUrl: Optional[str] = None


class AchievementItem(BaseModel):
    id: Optional[str] = None
    title: str = ""
    description: Optional[str] = None
    date: Optional[str] = None


class ResumeContentInput(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedinUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    portfolioUrl: Optional[str] = None
    summary: Optional[str] = ""
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[CertificationItem] = Field(default_factory=list)
    achievements: List[AchievementItem] = Field(default_factory=list)


class ResumeAnalysisRequest(BaseModel):
    content: ResumeContentInput
    targetRole: Optional[str] = None


class ImprovementItem(BaseModel):
    area: str
    suggestion: str
    priority: str = "medium"  # "high", "medium", "low"


class ResumeAnalysisData(BaseModel):
    overallScore: float = Field(ge=0, le=100)
    atsScore: float = Field(ge=0, le=100)
    skillScore: float = Field(ge=0, le=100)
    keywordScore: float = Field(ge=0, le=100)
    formatScore: float = Field(ge=0, le=100)
    missingSkills: List[str] = Field(default_factory=list)
    improvementSuggestions: List[ImprovementItem] = Field(default_factory=list)
    aiInsights: List[str] = Field(default_factory=list, description="LLM-generated deep insights and personalized feedback")
    aiSummaryRewrite: Optional[str] = Field(None, description="LLM-suggested professional summary rewrite")
    modelVersion: str = "v1.0"
    analyzedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ResumeAnalysisResponse(BaseModel):
    success: bool = True
    data: ResumeAnalysisData


class EligibilityContextInput(BaseModel):
    requiredCgpa: Optional[float] = None
    studentCgpa: Optional[float] = None
    eligibleDepartments: Optional[List[str]] = None
    studentDepartment: Optional[str] = None


class ResumeOpportunityMatchRequest(BaseModel):
    resumeContent: ResumeContentInput
    opportunitySkills: List[str] = Field(default_factory=list)
    eligibilityContext: Optional[EligibilityContextInput] = None


class ResumeOpportunityMatchData(BaseModel):
    matchScore: float = Field(ge=0, le=100)
    matchedSkills: List[str] = Field(default_factory=list)
    missingSkills: List[str] = Field(default_factory=list)
    explanatoryReasons: List[str] = Field(default_factory=list)
    isEligible: bool = True


class ResumeOpportunityMatchResponse(BaseModel):
    success: bool = True
    data: ResumeOpportunityMatchData


class ResumeEnhanceTextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Draft text or description to enhance")
    sectionType: str = Field(default="experience", description="'experience', 'project', or 'summary'")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Context e.g. role, company, title, technologies")


class ResumeEnhanceTextData(BaseModel):
    enhancedText: str
    bulletPoints: List[str] = Field(default_factory=list)
    keyChanges: List[str] = Field(default_factory=list)
    modelVersion: str = "v1.0"


class ResumeEnhanceTextResponse(BaseModel):
    success: bool = True
    data: ResumeEnhanceTextData
