"""Lesson Agent — powered by Gemini.

Given a lesson title + relevant text chunks, drafts a comprehensive lesson.
"""
from __future__ import annotations

import json
import re
from typing import List
from pydantic import BaseModel

from app.services.agents.llm_client import generate


class LessonBody(BaseModel):
    title: str
    content: str
    introduction: str
    explanation: str
    key_takeaways: List[str]
    summary: str


def draft_lesson(title: str, related_chunks: List[str]) -> LessonBody:
    """Draft a lesson using Gemini."""
    context = "\n\n".join(related_chunks[:4])

    system = (
        "You are an expert educator. Create clear, engaging lesson content based strictly "
        "on the provided source material. Always respond with valid JSON only — no markdown fences."
    )

    prompt = f"""Draft a comprehensive lesson titled '{title}' using the source material below.

Return a JSON object with EXACTLY this structure:
{{
  "title": "{title}",
  "introduction": "1-2 engaging sentences to hook the reader",
  "explanation": "3-5 paragraph detailed explanation of the topic",
  "content": "Full combined lesson content in markdown format",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "summary": "1-2 sentence summary of what was learned"
}}

Source Material:
{context}"""

    raw = generate(prompt, system, temperature=0.4)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)
    return LessonBody(**data)
