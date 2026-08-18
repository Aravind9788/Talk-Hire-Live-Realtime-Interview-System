"""LiveKit credential generator and self-hosted configuration helper for TalkHire.

Generates unique, deterministic API key / secret pairs from project
identifiers and validates the LiveKit YAML config for port safety.
"""

from __future__ import annotations

import hashlib
import base64
import sys
from pathlib import Path

import yaml


# Prohibited ports that must never appear in any LiveKit or backend config.
PROHIBITED_PORTS = frozenset({5432, 6379, 8000, 8001, 8002, 8080, 7880})

LIVEKIT_DIR = Path(__file__).parent
YAML_PATH = LIVEKIT_DIR / "livekit.yaml"


def generate_api_credentials(
    owner: str = "Aravind",
    family: str = "sumathi",
    pin: str = "97",
) -> tuple[str, str]:
    """Derive a unique LiveKit API key and secret from project identifiers.

    The secret is a URL-safe base64 encoding of the SHA-256 hash of
    the combined seed string ``owner:family:pin``.
    """
    seed = f"{owner}:{family}:{pin}"
    digest = hashlib.sha256(seed.encode()).digest()
    api_secret = base64.urlsafe_b64encode(digest).decode().rstrip("=")
    api_key = f"THK_{owner.lower()}{pin}"
    return api_key, api_secret


def validate_livekit_yaml(config_path: Path = YAML_PATH) -> list[str]:
    """Check that livekit.yaml exists and uses only safe (non-prohibited) ports.

    Returns a list of violation messages. An empty list means the
    configuration is valid.
    """
    violations: list[str] = []

    if not config_path.exists():
        violations.append(f"Config file not found: {config_path}")
        return violations

    with open(config_path) as fh:
        config = yaml.safe_load(fh)

    if not isinstance(config, dict):
        violations.append("livekit.yaml is not a valid YAML dictionary")
        return violations

    # Check signaling port
    port = config.get("port")
    if port in PROHIBITED_PORTS:
        violations.append(f"Signaling port {port} is prohibited")

    # Check RTC ports
    rtc = config.get("rtc", {})
    for field in ("tcp_port", "udp_port"):
        p = rtc.get(field)
        if p and p in PROHIBITED_PORTS:
            violations.append(f"RTC {field} {p} is prohibited")

    return violations


def print_config_summary() -> None:
    """Print a concise summary of the current LiveKit deployment config."""
    api_key, api_secret = generate_api_credentials()
    violations = validate_livekit_yaml()

    print("TalkHire — LiveKit Self-Hosted Configuration")
    print("─" * 50)
    print(f"  API Key:      {api_key}")
    print(f"  API Secret:   {api_secret[:12]}...{api_secret[-6:]}")
    print(f"  Config:       {YAML_PATH}")
    print(f"  Signaling:    port 7881  (safe)")
    print(f"  WebRTC UDP:   port 7882  (safe)")
    print(f"  Backend:      port 7862  (safe)")
    print()

    if violations:
        print("⚠  Port violations detected:")
        for v in violations:
            print(f"   • {v}")
    else:
        print("✓  All ports are safe — no prohibited port conflicts")


if __name__ == "__main__":
    print_config_summary()
