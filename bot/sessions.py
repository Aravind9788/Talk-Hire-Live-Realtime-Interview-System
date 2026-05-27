import json
import os
from pathlib import Path
from typing import Any
from loguru import logger

class FileSessionService:
    """Local JSON-based session state persistence for Azure migration."""
    
    def __init__(self, persist_dir: str = ".aura_sessions"):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"[sessions] Initialized FileSessionService at {self.persist_dir.absolute()}")

    def _get_file_path(self, app_name: str, user_id: str) -> Path:
        safe_app = "".join(c for c in app_name if c.isalnum() or c in ('-', '_')).strip()
        safe_user = "".join(c for c in user_id if c.isalnum() or c in ('-', '_')).strip()
        return self.persist_dir / f"{safe_app}_{safe_user}.json"

    async def save_user_state(self, app_name: str, user_id: str, state: dict[str, Any]) -> None:
        try:
            path = self._get_file_path(app_name, user_id)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
            logger.info(f"[sessions] Saved state for user={user_id} to {path}")
        except Exception as exc:
            logger.error(f"[sessions] Failed to save state for user={user_id}: {exc}")

    async def load_user_state(self, app_name: str, user_id: str) -> dict[str, Any] | None:
        try:
            path = self._get_file_path(app_name, user_id)
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    state = json.load(f)
                logger.info(f"[sessions] Loaded state for user={user_id} from {path}")
                return state
        except Exception as exc:
            logger.error(f"[sessions] Failed to load state for user={user_id}: {exc}")
        return None