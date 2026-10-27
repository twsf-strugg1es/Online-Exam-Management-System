"""Bulk student import: preview a CSV/XLSX list, then enroll everyone in it.

New addresses get an account and an invite to set their password; people who already have a
TestKori account are added and told by email. The confirm step reads the file again, so
nothing from the preview is trusted.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import crud, invites, models, notify, roster
from ..database import get_db
from ..permissions import require_manager

router = APIRouter(prefix="/org/students/import", tags=["Organizations"])

# Row problems and outcomes (shown to staff, translated on the client)
INVALID_EMAIL = "Not a valid email address."
MISSING_EMAIL = "No email address."
REPEATED = "Repeated in this file."
IS_STAFF = "Already staff in this organization."
STATUS_NEW = "new"            # no account yet: created and invited
STATUS_EXISTING = "existing"  # has an account: added to the organization
STATUS_MEMBER = "member"      # already a student here: only the groups change


async def _read(file: UploadFile) -> list[tuple[int, str, str]]:
    content = await file.read(roster.MAX_BYTES + 1)
    try:
        return roster.read_rows(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


def _plan(db: Session, membership: models.Membership, rows: list[tuple[int, str, str]]) -> list[dict]:
    """What would happen to each row. Rows with an `error` are skipped."""
    planned, seen = [], {}
    emails = {e for _, raw, _ in rows if (e := roster.normalize_email(raw))}
    users = {
        u.email.lower(): u
        for u in db.query(models.User).filter(func.lower(models.User.email).in_(emails)).all()
    } if emails else {}
    members = {
        m.user_id: m
        for m in db.query(models.Membership).filter(
            models.Membership.organization_id == membership.organization_id,
            models.Membership.user_id.in_([u.id for u in users.values()]),
        ).all()
    } if users else {}

    for row, raw, name in rows:
        entry = {"row": row, "email": raw.strip(), "full_name": name or None, "status": None, "error": None}
        email = roster.normalize_email(raw)
        if not raw.strip():
            entry["error"] = MISSING_EMAIL
        elif not email:
            entry["error"] = INVALID_EMAIL
        elif email in seen:
            entry["error"] = REPEATED
            entry["first_row"] = seen[email]
        else:
            seen[email] = row
            entry["email"] = email
            user = users.get(email)
            member = members.get(user.id) if user else None
            if member and member.role != models.ROLE_CANDIDATE:
                entry["error"] = IS_STAFF
            else:
                entry["status"] = STATUS_MEMBER if member else STATUS_EXISTING if user else STATUS_NEW
        planned.append(entry)
    return planned


def _summary(planned: list[dict]) -> dict:
    valid = [p for p in planned if not p["error"]]
    return {
        "rows": planned,
        "valid": len(valid),
        "errors": len(planned) - len(valid),
        "new": sum(p["status"] == STATUS_NEW for p in valid),
        "existing": sum(p["status"] == STATUS_EXISTING for p in valid),
        "members": sum(p["status"] == STATUS_MEMBER for p in valid),
    }


def _org_groups(db: Session, membership: models.Membership, group_ids: list[UUID]) -> list[models.Group]:
    groups = db.query(models.Group).filter(
        models.Group.id.in_(group_ids), models.Group.organization_id == membership.organization_id
    ).all() if group_ids else []
    if len(groups) != len(set(group_ids)):
        raise HTTPException(status_code=404, detail="Group not found")
    return groups


def _parse_group_ids(raw: str) -> list[UUID]:
    try:
        return [UUID(g) for g in raw.split(",") if g.strip()]
    except ValueError:
        raise HTTPException(status_code=404, detail="Group not found")


@router.post("/preview")
async def preview_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    membership: models.Membership = Depends(require_manager),
):
    """Check a student list without changing anything."""
    return _summary(_plan(db, membership, await _read(file)))


@router.post("")
async def run_import(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    group_ids: str = Form(""),  # comma-separated; every imported student joins these groups
    db: Session = Depends(get_db),
    membership: models.Membership = Depends(require_manager),
):
    """Enroll every valid row: create or link the account, add it to the groups, email it."""
    groups = _org_groups(db, membership, _parse_group_ids(group_ids))
    planned = _plan(db, membership, await _read(file))
    org_name = membership.organization.name
    now = datetime.now(timezone.utc)
    emails = []

    for entry in planned:
        if entry["error"]:
            continue
        if entry["status"] == STATUS_NEW:
            user, link = invites.create_invited_user(db, entry["email"], entry["full_name"], now)
            emails.append(invites.invite_email(org_name, user, link, models.ROLE_CANDIDATE))
        else:
            user = crud.get_user_by_email(db, entry["email"])
        member = crud.get_membership(db, user.id, membership.organization_id)
        if member is None:
            member = models.Membership(user_id=user.id, organization_id=membership.organization_id, role=models.ROLE_CANDIDATE)
            db.add(member)
            if entry["status"] == STATUS_EXISTING:
                emails.append(invites.added_email(org_name, user, models.ROLE_CANDIDATE))
        db.flush()
        for group in groups:
            if group not in member.groups:
                member.groups.append(group)
    db.commit()

    for to, subject, text in emails:
        background.add_task(notify.send_email, to, subject, text)
    return {**_summary(planned), "emailed": len(emails)}
