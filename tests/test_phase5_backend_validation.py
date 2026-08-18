import os
import pytest
import jwt
from fastapi.testclient import TestClient

os.environ["TALKHIRE_TEST_MODE"] = "1"

from bot.bot import app, mint_livekit_token, generate_room_name
from bot.core.session import (
    create_session_state,
    destroy_session_state,
    get_state,
)
from bot.core.evaluator import (
    submit_rubric_grade,
    record_answer_note,
    get_rubric_report,
    get_round_scorecard,
)


def test_multi_candidate_room_isolation():
    """Verify that multiple concurrent candidates get completely isolated rooms, tokens, and states."""
    client = TestClient(app)

    # Candidate 1: Aravind
    resp1 = client.post(
        "/api/livekit/session",
        json={
            "display_name": "Aravind",
            "job_role": "Backend Engineer",
            "track_preset": "coding",
            "difficulty_hint": "hard",
        },
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    room1 = data1["room_name"]
    token1 = data1["access_token"]
    identity1 = data1["participant_identity"]

    # Candidate 2: Sumathi
    resp2 = client.post(
        "/api/livekit/session",
        json={
            "display_name": "Sumathi",
            "job_role": "AI Engineer",
            "track_preset": "system_design",
            "difficulty_hint": "medium",
        },
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    room2 = data2["room_name"]
    token2 = data2["access_token"]
    identity2 = data2["participant_identity"]

    # Verify rooms and identities are strictly unique
    assert room1 != room2
    assert identity1 != identity2
    assert token1 != token2

    # Verify token claims are scoped to the exact respective rooms
    claims1 = jwt.decode(token1, options={"verify_signature": False})
    claims2 = jwt.decode(token2, options={"verify_signature": False})
    assert claims1["video"]["room"] == room1
    assert claims2["video"]["room"] == room2
    assert claims1["sub"] == identity1
    assert claims2["sub"] == identity2


def test_session_state_memory_isolation():
    """Verify evaluation grades and notes of Candidate A do NOT bleed into Candidate B."""
    session_a = "candidate-session-alpha"
    session_b = "candidate-session-beta"

    create_session_state(session_a)
    create_session_state(session_b)

    # Candidate A gets strong grades in coding
    submit_rubric_grade(session_a, "code_fluency", "strong_yes", "Optimal O(N) linear time solution.")
    record_answer_note(session_a, "Two Sum", "Clear two-pointer approach", "None")

    # Candidate B gets mixed grades in system design
    submit_rubric_grade(session_b, "system_design", "mixed", "Needs more detail on caching.")
    record_answer_note(session_b, "Rate Limiter", "Understands Token Bucket", "Missed Redis failover")

    report_a = get_rubric_report(session_a, scope="overall")
    report_b = get_rubric_report(session_b, scope="overall")

    # Verify Session A has only its own grades
    assert len(report_a["report"]) == 1
    assert report_a["report"][0]["category"] == "code_fluency"
    assert report_a["report"][0]["grade"] == "strong_yes"

    # Verify Session B has only its own grades
    assert len(report_b["report"]) == 1
    assert report_b["report"][0]["category"] == "system_design"
    assert report_b["report"][0]["grade"] == "mixed"

    state_a = get_state(session_a)
    state_b = get_state(session_b)
    assert len(state_a.notes) == 1
    assert state_a.notes[0]["question"] == "Two Sum"
    assert len(state_b.notes) == 1
    assert state_b.notes[0]["question"] == "Rate Limiter"

    destroy_session_state(session_a)
    destroy_session_state(session_b)


def test_coding_round_rubric_and_validation():
    """Verify coding round rubric grading adheres to Google 1.0-4.0 scale."""
    session_id = "coding-round-eval-test"
    create_session_state(session_id)

    submit_rubric_grade(session_id, "problem_solving", "yes", "Clear algorithmic decomposition.")
    submit_rubric_grade(session_id, "code_fluency", "strong_yes", "Idiomatic syntax and clean variable naming.")
    submit_rubric_grade(session_id, "cs_fundamentals", "yes", "Accurate space-time Big-O analysis.")

    scorecard = get_round_scorecard(session_id, round_number=2, scope="overall")
    assert scorecard["round_number"] == 2
    assert scorecard["average_score"] >= 3.0
    assert scorecard["recommendation"] in ("Strong Hire", "Hire")

    destroy_session_state(session_id)


def test_input_validation_and_edge_cases():
    """Verify API routes handle edge cases and malformed inputs gracefully without crashes."""
    client = TestClient(app)

    # 1. Empty Session Request (Defaults should kick in)
    resp = client.post("/api/livekit/session", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["participant_name"] == "Guest"
    assert "talkhire-" in data["room_name"]
    assert len(data["access_token"]) > 20

    # 2. Empty resume analysis (Should return fallback structure, not 500 error)
    resp = client.post(
        "/api/resume/analyze",
        data={"resume_text": "", "job_role": "", "job_description": ""},
    )
    assert resp.status_code == 200
    analysis = resp.json()
    assert "match_score" in analysis
    assert "matched_skills" in analysis
    assert "targeted_probe_questions" in analysis

    # 3. Room summary for non-existent room
    resp = client.get("/api/summary/non-existent-room-999")
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    # 4. Candidate check for anonymous user
    resp = client.get("/api/candidate/check?user_id=anonymous")
    assert resp.status_code == 200
    assert resp.json()["exists"] is False
