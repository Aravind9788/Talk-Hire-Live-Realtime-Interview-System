"""Unit test suite for TalkHire core services and background evaluation engine."""

import pytest
import asyncio
from bot.core import (
    FileSessionService,
    SessionState,
    create_session_state,
    destroy_session_state,
    export_session_state,
    get_session_delta,
    get_state,
    import_session_state,
    mark_session_baseline,
    select_session_questions,
    get_all_categories,
    submit_rubric_grade,
    record_answer_note,
    evaluate_candidate_answer,
    get_rubric_report,
    get_round_scorecard,
    get_session_summary,
    PromptManager,
)
from bot.core.evaluator import auto_grade_transcript
from bot.resume_parser import assess_difficulty


def test_session_lifecycle():
    """Verify session state creation, mutation, baseline snapshotting, and cleanup."""
    session_id = "test-talkhire-001"
    create_session_state(session_id)
    state = get_state(session_id)
    assert isinstance(state, SessionState)

    mark_session_baseline(session_id)
    state.asked.append("Explain Floyd's cycle detection algorithm.")
    submit_rubric_grade(session_id, "cs_fundamentals", "yes", "Clear explanation.")

    delta = get_session_delta(session_id)
    assert len(delta["questions"]) == 1
    assert "cs_fundamentals" in delta["grades"]

    snapshot = export_session_state(session_id)
    assert snapshot["asked"] == ["Explain Floyd's cycle detection algorithm."]
    destroy_session_state(session_id)


def test_file_session_service(tmp_path):
    """Verify FileSessionService disk persistence to JSON files."""
    svc = FileSessionService(persist_dir=str(tmp_path))
    state_data = {"asked": ["Design URL shortener"], "current_round": 3}

    asyncio.run(svc.save_user_state("talkhire", "user123", state_data))
    loaded = asyncio.run(svc.load_user_state("talkhire", "user123"))

    assert loaded is not None
    assert loaded["asked"] == ["Design URL shortener"]


def test_question_selection_engine():
    """Verify question catalog categories and difficulty selection."""
    categories = get_all_categories()
    assert "coding" in categories
    assert "system_design" in categories

    selected = select_session_questions(round_name="coding", topic="tree", count=2)
    assert len(selected) > 0


def test_rubric_evaluator_and_scorecards():
    """Verify rubric grade submission, answer note recording, and scorecard generation."""
    session_id = "eval-session-002"
    create_session_state(session_id)

    res = submit_rubric_grade(session_id, "problem_solving", "strong_yes", "Optimal O(N) approach.")
    assert res["status"] == "success"

    note_res = record_answer_note(session_id, "Design LRU Cache", "Used HashMap + DoublyLinkedList", "None")
    assert note_res["status"] == "success"

    report = get_rubric_report(session_id, scope="overall")
    assert report["overall_score"] == 4.0

    scorecard = get_round_scorecard(session_id, round_number=2, scope="overall")
    assert scorecard["recommendation"] == "Strong Hire"

    summary = get_session_summary(session_id, scope="overall")
    assert "summary" in summary
    destroy_session_state(session_id)


def test_micro_prompt_manager():
    """Verify micro-prompt generation and token optimization."""
    prompt_mgr = PromptManager()
    focused_prompt = prompt_mgr.build_focused_round_prompt(
        round_name="coding",
        candidate_name="Aravind",
        selected_questions=["Reverse a linked list."],
    )
    assert "Reverse a linked list" in focused_prompt
    assert len(focused_prompt) < 6000


def test_async_auto_grade_transcript():
    """Verify mock background auto-grading for transcript evaluation."""
    session_id = "auto-grade-003"
    create_session_state(session_id)
    transcript = [
        {"role": "user", "content": "I would use a HashMap and a Doubly Linked List for O(1) LRU cache."},
        {"role": "assistant", "content": "That is an optimal approach. Walk me through the edge cases."},
    ]

    report = asyncio.run(auto_grade_transcript(transcript, session_id))
    assert report["overall_score"] > 0
    destroy_session_state(session_id)


def test_resume_parser_difficulty_assessment():
    """Verify difficulty level determination based on resume skill keywords."""
    resume_text = "Software Engineer with 5 years experience in Python, AWS, Docker, Microservices. Bachelor of Engineering."
    assessment = assess_difficulty(resume_text)
    assert assessment["difficulty"] in ("easy", "medium", "hard")
    assert assessment["years_experience"] == 5
