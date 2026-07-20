"""Pydantic schemas for authentication flows."""
from typing import Optional

from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserRead


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OAuthLoginRequest(BaseModel):
    provider: str = Field(..., pattern=r"^(google|github)$")
    redirect_after: Optional[str] = None


class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserRead] = None
