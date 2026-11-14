"""Tests for authentication middleware, validation, health endpoint, and idempotency."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

# Authenticated client for endpoints that require internal token
auth_client = TestClient(app, headers={"X-Internal-Token": "isolated-test-token"})

# Unauthenticated client
no_auth_client = TestClient(app)

MINIMAL_RESUME = {"fullName": "Test User", "email": "test@example.com"}


# ── verify_internal_token middleware ──────────────────────────────────────


class TestVerifyInternalToken:
    """Tests for the verify_internal_token FastAPI dependency."""

    def test_valid_token_passes(self):
        response = auth_client.post(
            "/v1/resume/analyze",
            json={"content": MINIMAL_RESUME},
        )
        assert response.status_code == 200

    def test_missing_token_returns_401(self):
        response = no_auth_client.post(
            "/v1/resume/analyze",
            json={"content": MINIMAL_RESUME},
        )
        assert response.status_code == 401
        body = response.json()
        assert "Invalid or missing" in body["detail"]

    def test_invalid_token_returns_401(self):
        bad_client = TestClient(app, headers={"X-Internal-Token": "wrong-token"})
        response = bad_client.post(
            "/v1/resume/analyze",
            json={"content": MINIMAL_RESUME},
        )
        assert response.status_code == 401

    def test_empty_string_token_returns_401(self):
        bad_client = TestClient(app, headers={"X-Internal-Token": ""})
        response = bad_client.post(
            "/v1/resume/analyze",
            json={"content": MINIMAL_RESUME},
        )
        assert response.status_code == 401

    def test_auth_required_on_enhance_text(self):
        response = no_auth_client.post(
            "/v1/resume/enhance-text",
            json={"text": "Built an API", "sectionType": "experience"},
        )
        assert response.status_code == 401

    def test_auth_required_on_match_opportunity(self):
        response = no_auth_client.post(
            "/v1/resume/match-opportunity",
            json={"resumeContent": MINIMAL_RESUME, "opportunitySkills": ["Python"]},
        )
        assert response.status_code == 401


# ── Payload validation (422) ──────────────────────────────────────────────


class TestPayloadValidation:
    """FastAPI returns 422 for invalid request bodies."""

    def test_missing_content_field(self):
        response = auth_client.post("/v1/resume/analyze", json={})
        assert response.status_code == 422
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"

    def test_enhance_text_empty_text(self):
        """text field has min_length=1, so empty string should be rejected."""
        response = auth_client.post(
            "/v1/resume/enhance-text",
            json={"text": "", "sectionType": "experience"},
        )
        assert response.status_code == 422

    def test_enhance_text_missing_text(self):
        response = auth_client.post(
            "/v1/resume/enhance-text",
            json={"sectionType": "experience"},
        )
        assert response.status_code == 422

    def test_invalid_json_body(self):
        response = auth_client.post(
            "/v1/resume/analyze",
            content=b"not json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# ── Graceful fallback when API keys unset ─────────────────────────────────


class TestGracefulFallback:
    """When OPENAI_API_KEY and NVIDIA_API_KEY are unset (as in conftest.py),
    the service should still work using rule-engine and local fallback."""

    def test_analyze_uses_rule_engine(self):
        response = auth_client.post(
            "/v1/resume/analyze",
            json={"content": MINIMAL_RESUME},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["modelVersion"] == "rule-engine-v1.0"
        assert data["aiInsights"] == []  # no LLM call

    def test_enhance_uses_local_fallback(self):
        response = auth_client.post(
            "/v1/resume/enhance-text",
            json={"text": "Built a REST API", "sectionType": "experience"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["modelVersion"] == "local-rule-engine-v1.0"
        assert "unavailable" in data["keyChanges"][0].lower()


# ── /health endpoint ─────────────────────────────────────────────────────


class TestHealthEndpoint:
    """The /health endpoint must be accessible without authentication."""

    def test_health_returns_200_no_auth(self):
        response = no_auth_client.get("/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_health_returns_200_root_prefix(self):
        """Health is also mounted at root (no /v1 prefix) per main.py."""
        response = no_auth_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


# ── Idempotency ──────────────────────────────────────────────────────────


class TestIdempotency:
    """Same request twice should produce consistent deterministic results
    (the rule-engine portion is fully deterministic)."""

    def test_analyze_idempotent(self):
        payload = {"content": MINIMAL_RESUME, "targetRole": "SWE"}
        r1 = auth_client.post("/v1/resume/analyze", json=payload).json()["data"]
        r2 = auth_client.post("/v1/resume/analyze", json=payload).json()["data"]

        assert r1["overallScore"] == r2["overallScore"]
        assert r1["atsScore"] == r2["atsScore"]
        assert r1["skillScore"] == r2["skillScore"]
        assert r1["keywordScore"] == r2["keywordScore"]
        assert r1["formatScore"] == r2["formatScore"]
        assert r1["missingSkills"] == r2["missingSkills"]
        assert r1["modelVersion"] == r2["modelVersion"]

    def test_match_opportunity_idempotent(self):
        payload = {
            "resumeContent": MINIMAL_RESUME,
            "opportunitySkills": ["Python", "React"],
        }
        r1 = auth_client.post("/v1/resume/match-opportunity", json=payload).json()["data"]
        r2 = auth_client.post("/v1/resume/match-opportunity", json=payload).json()["data"]

        assert r1["matchScore"] == r2["matchScore"]
        assert r1["matchedSkills"] == r2["matchedSkills"]
        assert r1["missingSkills"] == r2["missingSkills"]
        assert r1["isEligible"] == r2["isEligible"]

    def test_enhance_text_idempotent(self):
        payload = {"text": "Developed REST APIs", "sectionType": "experience"}
        r1 = auth_client.post("/v1/resume/enhance-text", json=payload).json()["data"]
        r2 = auth_client.post("/v1/resume/enhance-text", json=payload).json()["data"]

        assert r1["enhancedText"] == r2["enhancedText"]
        assert r1["modelVersion"] == r2["modelVersion"]
