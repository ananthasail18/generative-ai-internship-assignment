"""Pydantic schemas for documents, courses, lessons, and progress."""
from datetime import datetime
from typing import List, Optional, Any, Dict

from pydantic import BaseModel, ConfigDict, Field


# ----- Document -----
class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    filename: str
    file_size: int
    page_count: int
    title: Optional[str] = None
    author: Optional[str] = None
    upload_date: datetime
    has_course: bool = False


# ----- Lesson -----
class StoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    analogy: Optional[str] = None
    story: Optional[str] = None
    real_world_example: Optional[str] = None
    practical_application: Optional[str] = None
    beginner_explanation: Optional[str] = None

class FlashcardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: str
    quick_notes: Optional[str] = None
    memory_tricks: Optional[str] = None

class QuizQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_type: str
    question: str
    options: Optional[Any] = None
    correct_answer: str
    difficulty: Optional[str] = None
    explanation: Optional[str] = None


class LessonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    course_id: Optional[int] = None
    title: str
    content: str
    order: int
    completed: bool = False
    time_spent: int = 0
    
    introduction: Optional[str] = None
    explanation: Optional[str] = None
    concepts: Optional[Any] = None
    examples: Optional[Any] = None
    key_takeaways: Optional[Any] = None
    important_notes: Optional[Any] = None
    summary: Optional[str] = None
    
    stories: List[StoryRead] = []
    flashcards: List[FlashcardRead] = []
    quizzes: List[QuizQuestionRead] = []


class LessonProgressUpdate(BaseModel):
    completed: bool = True
    time_spent: int = Field(default=0, ge=0)
    quiz_score: Optional[int] = None


# ----- Topic -----
class TopicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chapter_id: int
    title: str
    order: int
    lessons: List[LessonRead] = []


# ----- Chapter -----
class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    order: int
    topics: List[TopicRead] = []


# ----- Course -----
class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    title: str
    description: Optional[str] = None
    difficulty: str = "Beginner"
    estimated_time: int = 0
    learning_objectives: Optional[Any] = None
    prerequisites: Optional[Any] = None
    created_at: datetime
    total_lessons: int = 0
    completed_lessons: int = 0
    progress_percent: float = 0.0


class CourseDetailRead(CourseRead):
    chapters: List[ChapterRead] = []


# ----- Progress -----
class ProgressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    lesson_id: int
    completed: bool
    completed_at: Optional[datetime] = None
    time_spent: int
    quiz_score: Optional[int] = None


class DashboardProgress(BaseModel):
    overall_progress_percent: float
    total_courses: int
    total_lessons_completed: int
    total_lessons: int
    total_time_spent_seconds: int = 0
    average_quiz_score: Optional[float] = None
    continue_learning: List[CourseRead] = []
