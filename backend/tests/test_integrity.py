"""Tests for exam integrity: event logging, violation limits, shuffling and the examiner report."""
from datetime import datetime, timedelta, timezone

import pytest

from app import crud, models, schemas
from app.security import create_access_token


def headers(user, org):
    return {
        "Authorization": f"Bearer {create_access_token({'sub': user.email})}",
        "X-Organization-Id": str(org.id),
    }


def make_exam(db, org, n_questions=1, **settings):
    now = datetime.now(timezone.utc)
    exam = models.Exam(
        organization_id=org.id, title="Integrity exam", start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=1), duration_minutes=30, is_published=True, **settings,
    )
    for i in range(n_questions):
        exam.questions.append(models.Question(
            organization_id=org.id, title=f"Q{i}", complexity="easy", type="single_choice",
            options=["a", "b", "c", "d"], correct_answers="a", max_score=1,
        ))
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


def make_student(db, org, email):
    user = crud.create_user(db, schemas.UserCreate(email=email, password="Password123!"))
    db.add(models.Membership(user_id=user.id, organization_id=org.id, role=models.ROLE_CANDIDATE))
    db.commit()
    return user


def start(client, student, org, exam):
    response = client.post(f"/student/exams/{exam.id}/start", headers=headers(student, org))
    assert response.status_code == 200, response.text
    return response.json()


def report(client, student, org, attempt_id, *types):
    return client.post(
        f"/student/attempts/{attempt_id}/events",
        json={"events": [{"type": t} for t in types]},
        headers=headers(student, org),
    )


# --- Events and violations ---

def test_start_returns_integrity_settings(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, require_fullscreen=True, max_violations=3)

    session = start(client, sample_student_user, org, exam)

    assert session["integrity"]["require_fullscreen"] is True
    assert session["integrity"]["max_violations"] == 3
    assert session["integrity"]["violations"] == 0


def test_only_violations_count_toward_the_limit(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, max_violations=5)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]

    response = report(client, sample_student_user, org, attempt_id,
                      "focus_lost", "focus_returned", "copy_paste", "context_menu", "fullscreen_exit")

    assert response.status_code == 200
    assert response.json()["violations"] == 2
    assert response.json()["submitted"] is False


def test_reaching_the_limit_submits_the_attempt(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, max_violations=2)
    session = start(client, sample_student_user, org, exam)
    attempt_id = session["attempt"]["id"]

    report(client, sample_student_user, org, attempt_id, "focus_lost")
    response = report(client, sample_student_user, org, attempt_id, "fullscreen_exit")

    assert response.json()["submitted"] is True
    assert response.json()["submit_reason"] == "violations"
    save = client.post(f"/student/attempts/{attempt_id}/save-answer",
                       json={"question_id": session["exam"]["questions"][0]["id"], "answer_data": "a"},
                       headers=headers(sample_student_user, org))
    assert save.status_code == 403


def test_no_limit_means_never_auto_submitted(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, max_violations=None)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]

    response = report(client, sample_student_user, org, attempt_id, *["focus_lost"] * 20)

    assert response.json()["violations"] == 20
    assert response.json()["submitted"] is False


def test_events_after_submitting_are_ignored(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    client.post(f"/student/attempts/{attempt_id}/submit", headers=headers(sample_student_user, org))

    response = report(client, sample_student_user, org, attempt_id, "focus_lost")

    assert response.status_code == 200
    assert response.json()["violations"] == 0


def test_unknown_event_types_are_rejected(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]

    assert report(client, sample_student_user, org, attempt_id, "made_up").status_code == 422


def test_students_cannot_report_events_on_someone_elses_attempt(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    other = make_student(test_db, org, "other@example.com")

    assert report(client, other, org, attempt_id, "focus_lost").status_code == 404


def test_violations_survive_a_resume(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, max_violations=5)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    report(client, sample_student_user, org, attempt_id, "focus_lost", "focus_lost")

    resumed = client.post(f"/student/attempts/{attempt_id}/resume", headers=headers(sample_student_user, org)).json()

    assert resumed["integrity"]["violations"] == 2


# --- Submit reasons ---

def test_submit_reason_is_student_when_time_remains(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]

    response = client.post(f"/student/attempts/{attempt_id}/submit", headers=headers(sample_student_user, org))

    assert response.json()["submit_reason"] == "student"


def test_submit_reason_is_time_up_at_the_deadline(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    attempt = test_db.get(models.ExamAttempt, models.ExamAttempt.id.type.python_type(attempt_id))
    attempt.start_time = datetime.now(timezone.utc) - timedelta(minutes=30)
    test_db.commit()

    response = client.post(f"/student/attempts/{attempt_id}/submit", headers=headers(sample_student_user, org))

    assert response.json()["submit_reason"] == "time_up"


# --- Shuffling ---

def question_order(session):
    return [q["title"] for q in session["exam"]["questions"]]


def test_shuffled_order_is_stable_for_a_student(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, n_questions=8)
    first = start(client, sample_student_user, org, exam)

    again = start(client, sample_student_user, org, exam)  # returns the same unfinished attempt

    assert question_order(first) == question_order(again)
    assert [q["options"] for q in first["exam"]["questions"]] == [q["options"] for q in again["exam"]["questions"]]


def test_students_get_different_orders(client, test_db, org):
    exam = make_exam(test_db, org, n_questions=8)
    orders = {
        tuple(question_order(start(client, make_student(test_db, org, f"s{i}@example.com"), org, exam)))
        for i in range(3)
    }

    assert len(orders) > 1


def test_shuffling_can_be_switched_off(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, n_questions=8, shuffle_questions=False, shuffle_options=False)

    session = start(client, sample_student_user, org, exam)

    assert question_order(session) == [q.title for q in exam.questions]
    assert all(q["options"] == ["a", "b", "c", "d"] for q in session["exam"]["questions"])


def test_shuffled_options_still_grade_correctly(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org, n_questions=4)
    session = start(client, sample_student_user, org, exam)
    attempt_id = session["attempt"]["id"]
    h = headers(sample_student_user, org)
    for q in session["exam"]["questions"]:
        assert sorted(q["options"]) == ["a", "b", "c", "d"]
        client.post(f"/student/attempts/{attempt_id}/save-answer", json={"question_id": q["id"], "answer_data": "a"}, headers=h)

    result = client.post(f"/student/attempts/{attempt_id}/submit", headers=h).json()

    assert result["score"] == 4


# --- Examiner side ---

def test_create_exam_with_integrity_settings(client, org, sample_admin_user, test_db):
    question = make_exam(test_db, org).questions[0]
    now = datetime.now(timezone.utc)
    body = {
        "title": "Strict", "start_time": now.isoformat(), "end_time": (now + timedelta(hours=1)).isoformat(),
        "duration_minutes": 30, "question_ids": [str(question.id)],
        "shuffle_questions": False, "require_fullscreen": True, "max_violations": 3,
    }

    response = client.post("/admin/exams/", json=body, headers=headers(sample_admin_user, org))

    assert response.status_code == 200, response.text
    assert response.json()["shuffle_questions"] is False
    assert response.json()["max_violations"] == 3


def test_integrity_report_lists_events_and_risk(client, test_db, org, sample_student_user, sample_admin_user):
    exam = make_exam(test_db, org, max_violations=3)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    client.post(f"/student/attempts/{attempt_id}/events", json={"events": [
        {"type": "focus_lost"},
        {"type": "focus_returned", "details": {"away_ms": 8000}},
        {"type": "copy_paste", "details": {"action": "paste"}},
    ]}, headers=headers(sample_student_user, org))

    report_ = client.get(f"/admin/attempts/{attempt_id}/integrity", headers=headers(sample_admin_user, org)).json()

    assert [e["type"] for e in report_["events"]] == ["focus_lost", "focus_returned", "copy_paste"]
    assert report_["summary"]["violations"] == 1
    assert report_["summary"]["flags"] == 1
    assert report_["summary"]["seconds_away"] == 8
    assert report_["summary"]["risk"] == "review"


def test_auto_submitted_attempts_are_high_risk(client, test_db, org, sample_student_user, sample_admin_user):
    exam = make_exam(test_db, org, max_violations=1)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    report(client, sample_student_user, org, attempt_id, "focus_lost")

    attempts = client.get(f"/admin/exams/{exam.id}/attempts", headers=headers(sample_admin_user, org)).json()

    assert attempts[0]["submit_reason"] == "violations"
    assert attempts[0]["integrity"]["risk"] == "high"


def test_clean_attempts_are_marked_clean(client, test_db, org, sample_student_user, sample_admin_user):
    exam = make_exam(test_db, org)
    start(client, sample_student_user, org, exam)

    attempts = client.get(f"/admin/exams/{exam.id}/attempts", headers=headers(sample_admin_user, org)).json()

    assert attempts[0]["integrity"]["risk"] == "clean"


def test_integrity_report_is_scoped_to_the_organization(client, test_db, org, sample_student_user):
    exam = make_exam(test_db, org)
    attempt_id = start(client, sample_student_user, org, exam)["attempt"]["id"]
    other_org = models.Organization(name="Other")
    test_db.add(other_org)
    test_db.commit()
    outsider = crud.create_user(test_db, schemas.UserCreate(email="boss@other.com", password="Password123!"))
    test_db.add(models.Membership(user_id=outsider.id, organization_id=other_org.id, role=models.ROLE_OWNER))
    test_db.commit()

    response = client.get(f"/admin/attempts/{attempt_id}/integrity", headers=headers(outsider, other_org))

    assert response.status_code == 404
