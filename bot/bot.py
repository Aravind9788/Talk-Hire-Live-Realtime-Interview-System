"""FastAPI web server and LiveKit room bot runner for TalkHire."""

from __future__ import annotations

import asyncio
import json
import os
import io
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import PyPDF2
import docx
import openai
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from livekit import api
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.bot")
from pydantic import BaseModel, Field

from bot.pipelines.voice import (
    TalkHireRoomConfig,
    build_talkhire_room_config,
    run_room_bot,
    get_session_service,
    _is_anon_user,
)
from bot.agent import select_session_questions
from bot.core.prompts import PromptManager
from bot.core.session import FileSessionService

load_dotenv()

_FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
_room_tasks: dict[str, asyncio.Task[None]] = {}


def require_env(name: str) -> str:
    """Retrieve required environment variable value or raise error if missing."""
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required in environment settings")
    return value


def get_livekit_url() -> str:
    """Return configured LiveKit WebRTC server URL."""
    return require_env("LIVEKIT_URL")


def get_room_prefix() -> str:
    """Return prefix string for generated LiveKit room names."""
    return os.getenv("LIVEKIT_ROOM_PREFIX", "talkhire-session").strip() or "talkhire-session"


def normalize_interview_track_preset(track_preset: str = "") -> str:
    """Normalize interview track preset string to canonical track name."""
    value = (track_preset or "compressed").strip().lower().replace("-", "_").replace(" ", "_")
    if value in {"advanced", "google_style", "google", "onsite"}:
        return "advanced"
    if value == "adaptive_6_round":
        return "adaptive_6_round"
    return "compressed"


def read_prompt_template_file(path: Path) -> str:
    """Read prompt template text content from specified filepath."""
    if not path.exists():
        raise FileNotFoundError(f"Required prompt file missing: {path}")
    return path.read_text(encoding="utf-8").strip()


def normalize_candidate_name(display_name: str, user_id: str) -> str:
    """Clean and format candidate display name for voice greeting."""
    name = (display_name or "").strip()
    if not name or name.lower() in {"guest", "candidate"}:
        name = user_id
    if name.lower().startswith("candidate "):
        name = name[10:].strip() or user_id
    return name.replace("_", " ").replace("-", " ").strip()


def build_talkhire_system_instruction(
    user_id: str = "anonymous",
    display_name: str = "Guest",
    round_hint: str = "",
    difficulty_hint: str = "medium",
    topic_hint: str = "",
    track_preset: str = "compressed",
    job_role: str = "",
    resume_context: str = "",
) -> str:
    """Assemble lean micro-prompt system instruction for candidate voice session."""
    prompts_dir = Path(__file__).parent / "prompts"
    prompt_mgr = PromptManager(prompts_dir)
    is_anon = _is_anon_user(user_id)
    candidate_name = normalize_candidate_name(display_name, user_id)

    norm_round = round_hint.strip().lower().replace(" ", "_").replace("-", "_")
    q_count = 5 if norm_round else 4
    questions = select_session_questions(round_hint, difficulty_hint, count=q_count, topic=topic_hint)

    return prompt_mgr.build_focused_round_prompt(
        round_name=norm_round or "behavioural",
        candidate_name=candidate_name,
        is_anon=is_anon,
        resume_summary=resume_context,
        difficulty=difficulty_hint,
        selected_questions=questions,
    )


def mint_livekit_token(
    *,
    room_name: str,
    identity: str,
    name: str,
    metadata: dict[str, Any],
    hidden: bool = False,
) -> str:
    """Mint and sign JWT access token for LiveKit room participant."""
    token = (
        api.AccessToken(require_env("LIVEKIT_API_KEY"), require_env("LIVEKIT_API_SECRET"))
        .with_identity(identity)
        .with_name(name)
        .with_metadata(json.dumps(metadata))
        .with_ttl(timedelta(minutes=int(os.getenv("LIVEKIT_TOKEN_TTL_MINUTES", "60"))))
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


def generate_room_name() -> str:
    """Generate unique room name with talkhire prefix."""
    return f"{get_room_prefix()}-{uuid4().hex[:10]}"


def launch_room_bot(
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
    """Launch async background task running TalkHireVoiceSession for room."""
    existing = _room_tasks.get(room_name)
    if existing and not existing.done():
        return

    bot_identity = f"bot-{room_name}"
    bot_token = mint_livekit_token(
        room_name=room_name,
        identity=bot_identity,
        name="TalkHire",
        metadata={"role": "bot", "room": room_name},
        hidden=False,
    )

    config = build_talkhire_room_config(
        livekit_url=get_livekit_url(),
        room_name=room_name,
        token=bot_token,
        system_instruction=build_talkhire_system_instruction(
            user_id, display_name, round_hint, difficulty_hint, topic_hint, track_preset, job_role, resume_context
        ),
        user_id=user_id,
    )

    task = asyncio.create_task(run_room_bot(config), name=f"room-bot:{room_name}")
    _room_tasks[room_name] = task

    def _cleanup(done_task: asyncio.Task[None]) -> None:
        _room_tasks.pop(room_name, None)

    task.add_done_callback(_cleanup)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI application lifespan managing startup and clean shutdown of room tasks."""
    logger.info("[bot] TalkHire backend server starting")
    yield

    tasks = list(_room_tasks.values())
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    _room_tasks.clear()
    logger.info("[bot] TalkHire backend server shutdown complete")


app = FastAPI(title="TalkHire Interview Agent Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionBootstrapRequest(BaseModel):
    """Request schema for bootstrapping a LiveKit interview voice session."""

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
    """Response payload containing LiveKit access token and room parameters."""

    livekit_url: str
    room_name: str
    participant_identity: str
    participant_name: str
    access_token: str


@app.post("/api/resume/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_role: str = Form(...),
):
    """Parse resume file and analyze skill gaps against target job role."""
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
        logger.error(f"[bot] Error parsing resume file: {e}")
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
                {"role": "system", "content": "Analyze resume against job role. Return JSON: {skill_gaps: [], weak_areas: [], interview_focus: ''}"},
                {"role": "user", "content": f"Target Role: {job_role}\n\nResume:\n{text[:10000]}"}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"[bot] Resume analysis failed: {e}")
        return {"skill_gaps": ["Analysis unavailable"], "weak_areas": [], "interview_focus": "Fundamentals"}


@app.post("/livekit/session", response_model=SessionBootstrapResponse)
@app.post("/api/livekit/session", response_model=SessionBootstrapResponse)
async def create_livekit_session(req: SessionBootstrapRequest):
    """Bootstrap a new LiveKit interview room session and mint participant token."""
    room_name = req.room_name or generate_room_name()
    participant_identity = f"web-{uuid4().hex[:8]}"
    participant_name = (req.display_name or "Guest").strip() or "Guest"
    user_id = (req.user_id or "anonymous").strip() or "anonymous"
    is_anon = _is_anon_user(user_id)
    track_preset = normalize_interview_track_preset(req.track_preset or "compressed")
    round_hint = (req.round_hint or "").strip()
    difficulty_hint = (req.difficulty_hint or "").strip()
    topic_hint = (req.topic_hint or "").strip()

    if not is_anon:
        if not round_hint:
            round_hint = "behavioural"
        if not difficulty_hint:
            difficulty_hint = "medium"

    if not difficulty_hint:
        difficulty_hint = "medium"

    access_token = mint_livekit_token(
        room_name=room_name,
        identity=participant_identity,
        name=participant_name,
        metadata={"role": "user", "room": room_name, "user_id": user_id},
    )

    launch_room_bot(
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
        livekit_url=get_livekit_url(),
        room_name=room_name,
        participant_identity=participant_identity,
        participant_name=participant_name,
        access_token=access_token,
    )


@app.get("/health")
@app.get("/api/health")
async def health() -> dict[str, Any]:
    """Return backend service health status and active room count."""
    active_count = sum(1 for task in _room_tasks.values() if not task.done())
    return {
        "status": "ok",
        "bot": "TalkHire",
        "transport": "livekit",
        "active_rooms": active_count,
    }


@app.get("/api/summary/{room_name}")
@app.get("/summary/{room_name}")
async def get_room_summary(room_name: str) -> dict[str, Any]:
    """Return HTTP summary data fallback for room session."""
    from bot.pipelines.voice import _room_summaries
    data = _room_summaries.get(room_name, None)
    if data is None:
        return {"status": "pending"}
    return {"status": "ready", "data": data}


@app.get("/api/candidate/check")
async def check_candidate(user_id: str = "") -> dict[str, Any]:
    """Check candidate prior session persistence status."""
    uid = user_id.strip().lower()[:64]
    if not uid or uid == "anonymous":
        return {"exists": False, "rounds": 0, "user_id": uid}

    svc = get_session_service()
    if not svc:
        return {"exists": False, "rounds": 0, "user_id": uid}

    state = await svc.load_user_state("talkhire", uid)
    exists = state is not None
    return {"exists": exists, "rounds": 1 if exists else 0, "user_id": uid}


if _FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")


def main() -> None:
    """Launch uvicorn ASGI server hosting TalkHire FastAPI application."""
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "7862")),
        log_level="info",
    )


if __name__ == "__main__":
    main()
