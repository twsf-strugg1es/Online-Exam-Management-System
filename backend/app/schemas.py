import re
from zoneinfo import available_timezones

from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator, model_validator

from . import models
from uuid import UUID
from typing import Any, Optional
from datetime import datetime, date, timezone


_TIMEZONES = available_timezones()


def _check_language(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in models.LANGUAGES:
        raise ValueError(f"Language must be one of: {', '.join(models.LANGUAGES)}")
    return value


def _check_timezone(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in _TIMEZONES:
        raise ValueError("Unknown timezone. Use an IANA name such as Asia/Dhaka")
    return value


def _check_code(value: Optional[str], length: int, what: str) -> Optional[str]:
    """Country (2 letters) and currency (3 letters) codes, stored upper case; empty clears."""
    if value is None or value.strip() == "":
        return None
    value = value.strip().upper()
    if not re.fullmatch(f"[A-Z]{{{length}}}", value):
        raise ValueError(f"{what} must be a {length}-letter code")
    return value


class LocaleFields(BaseModel):
    """An organization's locale. Every field is optional so a client can change one at a time."""
    country: Optional[str] = None
    default_language: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None

    @field_validator("country")
    @classmethod
    def _country(cls, v):
        return _check_code(v, 2, "Country")

    @field_validator("currency")
    @classmethod
    def _currency(cls, v):
        return _check_code(v, 3, "Currency")

    @field_validator("default_language")
    @classmethod
    def _language(cls, v):
        return _check_language(v)

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, v):
        return _check_timezone(v)


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


class OrganizationSignup(UserCreate, LocaleFields):
    """Sign up a new organization together with its owner's account.

    The signup page sends the browser's timezone, so exam windows are right from the start.
    """
    organization_name: str = Field(min_length=2, max_length=120)

    @field_validator("timezone", mode="before")
    @classmethod
    def _browser_timezone(cls, v):
        # A browser can report a zone this server doesn't know: start on UTC instead of failing
        return v if v in _TIMEZONES else None


class MembershipOut(BaseModel):
    organization_id: UUID
    organization_name: str
    role: str
    # Needed on every screen: exam windows use the timezone, the language is the fallback
    timezone: str = models.DEFAULT_TIMEZONE
    default_language: str = models.DEFAULT_LANGUAGE


class User(UserBase):
    id: UUID
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    language: Optional[str] = None
    email_verified_at: Optional[datetime] = None
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
    language: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class GroupSummary(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class OrganizationUpdate(LocaleFields):
    """Change the name and/or locale; fields left out stay as they are."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)


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
    full_name: Optional[str] = Field(None, max_length=200)  # used only when the invite creates the account

    @field_validator("full_name")
    @classmethod
    def blank_name_is_none(cls, v: Optional[str]) -> Optional[str]:
        return (v or "").strip() or None


class MemberUpdate(BaseModel):
    role: str


class GroupMembersUpdate(BaseModel):
    user_ids: list[UUID]


class BulkQuestionIds(BaseModel):
    question_ids: list[UUID] = Field(min_length=1, max_length=500)


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
    """A new exam. The form checks the same rules, but the server is the one that enforces them."""
    title: str = Field(min_length=1, max_length=200)
    start_time: datetime
    end_time: datetime
    duration_minutes: int = Field(ge=1, le=24 * 60)
    question_ids: list[UUID] = Field(min_length=1)
    group_ids: list[UUID] = []  # empty: open to every candidate in the organization
    shuffle_questions: bool = True
    shuffle_options: bool = True
    require_fullscreen: bool = True
    block_copy_paste: bool = True
    max_violations: Optional[int] = Field(default=None, ge=1, le=100)  # None: never auto-submit

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Give the exam a title.")
        return v.strip()

    @field_validator("start_time", "end_time")
    @classmethod
    def _utc(cls, v: datetime) -> datetime:
        # Times without an offset are read as UTC (rule: clients send UTC with an offset)
        return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v.astimezone(timezone.utc)

    @field_validator("question_ids", "group_ids")
    @classmethod
    def _unique(cls, v: list[UUID]) -> list[UUID]:
        return list(dict.fromkeys(v))  # drop repeats, keep the order

    @model_validator(mode="after")
    def _window(self):
        if self.end_time <= self.start_time:
            raise ValueError("The exam must close after it opens.")
        return self


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


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=6, max_length=200)


class EmailVerification(BaseModel):
    token: str = Field(min_length=20, max_length=2000)


class QuestionEdit(BaseModel):
    """A question written in the editor. Choice questions need 2-10 distinct options and the
    correct one(s) among them; written and image answers have neither (an examiner grades them)."""
    title: str = Field(min_length=1, max_length=2000)
    description: Optional[str] = Field(default=None, max_length=5000)
    complexity: str
    type: str
    options: Optional[list[str]] = None
    correct_answers: Any = None
    max_score: int = Field(default=1, ge=1, le=100)
    tags: list[str] = []

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Write the question.")
        return v.strip()

    @field_validator("description")
    @classmethod
    def _description(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() or None if v else None

    @field_validator("complexity")
    @classmethod
    def _complexity(cls, v: str) -> str:
        if v not in models.COMPLEXITIES:
            raise ValueError(f"Difficulty must be one of: {', '.join(models.COMPLEXITIES)}")
        return v

    @field_validator("type")
    @classmethod
    def _type(cls, v: str) -> str:
        if v not in models.QUESTION_TYPES:
            raise ValueError(f"Type must be one of: {', '.join(models.QUESTION_TYPES)}")
        return v

    @model_validator(mode="after")
    def _answers(self):
        if self.type not in models.CHOICE_TYPES:
            self.options, self.correct_answers = None, None
            return self
        options = [str(o).strip() for o in (self.options or [])]
        if any(not o for o in options):
            raise ValueError("Fill in every option or remove the empty ones.")
        if len(options) < 2:
            raise ValueError("Add at least two options.")
        if len(options) > models.MAX_OPTIONS:
            raise ValueError("Use at most 10 options.")
        if len(set(options)) != len(options):
            raise ValueError("Two options have the same text.")
        correct = self.correct_answers if isinstance(self.correct_answers, list) else (
            [] if self.correct_answers in (None, "") else [self.correct_answers])
        correct = list(dict.fromkeys(str(c).strip() for c in correct))
        if not correct:
            raise ValueError("Mark the correct answer.")
        if any(c not in options for c in correct):
            raise ValueError("The correct answer must be one of the options.")
        if self.type == "single_choice" and len(correct) != 1:
            raise ValueError("A single-choice question has exactly one correct answer.")
        self.options = options
        # Stored the way the importer stores them: one value for single choice, a list for multiple
        self.correct_answers = correct[0] if self.type == "single_choice" else correct
        return self


class WaitlistJoin(BaseModel):
    email: EmailStr
    source: Optional[str] = Field(None, max_length=40)  # which call to action
    locale: Optional[str] = Field(None, max_length=20)  # navigator.language
    website: Optional[str] = None  # honeypot: hidden from people, filled in by bots

    @field_validator("source", "locale")
    @classmethod
    def tidy_label(cls, v: Optional[str]) -> Optional[str]:
        # Free text from the page; keep only short, plain labels
        v = (v or "").strip()
        return v if re.fullmatch(r"[A-Za-z0-9_-]{1,40}", v) else None


class WaitlistUnsubscribe(BaseModel):
    token: str
