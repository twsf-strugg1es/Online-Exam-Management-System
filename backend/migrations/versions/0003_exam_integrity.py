"""Exam integrity: per-exam settings, integrity events and submit reasons

Existing exams get every protection switched on, the same as new exams, and no
automatic submission (max_violations stays empty).

Revision ID: 0003_exam_integrity
Revises: 0002_organizations
Create Date: 2026-10-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_exam_integrity"
down_revision = "0002_organizations"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)
SETTINGS = ("shuffle_questions", "shuffle_options", "require_fullscreen", "block_copy_paste")


def upgrade() -> None:
    for name in SETTINGS:
        op.add_column("exams", sa.Column(name, sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("exams", sa.Column("max_violations", sa.Integer(), nullable=True))
    op.add_column("exam_attempts", sa.Column("submit_reason", sa.String(), nullable=True))

    op.create_table(
        "integrity_events",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("attempt_id", UUID, sa.ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("details", postgresql.JSON(), nullable=True),
    )
    op.create_index("ix_integrity_events_attempt_id", "integrity_events", ["attempt_id"])


def downgrade() -> None:
    op.drop_index("ix_integrity_events_attempt_id", table_name="integrity_events")
    op.drop_table("integrity_events")
    op.drop_column("exam_attempts", "submit_reason")
    op.drop_column("exams", "max_violations")
    for name in SETTINGS:
        op.drop_column("exams", name)
