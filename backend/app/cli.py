"""Database management CLI.

Usage:
    python -m app.cli init    # create all tables (dev only)
    python -m app.cli drop     # drop all tables (dev only, destructive)
    python -m app.cli seedtest # create a demo user + course for manual testing
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import Base, engine, SessionLocal
from app.models import Chapter, Course, Document, Lesson, Topic, User
from app.utils.security import hash_password


def init_db() -> None:
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")


def drop_db() -> None:
    import app.models  # noqa: F401
    Base.metadata.drop_all(bind=engine)
    print("✓ Tables dropped")


def seed_test() -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == "demo@courseforge.dev"))
        if existing:
            print("Demo user already exists.")
            return
        user = User(
            name="Demo Learner",
            email="demo@courseforge.dev",
            password_hash=hash_password("password123"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        doc = Document(
            user_id=user.id,
            filename="intro-to-ml.pdf",
            file_path="uploads/demo.pdf",
            file_size=1024 * 1024,
            page_count=12,
            title="Introduction to Machine Learning",
            author="CourseForge",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        course = Course(
            document_id=doc.id,
            title="Introduction to Machine Learning",
            description="A placeholder course generated from the demo PDF.",
            difficulty="Beginner",
            estimated_time=120,
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        ch = Chapter(course_id=course.id, title="Chapter 1 · Foundations", order=1)
        db.add(ch); db.commit(); db.refresh(ch)
        tp = Topic(chapter_id=ch.id, title="Topic 1.1 · What is ML?", order=1)
        db.add(tp); db.commit(); db.refresh(tp)
        ls = Lesson(
            topic_id=tp.id,
            title="Lesson 1.1.1 · Defining Machine Learning",
            content="# Defining Machine Learning\n\nWelcome! This is placeholder content.",
            order=1,
        )
        db.add(ls); db.commit()
        print("✓ Seeded demo user (demo@courseforge.dev / password123) and a course.")
    finally:
        db.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="courseforge-cli")
    parser.add_argument("cmd", choices=["init", "drop", "seedtest"])
    args = parser.parse_args(argv)
    if args.cmd == "init":
        init_db()
    elif args.cmd == "drop":
        drop_db()
    elif args.cmd == "seedtest":
        seed_test()
    return 0


if __name__ == "__main__":
    sys.exit(main())
