"""Phase 3 Verification Test Suite — Evaluator, Communication Scoring & Action Plan Generation."""

import pytest
import asyncio
from bot.core.session import create_session_state, destroy_session_state
from bot.core.evaluator import (
    submit_rubric_grade,
    record_answer_note,
    get_rubric_report,
    get_round_scorecard,
    get_session_summary,
    auto_grade_transcript,
)


def test_rubric_grading_and_averages():
    """Verify category grade submission, score weighting, and average score calculation."""
    session_id = "test-eval-phase3-01"
    create_session_state(session_id)

    submit_rubric_grade(session_id, "problem_solving", "strong_yes", "Optimal two-pointer approach.")
    submit_rubric_grade(session_id, "code_fluency", "yes", "Clean, idiomatic Python.")
    submit_rubric_grade(session_id, "communication", "strong_yes", "Articulate explanation.")

    report = get_rubric_report(session_id, scope="overall")
    assert report["total_categories_graded"] == 3
    assert report["overall_score"] >= 3.5

    scorecard = get_round_scorecard(session_id, round_number=2, scope="overall")
    assert scorecard["recommendation"] in ("Strong Hire", "Hire")

    summary = get_session_summary(session_id, scope="overall")
    assert "Overall assessment" in summary["summary"]
    assert summary["recommendation"] in ("Strong Hire", "Hire")

    destroy_session_state(session_id)


def test_communication_skills_evaluation():
    """Verify specific communication scoring dimension."""
    session_id = "test-comm-phase3-02"
    create_session_state(session_id)

    # Test strong communication
    submit_rubric_grade(session_id, "communication", "strong_yes", "Clear STAR structure with quantifiable results.")
    report = get_rubric_report(session_id, scope="overall")
    comm_item = next(item for item in report["report"] if item["category"] == "communication")
    assert comm_item["score"] == 4
    assert comm_item["grade"] == "strong_yes"

    destroy_session_state(session_id)


def test_auto_grade_transcript_with_action_plan():
    """Verify auto_grade_transcript produces structured strengths, blindspots, and action plan."""
    session_id = "test-transcript-phase3-03"
    create_session_state(session_id)

    sample_transcript = [
        {"role": "user", "content": "I would design the rate limiter using a sliding window counter in Redis."},
        {"role": "assistant", "content": "How would you handle Redis node failover?"},
        {"role": "user", "content": "We can use Redis Sentinel or Redis Cluster with read replicas and asynchronous replication."},
    ]

    report = asyncio.run(auto_grade_transcript(sample_transcript, session_id, client=None))
    assert report["recommendation"] in ("Strong Hire", "Hire", "Lean Hire")
    assert "strengths" in report
    assert "blindspots" in report
    assert "action_plan" in report
    assert len(report["strengths"]) > 0
    assert len(report["action_plan"]) > 0

    destroy_session_state(session_id)
