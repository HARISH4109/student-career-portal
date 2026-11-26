from app.core.config import Settings
from app.core.llm import (
    get_llm_client,
    get_llm_model,
    get_llm_provider,
    is_safe_base_url,
    mask_api_key,
)


def test_mask_api_key_security():
    assert mask_api_key(None) == "not-configured"
    assert mask_api_key("") == "not-configured"
    assert mask_api_key("short") == "not-configured"
    
    masked = mask_api_key("gsk_mock_test_key_1234567890abcdef")
    assert masked == "gsk_...cdef"
    assert "mock_test" not in masked


def test_is_safe_base_url_ssrf_prevention():
    # Official public endpoints
    assert is_safe_base_url("https://api.groq.com/openai/v1") is True
    assert is_safe_base_url("https://integrate.api.nvidia.com/v1") is True
    
    # Non-http protocols
    assert is_safe_base_url("ftp://api.groq.com") is False
    assert is_safe_base_url("file:///etc/passwd") is False
    assert is_safe_base_url("javascript:alert(1)") is False

    # Production private & metadata host blocking
    assert is_safe_base_url("http://127.0.0.1:8000", allow_local=False) is False
    assert is_safe_base_url("http://localhost:8000", allow_local=False) is False
    assert is_safe_base_url("http://169.254.169.254/latest/meta-data/", allow_local=False) is False
    assert is_safe_base_url("http://metadata.google.internal", allow_local=False) is False

    # Dev allows local
    assert is_safe_base_url("http://localhost:8000", allow_local=True) is True


def test_groq_provider_resolution(monkeypatch):
    test_settings = Settings(
        ai_service_internal_token="test-token",
        groq_api_key="gsk_mock_test_key_1234567890",
        groq_model="llama-3.3-70b-versatile",
        groq_base_url="https://api.groq.com/openai/v1",
        nvidia_api_key="",
        openai_api_key="",
    )
    monkeypatch.setattr("app.core.llm.get_settings", lambda: test_settings)

    assert get_llm_provider() == "groq"
    assert get_llm_model() == "llama-3.3-70b-versatile"

    client = get_llm_client()
    assert client.api_key == "gsk_mock_test_key_1234567890"
    assert str(client.base_url).rstrip("/") == "https://api.groq.com/openai/v1"
    assert client.timeout == 30.0
    assert client.max_retries == 2


def test_groq_precedence_over_nvidia_and_openai(monkeypatch):
    """Groq takes precedence as the primary accelerated engine when configured in auto mode."""
    test_settings = Settings(
        ai_service_internal_token="test-token",
        ai_provider="auto",
        groq_api_key="gsk_groq_primary",
        nvidia_api_key="nvapi_secondary",
        openai_api_key="sk_tertiary",
    )
    monkeypatch.setattr("app.core.llm.get_settings", lambda: test_settings)

    assert get_llm_provider() == "groq"
    assert get_llm_model() == "llama-3.3-70b-versatile"


def test_explicit_provider_switch(monkeypatch):
    """User can explicitly choose between providers using AI_PROVIDER."""
    # Force nvidia even if groq is present
    test_settings_nvidia = Settings(
        ai_service_internal_token="test-token",
        ai_provider="nvidia",
        groq_api_key="gsk_groq_key",
        nvidia_api_key="nvapi_nvidia_key",
        nvidia_model="meta/llama-3.3-70b-instruct",
        openai_api_key="",
    )
    monkeypatch.setattr("app.core.llm.get_settings", lambda: test_settings_nvidia)
    assert get_llm_provider() == "nvidia"
    assert get_llm_model() == "meta/llama-3.3-70b-instruct"

    # Force groq
    test_settings_groq = Settings(
        ai_service_internal_token="test-token",
        ai_provider="groq",
        groq_api_key="gsk_groq_key",
        groq_model="llama-3.3-70b-versatile",
        nvidia_api_key="nvapi_nvidia_key",
        openai_api_key="",
    )
    monkeypatch.setattr("app.core.llm.get_settings", lambda: test_settings_groq)
    assert get_llm_provider() == "groq"
    assert get_llm_model() == "llama-3.3-70b-versatile"
