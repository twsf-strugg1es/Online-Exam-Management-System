import uuid
from datetime import datetime
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
)
from sqlalchemy.dialects.postgresql import UUID, JSON
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


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # e.g., 'admin' or 'student'
    full_name = Column(String, nullable=True)  # Student's full name
    date_of_birth = Column(Date, nullable=True)  # Student's date of birth
    gender = Column(String, nullable=True)  # 'male', 'female', 'other'
    exam_candidate = Column(String, nullable=True)  # 'SSC', 'HSC', 'Admission'


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    title = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_published = Column(Boolean, nullable=False, default=False)
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Admin who published
    target_candidates = Column(String, nullable=True)  # 'SSC', 'HSC', 'Admission' - who this exam is for

    questions = relationship("Question", secondary=exam_questions, back_populates="exams")
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

    exam = relationship("Exam")
    student = relationship("User")


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
