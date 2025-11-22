import io
import json
import uuid
from datetime import datetime, timezone

import openpyxl
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import crud, models, schemas
from app.database import SessionLocal

client = TestClient(app)

def create_exam_with_questions(db):
    """Utility that creates an exam with two questions (single & multi choice)."""
    # Create two questions
    q1 = models.Question(
        title="What is 2+2?",
        complexity="easy",
        type="single_choice",
        options=["1", "2", "3", "4"],
        correct_answers=["4"],
        max_score=1,
    )
    q2 = models.Question(
        title="Select prime numbers",
        complexity="medium",
        type="multi_choice",
        options=["2", "4", "5", "6"],
        correct_answers=["2", "5"],
        max_score=2,
    )
    db.add_all([q1, q2])
    db.commit()
    db.refresh(q1)
    db.refresh(q2)

    # Create exam linking those questions
    exam = models.Exam(
        title="Demo Exam",
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc),
        duration_minutes=30,
        is_published=True,
        questions=[q1, q2],
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam, [q1, q2]

def test_auto_grading_logic():
    """Ensures that the grading function correctly scores single & multi choice."""
    db = SessionLocal()
    try:
        exam, questions = create_exam_with_questions(db)
        # Simulate a student attempt
        student_id = uuid.uuid4()
        attempt = crud.create_exam_attempt(db, exam.id, student_id)

        # Save answers – correct for q1, partially correct for q2
        crud.save_answer(
            db,
            attempt.id,
            attempt.student_id,
            schemas.AnswerCreate(
                question_id=questions[0].id,
                answer_data="4",
            ),
        )
        crud.save_answer(
            db,
            attempt.id,
            attempt.student_id,
            schemas.AnswerCreate(
                question_id=questions[1].id,
                answer_data=["2"],  # missing "5"
            ),
        )

        # Run grading
        graded_attempt = crud.calculate_and_save_score(db, attempt)

        # Expected: q1 = 1 point, q2 = 0 (partial answer gets 0 in our simple logic)
        assert graded_attempt.score == 1
        assert graded_attempt.total_possible_score == 3  # 1 + 2
    finally:
        db.close()
