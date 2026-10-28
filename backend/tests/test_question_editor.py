"""Writing and editing single questions; a question students have met is locked (duplicate it)."""
from app import models
from tests.test_organizations import headers_for, make_exam, make_org, make_user


def setup(db, name="Editor"):
    org = make_org(db, f"{name} Coaching")
    owner = make_user(db, f"owner@{name.lower()}.com", org, models.ROLE_OWNER)
    return org, owner, headers_for(owner, org)


SINGLE = {"title": "  Which is a vector?  ", "complexity": "easy", "type": "single_choice",
          "options": ["Speed", " Velocity ", "Mass"], "correct_answers": "Velocity", "max_score": 2, "tags": ["Physics", "#Vectors"]}


def test_every_type_can_be_written(client, test_db):
    org, owner, h = setup(test_db)
    single = client.post("/admin/questions/", headers=h, json=SINGLE)
    assert single.status_code == 201, single.text
    data = single.json()
    assert data["title"] == "Which is a vector?" and data["options"] == ["Speed", "Velocity", "Mass"]
    assert data["correct_answers"] == "Velocity" and data["tags"] == ["physics", "vectors"] and data["edit_blocked"] is None

    multi = client.post("/admin/questions/", headers=h, json={**SINGLE, "type": "multi_choice", "correct_answers": ["Velocity", "Speed"]})
    assert multi.status_code == 201 and multi.json()["correct_answers"] == ["Velocity", "Speed"]

    for kind in ("text", "image_upload"):
        res = client.post("/admin/questions/", headers=h, json={**SINGLE, "type": kind})
        assert res.status_code == 201 and res.json()["options"] is None and res.json()["correct_answers"] is None


def test_choice_questions_are_checked(client, test_db):
    _, _, h = setup(test_db)
    bad = {
        "one option": {"options": ["Only"], "correct_answers": "Only"},
        "empty option": {"options": ["A", " "], "correct_answers": "A"},
        "same option twice": {"options": ["A", "A"], "correct_answers": "A"},
        "no correct answer": {"correct_answers": None},
        "correct not an option": {"correct_answers": "Weight"},
        "two answers for single": {"correct_answers": ["Speed", "Velocity"]},
        "too many options": {"options": [str(i) for i in range(11)], "correct_answers": "1"},
        "blank title": {"title": "   "},
        "unknown type": {"type": "essay"},
        "zero points": {"max_score": 0},
    }
    for name, change in bad.items():
        assert client.post("/admin/questions/", headers=h, json={**SINGLE, **change}).status_code == 422, name


def test_an_unused_question_can_be_changed(client, test_db):
    _, _, h = setup(test_db)
    qid = client.post("/admin/questions/", headers=h, json=SINGLE).json()["id"]
    res = client.put(f"/admin/questions/{qid}", headers=h, json={**SINGLE, "title": "Pick the vector", "correct_answers": "Velocity", "max_score": 3})
    assert res.status_code == 200 and res.json()["title"] == "Pick the vector" and res.json()["max_score"] == 3


def test_a_question_in_an_exam_nobody_started_can_still_change(client, test_db):
    org, _, h = setup(test_db)
    exam = make_exam(test_db, org, "Unstarted")
    q = exam.questions[0]
    assert client.put(f"/admin/questions/{q.id}", headers=h, json=SINGLE).status_code == 200


def test_a_question_students_have_met_is_locked_but_can_be_duplicated(client, test_db):
    org, _, h = setup(test_db)
    exam = make_exam(test_db, org, "Started")
    q = exam.questions[0]
    student = make_user(test_db, "student@editor.com", org, models.ROLE_CANDIDATE)
    client.post(f"/student/exams/{exam.id}/start", headers=headers_for(student, org))  # started, nothing answered yet

    assert "Duplicate it" in client.get(f"/admin/questions/{q.id}", headers=h).json()["edit_blocked"]
    res = client.put(f"/admin/questions/{q.id}", headers=h, json=SINGLE)
    assert res.status_code == 409

    copy = client.post(f"/admin/questions/{q.id}/duplicate", headers=h)
    assert copy.status_code == 201 and copy.json()["id"] != str(q.id)
    assert copy.json()["title"] == q.title and copy.json()["edit_blocked"] is None
    assert client.put(f"/admin/questions/{copy.json()['id']}", headers=h, json=SINGLE).status_code == 200
    test_db.refresh(exam)
    assert [x.id for x in exam.questions] == [q.id]  # the exam keeps the original


def test_other_organizations_cannot_touch_it(client, test_db):
    _, _, h = setup(test_db)
    qid = client.post("/admin/questions/", headers=h, json=SINGLE).json()["id"]
    _, _, other = setup(test_db, "Rival")
    assert client.get(f"/admin/questions/{qid}", headers=other).status_code == 404
    assert client.put(f"/admin/questions/{qid}", headers=other, json=SINGLE).status_code == 404
    assert client.post(f"/admin/questions/{qid}/duplicate", headers=other).status_code == 404


def test_students_cannot_write_questions(client, test_db):
    org, _, _ = setup(test_db)
    student = make_user(test_db, "pupil@editor.com", org, models.ROLE_CANDIDATE)
    assert client.post("/admin/questions/", headers=headers_for(student, org), json=SINGLE).status_code == 403
