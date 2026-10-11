import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
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
        connect_args={"check_same_thread": False},
        # Every in-memory SQLite connection is a separate empty database, so share one
        poolclass=StaticPool,
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
def org(test_db):
    """An organization that the sample users belong to."""
    organization = models.Organization(name="Test Organization")
    test_db.add(organization)
    test_db.commit()
    test_db.refresh(organization)
    return organization


def _add_member(db, user, organization, role):
    db.add(models.Membership(user_id=user.id, organization_id=organization.id, role=role))
    db.commit()
    db.refresh(user)


@pytest.fixture
def sample_admin_user(test_db, org):
    """Create a test user who owns the test organization."""
    user_data = schemas.UserCreate(
        email="admin@test.com",
        password="AdminPassword123!",
        full_name="Test Admin"
    )
    user = crud.create_user(test_db, user_data)
    _add_member(test_db, user, org, models.ROLE_OWNER)
    user.password = "AdminPassword123!"  # Store plaintext for testing
    return user


@pytest.fixture
def sample_student_user(test_db, org):
    """Create a test user who is a candidate in the test organization."""
    user_data = schemas.UserCreate(
        email="student@test.com",
        password="StudentPassword123!",
        full_name="Test Student",
        gender="male",
    )
    user = crud.create_user(test_db, user_data)
    _add_member(test_db, user, org, models.ROLE_CANDIDATE)
    user.password = "StudentPassword123!"  # Store plaintext for testing
    return user
