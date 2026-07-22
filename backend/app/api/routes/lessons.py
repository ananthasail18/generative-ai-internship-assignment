"""Lesson retrieval & completion endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Chapter, Course, Document, Flashcard, Lesson, Progress, QuizQuestion, Story, Topic, User
from app.schemas import LessonProgressUpdate, LessonRead, ProgressRead
from app.services.queries import find_course_for_user
from app.utils.deps import get_current_user


router = APIRouter(tags=["lessons"])


def _get_owned_lesson(db: Session, lesson_id: int, user_id: int) -> Lesson:
    lesson = (
        db.query(Lesson)
        .options(
            joinedload(Lesson.stories),
            joinedload(Lesson.flashcards),
            joinedload(Lesson.quizzes),
        )
        .filter(Lesson.id == lesson_id)
        .first()
    )
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    topic = db.get(Topic, lesson.topic_id)
    chapter = db.get(Chapter, topic.chapter_id)
    course = db.get(Course, chapter.course_id)
    if not find_course_for_user(db, course.id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


def _build_lesson_read(db: Session, lesson: Lesson, user_id: int) -> LessonRead:
    progress = (
        db.query(Progress)
        .filter(Progress.user_id == user_id, Progress.lesson_id == lesson.id)
        .first()
    )
    topic = db.get(Topic, lesson.topic_id)
    chapter = db.get(Chapter, topic.chapter_id) if topic else None
    course_id = chapter.course_id if chapter else None
    return LessonRead.model_validate(
        {
            "id": lesson.id,
            "topic_id": lesson.topic_id,
            "course_id": course_id,
            "title": lesson.title,
            "content": lesson.content,
            "order": lesson.order,
            "completed": bool(progress and progress.completed),
            "time_spent": progress.time_spent if progress else 0,
            # Rich AI content fields
            "introduction": lesson.introduction,
            "explanation": lesson.explanation,
            "concepts": lesson.concepts,
            "examples": lesson.examples,
            "key_takeaways": lesson.key_takeaways,
            "important_notes": lesson.important_notes,
            "summary": lesson.summary,
            # Related content
            "stories": lesson.stories,
            "flashcards": lesson.flashcards,
            "quizzes": lesson.quizzes,
        }
    )


def _generate_single_lesson_ondemand(db: Session, lesson: Lesson):
    """Generate lesson content on the fly if user opens an un-generated lesson."""
    try:
        import logging
        from app.services.agents.mega_agent import generate_mega_lesson
        from app.services.pdf_service import extract_page_texts
        
        topic = db.get(Topic, lesson.topic_id)
        chapter = db.get(Chapter, topic.chapter_id)
        course = db.get(Course, chapter.course_id)
        doc = db.get(Document, course.document_id)
        
        chunks = []
        if doc and doc.file_path:
            try:
                chunks = extract_page_texts(doc.file_path, max_pages=15)
            except Exception:
                pass
                
        mega_data = generate_mega_lesson(lesson.title, chunks)
        lesson.content = mega_data.get("content", f"# {lesson.title}")
        lesson.introduction = mega_data.get("introduction")
        lesson.explanation = mega_data.get("explanation")
        lesson.concepts = mega_data.get("concepts", {})
        lesson.key_takeaways = mega_data.get("key_takeaways", [])
        lesson.important_notes = mega_data.get("important_notes", [])
        lesson.examples = mega_data.get("examples", {})
        lesson.summary = mega_data.get("summary")
        
        if "story" in mega_data and not lesson.stories:
            sd = mega_data["story"]
            db.add(Story(lesson_id=lesson.id, analogy=sd.get("analogy"), story=sd.get("narrative")))
            
        if not lesson.flashcards:
            for fc in mega_data.get("flashcards", []):
                db.add(Flashcard(lesson_id=lesson.id, question=fc.get("front"), answer=fc.get("back")))
            for q in mega_data.get("quiz", []):
                opts = q.get("options", [])
                options_dict = {chr(65 + i): opt for i, opt in enumerate(opts)}
                answer_idx = q.get("answer_index", 0)
                correct_letter = chr(65 + answer_idx) if answer_idx < len(opts) else "A"
                db.add(QuizQuestion(lesson_id=lesson.id, question_type="MCQ", question=q.get("question"), options=options_dict, correct_answer=correct_letter, explanation=q.get("explanation"), difficulty="Medium"))
                
        db.commit()
        db.refresh(lesson)
    except Exception as e:
        import logging
        logging.getLogger("courseforge").warning(f"[OnDemand] Failed to generate lesson {lesson.id}: {e}")


@router.get("/lesson/{lesson_id}", response_model=LessonRead)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonRead:
    lesson = _get_owned_lesson(db, lesson_id, current_user.id)

    # Only block on generation if the lesson is truly empty (no content at all)
    truly_empty = (
        not lesson.content
        or "Content coming soon." in lesson.content
        or len((lesson.content or "").strip()) < 30
    )
    if truly_empty:
        # Generate synchronously only for truly empty lessons - rare case
        _generate_single_lesson_ondemand(db, lesson)
        lesson = _get_owned_lesson(db, lesson_id, current_user.id)

    # Return immediately with whatever content exists
    return _build_lesson_read(db, lesson, current_user.id)


@router.post("/lesson/{lesson_id}/complete", response_model=ProgressRead)
def mark_lesson_complete(
    lesson_id: int,
    payload: LessonProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressRead:
    lesson = _get_owned_lesson(db, lesson_id, current_user.id)
    progress = (
        db.query(Progress)
        .filter(Progress.user_id == current_user.id, Progress.lesson_id == lesson.id)
        .first()
    )
    if progress is None:
        progress = Progress(user_id=current_user.id, lesson_id=lesson.id)
        db.add(progress)
    progress.completed = payload.completed
    progress.time_spent = payload.time_spent
    if payload.quiz_score is not None:
        progress.quiz_score = payload.quiz_score
    progress.completed_at = datetime.now(timezone.utc) if payload.completed else None
    db.commit()
    db.refresh(progress)
    return ProgressRead.model_validate(progress)
