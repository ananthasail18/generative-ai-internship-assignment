"""Read-model helpers shared by courses/lessons/progress routes."""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Chapter, Course, Document, Lesson, Progress, Topic, User


def compute_course_progress(db: Session, course: Course, user_id: int) -> tuple[int, int, float]:
    lesson_ids = (
        db.query(Lesson.id)
        .join(Topic, Topic.id == Lesson.topic_id)
        .join(Chapter, Chapter.id == Topic.chapter_id)
        .filter(Chapter.course_id == course.id)
        .all()
    )
    lesson_ids = [row[0] for row in lesson_ids]
    total = len(lesson_ids)
    if total == 0:
        return 0, 0, 0.0
    completed = (
        db.query(Progress)
        .filter(
            Progress.user_id == user_id,
            Progress.lesson_id.in_(lesson_ids),
            Progress.completed.is_(True),
        )
        .count()
    )
    return total, completed, (completed / total) * 100.0


def course_to_read(db: Session, course: Course, user_id: int) -> dict:
    total, completed, percent = compute_course_progress(db, course, user_id)
    return {
        "id": course.id,
        "document_id": course.document_id,
        "title": course.title,
        "description": course.description,
        "difficulty": course.difficulty,
        "estimated_time": course.estimated_time,
        "created_at": course.created_at,
        "total_lessons": total,
        "completed_lessons": completed,
        "progress_percent": round(percent, 2),
    }


def course_to_detail_read(db: Session, course: Course, user_id: int) -> dict:
    base = course_to_read(db, course, user_id)
    base["chapters"] = []
    completed_ids = {
        row[0]
        for row in db.query(Progress.lesson_id)
        .filter(Progress.user_id == user_id, Progress.completed.is_(True))
        .all()
    }
    time_spent_map = {
        row[0]: row[1]
        for row in db.query(Progress.lesson_id, Progress.time_spent)
        .filter(Progress.user_id == user_id)
        .all()
    }
    for chapter in course.chapters:
        ch = {
            "id": chapter.id,
            "course_id": chapter.course_id,
            "title": chapter.title,
            "order": chapter.order,
            "topics": [],
        }
        for topic in chapter.topics:
            tp = {
                "id": topic.id,
                "chapter_id": topic.chapter_id,
                "title": topic.title,
                "order": topic.order,
                "lessons": [],
            }
            for lesson in topic.lessons:
                tp["lessons"].append(
                    {
                        "id": lesson.id,
                        "topic_id": lesson.topic_id,
                        "title": lesson.title,
                        "content": lesson.content,
                        "order": lesson.order,
                        "completed": lesson.id in completed_ids,
                        "time_spent": time_spent_map.get(lesson.id, 0),
                    }
                )
            ch["topics"].append(tp)
        base["chapters"].append(ch)
    return base


def flat_lessons(db: Session, course_id: int) -> List[Lesson]:
    rows = (
        db.query(Lesson)
        .join(Topic, Topic.id == Lesson.topic_id)
        .join(Chapter, Chapter.id == Topic.chapter_id)
        .filter(Chapter.course_id == course_id)
        .order_by(Chapter.order, Topic.order, Lesson.order)
        .all()
    )
    return rows


def find_course_for_user(db: Session, course_id: int, user_id: int) -> Optional[Course]:
    course = db.get(Course, course_id)
    if course is None:
        return None
    return course


def next_and_prev_lessons(
    flat: List[Lesson], lesson_id: int
) -> tuple[Optional[Lesson], Optional[Lesson]]:
    prev_lesson: Optional[Lesson] = None
    next_lesson: Optional[Lesson] = None
    for i, ls in enumerate(flat):
        if ls.id == lesson_id:
            if i > 0:
                prev_lesson = flat[i - 1]
            if i < len(flat) - 1:
                next_lesson = flat[i + 1]
            break
    return prev_lesson, next_lesson
