from fastapi.testclient import TestClient
import pytest

from app.core.config import get_settings
from app.main import app

client = TestClient(app, headers={"X-Internal-Token": "isolated-test-token"})

SAMPLE_RESUME_CONTENT = {
    "fullName": "Jane Doe",
    "email": "jane.doe@university.edu",
    "phone": "+1234567890",
    "location": "San Francisco, CA",
    "linkedinUrl": "https://linkedin.com/in/janedoe",
    "githubUrl": "https://github.com/janedoe",
    "portfolioUrl": "https://janedoe.dev",
    "summary": "Motivated software engineering student with expertise in React, TypeScript, Node.js, and PostgreSQL. Experienced in building responsive web applications and scalable backend APIs.",
    "education": [
        {
            "institution": "State University",
            "degree": "B.Tech",
            "fieldOfStudy": "Computer Science",
            "startDate": "2022",
            "endDate": "2026",
            "isCurrent": True,
            "grade": "8.9 CGPA",
            "description": "Relevant coursework: Data Structures, Algorithms, DBMS, Operating Systems.",
        }
    ],
    "experience": [
        {
            "company": "Tech Innovations Inc.",
            "position": "Software Engineering Intern",
            "location": "Remote",
            "startDate": "2024-05",
            "endDate": "2024-08",
            "isCurrent": False,
            "description": "Engineered REST APIs using Node.js and Express. Optimized database queries, reducing response times by 35% for 10,000+ active users.",
            "highlights": [
                "Built microservice for PDF invoice parsing",
                "Increased test coverage from 60% to 92%",
            ],
        }
    ],
    "skills": ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Git", "REST APIs", "Docker", "Tailwind CSS"],
    "projects": [
        {
            "title": "Placement Portal Web App",
            "role": "Lead Full-Stack Developer",
            "technologies": ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind"],
            "link": "https://portal-demo.com",
            "description": "Architected full-stack university placement management system with role-based authorization, handling 500+ student applications.",
            "highlights": [
                "Implemented JWT authentication and RBAC guards",
                "Created responsive dashboard with real-time statistics",
            ],
        }
    ],
    "certifications": [
        {
            "name": "AWS Certified Cloud Practitioner",
            "issuer": "Amazon Web Services",
            "issueDate": "2024-01",
            "credentialUrl": "https://aws.amazon.com/verify/123",
        }
    ],
    "achievements": [
        {
            "title": "1st Place - University Hackathon 2024",
            "description": "Built AI study assistant within 24 hours.",
            "date": "2024-03",
        }
    ],
}


def test_resume_analysis_endpoint():
    response = client.post(
        "/v1/resume/analyze",
        json={"content": SAMPLE_RESUME_CONTENT, "targetRole": "Full Stack Engineer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data

    res = data["data"]
    assert 0 <= res["overallScore"] <= 100
    assert 0 <= res["atsScore"] <= 100
    assert 0 <= res["skillScore"] <= 100
    assert 0 <= res["keywordScore"] <= 100
    assert 0 <= res["formatScore"] <= 100
    assert isinstance(res["missingSkills"], list)
    assert isinstance(res["improvementSuggestions"], list)
    assert res["modelVersion"] == "rule-engine-v1.0"


def test_resume_opportunity_matching_endpoint():
    match_payload = {
        "resumeContent": SAMPLE_RESUME_CONTENT,
        "opportunitySkills": ["React", "TypeScript", "Node.js", "Python", "Kubernetes"],
        "eligibilityContext": {
            "requiredCgpa": 7.5,
            "studentCgpa": 8.9,
            "eligibleDepartments": ["Computer Science", "Information Technology"],
            "studentDepartment": "Computer Science",
        },
    }
    response = client.post("/v1/resume/match-opportunity", json=match_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    match_res = data["data"]
    assert 0 <= match_res["matchScore"] <= 100
    assert "React" in match_res["matchedSkills"]
    assert "TypeScript" in match_res["matchedSkills"]
    assert "Node.js" in match_res["matchedSkills"]
    assert "Kubernetes" in match_res["missingSkills"]
    assert match_res["isEligible"] is True
    assert len(match_res["explanatoryReasons"]) > 0


def test_enhancement_fallback_preserves_facts():
    response = client.post('/v1/resume/enhance-text', json={
        'text': 'Built a student project', 'sectionType': 'experience'
    })
    assert response.status_code == 200
    result = response.json()['data']
    assert result['enhancedText'] == 'Built a student project.'
    assert result['bulletPoints'] == []
    assert 'unavailable' in result['keyChanges'][0]


def test_internal_token_is_required():
    response = TestClient(app).post('/v1/resume/analyze', json={'content': SAMPLE_RESUME_CONTENT})
    assert response.status_code == 401


@pytest.mark.parametrize('environment', ['development', 'production'])
@pytest.mark.parametrize('token', [None, '', 'incorrect-token'])
def test_internal_auth_cannot_be_bypassed(monkeypatch, environment, token):
    monkeypatch.setattr(get_settings(), 'node_env', environment)
    headers = {} if token is None else {'X-Internal-Token': token}
    response = TestClient(app).post(
        '/v1/resume/analyze', json={'content': SAMPLE_RESUME_CONTENT}, headers=headers
    )
    assert response.status_code == 401


def test_empty_configured_token_rejects_requests(monkeypatch):
    monkeypatch.setattr(get_settings(), 'ai_service_internal_token', '')
    response = client.post('/v1/resume/analyze', json={'content': SAMPLE_RESUME_CONTENT})
    assert response.status_code == 401
