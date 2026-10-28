"""Exams can be changed until they open or someone starts them; then the API says why not (409)."""
from datetime import datetime, timedelta, timezone

from app import models
from tests.test_organizations import headers_for, make_exam, make_org, make_user


def setup(db):
    org = make_org(db, "Edit Coaching")
    owner = make_user(db, "owner@edit.com", org, models.ROLE_OWNER)
    q1, q2 = (models.Question(organization_id=org.id, title=t, complexity="easy", type="text", correct_answers=None, max_score=2)
              for t in ("First", "Second"))
    db.add_all([q1, q2])
    db.commit()
    return org, owner, q1, q2


def body(questions, title="Physics", start_in=timedelta(days=1), **extra):
    start = datetime.now(timezone.utc) + start_in
    return {"title": title, "start_time": start.isoformat(), "end_time": (start + timedelta(hours=2)).isoformat(),
            "duration_minutes": 60, "question_ids": [str(q.id) for q in questions], **extra}


def test_a_draft_can_be_changed_completely(client, test_db):
    org, owner, q1, q2 = setup(test_db)
    h = headers_for(owner, org)
    exam_id = client.post("/admin/exams/", headers=h, json=body([q1])).json()["id"]

    res = client.put(f"/admin/exams/{exam_id}", headers=h, json=body([q2], title="Physics, revised", duration_minutes=45, max_violations=5))
    assert res.status_code == 200, res.text
    data = client.get(f"/admin/exams/{exam_id}", headers=h).json()
    assert data["title"] == "Physics, revised" and data["duration_minutes"] == 45 and data["max_violations"] == 5
    assert [q["title"] for q in data["questions"]] == ["Second"]
    assert data["edit_blocked"] is None


def test_a_scheduled_exam_can_still_be_changed(client, test_db):
    org, owner, q1, q2 = setup(test_db)
    h = headers_for(owner, org)
    exam_id = client.post("/admin/exams/", headers=h, json=body([q1])).json()["id"]
    client.post(f"/admin/exams/{exam_id}/publish", headers=h)
    assert client.put(f"/admin/exams/{exam_id}", headers=h, json=body([q1, q2])).status_code == 200
    assert client.get(f"/admin/exams/{exam_id}", headers=h).json()["is_published"] is True


def test_an_open_exam_is_locked_with_a_reason(client, test_db):
    org, owner, q1, _ = setup(test_db)
    exam = make_exam(test_db, org, "Live")  # published, opened 5 minutes ago
    h = headers_for(owner, org)
    res = client.put(f"/admin/exams/{exam.id}", headers=h, json=body([q1]))
    assert res.status_code == 409 and "already open" in res.json()["detail"]
    listed = next(e for e in client.get("/admin/exams/", headers=h).json() if e["id"] == str(exam.id))
    assert "already open" in listed["edit_blocked"]


def test_an_exam_someone_started_is_locked_even_when_unpublished(client, test_db):
    org, owner, q1, _ = setup(test_db)
    exam = make_exam(test_db, org, "Started")
    student = make_user(test_db, "student@edit.com", org, models.ROLE_CANDIDATE)
    client.post(f"/student/exams/{exam.id}/start", headers=headers_for(student, org))
    h = headers_for(owner, org)
    client.post(f"/admin/exams/{exam.id}/unpublish", headers=h)
    res = client.put(f"/admin/exams/{exam.id}", headers=h, json=body([q1]))
    assert res.status_code == 409 and "already started" in res.json()["detail"]


def test_edits_are_validated_like_new_exams(client, test_db):
    org, owner, q1, _ = setup(test_db)
    h = headers_for(owner, org)
    exam_id = client.post("/admin/exams/", headers=h, json=body([q1])).json()["id"]
    assert client.put(f"/admin/exams/{exam_id}", headers=h, json=body([])).status_code == 422
    assert client.put(f"/admin/exams/{exam_id}", headers=h, json=body([q1], duration_minutes=0)).status_code == 422


def test_other_organizations_cannot_see_or_edit_it(client, test_db):
    org, owner, q1, _ = setup(test_db)
    exam_id = client.post("/admin/exams/", headers=headers_for(owner, org), json=body([q1])).json()["id"]
    other = make_org(test_db, "Other")
    outsider = make_user(test_db, "owner@other-edit.com", other, models.ROLE_OWNER)
    oh = headers_for(outsider, other)
    assert client.get(f"/admin/exams/{exam_id}", headers=oh).status_code == 404
    assert client.put(f"/admin/exams/{exam_id}", headers=oh, json=body([q1])).status_code == 404
    # nor attach their own questions to it, or ours to theirs
    their_q = models.Question(organization_id=other.id, title="Theirs", complexity="easy", type="text", correct_answers=None, max_score=1)
    test_db.add(their_q)
    test_db.commit()
    res = client.put(f"/admin/exams/{exam_id}", headers=headers_for(owner, org), json=body([their_q]))
    assert res.status_code == 404


def test_archived_exams_are_gone(client, test_db):
    org, owner, q1, _ = setup(test_db)
    exam = make_exam(test_db, org, "Old")
    exam.archived_at = datetime.now(timezone.utc)
    test_db.commit()
    h = headers_for(owner, org)
    assert client.get(f"/admin/exams/{exam.id}", headers=h).status_code == 404
    assert client.put(f"/admin/exams/{exam.id}", headers=h, json=body([q1])).status_code == 404
