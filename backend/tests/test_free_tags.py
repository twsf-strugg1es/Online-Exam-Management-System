"""Tags are kept as the teacher wrote them (lower-cased), in any language, and filterable."""
import io
import json

import openpyxl

from app import crud, models
from tests.test_organizations import headers_for, make_org, make_user


def workbook(rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["title", "complexity", "type", "options", "correct_answers", "max_score", "tags"])
    for title, tags in rows:
        ws.append([title, "easy", "single_choice", json.dumps(["a", "b"]), json.dumps(["a"]), 1, tags])
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return {"file": ("q.xlsx", stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}


def test_normalize_tags():
    assert crud.normalize_tags(" Physics, #Waves ,waves,  Class   9 ") == ["physics", "waves", "class 9"]
    assert crud.normalize_tags(["HSC", None, '"quoted"', ""]) == ["hsc", "quoted"]
    assert crud.normalize_tags(None) == []
    assert len(crud.normalize_tags(",".join(f"t{i}" for i in range(50)))) == crud.MAX_TAGS
    assert len(crud.normalize_tags("x" * 100)[0]) == crud.MAX_TAG_LENGTH


def test_import_keeps_every_tag_as_written(client, test_db):
    org = make_org(test_db, "Tags Coaching")
    owner = make_user(test_db, "owner@tags.com", org, models.ROLE_OWNER)
    h = headers_for(owner, org)
    res = client.post("/admin/upload-questions/", headers=h, files=workbook([
        ("Ohm's law", "Physics, Electricity, Class 10"),
        ("Bangla grammar", "বাংলা, ব্যাকরণ"),
    ]))
    assert res.status_code == 200, res.text
    tags = {q.title: q.tags for q in test_db.query(models.Question).all()}
    assert tags["Ohm's law"] == ["physics", "electricity", "class 10"]
    assert tags["Bangla grammar"] == ["বাংলা", "ব্যাকরণ"]
    assert all("others" not in t for t in tags.values())


def test_filtering_by_tag_works_in_any_script(client, test_db):
    org = make_org(test_db, "Filter Coaching")
    owner = make_user(test_db, "owner@filter.com", org, models.ROLE_OWNER)
    h = headers_for(owner, org)
    client.post("/admin/upload-questions/", headers=h, files=workbook([
        ("Waves", "physics, waves"), ("Grammar", "বাংলা"), ("Optics", "physics"),
    ]))
    titles = lambda tag: sorted(q["title"] for q in client.get("/admin/questions/", headers=h, params={"tag": tag}).json())
    assert titles("Physics") == ["Optics", "Waves"]
    assert titles("বাংলা") == ["Grammar"]
    assert titles("wave") == []  # whole tags only


def test_underscores_in_tags_are_not_wildcards(client, test_db):
    org = make_org(test_db, "Wildcard Coaching")
    owner = make_user(test_db, "owner@wildcard.com", org, models.ROLE_OWNER)
    h = headers_for(owner, org)
    client.post("/admin/upload-questions/", headers=h, files=workbook([("A", "unit_1"), ("B", "unitx1")]))
    res = client.get("/admin/questions/", headers=h, params={"tag": "unit_1"}).json()
    assert [q["title"] for q in res] == ["A"]
