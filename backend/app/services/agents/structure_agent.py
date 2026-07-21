"""Structure Agent — PDF-first course structure builder.

Strategy:
1. If the PDF has native bookmarks (TOC), parse them directly to build chapters/topics/lessons.
   This is 100% reliable and captures ALL chapters regardless of book size.
2. If no bookmarks exist, fall back to AI-based structure generation from text chunks.
3. AI is used only to enrich metadata (description, objectives, prerequisites, difficulty).
"""
from __future__ import annotations

import json
import logging
import re
from typing import List, Optional
from pydantic import BaseModel

from app.services.agents.llm_client import generate

logger = logging.getLogger(__name__)

# Skip-list: TOC entries that are navigation/admin content, not real chapters
_SKIP_TITLES = {
    "cover page", "half title page", "title page", "copyright page",
    "dedication", "brief contents", "contents", "preface", "index",
    "bibliography", "glossary", "about the author", "acknowledgements",
    "acknowledgments", "table of contents", "appendix", "foreword",
    "introduction", "list of figures", "list of tables",
}


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
    learning_objectives: List[str]
    prerequisites: List[str]
    chapters: List[ChapterDraft]


def _is_skip_title(title: str) -> bool:
    return title.strip().lower() in _SKIP_TITLES


def _build_from_toc(toc: list) -> List[ChapterDraft]:
    """
    Build ChapterDraft list from PyMuPDF TOC.
    TOC items are (level, title, page) tuples.
    - level 1: Parts (skip, use as chapter grouping label only)
    - level 2: Chapters → ChapterDraft
    - level 3: Sections → TopicDraft
    - level 4+: Subsections → LessonDraft inside their parent topic
    """
    chapters: List[ChapterDraft] = []
    current_chapter: Optional[ChapterDraft] = None
    current_topic: Optional[TopicDraft] = None
    ch_order = 0
    tp_order = 0
    ls_order = 0

    for level, title, _page in toc:
        title = title.strip()
        if not title:
            continue

        if level == 1:
            # Part heading — skip, not a real chapter
            continue

        elif level == 2:
            if _is_skip_title(title):
                continue
            # New chapter
            ch_order += 1
            tp_order = 0
            current_topic = None
            current_chapter = ChapterDraft(title=title, order=ch_order, topics=[])
            chapters.append(current_chapter)

        elif level == 3:
            if current_chapter is None:
                continue
            tp_order += 1
            ls_order = 0
            current_topic = TopicDraft(title=title, order=tp_order, lessons=[])
            current_chapter.topics.append(current_topic)

        elif level >= 4:
            # Subsection becomes a lesson inside the current topic
            if current_topic is None:
                # No topic yet — create a generic one under the current chapter
                if current_chapter is None:
                    continue
                tp_order += 1
                current_topic = TopicDraft(title=current_chapter.title, order=tp_order, lessons=[])
                current_chapter.topics.append(current_topic)
            ls_order += 1
            current_topic.lessons.append(
                LessonDraft(title=title, content=f"Study of {title}.", order=ls_order)
            )

    # Post-process: Any chapter that has topics but no lessons in those topics
    # → convert the topic itself into a single lesson
    for ch in chapters:
        for tp in ch.topics:
            if not tp.lessons:
                tp.lessons.append(LessonDraft(title=tp.title, content=f"Study of {tp.title}.", order=1))
        # Any chapter with no topics → add one default topic with one lesson
        if not ch.topics:
            ch.topics.append(TopicDraft(
                title=ch.title,
                order=1,
                lessons=[LessonDraft(title=ch.title, content=f"Study of {ch.title}.", order=1)]
            ))

    return chapters


def _ai_metadata(text_sample: str, filename: str) -> dict:
    """Ask AI only for course metadata (title, description, etc.) — a small, bounded request."""
    system = "You are a course metadata generator. Respond ONLY with valid JSON, no markdown fences."
    prompt = f"""Based on this content from '{filename}', return metadata JSON:
{{
  "title": "Course title",
  "description": "2-3 sentence description",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimated_time": <total minutes as integer>,
  "learning_objectives": ["objective 1", "objective 2", "objective 3"],
  "prerequisites": ["prerequisite 1", "prerequisite 2"]
}}

Content sample:
{text_sample[:3000]}"""

    try:
        raw = generate(prompt, system, temperature=0.2)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        return json.loads(raw.strip())
    except Exception as e:
        logger.warning(f"[StructureAgent] AI metadata failed: {e}")
        return {
            "title": filename.replace(".pdf", "").replace("_", " ").title(),
            "description": "A comprehensive course generated from your uploaded PDF.",
            "difficulty": "Intermediate",
            "estimated_time": 600,
            "learning_objectives": ["Understand core concepts", "Apply knowledge practically"],
            "prerequisites": ["Basic reading comprehension"],
        }


def _ai_full_structure(text_sample: str, filename: str) -> StructureDraft:
    """Fallback: use AI to generate full structure (for PDFs without bookmarks)."""
    system = (
        "You are an expert instructional designer. You create structured course outlines. "
        "Always respond with valid JSON only — no markdown fences."
    )
    prompt = f"""Analyze this content from '{filename}' and design a complete course outline.

IMPORTANT: Generate chapters for EVERY major topic found. Do NOT truncate.

Return JSON:
{{
  "title": "Course title",
  "description": "2-3 sentence description",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimated_time": <minutes as integer>,
  "learning_objectives": ["obj 1", "obj 2"],
  "prerequisites": ["req 1"],
  "chapters": [
    {{
      "title": "Chapter title",
      "order": 1,
      "topics": [
        {{
          "title": "Topic title",
          "order": 1,
          "lessons": [
            {{"title": "Lesson title", "content": "1-2 sentence description", "order": 1}}
          ]
        }}
      ]
    }}
  ]
}}

Content:
{text_sample[:8000]}"""

    raw = generate(prompt, system, temperature=0.3)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    data = json.loads(raw.strip())
    return StructureDraft(**data)


def build_structure(text_chunks: List[str], *, filename: str, pdf_path: str | None = None) -> StructureDraft:
    """
    Build a course structure from a PDF.
    Uses native PDF bookmarks when available (deterministic, complete).
    Falls back to AI generation for PDFs without bookmarks.
    """
    toc_chapters: List[ChapterDraft] = []

    # --- Strategy 1: Native PDF Bookmarks ---
    if pdf_path:
        try:
            import fitz
            doc = fitz.open(str(pdf_path))
            toc = doc.get_toc()
            doc.close()

            if toc and len(toc) >= 3:
                logger.info(f"[StructureAgent] PDF has {len(toc)} TOC entries — using native bookmarks")
                toc_chapters = _build_from_toc(toc)
                logger.info(f"[StructureAgent] Built {len(toc_chapters)} chapters from PDF bookmarks")
        except Exception as e:
            logger.warning(f"[StructureAgent] Could not read PDF bookmarks: {e}")

    # --- Get metadata (always use AI for metadata, it's a small request) ---
    text_sample = "\n\n".join(text_chunks[:10])

    if toc_chapters:
        meta = _ai_metadata(text_sample, filename)
        return StructureDraft(
            title=meta.get("title", filename),
            description=meta.get("description", ""),
            difficulty=meta.get("difficulty", "Intermediate"),
            estimated_time=meta.get("estimated_time", 600),
            learning_objectives=meta.get("learning_objectives", []),
            prerequisites=meta.get("prerequisites", []),
            chapters=toc_chapters,
        )

    # --- Strategy 2: AI-based generation (no bookmarks) ---
    logger.info("[StructureAgent] No PDF bookmarks found — falling back to AI structure generation")
    return _ai_full_structure(text_sample, filename)
