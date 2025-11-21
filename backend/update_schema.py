#!/usr/bin/env python
"""Update database schema to add tags column if it doesn't exist."""

from sqlalchemy import text, inspect
from app.database import engine

try:
    # Check if tags column exists
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('questions')]
    
    if 'tags' not in columns:
        # Add the tags column
        with engine.begin() as conn:
            conn.execute(text('ALTER TABLE questions ADD COLUMN tags JSON DEFAULT NULL'))
        print("✓ Added 'tags' column to questions table")
    else:
        print("✓ 'tags' column already exists")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
