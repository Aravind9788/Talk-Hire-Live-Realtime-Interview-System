"""Lightweight, resilient resume parser for TalkHire interview agent."""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.resume")

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from docx import Document
except ImportError:
    Document = None


SKILL_KEYWORDS = {
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "ruby", "swift", "kotlin", "scala", "php", "sql", "r", "matlab",
    "react", "angular", "vue", "node", "django", "flask", "fastapi",
    "spring", "rails", "express", "next", "nuxt", "svelte",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "jenkins", "git", "ci/cd", "linux", "redis", "kafka", "rabbitmq",
    "postgresql", "mysql", "mongodb", "elasticsearch", "dynamodb",
    "machine learning", "deep learning", "nlp", "computer vision",
    "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy",
    "rest api", "graphql", "grpc", "microservices", "system design",
    "agile", "scrum", "kanban", "leadership", "mentoring",
    "data structures", "algorithms", "distributed systems",
    "machine learning engineer", "ml engineer", "data scientist",
    "software engineer", "backend engineer", "frontend engineer",
    "full stack", "devops", "site reliability", "sre",
    "ai engineer", "llm", "large language model", "generative ai",
    "prompt engineering", "rag", "retrieval augmented generation",
}

EXPERIENCE_PATTERNS = [
    r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)",
    r"(?:experience|exp)\s*:\s*(\d+)\+?\s*(?:years?|yrs?)",
    r"(?:worked|working)\s*(?:as|for)\s*(?:\w+\s+)*(?:\d+)\s*(?:years?|yrs?)",
]

EDUCATION_PATTERNS = [
    r"(?:bachelor|b\.?s\.?|b\.?tech|b\.?e\.?|b\.?sc)",
    r"(?:master|m\.?s\.?|m\.?tech|m\.?e\.?|m\.?sc|m\.?ba|m\.?eng)",
    r"(?:ph\.?d|doctorate|doctor of)",
]


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content safely from PDF binary data."""
    if PyPDF2 is None:
        return file_bytes.decode("utf-8", errors="ignore")
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        parts = [p.extract_text() for p in reader.pages if p.extract_text()]
        return "\n".join(parts)
    except Exception:
        return file_bytes.decode("utf-8", errors="ignore")


def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text content safely from DOCX binary data."""
    if Document is None:
        return file_bytes.decode("utf-8", errors="ignore")
    try:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception:
        return file_bytes.decode("utf-8", errors="ignore")


def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    """Fast, lightweight resume text extraction with fallback error handling."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(file_bytes)
    elif ext == ".docx":
        return _extract_text_from_docx(file_bytes)
    return file_bytes.decode("utf-8", errors="ignore")


def _count_years_experience(text: str) -> int:
    """Extract maximum years of experience from resume text."""
    text_lower = text.lower()
    max_years = 0
    for pattern in EXPERIENCE_PATTERNS:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            try:
                max_years = max(max_years, int(match))
            except ValueError:
                continue
    return max_years


def _extract_skills(text: str) -> list[str]:
    """Find and return list of matching technical skills in resume text."""
    text_lower = text.lower()
    found = {skill for skill in SKILL_KEYWORDS if skill in text_lower}
    return sorted(found)


def _detect_education_level(text: str) -> str:
    """Determine candidate highest education level from resume text."""
    text_lower = text.lower()
    if any(re.search(p, text_lower) for p in EDUCATION_PATTERNS):
        if "ph" in text_lower or "doctorate" in text_lower:
            return "phd"
        if "master" in text_lower or "m.s" in text_lower or "mtech" in text_lower:
            return "masters"
        return "bachelors"
    return "unknown"


def assess_difficulty(resume_text: str) -> dict[str, Any]:
    """Analyze resume text and return assessed difficulty tier and skill list."""
    years_exp = _count_years_experience(resume_text)
    skills = _extract_skills(resume_text)
    education = _detect_education_level(resume_text)

    skill_count = len(skills)
    if years_exp >= 8 or skill_count >= 25 or education == "phd":
        difficulty = "hard"
    elif years_exp >= 3 or skill_count >= 12 or education in ("masters", "phd"):
        difficulty = "medium"
    else:
        difficulty = "easy"

    return {
        "difficulty": difficulty,
        "years_experience": years_exp,
        "skills_found": skills,
        "skill_count": skill_count,
        "education_level": education,
    }
