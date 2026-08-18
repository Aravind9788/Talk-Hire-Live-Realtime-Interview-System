"""Phase 2 Verification Test Suite — Resume + Job Description (JD) Dual Analysis Engine."""

import pytest
from fastapi.testclient import TestClient
from bot.bot import app
from bot.resume_parser import (
    analyze_resume_and_jd,
    extract_resume_text,
    assess_difficulty,
    _extract_skills,
    _count_years_experience,
)
from bot.core.prompts import PromptManager


SAMPLE_RESUME = """
John Doe — Senior Backend Engineer
Experience: 5 years of experience building scalable backend services in Python, FastAPI, and PostgreSQL.
Skills: Python, FastAPI, Django, PostgreSQL, Docker, Git, REST APIs, Microservices.
Education: Bachelor of Technology in Computer Science.
Projects: Developed high-throughput REST APIs and maintained SQL databases handling 10k RPS.
"""

SAMPLE_JD = """
Job Title: Senior Distributed Systems & Cloud Engineer
Responsibilities:
- Build fault-tolerant microservices handling 50k RPS.
- Implement real-time event streaming with Kafka and Redis distributed caching.
- Deploy and manage containerized applications on Kubernetes with Terraform CI/CD.
Requirements:
- Strong experience with Python, Go, Kafka, Redis, Kubernetes, Terraform, Distributed Systems.
"""


def test_resume_parser_text_extraction():
    """Verify raw text extraction and experience detection."""
    skills = _extract_skills(SAMPLE_RESUME)
    assert "python" in skills
    assert "fastapi" in skills
    assert "postgresql" in skills

    years = _count_years_experience(SAMPLE_RESUME)
    assert years == 5

    diff_data = assess_difficulty(SAMPLE_RESUME)
    assert diff_data["difficulty"] in ("medium", "hard")
    assert diff_data["years_experience"] == 5


def test_resume_and_jd_dual_gap_analysis():
    """Verify matching skills, gaps detection, and probe questions generation."""
    analysis = analyze_resume_and_jd(
        resume_text=SAMPLE_RESUME,
        jd_text=SAMPLE_JD,
        job_role="Backend Engineer",
    )

    assert "match_score" in analysis
    assert 20 <= analysis["match_score"] <= 100

    # Overlapping skills between resume and JD
    matched = analysis["matched_skills"]
    assert "python" in matched or "microservices" in matched

    # Skills required in JD but missing in Resume
    gaps = analysis["skill_gaps"]
    assert any(g in gaps for g in ("kafka", "redis", "kubernetes", "terraform", "distributed systems"))

    # Probe questions generated for missing JD skills
    probe_qs = analysis["targeted_probe_questions"]
    assert len(probe_qs) > 0
    assert any("kafka" in q.lower() or "redis" in q.lower() or "kubernetes" in q.lower() for q in probe_qs)


def test_prompt_manager_with_jd_context():
    """Verify micro-prompt manager weaves in target JD context."""
    prompt_mgr = PromptManager()
    prompt = prompt_mgr.build_focused_round_prompt(
        round_name="coding",
        candidate_name="Aravind",
        resume_summary="Python, FastAPI, PostgreSQL",
        jd_summary="Target: Kafka, Redis, Kubernetes",
        selected_questions=["Design a rate limiter."],
    )

    assert "## TARGET JOB DESCRIPTION REQUIREMENTS" in prompt
    assert "Kafka, Redis, Kubernetes" in prompt
    assert "## CANDIDATE RESUME SUMMARY" in prompt


def test_api_resume_jd_analyze_endpoint():
    """Verify FastAPI /api/resume/analyze endpoint handles resume and JD payload."""
    client = TestClient(app)
    response = client.post(
        "/api/resume/analyze",
        data={
            "resume_text": SAMPLE_RESUME,
            "job_role": "Backend Engineer",
            "job_description": SAMPLE_JD,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
    assert "matched_skills" in data
    assert "skill_gaps" in data
    assert "targeted_probe_questions" in data
    assert len(data["skill_gaps"]) > 0
