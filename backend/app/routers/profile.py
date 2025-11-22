from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from ..database import get_db
from ..security import get_current_user, verify_password, get_password_hash
from .. import models, schemas, crud
from datetime import date

router = APIRouter(prefix="/profile", tags=["profile"])


def get_current_student_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Verify the current user is a student."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required",
        )
    return current_user


def get_current_admin_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Verify the current user is an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


@router.get("/student")
def get_student_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Get current student's profile details."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return schemas.UserProfile.model_validate(user)


@router.get("/student/{student_id}")
def get_student_profile_by_id(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    """Get a student's profile by ID (admin only)."""
    user = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return schemas.UserProfile.model_validate(user)


@router.put("/student")
def update_student_profile(
    profile_update: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_student_user),
):
    """Update student profile (full_name, date_of_birth, gender, exam_candidate)."""
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update allowed fields
    allowed_fields = ["full_name", "date_of_birth", "gender", "exam_candidate"]
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
    current_user: models.User = Depends(get_current_student_user),
):
    """Change student password."""
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
