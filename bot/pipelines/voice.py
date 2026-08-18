"""OpenAI GPT Realtime ↔ LiveKit WebRTC audio pipeline for TalkHire."""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any

from livekit import rtc
from livekit.agents import Agent, AgentSession, function_tool, RunContext
from livekit.plugins import openai as lk_openai
import openai as openai_sdk
from openai.types.beta.realtime.session import TurnDetection
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.voice")

from bot.core.session import FileSessionService, get_state as _agent_get_state
from bot.core.evaluator import auto_grade_transcript
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
)

_room_summaries: dict[str, Any] = {}

_EXIT_PHRASE_RE = re.compile(
    r"\b(?:bye|goodbye|good bye|see you|talk later|done for today|enough for today|"
    r"have to go|need to leave|come back later|continue next time|"
    r"wrap up|end the (?:session|interview)|i'm leaving|gotta go)\b",
    re.IGNORECASE,
)


def _is_anon_user(user_id: str) -> bool:
    """Check whether given user ID corresponds to an anonymous guest user."""
    if not user_id:
        return True
    lower = user_id.lower()
    return lower in ("anonymous", "guest", "test") or lower.startswith("anon_")


@dataclass(slots=True)
class TalkHireRoomConfig:
    """Room configuration parameters for active LiveKit voice session."""

    livekit_url: str
    room_name: str
    token: str
    system_instruction: str
    user_id: str = "anonymous"
    session_id: str = field(default_factory=lambda: os.urandom(8).hex())
    realtime_model: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_REALTIME_DEPLOYMENT")
        or os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-realtime-mini")
    )
    voice_id: str = field(
        default_factory=lambda: os.getenv("OPENAI_VOICE", "shimmer")
    )
    idle_timeout_secs: float = field(
        default_factory=lambda: float(os.getenv("USER_IDLE_TIMEOUT_SECS", "300"))
    )
    max_duration_secs: float = field(
        default_factory=lambda: float(os.getenv("MAX_CALL_DURATION_SECS", "1200"))
    )


def build_talkhire_room_config(
    *,
    livekit_url: str,
    room_name: str,
    token: str,
    system_instruction: str,
    user_id: str = "anonymous",
) -> TalkHireRoomConfig:
    """Construct TalkHireRoomConfig instance for LiveKit agent connection."""
    return TalkHireRoomConfig(
        livekit_url=livekit_url,
        room_name=room_name,
        token=token,
        system_instruction=system_instruction,
        user_id=user_id,
    )


def create_azure_openai_client() -> openai_sdk.AsyncAzureOpenAI:
    """Instantiate AsyncAzureOpenAI client for background evaluation tasks."""
    api_key = (
        os.getenv("AZURE_OPENAI_API_KEY")
        or os.getenv("AZURE_OPENAI_KEY")
        or os.getenv("OPENAI_API_KEY", "")
    )
    return openai_sdk.AsyncAzureOpenAI(
        api_key=api_key,
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", ""),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01-preview"),
    )


def get_session_service() -> FileSessionService | None:
    """Instantiate FileSessionService if persistence directory is configured."""
    persist_dir = os.environ.get("SESSION_PERSIST_DIR", ".talkhire_sessions").strip()
    if persist_dir:
        return FileSessionService(persist_dir)
    return None


class RoomEventsPublisher:
    """Publishes JSON events to LiveKit data channel."""

    def __init__(self, room: rtc.Room):
        """Initialise event publisher for room local participant."""
        self._room = room

    async def send(self, event: dict) -> None:
        """Publish event dictionary over reliable LiveKit data channel."""
        try:
            await self._room.local_participant.publish_data(
                json.dumps(event).encode("utf-8"),
                reliable=True,
                topic="talkhire-events",
            )
        except Exception as exc:
            logger.warning(f"[events] Publish error ({event.get('type', '?')}): {exc}")


class NullEventsPublisher:
    """Fallback no-op event publisher."""

    async def send(self, event: dict) -> None:
        """No-op event send fallback."""
        pass


class TalkHireVoiceSession:
    """Manages LiveKit RTC room session lifecycle, voice agent, and transcript grading."""

    def __init__(self, config: TalkHireRoomConfig):
        """Initialise TalkHireVoiceSession with specified configuration."""
        self._config = config
        self._room = rtc.Room()
        self._events: RoomEventsPublisher | NullEventsPublisher = NullEventsPublisher()
        self._ended_reason = "customer_ended_call"
        self._last_user_utterance = ""
        self._last_bot_utterance = ""
        self._end_session_event = asyncio.Event()
        self._session_graded_keys: set[str] = set()

    async def run(self) -> None:
        """Connect to LiveKit room, launch OpenAI agent session, and manage session lifecycle."""
        cfg = self._config
        logger.info(f"[voice] Connecting to LiveKit room {cfg.room_name}")

        create_session_state(cfg.session_id)
        session_svc = get_session_service()
        app_name = os.getenv("APP_NAME", "talkhire")

        if session_svc and not _is_anon_user(cfg.user_id):
            try:
                prior_snapshot = await session_svc.load_user_state(app_name, cfg.user_id)
                if prior_snapshot:
                    import_session_state(cfg.session_id, prior_snapshot)
                    mark_session_baseline(cfg.session_id)
            except Exception as exc:
                logger.warning(f"[voice] Failed to restore session history: {exc}")

        await self._room.connect(cfg.livekit_url, cfg.token)
        self._events = RoomEventsPublisher(self._room)

        @function_tool(description="Record an answer evaluation note for candidate strength/weakness.")
        async def record_answer_note(context: RunContext, question: str, strength: str, weakness: str):
            """Record an answer observation note and broadcast event to room.

            Saves candidate strengths and weaknesses to session state.
            """
            res = do_record_answer_note(cfg.session_id, question, strength, weakness)
            asyncio.create_task(self._events.send({"type": "answer-note", "data": res}))
            return res

        @function_tool(description="Submit rubric evaluation grade for a specific category.")
        async def submit_rubric_grade(context: RunContext, category: str, grade: str, notes: str):
            """Submit category grade and publish real-time update event.

            Applies evaluation grade to session state and notifies listeners.
            """
            res = do_submit_rubric_grade(cfg.session_id, category, grade, notes)
            if res.get("status") == "success":
                cat = res.get("category", "")
                if cat:
                    self._session_graded_keys.add(cat)
                    asyncio.create_task(self._events.send({"type": "rubric-update", "data": {"category": cat, "grade": grade, "notes": notes}}))
            return res

        @function_tool(description="Gracefully end the interview conversation session.")
        async def end_conversation(context: RunContext):
            """Signal end of session and trigger disconnection event.

            Initiates graceful termination of active voice call.
            """
            res = do_end_conversation(cfg.session_id)
            if res.get("__end_session__"):
                self._end_session_event.set()
            return res

        @function_tool(description="Get rubric evaluation report for current or overall session.")
        async def get_rubric_report(context: RunContext, scope: str = "current"):
            """Retrieve formatted rubric evaluation report for current or overall scope.

            Returns structured ratings and category performance data.
            """
            return do_get_rubric_report(cfg.session_id, scope)

        @function_tool(description="Get round scorecard (1-4 score) for candidate.")
        async def get_round_scorecard(context: RunContext, round_number: int = 0, category: str = "", scope: str = "current"):
            """Calculate 1-4 scale scorecard rating for candidate round performance.

            Translates rubric evaluations into standardized score metrics.
            """
            return do_get_round_scorecard(cfg.session_id, round_number, category, scope)

        @function_tool(description="Transition the interview to the next stage (Stage 1: Resume -> Stage 2: System Design -> Stage 3: Live Coding -> Stage 4: Behavioral).")
        async def transition_stage(context: RunContext, stage_number: int, stage_name: str, verbal_transition: str = ""):
            """Transition interview to the next stage and broadcast transition event to studio UI."""
            logger.info(f"[voice] Transitioning to Stage {stage_number}: {stage_name}")
            asyncio.create_task(self._events.send({
                "type": "stage-transition",
                "data": {
                    "stage": stage_number,
                    "stage_name": stage_name,
                    "verbal": verbal_transition,
                }
            }))
            return {"status": "success", "stage": stage_number, "stage_name": stage_name}

        @function_tool(description="Get session summary of questions asked.")
        async def get_session_summary(context: RunContext, scope: str = "overall"):
            """Generate textual summary of questions asked and evaluation progress.

            Provides aggregated overview of the candidate interview session.
            """
            return do_get_session_summary(cfg.session_id, scope)

        azure_key = (
            os.getenv("AZURE_OPENAI_API_KEY")
            or os.getenv("AZURE_OPENAI_KEY")
            or os.getenv("OPENAI_API_KEY", "")
        )
        model = lk_openai.realtime.RealtimeModel.with_azure(
            azure_deployment=cfg.realtime_model,
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", "").strip(),
            api_key=azure_key,
            voice=cfg.voice_id,
            instructions=cfg.system_instruction,
            turn_detection=TurnDetection(
                type="server_vad",
                threshold=0.82,
                prefix_padding_ms=300,
                silence_duration_ms=850,
            ),
            modalities=["audio", "text"],
        )

        agent = Agent(
            tools=[
                record_answer_note,
                submit_rubric_grade,
                transition_stage,
                end_conversation,
                get_rubric_report,
                get_round_scorecard,
                get_session_summary,
            ],
            instructions=cfg.system_instruction,
        )

        session = AgentSession(llm=model)
        await session.start(agent=agent, room=self._room)

        try:
            await session.generate_reply(
                instructions=(
                    "Speak first immediately. Greet the candidate warmly, introduce yourself as Maya from TalkHire, "
                    "state the interview round and role, and invite the candidate to introduce themselves or begin."
                )
            )
        except Exception as exc:
            logger.warning(f"[voice] Initial greeting trigger note: {exc}")

        transcript: list[dict[str, str]] = []

        @self._room.on("data_received")
        def on_data_received(data_packet: rtc.DataPacket):
            """Handle incoming data channel events from candidate (e.g. shared code, hints)."""
            try:
                decoded = data_packet.data.decode("utf-8")
                payload = json.loads(decoded)
                event_type = payload.get("type", "")
                if event_type == "code-submission":
                    code_data = payload.get("data", {})
                    code_str = code_data.get("code", "")
                    lang = code_data.get("language", "code")
                    logger.info(f"[voice] Candidate shared {lang} code ({len(code_str)} chars)")
                    transcript.append({"role": "user", "content": f"[Candidate shared {lang} code]:\n{code_str}"})
                elif event_type in ("hint-request", "candidate-action"):
                    act = payload.get("data", {}).get("action", "hint")
                    logger.info(f"[voice] Candidate action: {act}")
                    transcript.append({"role": "user", "content": f"[Candidate Action: {act}]"})
            except Exception as exc:
                logger.warning(f"[voice] Failed to decode incoming data packet: {exc}")

        @session.on("user_input_transcribed")
        def on_user_input_transcribed(ev):
            """Handle transcribed user speech event and detect exit intent.

            Appends user utterances to transcript and triggers session wrap-up if detected.
            """
            text = getattr(ev, "transcript", "").strip()
            if text and getattr(ev, "is_final", True):
                self._last_user_utterance = text
                transcript.append({"role": "user", "content": text})
                if _EXIT_PHRASE_RE.search(text.lower()):
                    self._end_session_event.set()
                asyncio.create_task(self._events.send({"type": "user-transcription", "data": {"text": text, "final": True}}))

        try:
            await asyncio.wait_for(self._end_session_event.wait(), timeout=cfg.max_duration_secs)
        except asyncio.TimeoutError:
            self._ended_reason = "max_duration_exceeded"
        finally:
            if transcript:
                try:
                    azure_client = create_azure_openai_client()
                    await auto_grade_transcript(transcript, cfg.session_id, client=azure_client)
                except Exception as exc:
                    logger.warning(f"[voice] Background auto-grading fallback: {exc}")
                    await auto_grade_transcript(transcript, cfg.session_id, client=None)

            if session_svc and not _is_anon_user(cfg.user_id):
                try:
                    snapshot = export_session_state(cfg.session_id)
                    await session_svc.save_user_state(app_name, cfg.user_id, snapshot)
                except Exception as exc:
                    logger.error(f"[voice] Failed to persist user state: {exc}")

            summary = do_get_session_summary(cfg.session_id, scope="overall")
            _room_summaries[cfg.room_name] = summary

            destroy_session_state(cfg.session_id)
            await self._room.disconnect()


async def run_room_bot(config: TalkHireRoomConfig) -> None:
    """Launch TalkHireVoiceSession runner for specified room configuration."""
    session = TalkHireVoiceSession(config)
    await session.run()