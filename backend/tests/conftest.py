import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.database import Base
from app.main import app
from app import models, schemas, crud
from fastapi.testclient import TestClient


# Use SQLite in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    """Create a test database and tables."""
    engine = create_engine(
        TEST_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create test client with test database."""
    def override_get_db():
        yield test_db
    
    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db
    
    yield TestClient(app)
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_question_data():
    """Provide sample question data for testing."""
    return {
        "title": "What is the capital of France?",
        "description": "A geography question",
        "complexity": "easy",
        "type": "single_choice",
        "options": ["Paris", "London", "Berlin", "Madrid"],
        "correct_answers": "Paris",
        "max_score": 1,
        "tags": ["geography", "world"]
    }


@pytest.fixture
def sample_admin_user(test_db):
    """Create a test admin user."""
    user_data = schemas.UserCreate(
        email="admin@test.com",
        password="AdminPassword123!",
        role="admin",
        full_name="Test Admin"
    )
    user = crud.create_user(test_db, user_data)
    user.password = "AdminPassword123!"  # Store plaintext for testing
    return user


@pytest.fixture
def sample_student_user(test_db):
    """Create a test student user."""
    user_data = schemas.UserCreate(
        email="student@test.com",
        password="StudentPassword123!",
        role="student",
        full_name="Test Student",
        gender="male",
        exam_candidate="SSC"
    )
    user = crud.create_user(test_db, user_data)
    user.password = "StudentPassword123!"  # Store plaintext for testing
    return user
