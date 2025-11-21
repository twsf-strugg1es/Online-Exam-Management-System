from sqlalchemy.orm import Session, joinedload
import uuid
from datetime import datetime, timezone

from . import models, schemas
from .security import get_password_hash


def get_user_by_email(db: Session, email: str) -> models.User | None:
    """Find a user by email address."""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new user with hashed password."""
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        full_name=user.full_name,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
        exam_candidate=user.exam_candidate,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_question_by_id(db: Session, question_id: uuid.UUID) -> models.Question | None:
    """Find a question by ID."""
    return db.query(models.Question).filter(models.Question.id == question_id).first()


def create_question(db: Session, question: schemas.QuestionBase) -> models.Question:
    """Create a new question from schema."""
    db_q = models.Question(
        title=question.title,
        description=question.description,
        complexity=question.complexity,
        type=question.type,
        options=question.options,
        correct_answers=question.correct_answers,
        max_score=question.max_score,
        tags=question.tags or [],
    )
    db.add(db_q)
    db.commit()
    db.refresh(db_q)
    return db_q


def create_exam(db: Session, exam: schemas.ExamCreate) -> models.Exam:
    """Create a new exam with associated questions."""
    db_exam = models.Exam(
        title=exam.title,
        start_time=exam.start_time,
        end_time=exam.end_time,
        duration_minutes=exam.duration_minutes,
        is_published=False,
        target_candidates=exam.target_candidates,
    )
    
    # Attach questions to the exam
    for question_id in exam.question_ids:
        question = get_question_by_id(db, question_id)
        if question:
            db_exam.questions.append(question)
    
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam


def get_exams(db: Session) -> list[models.Exam]:
    """Get all exams."""
    return db.query(models.Exam).all()


def get_exam_by_id(db: Session, exam_id: uuid.UUID) -> models.Exam | None:
    """Find an exam by ID."""
    return (
        db.query(models.Exam)
        .options(joinedload(models.Exam.questions))
        .filter(models.Exam.id == exam_id)
        .first()
    )


def get_available_exams(db: Session) -> list[models.Exam]:
    """Get all published exams available to students."""
    return (
        db.query(models.Exam)
        .options(joinedload(models.Exam.questions))
        .filter(models.Exam.is_published == True)
        .all()
    )


def create_exam_attempt(
    db: Session, exam_id: uuid.UUID, student_id: uuid.UUID
) -> models.ExamAttempt:
    """Create a new exam attempt for a student."""
    attempt = models.ExamAttempt(
        exam_id=exam_id,
        student_id=student_id,
        start_time=datetime.now(timezone.utc),  # type: ignore
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def save_answer(
    db: Session,
    attempt_id: uuid.UUID,
    student_id: uuid.UUID,
    answer_in: schemas.AnswerCreate,
) -> models.Answer:
    """Save or update a student's answer with security verification."""
    # Verify the attempt belongs to the student
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.student_id == student_id,
        )
        .first()
    )
    if not attempt:
        raise ValueError("Attempt not found or does not belong to student")

    # Check if answer already exists
    existing_answer = (
        db.query(models.Answer)
        .filter(
            models.Answer.attempt_id == attempt_id,
            models.Answer.question_id == answer_in.question_id,
        )
        .first()
    )

    if existing_answer:
        # Update existing answer
        existing_answer.answer_data = answer_in.answer_data
        db.commit()
        db.refresh(existing_answer)
        return existing_answer
    else:
        # Create new answer
        new_answer = models.Answer(
            attempt_id=attempt_id,
            question_id=answer_in.question_id,
            answer_data=answer_in.answer_data,
        )
        db.add(new_answer)
        db.commit()
        db.refresh(new_answer)
        return new_answer


def calculate_and_save_score(db: Session, attempt: models.ExamAttempt) -> models.ExamAttempt:
    """Auto-grade an exam attempt, compute total possible score, and save results."""
    # Get the exam with questions
    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    if not exam:
        raise ValueError("Exam not found")

    # Get all answers for this attempt
    answers = (
        db.query(models.Answer).filter(models.Answer.attempt_id == attempt.id).all()
    )
    answer_map = {ans.question_id: ans.answer_data for ans in answers}

    # Calculate scores
    total_score = 0.0
    total_possible = 0.0
    for question in exam.questions:
        # Sum total possible across all questions
        try:
            total_possible += float(question.max_score or 0)
        except Exception:
            total_possible += 0.0

        # Auto-grade for supported types
        if question.type in ("single_choice", "multi_choice"):
            student_answer = answer_map.get(question.id)
            if student_answer is not None:
                correct = question.correct_answers
                if isinstance(correct, list):
                    correct_norm = sorted([str(c) for c in correct])
                else:
                    correct_norm = [str(correct)]

                if isinstance(student_answer, list):
                    student_norm = sorted([str(s) for s in student_answer])
                else:
                    student_norm = [str(student_answer)]

                if correct_norm == student_norm:
                    total_score += float(question.max_score or 0)

    # Update attempt with score, total possible, and end time
    attempt.score = float(total_score)  # type: ignore
    attempt.total_possible_score = float(total_possible)  # type: ignore
    attempt.end_time = datetime.now(timezone.utc)  # type: ignore
    print(f"\n=== SAVING ATTEMPT ===")
    print(f"Attempt ID: {attempt.id}")
    print(f"End Time Before Commit: {attempt.end_time}")
    db.commit()
    # Refresh the object to ensure it has the committed values
    db.refresh(attempt)
    print(f"End Time After Commit: {attempt.end_time}")
    print(f"=== ATTEMPT SAVED ===")
    return attempt


def create_or_update_evaluation(
    db: Session,
    answer_id: uuid.UUID,
    evaluator_id: uuid.UUID,
    eval_data: schemas.EvaluationCreate,
) -> models.Evaluation:
    """Create or update an evaluation for a student answer."""
    # Check if evaluation exists
    existing = (
        db.query(models.Evaluation)
        .filter(models.Evaluation.answer_id == answer_id)
        .first()
    )

    if existing:
        # Update existing evaluation
        if eval_data.is_correct is not None:
            existing.is_correct = eval_data.is_correct
        if eval_data.comment is not None:
            existing.comment = eval_data.comment[:100]  # Ensure max 100 chars
        if eval_data.score_awarded is not None:
            existing.score_awarded = eval_data.score_awarded
        existing.updated_at = datetime.now(timezone.utc)  # type: ignore
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new evaluation
        new_eval = models.Evaluation(
            answer_id=answer_id,
            evaluated_by=evaluator_id,
            is_correct=eval_data.is_correct,
            comment=eval_data.comment[:100] if eval_data.comment else None,
            score_awarded=eval_data.score_awarded,
            created_at=datetime.now(timezone.utc),  # type: ignore
            updated_at=datetime.now(timezone.utc),  # type: ignore
        )
        db.add(new_eval)
        db.commit()
        db.refresh(new_eval)
        return new_eval


def get_evaluation_by_answer(db: Session, answer_id: uuid.UUID) -> models.Evaluation | None:
    """Get evaluation for a specific answer."""
    return (
        db.query(models.Evaluation)
        .filter(models.Evaluation.answer_id == answer_id)
        .first()
    )
