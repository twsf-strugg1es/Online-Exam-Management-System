"""Email backends: memory for tests, console (files) for development, SMTP for production."""
import logging

from app import notify


def test_memory_backend_keeps_the_email(monkeypatch):
    monkeypatch.setenv("EMAIL_BACKEND", "memory")
    notify.outbox.clear()
    assert notify.send_email("a@example.com", "Hello", "Body text")
    assert notify.outbox[-1].to == "a@example.com" and notify.outbox[-1].text == "Body text"


def test_console_backend_writes_a_file_and_keeps_the_body_out_of_logs(monkeypatch, tmp_path, caplog):
    monkeypatch.setenv("EMAIL_BACKEND", "console")
    monkeypatch.setenv("EMAIL_OUTBOX_DIR", str(tmp_path))
    with caplog.at_level(logging.INFO):
        assert notify.send_email("b@example.com", "Reset", "secret-link-123")
    files = list(tmp_path.glob("*.eml"))
    assert len(files) == 1 and b"secret-link-123" in files[0].read_bytes()
    assert "secret-link-123" not in caplog.text


def test_smtp_backend_uses_starttls_and_logs_in(monkeypatch):
    sent = {}

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            sent["server"] = (host, port)

        def starttls(self, context):
            sent["tls"] = True

        def login(self, user, password):
            sent["login"] = user

        def send_message(self, msg):
            sent["to"] = msg["To"]
            sent["from"] = msg["From"]

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    monkeypatch.setattr(notify.smtplib, "SMTP", FakeSMTP)
    for key, value in {"EMAIL_BACKEND": "smtp", "SMTP_HOST": "smtp.example.com", "SMTP_PORT": "587",
                       "SMTP_USERNAME": "apikey", "SMTP_PASSWORD": "x", "EMAIL_FROM": "Fairpaper <hello@example.com>"}.items():
        monkeypatch.setenv(key, value)
    assert notify.send_email("c@example.com", "Hi", "Body")
    assert sent == {"server": ("smtp.example.com", 587), "tls": True, "login": "apikey",
                    "to": "c@example.com", "from": "Fairpaper <hello@example.com>"}


def test_a_failed_send_returns_false_without_leaking_the_address(monkeypatch, caplog):
    def broken(*args, **kwargs):
        raise OSError("connection refused")

    monkeypatch.setenv("EMAIL_BACKEND", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(notify.smtplib, "SMTP", broken)
    with caplog.at_level(logging.ERROR):
        assert notify.send_email("private.person@example.com", "Hi", "Body") is False
    assert "private.person" not in caplog.text
