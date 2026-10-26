"""Password reset (PRD AC14): one email, a single-use 30-minute link, the same answer for
every email address, and used or expired links rejected."""
import re
from datetime import datetime, timedelta, timezone

from app import models, notify, rate_limit
from app.rate_limit import limiter
from tests.test_organizations import make_user


def request(client, email):
    return client.post("/password-reset/request", json={"email": email})


def link_token():
    match = re.search(r"/reset-password/([\w-]+)", notify.outbox[-1].text)
    assert match, notify.outbox[-1].text
    return match.group(1)


def confirm(client, token, password="N3w-password!"):
    return client.post("/password-reset/confirm", json={"token": token, "new_password": password})


def sign_in(client, email, password):
    return client.post("/token", data={"username": email, "password": password})


def setup_function():
    notify.outbox.clear()


def test_the_link_resets_the_password_once(client, test_db):
    make_user(test_db, "reset@example.com")
    assert request(client, "reset@example.com").status_code == 200
    assert len(notify.outbox) == 1 and notify.outbox[0].to == "reset@example.com"
    assert "30 minutes" in notify.outbox[0].text
    token = link_token()

    assert confirm(client, token).status_code == 200
    assert sign_in(client, "reset@example.com", "N3w-password!").status_code == 200
    assert sign_in(client, "reset@example.com", "Password123!").status_code == 400

    res = confirm(client, token, "Another-pass1")  # used links don't work again
    assert res.status_code == 400 and "invalid or has expired" in res.json()["detail"]


def test_the_answer_is_the_same_for_unknown_emails(client, test_db):
    make_user(test_db, "known@example.com")
    known = request(client, "known@example.com")
    unknown = request(client, "unknown@example.com")
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert [e.to for e in notify.outbox] == ["known@example.com"]


def test_expired_links_are_rejected(client, test_db):
    user = make_user(test_db, "late@example.com")
    request(client, "late@example.com")
    token = link_token()
    record = test_db.query(models.PasswordResetToken).filter_by(user_id=user.id).one()
    record.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    test_db.commit()
    assert confirm(client, token).status_code == 400


def test_only_the_newest_link_works(client, test_db):
    make_user(test_db, "twice@example.com")
    request(client, "twice@example.com")
    first = link_token()
    request(client, "twice@example.com")
    second = link_token()
    assert confirm(client, first).status_code == 400
    assert confirm(client, second).status_code == 200


def test_tokens_are_stored_hashed(client, test_db):
    make_user(test_db, "hashed@example.com")
    request(client, "hashed@example.com")
    token = link_token()
    stored = test_db.query(models.PasswordResetToken).one().token_hash
    assert token not in stored and len(stored) == 64


def test_a_made_up_token_is_rejected(client, test_db):
    assert confirm(client, "x" * 43).status_code == 400


def test_short_passwords_are_refused(client, test_db):
    make_user(test_db, "short@example.com")
    request(client, "short@example.com")
    assert confirm(client, link_token(), "abc").status_code == 422


def test_an_inbox_gets_at_most_a_few_emails_an_hour(client, test_db):
    make_user(test_db, "flood@example.com")
    limit, _ = rate_limit.RESET_EMAILS_PER_ACCOUNT
    for _ in range(limit + 3):
        assert request(client, "flood@example.com").status_code == 200
    assert len(notify.outbox) == limit


def test_resetting_unlocks_a_locked_account(client, test_db):
    make_user(test_db, "locked@example.com")
    limit, _ = rate_limit.LOGIN_FAILURES_PER_ACCOUNT
    for _ in range(limit):
        sign_in(client, "locked@example.com", "wrong")
    assert sign_in(client, "locked@example.com", "Password123!").status_code == 429
    request(client, "locked@example.com")
    confirm(client, link_token())
    assert sign_in(client, "locked@example.com", "N3w-password!").status_code == 200


def test_requests_from_one_ip_are_capped(client, test_db):
    limit, _ = rate_limit.RESET_REQUEST_PER_IP
    for _ in range(limit):
        limiter.add("reset-request:testclient")
    assert request(client, "anyone@example.com").status_code == 429
