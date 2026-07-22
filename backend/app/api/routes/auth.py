"""Authentication routes: email/password signup & login, OAuth, /me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserRead,
)
from app.services import oauth_service, user_service
from app.utils.jwt_utils import create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user: User) -> TokenResponse:
    token = create_access_token(user.id, extra={"email": user.email})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    if user_service.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = user_service.create_user(
        db, name=payload.name, email=payload.email, password=payload.password
    )
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = user_service.authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _token_for(user)


@router.get("/google", include_in_schema=False)
def google_login() -> RedirectResponse:
    url = oauth_service.google_authorize_url(state="google")
    return RedirectResponse(url)


@router.get("/github", include_in_schema=False)
def github_login() -> RedirectResponse:
    url = oauth_service.github_authorize_url(state="github")
    return RedirectResponse(url)


from fastapi.responses import RedirectResponse, JSONResponse
import httpx

import traceback

@router.get("/google/callback", include_in_schema=False)
async def google_callback(code: str, db: Session = Depends(get_db)):
    try:
        try:
            access_token_g = await oauth_service.exchange_google_code(code)
            profile = await oauth_service.fetch_google_profile(access_token_g)
        except httpx.HTTPStatusError as e:
            try:
                error_details = e.response.json()
            except Exception:
                error_details = e.response.text
            return JSONResponse(status_code=400, content={"detail": f"Google API Error: {error_details}"})
            
        user = user_service.upsert_oauth_user(
            db,
            provider=profile.provider,
            subject=profile.subject,
            email=profile.email,
            name=profile.name,
            image=profile.image,
        )
        return oauth_redirect(create_access_token(user.id, extra={"email": user.email}))
    except Exception as e:
        error_msg = traceback.format_exc()
        return JSONResponse(status_code=500, content={"detail": f"Server Error during callback: {error_msg}"})


@router.get("/github/callback", include_in_schema=False)
async def github_callback(code: str, db: Session = Depends(get_db)) -> RedirectResponse:
    access_token_g = await oauth_service.exchange_github_code(code)
    profile = await oauth_service.fetch_github_profile(access_token_g)
    user = user_service.upsert_oauth_user(
        db,
        provider=profile.provider,
        subject=profile.subject,
        email=profile.email,
        name=profile.name,
        image=profile.image,
    )
    # Redirect to frontend with the new JWT token
    return oauth_redirect(create_access_token(user.id, extra={"email": user.email}))


def oauth_redirect(token: str) -> RedirectResponse:
    # Send the JWT back to the frontend via query param so the SPA can persist it.
    frontend_str = str(settings.frontend_url).rstrip("/")
    sep = "&" if "?" in frontend_str else "?"
    url = f"{frontend_str}/auth/callback{sep}token={token}"
    return RedirectResponse(url)


@router.get("/google/redirect", include_in_schema=False)
async def google_redirect(code: str, db: Session = Depends(get_db)) -> RedirectResponse:
    token = await oauth_service.exchange_google_code(code)
    profile = await oauth_service.fetch_google_profile(token)
    user = user_service.upsert_oauth_user(
        db,
        provider=profile.provider,
        subject=profile.subject,
        email=profile.email,
        name=profile.name,
        image=profile.image,
    )
    return oauth_redirect(create_access_token(user.id))
