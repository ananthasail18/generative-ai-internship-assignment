"""Documents listing for the current user."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, User
from app.schemas import DocumentRead
from app.utils.deps import get_current_user


router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=List[DocumentRead])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[DocumentRead]:
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.upload_date.desc())
        .all()
    )
    out = []
    for d in docs:
        out.append(
            DocumentRead.model_validate({**d.__dict__, "has_course": d.course is not None})
        )
    return out
