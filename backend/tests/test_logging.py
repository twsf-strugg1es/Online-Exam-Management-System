import io
import json
import logging
import uuid

import pytest

from app import crud
from app.logging_config import JsonFormatter
from app.security import create_access_token


def auth_headers(user, org=None, **extra):
    headers = {"Authorization": f"Bearer {create_access_token({'sub': user.email})}", **extra}
    if org is not None:
        headers["X-Organization-Id"] = str(org.id)
    return headers


@pytest.fixture
def json_logs():
    """Capture log lines as the production JSON formatter writes them."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.addHandler(handler)
    yield lambda: [json.loads(line) for line in stream.getvalue().splitlines()]
    root.removeHandler(handler)


def request_lines(lines):
    return [line for line in lines if line["logger"] == "app.request" and line["message"] == "request"]


def test_every_response_carries_a_request_id(client):
    response = client.get("/health")
    assert len(response.headers["X-Request-ID"]) == 32


def test_a_safe_incoming_request_id_is_kept(client):
    response = client.get("/health", headers={"X-Request-ID": "lb-1234.abc_9"})
    assert response.headers["X-Request-ID"] == "lb-1234.abc_9"


@pytest.mark.parametrize("bad_id", ["has space", "x" * 65, "line\nbreak", '{"json":1}'])
def test_an_unsafe_incoming_request_id_is_replaced(client, bad_id):
    response = client.get("/health", headers={"X-Request-ID": bad_id})
    assert response.headers["X-Request-ID"] != bad_id
    uuid.UUID(response.headers["X-Request-ID"])


def test_request_log_line_includes_user_and_organization(client, json_logs, sample_admin_user, org):
    response = client.get("/admin/exams/", headers=auth_headers(sample_admin_user, org))
    assert response.status_code == 200

    [line] = request_lines(json_logs())
    assert line["method"] == "GET"
    assert line["path"] == "/admin/exams/"
    assert line["status"] == 200
    assert line["user_id"] == str(sample_admin_user.id)
    assert line["organization_id"] == str(org.id)
    assert line["role"] == "owner"
    assert line["request_id"] == response.headers["X-Request-ID"]
    assert isinstance(line["duration_ms"], float)


def test_unexpected_errors_are_logged_but_not_leaked(client, json_logs, sample_student_user, org, monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("connection string postgres://secret@db")

    monkeypatch.setattr(crud, "get_exam_by_id", broken)
    response = client.post(
        f"/student/exams/{uuid.uuid4()}/start",
        headers=auth_headers(sample_student_user, org, **{"X-Request-ID": "trace-42"}),
    )

    assert response.status_code == 500
    assert "secret" not in response.text
    assert "trace-42" in response.json()["detail"]

    [error] = [line for line in json_logs() if line["level"] == "ERROR"]
    assert error["message"] == "Starting exam failed"
    assert error["request_id"] == "trace-42"
    assert "connection string postgres://secret@db" in error["exception"]
