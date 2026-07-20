"""Structure Agent — powered by Gemini.

Analyzes chunked PDF text and designs a hierarchical course outline.
"""
from __future__ import annotations

import json
import re
from typing import List
from pydantic import BaseModel

from app.services.agents.llm_client import generate


class LessonDraft(BaseModel):
    title: str
    content: str
    order: int


class TopicDraft(BaseModel):
    title: str
    order: int
    lessons: List[LessonDraft]


class ChapterDraft(BaseModel):
    title: str
    order: int
    topics: List[TopicDraft]


class StructureDraft(BaseModel):
    title: str
    description: str
    difficulty: str
    estimated_time: int
    chapters: List[ChapterDraft]


def build_structure(text_chunks: List[str], *, filename: str) -> StructureDraft:
    """Return a structural outline for a course."""
    combined = "\n\n".join(text_chunks[:6])  # Use first 6 chunks for structure

    system = (
        "You are an expert course designer. Analyze the provided PDF content and produce "
        "a comprehensive course structure. Always respond ONLY with valid JSON matching the "
        "exact schema requested — no markdown fences, no commentary."
    )

    prompt = f"""Analyze the following content extracted from '{filename}' and design a course outline.

Return a JSON object with EXACTLY this structure:
{{
  "title": "Course title derived from content",
  "description": "2-3 sentence course description",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimated_time": <total minutes as integer>,
  "chapters": [
    {{
      "title": "Chapter title",
      "order": 1,
      "topics": [
        {{
          "title": "Topic title",
          "order": 1,
          "lessons": [
            {{
              "title": "Lesson title",
              "content": "Brief 1-2 sentence lesson description",
              "order": 1
            }}
          ]
        }}
      ]
    }}
  ]
}}

Create 3-5 chapters, 2-3 topics per chapter, 2-3 lessons per topic.

PDF Content:
{combined}"""

    raw = generate(prompt, system, temperature=0.3)

    # Strip markdown fences if present
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)
    return StructureDraft(**data)
