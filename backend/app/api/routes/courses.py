"""Courses & course detail endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, User
from app.schemas import CourseDetailRead, CourseRead
from app.services.queries import course_to_detail_read, course_to_read, find_course_for_user
from app.utils.deps import get_current_user


router = APIRouter(tags=["courses"])


@router.get("/courses", response_model=List[CourseRead])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[CourseRead]:
    courses = (
        db.query(Course)
        .join(Course.document)
        .filter(Course.document.has(user_id=current_user.id))
        .order_by(Course.created_at.desc())
        .all()
    )
    return [CourseRead.model_validate(course_to_read(db, c, current_user.id)) for c in courses]


@router.get("/course/{course_id}", response_model=CourseDetailRead)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseDetailRead:
    course = find_course_for_user(db, course_id, current_user.id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return CourseDetailRead.model_validate(course_to_detail_read(db, course, current_user.id))
