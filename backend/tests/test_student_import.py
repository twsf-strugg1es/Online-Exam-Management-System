"""Bulk student import (PRD AC15): preview with reasons, enroll the valid rows, invite new people."""
import io
import re

import openpyxl

from app import models, notify
from tests.test_organizations import headers_for, make_org, make_user

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def xlsx(rows, header=("Email", "Full name")):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(list(header))
    for row in rows:
        ws.append(list(row))
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return {"file": ("students.xlsx", stream, XLSX)}


def csv_file(text, name="students.csv"):
    return {"file": (name, io.BytesIO(text.encode("utf-8")), "text/csv")}


def setup(db):
    notify.outbox.clear()
    org = make_org(db, "Import Coaching")
    owner = make_user(db, "owner@import.com", org, models.ROLE_OWNER)
    group = models.Group(organization_id=org.id, name="Batch A")
    db.add(group)
    db.commit()
    return org, owner, group, headers_for(owner, org)


def test_ac15_two_hundred_rows_with_three_bad_ones(client, test_db):
    org, owner, group, h = setup(test_db)
    rows = [(f"student{i}@school.edu", f"Student {i}") for i in range(197)]
    rows += [("not-an-email", "Broken"), ("", "No email"), ("student5@school.edu", "Repeat")]
    res = client.post("/org/students/import/preview", headers=h, files=xlsx(rows))
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["valid"] == 197 and data["errors"] == 3 and data["new"] == 197
    reasons = {r["row"]: r["error"] for r in data["rows"] if r["error"]}
    assert reasons == {199: "Not a valid email address.", 200: "No email address.", 201: "Repeated in this file."}
    assert test_db.query(models.User).count() == 1  # preview changes nothing

    res = client.post("/org/students/import", headers=h, files=xlsx(rows), data={"group_ids": str(group.id)})
    assert res.status_code == 200, res.text
    assert res.json()["valid"] == 197 and res.json()["emailed"] == 197
    test_db.refresh(group)
    assert len(group.members) == 197
    students = test_db.query(models.Membership).filter_by(organization_id=org.id, role=models.ROLE_CANDIDATE).count()
    assert students == 197
    assert len(notify.outbox) == 197 and "/invite/" in notify.outbox[0].text


def test_an_invite_link_sets_the_first_password(client, test_db):
    org, owner, group, h = setup(test_db)
    client.post("/org/students/import", headers=h, files=csv_file("email,name\nNadia@School.edu,Nadia Karim\n"))
    token = re.search(r"/invite/([\w-]+)", notify.outbox[-1].text).group(1)
    assert "7 days" in notify.outbox[-1].text

    res = client.post("/password-reset/confirm", json={"token": token, "new_password": "My-own-pass1"})
    assert res.status_code == 200
    # Stored lower-case; signing in works however the email is typed
    res = client.post("/token", data={"username": "NADIA@school.edu", "password": "My-own-pass1"})
    assert res.status_code == 200
    me = client.get("/me", headers={"Authorization": f"Bearer {res.json()['access_token']}"}).json()
    assert me["full_name"] == "Nadia Karim" and me["memberships"][0]["role"] == models.ROLE_CANDIDATE
    assert me["email_verified_at"] is not None
    assert client.post("/password-reset/confirm", json={"token": token, "new_password": "Again-pass1"}).status_code == 400


def test_existing_accounts_are_linked_and_told(client, test_db):
    org, owner, group, h = setup(test_db)
    other_org = make_org(test_db, "Elsewhere")
    make_user(test_db, "Rafi@Mail.com", other_org, models.ROLE_CANDIDATE)  # has an account already
    current = make_user(test_db, "mitu@mail.com", org, models.ROLE_CANDIDATE)  # already a student here
    make_user(test_db, "teacher@mail.com", org, models.ROLE_EXAMINER)

    files = lambda: csv_file("Email\nrafi@mail.com\nMITU@mail.com\nteacher@mail.com\n")
    data = client.post("/org/students/import/preview", headers=h, files=files()).json()
    by_email = {r["email"]: r for r in data["rows"]}
    assert by_email["rafi@mail.com"]["status"] == "existing"
    assert by_email["mitu@mail.com"]["status"] == "member"
    assert by_email["teacher@mail.com"]["error"] == "Already staff in this organization."

    res = client.post("/org/students/import", headers=h, files=files(), data={"group_ids": str(group.id)}).json()
    assert res["emailed"] == 1 and "added you as a student" in notify.outbox[-1].text
    assert test_db.query(models.User).filter(models.User.email.ilike("rafi@mail.com")).count() == 1  # no duplicate
    test_db.refresh(group)
    assert {m.user.email.lower() for m in group.members} == {"rafi@mail.com", "mitu@mail.com"}
    teacher = test_db.query(models.Membership).join(models.User).filter(models.User.email == "teacher@mail.com").one()
    assert teacher.role == models.ROLE_EXAMINER  # untouched


def test_bad_files_get_a_clear_reason(client, test_db):
    _, _, _, h = setup(test_db)
    cases = [
        (csv_file("name\nArif\n"), "email"),
        (csv_file("email\n"), "no students"),
        (csv_file("x", name="students.pdf"), ".xlsx"),
        (csv_file("email\n" + "\n".join(f"s{i}@x.com" for i in range(1001))), "1000"),
    ]
    for files, words in cases:
        res = client.post("/org/students/import/preview", headers=h, files=files)
        assert res.status_code == 400 and words in res.json()["detail"], res.text


def test_only_managers_of_this_organization_can_import(client, test_db):
    org, _, group, h = setup(test_db)
    examiner = make_user(test_db, "examiner@import.com", org, models.ROLE_EXAMINER)
    assert client.post("/org/students/import/preview", headers=headers_for(examiner, org), files=csv_file("email\na@b.com\n")).status_code == 403

    other = make_org(test_db, "Rival Import")
    rival = make_user(test_db, "owner@rival-import.com", other, models.ROLE_OWNER)
    rh = headers_for(rival, other)
    # A group from another organization is refused, and nothing is created
    res = client.post("/org/students/import", headers=rh, files=csv_file("email\nz@b.com\n"), data={"group_ids": str(group.id)})
    assert res.status_code == 404
    assert test_db.query(models.User).filter_by(email="z@b.com").first() is None


def test_emails_match_whatever_the_case(client, test_db):
    make_user(test_db, "arif@mail.com")
    res = client.post("/signup", json={"email": "Arif@Mail.com", "password": "Str0ng-pass!"})
    assert res.status_code == 400  # same person, not a second account
    assert client.post("/token", data={"username": "ARIF@mail.com", "password": "Password123!"}).status_code == 200
