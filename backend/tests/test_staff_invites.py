"""Adding staff by email (task 3.7): people without an account are invited, people with one are told."""
import re

from app import models, notify
from tests.test_organizations import headers_for, make_org, make_user


def setup(db):
    notify.outbox.clear()
    org = make_org(db, "Staff Coaching")
    owner = make_user(db, "owner@staff.com", org, models.ROLE_OWNER)
    return org, owner, headers_for(owner, org)


def invite_token(message):
    return re.search(r"/invite/([\w-]+)", message.text).group(1)


def test_invite_an_examiner_who_has_no_account(client, test_db):
    org, owner, h = setup(test_db)

    res = client.post("/org/members", headers=h, json={"email": "New.Teacher@School.edu", "role": "examiner", "full_name": " Nadia Rahman "})

    assert res.status_code == 201, res.text
    assert res.json()["invited"] is True and res.json()["email"] == "new.teacher@school.edu"
    user = test_db.query(models.User).filter_by(email="new.teacher@school.edu").one()
    assert user.full_name == "Nadia Rahman"
    roles = {m["email"]: m["role"] for m in client.get("/org/members", headers=h).json()}
    assert roles["new.teacher@school.edu"] == "examiner"

    [message] = notify.outbox
    assert message.to == "new.teacher@school.edu"
    assert "Staff Coaching" in message.subject and "as an examiner" in message.text

    # The invite sets the first password; then they can sign in and open the staff pages
    token = invite_token(message)
    assert client.post("/password-reset/confirm", json={"token": token, "new_password": "teacher-pass"}).status_code == 200
    login = client.post("/token", data={"username": "new.teacher@school.edu", "password": "teacher-pass"})
    assert login.status_code == 200
    staff = {"Authorization": f"Bearer {login.json()['access_token']}", "X-Organization-Id": str(org.id)}
    assert client.get("/admin/exams/", headers=staff).status_code == 200
    # The link works once
    assert client.post("/password-reset/confirm", json={"token": token, "new_password": "other-pass"}).status_code == 400


def test_existing_account_is_added_and_told(client, test_db):
    org, owner, h = setup(test_db)
    make_user(test_db, "teacher@x.com")

    res = client.post("/org/members", headers=h, json={"email": "TEACHER@x.com", "role": "admin"})

    assert res.status_code == 201 and res.json()["invited"] is False
    [message] = notify.outbox
    assert "as an admin" in message.text and "/invite/" not in message.text and "/forgot-password" in message.text
    assert test_db.query(models.User).filter(models.User.email.ilike("teacher@x.com")).count() == 1


def test_already_a_member(client, test_db):
    org, owner, h = setup(test_db)
    make_user(test_db, "student@staff.com", org, models.ROLE_CANDIDATE)

    res = client.post("/org/members", headers=h, json={"email": "student@staff.com", "role": "examiner"})

    assert res.status_code == 400
    assert notify.outbox == []


def test_only_managers_invite_and_only_owners_invite_owners(client, test_db):
    org, owner, h = setup(test_db)
    examiner = make_user(test_db, "examiner@staff.com", org, models.ROLE_EXAMINER)
    admin = make_user(test_db, "admin@staff.com", org, models.ROLE_ADMIN)

    as_examiner = client.post("/org/members", headers=headers_for(examiner, org), json={"email": "a@b.com", "role": "examiner"})
    as_admin = client.post("/org/members", headers=headers_for(admin, org), json={"email": "a@b.com", "role": "owner"})
    bad_role = client.post("/org/members", headers=h, json={"email": "a@b.com", "role": "superuser"})

    assert as_examiner.status_code == 403 and as_admin.status_code == 403 and bad_role.status_code == 400
    assert test_db.query(models.User).filter_by(email="a@b.com").count() == 0
    assert notify.outbox == []


def test_invites_stay_in_their_organization(client, test_db):
    org, owner, h = setup(test_db)
    other = make_org(test_db, "Other School")

    client.post("/org/members", headers=h, json={"email": "shared@school.edu", "role": "examiner"})

    user = test_db.query(models.User).filter_by(email="shared@school.edu").one()
    memberships = test_db.query(models.Membership).filter_by(user_id=user.id).all()
    assert [m.organization_id for m in memberships] == [org.id]
    assert other.id not in {m.organization_id for m in memberships}


def test_pending_invite_shows_and_can_be_resent(client, test_db):
    org, owner, h = setup(test_db)
    added = client.post("/org/members", headers=h, json={"email": "late@school.edu", "role": "examiner"}).json()
    make_user(test_db, "active@school.edu", org, models.ROLE_EXAMINER)
    first = invite_token(notify.outbox[0])

    pending = {m["email"]: m["invite_pending"] for m in client.get("/org/members", headers=h).json()}
    assert pending == {"owner@staff.com": False, "late@school.edu": True, "active@school.edu": False}

    res = client.post(f"/org/members/{added['user_id']}/invite", headers=h)
    assert res.status_code == 200, res.text
    second = invite_token(notify.outbox[1])
    # Only the newest link works
    assert client.post("/password-reset/confirm", json={"token": first, "new_password": "late-pass"}).status_code == 400
    assert client.post("/password-reset/confirm", json={"token": second, "new_password": "late-pass"}).status_code == 200

    pending = {m["email"]: m["invite_pending"] for m in client.get("/org/members", headers=h).json()}
    assert pending["late@school.edu"] is False
    again = client.post(f"/org/members/{added['user_id']}/invite", headers=h)
    assert again.status_code == 400 and "already set a password" in again.json()["detail"]


def test_resending_is_limited_and_scoped(client, test_db):
    org, owner, h = setup(test_db)
    added = client.post("/org/members", headers=h, json={"email": "late@school.edu", "role": "examiner"}).json()
    other_org = make_org(test_db, "Other School")
    other_owner = make_user(test_db, "owner@other.com", other_org, models.ROLE_OWNER)

    assert client.post(f"/org/members/{added['user_id']}/invite", headers=headers_for(other_owner, other_org)).status_code == 404
    statuses = [client.post(f"/org/members/{added['user_id']}/invite", headers=h).status_code for _ in range(4)]
    assert statuses == [200, 200, 200, 429]
