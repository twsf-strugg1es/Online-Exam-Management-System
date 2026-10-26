"""Indexes for the common lookups; one answer per question per attempt

The answer upsert was enforced only in code, so two saves racing (two tabs, a retried
request) could store the same question twice. Duplicates are removed first: the one
with a teacher's evaluation is kept, otherwise any one of them.

Revision ID: 0007_indexes_unique_answers
Revises: 0006_locale_settings
Create Date: 2026-10-26
"""
from alembic import op

revision = "0007_indexes_unique_answers"
down_revision = "0006_locale_settings"
branch_labels = None
depends_on = None

DUPLICATES = """
    SELECT id FROM (
        SELECT a.id, ROW_NUMBER() OVER (
            PARTITION BY a.attempt_id, a.question_id
            ORDER BY EXISTS (SELECT 1 FROM evaluations e WHERE e.answer_id = a.id) DESC, a.id
        ) AS rn
        FROM answers a
    ) ranked
    WHERE rn > 1
"""


def upgrade() -> None:
    op.execute(f"DELETE FROM evaluations WHERE answer_id IN ({DUPLICATES})")
    op.execute(f"DELETE FROM answers WHERE id IN ({DUPLICATES})")
    op.create_unique_constraint("uq_answer_attempt_question", "answers", ["attempt_id", "question_id"])
    op.create_index("ix_exam_attempts_student_id", "exam_attempts", ["student_id"])
    op.create_index("ix_evaluations_answer_id", "evaluations", ["answer_id"])
    op.create_index("ix_exams_organization_start", "exams", ["organization_id", "start_time"])


def downgrade() -> None:
    op.drop_index("ix_exams_organization_start", table_name="exams")
    op.drop_index("ix_evaluations_answer_id", table_name="evaluations")
    op.drop_index("ix_exam_attempts_student_id", table_name="exam_attempts")
    op.drop_constraint("uq_answer_attempt_question", "answers", type_="unique")
