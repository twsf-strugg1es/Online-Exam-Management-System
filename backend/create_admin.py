#!/usr/bin/env python
"""Create an organization and its owner account, for local development.

Usage: python create_admin.py [email] [password] [organization name]
Defaults: admin@example.com / a random password (printed once) / "Demo Organization"
"""
import secrets
import sys

from app.database import SessionLocal
from app import crud, schemas


def create_admin(email="admin@example.com", password=None, org_name="Demo Organization"):
    # No shared default password: every demo owner gets their own
    password = password or secrets.token_urlsafe(12)
    db = SessionLocal()
    try:
        existing = crud.get_user_by_email(db, email)
        if existing and existing.memberships:
            orgs = ", ".join(f"{m.organization.name} ({m.role})" for m in existing.memberships)
            print(f"User {email} already exists and belongs to: {orgs}")
            return

        owner = existing or crud.create_user(
            db, schemas.UserCreate(email=email, password=password, full_name="Admin User"), commit=False
        )
        org = crud.create_organization(db, org_name, owner)
        print("Organization created successfully!")
        print(f"Organization: {org.name}")
        print(f"Join code for students: {org.join_code}")
        print(f"Owner: {email}")
        if not existing:
            print(f"Password: {password}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin(*sys.argv[1:4])
