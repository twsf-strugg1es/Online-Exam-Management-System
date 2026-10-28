"""The server rejects exams the form would also reject, so a script can't create broken ones."""
from datetime import datetime, timedelta, timezone

from app import models
from tests.test_organizations import headers_for, make_org, make_user


def setup(db):
    org = make_org(db, "Validation Coaching")
    owner = make_user(db, "owner@validation.com", org, models.ROLE_OWNER)
    q = models.Question(organization_id=org.id, title="Q", complexity="easy", type="text", correct_answers=None, max_score=1)
    db.add(q)
    db.commit()
    return org, owner, q


def body(q, **overrides):
    start = datetime.now(timezone.utc) + timedelta(hours=1)
    data = {
        "title": "Physics", "start_time": start.isoformat(), "end_time": (start + timedelta(hours=2)).isoformat(),
        "duration_minutes": 60, "question_ids": [str(q.id)],
    }
    data.update(overrides)
    return data


def test_a_valid_exam_is_created(client, test_db):
    org, owner, q = setup(test_db)
    res = client.post("/admin/exams/", headers=headers_for(owner, org), json=body(q, title="  Physics  "))
    assert res.status_code == 200, res.text
    assert res.json()["title"] == "Physics"


def test_broken_exams_are_rejected(client, test_db):
    org, owner, q = setup(test_db)
    h = headers_for(owner, org)
    start = datetime.now(timezone.utc) + timedelta(hours=1)
    cases = {
        "closes before it opens": body(q, end_time=(start - timedelta(minutes=1)).isoformat(), start_time=start.isoformat()),
        "opens and closes together": body(q, end_time=start.isoformat(), start_time=start.isoformat()),
        "zero duration": body(q, duration_minutes=0),
        "negative duration": body(q, duration_minutes=-5),
        "longer than a day": body(q, duration_minutes=24 * 60 + 1),
        "no questions": body(q, question_ids=[]),
        "blank title": body(q, title="   "),
    }
    for name, data in cases.items():
        res = client.post("/admin/exams/", headers=h, json=data)
        assert res.status_code == 422, (name, res.text)
    assert test_db.query(models.Exam).count() == 0


def test_repeated_questions_are_attached_once(client, test_db):
    org, owner, q = setup(test_db)
    res = client.post("/admin/exams/", headers=headers_for(owner, org), json=body(q, question_ids=[str(q.id), str(q.id)]))
    assert res.status_code == 200, res.text
    exam = test_db.query(models.Exam).one()
    assert len(exam.questions) == 1


def test_times_without_an_offset_are_read_as_utc(client, test_db):
    org, owner, q = setup(test_db)
    res = client.post("/admin/exams/", headers=headers_for(owner, org),
                      json=body(q, start_time="2030-01-01T10:00:00", end_time="2030-01-01T12:00:00"))
    assert res.status_code == 200, res.text
    assert res.json()["start_time"].startswith("2030-01-01T10:00:00")
