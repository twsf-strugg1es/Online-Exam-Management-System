import secrets
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Table,
    Float,
    Date,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy import true as sa_true
from sqlalchemy.orm import relationship

from .database import Base

# Association table for many-to-many relationship between Exam and Question
exam_questions = Table(
    "exam_questions",
    Base.metadata,
    Column("exam_id", UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "question_id",
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# Which candidates belong to which group
group_members = Table(
    "group_members",
    Base.metadata,
    Column("group_id", UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "membership_id",
        UUID(as_uuid=True),
        ForeignKey("memberships.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# Which groups an exam is for; an exam with no groups is open to every candidate in its organization
exam_groups = Table(
    "exam_groups",
    Base.metadata,
    Column("exam_id", UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
)

# Membership roles, from most to least privileged
ROLE_OWNER = "owner"
ROLE_ADMIN = "admin"
ROLE_EXAMINER = "examiner"
ROLE_CANDIDATE = "candidate"
ROLES = (ROLE_OWNER, ROLE_ADMIN, ROLE_EXAMINER, ROLE_CANDIDATE)
STAFF_ROLES = (ROLE_OWNER, ROLE_ADMIN, ROLE_EXAMINER)  # can manage questions, exams and grading
MANAGER_ROLES = (ROLE_OWNER, ROLE_ADMIN)  # can also manage members and groups


# Easy to read aloud and type: no lowercase, and no look-alikes such as O/0 or I/1
JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def generate_join_code() -> str:
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(8))


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    join_code = Column(String, unique=True, nullable=False, default=generate_join_code)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    memberships = relationship("Membership", back_populates="organization", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)  # 'male', 'female', 'other'

    memberships = relationship("Membership", back_populates="user", cascade="all, delete-orphan")


class Membership(Base):
    """A user's role in one organization. A user can belong to several organizations."""

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String, nullable=False)  # one of ROLES
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="memberships")
    groups = relationship("Group", secondary=group_members, back_populates="members")


class Group(Base):
    """A set of candidates within an organization, e.g. a batch, class or hiring round."""

    __tablename__ = "groups"
    __table_args__ = (UniqueConstraint("organization_id", "name", name="uq_group_org_name"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    # Joining with this code also adds the candidate to the group
    join_code = Column(String, unique=True, nullable=False, default=generate_join_code)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="groups")
    members = relationship("Membership", secondary=group_members, back_populates="groups")
    exams = relationship("Exam", secondary=exam_groups, back_populates="groups")


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    complexity = Column(String, nullable=False)
    type = Column(String, nullable=False)  # e.g., 'single_choice', 'multi_choice'
    options = Column(JSON, nullable=True)
    correct_answers = Column(JSON, nullable=False)
    max_score = Column(Integer, nullable=False, default=1)
    tags = Column(JSON, nullable=True, default=list)  # e.g., ["geography", "history"]

    exams = relationship("Exam", secondary=exam_questions, back_populates="questions")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_published = Column(Boolean, nullable=False, default=False)
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Staff member who published

    # Integrity settings
    shuffle_questions = Column(Boolean, nullable=False, default=True, server_default=sa_true())
    shuffle_options = Column(Boolean, nullable=False, default=True, server_default=sa_true())
    require_fullscreen = Column(Boolean, nullable=False, default=True, server_default=sa_true())
    block_copy_paste = Column(Boolean, nullable=False, default=True, server_default=sa_true())
    # Submit the attempt automatically once this many violations are recorded; None = never
    max_violations = Column(Integer, nullable=True)

    questions = relationship("Question", secondary=exam_questions, back_populates="exams")
    groups = relationship("Group", secondary=exam_groups, back_populates="exams")
    publisher = relationship("User", foreign_keys=[published_by])


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, nullable=True)
    total_possible_score = Column(Float, nullable=True)
    submit_reason = Column(String, nullable=True)  # one of SUBMIT_REASONS, set when the attempt ends

    exam = relationship("Exam")
    student = relationship("User")
    integrity_events = relationship(
        "IntegrityEvent", back_populates="attempt", cascade="all, delete-orphan", order_by="IntegrityEvent.recorded_at"
    )


SUBMIT_STUDENT = "student"  # the student pressed submit
SUBMIT_TIME_UP = "time_up"  # the timer ran out
SUBMIT_VIOLATIONS = "violations"  # too many integrity violations
SUBMIT_REASONS = (SUBMIT_STUDENT, SUBMIT_TIME_UP, SUBMIT_VIOLATIONS)

# Integrity events reported by the exam page. Violations count toward the exam's max_violations;
# the other events are flags that examiners see in the report but that never end an attempt.
EVENT_FOCUS_LOST = "focus_lost"  # switched to another tab, window or app
EVENT_FOCUS_RETURNED = "focus_returned"  # came back; details carry how long they were away
EVENT_FULLSCREEN_EXIT = "fullscreen_exit"
EVENT_COPY_PASTE = "copy_paste"  # copy, cut or paste attempt
EVENT_CONTEXT_MENU = "context_menu"
EVENT_BLOCKED_SHORTCUT = "blocked_shortcut"  # e.g. Ctrl+C, PrintScreen, F12
EVENT_MULTIPLE_SCREENS = "multiple_screens"
VIOLATION_EVENTS = (EVENT_FOCUS_LOST, EVENT_FULLSCREEN_EXIT)
FLAG_EVENTS = (EVENT_COPY_PASTE, EVENT_CONTEXT_MENU, EVENT_BLOCKED_SHORTCUT, EVENT_MULTIPLE_SCREENS)
EVENT_TYPES = VIOLATION_EVENTS + FLAG_EVENTS + (EVENT_FOCUS_RETURNED,)


class IntegrityEvent(Base):
    """Something the exam page noticed during an attempt, such as leaving the exam tab."""

    __tablename__ = "integrity_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(
        UUID(as_uuid=True), ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type = Column(String, nullable=False)  # one of EVENT_TYPES
    occurred_at = Column(DateTime(timezone=True), nullable=True)  # the student's clock; informational only
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))  # the server's clock
    details = Column(JSON, nullable=True)

    attempt = relationship("ExamAttempt", back_populates="integrity_events")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("exam_attempts.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    answer_data = Column(JSON, nullable=False)

    attempt = relationship("ExamAttempt")
    question = relationship("Question")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id = Column(UUID(as_uuid=True), ForeignKey("answers.id"), nullable=False)
    evaluated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # Teacher/Admin
    is_correct = Column(Boolean, nullable=True)  # True=right, False=wrong, None=not evaluated
    comment = Column(String(100), nullable=True)  # Max 100 characters
    score_awarded = Column(Float, nullable=True)  # Score given by teacher
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    answer = relationship("Answer")
    evaluator = relationship("User", foreign_keys=[evaluated_by])
