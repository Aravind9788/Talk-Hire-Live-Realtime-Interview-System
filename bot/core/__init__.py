"""TalkHire Core Business Logic Module.

Provides session state management, question catalogs, candidate evaluation engines,
prompt management, and resume parsing.
"""

from bot.core.session import (
    FileSessionService,
    SessionState,
    create_session_state,
    destroy_session_state,
    export_session_state,
    get_session_delta,
    get_state,
    import_session_state,
    mark_session_baseline,
)
from bot.core.questions import (
    _QUESTIONS,
    get_all_categories,
    select_session_questions,
)
from bot.core.evaluator import (
    evaluate_candidate_answer,
    get_round_scorecard,
    get_rubric_report,
    get_session_summary,
    record_answer_note,
    submit_rubric_grade,
)
from bot.core.prompts import PromptManager

__all__ = [
    # Session
    "SessionState",
    "create_session_state",
    "destroy_session_state",
    "get_state",
    "mark_session_baseline",
    "get_session_delta",
    "export_session_state",
    "import_session_state",
    # Questions
    "_QUESTIONS",
    "select_session_questions",
    "get_all_categories",
    # Evaluator
    "submit_rubric_grade",
    "record_answer_note",
    "evaluate_candidate_answer",
    "get_rubric_report",
    "get_round_scorecard",
    "get_session_summary",
    # Prompts
    "PromptManager",
]
