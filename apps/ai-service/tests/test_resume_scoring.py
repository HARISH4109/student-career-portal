"""Tests for deterministic rule-engine scoring functions in ResumeAnalyzerService."""

import pytest

from app.schemas.resume import (
    ExperienceItem,
    ProjectItem,
    ResumeContentInput,
)
from app.services.resume_analyzer import ResumeAnalyzerService, normalize_skill

svc = ResumeAnalyzerService()


# ── Helpers ───────────────────────────────────────────────────────────────


def _empty_resume() -> ResumeContentInput:
    return ResumeContentInput()


def _rich_resume() -> ResumeContentInput:
    return ResumeContentInput(
        fullName="Jane Doe",
        email="jane@example.com",
        phone="+1234567890",
        linkedinUrl="https://linkedin.com/in/janedoe",
        githubUrl="https://github.com/janedoe",
        summary=(
            "Motivated software engineer with three years of experience building "
            "scalable backend APIs and frontend dashboards used by thousands of users."
        ),
        education=[
            {"institution": "MIT", "degree": "B.S.", "fieldOfStudy": "CS"}
        ],
        experience=[
            ExperienceItem(
                company="Acme Corp",
                position="Software Engineer",
                description="Engineered REST APIs used by 10,000+ users. Optimized queries reducing latency by 40%.",
                highlights=["Built microservice architecture", "Increased test coverage from 60% to 92%"],
            )
        ],
        skills=["Python", "TypeScript", "React", "Node.js", "Docker", "Git", "REST APIs", "PostgreSQL", "AWS"],
        projects=[
            ProjectItem(
                title="Placement Portal",
                description="Architected full-stack web app handling 500+ student applications with role-based auth.",
                technologies=["React", "Node.js", "PostgreSQL"],
                highlights=["Implemented JWT auth"],
            ),
            ProjectItem(
                title="ML Pipeline",
                description="Developed real-time ML inference pipeline processing 1,000 events per second.",
                technologies=["Python", "FastAPI", "Docker"],
                highlights=["Deployed on Kubernetes"],
            ),
        ],
        certifications=[],
        achievements=[],
    )


# ── _calculate_format_score ───────────────────────────────────────────────


class TestCalculateFormatScore:
    def test_empty_resume_has_base_score(self):
        score = svc._calculate_format_score(_empty_resume())
        assert score == 40.0  # base only

    def test_full_contact_info(self):
        r = ResumeContentInput(fullName="A", email="a@b.com", phone="123")
        score = svc._calculate_format_score(r)
        assert score >= 60.0  # base + name/email + phone

    def test_links_add_score(self):
        base_score = svc._calculate_format_score(ResumeContentInput(fullName="A", email="a@b.com"))
        linked_score = svc._calculate_format_score(
            ResumeContentInput(fullName="A", email="a@b.com", linkedinUrl="https://linkedin.com/in/a")
        )
        assert linked_score == base_score + 10.0

    def test_github_link_also_adds(self):
        score = svc._calculate_format_score(
            ResumeContentInput(fullName="A", email="a@b.com", githubUrl="https://github.com/a")
        )
        base_with_name = 40.0 + 15.0
        assert score == base_with_name + 10.0

    def test_education_adds_score(self):
        r = ResumeContentInput(education=[{"institution": "MIT", "degree": "B.S."}])
        score = svc._calculate_format_score(r)
        assert score == 40.0 + 10.0

    def test_skills_gte_4_adds_score(self):
        r = ResumeContentInput(skills=["a", "b", "c", "d"])
        score = svc._calculate_format_score(r)
        assert score >= 50.0

    def test_skills_lt_4_no_bonus(self):
        r = ResumeContentInput(skills=["a", "b", "c"])
        score = svc._calculate_format_score(r)
        assert score == 40.0

    def test_projects_add_score(self):
        r = ResumeContentInput(projects=[ProjectItem(title="X")])
        score = svc._calculate_format_score(r)
        assert score == 50.0

    def test_experience_adds_score(self):
        r = ResumeContentInput(experience=[ExperienceItem(company="X", position="Y")])
        score = svc._calculate_format_score(r)
        assert score == 50.0

    def test_rich_resume_near_max(self):
        score = svc._calculate_format_score(_rich_resume())
        assert score == 100.0

    def test_score_capped_at_100(self):
        score = svc._calculate_format_score(_rich_resume())
        assert score <= 100.0


# ── _calculate_skill_score ────────────────────────────────────────────────


class TestCalculateSkillScore:
    def test_no_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=[])) == 20.0

    def test_one_skill(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=["Python"])) == 45.0

    def test_three_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=["a", "b", "c"])) == 45.0

    def test_four_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=["a", "b", "c", "d"])) == 70.0

    def test_seven_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=list("abcdefg"))) == 70.0

    def test_eight_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=list("abcdefgh"))) == 90.0

    def test_twelve_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=list("abcdefghijkl"))) == 90.0

    def test_thirteen_skills(self):
        assert svc._calculate_skill_score(ResumeContentInput(skills=list("abcdefghijklm"))) == 100.0

    def test_rich_resume(self):
        assert svc._calculate_skill_score(_rich_resume()) == 90.0  # 9 skills


# ── _calculate_keyword_score ──────────────────────────────────────────────


class TestCalculateKeywordScore:
    def test_empty_resume(self):
        score = svc._calculate_keyword_score(_empty_resume())
        assert score == 40.0  # base only, no verbs or metrics

    def test_action_verbs_add_score(self):
        r = ResumeContentInput(
            summary="Built scalable APIs and optimized database queries."
        )
        score = svc._calculate_keyword_score(r)
        # "built" and "optimized" are in ACTION_VERBS -> +14
        assert score >= 40.0 + 14.0

    def test_metrics_add_score(self):
        r = ResumeContentInput(
            summary="Reduced latency by 40% for 10000 active users."
        )
        score = svc._calculate_keyword_score(r)
        # "reduced" verb (+7) + metrics (+25)
        assert score >= 40.0 + 7.0 + 25.0

    def test_verb_cap_at_35(self):
        """More than 5 verbs should still cap the verb bonus at 35."""
        r = ResumeContentInput(
            summary="Built, created, developed, designed, engineered, implemented, optimized, reduced systems."
        )
        score = svc._calculate_keyword_score(r)
        # 8 verbs * 7 = 56, but capped at 35 → 40 + 35 = 75, no metrics
        assert score == 75.0

    def test_both_exp_and_project_texts(self):
        r = ResumeContentInput(
            experience=[ExperienceItem(
                company="X",
                position="Y",
                description="Led engineering team increasing throughput by 50%.",
                highlights=["Automated deployment pipeline"],
            )],
            projects=[ProjectItem(
                title="Z",
                description="Developed real-time dashboard serving 200+ users.",
                highlights=["Scaled to handle 1000 requests per second"],
            )],
        )
        score = svc._calculate_keyword_score(r)
        # Multiple verbs + metrics
        assert score >= 72.0

    def test_score_capped_at_100(self):
        r = _rich_resume()
        score = svc._calculate_keyword_score(r)
        assert score <= 100.0

    def test_no_verbs_no_metrics(self):
        r = ResumeContentInput(summary="Worked on some stuff at a company.")
        score = svc._calculate_keyword_score(r)
        assert score == 40.0  # "worked" is not in ACTION_VERBS


# ── _calculate_ats_score ──────────────────────────────────────────────────


class TestCalculateAtsScore:
    def test_empty_resume(self):
        score = svc._calculate_ats_score(_empty_resume(), 40.0, 40.0)
        # (40*0.5) + (40*0.3) = 32.0, no summary → -5 → 27 → clamped to 27
        assert score == 27.0

    def test_with_good_summary(self):
        r = ResumeContentInput(
            summary="A " * 25  # 25 words
        )
        score = svc._calculate_ats_score(r, 80.0, 80.0)
        # (80*0.5=40) + (80*0.3=24) + 10 (summary) = 74
        assert score == 74.0

    def test_no_summary_penalty(self):
        r = ResumeContentInput(summary="")
        score_no_summary = svc._calculate_ats_score(r, 60.0, 60.0)
        r2 = ResumeContentInput(summary="A " * 25)
        score_with_summary = svc._calculate_ats_score(r2, 60.0, 60.0)
        assert score_with_summary > score_no_summary

    def test_detailed_projects_bonus(self):
        r = ResumeContentInput(
            projects=[
                ProjectItem(title="A", description="word " * 20),
                ProjectItem(title="B", description="word " * 20),
            ]
        )
        score = svc._calculate_ats_score(r, 60.0, 60.0)
        # (60*0.5=30) + (60*0.3=18) - 5 (no summary) + 10 (projects) = 53
        assert score == 53.0

    def test_minimum_floor(self):
        """ATS score should never fall below 20."""
        score = svc._calculate_ats_score(_empty_resume(), 0.0, 0.0)
        assert score >= 20.0

    def test_maximum_cap(self):
        score = svc._calculate_ats_score(_rich_resume(), 100.0, 100.0)
        assert score <= 100.0


# ── _find_missing_skills ─────────────────────────────────────────────────


class TestFindMissingSkills:
    def test_empty_resume_missing_top5(self):
        missing = svc._find_missing_skills(_empty_resume())
        assert len(missing) == 5  # capped at 5

    def test_all_skills_present(self):
        """If all high-value skills are in resume, missing list is empty."""
        from app.services.resume_analyzer import COMMON_HIGH_VALUE_SKILLS
        r = ResumeContentInput(skills=list(COMMON_HIGH_VALUE_SKILLS))
        missing = svc._find_missing_skills(r)
        assert len(missing) == 0

    def test_project_technologies_counted(self):
        """Skills listed in project technologies should not appear as missing."""
        r = ResumeContentInput(
            skills=["Git", "SQL"],
            projects=[ProjectItem(title="X", technologies=["Docker", "REST APIs"])],
        )
        missing = svc._find_missing_skills(r)
        assert "Git" not in missing
        assert "Docker" not in missing

    def test_returns_at_most_5(self):
        missing = svc._find_missing_skills(_empty_resume())
        assert len(missing) <= 5

    def test_alias_match_not_missing(self):
        """A resume with 'k8s' should not list 'Kubernetes' as missing if it were high-value."""
        r = ResumeContentInput(skills=["Git", "Docker", "REST APIs", "SQL", "CI/CD"])
        missing = svc._find_missing_skills(r)
        for m in missing:
            assert normalize_skill(m) not in {normalize_skill(s) for s in r.skills}

    def test_no_skills_no_projects(self):
        missing = svc._find_missing_skills(ResumeContentInput())
        assert isinstance(missing, list)
        assert len(missing) > 0


# ── Edge cases: empty resume & empty JD ───────────────────────────────────


class TestEdgeCases:
    def test_all_scores_on_empty_resume(self):
        r = _empty_resume()
        assert 0 <= svc._calculate_format_score(r) <= 100
        assert 0 <= svc._calculate_skill_score(r) <= 100
        assert 0 <= svc._calculate_keyword_score(r) <= 100
        ats = svc._calculate_ats_score(r, svc._calculate_format_score(r), svc._calculate_keyword_score(r))
        assert 0 <= ats <= 100

    def test_match_opportunity_empty_skills(self):
        """Empty opportunity_skills → default 80.0 match score."""
        result = svc.match_opportunity(_empty_resume(), [])
        assert result.matchScore == 80.0
        assert result.isEligible is True

    def test_match_opportunity_all_matching(self):
        r = ResumeContentInput(skills=["Python", "React", "Docker"])
        result = svc.match_opportunity(r, ["Python", "React", "Docker"])
        assert len(result.matchedSkills) == 3
        assert len(result.missingSkills) == 0
        assert result.matchScore > 0

    def test_match_opportunity_none_matching(self):
        r = ResumeContentInput(skills=["Java", "Kotlin"])
        result = svc.match_opportunity(r, ["Python", "Go", "Rust"])
        assert len(result.matchedSkills) == 0
        assert len(result.missingSkills) == 3
        assert result.matchScore < 50.0

    def test_match_opportunity_partial_matching(self):
        r = ResumeContentInput(
            skills=["Python", "React"],
            projects=[ProjectItem(title="X", technologies=["Docker"])],
        )
        result = svc.match_opportunity(r, ["Python", "Docker", "Kubernetes"])
        assert "Python" in result.matchedSkills
        assert "Docker" in result.matchedSkills
        assert "Kubernetes" in result.missingSkills

    def test_eligibility_cgpa_fail(self):
        r = _rich_resume()
        result = svc.match_opportunity(r, ["Python"], eligibility={
            "requiredCgpa": 9.5,
            "studentCgpa": 8.0,
        })
        assert result.isEligible is False

    def test_eligibility_department_fail(self):
        r = _rich_resume()
        result = svc.match_opportunity(r, ["Python"], eligibility={
            "eligibleDepartments": ["Mechanical Engineering"],
            "studentDepartment": "Computer Science",
        })
        assert result.isEligible is False

    def test_eligibility_passes(self):
        r = _rich_resume()
        result = svc.match_opportunity(r, ["Python"], eligibility={
            "requiredCgpa": 7.0,
            "studentCgpa": 9.0,
            "eligibleDepartments": ["Computer Science"],
            "studentDepartment": "Computer Science",
        })
        assert result.isEligible is True
