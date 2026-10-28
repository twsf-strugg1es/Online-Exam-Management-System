"""Abandoned attempts (closed tab, lost connection) are scored at their deadline by the job."""
import uuid
from datetime import datetime, timedelta, timezone

from app import crud, jobs, models
from tests.test_organizations import headers_for, make_exam, make_org, make_user


def start_attempt(client, db, email="away@finalize.com"):
    org = make_org(db, f"Finalize {email}")
    student = make_user(db, email, org, models.ROLE_CANDIDATE)
    exam = make_exam(db, org, "Biology")  # opened 5 min ago, closes in 1 h, 30 min per attempt
    h = headers_for(student, org)
    attempt = client.post(f"/student/exams/{exam.id}/start", headers=h).json()["attempt"]
    q = exam.questions[0]
    client.post(f"/student/attempts/{attempt['id']}/save-answer", headers=h, json={"question_id": str(q.id), "answer_data": "a"})
    return db.get(models.ExamAttempt, uuid.UUID(attempt["id"])), exam


def test_an_abandoned_attempt_is_scored_at_its_deadline(client, test_db):
    attempt, exam = start_attempt(client, test_db)
    deadline = crud.get_attempt_deadline(attempt, exam)

    # Still inside the answer grace period: left alone
    assert jobs.finalize_overdue_attempts(test_db, now=deadline + timedelta(seconds=10)) == 0
    assert attempt.end_time is None

    # A minute after the deadline the job closes it
    assert jobs.finalize_overdue_attempts(test_db, now=deadline + timedelta(minutes=1)) == 1
    test_db.refresh(attempt)
    assert attempt.submit_reason == models.SUBMIT_TIME_UP
    assert crud.as_utc(attempt.end_time) == deadline  # when time ran out, not when the job ran
    assert attempt.score == 1 and attempt.total_possible_score == 1


def test_running_the_job_twice_scores_once(client, test_db):
    attempt, exam = start_attempt(client, test_db)
    later = crud.get_attempt_deadline(attempt, exam) + timedelta(minutes=2)
    assert jobs.finalize_overdue_attempts(test_db, now=later) == 1
    assert jobs.finalize_overdue_attempts(test_db, now=later) == 0


def test_attempts_still_running_are_left_alone(client, test_db):
    attempt, _ = start_attempt(client, test_db)
    assert jobs.finalize_overdue_attempts(test_db, now=datetime.now(timezone.utc)) == 0
    test_db.refresh(attempt)
    assert attempt.end_time is None


def test_a_submit_after_the_job_keeps_the_jobs_result(client, test_db):
    attempt, exam = start_attempt(client, test_db)
    deadline = crud.get_attempt_deadline(attempt, exam)
    jobs.finalize_overdue_attempts(test_db, now=deadline + timedelta(minutes=1))
    # A late submit from a tab that comes back online finds it closed
    assert crud.finish_attempt(test_db, attempt, reason=models.SUBMIT_STUDENT) is False
    test_db.refresh(attempt)
    assert attempt.submit_reason == models.SUBMIT_TIME_UP


def test_submitting_twice_scores_once(client, test_db):
    attempt, _ = start_attempt(client, test_db, "double@finalize.com")
    assert crud.finish_attempt(test_db, attempt) is True
    first_end = attempt.end_time
    assert crud.finish_attempt(test_db, attempt) is False
    test_db.refresh(attempt)
    assert attempt.end_time == first_end and attempt.submit_reason == models.SUBMIT_STUDENT
