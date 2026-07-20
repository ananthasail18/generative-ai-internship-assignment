"""Orchestrator — Full AI pipeline using OpenRouter.

Runs after upload to generate real AI course content.
Progress is written to the pipeline_jobs table after every lesson so the
frontend can poll /api/pipeline/status/{document_id} for live updates.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.services.pdf_service import extract_page_texts
from app.services.agents.structure_agent import build_structure
from app.services.agents.lesson_agent import draft_lesson
from app.services.agents.story_agent import enrich
from app.services.agents.quiz_agent import generate_quiz
from app.services.agents.review_agent import review_course
from app.models import (
    Document, Course, Chapter, Topic, Lesson,
    Story, Flashcard, QuizQuestion, PipelineJob,
)

logger = logging.getLogger(__name__)


def _upsert_job(db: Session, document_id: int, **kwargs) -> PipelineJob:
    """Create or update the PipelineJob row for this document."""
    job = db.query(PipelineJob).filter(PipelineJob.document_id == document_id).first()
    if job is None:
        job = PipelineJob(document_id=document_id, **kwargs)
        db.add(job)
    else:
        for k, v in kwargs.items():
            setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


def run_pipeline(document_id: int, *, db: Session) -> None:
    """Kick off the full AI course-generation pipeline and persist results."""
    logger.info(f"[Pipeline] Starting for document {document_id}")

    # Mark job as running
    _upsert_job(db, document_id, status="running", stage="Starting…", lessons_done=0, lessons_total=0)

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        logger.error(f"[Pipeline] Document {document_id} not found.")
        _upsert_job(db, document_id, status="failed", error="Document not found",
                    finished_at=datetime.now(timezone.utc))
        return

    # 1. Extract text
    _upsert_job(db, document_id, stage="Extracting PDF text…")
    try:
        text_chunks = extract_page_texts(document.file_path)
        if not text_chunks:
            _upsert_job(db, document_id, status="failed", error="No text extracted",
                        finished_at=datetime.now(timezone.utc))
            return
    except Exception as e:
        logger.error(f"[Pipeline] Failed to extract text: {e}")
        _upsert_job(db, document_id, status="failed", error=str(e),
                    finished_at=datetime.now(timezone.utc))
        return

    logger.info(f"[Pipeline] Extracted {len(text_chunks)} page chunks")

    # 2. Check for existing course
    existing_course = db.query(Course).filter(Course.document_id == document_id).first()
    
    # If it's the auto-generated placeholder course from upload, delete it
    if existing_course and existing_course.description and "Auto-drafted course scaffold" in existing_course.description:
        db.delete(existing_course)
        db.commit()
        existing_course = None

    if not existing_course:
        # Build structure if not exists
        _upsert_job(db, document_id, stage="Building course structure with AI…")
        try:
            structure_draft = build_structure(text_chunks, filename=document.filename)
            logger.info(f"[Pipeline] Structure built: {structure_draft.title}")
        except Exception as e:
            logger.error(f"[Pipeline] Structure agent failed: {e}")
            _upsert_job(db, document_id, status="failed", error=f"Structure failed: {e}",
                        finished_at=datetime.now(timezone.utc))
            return
            
        # Create empty hierarchy
        course = Course(
            document_id=document.id,
            title=structure_draft.title,
            description=structure_draft.description,
            difficulty=structure_draft.difficulty,
            estimated_time=structure_draft.estimated_time,
        )
        db.add(course)
        db.flush()

        for ch_draft in structure_draft.chapters:
            chapter = Chapter(course_id=course.id, title=ch_draft.title, order=ch_draft.order)
            db.add(chapter)
            db.flush()
            for tp_draft in ch_draft.topics:
                topic = Topic(chapter_id=chapter.id, title=tp_draft.title, order=tp_draft.order)
                db.add(topic)
                db.flush()
                for ls_draft in tp_draft.lessons:
                    lesson = Lesson(topic_id=topic.id, title=ls_draft.title, order=ls_draft.order, content=None)
                    db.add(lesson)
                    db.flush()
        db.commit()
        existing_course = course

    # 3. Retrieve all lessons in order
    lessons = (
        db.query(Lesson)
        .join(Topic)
        .join(Chapter)
        .filter(Chapter.course_id == existing_course.id)
        .order_by(Chapter.order, Topic.order, Lesson.order)
        .all()
    )

    total_lessons = len(lessons)
    _upsert_job(db, document_id, stage="Resuming course generation…", lessons_total=total_lessons)

    # 4. Build chapters, topics, lessons with AI content
    lesson_counter = 0
    for lesson in lessons:
        lesson_counter += 1

        # Check if lesson is already successfully generated
        if lesson.content and "Content coming soon." not in lesson.content:
            logger.info(f"[Pipeline] Skipping lesson {lesson_counter}/{total_lessons} — {lesson.title} (already generated)")
            _upsert_job(db, document_id, lessons_done=lesson_counter)
            continue

        stage_label = f"✍️ Writing lesson {lesson_counter}/{total_lessons} — {lesson.title[:60]}"
        logger.info(f"[Pipeline] {stage_label}")
        _upsert_job(db, document_id, stage=stage_label, lessons_done=lesson_counter - 1)

        # Draft lesson content
        try:
            lesson_body = draft_lesson(lesson.title, text_chunks[:4])
            lesson.content = lesson_body.content
            lesson.introduction = lesson_body.introduction
            lesson.explanation = lesson_body.explanation
            lesson.key_takeaways = lesson_body.key_takeaways
            lesson.summary = lesson_body.summary
        except Exception as e:
            logger.warning(f"[Pipeline] Lesson agent failed for '{lesson.title}': {e}")
            lesson.content = f"# {lesson.title}\n\nContent coming soon."
            lesson.introduction = lesson.explanation = lesson.summary = None
            lesson.key_takeaways = []

        # Enrich with story
        try:
            # Check if story already exists to avoid unique constraint violations
            existing_story = db.query(Story).filter(Story.lesson_id == lesson.id).first()
            if not existing_story:
                enrichment = enrich(lesson.content, topic=lesson.topic.title)
                story = Story(
                    lesson_id=lesson.id,
                    analogy=enrichment.analogy,
                    story=enrichment.narrative,
                )
                db.add(story)
        except Exception as e:
            logger.warning(f"[Pipeline] Story agent failed: {e}")

        # Generate quiz + flashcards
        try:
            existing_flashcards = db.query(Flashcard).filter(Flashcard.lesson_id == lesson.id).count()
            if existing_flashcards == 0:
                quiz_data = generate_quiz(lesson.content)
                for fc in quiz_data.flashcards:
                    db.add(Flashcard(
                        lesson_id=lesson.id,
                        question=fc.front,
                        answer=fc.back,
                    ))
                for q in quiz_data.questions:
                    options_dict = {chr(65 + i): opt for i, opt in enumerate(q.options)}
                    correct_letter = chr(65 + q.answer_index)
                    db.add(QuizQuestion(
                        lesson_id=lesson.id,
                        question_type="MCQ",
                        question=q.question,
                        options=options_dict,
                        correct_answer=correct_letter,
                        explanation=q.explanation,
                        difficulty="Medium",
                    ))
        except Exception as e:
            logger.warning(f"[Pipeline] Quiz agent failed: {e}")

        # Commit each lesson immediately so progress is visible in real time
        db.commit()
        _upsert_job(db, document_id, lessons_done=lesson_counter)

    db.commit()
    _upsert_job(
        db, document_id,
        status="done",
        stage=f"✅ Course ready — {total_lessons} lessons generated",
        lessons_done=total_lessons,
        lessons_total=total_lessons,
        finished_at=datetime.now(timezone.utc),
    )
    logger.info(f"[Pipeline] Complete for document {document_id} — course '{existing_course.title}'")


def is_pipeline_enabled() -> bool:
    return True
