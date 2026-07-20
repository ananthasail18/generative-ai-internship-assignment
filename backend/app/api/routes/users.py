"""Return the currently authenticated user."""
from fastapi import APIRouter, Depends

from app.models import User
from app.schemas import UserRead
from app.utils.deps import get_current_user


router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
