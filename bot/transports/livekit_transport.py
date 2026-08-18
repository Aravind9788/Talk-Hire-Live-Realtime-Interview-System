"""LiveKit WebRTC audio transport implementation for TalkHire."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from livekit import rtc
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.transport")


@dataclass
class TransportEvent:
    """Event payload published over LiveKit data channels."""

    event_type: str
    payload: dict


class LiveKitDataChannelEvents:
    """Publishes structured JSON event payloads over LiveKit RTC data channels."""

    def __init__(self, room: rtc.Room, topic: str = "talkhire-events"):
        """Initialise publisher bound to LiveKit room data channel topic."""
        self._room = room
        self._topic = topic

    async def send(self, event: dict) -> None:
        """Publish event dictionary payload over LiveKit data channel."""
        try:
            payload = json.dumps(event).encode("utf-8")
            await self._room.local_participant.publish_data(
                payload, reliable=True, topic=self._topic
            )
        except Exception as exc:
            logger.warning(f"[transport] Data channel publish failed: {exc}")


class NullDataChannelEvents:
    """Fallback no-op event publisher for offline testing."""

    async def send(self, event: dict) -> None:
        """No-op fallback send method."""
        pass


class LiveKitVoiceTransport:
    """Manages LiveKit WebRTC room connections and participant data channels."""

    def __init__(self, url: str, token: str, room_name: str):
        """Initialise transport instance with target room connection parameters."""
        self.url = url
        self.token = token
        self.room_name = room_name
        self.room = rtc.Room()
        self.events: LiveKitDataChannelEvents | NullDataChannelEvents = NullDataChannelEvents()
        self.connected_event = asyncio.Event()

    async def connect(self) -> None:
        """Establish WebRTC connection to target LiveKit room."""
        await self.room.connect(self.url, self.token)
        self.events = LiveKitDataChannelEvents(self.room)
        self.connected_event.set()
        logger.info(f"[transport] Connected to room {self.room_name}")

    async def disconnect(self) -> None:
        """Disconnect from active LiveKit room."""
        await self.room.disconnect()
        self.connected_event.clear()
        logger.info(f"[transport] Disconnected from room {self.room_name}")

    async def send_event(self, event_type: str, data: dict) -> None:
        """Publish structured event to connected room participants."""
        await self.events.send({"type": event_type, **data})
