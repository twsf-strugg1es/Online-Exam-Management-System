"""Deleting never erases results: used questions and started exams are archived instead."""
import uuid
from datetime import datetime, timedelta, timezone

from app import models
from tests.test_organizations import headers_for, make_exam, make_org, make_user


def setup(db):
    org = make_org(db, "Archive Coaching")
    owner = make_user(db, "owner@archive.com", org, models.ROLE_OWNER)
    student = make_user(db, "student@archive.com", org, models.ROLE_CANDIDATE)
    exam = make_exam(db, org, "Physics")
    return org, owner, student, exam


def take_exam(client, student, org, exam):
    h = headers_for(student, org)
    attempt = client.post(f"/student/exams/{exam.id}/start", headers=h).json()["attempt"]
    q = exam.questions[0]
    client.post(f"/student/attempts/{attempt['id']}/save-answer", headers=h, json={"question_id": str(q.id), "answer_data": "a"})
    client.post(f"/student/attempts/{attempt['id']}/submit", headers=h)
    return uuid.UUID(attempt["id"])


def test_unused_question_is_really_deleted(client, test_db):
    org, owner, _, _ = setup(test_db)
    q = models.Question(organization_id=org.id, title="Spare", complexity="easy", type="text", correct_answers=None, max_score=1)
    test_db.add(q); test_db.commit()

    res = client.delete(f"/admin/questions/{q.id}", headers=headers_for(owner, org))
    assert res.status_code == 200 and res.json()["status"] == "deleted"
    assert test_db.query(models.Question).filter_by(id=q.id).first() is None


def test_answered_question_is_archived_and_answers_survive(client, test_db):
    org, owner, student, exam = setup(test_db)
    attempt_id = take_exam(client, student, org, exam)
    q = exam.questions[0]
    h = headers_for(owner, org)

    res = client.delete(f"/admin/questions/{q.id}", headers=h)
    assert res.json()["status"] == "archived"
    test_db.expire_all()
    assert test_db.query(models.Question).filter_by(id=q.id).one().archived_at is not None
    assert test_db.query(models.Answer).filter_by(attempt_id=attempt_id).count() == 1

    listed = [x["id"] for x in client.get("/admin/questions/", headers=h).json()]
    assert str(q.id) not in listed
    assert client.get(f"/admin/questions/{q.id}", headers=h).status_code == 404

    # The student's result still shows the question and their score
    results = client.get(f"/student/attempts/{attempt_id}/results", headers=headers_for(student, org)).json()
    assert any(x["id"] == str(q.id) for x in results["exam"]["questions"])


def test_bulk_delete_never_removes_answers(client, test_db):
    org, owner, student, exam = setup(test_db)
    take_exam(client, student, org, exam)
    spare = models.Question(organization_id=org.id, title="Spare", complexity="easy", type="text", correct_answers=None, max_score=1)
    test_db.add(spare); test_db.commit()
    answers_before = test_db.query(models.Answer).count()

    res = client.post("/admin/questions/delete-bulk", headers=headers_for(owner, org),
                      json={"question_ids": [str(exam.questions[0].id), str(spare.id)]})
    assert res.json() == {"status": "success", "deleted": 1, "archived": 1, "failed": 0}
    assert test_db.query(models.Answer).count() == answers_before


def test_bulk_delete_skips_other_organizations(client, test_db):
    org, owner, _, _ = setup(test_db)
    other = make_exam(test_db, make_org(test_db, "Other"), "Theirs")
    res = client.post("/admin/questions/delete-bulk", headers=headers_for(owner, org),
                      json={"question_ids": [str(other.questions[0].id)]})
    assert res.json()["failed"] == 1
    assert test_db.query(models.Question).filter_by(id=other.questions[0].id).one().archived_at is None


def test_archived_question_cannot_be_put_in_a_new_exam(client, test_db):
    org, owner, student, exam = setup(test_db)
    take_exam(client, student, org, exam)
    q = exam.questions[0]
    h = headers_for(owner, org)
    client.delete(f"/admin/questions/{q.id}", headers=h)

    now = datetime.now(timezone.utc)
    res = client.post("/admin/exams/", headers=h, json={
        "title": "Reuse", "start_time": now.isoformat(), "end_time": (now + timedelta(hours=1)).isoformat(),
        "duration_minutes": 30, "question_ids": [str(q.id)],
    })
    assert res.status_code == 404


def test_exam_nobody_started_is_deleted(client, test_db):
    org, owner, _, exam = setup(test_db)
    res = client.delete(f"/admin/exams/{exam.id}", headers=headers_for(owner, org))
    assert res.json()["status"] == "deleted"
    assert test_db.query(models.Exam).filter_by(id=exam.id).first() is None


def test_started_exam_is_archived_hidden_and_closed(client, test_db):
    org, owner, student, exam = setup(test_db)
    attempt_id = take_exam(client, student, org, exam)
    h = headers_for(owner, org)

    res = client.delete(f"/admin/exams/{exam.id}", headers=h)
    assert res.json()["status"] == "archived"
    test_db.expire_all()
    stored = test_db.query(models.Exam).filter_by(id=exam.id).one()
    assert stored.archived_at is not None and stored.is_published is False
    assert test_db.query(models.ExamAttempt).filter_by(id=attempt_id).count() == 1
    assert test_db.query(models.Answer).filter_by(attempt_id=attempt_id).count() == 1

    assert str(exam.id) not in [e["id"] for e in client.get("/admin/exams/", headers=h).json()]
    sh = headers_for(student, org)
    assert str(exam.id) not in [e["id"] for e in client.get("/student/exams/", headers=sh).json()]
    # ...but the student can still open their own result
    assert client.get(f"/student/attempts/{attempt_id}/results", headers=sh).status_code == 200


def test_archived_exam_cannot_be_started(client, test_db):
    org, owner, _, exam = setup(test_db)
    other_student = make_user(test_db, "late@archive.com", org, models.ROLE_CANDIDATE)
    first = make_user(test_db, "first@archive.com", org, models.ROLE_CANDIDATE)
    take_exam(client, first, org, exam)
    client.delete(f"/admin/exams/{exam.id}", headers=headers_for(owner, org))

    res = client.post(f"/student/exams/{exam.id}/start", headers=headers_for(other_student, org))
    assert res.status_code in (400, 404)
