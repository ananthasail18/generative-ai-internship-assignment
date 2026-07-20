from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import ChatSession, ChatMessage, User, Lesson, Course, Chapter, Topic
from app.schemas.chat import (
    ChatSessionRead,
    ChatSessionCreate,
    ChatMessageRead,
    ChatMessageCreate,
)
from app.utils.deps import get_current_user
from app.services.agents.chat_agent import get_chat_response
import json

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/sessions", response_model=List[ChatSessionRead])
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc()).all()
    return sessions

@router.post("/sessions", response_model=ChatSessionRead)
def create_chat_session(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = "New Chat"
    if data.lesson_id:
        lesson = db.query(Lesson).filter(Lesson.id == data.lesson_id).first()
        if lesson:
            title = f"Chat about {lesson.title}"
    elif data.course_id:
        course = db.query(Course).filter(Course.id == data.course_id).first()
        if course:
            title = f"Chat about {course.title}"

    session = ChatSession(
        user_id=current_user.id,
        title=title,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions/{session_id}", response_model=ChatSessionRead)
def get_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

@router.post("/sessions/{session_id}/message", response_model=ChatMessageRead)
def send_message(
    session_id: int,
    message: ChatMessageCreate,
    lesson_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Add user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=message.content)
    db.add(user_msg)
    
    # Update session updated_at
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user_msg)
    
    # Gather context
    context_text = ""
    if lesson_id:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if lesson:
            context_text += f"Lesson Title: {lesson.title}\n\n"
            if lesson.content:
                context_text += f"Content:\n{lesson.content}\n\n"
            if lesson.explanation:
                context_text += f"Explanation:\n{lesson.explanation}\n\n"
            if lesson.concepts:
                context_text += f"Concepts:\n{json.dumps(lesson.concepts, indent=2)}\n\n"
    
    # Get previous messages for history
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at).all()
    messages_payload = [{"role": msg.role, "content": msg.content} for msg in history]
    
    # Call Gemini
    try:
        ai_response_text = get_chat_response(messages=messages_payload, context_text=context_text)
    except Exception as e:
        ai_response_text = f"Sorry, I encountered an error communicating with the AI backend: {str(e)}"
        
    # Save AI message
    ai_msg = ChatMessage(session_id=session.id, role="assistant", content=ai_response_text)
    db.add(ai_msg)
    
    # Update session updated_at again
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ai_msg)
    
    return ai_msg
