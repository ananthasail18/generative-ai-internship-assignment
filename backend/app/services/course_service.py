"""Course generation service.

NOTE: This is a placeholder generator that creates deterministic placeholder
chapters, topics and lessons for an uploaded document. It deliberately does NOT
call any AI agent. The AI pipeline (OpenSwarm orchestrator) will later replace
the `generate_placeholder_course` call in the upload flow.
"""
from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from app.models import Chapter, Course, Document, Lesson, Topic


def _placeholder_content(course_title: str, chapter_n: int, topic_n: int, lesson_n: int) -> str:
    return (
        f"# {course_title}\n\n"
        f"## Chapter {chapter_n} · Topic {topic_n} · Lesson {lesson_n}\n\n"
        "This lesson is a placeholder. Our AI course-generator agent will "
        "populate this space after the orchestration pipeline is wired in.\n\n"
        "When enabled, the pipeline will:\n\n"
        "1. Extract text from your PDF\n"
        "2. Chunk and analyze the content\n"
        "3. Run the Structure Agent to design chapters & topics\n"
        "4. Run the Lesson Agent to draft explanations\n"
        "5. Use the Storytelling Agent to enrich narrative\n"
        "6. Generate flashcards, quizzes, and a review pass\n\n"
        "Until then, use this lesson to navigate the platform, mark it "
        "complete, and continue to the next one."
    )


def generate_placeholder_course(db: Session, document: Document) -> Course:
    title = document.title or document.filename.replace(".pdf", "")
    course = Course(
        document_id=document.id,
        title=title,
        description=(
            f"Auto-drafted course scaffold generated from `{document.filename}`. "
            "AI-authored content will replace this placeholder once the agent "
            "pipeline is enabled."
        ),
        difficulty="Beginner",
        estimated_time=max(document.page_count, 10) * 2,
    )
    db.add(course)
    db.flush()

    n_chapters = 3
    n_topics = 2
    n_lessons = 2
    order_c = 0
    for c in range(1, n_chapters + 1):
        order_c += 1
        chapter = Chapter(course_id=course.id, title=f"Chapter {c}: Foundations", order=order_c)
        db.add(chapter)
        db.flush()
        order_t = 0
        for t in range(1, n_topics + 1):
            order_t += 1
            topic = Topic(
                chapter_id=chapter.id,
                title=f"Topic {c}.{t}: Key Concepts",
                order=order_t,
            )
            db.add(topic)
            db.flush()
            order_l = 0
            for l in range(1, n_lessons + 1):
                order_l += 1
                lesson = Lesson(
                    topic_id=topic.id,
                    title=f"Lesson {c}.{t}.{l}: Overview",
                    content=_placeholder_content(title, c, t, l),
                    order=order_l,
                )
                db.add(lesson)
    db.commit()
    db.refresh(course)
    return course
from app.services.agents.structure_agent import StructureDraft

def write_course_from_draft(db: Session, document_id: int, draft: StructureDraft, lessons: dict, enrichments: dict, quizzes: dict, review: dict) -> Course:
    # Look up the document
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError("Document not found")
        
    course = Course(
        document_id=document.id,
        title=draft.title,
        description=draft.description,
        difficulty=draft.difficulty,
        estimated_time=draft.estimated_time,
    )
    db.add(course)
    db.flush()

    for c_idx, chapter_draft in enumerate(draft.chapters):
        chapter = Chapter(course_id=course.id, title=chapter_draft.title, order=chapter_draft.order)
        db.add(chapter)
        db.flush()
        
        for t_idx, topic_draft in enumerate(chapter_draft.topics):
            topic = Topic(
                chapter_id=chapter.id,
                title=topic_draft.title,
                order=topic_draft.order,
            )
            db.add(topic)
            db.flush()
            
            for l_idx, lesson_draft in enumerate(topic_draft.lessons):
                l_key = f"{chapter_draft.order}_{topic_draft.order}_{lesson_draft.order}"
                lesson_body = lessons.get(l_key)
                content = lesson_body.content if lesson_body else lesson_draft.content
                
                enrichment = enrichments.get(l_key)
                if enrichment:
                    content += f"\n\n### Analogy\n{enrichment.analogy}\n\n### Narrative\n{enrichment.narrative}"
                
                quiz = quizzes.get(l_key)
                if quiz:
                    content += "\n\n### Quiz & Flashcards\n(Generated and saved)"

                lesson = Lesson(
                    topic_id=topic.id,
                    title=lesson_draft.title,
                    content=content,
                    order=lesson_draft.order,
                )
                db.add(lesson)
    db.commit()
    db.refresh(course)
    return course
