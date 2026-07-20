"""PDF upload route.

Receives a PDF, validates type & size, persists to the local uploads folder,
extracts metadata using PyMuPDF, stores a Document row, creates a
placeholder course scaffold immediately, then triggers the AI pipeline
in a background thread.
"""
from __future__ import annotations

import secrets
import time
import threading
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, SessionLocal
from app.models import Document, User
from app.schemas import DocumentRead
from app.services import course_service, pdf_service
from app.services.orchestrator import run_pipeline
from app.utils.deps import get_current_user


router = APIRouter(tags=["upload"])


ALLOWED_CONTENT_TYPES = {"application/pdf"}
ALLOWED_EXT = ".pdf"


def _validate_file(upload: UploadFile) -> None:
    name = (upload.filename or "").lower()
    if not name.endswith(ALLOWED_EXT):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")
    if upload.content_type and upload.content_type not in ALLOWED_CONTENT_TYPES:
        if upload.content_type != "application/octet-stream":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")


def _run_pipeline_in_background(document_id: int) -> None:
    """Spawn a background thread to run the AI pipeline without blocking the upload response."""
    def _worker():
        db = SessionLocal()
        try:
            run_pipeline(document_id, db=db)
        except Exception as e:
            import logging
            logging.getLogger("courseforge").error(f"[Background pipeline] Error for doc {document_id}: {e}")
        finally:
            db.close()

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
) -> DocumentRead:
    _validate_file(file)
    upload_dir = settings.upload_path
    safe_name = (file.filename or "upload.pdf").replace("\\", "/").split("/")[-1]
    stem = Path(safe_name).stem
    token = secrets.token_hex(6)
    saved_name = f"{stem}_{int(time.time())}_{token}{ALLOWED_EXT}"
    saved_path = upload_dir / saved_name

    bytes_total = 0
    max_bytes = settings.max_upload_bytes
    with saved_path.open("wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            bytes_total += len(chunk)
            if bytes_total > max_bytes:
                out.close()
                try:
                    saved_path.unlink()
                except FileNotFoundError:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds the maximum allowed size of {settings.max_upload_mb} MB",
                )
            out.write(chunk)

    try:
        meta = pdf_service.extract_metadata(saved_path)
    except Exception:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read PDF. The file may be corrupt or password-protected.",
        )

    title = meta.title or pdf_service.infer_title_from_first_page(saved_path, fallback=stem)

    doc = Document(
        user_id=current_user.id,
        filename=safe_name,
        file_path=str(saved_path),
        file_size=meta.file_size,
        page_count=meta.page_count,
        title=title,
        author=meta.author,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Create a placeholder course immediately so the user sees something right away
    course_service.generate_placeholder_course(db, doc)

    # Kick off the real AI pipeline in the background
    _run_pipeline_in_background(doc.id)

    return DocumentRead.model_validate({**doc.__dict__, "has_course": True})
