"""Invite people who don't have a TestKori account yet, and tell people who do.

Used by the bulk student import and by adding staff. An invited account gets an unusable random
password and a one-time link to `/invite/<token>`, confirmed by `POST /password-reset/confirm`.
"""
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from . import crud, models, schemas
from .routers.password_reset import _app_url, _hash

INVITE_LIFETIME = timedelta(days=7)

# How the role reads in an email: "added you as an examiner"
ROLE_PHRASES = {
    models.ROLE_OWNER: "an owner",
    models.ROLE_ADMIN: "an admin",
    models.ROLE_EXAMINER: "an examiner",
    models.ROLE_CANDIDATE: "a student",
}

WHAT_THEY_CAN_DO = {
    models.ROLE_OWNER: "You can manage everything, including other owners.",
    models.ROLE_ADMIN: "You can manage questions, exams, grading, students and staff.",
    models.ROLE_EXAMINER: "You can write questions, set exams and grade answers.",
    models.ROLE_CANDIDATE: "Their exams will appear on your dashboard.",
}


def _new_invite(db: Session, user: models.User, now: datetime) -> str:
    token = secrets.token_urlsafe(32)
    db.add(models.PasswordResetToken(
        user_id=user.id, token_hash=_hash(token), expires_at=now + INVITE_LIFETIME, purpose=models.TOKEN_INVITE,
    ))
    return f"{_app_url()}/invite/{token}"


def create_invited_user(db: Session, email: str, full_name: str | None, now: datetime) -> tuple[models.User, str]:
    """Create the account and its invite token (not committed). Returns the user and the link."""
    user = crud.create_user(
        db, schemas.UserCreate(email=email, password=secrets.token_urlsafe(32), full_name=full_name), commit=False,
    )
    return user, _new_invite(db, user, now)


def pending_invites(db: Session, user_ids: list) -> set:
    """Users who were invited and haven't set a password yet (their invite is still unused,
    expired or not). Using the invite, or asking for a reset link, closes it."""
    if not user_ids:
        return set()
    rows = db.query(models.PasswordResetToken.user_id).filter(
        models.PasswordResetToken.user_id.in_(user_ids),
        models.PasswordResetToken.purpose == models.TOKEN_INVITE,
        models.PasswordResetToken.used_at.is_(None),
    ).distinct()
    return {user_id for (user_id,) in rows}


def reissue_invite(db: Session, user: models.User, now: datetime) -> str:
    """Replace the user's open links with a fresh 7-day invite (not committed)."""
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id, models.PasswordResetToken.used_at.is_(None)
    ).update({models.PasswordResetToken.used_at: now})
    return _new_invite(db, user, now)


def invite_email(org_name: str, user: models.User, link: str, role: str) -> tuple[str, str, str]:
    """(to, subject, text) for someone whose account was just created."""
    name = user.full_name or user.email
    return user.email, f"{org_name} invited you to TestKori", (
        f"Hi {name},\n\n"
        f"{org_name} has added you as {ROLE_PHRASES[role]} on TestKori, where they run their exams. "
        f"{WHAT_THEY_CAN_DO[role]}\n\n"
        f"Set a password to finish your account. The link works once, for 7 days:\n{link}\n\n"
        f"Then sign in with this email address ({user.email}).\n"
    )


def added_email(org_name: str, user: models.User, role: str) -> tuple[str, str, str]:
    """(to, subject, text) for someone who already has an account."""
    name = user.full_name or user.email
    return user.email, f"You've been added to {org_name} on TestKori", (
        f"Hi {name},\n\n"
        f"{org_name} has added you as {ROLE_PHRASES[role]}. {WHAT_THEY_CAN_DO[role]}\n\n"
        f"Sign in with your usual password: {_app_url()}/login\n"
        f"Forgot it? Get a new one here: {_app_url()}/forgot-password\n"
    )
