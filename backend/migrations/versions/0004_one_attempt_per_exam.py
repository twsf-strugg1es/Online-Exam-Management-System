"""One attempt per student per exam

Two "start" requests arriving together could create two attempts for the same student
and exam. This removes such duplicates, then adds a unique constraint so it can't recur.

For each duplicated (exam, student) pair it keeps the submitted attempt (the latest one,
if several were submitted), or else the earliest started, and deletes the rest along
with their answers, grading and integrity events.

Revision ID: 0004_one_attempt_per_exam
Revises: 0003_exam_integrity
Create Date: 2026-10-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_one_attempt_per_exam"
down_revision = "0003_exam_integrity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    attempts = conn.execute(sa.text(
        "SELECT id, exam_id, student_id, start_time, end_time FROM exam_attempts ORDER BY start_time"
    )).all()

    by_pair = {}
    for attempt in attempts:
        by_pair.setdefault((attempt.exam_id, attempt.student_id), []).append(attempt)

    duplicates = []
    for group in by_pair.values():
        if len(group) < 2:
            continue
        submitted = [a for a in group if a.end_time is not None]
        keep = max(submitted, key=lambda a: a.end_time) if submitted else group[0]
        duplicates.extend(a.id for a in group if a.id != keep.id)

    for attempt_id in duplicates:
        params = {"attempt": attempt_id}
        conn.execute(sa.text(
            "DELETE FROM evaluations WHERE answer_id IN (SELECT id FROM answers WHERE attempt_id = :attempt)"
        ), params)
        conn.execute(sa.text("DELETE FROM answers WHERE attempt_id = :attempt"), params)
        conn.execute(sa.text("DELETE FROM integrity_events WHERE attempt_id = :attempt"), params)
        conn.execute(sa.text("DELETE FROM exam_attempts WHERE id = :attempt"), params)

    op.create_unique_constraint("uq_attempt_exam_student", "exam_attempts", ["exam_id", "student_id"])


def downgrade() -> None:
    op.drop_constraint("uq_attempt_exam_student", "exam_attempts", type_="unique")
