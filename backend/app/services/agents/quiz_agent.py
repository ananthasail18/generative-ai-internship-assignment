"""Quiz Agent — powered by Gemini.

Generates quiz questions and flashcards from lesson content.
"""
from __future__ import annotations

import json
import re
from typing import List, Optional
from pydantic import BaseModel

from app.services.agents.llm_client import generate


class Flashcard(BaseModel):
    front: str
    back: str


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer_index: int
    explanation: Optional[str] = None


class QuizPayload(BaseModel):
    flashcards: List[Flashcard]
    questions: List[QuizQuestion]


def generate_quiz(lesson_content: str) -> QuizPayload:
    """Generate quizzes and flashcards using Gemini."""
    system = (
        "You are an expert curriculum designer. Produce high quality quizzes to test "
        "student comprehension. Always respond with valid JSON only — no markdown fences."
    )

    prompt = f"""Generate quiz content for the following lesson.

Return a JSON object with EXACTLY this structure:
{{
  "flashcards": [
    {{"front": "Question or term", "back": "Answer or definition"}},
    {{"front": "Question or term", "back": "Answer or definition"}},
    {{"front": "Question or term", "back": "Answer or definition"}}
  ],
  "questions": [
    {{
      "question": "Multiple choice question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer_index": 0,
      "explanation": "Why this answer is correct"
    }},
    {{
      "question": "Multiple choice question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer_index": 1,
      "explanation": "Why this answer is correct"
    }},
    {{
      "question": "Multiple choice question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer_index": 2,
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Lesson Content:
{lesson_content[:2000]}"""

    raw = generate(prompt, system, temperature=0.3)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)
    return QuizPayload(**data)
