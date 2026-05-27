from __future__ import annotations

import asyncio
import json
import os
import io
import PyPDF2
import docx
import openai
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from livekit import api
from loguru import logger
from pydantic import BaseModel, Field

from bot.pipelines.voice import (
    AuraRoomConfig,
    build_room_config,
    run_room_bot,
    _get_session_service,
    _is_anon_user,
)
from bot.agent import select_session_questions

load_dotenv()

_FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
_room_tasks: dict[str, asyncio.Task[None]] = {}

_TRACK_PRESETS: dict[str, list[tuple[str, str]]] = {
    "compressed": [
        ("behavioural", "Behavioural"),
        ("coding", "Coding"),
        ("system_design", "System Design"),
        ("targeted_debrief", "Targeted Debrief"),
    ],
    "advanced": [
        ("googliness", "Googliness (Behavioural)"),
        ("coding_1", "Coding 1 (Algorithms & Data Structures)"),
        ("coding_2", "Coding 2 (Algorithms & Data Structures)"),
        ("system_design", "System Design"),
        ("debugging", "Debugging / Code Review (Practical Engineering)"),
        ("targeted_debrief", "Targeted Debrief"),
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _livekit_url() -> str:
    return _require_env("LIVEKIT_URL")


def _room_prefix() -> str:
    return os.getenv("LIVEKIT_ROOM_PREFIX", "aura-s4").strip() or "aura-s4"


def _normalize_track_preset(track_preset: str = "") -> str:
    value = (track_preset or "compressed").strip().lower().replace("-", "_").replace(" ", "_")
    if value in {"advanced", "google_style", "google", "onsite"}:
        return "advanced"
    if value == "adaptive_6_round":
        return "adaptive_6_round"
    return "compressed"


def _load_prompt_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(
            f"Required prompt file not found: {path}. "
            "Add the missing prompt file or set BOT_SYSTEM_PROMPT env var."
        )
    return path.read_text().strip()


def _normalize_candidate_name(display_name: str, user_id: str) -> str:
    candidate_name = (display_name or "").strip()
    if not candidate_name or candidate_name.lower() in {"guest", "candidate"}:
        candidate_name = user_id
    if candidate_name.lower().startswith("candidate "):
        candidate_name = candidate_name[10:].strip() or user_id
    candidate_name = candidate_name.replace("_", " ").replace("-", " ").strip()
    if not candidate_name:
        candidate_name = user_id or "Candidate"
    return " ".join(part.capitalize() for part in candidate_name.split())


def _startup_greeting(
    *,
    candidate_name: str,
    is_anon: bool,
    round_hint: str = "",
    difficulty_hint: str = "medium",
    topic_hint: str = "",
) -> str:
    intro = (
        "Hello! I'm TalkHire, your technical interview coach."
        if is_anon
        else f"Hello {candidate_name}! I'm TalkHire, your technical interview coach."
    )

    normalized_round = round_hint.strip().lower().replace(" ", "_").replace("-", "_")
    if not normalized_round:
        return (
            f"{intro} Great to have you here. Which round would you like to practice today — "
            "Behavioural, Coding, System Design, or a Targeted Debrief?"
        )

    round_labels = {
        "behavioural": "behavioural",
        "coding": "coding",
        "coding_1": "coding one, focused on algorithms and data structures",
        "coding_2": "coding two, focused on algorithms and data structures",
        "googliness": "googliness, or behavioural",
        "system_design": "system design",
        "debugging": "debugging and code review, focused on practical engineering",
        "targeted_debrief": "targeted debrief",
        "debrief": "targeted debrief",
    }
    round_label = round_labels.get(normalized_round, normalized_round.replace("_", " "))
    difficulty = (difficulty_hint or "medium").strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "medium"
    article = "an" if difficulty[:1] in {"a", "e", "i", "o", "u"} else "a"
    topic = topic_hint.strip().lower()

    if topic:
        return (
            f"{intro} Great to have you here. We'll start with {article} {difficulty} {round_label} round "
            f"focused on {topic}. Let's begin."
        )
    return f"{intro} Great to have you here. We'll start with {article} {difficulty} {round_label} round. Let's begin."


def _system_instruction(
    user_id: str = "anonymous",
    display_name: str = "Guest",
    round_hint: str = "",
    difficulty_hint: str = "medium",
    topic_hint: str = "",
    track_preset: str = "compressed",
    job_role: str = "",
    resume_context: str = "",
) -> str:
    env_override = os.getenv("BOT_SYSTEM_PROMPT", "").strip()
    if env_override:
        return env_override

    prompts_dir = Path(__file__).parent / "prompts"
    is_anon = _is_anon_user(user_id)
    normalized_track = _normalize_track_preset(track_preset)

    greeting_path = prompts_dir / (
        "prompt_greeting_anon.md" if is_anon else "prompt_greeting_named.md"
    )
    base_path = prompts_dir / (
        "system_prompt_anon.md" if is_anon else "system_prompt_named_fast.md"
    )

    candidate_name = _normalize_candidate_name(display_name, user_id)
    greeting = _load_prompt_text(greeting_path).format(
        candidate_name=candidate_name,
        startup_message=_startup_greeting(
            candidate_name=candidate_name,
            is_anon=is_anon,
            round_hint=round_hint,
            difficulty_hint=difficulty_hint,
            topic_hint=topic_hint,
        ),
    )
    base_prompt = _load_prompt_text(base_path)

    prompt_parts = [greeting, base_prompt]

    if normalized_track == "advanced":
        prompt_parts.append(
            "## Interview Track\n\n"
            "Use the advanced 6-round Google-style loop for this candidate: Googliness (Behavioural), Coding 1 (Algorithms & Data Structures), Coding 2 (Algorithms & Data Structures), System Design, Debugging / Code Review (Practical Engineering), then Targeted Debrief."
        )
    elif normalized_track == "adaptive_6_round":
        prompt_parts.append(
            f"## Adaptive 6-Round Interview Track\n\n"
            f"You are conducting a 6-round interview for the **{job_role}** role. You MUST STRICTLY progress through these 6 rounds in order:\n"
            f"1. Resume Screening / Introduction\n"
            f"2. Technical Fundamentals\n"
            f"3. Problem Solving / Coding\n"
            f"4. System Design / Architecture\n"
            f"5. Role-Specific Deep Dive\n"
            f"6. Behavioral / HR Round\n\n"
            f"**CRITICAL INSTRUCTION FOR QUESTIONS**: ALL technical questions (Rounds 2-5) MUST be generated strictly based on standard requirements for the **{job_role}** position. DO NOT generate technical questions based on the resume.\n\n"
            f"**Resume Context (for Round 1 and Difficulty Tuning)**:\n{resume_context}\n\n"
            f"Use the Resume Context only to guide the Introduction (Round 1), understand the candidate's background, and dynamically adapt the difficulty (focus more heavily on testing the identified weaknesses/skill gaps)."
        )

    if round_hint:
        normalized_round = round_hint.strip().lower().replace(" ", "_").replace("-", "_")
        round_path = prompts_dir / f"prompt_round_{normalized_round}.md"
        if round_path.exists():
            prompt_parts.append(_load_prompt_text(round_path))

    # Pre-select questions and inject a focused bank into the system prompt.
    # For selected rounds, keep five active questions available so TalkHire can
    # immediately handle "pass", "next question", or "different question"
    # without another retrieval step.
    normalized_round = round_hint.strip().lower().replace(" ", "_").replace("-", "_")
    question_count = 5 if normalized_round else 4
    questions = select_session_questions(round_hint, difficulty_hint, count=question_count, topic=topic_hint)
    if questions:
        numbered = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(questions))
        prompt_parts.append(
            "## Question Bank — this session only\n\n"
            "These questions have been pre-selected for this session and difficulty. "
            "Ask at most 3 total per round.\n\n"
            "Rules for using the bank:\n"
            "- Ask questions from this bank in order.\n"
            "- If the candidate says pass, next question, skip, or similar, move to the next unused question from the bank.\n"
            "- If the candidate asks for an easier or harder question AND unused questions remain in the bank that better match that difficulty, pick the closest one.\n"
            "- If the candidate switches ROUND TYPE mid-session (e.g. asks for a coding question when the bank contains behavioural questions, or vice versa), DO NOT pick from the wrong-category bank. Instead, generate an appropriate question yourself from your own knowledge matching the requested round type and difficulty. Never mix round categories.\n"
            "- Do NOT call any tool to fetch questions.\n\n"
            + numbered
        )
    if topic_hint.strip():
        prompt_parts.append(
            f"Topic hint for this session: focus on {topic_hint.strip().lower()} when choosing from the question bank."
        )

    # Ultra-Low Latency Directives
    prompt_parts.append(
        "## Sub-Second Response Rules (CRITICAL)\n"
        "To keep the interview feeling natural, you MUST follow these timing rules:\n"
        "1. NO PREAMBLES: If you are asking a question, make the question the VERY FIRST WORDS out of your mouth. No \"Okay, moving on,\" or \"Here is your question:\". Just ask it.\n"
        "2. SPEAK BEFORE TOOLS: If you need to use `record_answer_note` or `submit_rubric_grade`, you MUST physically speak an acknowledgment to the candidate FIRST (e.g. \"Great point.\") so they hear audio instantly. The tool call must be the LAST thing you do in your turn, not the first.\n"
        "3. PAUSE TOLERANCE: If the user pauses mid-sentence (silence), give them a tiny moment. Acknowledge short pauses gracefully without cutting them off."
    )

    return "\n\n".join(part for part in prompt_parts if part)


def _mint_token(
    *,
    room_name: str,
    identity: str,
    name: str,
    metadata: dict[str, Any],
    hidden: bool = False,
) -> str:
    token = (
        api.AccessToken(_require_env("LIVEKIT_API_KEY"), _require_env("LIVEKIT_API_SECRET"))
        .with_identity(identity)
        .with_name(name)
        .with_metadata(json.dumps(metadata))
        .with_ttl(timedelta(minutes=int(os.getenv("LIVEKIT_TOKEN_TTL_MINUTES", "30"))))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                hidden=hidden,
            )
        )
    )
    return token.to_jwt()


def _generate_room_name() -> str:
    return f"{_room_prefix()}-{uuid4().hex[:10]}"


def _launch_room_bot(
    *,
    room_name: str,
    user_id: str = "anonymous",
    display_name: str = "Guest",
    round_hint: str = "",
    difficulty_hint: str = "medium",
    topic_hint: str = "",
    track_preset: str = "compressed",
    job_role: str = "",
    resume_context: str = "",
) -> None:
    existing = _room_tasks.get(room_name)
    if existing and not existing.done():
        return

    bot_identity = f"bot-{room_name}"
    bot_token = _mint_token(
        room_name=room_name,
        identity=bot_identity,
        name="TalkHire",
        metadata={"role": "bot", "room": room_name},
        hidden=False,
    )

    config = build_room_config(
        livekit_url=_livekit_url(),
        room_name=room_name,
        token=bot_token,
        system_instruction=_system_instruction(user_id, display_name, round_hint, difficulty_hint, topic_hint, track_preset, job_role, resume_context),
        user_id=user_id,
    )

    task = asyncio.create_task(run_room_bot(config), name=f"room-bot:{room_name}")
    _room_tasks[room_name] = task

    def _cleanup(done_task: asyncio.Task[None]) -> None:
        try:
            done_task.result()
        except asyncio.CancelledError:
            logger.info(f"Bot task cancelled for room {room_name}")
        except Exception:
            logger.exception(f"Bot task failed for room {room_name}")
        finally:
            _room_tasks.pop(room_name, None)

    task.add_done_callback(_cleanup)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TalkHire Interview Coach backend starting")
    yield

    tasks = list(_room_tasks.values())
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    _room_tasks.clear()
    logger.info("TalkHire backend shutdown complete")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="TalkHire Interview Coach - Solution 4", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class SessionBootstrapRequest(BaseModel):
    room_name: str | None = None
    display_name: str | None = Field(default=None, max_length=80)
    user_id: str | None = Field(default=None, max_length=64)
    track_preset: str | None = Field(default="compressed", max_length=20)
    round_hint: str | None = Field(default=None, max_length=40)
    difficulty_hint: str | None = Field(default=None, max_length=10)
    topic_hint: str | None = Field(default=None, max_length=40)
    job_role: str | None = Field(default=None, max_length=100)
    resume_context: str | None = Field(default=None)


class SessionBootstrapResponse(BaseModel):
    livekit_url: str
    room_name: str
    participant_identity: str
    participant_name: str
    access_token: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/resume/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_role: str = Form(...)
):
    text = ""
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""
    try:
        if filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() + "\n"
        elif filename.endswith(".docx"):
            doc = docx.Document(io.BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            text = content.decode(errors="ignore")
    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        text = content.decode(errors="ignore")

    if not text.strip():
        return {"skill_gaps": [], "weak_areas": [], "interview_focus": "General"}

    api_key = os.getenv("AZURE_OPENAI_API_KEY", "")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01-preview")
    deployment = os.getenv("AZURE_OPENAI_TEXT_DEPLOYMENT", "gpt-4o-mini")

    if api_key and endpoint:
        client = openai.AsyncAzureOpenAI(api_key=api_key, azure_endpoint=endpoint, api_version=api_version)
        model_name = deployment
    else:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        model_name = "gpt-4o-mini"

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a senior tech recruiter. Analyze the resume against the target job role. Identify 3-5 key skill gaps or weak areas in the resume compared to standard requirements for this role. Output strictly JSON with keys: skill_gaps (list of str), weak_areas (list of str), interview_focus (str)."},
                {"role": "user", "content": f"Target Role: {job_role}\n\nResume:\n{text[:10000]}"}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Failed to analyze resume with LLM: {e}")
        return {"skill_gaps": ["Unable to analyze"], "weak_areas": [], "interview_focus": "General Fundamentals"}


@app.post("/livekit/session", response_model=SessionBootstrapResponse)
@app.post("/api/livekit/session", response_model=SessionBootstrapResponse)
async def create_livekit_session(req: SessionBootstrapRequest):
    room_name = req.room_name or _generate_room_name()
    participant_identity = f"web-{uuid4().hex[:8]}"
    participant_name = (req.display_name or "Guest").strip() or "Guest"
    user_id = (req.user_id or "anonymous").strip() or "anonymous"
    is_anon = _is_anon_user(user_id)
    track_preset = _normalize_track_preset(req.track_preset or "compressed")
    round_hint = (req.round_hint or "").strip()
    difficulty_hint = (req.difficulty_hint or "").strip()
    topic_hint = (req.topic_hint or "").strip()

    if not is_anon:
    # If round_hint is missing, default to 'behavioural'
        if not round_hint:
            round_hint = "behavioural"
            logger.info(f"Missing round_hint for user {user_id}, defaulting to {round_hint}")
        # If difficulty_hint is missing, default to 'medium'
        if not difficulty_hint:
            difficulty_hint = "medium"
            logger.info(f"Missing difficulty_hint for user {user_id}, defaulting to {difficulty_hint}")

    if not difficulty_hint:
        difficulty_hint = "medium"

    access_token = _mint_token(
        room_name=room_name,
        identity=participant_identity,
        name=participant_name,
        metadata={"role": "user", "room": room_name, "user_id": user_id},
    )

    _launch_room_bot(
        room_name=room_name,
        user_id=user_id,
        display_name=participant_name,
        track_preset=track_preset,
        round_hint=round_hint,
        difficulty_hint=difficulty_hint,
        topic_hint=topic_hint,
        job_role=req.job_role or "",
        resume_context=req.resume_context or "",
    )

    return SessionBootstrapResponse(
        livekit_url=_livekit_url(),
        room_name=room_name,
        participant_identity=participant_identity,
        participant_name=participant_name,
        access_token=access_token,
    )


@app.get("/health")
@app.get("/api/health")
async def health() -> dict[str, Any]:
    active_room_count = sum(1 for task in _room_tasks.values() if not task.done())
    return {
        "status": "ok",
        "bot": "TalkHire",
        "transport": "livekit",
        "model": os.getenv("AZURE_VOICELIVE_MODEL", "gpt-realtime"),
        "active_rooms": active_room_count,
    }


@app.get("/api/summary/{room_name}")
@app.get("/summary/{room_name}")
async def get_room_summary(room_name: str) -> dict[str, Any]:
    """HTTP fallback for call-summary when the data channel closed before delivery."""
    from bot.pipelines.voice import _room_summaries
    data = _room_summaries.get(room_name, None)
    if data is None:
        return {"status": "pending"}
    return {"status": "ready", "data": data}

@app.get("/api/candidate/check")
async def check_candidate(user_id: str = "") -> dict[str, Any]:
    uid = user_id.strip().lower()[:64]
    if not uid or uid == "anonymous":
        return {"exists": False, "rounds": 0, "user_id": uid}
    
    svc = _get_session_service()
    if not svc:
        return {"exists": False, "rounds": 0, "user_id": uid}
    
    # Check if a session file exists for this user
    app_name = "talkhire"
    state = await svc.load_user_state(app_name, uid)
    exists = state is not None
    # Optional: count "rounds" from state – you'd need to parse the session history
    rounds = 1 if exists else 0
    return {"exists": exists, "rounds": rounds, "user_id": uid}
# ---------------------------------------------------------------------------
# Static frontend
# ---------------------------------------------------------------------------

if _FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    uvicorn.run(
       app,  
        host="0.0.0.0",
        port=int(os.getenv("PORT", "7862")),
        log_level="info",
    )


if __name__ == "__main__":
    main()
