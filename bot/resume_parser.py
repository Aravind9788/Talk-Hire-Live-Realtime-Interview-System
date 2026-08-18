"""Resume and Job Description (JD) dual parsing and gap analysis engine for TalkHire.

Uses LiteParse (by LlamaIndex) as the primary document parser for PDF/DOCX extraction,
with PyPDF2 / python-docx as lightweight fallbacks when liteparse is unavailable.
"""

from __future__ import annotations

import io
import re
import tempfile
from pathlib import Path
from typing import Any

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.resume")

# ── Primary parser: LiteParse (LlamaIndex) ──────────────────────────────────
try:
    from liteparse import LiteParse

    _liteparse_available = True
except ImportError:
    _liteparse_available = False

# ── Fallbacks ────────────────────────────────────────────────────────────────
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from docx import Document
except ImportError:
    Document = None


# ─────────────────────────────────────────────────────────────────────────────
# Skill taxonomy & role mappings
# ─────────────────────────────────────────────────────────────────────────────
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

ROLE_CORE_SKILLS: dict[str, list[str]] = {
    "backend engineer": ["python", "go", "java", "fastapi", "microservices", "system design", "redis", "kafka", "postgresql", "docker"],
    "frontend engineer": ["javascript", "typescript", "react", "next", "vue", "rest api", "graphql", "git"],
    "fullstack engineer": ["javascript", "typescript", "react", "node", "python", "fastapi", "sql", "postgresql", "docker", "rest api"],
    "ai & ml engineer": ["python", "pytorch", "tensorflow", "numpy", "pandas", "machine learning", "deep learning", "llm", "rag"],
    "system architect": ["distributed systems", "system design", "microservices", "kubernetes", "kafka", "redis", "aws", "gcp", "docker"],
    "devops engineer": ["docker", "kubernetes", "terraform", "ci/cd", "linux", "aws", "gcp", "azure", "git"],
}

EXPERIENCE_PATTERNS = [
    r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)",
    r"(?:experience|exp)\s*:\s*(\d+)\+?\s*(?:years?|yrs?)",
    r"(?:worked|working)\s*(?:as|for)\s*(?:\w+\s+)*(\d+)\s*(?:years?|yrs?)",
]

EDUCATION_PATTERNS = [
    r"(?:bachelor|b\.?s\.?|b\.?tech|b\.?e\.?|b\.?sc)",
    r"(?:master|m\.?s\.?|m\.?tech|m\.?e\.?|m\.?sc|m\.?ba|m\.?eng)",
    r"(?:ph\.?d|doctorate|doctor of)",
]


# ─────────────────────────────────────────────────────────────────────────────
# LiteParse-powered text extraction
# ─────────────────────────────────────────────────────────────────────────────
def _extract_text_with_liteparse(file_bytes: bytes, filename: str) -> str:
    """Extract text from PDF/DOCX using LiteParse (LlamaIndex).

    LiteParse uses a native Rust engine for PDFs and LibreOffice for office
    docs. It returns a ``ParseResult`` with ``.text`` for the full document
    and ``.pages`` list for per-page access.
    """
    ext = Path(filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".pptx", ".xlsx"):
        raise ValueError(f"LiteParse does not support {ext} files")

    # Write bytes to a temp file because liteparse needs a filesystem path
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        parser = LiteParse()
        result = parser.parse(tmp_path)
        # result.text contains the full concatenated document text
        text = result.text or ""
        if not text and result.pages:
            # Fallback: join per-page text
            page_texts = [pg.text for pg in result.pages if pg and pg.text]
            text = "\n".join(page_texts)
        return text.strip()
    except Exception as exc:
        logger.warning(f"[resume_parser] LiteParse extraction failed for {filename}: {exc}")
        raise
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Legacy fallback extractors (PyPDF2 / python-docx)
# ─────────────────────────────────────────────────────────────────────────────
def _extract_text_from_pdf_fallback(file_bytes: bytes) -> str:
    """Extract text content from PDF binary data using PyPDF2 (fallback)."""
    if PyPDF2 is None:
        return file_bytes.decode("utf-8", errors="ignore")
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        parts = [p.extract_text() for p in reader.pages if p.extract_text()]
        return "\n".join(parts)
    except Exception:
        return file_bytes.decode("utf-8", errors="ignore")


def _extract_text_from_docx_fallback(file_bytes: bytes) -> str:
    """Extract text content from DOCX binary data using python-docx (fallback)."""
    if Document is None:
        return file_bytes.decode("utf-8", errors="ignore")
    try:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception:
        return file_bytes.decode("utf-8", errors="ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Public API: extract_resume_text
# ─────────────────────────────────────────────────────────────────────────────
def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    """Extract text from a resume file.

    Strategy:
      1. Try LiteParse first (fast, local-first, high fidelity PDF/DOCX)
      2. Fall back to PyPDF2 / python-docx if LiteParse fails or is unavailable
      3. Last resort: decode raw bytes as UTF-8
    """
    ext = Path(filename).suffix.lower()

    # ── Attempt 1: LiteParse ──
    if _liteparse_available and ext in (".pdf", ".docx", ".pptx", ".xlsx"):
        try:
            text = _extract_text_with_liteparse(file_bytes, filename)
            if text:
                logger.info(f"[resume_parser] LiteParse extracted {len(text)} chars from {filename}")
                return text
        except Exception:
            logger.info(f"[resume_parser] LiteParse failed for {filename}, falling back to legacy parser")

    # ── Attempt 2: Legacy fallback ──
    if ext == ".pdf":
        return _extract_text_from_pdf_fallback(file_bytes)
    elif ext == ".docx":
        return _extract_text_from_docx_fallback(file_bytes)

    # ── Attempt 3: Raw text decode ──
    return file_bytes.decode("utf-8", errors="ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Skills, Experience & Education Extraction
# ─────────────────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# Dual Analysis: Resume ↔ Job Description Gap Engine
# ─────────────────────────────────────────────────────────────────────────────
def analyze_resume_and_jd(
    resume_text: str,
    jd_text: str = "",
    job_role: str = "",
) -> dict[str, Any]:
    """Dual match and gap analysis between candidate resume and target job description."""
    resume_skills = set(_extract_skills(resume_text))
    years_exp = _count_years_experience(resume_text)
    education = _detect_education_level(resume_text)

    role_key = (job_role or "backend engineer").strip().lower()
    expected_skills = set(ROLE_CORE_SKILLS.get(role_key, ROLE_CORE_SKILLS["backend engineer"]))

    if jd_text.strip():
        jd_skills = set(_extract_skills(jd_text))
        if jd_skills:
            target_skills = jd_skills
        else:
            target_skills = expected_skills
    else:
        target_skills = expected_skills

    matched_skills = sorted(list(resume_skills.intersection(target_skills)))
    missing_skills = sorted(list(target_skills.difference(resume_skills)))

    total_target = max(len(target_skills), 1)
    match_score = int(min(100, max(20, (len(matched_skills) / total_target) * 100)))

    # Generate targeted probe questions for detected gaps
    probe_questions: list[str] = []
    for skill in missing_skills[:4]:
        cap_skill = skill.title()
        if skill in ("redis", "kafka", "rabbitmq"):
            probe_questions.append(
                f"The job requires hands-on experience with {cap_skill}. How would you design message ordering and fault-tolerance using {cap_skill}?"
            )
        elif skill in ("kubernetes", "docker", "terraform"):
            probe_questions.append(
                f"How have you handled zero-downtime deployments and container orchestration with {cap_skill}?"
            )
        elif skill in ("distributed systems", "system design", "microservices"):
            probe_questions.append(
                f"Walk me through how you ensure data consistency and handle network partitions in {cap_skill}."
            )
        elif skill in ("llm", "rag", "pytorch"):
            probe_questions.append(
                f"Describe your strategy for reducing latency and hallucinations when building production {cap_skill} pipelines."
            )
        else:
            probe_questions.append(
                f"The job description highlights {cap_skill}. Can you walk me through your experience or understanding of {cap_skill} in production?"
            )

    difficulty_data = assess_difficulty(resume_text)

    return {
        "match_score": match_score,
        "matched_skills": matched_skills,
        "skill_gaps": missing_skills,
        "weak_areas": missing_skills[:5],
        "interview_focus": f"{job_role or 'Technical'} & {matched_skills[0].title() if matched_skills else 'Fundamentals'}",
        "targeted_probe_questions": probe_questions,
        "difficulty": difficulty_data["difficulty"],
        "years_experience": years_exp,
        "education_level": education,
        "skills_found": sorted(list(resume_skills)),
    }
