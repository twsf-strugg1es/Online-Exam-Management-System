"""Tests for exam integrity rules: question secrecy, deadlines, answer key timing, retakes, sessions."""
from datetime import datetime, timedelta, timezone

import pytest

from app import crud, models
from app.security import create_access_token


def auth_headers(user):
    token = create_access_token({"sub": user.email})
    headers = {"Authorization": f"Bearer {token}"}
    if user.memberships:
        headers["X-Organization-Id"] = str(user.memberships[0].organization_id)
    return headers


def make_exam(db, question, start_offset=timedelta(minutes=-5), window=timedelta(hours=2),
              duration_minutes=30, groups=()):
    now = datetime.now(timezone.utc)
    exam = models.Exam(
        organization_id=question.organization_id,
        title="Integrity Test Exam",
        start_time=now + start_offset,
        end_time=now + start_offset + window,
        duration_minutes=duration_minutes,
        is_published=True,
    )
    exam.questions.append(question)
    exam.groups.extend(groups)
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@pytest.fixture
def question(test_db, org):
    q = models.Question(
        organization_id=org.id,
        title="Secret question: capital of France?",
        complexity="easy",
        type="single_choice",
        options=["Paris", "London"],
        correct_answers=["Paris"],
        max_score=1,
    )
    test_db.add(q)
    test_db.commit()
    test_db.refresh(q)
    return q


def start(client, student, exam):
    response = client.post(f"/student/exams/{exam.id}/start", headers=auth_headers(student))
    assert response.status_code == 200, response.text
    return response.json()


def save(client, student, attempt_id, question_id, answer=("Paris",)):
    return client.post(
        f"/student/attempts/{attempt_id}/save-answer",
        json={"question_id": str(question_id), "answer_data": list(answer)},
        headers=auth_headers(student),
    )


def test_exam_list_does_not_leak_questions(client, test_db, sample_student_user, question):
    make_exam(test_db, question, start_offset=timedelta(days=1))  # upcoming

    response = client.get("/student/exams/", headers=auth_headers(sample_student_user))

    assert response.status_code == 200
    exams = response.json()
    assert exams[0]["question_count"] == 1
    assert "questions" not in exams[0]
    assert question.title not in response.text


def test_answer_saves_while_time_remains(client, test_db, sample_student_user, question):
    exam = make_exam(test_db, question)
    attempt_id = start(client, sample_student_user, exam)["attempt"]["id"]

    assert save(client, sample_student_user, attempt_id, question.id).status_code == 200


def test_cannot_change_answers_after_submitting(client, test_db, sample_student_user, question):
    exam = make_exam(test_db, question)
    attempt_id = start(client, sample_student_user, exam)["attempt"]["id"]
    client.post(f"/student/attempts/{attempt_id}/submit", headers=auth_headers(sample_student_user))

    response = save(client, sample_student_user, attempt_id, question.id)

    assert response.status_code == 403
    assert "submitted" in response.json()["detail"]


def test_cannot_change_answers_after_time_is_up(client, test_db, sample_student_user, question):
    exam = make_exam(test_db, question, duration_minutes=30)
    attempt_id = start(client, sample_student_user, exam)["attempt"]["id"]
    attempt = test_db.get(models.ExamAttempt, models.ExamAttempt.id.type.python_type(attempt_id))
    attempt.start_time = datetime.now(timezone.utc) - timedelta(minutes=32)
    test_db.commit()

    response = save(client, sample_student_user, attempt_id, question.id)

    assert response.status_code == 403
    assert "time is over" in response.json()["detail"]


def test_cannot_answer_question_from_another_exam(client, test_db, sample_student_user, question):
    exam = make_exam(test_db, question)
    other = models.Question(organization_id=question.organization_id, title="Other", complexity="easy",
                            type="text", correct_answers=[], max_score=1)
    test_db.add(other)
    test_db.commit()
    attempt_id = start(client, sample_student_user, exam)["attempt"]["id"]

    assert save(client, sample_student_user, attempt_id, other.id).status_code == 403


def test_timer_is_capped_at_exam_window_end(client, test_db, sample_student_user, question):
    # 60-minute exam, but the window closes 10 minutes from now
    exam = make_exam(test_db, question, start_offset=timedelta(minutes=-50),
                     window=timedelta(minutes=60), duration_minutes=60)

    remaining = start(client, sample_student_user, exam)["exam"]["time_remaining_seconds"]

    assert 0 < remaining <= 10 * 60


def test_answer_key_hidden_until_exam_window_closes(client, test_db, sample_student_user, question):
    exam = make_exam(test_db, question)
    attempt_id = start(client, sample_student_user, exam)["attempt"]["id"]
    save(client, sample_student_user, attempt_id, question.id)
    client.post(f"/student/attempts/{attempt_id}/submit", headers=auth_headers(sample_student_user))

    during = client.get(f"/student/attempts/{attempt_id}/results", headers=auth_headers(sample_student_user)).json()
    assert during["exam"]["answers_revealed"] is False
    assert during["exam"]["questions"][0]["correct_answers"] is None
    assert during["attempt"]["score"] == 1  # the student still sees their own score

    exam.end_time = datetime.now(timezone.utc) - timedelta(minutes=1)
    test_db.commit()

    after = client.get(f"/student/attempts/{attempt_id}/results", headers=auth_headers(sample_student_user)).json()
    assert after["exam"]["answers_revealed"] is True
    assert after["exam"]["questions"][0]["correct_answers"] == ["Paris"]


def test_cannot_retake_a_submitted_exam(client, test_db, sample_student_user, question):
    exam = make_exam(test_db, question)
    attempt_id = start(client, sample_student_user, exam)["attempt"]["id"]
    client.post(f"/student/attempts/{attempt_id}/submit", headers=auth_headers(sample_student_user))

    response = client.post(f"/student/exams/{exam.id}/start", headers=auth_headers(sample_student_user))

    assert response.status_code == 400
    assert "already submitted" in response.json()["detail"]
    listed = client.get("/student/exams/", headers=auth_headers(sample_student_user)).json()
    assert listed[0]["is_submitted"] is True


def test_group_exam_is_hidden_from_candidates_outside_the_group(client, test_db, sample_student_user, question):
    hsc = models.Group(organization_id=question.organization_id, name="HSC")
    exam = make_exam(test_db, question, groups=[hsc])  # student is in no group
    headers = auth_headers(sample_student_user)

    assert client.get("/student/exams/", headers=headers).json() == []
    assert client.post(f"/student/exams/{exam.id}/start", headers=headers).status_code == 404

    sample_student_user.memberships[0].groups.append(hsc)
    test_db.commit()

    assert len(client.get("/student/exams/", headers=headers).json()) == 1
    assert client.post(f"/student/exams/{exam.id}/start", headers=headers).status_code == 200


def test_token_refresh_issues_a_working_token(client, sample_student_user):
    response = client.post("/token/refresh", headers=auth_headers(sample_student_user))

    assert response.status_code == 200
    new_token = response.json()["access_token"]
    me = client.get("/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me.json()["email"] == sample_student_user.email


def test_token_refresh_requires_a_valid_token(client):
    response = client.post("/token/refresh", headers={"Authorization": "Bearer not-a-token"})

    assert response.status_code == 401


def test_simultaneous_starts_create_only_one_attempt(test_db, sample_student_user, question):
    exam = make_exam(test_db, question)

    # Two "start" requests that both passed the "no attempt yet" check
    first = crud.create_exam_attempt(test_db, exam.id, sample_student_user.id)
    second = crud.create_exam_attempt(test_db, exam.id, sample_student_user.id)

    assert first.id == second.id
    assert test_db.query(models.ExamAttempt).filter(models.ExamAttempt.exam_id == exam.id).count() == 1
