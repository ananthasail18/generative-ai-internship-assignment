"""Aggregated Pydantic schema exports."""
from app.schemas.auth import (
    LoginRequest,
    OAuthCallbackRequest,
    OAuthLoginRequest,
    SignupRequest,
    TokenResponse,
)
from app.schemas.course import (
    ChapterRead,
    CourseDetailRead,
    CourseRead,
    DashboardProgress,
    DocumentRead,
    LessonProgressUpdate,
    LessonRead,
    ProgressRead,
    TopicRead,
)
from app.schemas.user import UserRead
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ChatSessionCreate,
    ChatSessionRead,
)

__all__ = [
    "ChapterRead",
    "ChatMessageCreate",
    "ChatMessageRead",
    "ChatSessionCreate",
    "ChatSessionRead",
    "CourseDetailRead",
    "CourseRead",
    "DashboardProgress",
    "DocumentRead",
    "LessonProgressUpdate",
    "LessonRead",
    "LoginRequest",
    "OAuthCallbackRequest",
    "OAuthLoginRequest",
    "ProgressRead",
    "SignupRequest",
    "TokenResponse",
    "TopicRead",
    "UserRead",
]
