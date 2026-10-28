"""Locale settings: organization country, language, timezone and currency; user language

Exam windows are shown in the organization's timezone, and members without their own
language get the organization's. Existing organizations start on UTC and English.

Revision ID: 0006_locale_settings
Revises: 0005_archive_instead_of_delete
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_locale_settings"
down_revision = "0005_archive_instead_of_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("country", sa.String(length=2), nullable=True))
    op.add_column("organizations", sa.Column("default_language", sa.String(), nullable=False, server_default="en"))
    op.add_column("organizations", sa.Column("timezone", sa.String(), nullable=False, server_default="UTC"))
    op.add_column("organizations", sa.Column("currency", sa.String(length=3), nullable=True))
    op.add_column("users", sa.Column("language", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "language")
    op.drop_column("organizations", "currency")
    op.drop_column("organizations", "timezone")
    op.drop_column("organizations", "default_language")
    op.drop_column("organizations", "country")
