"""Story Agent — powered by Gemini.

Enriches lesson content with analogies and narrative elements to improve retention.
"""
from __future__ import annotations

import json
import re
import random
from pydantic import BaseModel

from app.services.agents.llm_client import generate


class StoryEnrichment(BaseModel):
    narrative: str
    analogy: str


THEMES = [
    "space exploration", "a bustling kitchen", "a detective mystery",
    "ancient history", "a magical fantasy world", "everyday office life",
    "a sports team", "nature and biology", "music production",
    "a futuristic cyberpunk city", "deep ocean exploration",
    "a medieval kingdom", "a time-traveling adventure",
    "a pirate voyage", "a heist movie", "a Formula 1 race",
]


def enrich(lesson_content: str, *, topic: str = "") -> StoryEnrichment:
    """Enrich lesson content with narrative and analogy using Gemini."""
    theme = random.choice(THEMES)

    system = (
        "You are an expert, highly creative storyteller and educator. "
        "Always respond with valid JSON only — no markdown fences."
    )

    prompt = f"""Enrich the following lesson on '{topic}' with a creative narrative and analogy.
Use the theme: '{theme}' for your analogy — make it surprising and memorable.
Avoid clichés like 'imagine you're a librarian'.

Return a JSON object with EXACTLY this structure:
{{
  "narrative": "A 2-3 paragraph engaging narrative story that illustrates the lesson concepts using the {theme} theme",
  "analogy": "A single vivid analogy sentence using {theme} to explain the core concept"
}}

Lesson Content:
{lesson_content[:2000]}"""

    raw = generate(prompt, system, temperature=0.7)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)
    return StoryEnrichment(**data)
