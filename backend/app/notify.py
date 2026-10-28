"""Sending email. One function, `send_email`, and a backend chosen by `EMAIL_BACKEND`:

- `console` (default): writes each email to a file in `EMAIL_OUTBOX_DIR` for local
  development. Nothing is sent and the body (which can hold a reset link) never goes
  to the log.
- `memory`: keeps emails in `outbox` so tests can read them.
- `smtp`: sends through any SMTP server (Amazon SES, Brevo, Mailgun, Postmark, Google
  Workspace...). Set `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS / 465 TLS), `SMTP_USERNAME`,
  `SMTP_PASSWORD` and `EMAIL_FROM`.
"""
import logging
import os
import smtplib
import ssl
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class Email:
    to: str
    subject: str
    text: str
    html: str | None = None


outbox: list[Email] = []  # the memory backend's mailbox


def _backend() -> str:
    return os.getenv("EMAIL_BACKEND", "console").lower()


def _sender() -> str:
    return os.getenv("EMAIL_FROM", "Fairpaper <no-reply@localhost>")


def _message(email: Email) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = _sender()
    msg["To"] = email.to
    msg["Subject"] = email.subject
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain=_sender().rsplit("@", 1)[-1].strip("> ") or None)
    msg.set_content(email.text)
    if email.html:
        msg.add_alternative(email.html, subtype="html")
    return msg


def _send_console(email: Email) -> None:
    folder = Path(os.getenv("EMAIL_OUTBOX_DIR", ".outbox"))
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    path = folder / f"{stamp}-{uuid.uuid4().hex[:8]}.eml"
    path.write_bytes(bytes(_message(email)))
    logger.info("Email written to the local outbox", extra={"fields": {"path": str(path), "subject": email.subject}})


def _send_smtp(email: Email) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "587"))
    username, password = os.getenv("SMTP_USERNAME"), os.getenv("SMTP_PASSWORD")
    context = ssl.create_default_context()
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, context=context, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        server.starttls(context=context)
    with server:
        if username:
            server.login(username, password or "")
        server.send_message(_message(email))


def send_email(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send one email. Returns False (and logs) instead of raising, so a mail outage
    never turns into an error page; callers that must know can check the result."""
    email = Email(to=to, subject=subject, text=text, html=html)
    backend = _backend()
    try:
        if backend == "memory":
            outbox.append(email)
        elif backend == "smtp":
            _send_smtp(email)
        else:
            _send_console(email)
        return True
    except Exception:
        # The recipient's domain is enough to investigate; the address and body stay out of logs
        logger.exception("Email could not be sent", extra={"fields": {"backend": backend, "to_domain": to.rsplit("@", 1)[-1]}})
        return False


def warn_if_not_sending() -> None:
    if _backend() == "console":
        logger.warning("EMAIL_BACKEND is console: emails are written to the local outbox, not sent")
