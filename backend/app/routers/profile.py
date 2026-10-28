from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from ..database import get_db
from ..security import get_current_user, verify_password, get_password_hash
from .. import models, schemas, crud
from ..permissions import require_staff
from datetime import date

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/student")
def get_student_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get the current user's profile details."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return schemas.UserProfile.model_validate(user)


@router.get("/student/{student_id}")
def get_student_profile_by_id(
    student_id: UUID,
    db: Session = Depends(get_db),
    membership: models.Membership = Depends(require_staff),
):
    """Get the profile of a candidate in the staff member's organization."""
    candidate = crud.get_membership(db, student_id, membership.organization_id)
    if not candidate or candidate.role != models.ROLE_CANDIDATE:
        raise HTTPException(status_code=404, detail="Student not found")

    return schemas.UserProfile.model_validate(candidate.user)


@router.put("/student")
def update_student_profile(
    profile_update: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update the current user's profile (full_name, date_of_birth, gender, language)."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if profile_update.get("language") not in (None, *models.LANGUAGES):
        raise HTTPException(status_code=400, detail="Unsupported language")

    # Update allowed fields; language null means "use the organization's"
    allowed_fields = ["full_name", "date_of_birth", "gender", "language"]
    for field in allowed_fields:
        if field in profile_update:
            setattr(user, field, profile_update[field])

    db.commit()
    db.refresh(user)
    return schemas.UserProfile.model_validate(user)


@router.post("/change-password")
def change_student_password(
    password_change: dict,  # {"old_password": str, "new_password": str}
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Change the current user's password."""
    from ..security import verify_password, get_password_hash

    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify old password
    if not verify_password(password_change.get("old_password", ""), user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    # Update password
    user.hashed_password = get_password_hash(password_change.get("new_password", ""))
    db.commit()

    return {"message": "Password updated successfully"}
