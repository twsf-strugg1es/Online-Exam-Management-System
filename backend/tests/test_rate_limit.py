"""Rate limits on sign-in, signup and join codes return 429 with Retry-After."""
from app import models, rate_limit
from app.rate_limit import limiter
from tests.test_organizations import headers_for, make_org, make_user


def sign_in(client, email, password):
    return client.post("/token", data={"username": email, "password": password})


def test_repeated_wrong_passwords_lock_the_account_for_a_while(client, test_db):
    make_user(test_db, "target@limits.com")
    limit, _ = rate_limit.LOGIN_FAILURES_PER_ACCOUNT
    for _ in range(limit):
        assert sign_in(client, "target@limits.com", "wrong").status_code == 400
    res = sign_in(client, "target@limits.com", "Password123!")  # even the right password waits
    assert res.status_code == 429
    assert int(res.headers["Retry-After"]) > 0


def test_a_successful_sign_in_resets_the_failure_count(client, test_db):
    make_user(test_db, "forgetful@limits.com")
    limit, _ = rate_limit.LOGIN_FAILURES_PER_ACCOUNT
    for _ in range(limit - 1):
        sign_in(client, "forgetful@limits.com", "wrong")
    assert sign_in(client, "forgetful@limits.com", "Password123!").status_code == 200
    assert sign_in(client, "forgetful@limits.com", "wrong").status_code == 400  # not locked


def test_unknown_emails_are_limited_the_same_way(client, test_db):
    limit, _ = rate_limit.LOGIN_FAILURES_PER_ACCOUNT
    for _ in range(limit):
        sign_in(client, "nobody@limits.com", "x")
    assert sign_in(client, "nobody@limits.com", "x").status_code == 429


def test_one_network_can_sign_in_a_whole_class(client, test_db):
    org = make_org(test_db, "Big Class")
    for i in range(40):
        make_user(test_db, f"s{i}@limits.com", org, models.ROLE_CANDIDATE)
    assert all(sign_in(client, f"s{i}@limits.com", "Password123!").status_code == 200 for i in range(40))


def test_signups_from_one_ip_are_capped(client, test_db):
    limit, _ = rate_limit.SIGNUP_PER_IP
    for _ in range(limit):  # TestClient requests come from "testclient"
        limiter.add("signup:testclient")
    res = client.post("/signup", json={"email": "late@limits.com", "password": "Str0ng-pass!"})
    assert res.status_code == 429
    assert test_db.query(models.User).filter_by(email="late@limits.com").first() is None


def test_join_code_guessing_is_capped(client, test_db):
    org = make_org(test_db, "Join Org")
    user = make_user(test_db, "guesser@limits.com")
    h = headers_for(user)
    limit, _ = rate_limit.JOIN_PER_USER
    for i in range(limit):
        assert client.post("/organizations/join", headers=h, json={"join_code": f"WRONG{i:03d}"}).status_code == 400
    assert client.post("/organizations/join", headers=h, json={"join_code": org.join_code}).status_code == 429


def test_limits_can_be_switched_off(client, test_db, monkeypatch):
    monkeypatch.setattr(limiter, "enabled", False)
    limit, _ = rate_limit.LOGIN_FAILURES_PER_ACCOUNT
    for _ in range(limit + 2):
        assert sign_in(client, "off@limits.com", "x").status_code == 400
