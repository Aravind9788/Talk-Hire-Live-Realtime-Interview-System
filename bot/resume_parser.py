from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any

from loguru import logger

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
    "mlops", "data engineering", "cloud architect",
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
    r"(?:bachelor|master|phd)\s*(?:of|in)",
]


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    if PyPDF2 is None:
        raise RuntimeError("PyPDF2 is required to parse PDF resumes. Install it with: pip install PyPDF2")
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_text_from_docx(file_bytes: bytes) -> str:
    if Document is None:
        raise RuntimeError("python-docx is required to parse DOCX resumes. Install it with: pip install python-docx")
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs)


def _extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(file_bytes)
    elif ext in (".docx",):
        return _extract_text_from_docx(file_bytes)
    elif ext in (".txt", ".text"):
        return _extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Supported: .pdf, .docx, .txt")


def _count_years_experience(text: str) -> int:
    text_lower = text.lower()
    max_years = 0
    for pattern in EXPERIENCE_PATTERNS:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            try:
                years = int(match)
                max_years = max(max_years, years)
            except ValueError:
                continue
    return max_years


def _extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found_skills = set()
    for skill in SKILL_KEYWORDS:
        if skill in text_lower:
            found_skills.add(skill)
    return sorted(found_skills)


def _detect_education_level(text: str) -> str:
    text_lower = text.lower()
    if any(re.search(p, text_lower) for p in EDUCATION_PATTERNS):
        if any(re.search(r"(?:ph\.?d|doctorate|doctor of)", text_lower) for _ in [1]):
            return "phd"
        if any(re.search(r"(?:master|m\.?s\.?|m\.?tech|m\.?e\.?|m\.?sc|m\.?ba|m\.?eng)", text_lower) for _ in [1]):
            return "masters"
        return "bachelors"
    return "unknown"


def assess_difficulty(resume_text: str) -> dict[str, Any]:
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

    result = {
        "difficulty": difficulty,
        "years_experience": years_exp,
        "skills_found": skills,
        "skill_count": skill_count,
        "education_level": education,
    }

    logger.info(f"Resume assessment: difficulty={difficulty}, years={years_exp}, skills={skill_count}, education={education}")
    return result
