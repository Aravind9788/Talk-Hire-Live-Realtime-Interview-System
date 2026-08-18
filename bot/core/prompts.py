"""Prompt loading, template rendering, and micro-prompt composition for TalkHire."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("talkhire.prompts")


class PromptManager:
    """Manages prompt template discovery, loading, and micro-prompt composition for voice sessions."""

    def __init__(self, prompts_dir: Path | str | None = None):
        """Initialise PromptManager with target directory path."""
        if prompts_dir is None:
            prompts_dir = Path(__file__).resolve().parents[1] / "prompts"
        self.prompts_dir = Path(prompts_dir)

    def load_prompt_file(self, filename: str) -> str:
        """Load prompt template text from specified file name."""
        path = self.prompts_dir / filename
        if not path.exists():
            return ""
        return path.read_text(encoding="utf-8").strip()

    def get_greeting(self, is_anon: bool = False, candidate_name: str = "", startup_message: str = "") -> str:
        """Format and return initial candidate greeting prompt."""
        filename = "prompt_greeting_anon.md" if is_anon else "prompt_greeting_named.md"
        template = self.load_prompt_file(filename)
        name = candidate_name if candidate_name else "Candidate"
        default_msg = f"Hello {name}, welcome to your TalkHire interview."
        msg = startup_message or default_msg
        if not template:
            return msg
        try:
            return template.format(candidate_name=name, startup_message=msg)
        except Exception:
            return template

    def get_base_system_prompt(self, is_anon: bool = False) -> str:
        """Return base fast interviewer persona prompt."""
        filename = "system_prompt_anon.md" if is_anon else "system_prompt_named_fast.md"
        prompt = self.load_prompt_file(filename)
        if not prompt:
            prompt = self.load_prompt_file("system_prompt.md")
        return prompt

    def get_round_prompt(self, round_name: str) -> str:
        """Load instructions for specific interview round."""
        norm_round = round_name.strip().lower().replace("-", "_").replace(" ", "_")
        filename = f"prompt_round_{norm_round}.md"
        prompt = self.load_prompt_file(filename)
        if not prompt and norm_round in ("coding_1", "coding_2"):
            prompt = self.load_prompt_file("prompt_round_coding.md")
        return prompt

    def get_rubric_prompt(self) -> str:
        """Load background grading rubric guidelines."""
        return self.load_prompt_file("grading_rubric.md")

    def build_focused_round_prompt(
        self,
        round_name: str,
        candidate_name: str = "",
        is_anon: bool = False,
        resume_summary: str = "",
        difficulty: str = "medium",
        selected_questions: list[str] | None = None,
    ) -> str:
        """Build lean micro-prompt optimized for low-latency voice sessions (<300 tokens)."""
        env_override = os.getenv("BOT_SYSTEM_PROMPT", "").strip()
        if env_override:
            return env_override

        prompt_parts: list[str] = []

        greeting = self.get_greeting(is_anon=is_anon, candidate_name=candidate_name)
        if greeting:
            prompt_parts.append(greeting)

        base_prompt = self.get_base_system_prompt(is_anon=is_anon)
        if base_prompt:
            prompt_parts.append(base_prompt)

        norm_round = round_name.strip().lower().replace("-", "_").replace(" ", "_")
        round_prompt = self.get_round_prompt(norm_round)
        if round_prompt:
            prompt_parts.append(f"## {norm_round.upper()} ROUND DIRECTIVES\n{round_prompt}")

        if selected_questions:
            q_list = "\n".join(f"{i+1}. {q}" for i, q in enumerate(selected_questions))
            prompt_parts.append(f"## QUESTION BANK ({difficulty.upper()})\n{q_list}")

        if resume_summary:
            prompt_parts.append(f"## CANDIDATE RESUME SUMMARY\n{resume_summary}")

        return "\n\n".join(part for part in prompt_parts if part)

    def build_system_instruction(
        self,
        candidate_name: str = "",
        is_anon: bool = False,
        resume_summary: str = "",
        difficulty: str = "medium",
        track_preset: str = "compressed",
        current_round: str = "behavioural",
        selected_questions: list[str] | None = None,
    ) -> str:
        """Delegates to build_focused_round_prompt for ultra-fast session generation."""
        return self.build_focused_round_prompt(
            round_name=current_round,
            candidate_name=candidate_name,
            is_anon=is_anon,
            resume_summary=resume_summary,
            difficulty=difficulty,
            selected_questions=selected_questions,
        )
