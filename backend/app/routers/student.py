from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas, crud, models, security

router = APIRouter(prefix="/student", tags=["Student"])


def get_current_student_user(
    current_user: models.User = Depends(security.get_current_user),
) -> models.User:
    """Verify the current user is a student."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required",
        )
    return current_user


@router.get("/exams/")
def list_available_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """List all published exams available to students based on their exam_candidate selection."""
    exams = crud.get_available_exams(db)
    now = datetime.now(timezone.utc)
    
    # Filter exams based on student's exam_candidate
    filtered_exams = []
    for exam in exams:
        # If exam has no target_candidates, show to all students
        # If exam has target_candidates, only show if student's exam_candidate matches
        if exam.target_candidates is None or exam.target_candidates == current_user.exam_candidate:
            filtered_exams.append(exam)
    
    result = []
    for exam in filtered_exams:
        # Get publisher email if published
        publisher_email = None
        if exam.published_by:
            publisher = db.query(models.User).filter(models.User.id == exam.published_by).first()
            publisher_email = publisher.email if publisher else "Unknown"
        
        # Determine exam status
        is_expired = now > crud.as_utc(exam.end_time)
        is_upcoming = now < crud.as_utc(exam.start_time)
        is_active = not is_expired and not is_upcoming
        
        # Manually build exam dict
        exam_dict = {
            "id": str(exam.id),
            "title": exam.title,
            "start_time": exam.start_time.isoformat(),
            "end_time": exam.end_time.isoformat(),
            "duration_minutes": exam.duration_minutes,
            "is_published": exam.is_published,
            "published_by": publisher_email,
            "target_candidates": exam.target_candidates,
            "is_expired": is_expired,
            "is_upcoming": is_upcoming,
            "is_active": is_active,
            # Only the count: question content is sent when an attempt starts
            "question_count": len(exam.questions or []),
        }
        result.append(exam_dict)
    return result


@router.get("/unfinished-attempts/")
def list_unfinished_attempts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """List all unfinished exam attempts for the current student."""
    # Simple query: get all attempts where end_time is NULL (unfinished)
    attempts = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.student_id == current_user.id,
        models.ExamAttempt.end_time.is_(None)
    ).all()
    
    # Build response with exam details
    result = []
    for attempt in attempts:
        exam = crud.get_exam_by_id(db, attempt.exam_id)
        if exam:
            result.append({
                "id": str(attempt.id),
                "exam_id": str(attempt.exam_id),
                "student_id": str(attempt.student_id),
                "start_time": attempt.start_time.isoformat(),
                "end_time": attempt.end_time.isoformat() if attempt.end_time else None,
                "score": attempt.score,
                "total_possible_score": attempt.total_possible_score,
                "exam": {
                    "id": str(exam.id),
                    "title": exam.title,
                    "start_time": exam.start_time.isoformat(),
                    "end_time": exam.end_time.isoformat(),
                    "duration_minutes": exam.duration_minutes,
                    "is_published": exam.is_published,
                    "target_candidates": exam.target_candidates,
                }
            })
    
    return result


@router.post("/exams/{exam_id}/start")
def start_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Start an exam attempt for the current student."""
    try:
        # CRITICAL: Expire all objects at the very start to prevent race conditions
        # This ensures we get fresh reads from the database for the existence check
        db.expire_all()
        
        exam = crud.get_exam_by_id(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        if not exam.is_published:
            raise HTTPException(
                status_code=400,
                detail="Exam is not published yet",
            )

        if exam.target_candidates is not None and exam.target_candidates != current_user.exam_candidate:
            raise HTTPException(status_code=403, detail="This exam is not available to you")
        
        # Check exam timing
        now = datetime.now(timezone.utc)
        if now < crud.as_utc(exam.start_time):
            raise HTTPException(
                status_code=400,
                detail=f"Exam has not started yet. It will start at {exam.start_time.isoformat()}",
            )
        
        if now > crud.as_utc(exam.end_time):
            raise HTTPException(
                status_code=400,
                detail="Exam time has expired. You can no longer take this exam",
            )

        # One attempt per student: retaking would let them improve on a known score
        already_submitted = (
            db.query(models.ExamAttempt)
            .filter(
                models.ExamAttempt.exam_id == exam_id,
                models.ExamAttempt.student_id == current_user.id,
                models.ExamAttempt.end_time.isnot(None),
            )
            .first()
        )
        if already_submitted:
            raise HTTPException(status_code=400, detail="You have already submitted this exam")
        
        # Check if student already has an unfinished attempt for this exam
        existing_attempt = (
            db.query(models.ExamAttempt)
            .filter(
                models.ExamAttempt.exam_id == exam_id,
                models.ExamAttempt.student_id == current_user.id,
                models.ExamAttempt.end_time.is_(None)
            )
            .first()
        )
        
        if existing_attempt:
            # Return existing attempt instead of creating a new one
            attempt = existing_attempt
        else:
            # Create a new exam attempt
            attempt = crud.create_exam_attempt(db, exam_id, current_user.id)
            # Immediately commit to ensure it's in the database
            db.commit()
        
        # Build response without strict validation
        # Remaining time runs from the attempt start, capped at the exam window's end
        deadline = crud.get_attempt_deadline(attempt, exam)
        time_remaining_seconds = max(0, int((deadline - now).total_seconds()))
        
        exam_dict = {
            "id": str(exam.id),
            "title": exam.title,
            "start_time": exam.start_time.isoformat(),
            "end_time": exam.end_time.isoformat(),
            "duration_minutes": exam.duration_minutes,
            "is_published": exam.is_published,
            "questions": [
                {
                    "id": str(q.id),
                    "title": q.title,
                    "type": q.type,
                    "complexity": q.complexity,
                    "max_score": q.max_score,
                    "options": q.options,
                }
                for q in (exam.questions or [])
            ],
            "time_remaining_seconds": max(0, time_remaining_seconds),
            "exam_end_time": exam.end_time.isoformat(),
        }
        
        attempt_dict = {
            "id": str(attempt.id),
            "exam_id": str(attempt.exam_id),
            "student_id": str(attempt.student_id),
            "start_time": attempt.start_time.isoformat(),
            "end_time": attempt.end_time.isoformat() if (attempt.end_time is not None) else None,
            "score": attempt.score,
            "total_possible_score": attempt.total_possible_score,
        }
        
        return {
            "exam": exam_dict,
            "attempt": attempt_dict,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n=== ERROR IN START_EXAM ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/attempts/{attempt_id}/resume")
def resume_exam(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Resume an existing exam attempt for the current student."""
    # Get the attempt and verify ownership
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.student_id == current_user.id,
            models.ExamAttempt.end_time.is_(None)  # Must be unfinished
        )
        .first()
    )
    
    if not attempt:
        raise HTTPException(
            status_code=404,
            detail="Unfinished attempt not found or does not belong to you",
        )
    
    # Get the exam
    exam = crud.get_exam_by_id(db, attempt.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if not exam.is_published:
        raise HTTPException(
            status_code=400,
            detail="Exam is not published anymore",
        )
    
    # Auto-submit once the attempt's time is up
    now = datetime.now(timezone.utc)
    deadline = crud.get_attempt_deadline(attempt, exam)
    if now > deadline:
        # Auto-submit the exam
        crud.calculate_and_save_score(db, attempt)
        attempt = db.query(models.ExamAttempt).filter(
            models.ExamAttempt.id == attempt_id
        ).first()
        return {
            "exam": {"id": str(exam.id), "title": exam.title, "auto_submitted": True},
            "attempt": {
                "id": str(attempt.id),
                "exam_id": str(attempt.exam_id),
                "student_id": str(attempt.student_id),
                "start_time": attempt.start_time.isoformat(),
                "end_time": attempt.end_time.isoformat() if (attempt.end_time is not None) else None,
                "score": attempt.score,
                "total_possible_score": attempt.total_possible_score,
            },
        }
    
    # Return exam details (without correct_answers) and attempt info
    time_remaining_seconds = max(0, int((deadline - now).total_seconds()))
    
    exam_dict = {
        "id": str(exam.id),
        "title": exam.title,
        "start_time": exam.start_time.isoformat(),
        "end_time": exam.end_time.isoformat(),
        "duration_minutes": exam.duration_minutes,
        "is_published": exam.is_published,
        "questions": [
            {
                "id": str(q.id),
                "title": q.title,
                "type": q.type,
                "complexity": q.complexity,
                "max_score": q.max_score,
                "options": q.options,
            }
            for q in (exam.questions or [])
        ],
        "time_remaining_seconds": max(0, time_remaining_seconds),
        "exam_end_time": exam.end_time.isoformat(),
    }
    attempt_dict = {
        "id": str(attempt.id),
        "exam_id": str(attempt.exam_id),
        "student_id": str(attempt.student_id),
        "start_time": attempt.start_time.isoformat(),
        "end_time": attempt.end_time.isoformat() if (attempt.end_time is not None) else None,
        "score": attempt.score,
        "total_possible_score": attempt.total_possible_score,
    }
    
    return {
        "exam": exam_dict,
        "attempt": attempt_dict,
    }


@router.post("/attempts/{attempt_id}/save-answer")
def save_answer(
    attempt_id: UUID,
    answer_in: schemas.AnswerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Auto-save a student's answer to a question."""
    try:
        crud.save_answer(db, attempt_id, current_user.id, answer_in)
        return {"status": "saved"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/attempts/{attempt_id}/submit")
def submit_exam(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Submit the exam attempt and calculate the score."""
    # Get the attempt and verify ownership
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.student_id == current_user.id,
        )
        .first()
    )
    
    if not attempt:
        raise HTTPException(
            status_code=404,
            detail="Attempt not found or does not belong to you",
        )
    
    if attempt.end_time is not None:
        raise HTTPException(
            status_code=400,
            detail="Exam already submitted",
        )
    
    # Calculate and save score
    try:
        # Store these values BEFORE calling calculate_and_save_score which may expunge the session
        attempt_id = str(attempt.id)
        exam_id = str(attempt.exam_id)
        student_id = str(attempt.student_id)
        start_time = attempt.start_time.isoformat()
        
        updated_attempt = crud.calculate_and_save_score(db, attempt)
        
        # Store the returned values as well
        end_time = updated_attempt.end_time.isoformat() if updated_attempt.end_time else None
        score = updated_attempt.score
        total = updated_attempt.total_possible_score
        
        # Return manually built response instead of using response_model
        return {
            "id": attempt_id,
            "exam_id": exam_id,
            "student_id": student_id,
            "start_time": start_time,
            "end_time": end_time,
            "score": score,
            "total_possible_score": total,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/attempts/{attempt_id}/answers")
def get_attempt_answers(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Get all answers for a specific exam attempt."""
    # Verify attempt belongs to the current student
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.student_id == current_user.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=404,
            detail="Attempt not found or does not belong to you",
        )
    
    # Fetch student's answers for this attempt
    answers = (
        db.query(models.Answer)
        .filter(models.Answer.attempt_id == attempt_id)
        .all()
    )
    
    return [schemas.Answer.model_validate(a) for a in answers]


@router.get("/attempts/{attempt_id}/results")
def get_attempt_results(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Return the submitted attempt with student's answers and the full exam with correct answers."""
    # Verify attempt belongs to the current student
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.student_id == current_user.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found or does not belong to you")

    if attempt.end_time is None:
        raise HTTPException(status_code=400, detail="Exam not submitted")

    # Fetch the full exam (with correct answers)
    exam = crud.get_exam_by_id(db, attempt.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Withhold the answer key while others may still be writing the exam
    answers_revealed = datetime.now(timezone.utc) > crud.as_utc(exam.end_time)

    # Fetch student's answers for this attempt
    answers = (
        db.query(models.Answer)
        .filter(models.Answer.attempt_id == attempt.id)
        .all()
    )

    attempt_payload = schemas.ExamAttempt.model_validate(attempt).model_dump()
    attempt_payload["answers"] = [
        schemas.Answer.model_validate(a).model_dump() for a in answers
    ]

    # Get publisher email if published
    publisher_email = None
    if exam.published_by:
        publisher = db.query(models.User).filter(models.User.id == exam.published_by).first()
        publisher_email = publisher.email if publisher else "Unknown"
    
    # Manually build exam dict to avoid Pydantic validation issues with published_by
    exam_payload = {
        "id": str(exam.id),
        "title": exam.title,
        "start_time": exam.start_time.isoformat(),
        "end_time": exam.end_time.isoformat(),
        "duration_minutes": exam.duration_minutes,
        "is_published": exam.is_published,
        "published_by": publisher_email,
        "answers_revealed": answers_revealed,
        "questions": [
            {
                "id": str(q.id),
                "title": q.title,
                "complexity": q.complexity,
                "type": q.type,
                "options": q.options,
                "correct_answers": q.correct_answers if answers_revealed else None,
                "max_score": q.max_score,
                "tags": q.tags,
            }
            for q in (exam.questions or [])
        ],
    }

    return {"attempt": attempt_payload, "exam": exam_payload}


@router.get("/completed-exams/")
def list_completed_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """List all completed exams for the current student with their scores."""
    # Get all completed attempts (end_time is not None)
    attempts = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.student_id == current_user.id,
            models.ExamAttempt.end_time.isnot(None)
        )
        .all()
    )
    
    result = []
    for attempt in attempts:
        exam = crud.get_exam_by_id(db, attempt.exam_id)
        if exam:
            # Get all answers for this attempt
            answers = (
                db.query(models.Answer)
                .filter(models.Answer.attempt_id == attempt.id)
                .all()
            )
            
            # Calculate final score with manual evaluations included
            manual_score_total = 0.0
            for answer in answers:
                eval_record = crud.get_evaluation_by_answer(db, answer.id)
                if eval_record and eval_record.score_awarded is not None:
                    question = crud.get_question_by_id(db, answer.question_id)
                    if question and question.type in ("text", "image_upload"):
                        manual_score_total += float(eval_record.score_awarded)
            
            # Final score: auto-graded + manual scores (capped at total)
            final_score = min(attempt.score + manual_score_total, attempt.total_possible_score or 0)
            
            # Calculate percentage
            percentage = 0
            if attempt.total_possible_score and attempt.total_possible_score > 0:
                percentage = (final_score / attempt.total_possible_score) * 100
            
            result.append({
                "id": str(attempt.id),
                "exam_id": str(attempt.exam_id),
                "exam_title": exam.title,
                "score": final_score,
                "total_possible_score": attempt.total_possible_score,
                "percentage": round(percentage, 2),
                "end_time": attempt.end_time.isoformat(),
            })
    
    return result


@router.get("/attempts/{attempt_id}/evaluated-results")
def get_evaluated_results(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Get exam results with teacher evaluations for a student."""
    # Get the attempt and verify ownership
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.student_id == current_user.id,
            models.ExamAttempt.end_time.isnot(None)  # Must be submitted
        )
        .first()
    )
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found or does not belong to you")
    
    # Get the exam
    exam = crud.get_exam_by_id(db, attempt.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Get student's answers
    answers = (
        db.query(models.Answer)
        .filter(models.Answer.attempt_id == attempt.id)
        .all()
    )
    
    # Get evaluations for all answers
    evaluations_map = {}
    manual_score_total = 0.0  # Sum of manually awarded scores for text/image_upload questions
    for answer in answers:
        eval_record = crud.get_evaluation_by_answer(db, answer.id)
        if eval_record:
            evaluations_map[str(answer.id)] = schemas.Evaluation.model_validate(eval_record).model_dump()
            # Only add manual scores for questions that require manual evaluation (text, image_upload)
            # These are NOT auto-graded, so the manual score IS the score for that question
            if eval_record.score_awarded is not None:
                question = crud.get_question_by_id(db, answer.question_id)
                if question and question.type in ("text", "image_upload"):
                    manual_score_total += float(eval_record.score_awarded)
    
    # Calculate final score: auto-graded questions score + manual evaluation scores
    # Ensure it doesn't exceed total possible score
    final_score = min(attempt.score + manual_score_total, attempt.total_possible_score or 0)
    
    # Build answer details with evaluations
    answers_with_eval = []
    for answer in answers:
        question = crud.get_question_by_id(db, answer.question_id)
        evaluation = evaluations_map.get(str(answer.id))
        
        answers_with_eval.append({
            "id": str(answer.id),
            "question_id": str(answer.question_id),
            "question_title": question.title if question else "Unknown",
            "question_type": question.type if question else "unknown",
            "answer_data": answer.answer_data,
            "evaluation": evaluation,
        })
    
    # Calculate percentage using final score
    percentage = 0
    if attempt.total_possible_score and attempt.total_possible_score > 0:
        percentage = (final_score / attempt.total_possible_score) * 100
    
    # Get publisher info
    publisher_email = "Unknown"
    if exam.published_by:  # Use the foreign key ID, not the relationship
        publisher = db.query(models.User).filter(models.User.id == exam.published_by).first()
        if publisher:
            publisher_email = publisher.email
    
    return {
        "exam_title": exam.title,
        "score": final_score,
        "total_possible_score": attempt.total_possible_score,
        "percentage": round(percentage, 2),
        "submitted_at": attempt.end_time.isoformat(),
        "published_by": publisher_email,
        "answers_with_evaluations": answers_with_eval,
    }
