"""Aggregate API routers and the root health endpoint."""
from fastapi import APIRouter

from app.api.routes import auth, courses, documents, lessons, pipeline, progress, upload, users, chat, search


api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(upload.router)
api_router.include_router(documents.router)
api_router.include_router(courses.router)
api_router.include_router(lessons.router)
api_router.include_router(progress.router)
api_router.include_router(chat.router)
api_router.include_router(search.router)
api_router.include_router(pipeline.router)


@api_router.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": "CourseForge API"}


@api_router.get("/agents", tags=["meta"])
def agents_overview() -> dict:
    """Documents the (future) AI pipeline shape for the frontend."""
    return {
        "enabled": False,
        "pipeline": [
            "extract_text",
            "chunk_text",
            "orchestrator (OpenSwarm)",
            "structure_agent",
            "lesson_agent",
            "story_agent",
            "quiz_agent",
            "review_agent",
            "store_course",
        ],
    }


router = api_router
