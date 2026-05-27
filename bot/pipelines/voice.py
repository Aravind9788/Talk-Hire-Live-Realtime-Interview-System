"""OpenAI GPT Realtime ↔ LiveKit audio."""

from __future__ import annotations
from typing import Any
_room_summaries: dict[str, Any] = {}

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field

import aiohttp
from loguru import logger
from livekit import rtc
from livekit.agents import Agent, AgentSession, function_tool, RunContext
from livekit.plugins import openai as lk_openai
import openai as openai_sdk
from openai.types.beta.realtime.session import TurnDetection

from bot.sessions import FileSessionService
from bot.agent import (
    create_session_state,
    destroy_session_state,
    export_session_state,
    get_session_delta,
    import_session_state,
    mark_session_baseline,
    record_answer_note as do_record_answer_note,
    submit_rubric_grade as do_submit_rubric_grade,
    evaluate_candidate_answer as do_evaluate_candidate_answer,
    end_conversation as do_end_conversation,
    get_rubric_report as do_get_rubric_report,
    get_round_scorecard as do_get_round_scorecard,
    get_session_summary as do_get_session_summary,
    _get_state as _agent_get_state,
)

# ---------------------------------------------------------------------------
# Constants & Regex
# ---------------------------------------------------------------------------

_EXIT_PHRASE_RE = re.compile(
    r"\b(?:bye|goodbye|good bye|see you|talk later|done for today|enough for today|"
    r"have to go|need to leave|come back later|continue next time|"
    r"wrap up|end the (?:session|interview)|i'm leaving|gotta go)\b",
    re.IGNORECASE,
)

def _is_anon_user(user_id: str) -> bool:
    if not user_id:
        return True
    lower = user_id.lower()
    return lower in ("anonymous", "guest", "test") or lower.startswith("anon_")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class AuraRoomConfig:
    livekit_url: str
    room_name: str
    token: str
    system_instruction: str
    user_id: str = "anonymous"
    session_id: str = field(default_factory=lambda: os.urandom(8).hex())
    realtime_model: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_REALTIME_DEPLOYMENT", "gpt-4o-realtime-preview")
    )
    voice_id: str = field(
        default_factory=lambda: os.getenv("OPENAI_VOICE", "alloy")
    )
    idle_timeout_secs: float = field(
        default_factory=lambda: float(os.getenv("USER_IDLE_TIMEOUT_SECS", "300"))
    )
    max_duration_secs: float = field(
        default_factory=lambda: float(os.getenv("MAX_CALL_DURATION_SECS", "1200"))
    )

def build_room_config(*, livekit_url: str, room_name: str, token: str, system_instruction: str, user_id: str = "anonymous") -> AuraRoomConfig:
    return AuraRoomConfig(
        livekit_url=livekit_url,
        room_name=room_name,
        token=token,
        system_instruction=system_instruction,
        user_id=user_id,
    )

def _build_azure_chat_client() -> openai_sdk.AsyncAzureOpenAI:
    return openai_sdk.AsyncAzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", ""),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01-preview"),
    )

def _get_session_service() -> FileSessionService | None:
    persist_dir = os.environ.get("SESSION_PERSIST_DIR", "").strip()
    if persist_dir:
        return FileSessionService(persist_dir)
    return None

def _resolve_app_name(agent_name: str = "aura") -> str:
    return os.getenv("APP_NAME", agent_name).strip() or agent_name

# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class _Events:
    def __init__(self, room: rtc.Room):
        self._room = room

    async def send(self, event: dict) -> None:
        try:
            await self._room.local_participant.publish_data(
                json.dumps(event).encode(), reliable=True, topic="aura-events"
            )
        except Exception as exc:
            logger.warning(f"[events] send failed ({event.get('type', '?')}): {exc}")

class _NullEvents:
    async def send(self, event: dict) -> None:
        pass

# ---------------------------------------------------------------------------
# Main Session
# ---------------------------------------------------------------------------

class AuraVoiceSession:
    def __init__(self, config: AuraRoomConfig):
        self._config = config
        self._room = rtc.Room()
        self._events: _Events | _NullEvents = _NullEvents()
        self._ended_reason = "customer_ended_call"
        self._client_disconnected = asyncio.Event()
        self._last_user_utterance = ""
        self._last_bot_utterance = ""
        self._end_session_event = asyncio.Event()
        self._session_graded_keys: set[str] = set()

    async def _auto_grade_session(self, transcript: list[dict], state) -> None:
        if not transcript or not state.asked:
            return

        lines_tx = [f"{t['role'].upper()}: {t['content']}" for t in transcript]
        tx_text = "\n".join(lines_tx)
        if len(tx_text) > 14_000:
            tx_text = tx_text[-14_000:]

        already_graded = list(state.grades.keys())
        already_clause = f"\nAlready graded (DO NOT re-grade these): {', '.join(already_graded)}\n" if already_graded else ""

        prompt = (
            "You are an expert Google SDE interviewer grading a mock interview.\n"
            "Below is the transcript. Evaluate the candidate on ALL observable rubric "
            "categories and produce a JSON object.\n\n"
            f"Transcript:\n{tx_text}\n"
            f"{already_clause}\n"
            "Rubric categories (only grade those with clear evidence in the transcript):\n"
            "- problem_solving, code_fluency, autonomy, cs_fundamentals, system_design, "
            "resoluteness, communication, curiosity, awareness, collaboration, "
            "do_hard_things, level_up, time_is_precious\n\n"
            "Grade scale: strong_no, no, mixed, yes, strong_yes\n\n"
            "Also produce answer_notes for each question the candidate attempted.\n\n"
            "Return ONLY valid JSON (no markdown fences) with this exact structure:\n"
            '{\n'
            '  "grades": {\n'
            '    "category_name": {"grade": "yes", "notes": "Observable facts..."}\n'
            '  },\n'
            '  "answer_notes": [\n'
            '    {"question": "...", "strength": "...", "weakness": "..."}\n'
            '  ]\n'
            '}\n'
        )

        try:
            client = _build_azure_chat_client()
            resp = await client.chat.completions.create(
                model=os.getenv("AZURE_OPENAI_TEXT_DEPLOYMENT", "gpt-4o-mini"),
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                timeout=20.0,
            )
            raw = (resp.choices[0].message.content or "").strip()
            data = json.loads(raw)

            new_grades = data.get("grades", {})
            valid_grades = {"strong_no", "no", "mixed", "yes", "strong_yes"}
            for cat, info in new_grades.items():
                cat_key = cat.lower().strip().replace(" ", "_")
                if cat_key in state.grades:
                    continue
                grade_val = info.get("grade", "").lower().strip()
                notes_val = info.get("notes", "")
                if grade_val in valid_grades and notes_val:
                    state.grades[cat_key] = {"grade": grade_val, "notes": notes_val}
                    self._session_graded_keys.add(cat_key)

            new_notes = data.get("answer_notes", [])
            if new_notes and len(state.notes) < len(state.asked):
                for note in new_notes:
                    q = note.get("question", "")
                    s = note.get("strength", "")
                    w = note.get("weakness", "")
                    if q and (s or w):
                        existing_qs = {n.get("question", "")[:50] for n in state.notes}
                        if q[:50] not in existing_qs:
                            state.notes.append({"question": q, "strength": s, "weakness": w})

        except Exception as exc:
            logger.warning(f"[auto-grade] Failed: {exc}")

    async def _generate_call_summary(self, transcript: list[dict], state, prior_grades: dict | None = None) -> str | None:
        if not transcript:
            return None
        try:
            lines_tx = [f"{t['role'].upper()}: {t['content']}" for t in transcript]
            tx_text = "\n".join(lines_tx)
            if len(tx_text) > 12_000:
                tx_text = tx_text[-12_000:]

            rubric_text = ""
            if state.grades:
                rubric_lines = [f"  {cat}: {d['grade'].upper()} — {d['notes']}" for cat, d in state.grades.items()]
                rubric_text = "\nThis session's rubric grades:\n" + "\n".join(rubric_lines)

            prior_text = ""
            if prior_grades:
                prior_lines = [f"  {cat}: {d['grade'].upper()} — {d['notes']}" for cat, d in prior_grades.items()]
                prior_text = "\nPrior session grades (for context on progress):\n" + "\n".join(prior_lines)

            has_prior = bool(prior_grades)
            continuation_note = " This candidate has prior interview history — comment on improvement or regression compared to prior sessions." if has_prior else ""

            prompt = (
                "You are an expert technical interviewer. Below is the transcript of a "
                "mock interview conducted by AI interviewer Aura.\n\n"
                f"Transcript:\n{tx_text}\n"
                f"{rubric_text}\n"
                f"{prior_text}\n\n"
                "Write a concise (150–250 word) narrative summary of this interview session. "
                "Cover: overall performance, strongest moments, areas for improvement, "
                f"and one concrete recommendation. Address the candidate directly (use 'you').{continuation_note}"
            )

            client = _build_azure_chat_client()
            resp = await client.chat.completions.create(
                model=os.getenv("AZURE_OPENAI_TEXT_DEPLOYMENT", "gpt-4o-mini"),
                messages=[{"role": "user", "content": prompt}],
                timeout=15.0,
            )
            return (resp.choices[0].message.content or "").strip() or None
        except Exception as exc:
            logger.warning(f"[summary] Failed to generate summary: {exc}")
            return None

    async def run(self) -> None:
        cfg = self._config
        logger.info(f"[TalkHire] Connecting to room {cfg.room_name} (user={cfg.user_id})")

        app_name = _resolve_app_name()
        session_service = _get_session_service()

        create_session_state(cfg.session_id)

        if session_service and not _is_anon_user(cfg.user_id):
            prior_state = await session_service.load_user_state(app_name, cfg.user_id)
            if prior_state:
                import_session_state(cfg.session_id, prior_state)

        await self._room.connect(cfg.livekit_url, cfg.token)

        _prior_grades = dict(_agent_get_state(cfg.session_id).grades)
        mark_session_baseline(cfg.session_id)
        self._events = _Events(self._room)
        await self._events.send({"type": "bot-ready"})

        @self._room.on("participant_disconnected")
        def _on_participant_left(participant):
            self._client_disconnected.set()

        # --- 1. Setup Function Tools ---
        @function_tool(description="Save a structured note about the quality of a candidate's answer.")
        async def record_answer_note(context: RunContext, question: str, strength: str, weakness: str):
            return do_record_answer_note(cfg.session_id, question, strength, weakness)

        @function_tool(description="Record a rubric grade for a specific evaluation category based on observable facts.")
        async def submit_rubric_grade(context: RunContext, category: str, grade: str, notes: str):
            res = do_submit_rubric_grade(cfg.session_id, category, grade, notes)
            if isinstance(res, dict) and res.get("status") == "graded":
                self._session_graded_keys.add(category)
                asyncio.create_task(self._events.send({"type": "rubric-update", "data": {"category": category, "grade": grade, "notes": notes}}))
            return res

        @function_tool(description="Evaluate candidate answer and submit multiple rubric grades in one call.")
        async def evaluate_candidate_answer(context: RunContext, question: str, strength: str, weakness: str, category_grades: list = None):
            res = do_evaluate_candidate_answer(cfg.session_id, question, strength, weakness, category_grades)
            if isinstance(res, dict) and res.get("status") == "success":
                for item in res.get("grades_submitted", []):
                    cat = item.get("category", "")
                    if cat:
                        self._session_graded_keys.add(cat)
                        asyncio.create_task(self._events.send({"type": "rubric-update", "data": {"category": cat, "grade": item.get("grade", ""), "notes": ""}}))
            return res

        @function_tool(description="Gracefully end the conversation and hang up.")
        async def end_conversation(context: RunContext):
            res = do_end_conversation(cfg.session_id)
            if res.get("__end_session__"):
                self._end_session_event.set()
            return res

        @function_tool(description="Get rubric report for current or overall session.")
        async def get_rubric_report(context: RunContext, scope: str = "current"):
            return do_get_rubric_report(cfg.session_id, scope)

        @function_tool(description="Get round scorecard (1-4 score) for the interview.")
        async def get_round_scorecard(context: RunContext, round_number: int = 0, category: str = "", scope: str = "current"):
            return do_get_round_scorecard(cfg.session_id, round_number, category, scope)

        @function_tool(description="Get session summary of questions asked.")
        async def get_session_summary(context: RunContext, scope: str = "overall"):
            return do_get_session_summary(cfg.session_id, scope)

        # --- 2. Create Azure OpenAI Realtime model ---
        model = lk_openai.realtime.RealtimeModel.with_azure(
            azure_deployment=cfg.realtime_model,
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", "").strip(),
            api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
            voice=cfg.voice_id,
            instructions=cfg.system_instruction,
            turn_detection=TurnDetection(
                type="server_vad",
                threshold=0.5,
                prefix_padding_ms=200,
                silence_duration_ms=600,
            ),
            modalities=["audio", "text"],
        )

        # --- 3. Create Agent ---
        agent = Agent(
            tools=[
                record_answer_note,
                submit_rubric_grade,
                evaluate_candidate_answer,
                end_conversation,
                get_rubric_report,
                get_round_scorecard,
                get_session_summary,
            ],
            instructions=cfg.system_instruction,
        )

        # --- 4. Create AgentSession and Start ---
        session = AgentSession(llm=model)
        await session.start(agent=agent, room=self._room)

        # --- 5. Event handlers ---
        transcript = []
        def _extract_text(msg) -> str:
            content = getattr(msg, "content", msg)
            if isinstance(content, str):
                return content
            
            if isinstance(content, list):
                parts = []
                for p in content:
                    if isinstance(p, str):
                        parts.append(p)
                    else:
                        # 1. Check for standard 'text' attribute
                        text_val = getattr(p, "text", "")
                        # 2. Check for Realtime Audio 'transcript' attribute
                        transcript_val = getattr(p, "transcript", "")
                        
                        # Handle dictionary formats
                        if isinstance(p, dict):
                            text_val = p.get("text", text_val)
                            transcript_val = p.get("transcript", transcript_val)
                        
                        # Append whatever is not empty
                        if text_val:
                            parts.append(text_val)
                        elif transcript_val:
                            parts.append(transcript_val)
                return " ".join(parts)
            return str(content)

        @session.on("user_input_transcribed")
        def on_user_input_transcribed(ev):
            text = getattr(ev, "transcript", "").strip()
            if text:
                is_final = getattr(ev, "is_final", True)
                if is_final:
                    self._last_user_utterance = text
                    transcript.append({"role": "user", "content": text})
                    if _EXIT_PHRASE_RE.search(text.lower()):
                        self._end_session_event.set()
                asyncio.create_task(self._events.send({"type": "user-transcription", "data": {"text": text, "final": is_final}}))

        # We keep this for context, but rely on agent_state_changed to send the full response to the UI
        @session.on("conversation_item_added")
        def on_conversation_item_added(ev):
            item = getattr(ev, "item", None)
            
            if item and getattr(item, "role", "") in ("assistant", "model"):
                text = _extract_text(item).strip()
                logger.info(f"🤖 EXTRACTED TEXT: '{text}'") # Text edukkutha nu check panna
                
                if text:
                    self._last_bot_utterance = text
                    transcript.append({"role": "model", "content": text})
                    asyncio.create_task(self._events.send({"type": "bot-transcription", "data": {"text": text, "final": False}}))

        @session.on("agent_state_changed")
        def on_agent_state_changed(ev):
            new_state = getattr(ev, "new_state", "")
            old_state = getattr(ev, "old_state", "")
            
            logger.info(f"🔄 AGENT STATE CHANGED: {old_state} -> {new_state}")
            
            if new_state == "speaking":
                asyncio.create_task(self._events.send({"type": "bot-started-speaking"}))
            elif old_state == "speaking" and new_state != "speaking":
                try:
                    if hasattr(session, 'chat_ctx') and session.chat_ctx.messages:
                        last_msg = session.chat_ctx.messages[-1]
                        if last_msg.role in ("assistant", "model"):
                            final_text = _extract_text(last_msg).strip()
                            logger.info(f"✅ FINAL BOT TEXT READY: '{final_text}'")
                            
                            if final_text and final_text != self._last_bot_utterance:
                                self._last_bot_utterance = final_text
                                transcript.append({"role": "model", "content": final_text})
                            
                            asyncio.create_task(self._events.send({"type": "bot-transcription", "data": {"text": self._last_bot_utterance, "final": True}}))
                except Exception as e:
                    logger.warning(f"❌ Error extracting final bot text: {e}")
                
                asyncio.create_task(self._events.send({"type": "bot-stopped-speaking"}))

        @session.on("user_state_changed")
        def on_user_state_changed(ev):
            new_state = getattr(ev, "new_state", "")
            old_state = getattr(ev, "old_state", "")
            if new_state == "speaking":
                asyncio.create_task(self._events.send({"type": "user-started-speaking"}))
            elif old_state == "speaking" and new_state != "speaking":
                asyncio.create_task(self._events.send({"type": "user-stopped-speaking"}))

        asyncio.create_task(session.generate_reply(instructions="Greet the candidate by name and welcome them to the interview."))

        # --- 6. Wait for Session End ---
        start_time = time.monotonic()
        while True:
            await asyncio.sleep(1.0)
            elapsed = time.monotonic() - start_time
            if self._client_disconnected.is_set():
                self._ended_reason = "customer_ended_call"
                break
            if self._end_session_event.is_set():
                self._ended_reason = "agent_ended_call"
                break
            if elapsed > cfg.max_duration_secs:
                self._ended_reason = "max_duration_exceeded"
                break

        logger.info(f"[{cfg.room_name}] Session ending. Reason: {self._ended_reason}")

        # --- 7. Cleanup & Auto-grade ---
        try:
            await self._room.disconnect()
        except Exception as exc:
            logger.warning(f"Error disconnecting room {cfg.room_name}: {exc}")

        state = _agent_get_state(cfg.session_id)
        await self._auto_grade_session(transcript, state)
        
        delta = get_session_delta(cfg.session_id)
        if delta.get("questions") or delta.get("grades"):
            summary_text = await self._generate_call_summary(transcript, state, _prior_grades)
            if summary_text:
                global _room_summaries
                _room_summaries[cfg.room_name] = {
                    "summary": summary_text,
                    "feedback": summary_text,
                    "questions_asked": list(state.asked) if hasattr(state, 'asked') else [],
                    "grades": dict(state.grades) if hasattr(state, 'grades') else {}
                }

            if session_service and not _is_anon_user(cfg.user_id):
                final_snapshot = export_session_state(cfg.session_id)
                await session_service.save_user_state(app_name, cfg.user_id, final_snapshot)

        destroy_session_state(cfg.session_id)

async def run_room_bot(config: AuraRoomConfig) -> None:
    session = AuraVoiceSession(config)
    await session.run()
async def run_room_bot(config: AuraRoomConfig) -> None:
    session = AuraVoiceSession(config)
    await session.run()