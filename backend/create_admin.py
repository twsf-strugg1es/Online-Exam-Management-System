#!/usr/bin/env python
"""Create a test admin user in the database."""

from app.database import SessionLocal
from app import crud, schemas, security

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = crud.get_user_by_email(db, "admin@example.com")
        if existing:
            print(f"Admin user already exists: {existing.email}")
            return
        
        # Create admin user
        admin_data = schemas.UserCreate(
            email="admin@example.com",
            password="admin123",
            full_name="Admin User",
            role="admin",
        )
        
        admin = crud.create_user(db, admin_data)
        print(f"Admin user created successfully!")
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role}")
        print(f"Password: admin123")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
