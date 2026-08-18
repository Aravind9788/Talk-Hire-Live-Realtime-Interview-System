"""Unit tests for TalkHire audio VAD and WebRTC transport modules."""

import pytest
import asyncio
from bot.audio import SileroVADAnalyzer, VADParams, VADState
from bot.transports import LiveKitVoiceTransport, NullDataChannelEvents, TransportEvent


def test_vad_params_and_state():
    """Verify VADParams initialisation and VADState enumeration values."""
    params = VADParams(confidence=0.8, start_secs=0.2, stop_secs=0.2)
    assert params.confidence == 0.8
    assert VADState.SPEAKING != VADState.QUIET


def test_null_data_channel_events():
    """Verify fallback NullDataChannelEvents async send execution."""
    events = NullDataChannelEvents()
    asyncio.run(events.send({"type": "talkhire-events"}))


def test_transport_event_dataclass():
    """Verify TransportEvent payload creation and field access."""
    event = TransportEvent(event_type="bot-transcription", payload={"text": "Hello"})
    assert event.event_type == "bot-transcription"
    assert event.payload["text"] == "Hello"
