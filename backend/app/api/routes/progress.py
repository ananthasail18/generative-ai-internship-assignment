"""Progress & dashboard aggregates."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Chapter, Course, Lesson, Progress, Topic
from app.schemas import CourseRead, DashboardProgress, ProgressRead
from app.services.queries import compute_course_progress, course_to_read
from app.utils.deps import get_current_user


router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=DashboardProgress)
def get_dashboard_progress(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> DashboardProgress:
    user_id = current_user.id
    courses = (
        db.query(Course)
        .join(Course.document)
        .filter(Course.document.has(user_id=user_id))
        .order_by(Course.created_at.desc())
        .all()
    )
    rows = []
    total_completed = 0
    total_lessons = 0
    continue_learning: List[CourseRead] = []
    for c in courses:
        t, comp, pct = compute_course_progress(db, c, user_id)
        total_lessons += t
        total_completed += comp
        rows.append((c, t, comp, pct, 0))
        if comp > 0 and comp < t:
            continue_learning.append(
                CourseRead.model_validate(course_to_read(db, c, user_id))
            )

    overall = (total_completed / total_lessons * 100.0) if total_lessons else 0.0
    return DashboardProgress(
        overall_progress_percent=round(overall, 2),
        total_courses=len(courses),
        total_lessons_completed=total_completed,
        total_lessons=total_lessons,
        continue_learning=continue_learning[:4],
    )


@router.get("/progress/list", response_model=List[ProgressRead])
def list_progress(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> List[ProgressRead]:
    rows = (
        db.query(Progress)
        .filter(Progress.user_id == current_user.id)
        .order_by(Progress.id.desc())
        .all()
    )
    return [ProgressRead.model_validate(r) for r in rows]
