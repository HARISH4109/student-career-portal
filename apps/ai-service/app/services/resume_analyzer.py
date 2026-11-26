import json
import logging
import re
from typing import Any, Dict, List, Optional, Set

from app.core.config import get_settings
from app.core.llm import get_llm_client, get_llm_model, get_llm_provider
from app.schemas.resume import (
    ImprovementItem,
    ResumeAnalysisData,
    ResumeContentInput,
    ResumeEnhanceTextData,
    ResumeOpportunityMatchData,
)

logger = logging.getLogger("career_portal.ai_service.resume_analyzer")
settings = get_settings()

COMMON_HIGH_VALUE_SKILLS = [
    "Git",
    "Docker",
    "REST APIs",
    "SQL",
    "CI/CD",
    "Unit Testing",
    "Agile/Scrum",
    "Data Structures & Algorithms",
    "System Design",
    "Cloud (AWS/GCP/Azure)",
]

ACTION_VERBS = {
    "built",
    "created",
    "developed",
    "designed",
    "engineered",
    "implemented",
    "optimized",
    "reduced",
    "increased",
    "scaled",
    "led",
    "architected",
    "automated",
    "integrated",
    "launched",
    "managed",
    "delivered",
}

SKILL_ALIASES: Dict[str, str] = {
    "js": "javascript",
    "ts": "typescript",
    "react.js": "react",
    "reactjs": "react",
    "node.js": "node",
    "nodejs": "nodejs",
    "py": "python",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "gcp": "google cloud",
    "aws": "amazon web services",
}


def normalize_skill(skill: str) -> str:
    cleaned = skill.strip().lower()
    return SKILL_ALIASES.get(cleaned, cleaned)


def _clean_unicode_text(text: str) -> str:
    """Normalizes special unicode punctuation into ASCII characters to prevent encoding issues."""
    if not text:
        return ""
    replacements = {
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "--",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "*",
        "\u00a0": " ",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def _sanitize_resume_text(text: str) -> str:
    """Cleans and strips any JSON markers, markdown fences, conversational preambles, and quotes from AI outputs."""
    if not text:
        return ""

    cleaned = _clean_unicode_text(text).strip()

    # 1. Strip code block fences
    cleaned = re.sub(r"^```(?:json|markdown)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    # 2. Strip JSON key wrappers like {"enhancedText": " or "enhancedText": "
    cleaned = re.sub(r'^\s*\{\s*["\']?enhancedText["\']?\s*:\s*["\']?', "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^\s*["\']?enhancedText["\']?\s*:\s*["\']?', "", cleaned, flags=re.IGNORECASE)

    # 3. Strip conversational preambles and boilerplate intro headers
    preamble_patterns = [
        r"^here\s+(?:is|are)\s+(?:the\s+)?(?:enhanced|improved|rewritten|revised|updated)?\s*(?:text|version|description|summary|bullet points|bullets)?\s*:?\s*",
        r"^here\s+it\s+is\s*:?\s*",
        r"^(?:enhanced|improved|rewritten|revised|updated)\s*(?:text|version|description|summary)?\s*:?\s*",
        r"^sure[!,.]?\s*(?:here\s+is\s+.*:)?\s*",
        r"^(?:description|overview|summary|highlights)\s*:\s*",
        r"^(?:option\s+\d+|version\s+\d+)\s*:\s*",
    ]
    for pat in preamble_patterns:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip()

    # 4. Strip trailing JSON artifacts like ", "bulletPoints": [...] or trailing quotes/braces
    cleaned = re.sub(r'["\']\s*,\s*["\']?(?:bulletPoints|keyChanges)["\']?[\s\S]*$', "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'["\']\s*\}\s*$', "", cleaned)
    cleaned = re.sub(r'\s*\}\s*$', "", cleaned)

    # 5. Strip leading/trailing double or single quotes if wrapped
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()

    # 6. Unescape escaped characters like \" or \n
    cleaned = cleaned.replace('\\"', '"').replace("\\'", "'").replace('\\n', ' ')

    # 7. Clean leading bullet markers if cleaning a paragraph
    cleaned = re.sub(r"^[•\-\*\s]+", "", cleaned)

    # 8. Clean excess whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned


def _serialize_resume_for_llm(content: ResumeContentInput) -> str:
    """Serialize resume content to a readable text block for the LLM prompt."""
    parts: List[str] = []
    if content.fullName:
        parts.append(f"Name: {content.fullName}")
    if content.email:
        parts.append(f"Email: {content.email}")
    if content.phone:
        parts.append(f"Phone: {content.phone}")
    if content.location:
        parts.append(f"Location: {content.location}")
    if content.linkedinUrl:
        parts.append(f"LinkedIn: {content.linkedinUrl}")
    if content.githubUrl:
        parts.append(f"GitHub: {content.githubUrl}")
    if content.summary:
        parts.append(f"\nProfessional Summary:\n{content.summary}")

    if content.education:
        parts.append("\nEducation:")
        for edu in content.education:
            deg = edu.degree or "Degree"
            inst = edu.institution or "Institution"
            field = f" in {edu.fieldOfStudy}" if edu.fieldOfStudy else ""
            line = f"  - {deg}{field} from {inst}"
            if edu.startDate or edu.endDate:
                line += f" ({edu.startDate or '?'} - {edu.endDate or ('Present' if edu.isCurrent else '?')})"
            if edu.grade:
                line += f" | Grade: {edu.grade}"
            parts.append(line)

    if content.experience:
        parts.append("\nWork Experience:")
        for exp in content.experience:
            pos = exp.position or "Position"
            comp = exp.company or "Company"
            line = f"  - {pos} at {comp}"
            if exp.location:
                line += f" ({exp.location})"
            if exp.startDate:
                end = "Present" if exp.isCurrent else (exp.endDate or "?")
                line += f" | {exp.startDate} - {end}"
            parts.append(line)
            if exp.description:
                parts.append(f"    {exp.description}")
            for hl in (exp.highlights or []):
                if hl and hl.strip():
                    parts.append(f"    • {hl.strip()}")

    if content.skills:
        clean_skills = [s for s in content.skills if s and s.strip()]
        if clean_skills:
            parts.append(f"\nTechnical Skills: {', '.join(clean_skills)}")

    if content.projects:
        parts.append("\nProjects:")
        for proj in content.projects:
            title = proj.title or "Project"
            line = f"  - {title}"
            techs = [t for t in (proj.technologies or []) if t and t.strip()]
            if techs:
                line += f" [{', '.join(techs)}]"
            parts.append(line)
            if proj.description:
                parts.append(f"    {proj.description}")

    if content.certifications:
        parts.append("\nCertifications:")
        for cert in content.certifications:
            name = cert.name or "Certification"
            issuer = f" by {cert.issuer}" if cert.issuer else ""
            parts.append(f"  - {name}{issuer}")

    if content.achievements:
        parts.append("\nAchievements:")
        for ach in content.achievements:
            title = ach.title or "Achievement"
            parts.append(f"  - {title}")
            if ach.description:
                parts.append(f"    {ach.description}")

    return "\n".join(parts)


class ResumeAnalyzerService:
    async def analyze_resume(
        self, content: ResumeContentInput, target_role: str = ""
    ) -> ResumeAnalysisData:
        """
        Hybrid analysis: deterministic rule-engine scores + LLM-powered deep insights.
        The LLM call is best-effort with graceful fallback.
        """
        # ── Phase 1: Deterministic Rule-Engine Scores ──
        format_score = self._calculate_format_score(content)
        skill_score = self._calculate_skill_score(content)
        keyword_score = self._calculate_keyword_score(content)
        ats_score = self._calculate_ats_score(content, format_score, keyword_score)

        overall_score = round(
            (ats_score * 0.35)
            + (skill_score * 0.30)
            + (keyword_score * 0.20)
            + (format_score * 0.15),
            1,
        )

        missing_skills = self._find_missing_skills(content)
        suggestions = self._generate_suggestions(
            content, ats_score, skill_score, keyword_score, format_score
        )

        # ── Phase 2: LLM-Powered Deep Insights ──
        ai_insights: List[str] = []
        ai_summary_rewrite: Optional[str] = None
        model_version = "rule-engine-v1.0"

        try:
            llm_result = await self._get_llm_insights(
                content, overall_score, missing_skills, target_role
            )
            if llm_result:
                ai_insights = llm_result.get("insights", [])
                ai_summary_rewrite = llm_result.get("summary_rewrite")
                model_version = f"hybrid-llm-{get_llm_model()}"
                logger.info("LLM insights generated successfully via %s", get_llm_model())
        except Exception as exc:
            logger.warning("LLM insights unavailable (falling back to rule-engine): %s", exc)

        return ResumeAnalysisData(
            overallScore=min(100.0, max(0.0, overall_score)),
            atsScore=min(100.0, max(0.0, ats_score)),
            skillScore=min(100.0, max(0.0, skill_score)),
            keywordScore=min(100.0, max(0.0, keyword_score)),
            formatScore=min(100.0, max(0.0, format_score)),
            missingSkills=missing_skills,
            improvementSuggestions=suggestions,
            aiInsights=ai_insights,
            aiSummaryRewrite=ai_summary_rewrite,
            modelVersion=model_version,
        )

    # ── LLM Integration ───────────────────────────────────────────────────

    async def _get_llm_insights(
        self,
        content: ResumeContentInput,
        overall_score: float,
        missing_skills: List[str],
        target_role: str = "",
    ) -> Optional[Dict[str, Any]]:
        """
        Calls the configured NVIDIA NIM / OpenAI LLM to produce:
        1. Deep personalized insights (3-5 bullet points)
        2. A rewritten professional summary (if the current one is weak)
        """
        if not settings.groq_api_key and not settings.nvidia_api_key and not settings.openai_api_key:
            logger.debug("No LLM API key configured, skipping AI insights")
            return None

        resume_text = _serialize_resume_for_llm(content)
        role_context = f" targeting a '{target_role}' role" if target_role else ""

        system_prompt = (
            "You are an expert career advisor and senior resume reviewer with 15+ years of experience "
            "in tech recruitment at top companies (Google, Microsoft, Amazon, Meta). "
            "You provide brutally honest but constructive feedback that helps candidates "
            "stand out in competitive hiring processes. "
            "Respond ONLY with valid JSON, no markdown, no code fences."
        )

        user_prompt = f"""Analyze this student's resume{role_context} and provide actionable, personalized feedback.

Current automated scores: Overall {overall_score}/100
Missing industry skills: {', '.join(missing_skills) if missing_skills else 'None detected'}

--- RESUME START ---
{resume_text}
--- RESUME END ---

Respond with this exact JSON structure:
{{
  "insights": [
    "First specific, personalized insight about their resume with concrete advice",
    "Second insight focusing on what makes their resume stand out OR what's holding it back",
    "Third insight about their technical positioning and how to improve ATS pass rate",
    "Fourth insight about industry-specific improvements (optional)"
  ],
  "summary_rewrite": "A compelling 2-3 sentence professional summary that highlights their strongest assets, technical expertise, and career trajectory. Write this in first person. Return null if their current summary is already strong."
}}

Rules:
- Each insight must be specific to THIS resume, not generic advice
- Reference actual content from their resume (project names, skills, companies)
- Keep each insight under 60 words
- The summary_rewrite should be impactful and ATS-optimized
- If their summary is already good (50+ words, uses action verbs, mentions tech stack), set summary_rewrite to null"""

        client = get_llm_client()
        model = get_llm_model()

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=800,
        )

        raw_content = response.choices[0].message.content
        # Some reasoning models put content in reasoning_content instead
        if not raw_content:
            raw_content = getattr(response.choices[0].message, "reasoning_content", None)

        if not raw_content:
            logger.warning("LLM returned empty content")
            return None

        # Strip any markdown code fences the model might add
        cleaned = raw_content.strip()
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", cleaned)
            if match:
                cleaned = match.group(1).strip()
            else:
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned).strip()

        # Try to locate the JSON object if model included preamble or chain-of-thought
        json_obj_str = cleaned
        if not (json_obj_str.startswith("{") and json_obj_str.endswith("}")):
            match = re.search(r"(\{[\s\S]*\})", cleaned)
            if match:
                json_obj_str = match.group(1).strip()

        try:
            result = json.loads(json_obj_str)
            # Validate structure
            insights = result.get("insights", [])
            if not isinstance(insights, list):
                insights = []
            # Filter out empty or too-short insights
            insights = [i.strip() for i in insights if isinstance(i, str) and len(i.strip()) > 10]

            summary_rewrite = result.get("summary_rewrite")
            if summary_rewrite and isinstance(summary_rewrite, str) and len(summary_rewrite.strip()) > 20:
                summary_rewrite = summary_rewrite.strip()
            else:
                summary_rewrite = None

            return {"insights": insights[:5], "summary_rewrite": summary_rewrite}
        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM JSON response: %s", cleaned[:200])
            # Fallback: extract any bullet points or numbered lines from text
            lines = []
            for raw_line in raw_content.split("\n"):
                l_str = raw_line.strip()
                if l_str.startswith(("-", "*", "•")) or re.match(r"^\d+[\.\)]\s+", l_str):
                    cleaned_line = re.sub(r"^[-*•\d\.\)\s]+", "", l_str).strip()
                    if len(cleaned_line) > 15:
                        lines.append(cleaned_line)
            if lines:
                return {"insights": lines[:4], "summary_rewrite": None}
            return None

    def match_opportunity(
        self,
        content: ResumeContentInput,
        opportunity_skills: List[str],
        eligibility: Optional[Dict[str, Any]] = None,
    ) -> ResumeOpportunityMatchData:
        """
        Evaluates match between resume content and opportunity requirements.
        """
        if not opportunity_skills:
            return ResumeOpportunityMatchData(
                matchScore=80.0,
                matchedSkills=[],
                missingSkills=[],
                explanatoryReasons=["No specific required skills specified for this opportunity."],
                isEligible=True,
            )

        # Collect all skills mentioned across resume
        candidate_skills: Set[str] = set()
        for s in (content.skills or []):
            if s:
                candidate_skills.add(normalize_skill(s))

        for p in (content.projects or []):
            for t in (p.technologies or []):
                if t:
                    candidate_skills.add(normalize_skill(t))
            desc = p.description or ""
            if desc:
                for word in re.findall(r"\b[A-Za-z0-9+#.-]+\b", desc):
                    candidate_skills.add(normalize_skill(word))

        for exp in (content.experience or []):
            desc = exp.description or ""
            if desc:
                for word in re.findall(r"\b[A-Za-z0-9+#.-]+\b", desc):
                    candidate_skills.add(normalize_skill(word))

        matched: List[str] = []
        missing: List[str] = []

        for req in (opportunity_skills or []):
            if not req:
                continue
            norm_req = normalize_skill(req)
            if norm_req in candidate_skills:
                matched.append(req)
            else:
                missing.append(req)

        # Calculate base skill match percentage
        skill_ratio = len(matched) / len(opportunity_skills) if opportunity_skills else 1.0
        base_score = skill_ratio * 80.0  # Max 80 from skills

        # Relevancy bonus: projects and experience
        bonus = 0.0
        if len(content.projects or []) >= 2:
            bonus += 10.0
        elif len(content.projects or []) == 1:
            bonus += 5.0

        if len(content.experience or []) >= 1:
            bonus += 10.0

        total_match = min(100.0, round(base_score + bonus, 1))

        # Check eligibility context if supplied
        is_eligible = True
        reasons: List[str] = []

        if eligibility:
            req_cgpa = eligibility.get("requiredCgpa")
            stu_cgpa = eligibility.get("studentCgpa")
            if req_cgpa and stu_cgpa and stu_cgpa < req_cgpa:
                is_eligible = False
                reasons.append(
                    f"Current CGPA ({stu_cgpa}) is below required minimum ({req_cgpa})."
                )

            eligible_deps = eligibility.get("eligibleDepartments")
            stu_dep = eligibility.get("studentDepartment")
            if eligible_deps and stu_dep and stu_dep not in eligible_deps:
                is_eligible = False
                reasons.append(
                    f"Department '{stu_dep}' is not in the eligible department list."
                )

        if matched:
            reasons.append(
                f"Matches {len(matched)} of {len(opportunity_skills)} required skills ({', '.join(matched[:4])}{'...' if len(matched) > 4 else ''})."
            )
        if missing:
            reasons.append(
                f"Missing key skills: {', '.join(missing[:4])}{'...' if len(missing) > 4 else ''}."
            )
        if len(content.projects or []) > 0:
            reasons.append(
                f"Portfolio contains {len(content.projects)} relevant project(s)."
            )

        return ResumeOpportunityMatchData(
            matchScore=total_match,
            matchedSkills=matched,
            missingSkills=missing,
            explanatoryReasons=reasons,
            isEligible=is_eligible,
        )

    # ── Internal Scoring Helpers ──────────────────────────────────────────

    def _calculate_format_score(self, content: ResumeContentInput) -> float:
        score = 40.0  # Base for having a resume structure

        if content.fullName and content.email:
            score += 15.0
        if content.phone:
            score += 5.0
        if content.linkedinUrl or content.githubUrl:
            score += 10.0
        if len(content.education or []) > 0:
            score += 10.0
        if len(content.skills or []) >= 4:
            score += 10.0
        if len(content.projects or []) >= 1 or len(content.experience or []) >= 1:
            score += 10.0

        return min(100.0, score)

    def _calculate_skill_score(self, content: ResumeContentInput) -> float:
        count = len(content.skills or [])
        if count == 0:
            return 20.0
        elif count <= 3:
            return 45.0
        elif count <= 7:
            return 70.0
        elif count <= 12:
            return 90.0
        else:
            return 100.0

    def _calculate_keyword_score(self, content: ResumeContentInput) -> float:
        summary_text = content.summary or ""
        proj_texts = " ".join([
            f"{p.description or ''} {' '.join(p.highlights or [])}"
            for p in (content.projects or [])
        ])
        exp_texts = " ".join([
            f"{e.description or ''} {' '.join(e.highlights or [])}"
            for e in (content.experience or [])
        ])
        all_text = f"{summary_text} {proj_texts} {exp_texts}".lower()

        words = set(re.findall(r"\b[a-zA-Z]+\b", all_text))
        verb_matches = words.intersection(ACTION_VERBS)

        score = 40.0
        score += min(35.0, len(verb_matches) * 7.0)

        # Check for metrics / quantified results (numbers, percentages, metrics)
        has_metrics = bool(re.search(r"\d+%|\$\d+|\d+\+|\d+x|\b\d+\b", all_text))
        if has_metrics:
            score += 25.0

        return min(100.0, score)

    def _calculate_ats_score(
        self,
        content: ResumeContentInput,
        format_score: float,
        keyword_score: float,
    ) -> float:
        score = (format_score * 0.5) + (keyword_score * 0.3)

        # Summary check
        summary_words = (content.summary or "").split()
        if len(summary_words) >= 20:
            score += 10.0
        elif not summary_words:
            score -= 5.0

        # Project detail check
        detailed_projects = sum(
            1 for p in (content.projects or []) if len((p.description or "").split()) >= 15
        )
        if detailed_projects >= 2:
            score += 10.0

        return min(100.0, max(20.0, round(score, 1)))

    def _find_missing_skills(self, content: ResumeContentInput) -> List[str]:
        current_skills = {normalize_skill(s) for s in (content.skills or []) if s}
        for p in (content.projects or []):
            for t in (p.technologies or []):
                if t:
                    current_skills.add(normalize_skill(t))

        missing = [
            skill
            for skill in COMMON_HIGH_VALUE_SKILLS
            if normalize_skill(skill) not in current_skills
        ]
        return missing[:5]

    def _generate_suggestions(
        self,
        content: ResumeContentInput,
        ats: float,
        skills_score: float,
        keyword_score: float,
        format_score: float,
    ) -> List[ImprovementItem]:
        suggestions: List[ImprovementItem] = []

        summary_words = (content.summary or "").split()
        if len(summary_words) < 20:
            suggestions.append(
                ImprovementItem(
                    area="Professional Summary",
                    suggestion="Add a 2-3 sentence professional summary highlighting your core strengths, major technical stack, and career goals.",
                    priority="high",
                )
            )

        if skills_score < 75:
            suggestions.append(
                ImprovementItem(
                    area="Technical Skills",
                    suggestion="Expand your technical skills list to include key programming languages, frameworks, developer tools, and cloud technologies you have used.",
                    priority="high",
                )
            )

        if not content.githubUrl and not content.portfolioUrl:
            suggestions.append(
                ImprovementItem(
                    area="Links & Portfolio",
                    suggestion="Include your GitHub profile or live project portfolio link so recruiters and hiring managers can verify your code.",
                    priority="medium",
                )
            )

        all_text = (
            f"{content.summary or ''} "
            + " ".join([p.description or "" for p in (content.projects or [])])
            + " "
            + " ".join([e.description or "" for e in (content.experience or [])])
        )
        if not re.search(r"\d+%|\d+\+|\d+x", all_text):
            suggestions.append(
                ImprovementItem(
                    area="Measurable Impact",
                    suggestion="Quantify your project and work achievements with specific metrics (e.g. 'improved query speed by 40%', 'served 500+ daily active users').",
                    priority="high",
                )
            )

        if len(content.projects or []) < 2:
            suggestions.append(
                ImprovementItem(
                    area="Projects",
                    suggestion="Feature at least 2 in-depth technical projects showcasing full-stack development, database design, or system architecture.",
                    priority="medium",
                )
            )

        if ats < 70:
            suggestions.append(
                ImprovementItem(
                    area="ATS Optimization",
                    suggestion="Use strong action verbs (e.g., 'Engineered', 'Architected', 'Optimized') at the start of bullet points to improve automated parsing.",
                    priority="medium",
                )
            )

        return suggestions

    # ── AI Description Enhancement ────────────────────────────────────────

    async def enhance_text(
        self,
        text: str,
        section_type: str = "experience",
        context: Optional[Dict[str, Any]] = None,
    ) -> ResumeEnhanceTextData:
        """
        Enhances a draft description or summary into high-impact, professional,
        ATS-optimized copy with strong action verbs and quantified metrics.
        """
        context = context or {}
        model_name = get_llm_model()

        # Fallback generator if LLM is unavailable or unconfigured
        def local_fallback() -> ResumeEnhanceTextData:
            trimmed = _sanitize_resume_text(text)
            if not trimmed.endswith("."):
                trimmed = f"{trimmed}."
            return ResumeEnhanceTextData(
                enhancedText=trimmed,
                bulletPoints=[],
                keyChanges=["AI enhancement unavailable; original content preserved with punctuation cleanup."],
                modelVersion="local-rule-engine-v1.0",
            )

        if not settings.groq_api_key and not settings.nvidia_api_key and not settings.openai_api_key:
            return local_fallback()

        try:
            client = get_llm_client()
            
            context_str = ""
            if section_type == "experience":
                role = context.get("role") or context.get("position") or "Software Engineer"
                company = context.get("company") or "Tech Company"
                context_str = f"Target Role: {role} at {company}"
                instructions = (
                    "Rewrite the draft work experience description into a compelling, 2-3 sentence "
                    "professional narrative. Use strong action verbs (e.g., Architected, Spearheaded, "
                    "Engineered, Optimized), and emphasize technical depth supported by the supplied text. "
                    "Never invent or estimate metrics, outcomes, responsibilities, employers, or technologies. "
                    "Use numbers only when they appear in the supplied text. "
                    "Also produce 2-3 standalone bullet points that can be used directly on the resume."
                )
            elif section_type == "project":
                title = context.get("title") or "Technical Project"
                techs = context.get("technologies") or []
                tech_str = ", ".join(techs) if isinstance(techs, list) else str(techs)
                context_str = f"Project: '{title}' using {tech_str if tech_str else 'modern stack'}"
                instructions = (
                    "Rewrite the draft project description into a high-impact 2-3 sentence overview. "
                    "Highlight the problem solved, architectural approach, tech stack utilized, and "
                    "measurable results or system scale only when supplied. Never invent facts or numbers. "
                    "Also produce 2-3 standalone bullet points highlighting key technical accomplishments."
                )
            else:
                context_str = "Professional Career Summary"
                instructions = (
                    "Rewrite the draft summary into a polished, high-impact 2-3 sentence professional summary "
                    "written in first person. Highlight core technical competencies, problem-solving ability, "
                    "and career direction."
                )

            system_prompt = (
                "You are an elite Silicon Valley technical resume writer and hiring manager. "
                "You specialize in transforming weak resume drafts into high-impact, ATS-optimized descriptions. "
                "Respond ONLY with a valid JSON object matching the requested schema. "
                "Do NOT include any introductory preambles (e.g. 'Here is...', 'Enhanced text:'), code blocks, or conversational text."
            )

            user_prompt = f"""Enhance this draft description for a student's resume.

Section Type: {section_type}
{context_str}

Draft text to enhance:
"{text}"

Instructions:
{instructions}

Respond ONLY with this exact JSON format:
{{
  "enhancedText": "The enhanced 2-3 sentence description paragraph with strong action verbs and metrics.",
  "bulletPoints": [
    "First strong action bullet point with specific metric/impact",
    "Second strong action bullet point highlighting technical architecture/tooling",
    "Third strong action bullet point (optional)"
  ],
  "keyChanges": [
    "Short note on what was improved (e.g., Added quantified impact metrics)",
    "Short note (e.g., Replaced passive verbs with strong action verbs)"
  ]
}}"""

            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1200,
            )

            raw_content = response.choices[0].message.content
            if not raw_content:
                raw_content = getattr(response.choices[0].message, "reasoning_content", None)

            if not raw_content:
                return local_fallback()

            raw_content = _clean_unicode_text(raw_content)

            # Strip markdown fences
            cleaned = raw_content.strip()
            if "```" in cleaned:
                match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", cleaned)
                if match:
                    cleaned = match.group(1).strip()
                else:
                    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

            json_obj_str = cleaned
            if not (json_obj_str.startswith("{") and json_obj_str.endswith("}")):
                match = re.search(r"(\{[\s\S]*\})", cleaned)
                if match:
                    json_obj_str = match.group(1).strip()

            enhanced_text = ""
            bullets: List[str] = []
            changes: List[str] = []

            # ── Tier 1: Try direct JSON parsing ──
            try:
                result = json.loads(json_obj_str)
                enhanced_text = _sanitize_resume_text(result.get("enhancedText") or "")
                raw_bullets = result.get("bulletPoints") or []
                if isinstance(raw_bullets, list):
                    bullets = [_sanitize_resume_text(b) for b in raw_bullets if isinstance(b, str) and len(_sanitize_resume_text(b)) > 5]
                raw_changes = result.get("keyChanges") or []
                if isinstance(raw_changes, list):
                    changes = [_sanitize_resume_text(c) for c in raw_changes if isinstance(c, str) and len(_sanitize_resume_text(c)) > 2]
            except (json.JSONDecodeError, Exception):
                pass

            # ── Tier 2: Regex extraction if JSON was partial or malformed ──
            if not enhanced_text or len(enhanced_text) < 15:
                match_text = re.search(r'["\']?enhancedText["\']?\s*:\s*["\']([^"\\}]*(?:\\.[^"\\}]*)*)', raw_content, re.IGNORECASE)
                if match_text:
                    enhanced_text = _sanitize_resume_text(match_text.group(1))

                match_bullets_block = re.search(r'["\']?bulletPoints["\']?\s*:\s*\[([\s\S]*?)\]', raw_content, re.IGNORECASE)
                if match_bullets_block:
                    found_bullets = re.findall(r'["\']([^"\']{5,})["\']', match_bullets_block.group(1))
                    if found_bullets:
                        bullets = [_sanitize_resume_text(b) for b in found_bullets if len(_sanitize_resume_text(b)) > 5]

            # ── Tier 3: Line-by-line fallback if model returned formatted plain text ──
            if not enhanced_text or len(enhanced_text) < 15:
                raw_lines = [_clean_unicode_text(line).strip() for line in raw_content.split("\n") if len(line.strip()) > 10]
                text_lines: List[str] = []
                for line in raw_lines:
                    if line.startswith(("{", "}", "[", "]", "```", "'''")):
                        continue
                    sanitized_line = _sanitize_resume_text(line)
                    if sanitized_line.startswith(("-", "*", "•")):
                        bullets.append(_sanitize_resume_text(sanitized_line))
                    elif len(sanitized_line) > 15:
                        text_lines.append(sanitized_line)

                if text_lines:
                    enhanced_text = text_lines[0]
                    if len(text_lines) > 1 and not bullets:
                        bullets = text_lines[1:4]

            # Final validation fallback
            if not enhanced_text or len(enhanced_text) < 10:
                return local_fallback()

            if not changes:
                changes = ["Enhanced with strong action verbs", "Quantified engineering impact"]

            return ResumeEnhanceTextData(
                enhancedText=enhanced_text,
                bulletPoints=bullets[:4],
                keyChanges=changes[:3],
                modelVersion=f"{get_llm_provider()}-{model_name}",
            )

        except Exception as exc:
            logger.warning("Enhance text error via LLM: %s — using local fallback", exc)
            return local_fallback()
