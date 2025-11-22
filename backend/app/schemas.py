from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from typing import Any, Optional
from datetime import datetime, date


class UserBase(BaseModel):
    email: EmailStr
    role: str


class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    exam_candidate: Optional[str] = None
    confirm_password: Optional[str] = None


class User(UserBase):
    id: UUID
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    exam_candidate: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """Full user profile with all details."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    exam_candidate: Optional[str] = None
    role: str
    model_config = ConfigDict(from_attributes=True)


class QuestionBase(BaseModel):
    title: str
    description: Optional[str] = None
    complexity: str
    type: str
    options: Optional[Any] = None
    correct_answers: Any
    max_score: int = 1
    tags: Optional[list[str]] = None


class Question(QuestionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class QuestionForStudent(BaseModel):
    """Question schema for students - excludes correct_answers for security."""
    id: UUID
    title: str
    complexity: str
    type: str
    options: Optional[Any] = None
    max_score: int
    tags: Optional[list[str]] = None
    model_config = ConfigDict(from_attributes=True)


class ExamCreate(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    question_ids: list[UUID]
    target_candidates: str  # 'SSC', 'HSC', 'Admission'


class Exam(BaseModel):
    id: UUID
    title: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_published: bool
    published_by: Optional[str] = None  # Admin email who published
    target_candidates: Optional[str] = None  # 'SSC', 'HSC', 'Admission'
    questions: list[Question]
    model_config = ConfigDict(from_attributes=True)


class ExamForStudent(BaseModel):
    """Exam schema for students - uses QuestionForStudent to hide correct_answers."""
    id: UUID
    title: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_published: bool
    target_candidates: Optional[str] = None  # Show target candidates to students
    questions: list[QuestionForStudent]
    model_config = ConfigDict(from_attributes=True)


class AnswerBase(BaseModel):
    question_id: UUID
    answer_data: Any


class AnswerCreate(AnswerBase):
    pass


class Answer(AnswerBase):
    id: UUID
    attempt_id: UUID
    model_config = ConfigDict(from_attributes=True)


class ExamAttempt(BaseModel):
    id: UUID
    exam_id: UUID
    student_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    score: Optional[float] = None
    total_possible_score: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class ExamAttemptWithExam(BaseModel):
    """Exam attempt with nested exam details for student dashboard."""
    id: UUID
    exam_id: UUID
    student_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    score: Optional[float] = None
    total_possible_score: Optional[float] = None
    exam: ExamForStudent
    model_config = ConfigDict(from_attributes=True)


class ExamStartResponse(BaseModel):
    """Response when starting or resuming an exam attempt."""
    exam: ExamForStudent
    attempt: ExamAttempt
    model_config = ConfigDict(from_attributes=True)


class EvaluationCreate(BaseModel):
    """Create/update evaluation for a student answer."""
    is_correct: Optional[bool] = None
    comment: Optional[str] = None  # Max 100 chars
    score_awarded: Optional[float] = None


class Evaluation(BaseModel):
    """Evaluation of a student answer."""
    id: UUID
    answer_id: UUID
    evaluated_by: UUID
    is_correct: Optional[bool] = None
    comment: Optional[str] = None
    score_awarded: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
