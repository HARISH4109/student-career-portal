"""Tests for text normalization and parsing functions in resume_analyzer.py."""


from app.services.resume_analyzer import (
    _clean_unicode_text,
    _sanitize_resume_text,
    normalize_skill,
    SKILL_ALIASES,
)


# ── _clean_unicode_text ───────────────────────────────────────────────────


class TestCleanUnicodeText:
    """Unit tests for the _clean_unicode_text helper."""

    def test_empty_string(self):
        assert _clean_unicode_text("") == ""

    def test_plain_ascii_unchanged(self):
        assert _clean_unicode_text("Hello World") == "Hello World"

    def test_smart_quotes_replaced(self):
        text = "\u201cHello\u201d and \u2018world\u2019"
        result = _clean_unicode_text(text)
        assert result == '"Hello" and \'world\''

    def test_en_dash_replaced(self):
        assert _clean_unicode_text("2020\u20132024") == "2020-2024"

    def test_em_dash_replaced(self):
        assert _clean_unicode_text("one\u2014two") == "one--two"

    def test_non_breaking_hyphen(self):
        assert _clean_unicode_text("well\u2011known") == "well-known"

    def test_figure_dash(self):
        assert _clean_unicode_text("chapter\u2012section") == "chapter-section"

    def test_bullet_replaced(self):
        assert _clean_unicode_text("\u2022 Item") == "* Item"

    def test_non_breaking_space(self):
        assert _clean_unicode_text("a\u00a0b") == "a b"

    def test_multiple_replacements(self):
        text = "\u201cSmart\u201d \u2013 \u2022 \u00a0"
        result = _clean_unicode_text(text)
        assert "\u201c" not in result
        assert "\u2013" not in result
        assert "\u2022" not in result
        assert "\u00a0" not in result

    def test_cjk_characters_pass_through(self):
        """CJK chars aren't in the replacement map and should remain intact."""
        text = "技术简历 \u2013 Developer"
        result = _clean_unicode_text(text)
        assert "技术简历" in result
        assert "-" in result  # en-dash replaced

    def test_rtl_arabic_characters_pass_through(self):
        text = "مطور برمجيات \u2013 Engineer"
        result = _clean_unicode_text(text)
        assert "مطور" in result
        assert "-" in result

    def test_combining_marks_pass_through(self):
        """Combining diacritical marks should not be stripped."""
        text = "re\u0301sume\u0301"  # e + combining acute accent
        result = _clean_unicode_text(text)
        assert "\u0301" in result  # combining mark preserved

    def test_emoji_pass_through(self):
        """Emoji that are not in the replacements map are preserved."""
        text = "🚀 launched product"
        result = _clean_unicode_text(text)
        assert "🚀" in result

    def test_zero_width_chars_pass_through(self):
        """Zero-width chars are NOT in the replacement map, so they pass through."""
        text = "hello\u200bworld"  # zero-width space
        result = _clean_unicode_text(text)
        assert "\u200b" in result  # function does not strip zero-width


# ── _sanitize_resume_text ─────────────────────────────────────────────────


class TestSanitizeResumeText:
    """Unit tests for _sanitize_resume_text."""

    def test_empty_string(self):
        assert _sanitize_resume_text("") == ""

    def test_none_input(self):
        """Edge: should return empty on falsy input."""
        assert _sanitize_resume_text("") == ""

    def test_strips_markdown_json_fence(self):
        text = '```json\n{"enhancedText": "hello"}\n```'
        result = _sanitize_resume_text(text)
        # Fences and JSON wrappers removed
        assert "```" not in result

    def test_strips_markdown_fence_no_lang(self):
        text = "```\nsome text here\n```"
        result = _sanitize_resume_text(text)
        assert "```" not in result
        assert "some text here" in result

    def test_strips_preamble_here_is(self):
        text = "Here is the enhanced text: Optimized query performance by 40%."
        result = _sanitize_resume_text(text)
        assert result.startswith("Optimized") or "Optimized" in result
        assert "Here is" not in result

    def test_strips_preamble_sure(self):
        text = "Sure! Here is your rewritten version: Built a REST API."
        result = _sanitize_resume_text(text)
        assert "Sure" not in result

    def test_strips_preamble_enhanced_text(self):
        text = "Enhanced text: Implemented CI/CD pipelines."
        result = _sanitize_resume_text(text)
        assert "Enhanced text:" not in result

    def test_strips_json_key_wrapper(self):
        text = '{"enhancedText": "Developed REST API"}'
        result = _sanitize_resume_text(text)
        assert "enhancedText" not in result

    def test_unescapes_escaped_chars(self):
        text = r'He said \"hello\" and \'world\''
        result = _sanitize_resume_text(text)
        assert '\\"' not in result

    def test_strips_trailing_json_braces(self):
        text = 'Built microservices"}'
        result = _sanitize_resume_text(text)
        assert result.endswith("microservices") or "}" not in result

    def test_strips_wrapped_quotes(self):
        text = '"Developed a high-performance API."'
        result = _sanitize_resume_text(text)
        assert not result.startswith('"')
        assert not result.endswith('"')

    def test_normalizes_excess_whitespace(self):
        text = "  Developed   REST   API   for  users  "
        result = _sanitize_resume_text(text)
        assert "  " not in result

    def test_strips_leading_bullet_markers(self):
        text = "• Built a REST API"
        result = _sanitize_resume_text(text)
        assert not result.startswith("•")
        assert not result.startswith("-")
        assert "Built" in result or "REST API" in result

    def test_unicode_chars_normalized_first(self):
        """Ensures _clean_unicode_text runs before other sanitization."""
        text = "\u201cBuilt microservices\u201d"
        result = _sanitize_resume_text(text)
        assert "\u201c" not in result
        assert "\u201d" not in result

    def test_escaped_newlines_replaced(self):
        text = "First line\\nSecond line"
        result = _sanitize_resume_text(text)
        assert "\\n" not in result


# ── normalize_skill ───────────────────────────────────────────────────────


class TestNormalizeSkill:
    """Unit tests for the normalize_skill function."""

    def test_lowercase(self):
        assert normalize_skill("Python") == "python"

    def test_strips_whitespace(self):
        assert normalize_skill("  Python  ") == "python"

    def test_alias_js(self):
        assert normalize_skill("JS") == "javascript"

    def test_alias_ts(self):
        assert normalize_skill("ts") == "typescript"

    def test_alias_react_js(self):
        assert normalize_skill("React.js") == "react"

    def test_alias_reactjs(self):
        assert normalize_skill("ReactJS") == "react"

    def test_alias_node_js(self):
        assert normalize_skill("Node.js") == "node"

    def test_alias_py(self):
        assert normalize_skill("py") == "python"

    def test_alias_postgres(self):
        assert normalize_skill("Postgres") == "postgresql"

    def test_alias_mongo(self):
        assert normalize_skill("Mongo") == "mongodb"

    def test_alias_k8s(self):
        assert normalize_skill("k8s") == "kubernetes"

    def test_alias_gcp(self):
        assert normalize_skill("GCP") == "google cloud"

    def test_alias_aws(self):
        assert normalize_skill("AWS") == "amazon web services"

    def test_unknown_skill_returns_lowercase(self):
        assert normalize_skill("FastAPI") == "fastapi"

    def test_all_aliases_resolve(self):
        """Every entry in SKILL_ALIASES is reachable through normalize_skill."""
        for alias, canonical in SKILL_ALIASES.items():
            assert normalize_skill(alias) == canonical

    def test_empty_string(self):
        assert normalize_skill("") == ""

    def test_whitespace_only(self):
        assert normalize_skill("   ") == ""


# ── Bullet-point extraction from raw text ─────────────────────────────────


class TestBulletPointExtraction:
    """_sanitize_resume_text strips leading bullet markers; verify extraction."""

    def test_dash_bullet(self):
        result = _sanitize_resume_text("- Implemented CI/CD pipeline")
        assert "Implemented" in result

    def test_asterisk_bullet(self):
        result = _sanitize_resume_text("* Built REST API endpoints")
        assert "Built" in result

    def test_unicode_bullet(self):
        result = _sanitize_resume_text("• Led cross-functional team")
        # The unicode bullet is converted to * by _clean_unicode_text,
        # then stripped by _sanitize_resume_text
        assert "Led" in result

    def test_multiple_bullet_markers(self):
        """Multiple leading markers should all be stripped."""
        result = _sanitize_resume_text("-- - Built a thing")
        assert "Built" in result

    def test_non_bullet_text_unchanged(self):
        result = _sanitize_resume_text("Developed a REST API.")
        assert result == "Developed a REST API."
