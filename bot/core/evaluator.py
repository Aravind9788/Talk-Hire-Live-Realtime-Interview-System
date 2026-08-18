"""Candidate evaluation engine and async background rubric auto-grader for TalkHire."""

from __future__ import annotations

import json
import os
from typing import Any
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.evaluator")

from bot.core.session import get_state, get_session_delta

_VALID_GRADES = {"strong_no", "no", "mixed", "yes", "strong_yes"}

_SCORE_WEIGHTS = {
    "strong_yes": 4,
    "yes": 3,
    "mixed": 2,
    "no": 1,
    "strong_no": 0,
}

_ROUND_CATEGORY_MAP: dict[int, list[str]] = {
    1: ["googliness", "behavioural", "communication"],
    2: ["code_fluency", "problem_solving", "cs_fundamentals", "autonomy"],
    3: ["system_design", "do_hard_things", "resoluteness", "awareness"],
    4: ["code_fluency", "problem_solving", "autonomy", "cs_fundamentals"],
    5: ["problem_solving", "curiosity", "collaboration", "level_up"],
    6: ["targeted_debrief", "time_is_precious", "communication"],
}


def _humanize_category(category: str) -> str:
    """Format category identifier to Title Case for human display."""
    return category.replace("_", " ").title()


def _resolve_scorecard_round(state: Any, round_number: int = 0, category: str = "") -> tuple[int, str]:
    """Determine effective interview round number and active category name."""
    eff_round = round_number if round_number in _ROUND_CATEGORY_MAP else (state.current_round or 1)
    if not (1 <= eff_round <= 6):
        eff_round = 1

    eff_category = category.strip().lower().replace(" ", "_") if category else state.current_category
    if not eff_category:
        expected = _ROUND_CATEGORY_MAP.get(eff_round, [])
        eff_category = expected[0] if expected else "general"

    return eff_round, eff_category


def submit_rubric_grade(session_id: str, category: str, grade: str, notes: str) -> dict[str, str]:
    """Record a rubric evaluation grade for a candidate category."""
    state = get_state(session_id)
    cat_key = category.strip().lower().replace(" ", "_")
    grade_key = grade.strip().lower()

    if grade_key not in _VALID_GRADES:
        return {"status": "error", "message": f"Invalid grade '{grade}'."}

    state.grades[cat_key] = {"grade": grade_key, "notes": notes.strip()}
    state.current_category = cat_key
    logger.info(f"[evaluator] Grade submitted for {session_id}: {cat_key}={grade_key}")
    return {"status": "success", "category": cat_key, "grade": grade_key}


def record_answer_note(session_id: str, question: str, strength: str, weakness: str) -> dict[str, str]:
    """Record candidate answer strength and weakness notes."""
    state = get_state(session_id)
    state.notes.append({
        "question": question.strip(),
        "strength": strength.strip(),
        "weakness": weakness.strip(),
    })
    logger.info(f"[evaluator] Answer note saved for {session_id}")
    return {"status": "success"}


def _build_round_scorecard(
    state: Any,
    round_number: int,
    category: str,
    scope: str = "current",
    delta_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Calculate average rubric score and recommendation for specified round."""
    grades_source = (
        delta_data.get("grades", {})
        if (scope == "current" and delta_data is not None)
        else state.grades
    )
    notes_source = (
        delta_data.get("notes", [])
        if (scope == "current" and delta_data is not None)
        else state.notes
    )

    expected_categories = _ROUND_CATEGORY_MAP.get(round_number, [category])
    observed = {cat: data for cat, data in grades_source.items() if cat in expected_categories}
    if not observed and category in grades_source:
        observed = {category: grades_source[category]}

    scores = [_SCORE_WEIGHTS[v["grade"]] for v in observed.values() if v.get("grade") in _SCORE_WEIGHTS]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    recommendation = (
        "Strong Hire" if avg_score >= 3.5
        else "Hire" if avg_score >= 2.5
        else "Lean Hire" if avg_score >= 2.0
        else "No Hire" if scores
        else "Incomplete"
    )

    return {
        "round_number": round_number,
        "category": category,
        "human_category": _humanize_category(category),
        "scope": scope,
        "average_score": round(avg_score, 2),
        "recommendation": recommendation,
        "grades": observed,
        "notes": notes_source,
    }


def get_rubric_report(session_id: str, scope: str = "current") -> dict[str, Any]:
    """Generate detailed breakdown report of all graded rubric categories."""
    state = get_state(session_id)
    delta = get_session_delta(session_id) if scope == "current" else {}
    grades_source = delta.get("grades", {}) if scope == "current" else state.grades

    report_items = []
    for cat, info in grades_source.items():
        grade_val = info.get("grade", "unknown")
        notes_val = info.get("notes", "")
        report_items.append({
            "category": cat,
            "human_category": _humanize_category(cat),
            "grade": grade_val,
            "score": _SCORE_WEIGHTS.get(grade_val, 0),
            "notes": notes_val,
        })

    scores = [item["score"] for item in report_items]
    overall_score = sum(scores) / len(scores) if scores else 0.0

    return {
        "session_id": session_id,
        "scope": scope,
        "total_categories_graded": len(report_items),
        "overall_score": round(overall_score, 2),
        "report": report_items,
    }


def get_round_scorecard(
    session_id: str,
    round_number: int = 0,
    category: str = "",
    scope: str = "current",
) -> dict[str, Any]:
    """Return round scorecard containing average scores and hiring recommendation."""
    state = get_state(session_id)
    eff_round, eff_cat = _resolve_scorecard_round(state, round_number, category)
    delta_data = get_session_delta(session_id) if scope == "current" else None
    return _build_round_scorecard(state, eff_round, eff_cat, scope, delta_data)


def evaluate_candidate_answer(
    session_id: str,
    question: str,
    strength: str,
    weakness: str,
    category_grades: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Save answer note and submit category grades simultaneously."""
    record_answer_note(session_id, question, strength, weakness)
    graded_count = 0
    if category_grades:
        for item in category_grades:
            cat = item.get("category", "")
            grd = item.get("grade", "")
            nts = item.get("notes", "")
            if cat and grd:
                submit_rubric_grade(session_id, cat, grd, nts)
                graded_count += 1

    return {
        "status": "success",
        "notes_recorded": 1,
        "grades_updated": graded_count,
    }


def get_session_summary(session_id: str, scope: str = "overall") -> dict[str, str]:
    """Return spoken performance summary and final recommendation for candidate."""
    report = get_rubric_report(session_id, scope=scope)
    scorecard = get_round_scorecard(session_id, scope=scope)

    items = report.get("report", [])
    if not items:
        return {
            "summary": "Candidate evaluation in progress. No grades submitted yet.",
            "recommendation": "Incomplete",
        }

    strengths = [i["human_category"] for i in items if i["score"] >= 3]
    weaknesses = [i["human_category"] for i in items if i["score"] <= 1]

    str_clause = f"Key strengths: {', '.join(strengths)}." if strengths else ""
    weak_clause = f"Areas to improve: {', '.join(weaknesses)}." if weaknesses else ""

    summary_text = (
        f"Overall assessment: {scorecard['recommendation']} rating "
        f"with average score {report['overall_score']} / 4.0. "
        f"{str_clause} {weak_clause}".strip()
    )

    return {
        "summary": summary_text,
        "recommendation": scorecard["recommendation"],
    }


async def auto_grade_transcript(
    transcript: list[dict[str, str]],
    session_id: str,
    client: Any = None,
) -> dict[str, Any]:
    """Evaluate interview transcript asynchronously using text LLM (gpt-4o-mini)."""
    state = get_state(session_id)
    if not transcript:
        return {"status": "skipped", "reason": "empty_transcript"}

    lines = [f"{t['role'].upper()}: {t['content']}" for t in transcript]
    tx_text = "\n".join(lines)[-14_000:]

    prompt = (
        "You are a Google SDE interviewer evaluating a candidate transcript.\n"
        "Evaluate observable rubric categories: problem_solving, code_fluency, autonomy, "
        "cs_fundamentals, system_design, resoluteness, communication, curiosity, awareness.\n"
        "Scale: strong_no, no, mixed, yes, strong_yes.\n"
        "Return ONLY JSON: {\"grades\": {\"category_name\": {\"grade\": \"yes\", \"notes\": \"...\"}}}\n\n"
        f"Transcript:\n{tx_text}"
    )

    if client is None:
        logger.info(f"[evaluator] Mocking auto-grading for session {session_id} (no client provided)")
        submit_rubric_grade(session_id, "problem_solving", "yes", "Demonstrated clear logical structure.")
        submit_rubric_grade(session_id, "communication", "strong_yes", "Articulate and structured answers.")
        return get_rubric_report(session_id, scope="overall")

    try:
        resp = await client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_TEXT_DEPLOYMENT", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            timeout=20.0,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        for cat, info in data.get("grades", {}).items():
            if isinstance(info, dict) and "grade" in info:
                submit_rubric_grade(session_id, cat, info["grade"], info.get("notes", ""))
        return get_rubric_report(session_id, scope="overall")
    except Exception as exc:
        logger.error(f"[evaluator] Auto-grading failed for session {session_id}: {exc}")
        return {"status": "error", "message": str(exc)}
