#!/usr/bin/env python
"""The launch waitlist, for the Fairpaper team (not organizations).

Usage:
  python manage_waitlist.py count
  python manage_waitlist.py export [file.csv]       # default: waitlist.csv
  python manage_waitlist.py send-launch [--dry-run]

send-launch emails every address that hasn't been sent the launch email and hasn't
unsubscribed, once, and records `notified_at` after each send, so running it again only
reaches the people it missed. It needs a real sender: EMAIL_BACKEND=smtp and EMAIL_FROM.
--dry-run lists who would get it and sends nothing.
"""
import csv
import sys
from datetime import datetime, timezone

from app import models, notify
from app.database import SessionLocal
from app.routers.password_reset import _app_url
from app.routers.waitlist import unsubscribe_link

FIELDS = ("email", "source", "locale", "created_at", "notified_at", "unsubscribed_at")


def launch_email(signup: models.WaitlistSignup) -> tuple[str, str, str]:
    """(to, subject, text). Placeholder copy until the owner approves the launch wording."""
    return signup.email, "Fairpaper is open", (
        "Hi,\n\n"
        "You asked us to tell you when Fairpaper opens. It's open now.\n\n"
        "Teachers set short, timed tests; students take them on a locked-down page, and every tab "
        "switch is on the record. Start your organization here:\n"
        f"{_app_url()}/signup/organization\n\n"
        "This is the only launch email we'll send you.\n"
        f"Don't want emails from Fairpaper? Unsubscribe: {unsubscribe_link(signup)}\n"
    )


def pending(db):
    return (
        db.query(models.WaitlistSignup)
        .filter(models.WaitlistSignup.notified_at.is_(None), models.WaitlistSignup.unsubscribed_at.is_(None))
        .order_by(models.WaitlistSignup.created_at)
        .all()
    )


def send_launch(db, dry_run: bool = False) -> int:
    """Send the launch email to everyone still waiting. Returns how many were sent."""
    sent = 0
    for signup in pending(db):
        if dry_run:
            print(signup.email)
            continue
        if notify.send_email(*launch_email(signup)):
            signup.notified_at = datetime.now(timezone.utc)
            db.commit()  # per row: a crash halfway never re-sends to the ones already done
            sent += 1
    return sent


def export(db, path: str) -> int:
    rows = db.query(models.WaitlistSignup).order_by(models.WaitlistSignup.created_at).all()
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(FIELDS)
        for r in rows:
            values = [getattr(r, k) for k in FIELDS]
            writer.writerow([v.isoformat() if isinstance(v, datetime) else v or "" for v in values])
    return len(rows)


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else ""
    db = SessionLocal()
    try:
        if command == "count":
            total = db.query(models.WaitlistSignup).count()
            print(f"{total} on the waitlist, {len(pending(db))} not yet emailed")
        elif command == "export":
            path = argv[2] if len(argv) > 2 else "waitlist.csv"
            print(f"Wrote {export(db, path)} rows to {path}")
        elif command == "send-launch":
            dry_run = "--dry-run" in argv
            if not dry_run and notify._backend() != "smtp":
                # A console or memory "send" would mark everyone as emailed without reaching anyone
                print("Set EMAIL_BACKEND=smtp (and EMAIL_FROM) first, or use --dry-run.")
                return 1
            sent = send_launch(db, dry_run=dry_run)
            if not dry_run:
                print(f"Sent the launch email to {sent} people; {len(pending(db))} still waiting (failed sends are retried next run)")
        else:
            print(__doc__)
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
