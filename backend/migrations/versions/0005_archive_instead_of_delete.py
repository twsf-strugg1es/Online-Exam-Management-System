"""Archive questions and exams instead of deleting them once they're in use

Deleting a question used to delete students' answers and grades with it, and
deleting an exam deleted every attempt. Both are now archived instead.

Revision ID: 0005_archive_instead_of_delete
Revises: 0004_one_attempt_per_exam
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_archive_instead_of_delete"
down_revision = "0004_one_attempt_per_exam"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("questions", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("exams", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("exams", "archived_at")
    op.drop_column("questions", "archived_at")
