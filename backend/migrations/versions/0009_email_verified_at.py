"""users.email_verified_at: set when the person opens the emailed confirmation link

Existing accounts start unconfirmed; they see a banner, nothing is blocked.

Revision ID: 0009_email_verified_at
Revises: 0008_password_reset_tokens
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_email_verified_at"
down_revision = "0008_password_reset_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")
