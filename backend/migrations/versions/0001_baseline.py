"""Baseline: the schema as it was before migrations were introduced

Databases created earlier by the app's startup `create_all` already have these
tables, so this revision only creates them when they're missing.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-10-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)
JSON = postgresql.JSON()


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("users"):
        return

    op.create_table(
        "users",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(), nullable=True),
        sa.Column("exam_candidate", sa.String(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "questions",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("complexity", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("options", JSON, nullable=True),
        sa.Column("correct_answers", JSON, nullable=False),
        sa.Column("max_score", sa.Integer(), nullable=False),
        sa.Column("tags", JSON, nullable=True),
    )

    op.create_table(
        "exams",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("published_by", UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("target_candidates", sa.String(), nullable=True),
    )

    op.create_table(
        "exam_questions",
        sa.Column("exam_id", UUID, sa.ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("question_id", UUID, sa.ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "exam_attempts",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("exam_id", UUID, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("student_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("total_possible_score", sa.Float(), nullable=True),
    )

    op.create_table(
        "answers",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("attempt_id", UUID, sa.ForeignKey("exam_attempts.id"), nullable=False),
        sa.Column("question_id", UUID, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("answer_data", JSON, nullable=False),
    )

    op.create_table(
        "evaluations",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("answer_id", UUID, sa.ForeignKey("answers.id"), nullable=False),
        sa.Column("evaluated_by", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("comment", sa.String(100), nullable=True),
        sa.Column("score_awarded", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    for table in ("evaluations", "answers", "exam_attempts", "exam_questions", "exams", "questions", "users"):
        op.drop_table(table)
