"""Pipeline status endpoint — lets the frontend poll for live generation progress."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import PipelineJob, Document
from app.utils.deps import get_current_user
from app.models import User

router = APIRouter(tags=["pipeline"])


@router.get("/pipeline/status/{document_id}")
def get_pipeline_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify document belongs to user
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    job = db.query(PipelineJob).filter(PipelineJob.document_id == document_id).first()
    if not job:
        return {
            "document_id": document_id,
            "status": "not_started",
            "stage": None,
            "lessons_done": 0,
            "lessons_total": 0,
            "percent": 0,
            "error": None,
            "started_at": None,
            "finished_at": None,
        }

    percent = 0
    if job.lessons_total > 0:
        percent = round((job.lessons_done / job.lessons_total) * 100)

    return {
        "document_id": document_id,
        "status": job.status,
        "stage": job.stage,
        "lessons_done": job.lessons_done,
        "lessons_total": job.lessons_total,
        "percent": percent,
        "error": job.error,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }
