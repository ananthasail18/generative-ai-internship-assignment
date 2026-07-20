"""User & authentication service: email/password + OAuth upserts."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models import User
from app.utils.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    *,
    name: str,
    email: str,
    image: Optional[str] = None,
    password: Optional[str] = None,
    oauth_provider: Optional[str] = None,
    oauth_subject: Optional[str] = None,
) -> User:
    user = User(
        name=name,
        email=email,
        image=image,
        oauth_provider=oauth_provider,
        oauth_subject=oauth_subject,
    )
    if password:
        user.password_hash = hash_password(password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def upsert_oauth_user(
    db: Session,
    *,
    provider: str,
    subject: str,
    email: str,
    name: str,
    image: Optional[str] = None,
) -> User:
    user = get_user_by_email(db, email)
    if user is None:
        user = create_user(
            db,
            name=name or email.split("@")[0],
            email=email,
            image=image,
            oauth_provider=provider,
            oauth_subject=subject,
        )
    else:
        # Keep OAuth identity synced.
        user.oauth_provider = provider
        user.oauth_subject = subject
        if image and not user.image:
            user.image = image
        if name and not user.name:
            user.name = name
        db.commit()
        db.refresh(user)
    return user
