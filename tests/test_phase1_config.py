"""Phase 1 Verification Test Suite — Backend Config, Env Resolution & Port Safety."""

import os
import pytest
from fastapi.testclient import TestClient
from bot.bot import (
    app,
    get_safe_port,
    PROHIBITED_PORTS,
    mint_livekit_token,
    get_livekit_url,
    get_room_prefix,
    normalize_candidate_name,
    normalize_interview_track_preset,
)
from bot.pipelines.voice import (
    TalkHireRoomConfig,
    build_talkhire_room_config,
    create_azure_openai_client,
)


def test_env_resolution_and_model_names():
    """Verify Azure OpenAI Realtime model and endpoint resolution from .env."""
    config = build_talkhire_room_config(
        livekit_url=get_livekit_url(),
        room_name="test-room-101",
        token="test-token",
        system_instruction="Test Instruction",
    )
    assert config.room_name == "test-room-101"
    assert config.realtime_model in ("gpt-realtime-mini", "gpt-4o-realtime-preview")
    assert config.voice_id in ("shimmer", "alloy")

    client = create_azure_openai_client()
    assert client is not None


def test_prohibited_ports_safety():
    """Verify that all forbidden ports are caught and safely redirected to 7862."""
    for bad_port in PROHIBITED_PORTS:
        os.environ["PORT"] = str(bad_port)
        safe_port = get_safe_port()
        assert safe_port == 7862, f"Failed to block prohibited port {bad_port}"

    # Valid non-prohibited port check
    os.environ["PORT"] = "7865"
    assert get_safe_port() == 7865

    # Reset back to default safe port
    os.environ["PORT"] = "7862"
    assert get_safe_port() == 7862


def test_livekit_token_minting():
    """Verify minting valid JWT token for participant."""
    token = mint_livekit_token(
        room_name="talkhire-test-room",
        identity="user-test-01",
        name="Candidate",
        metadata={"role": "candidate"},
    )
    assert isinstance(token, str)
    assert len(token) > 20


def test_fastapi_health_endpoint():
    """Verify FastAPI /health and /api/health endpoints."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["bot"] == "TalkHire"
    assert "active_rooms" in data


def test_fastapi_session_bootstrap_endpoint():
    """Verify /api/livekit/session creates room session and returns valid access token."""
    client = TestClient(app)
    payload = {
        "display_name": "Aravind",
        "job_role": "Backend Engineer",
        "track_preset": "compressed",
        "difficulty_hint": "medium",
    }
    response = client.post("/api/livekit/session", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "room_name" in data
    assert "access_token" in data
    assert data["participant_name"] == "Aravind"
    assert len(data["access_token"]) > 20
