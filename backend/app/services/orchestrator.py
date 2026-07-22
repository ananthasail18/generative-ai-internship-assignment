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
from app.services.agents.mega_agent import generate_mega_lesson
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

    # Mark job as running (preserve counts if resuming)
    existing_job = db.query(PipelineJob).filter(PipelineJob.document_id == document_id).first()
    init_done = existing_job.lessons_done if existing_job else 0
    init_total = existing_job.lessons_total if existing_job else 0
    _upsert_job(db, document_id, status="running", stage="Starting…", lessons_done=init_done, lessons_total=init_total)

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
            structure_draft = build_structure(text_chunks, filename=document.filename, pdf_path=document.file_path)
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
            learning_objectives=structure_draft.learning_objectives,
            prerequisites=structure_draft.prerequisites,
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

    def _is_lesson_empty(lesson: Lesson) -> bool:
        """True if the lesson genuinely has no AI-generated content yet."""
        if not lesson.content:
            return True
        c = lesson.content.strip()
        if len(c) < 30:
            return True
        if "Content coming soon." in c:
            return True
        return False

    pending_lessons = [l for l in lessons if _is_lesson_empty(l)]
    already_done = total_lessons - len(pending_lessons)
    completed_counter = already_done

    _upsert_job(
        db, document_id,
        stage=f"🔄 Preparing to generate {len(pending_lessons)} lessons…",
        lessons_done=already_done,
        lessons_total=total_lessons,
    )
    logger.info(f"[Pipeline] {len(pending_lessons)} lessons to generate, {already_done} already done")

    if not pending_lessons:
        # Nothing to do — all lessons already have content
        _upsert_job(
            db, document_id,
            status="done",
            stage=f"✅ Course ready — {total_lessons} lessons generated",
            lessons_done=total_lessons,
            lessons_total=total_lessons,
            finished_at=datetime.now(timezone.utc),
        )
        logger.info(f"[Pipeline] All lessons already generated for document {document_id}")
        return

    # 4. Generate lesson content sequentially with a 4-second delay between
    #    each call to stay within Gemini's free-tier 15 RPM rate limit.
    #    Sequential is intentional: avoids Render's 15-minute thread timeout
    #    which was killing background ThreadPoolExecutor workers mid-batch.
    import time

    for l in pending_lessons:
        worker_db = SessionLocal()
        try:
            ls = worker_db.query(Lesson).filter(Lesson.id == l.id).first()
            if not ls or not _is_lesson_empty(ls):
                # Already generated by a previous run — skip and count it
                completed_counter += 1
                _upsert_job(
                    db, document_id,
                    stage=f"✍️ Generating course — {completed_counter}/{total_lessons} lessons done",
                    lessons_done=completed_counter,
                )
                continue

            # Find the most relevant PDF chunks for this specific lesson
            try:
                lesson_query = f"{ls.topic.title} {ls.title}".lower()
                query_terms = [t for t in lesson_query.split() if len(t) > 3]
                scores = [sum(chunk.lower().count(t) for t in query_terms) for chunk in text_chunks]
                top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:3]
                relevant_chunks = [text_chunks[i] for i in top_indices] if text_chunks else []
            except Exception:
                relevant_chunks = text_chunks[:3] if text_chunks else []

            logger.info(f"[Pipeline] Generating lesson {l.id}: {l.title}")
            mega_data = generate_mega_lesson(ls.title, relevant_chunks)

            # Persist all content fields
            ls.content       = mega_data.get("content", f"# {ls.title}")
            ls.introduction  = mega_data.get("introduction")
            ls.explanation   = mega_data.get("explanation")
            ls.key_takeaways = mega_data.get("key_takeaways", [])
            ls.important_notes = mega_data.get("important_notes", [])
            ls.examples      = mega_data.get("examples", {})
            ls.summary       = mega_data.get("summary")

            if "story" in mega_data:
                existing_story = worker_db.query(Story).filter(Story.lesson_id == ls.id).first()
                if not existing_story:
                    sd = mega_data["story"]
                    worker_db.add(Story(
                        lesson_id=ls.id,
                        analogy=sd.get("analogy"),
                        story=sd.get("narrative"),
                    ))

            if worker_db.query(Flashcard).filter(Flashcard.lesson_id == ls.id).count() == 0:
                for fc in mega_data.get("flashcards", []):
                    worker_db.add(Flashcard(
                        lesson_id=ls.id,
                        question=fc.get("front"),
                        answer=fc.get("back"),
                    ))
                for q in mega_data.get("quiz", []):
                    opts = q.get("options", [])
                    options_dict = {chr(65 + i): opt for i, opt in enumerate(opts)}
                    answer_idx = q.get("answer_index", 0)
                    correct_letter = chr(65 + answer_idx) if answer_idx < len(opts) else "A"
                    worker_db.add(QuizQuestion(
                        lesson_id=ls.id,
                        question_type="MCQ",
                        question=q.get("question"),
                        options=options_dict,
                        correct_answer=correct_letter,
                        explanation=q.get("explanation"),
                        difficulty="Medium",
                    ))

            worker_db.commit()
            completed_counter += 1
            _upsert_job(
                db, document_id,
                stage=f"✍️ Generating course — {completed_counter}/{total_lessons} lessons done",
                lessons_done=completed_counter,
            )
            logger.info(f"[Pipeline] ✓ Lesson {completed_counter}/{total_lessons}: {ls.title}")

        except Exception as e:
            logger.warning(f"[Pipeline] Error on lesson {l.id}: {e}")
            worker_db.rollback()
            # Don't increment counter — this lesson failed and stays pending
        finally:
            worker_db.close()

        # Rate-limit: 4 seconds between requests → max 15 RPM
        time.sleep(4)

    # Verify how many lessons actually have content now
    final_db = SessionLocal()
    try:
        final_lessons = (
            final_db.query(Lesson)
            .join(Topic).join(Chapter)
            .filter(Chapter.course_id == existing_course.id)
            .all()
        )
        actually_done = sum(1 for l in final_lessons if not _is_lesson_empty(l))
    finally:
        final_db.close()

    if actually_done == total_lessons:
        _upsert_job(
            db, document_id,
            status="done",
            stage=f"✅ Course ready — all {total_lessons} lessons generated",
            lessons_done=total_lessons,
            lessons_total=total_lessons,
            finished_at=datetime.now(timezone.utc),
        )
        logger.info(f"[Pipeline] ✅ Complete — all {total_lessons} lessons generated for '{existing_course.title}'")
    else:
        # Some lessons failed — mark as partial so the UI shows a warning instead of "done"
        _upsert_job(
            db, document_id,
            status="done",
            stage=f"⚠️ Partial — {actually_done}/{total_lessons} lessons generated (click lessons to generate missing ones)",
            lessons_done=actually_done,
            lessons_total=total_lessons,
            finished_at=datetime.now(timezone.utc),
        )
        logger.warning(f"[Pipeline] ⚠️ Partial — {actually_done}/{total_lessons} lessons generated for '{existing_course.title}'")


def is_pipeline_enabled() -> bool:
    return True
