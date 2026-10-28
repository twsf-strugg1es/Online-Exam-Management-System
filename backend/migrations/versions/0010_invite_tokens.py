"""Invite links: password_reset_tokens.purpose ("reset" or "invite")

Bulk-imported students get a 7-day link to set their first password; it uses the same
single-use token table as password reset.

Revision ID: 0010_invite_tokens
Revises: 0009_email_verified_at
Create Date: 2026-10-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_invite_tokens"
down_revision = "0009_email_verified_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("password_reset_tokens", sa.Column("purpose", sa.String(), nullable=False, server_default="reset"))


def downgrade() -> None:
    op.drop_column("password_reset_tokens", "purpose")
