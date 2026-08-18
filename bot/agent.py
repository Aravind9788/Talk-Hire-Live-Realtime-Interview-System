"""TalkHire Agent Facade and Tool Registry.

Delegates core business logic to modular sub-packages:
- bot.core.session: Per-session isolated state
- bot.core.questions: Question catalog and topic selection
- bot.core.evaluator: Candidate evaluation and rubric scoring engine
- bot.core.prompts: System prompt composition and template loading
"""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any
from loguru import logger

# Import core business logic
from bot.core.session import (
    SessionState as _SessionState,
    create_session_state,
    destroy_session_state,
    export_session_state,
    get_session_delta,
    get_state as _get_state,
    import_session_state,
    mark_session_baseline,
)
from bot.core.questions import (
    _QUESTIONS,
    get_all_categories,
    select_session_questions as core_select_session_questions,
)
from bot.core.evaluator import (
    evaluate_candidate_answer as do_evaluate_candidate_answer,
    get_round_scorecard as do_get_round_scorecard,
    get_rubric_report as do_get_rubric_report,
    get_session_summary as do_get_session_summary,
    record_answer_note as do_record_answer_note,
    submit_rubric_grade as do_submit_rubric_grade,
)
from bot.core.prompts import PromptManager

# Thread/Session Context Identifier (set per request/call)
_session_id_context: str = "default_session"


def set_session_context(session_id: str) -> None:
    """Set active session_id for context-dependent tool executions."""
    global _session_id_context
    _session_id_context = session_id


def select_session_questions(
    round_hint: str = "",
    topic: str = "",
    difficulty: str = "medium",
    count: int = 4,
    round_name: str = "",
) -> list[str]:
    """Select a focused bank of questions for candidate interview session."""
    target_round = round_name or round_hint
    return core_select_session_questions(
        round_name=target_round,
        category="",
        topic=topic,
        difficulty=difficulty,
        count=count,
    )


def get_current_time(**kwargs) -> dict[str, str]:
    """Return current UTC timestamp for answer-timing feedback."""
    now = datetime.now(timezone.utc)
    return {
        "time": now.strftime("%H:%M UTC"),
        "date": now.strftime("%A, %B %d, %Y"),
    }


def get_interview_question(
    round_number: int = 1,
    category: str = "",
    topic: str = "",
    difficulty: str = "medium",
    session_id: str | None = None,
    **kwargs,
) -> dict[str, str]:
    """Pull a targeted interview question for a session."""
    target_session = session_id or _session_id_context
    state = _get_state(target_session)

    selected = select_session_questions(
        round_hint=str(round_number),
        category=category,
        topic=topic,
        difficulty=difficulty,
        count=1,
    )

    if selected:
        question = selected[0]
        if question not in state.asked:
            state.asked.append(question)
    else:
        question = "Tell me about a technical challenge you solved recently."

    cat = category or "behavioural"
    state.current_category = cat
    state.current_round = round_number

    return {
        "question": question,
        "category": cat,
        "round": str(round_number),
        "instruction": "Present this question to the candidate now.",
    }


# Facade wrappers for candidate evaluation and rubric tools
def submit_rubric_grade(
    session_id: str = "",
    category: str = "",
    grade: str = "",
    notes: str = "",
) -> dict[str, str]:
    """Submit a rubric evaluation score and notes for a specific category.

    Delegates rubric grade submission to the core evaluation service.
    """
    target_session = session_id or _session_id_context
    return do_submit_rubric_grade(target_session, category, grade, notes)


def record_answer_note(
    session_id: str = "",
    question: str = "",
    strength: str = "",
    weakness: str = "",
) -> dict[str, str]:
    """Record observed strengths and weaknesses for a candidate response.

    Stores answer notes in the target session state context.
    """
    target_session = session_id or _session_id_context
    return do_record_answer_note(target_session, question, strength, weakness)


def evaluate_candidate_answer(
    session_id: str = "",
    question: str = "",
    strength: str = "",
    weakness: str = "",
    category_grades: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Evaluate candidate response and record performance observations.

    Updates candidate answer notes and applies optional category grades.
    """
    target_session = session_id or _session_id_context
    return do_evaluate_candidate_answer(target_session, question, strength, weakness, category_grades)


def get_rubric_report(session_id: str = "", scope: str = "current") -> dict[str, Any]:
    """Retrieve rubric evaluation report for the specified session scope.

    Aggregates category scores and evaluation feedback across interview rounds.
    """
    target_session = session_id or _session_id_context
    return do_get_rubric_report(target_session, scope)


def get_round_scorecard(
    session_id: str = "",
    round_number: int = 0,
    category: str = "",
    scope: str = "current",
) -> dict[str, Any]:
    """Compute round scorecard ratings based on recorded rubric evaluations.

    Generates numerical 1-4 scale scores for candidate performance.
    """
    target_session = session_id or _session_id_context
    return do_get_round_scorecard(target_session, round_number, category, scope)


def get_session_summary(session_id: str = "", scope: str = "overall") -> dict[str, str]:
    """Compile structured summary of questions, ratings, and evaluation notes.

    Formats an overall or round-specific report of candidate performance.
    """
    target_session = session_id or _session_id_context
    return do_get_session_summary(target_session, scope)


def end_conversation(session_id: str = "") -> dict[str, Any]:
    """Signal completion and graceful termination of the interview session.

    Triggers conversation conclusion workflows and session cleanup.
    """
    target_session = session_id or _session_id_context
    logger.info(f"[agent] Conversation end requested for session {target_session}")
    return {"__end_session__": True, "status": "ending"}


__all__ = [
    "_SessionState",
    "create_session_state",
    "destroy_session_state",
    "export_session_state",
    "import_session_state",
    "get_session_delta",
    "mark_session_baseline",
    "_get_state",
    "_QUESTIONS",
    "get_all_categories",
    "select_session_questions",
    "get_current_time",
    "get_interview_question",
    "submit_rubric_grade",
    "record_answer_note",
    "evaluate_candidate_answer",
    "get_rubric_report",
    "get_round_scorecard",
    "get_session_summary",
    "end_conversation",
]