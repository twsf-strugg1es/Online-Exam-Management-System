from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
import random
import uuid
from datetime import datetime, timedelta, timezone

from . import models, schemas
from .security import get_password_hash


def get_user_by_email(db: Session, email: str) -> models.User | None:
    """Find a user by email address."""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate, commit: bool = True) -> models.User:
    """Create a new user with hashed password."""
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
    )
    db.add(db_user)
    if commit:
        db.commit()
        db.refresh(db_user)
    else:
        db.flush()
    return db_user


def create_organization(db: Session, name: str, owner: models.User) -> models.Organization:
    """Create an organization with `owner` as its first member."""
    org = models.Organization(name=name)
    db.add(org)
    db.flush()
    db.add(models.Membership(user_id=owner.id, organization_id=org.id, role=models.ROLE_OWNER))
    db.commit()
    db.refresh(org)
    return org


def get_membership(db: Session, user_id: uuid.UUID, organization_id: uuid.UUID) -> models.Membership | None:
    return (
        db.query(models.Membership)
        .filter(models.Membership.user_id == user_id, models.Membership.organization_id == organization_id)
        .first()
    )


def find_join_code(
    db: Session, code: str
) -> tuple[models.Organization, models.Group | None] | None:
    """Resolve a join code to its organization, plus the group when it's a group's code."""
    code = code.strip().upper()
    group = db.query(models.Group).filter(models.Group.join_code == code).first()
    if group:
        return group.organization, group
    org = db.query(models.Organization).filter(models.Organization.join_code == code).first()
    return (org, None) if org else None


def join_with_code(db: Session, user: models.User, code: str) -> models.Membership:
    """Join an organization as a candidate using its join code or one of its groups' codes.

    A group code also adds the candidate to that group. Joining again with another
    group's code adds the group to the existing membership.
    """
    found = find_join_code(db, code)
    if not found:
        raise ValueError("Invalid join code")
    org, group = found

    membership = get_membership(db, user.id, org.id)
    if not membership:
        membership = models.Membership(user_id=user.id, organization_id=org.id, role=models.ROLE_CANDIDATE)
        db.add(membership)
    if group and group not in membership.groups:
        if membership.role != models.ROLE_CANDIDATE:
            raise ValueError("Staff members can't join a candidate group")
        membership.groups.append(group)
    db.commit()
    db.refresh(membership)
    return membership


def visible_to_candidate(exam: models.Exam, membership: models.Membership) -> bool:
    """Whether a candidate may see and take an exam: same organization, and in one of its groups if it has any."""
    if exam.organization_id != membership.organization_id:
        return False
    if not exam.groups:
        return True
    return bool({g.id for g in exam.groups} & {g.id for g in membership.groups})


def get_question_by_id(db: Session, question_id: uuid.UUID) -> models.Question | None:
    """Find a question by ID."""
    return db.query(models.Question).filter(models.Question.id == question_id).first()


def create_question(db: Session, question: schemas.QuestionBase, organization_id: uuid.UUID) -> models.Question:
    """Create a new question in an organization's question bank."""
    db_q = models.Question(
        organization_id=organization_id,
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


def create_exam(db: Session, exam: schemas.ExamCreate, organization_id: uuid.UUID) -> models.Exam:
    """Create a new exam with associated questions and target groups."""
    db_exam = models.Exam(
        organization_id=organization_id,
        title=exam.title,
        start_time=exam.start_time,
        end_time=exam.end_time,
        duration_minutes=exam.duration_minutes,
        is_published=False,
        shuffle_questions=exam.shuffle_questions,
        shuffle_options=exam.shuffle_options,
        require_fullscreen=exam.require_fullscreen,
        block_copy_paste=exam.block_copy_paste,
        max_violations=exam.max_violations,
    )
    if exam.group_ids:
        db_exam.groups = db.query(models.Group).filter(models.Group.id.in_(exam.group_ids)).all()
    
    # Attach questions to the exam
    for question_id in exam.question_ids:
        question = get_question_by_id(db, question_id)
        if question:
            db_exam.questions.append(question)
    
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam


def get_exams(db: Session, organization_id: uuid.UUID) -> list[models.Exam]:
    """Get all of an organization's exams."""
    return db.query(models.Exam).filter(models.Exam.organization_id == organization_id).all()


def get_exam_by_id(db: Session, exam_id: uuid.UUID) -> models.Exam | None:
    """Find an exam by ID."""
    return (
        db.query(models.Exam)
        .options(joinedload(models.Exam.questions))
        .filter(models.Exam.id == exam_id)
        .first()
    )


def get_available_exams(db: Session, membership: models.Membership) -> list[models.Exam]:
    """Get the published exams a candidate may take."""
    exams = (
        db.query(models.Exam)
        .options(joinedload(models.Exam.questions), joinedload(models.Exam.groups))
        .filter(
            models.Exam.is_published == True,
            models.Exam.organization_id == membership.organization_id,
        )
        .all()
    )
    return [exam for exam in exams if visible_to_candidate(exam, membership)]


# Extra time allowed after an attempt's deadline for answers that were
# in flight when the clock ran out (network latency, slow connections).
ANSWER_GRACE_SECONDS = 30


def as_utc(dt: datetime) -> datetime:
    """Treat naive datetimes (e.g. from SQLite) as UTC so they compare with aware ones."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def get_attempt_deadline(attempt: models.ExamAttempt, exam: models.Exam) -> datetime:
    """When an attempt must finish: its own duration, but never past the exam window."""
    personal_deadline = as_utc(attempt.start_time) + timedelta(minutes=exam.duration_minutes)
    return min(personal_deadline, as_utc(exam.end_time))


def create_exam_attempt(
    db: Session, exam_id: uuid.UUID, student_id: uuid.UUID
) -> models.ExamAttempt:
    """Create a student's attempt at an exam, or return the one they already have.

    Two "start" requests can arrive together (a double click, a retried request); the
    database's one-attempt-per-exam constraint makes the second one reuse the first.
    """
    attempt = models.ExamAttempt(
        exam_id=exam_id,
        student_id=student_id,
        start_time=datetime.now(timezone.utc),  # type: ignore
    )
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return (
            db.query(models.ExamAttempt)
            .filter(models.ExamAttempt.exam_id == exam_id, models.ExamAttempt.student_id == student_id)
            .one()
        )
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

    if attempt.end_time is not None:
        raise ValueError("Exam already submitted")

    exam = get_exam_by_id(db, attempt.exam_id)
    if not exam:
        raise ValueError("Exam not found")

    deadline = get_attempt_deadline(attempt, exam)
    if datetime.now(timezone.utc) > deadline + timedelta(seconds=ANSWER_GRACE_SECONDS):
        raise ValueError("Exam time is over. Answers can no longer be changed")

    if answer_in.question_id not in {q.id for q in exam.questions}:
        raise ValueError("Question does not belong to this exam")

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


def calculate_and_save_score(
    db: Session, attempt: models.ExamAttempt, reason: str = models.SUBMIT_STUDENT
) -> models.ExamAttempt:
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
    attempt.submit_reason = reason  # type: ignore
    db.commit()
    # Refresh the object to ensure it has the committed values
    db.refresh(attempt)
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


# --- Integrity ---

def questions_for_attempt(exam: models.Exam, attempt: models.ExamAttempt) -> list[dict]:
    """The exam's questions as this student sees them, without answers.

    Shuffling is seeded with the attempt's ID: every student gets their own order,
    and it stays the same when they reload or resume.
    """
    questions = list(exam.questions or [])
    if exam.shuffle_questions:
        questions.sort(key=lambda q: str(q.id))  # a fixed starting point, so the seed alone decides the order
        random.Random(f"{attempt.id}:questions").shuffle(questions)

    result = []
    for q in questions:
        options = list(q.options) if isinstance(q.options, list) else q.options
        # Answers are stored as option values, not positions, so shuffling never affects grading
        if exam.shuffle_options and isinstance(options, list):
            random.Random(f"{attempt.id}:{q.id}").shuffle(options)
        result.append({
            "id": str(q.id),
            "title": q.title,
            "type": q.type,
            "complexity": q.complexity,
            "max_score": q.max_score,
            "options": options,
        })
    return result


def integrity_settings(exam: models.Exam) -> dict:
    return {
        "shuffle_questions": exam.shuffle_questions,
        "shuffle_options": exam.shuffle_options,
        "require_fullscreen": exam.require_fullscreen,
        "block_copy_paste": exam.block_copy_paste,
        "max_violations": exam.max_violations,
    }


def count_violations(db: Session, attempt_id: uuid.UUID) -> int:
    return (
        db.query(models.IntegrityEvent)
        .filter(
            models.IntegrityEvent.attempt_id == attempt_id,
            models.IntegrityEvent.type.in_(models.VIOLATION_EVENTS),
        )
        .count()
    )


def record_integrity_events(
    db: Session, attempt: models.ExamAttempt, events: list[schemas.IntegrityEventIn]
) -> int:
    """Store events from the exam page and return the attempt's violation count.

    Once the count reaches the exam's limit, the attempt is submitted on the spot.
    """
    for event in events:
        db.add(models.IntegrityEvent(
            attempt_id=attempt.id,
            type=event.type,
            occurred_at=event.occurred_at,
            details=event.details,
        ))
    db.commit()

    violations = count_violations(db, attempt.id)
    limit = attempt.exam.max_violations
    if limit and violations >= limit and attempt.end_time is None:
        calculate_and_save_score(db, attempt, reason=models.SUBMIT_VIOLATIONS)
    return violations


def integrity_summary(attempt: models.ExamAttempt) -> dict:
    """Counts and an overall risk level, so examiners know which attempts to look at first.

    - high: auto-submitted for violations, 3+ violations, or a minute or more away from the exam
    - review: any violation or flag
    - clean: nothing recorded
    """
    events = attempt.integrity_events
    counts = {event_type: 0 for event_type in models.EVENT_TYPES}
    seconds_away = 0.0
    for event in events:
        counts[event.type] = counts.get(event.type, 0) + 1
        if event.type == models.EVENT_FOCUS_RETURNED:
            seconds_away += float((event.details or {}).get("away_ms") or 0) / 1000

    violations = sum(counts[t] for t in models.VIOLATION_EVENTS)
    flags = sum(counts[t] for t in models.FLAG_EVENTS)
    if attempt.submit_reason == models.SUBMIT_VIOLATIONS or violations >= 3 or seconds_away >= 60:
        risk = "high"
    elif violations or flags:
        risk = "review"
    else:
        risk = "clean"
    return {
        "risk": risk,
        "violations": violations,
        "flags": flags,
        "seconds_away": round(seconds_away),
        "counts": counts,
    }
