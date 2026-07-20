"""Full-text search across courses, chapters, topics, and lessons."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models import Course, Chapter, Topic, Lesson, Document, User
from app.utils.deps import get_current_user
from pydantic import BaseModel

router = APIRouter(tags=["search"])


class SearchResult(BaseModel):
    type: str  # 'course' | 'chapter' | 'topic' | 'lesson'
    id: int
    title: str
    subtitle: Optional[str] = None
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None  # used for lessons to navigate directly

    model_config = {"from_attributes": True}


@router.get("/search", response_model=List[SearchResult])
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search across courses, chapters, topics, and lessons for the current user."""
    term = f"%{q.lower()}%"
    results: List[SearchResult] = []

    # Get user's course IDs to filter results
    user_courses = (
        db.query(Course)
        .join(Course.document)
        .filter(Document.user_id == current_user.id)
        .all()
    )
    user_course_ids = {c.id for c in user_courses}

    if not user_course_ids:
        return []

    # Search Courses
    courses = (
        db.query(Course)
        .filter(
            Course.id.in_(user_course_ids),
            or_(
                func.lower(Course.title).like(term),
                func.lower(Course.description).like(term),
            ),
        )
        .limit(5)
        .all()
    )
    for c in courses:
        results.append(SearchResult(
            type="course",
            id=c.id,
            title=c.title,
            subtitle=c.description[:80] + "..." if c.description and len(c.description) > 80 else c.description,
            course_id=c.id,
        ))

    # Search Chapters
    chapters = (
        db.query(Chapter)
        .filter(
            Chapter.course_id.in_(user_course_ids),
            func.lower(Chapter.title).like(term),
        )
        .limit(5)
        .all()
    )
    for ch in chapters:
        course = db.get(Course, ch.course_id)
        results.append(SearchResult(
            type="chapter",
            id=ch.id,
            title=ch.title,
            subtitle=f"Chapter in {course.title}" if course else None,
            course_id=ch.course_id,
        ))

    # Search Topics
    topics = (
        db.query(Topic)
        .join(Topic.chapter)
        .filter(
            Chapter.course_id.in_(user_course_ids),
            func.lower(Topic.title).like(term),
        )
        .limit(5)
        .all()
    )
    for tp in topics:
        chapter = db.get(Chapter, tp.chapter_id)
        course = db.get(Course, chapter.course_id) if chapter else None
        results.append(SearchResult(
            type="topic",
            id=tp.id,
            title=tp.title,
            subtitle=f"Topic in {chapter.title}" if chapter else None,
            course_id=course.id if course else None,
        ))

    # Search Lessons
    lessons = (
        db.query(Lesson)
        .join(Lesson.topic)
        .join(Topic.chapter)
        .filter(
            Chapter.course_id.in_(user_course_ids),
            or_(
                func.lower(Lesson.title).like(term),
                func.lower(Lesson.content).like(term),
            ),
        )
        .limit(8)
        .all()
    )
    for ls in lessons:
        topic = db.get(Topic, ls.topic_id)
        chapter = db.get(Chapter, topic.chapter_id) if topic else None
        course = db.get(Course, chapter.course_id) if chapter else None
        results.append(SearchResult(
            type="lesson",
            id=ls.id,
            title=ls.title,
            subtitle=f"Lesson in {topic.title}" if topic else None,
            course_id=course.id if course else None,
            lesson_id=ls.id,
        ))

    return results
