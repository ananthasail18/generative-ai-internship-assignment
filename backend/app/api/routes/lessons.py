"""Lesson retrieval & completion endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Chapter, Course, Flashcard, Lesson, Progress, QuizQuestion, Story, Topic, User
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
    return LessonRead.model_validate(
        {
            "id": lesson.id,
            "topic_id": lesson.topic_id,
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


@router.get("/lesson/{lesson_id}", response_model=LessonRead)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonRead:
    lesson = _get_owned_lesson(db, lesson_id, current_user.id)
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
    progress.completed_at = datetime.now(timezone.utc) if payload.completed else None
    db.commit()
    db.refresh(progress)
    return ProgressRead.model_validate(progress)
