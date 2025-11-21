#!/usr/bin/env python
"""Add evaluation features to the database."""

from sqlalchemy import text, inspect
from app.database import engine

try:
    inspector = inspect(engine)
    
    # Check if published_by column exists in exams
    exam_columns = [col['name'] for col in inspector.get_columns('exams')]
    if 'published_by' not in exam_columns:
        with engine.begin() as conn:
            conn.execute(text('ALTER TABLE exams ADD COLUMN published_by UUID REFERENCES users(id)'))
        print("✓ Added 'published_by' column to exams table")
    else:
        print("✓ 'published_by' column already exists in exams")
    
    # Check if evaluations table exists
    tables = inspector.get_table_names()
    if 'evaluations' not in tables:
        with engine.begin() as conn:
            conn.execute(text('''
                CREATE TABLE evaluations (
                    id UUID PRIMARY KEY,
                    answer_id UUID NOT NULL REFERENCES answers(id),
                    evaluated_by UUID NOT NULL REFERENCES users(id),
                    is_correct BOOLEAN,
                    comment VARCHAR(100),
                    score_awarded FLOAT,
                    created_at TIMESTAMP WITH TIME ZONE,
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            '''))
        print("✓ Created evaluations table")
    else:
        print("✓ evaluations table already exists")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
