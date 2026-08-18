"""Phase 4 Verification Test Suite — LiteParse Resume Parsing & LiveKit Self-Hosted Config.

Validates that:
  - LiteParse is installed and extracts text from PDF documents.
  - The resume ↔ JD gap analysis pipeline works end-to-end.
  - LiveKit YAML config uses only safe (non-prohibited) ports.
  - Docker Compose exposes no prohibited ports.
  - Unique API keys are deterministically generated from project identifiers.
"""

import os
import pytest
import yaml
from pathlib import Path

from bot.resume_parser import (
    extract_resume_text,
    _liteparse_available,
    _extract_skills,
    _count_years_experience,
    analyze_resume_and_jd,
    assess_difficulty,
)
from livekit_infra.config import (
    generate_api_credentials,
    validate_livekit_yaml,
    PROHIBITED_PORTS,
)


# ─────────────────────────────────────────────────────────────────
# LiteParse Integration Tests
# ─────────────────────────────────────────────────────────────────

def test_liteparse_is_installed():
    """Verify that the liteparse package is importable."""
    assert _liteparse_available, "liteparse should be installed"
    from liteparse import LiteParse
    assert LiteParse() is not None


def test_liteparse_pdf_extraction():
    """Verify PDF text extraction works via LiteParse or its fallback."""
    pdf_bytes = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 83>>stream
BT /F1 12 Tf 100 700 Td (Senior Python Developer FastAPI PostgreSQL Docker) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000340 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
473
%%EOF"""
    text = extract_resume_text(pdf_bytes, "resume.pdf")
    assert len(text) > 0
    assert "python" in text.lower() or "developer" in text.lower()


def test_liteparse_text_file_fallback():
    """Verify plain text files gracefully fall back (liteparse skips .txt)."""
    content = b"Senior Backend Engineer with 7 years experience in Python, Kafka, and Redis."
    text = extract_resume_text(content, "resume.txt")
    assert "Senior Backend Engineer" in text


def test_skill_extraction_from_parsed_text():
    """Verify the skill extraction pipeline on LiteParse-style output."""
    text = """
    John Doe — Senior Software Engineer
    Experience: 6 years building distributed systems with Python, FastAPI, and Kubernetes.
    Skills: Python, Go, Docker, Kubernetes, Kafka, Redis, PostgreSQL, REST API, Microservices.
    Education: Master of Science in Computer Science.
    """
    skills = _extract_skills(text)
    assert "python" in skills
    assert "kubernetes" in skills
    assert _count_years_experience(text) == 6
    assert assess_difficulty(text)["difficulty"] in ("medium", "hard")


def test_dual_analysis_gap_detection():
    """Verify resume ↔ JD gap analysis identifies missing skills."""
    result = analyze_resume_and_jd(
        resume_text="Python, FastAPI, Docker, PostgreSQL. 5 years experience.",
        jd_text="Requires Kafka, Redis, Kubernetes, Terraform, distributed systems.",
        job_role="Backend Engineer",
    )
    assert result["match_score"] >= 20
    assert any(g in result["skill_gaps"] for g in ("kafka", "redis", "kubernetes"))
    assert len(result["targeted_probe_questions"]) > 0


# ─────────────────────────────────────────────────────────────────
# LiveKit Self-Hosted Configuration Tests
# ─────────────────────────────────────────────────────────────────

LIVEKIT_DIR = Path(__file__).parent.parent / "livekit_infra"


def test_unique_api_key_generation():
    """Verify deterministic API credentials from project identifiers."""
    key, secret = generate_api_credentials("Aravind", "sumathi", "97")
    assert key == "THK_aravind97"
    assert len(secret) >= 32
    # Must be deterministic — same inputs give same output
    key2, secret2 = generate_api_credentials("Aravind", "sumathi", "97")
    assert key == key2
    assert secret == secret2


def test_livekit_yaml_valid_and_safe():
    """Verify livekit.yaml exists, parses, and uses no prohibited ports."""
    violations = validate_livekit_yaml()
    assert violations == [], f"Port violations found: {violations}"


def test_livekit_signaling_port_7881():
    """Verify LiveKit signaling uses port 7881 (not prohibited 7880)."""
    with open(LIVEKIT_DIR / "livekit.yaml") as f:
        config = yaml.safe_load(f)
    assert config["port"] == 7881


def test_livekit_yaml_has_unique_key():
    """Verify livekit.yaml contains the project-specific API key."""
    with open(LIVEKIT_DIR / "livekit.yaml") as f:
        config = yaml.safe_load(f)
    assert "THK_aravind97" in config.get("keys", {})


def test_docker_compose_exists_and_safe():
    """Verify docker-compose uses only safe port mappings."""
    compose_path = LIVEKIT_DIR / "docker-compose.livekit.yml"
    assert compose_path.exists()

    with open(compose_path) as f:
        compose = yaml.safe_load(f)

    for svc_name, svc_config in compose.get("services", {}).items():
        for mapping in svc_config.get("ports", []):
            host_port = int(str(mapping).split(":")[0])
            assert host_port not in PROHIBITED_PORTS, (
                f"Service '{svc_name}' uses prohibited port {host_port}"
            )


def test_dockerfile_exists():
    """Verify Dockerfile.backend exists in the livekit directory."""
    assert (LIVEKIT_DIR / "Dockerfile.backend").exists()


def test_config_helper_exists():
    """Verify the Python config helper module exists."""
    assert (LIVEKIT_DIR / "config.py").exists()


def test_env_contains_unique_keys():
    """Verify .env file uses the unique API key, not generic devkey."""
    env_path = Path(__file__).parent.parent / ".env"
    content = env_path.read_text()
    assert "THK_aravind97" in content
    assert "ws://localhost:7881" in content
