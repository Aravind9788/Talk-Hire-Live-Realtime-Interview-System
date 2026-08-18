"""Session state management and disk persistence service for TalkHire."""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.session")

_VALID_GRADES = {"strong_no", "no", "mixed", "yes", "strong_yes"}


class FileSessionService:
    """JSON-based session state persistence service for candidate progress."""

    def __init__(self, persist_dir: str = ".talkhire_sessions"):
        """Initialise storage directory for persistent JSON session files."""
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, app_name: str, user_id: str) -> Path:
        """Construct sanitized JSON filepath for user session data."""
        safe_app = "".join(c for c in app_name if c.isalnum() or c in ('-', '_')).strip()
        safe_user = "".join(c for c in user_id if c.isalnum() or c in ('-', '_')).strip()
        return self.persist_dir / f"{safe_app}_{safe_user}.json"

    async def save_user_state(self, app_name: str, user_id: str, state: dict[str, Any]) -> None:
        """Serialize and persist candidate session state to JSON file."""
        try:
            path = self._get_file_path(app_name, user_id)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
            logger.info(f"[session] Saved session state for user={user_id}")
        except Exception as exc:
            logger.error(f"[session] Failed to save user state: {exc}")

    async def load_user_state(self, app_name: str, user_id: str) -> dict[str, Any] | None:
        """Load and deserialize candidate session state from JSON file."""
        try:
            path = self._get_file_path(app_name, user_id)
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as exc:
            logger.error(f"[session] Failed to load user state: {exc}")
        return None


@dataclass
class SessionState:
    """Per-session in-memory state tracking candidate interview progress."""

    asked: list[str] = field(default_factory=list)
    grades: dict[str, dict] = field(default_factory=dict)
    notes: list[dict] = field(default_factory=list)
    current_round: int | None = None
    current_category: str = ""


_sessions: dict[str, SessionState] = {}
_session_baselines: dict[str, dict[str, Any]] = {}


def create_session_state(session_id: str) -> None:
    """Initialise isolated state for a new interview session."""
    _sessions[session_id] = SessionState()
    _session_baselines.pop(session_id, None)
    logger.info(f"[session] Created session state for {session_id}")


def destroy_session_state(session_id: str) -> None:
    """Remove a session state from in-process memory."""
    _sessions.pop(session_id, None)
    _session_baselines.pop(session_id, None)


def get_state(session_id: str) -> SessionState:
    """Return state for session_id, lazily creating if missing."""
    if session_id not in _sessions:
        _sessions[session_id] = SessionState()
    return _sessions[session_id]


def mark_session_baseline(session_id: str) -> None:
    """Snapshot restored baseline state for current session delta comparison."""
    state = get_state(session_id)
    _session_baselines[session_id] = {
        "asked_count": len(state.asked),
        "notes_count": len(state.notes),
        "grades": {
            category: {
                "grade": str(data.get("grade", "")).strip(),
                "notes": str(data.get("notes", "")).strip(),
            }
            for category, data in state.grades.items()
            if isinstance(category, str) and isinstance(data, dict)
        },
    }


def get_session_delta(session_id: str) -> dict[str, Any]:
    """Return active session questions, notes, and grades delta relative to baseline."""
    state = get_state(session_id)
    baseline = _session_baselines.get(session_id, {})

    asked_count = baseline.get("asked_count", 0)
    notes_count = baseline.get("notes_count", 0)
    prior_grades = baseline.get("grades", {})

    current_questions = (
        state.asked[asked_count:]
        if isinstance(asked_count, int) and 0 <= asked_count <= len(state.asked)
        else list(state.asked)
    )
    current_notes = (
        state.notes[notes_count:]
        if isinstance(notes_count, int) and 0 <= notes_count <= len(state.notes)
        else list(state.notes)
    )
    current_grades = {
        category: data
        for category, data in state.grades.items()
        if prior_grades.get(category) != data
    }

    return {
        "questions": list(current_questions),
        "notes": list(current_notes),
        "grades": current_grades,
        "prior_grades": dict(prior_grades),
    }


def export_session_state(session_id: str) -> dict[str, Any]:
    """Return JSON-serializable snapshot of session state for disk persistence."""
    state = get_state(session_id)
    return {
        "asked": [q for q in state.asked if isinstance(q, str) and q.strip()],
        "grades": {
            str(cat): {
                "grade": str(d.get("grade", "")).strip(),
                "notes": str(d.get("notes", "")).strip(),
            }
            for cat, d in state.grades.items()
            if isinstance(cat, str) and isinstance(d, dict)
        },
        "notes": [
            {
                "question": str(n.get("question", "")).strip(),
                "strength": str(n.get("strength", "")).strip(),
                "weakness": str(n.get("weakness", "")).strip(),
            }
            for n in state.notes
            if isinstance(n, dict)
        ],
        "current_round": state.current_round,
        "current_category": state.current_category,
    }


def import_session_state(session_id: str, snapshot: dict[str, Any]) -> None:
    """Restore persisted JSON session snapshot into active session state."""
    state = get_state(session_id)

    asked = snapshot.get("asked", []) if isinstance(snapshot, dict) else []
    state.asked = [q.strip() for q in asked if isinstance(q, str) and q.strip()]

    restored_grades: dict[str, dict[str, str]] = {}
    grades = snapshot.get("grades", {}) if isinstance(snapshot, dict) else {}
    if isinstance(grades, dict):
        for cat, data in grades.items():
            if not isinstance(cat, str) or not isinstance(data, dict):
                continue
            grade = str(data.get("grade", "")).lower().strip()
            notes = str(data.get("notes", "")).strip()
            if grade in _VALID_GRADES and notes:
                restored_grades[cat.strip().lower().replace(" ", "_")] = {
                    "grade": grade,
                    "notes": notes,
                }
    state.grades = restored_grades

    restored_notes: list[dict[str, str]] = []
    notes = snapshot.get("notes", []) if isinstance(snapshot, dict) else []
    if isinstance(notes, list):
        for note in notes:
            if isinstance(note, dict):
                q = str(note.get("question", "")).strip()
                s = str(note.get("strength", "")).strip()
                w = str(note.get("weakness", "")).strip()
                if q and (s or w):
                    restored_notes.append({"question": q, "strength": s, "weakness": w})
    state.notes = restored_notes

    cur_round = snapshot.get("current_round") if isinstance(snapshot, dict) else None
    state.current_round = cur_round if isinstance(cur_round, int) and 1 <= cur_round <= 6 else None
    cur_cat = snapshot.get("current_category", "") if isinstance(snapshot, dict) else ""
    state.current_category = cur_cat.strip() if isinstance(cur_cat, str) else ""
