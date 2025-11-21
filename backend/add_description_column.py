#!/usr/bin/env python
"""Add description column to questions table if it doesn't exist."""

from sqlalchemy import text
from app.database import engine

def add_description_column():
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='questions' AND column_name='description'
            """))
            if result.fetchone():
                print("Description column already exists")
                return
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE questions ADD COLUMN description VARCHAR
            """))
            conn.commit()
            print("Description column added successfully!")
        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    add_description_column()
