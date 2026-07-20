from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessageRead(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionRead(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[ChatMessageRead]] = []

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    lesson_id: Optional[int] = None
    course_id: Optional[int] = None

class ChatMessageCreate(BaseModel):
    content: str
