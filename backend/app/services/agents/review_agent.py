"""Review Agent — powered by Gemini.

Performs an end-of-course review pass.
"""
from __future__ import annotations

import json
import re
from typing import List
from pydantic import BaseModel

from app.services.agents.llm_client import generate


class ReviewReport(BaseModel):
    summary: str
    gaps: List[str]
    schedule: List[str]
    ready_for_storage: bool


def review_course(course_payload: dict) -> ReviewReport:
    """Run a review pass using Gemini."""
    system = (
        "You are a meticulous QA course reviewer. Always respond with valid JSON only — "
        "no markdown fences."
    )

    prompt = f"""Review the following course structure and provide a QA report.

Return a JSON object with EXACTLY this structure:
{{
  "summary": "2-3 sentence summary of the course quality",
  "gaps": ["gap 1", "gap 2"],
  "schedule": ["Day 1: Chapters 1-2", "Day 2: Chapter 3", "Day 3: Review"],
  "ready_for_storage": true
}}

Course:
{json.dumps(course_payload, indent=2)[:3000]}"""

    raw = generate(prompt, system, temperature=0.2)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)
    return ReviewReport(**data)
