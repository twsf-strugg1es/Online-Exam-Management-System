from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator

from . import models
from uuid import UUID
from typing import Any, Optional
from datetime import datetime, date


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    confirm_password: Optional[str] = None


class CandidateSignup(UserCreate):
    """Public signup; a join code also makes the new user a candidate in that organization."""
    join_code: Optional[str] = None


class OrganizationSignup(UserCreate):
    """Sign up a new organization together with its owner's account."""
    organization_name: str = Field(min_length=2, max_length=120)


class MembershipOut(BaseModel):
    organization_id: UUID
    organization_name: str
    role: str


class User(UserBase):
    id: UUID
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class UserWithMemberships(User):
    memberships: list[MembershipOut] = []


class UserProfile(BaseModel):
    """Full user profile with all details."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class GroupSummary(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class GroupOut(GroupSummary):
    join_code: str
    member_count: int


class JoinRequest(BaseModel):
    join_code: str


class MemberAdd(BaseModel):
    email: EmailStr
    role: str


class MemberUpdate(BaseModel):
    role: str


class GroupMembersUpdate(BaseModel):
    user_ids: list[UUID]


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
    group_ids: list[UUID] = []  # empty: open to every candidate in the organization
    shuffle_questions: bool = True
    shuffle_options: bool = True
    require_fullscreen: bool = True
    block_copy_paste: bool = True
    max_violations: Optional[int] = Field(default=None, ge=1, le=100)  # None: never auto-submit


class Exam(BaseModel):
    id: UUID
    title: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_published: bool
    published_by: Optional[str] = None  # Admin email who published
    groups: list[GroupSummary] = []
    shuffle_questions: bool = True
    shuffle_options: bool = True
    require_fullscreen: bool = True
    block_copy_paste: bool = True
    max_violations: Optional[int] = None
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


class IntegrityEventIn(BaseModel):
    """One event reported by the exam page."""
    type: str
    occurred_at: Optional[datetime] = None
    details: Optional[dict[str, Any]] = None

    @field_validator("type")
    @classmethod
    def known_type(cls, value: str) -> str:
        if value not in models.EVENT_TYPES:
            raise ValueError(f"Unknown event type: {value}")
        return value

    @field_validator("details")
    @classmethod
    def small_details(cls, value: Optional[dict]) -> Optional[dict]:
        if value is not None and len(str(value)) > 1000:
            raise ValueError("details too large")
        return value


class IntegrityEventsIn(BaseModel):
    events: list[IntegrityEventIn] = Field(min_length=1, max_length=50)
