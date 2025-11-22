from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, models
from ..security import verify_password, create_access_token, get_current_user

router = APIRouter(tags=["Auth"])


@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm uses field name "username"; we treat it as email
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )
    access_token_expires = timedelta(minutes=60)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    """Get the currently authenticated user's information."""
    return current_user


@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Public signup endpoint for students only."""
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Force role to be 'student' - do not trust client input
    student_user = schemas.UserCreate(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        date_of_birth=user_data.date_of_birth,
        gender=user_data.gender,
        exam_candidate=user_data.exam_candidate,
        role="student",
    )
    
    # Create the new student user
    new_user = crud.create_user(db, student_user)
    return new_user
