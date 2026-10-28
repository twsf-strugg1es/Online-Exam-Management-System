"""Organizations, memberships and groups

Moves existing data into one "Default Organization":
- admins become its owners, students its candidates
- each SSC/HSC/Admission-style value (users.exam_candidate, exams.target_candidates)
  becomes a group, with students and exams assigned accordingly
- all questions and exams belong to it
Then drops the replaced columns users.role, users.exam_candidate and exams.target_candidates.

Revision ID: 0002_organizations
Revises: 0001_baseline
Create Date: 2026-10-11
"""
import secrets
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_organizations"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)

DEFAULT_ORG_NAME = "Default Organization"


def _join_code() -> str:
    # Same format as app.models.generate_join_code, copied so this migration never changes
    return "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(8))


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("join_code", sa.String(), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "memberships",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", UUID, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),
    )
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
    op.create_index("ix_memberships_organization_id", "memberships", ["organization_id"])
    op.create_table(
        "groups",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("organization_id", UUID, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("join_code", sa.String(), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("organization_id", "name", name="uq_group_org_name"),
    )
    op.create_index("ix_groups_organization_id", "groups", ["organization_id"])
    op.create_table(
        "group_members",
        sa.Column("group_id", UUID, sa.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("membership_id", UUID, sa.ForeignKey("memberships.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "exam_groups",
        sa.Column("exam_id", UUID, sa.ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("group_id", UUID, sa.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    )

    for table in ("questions", "exams"):
        op.add_column(table, sa.Column("organization_id", UUID, nullable=True))

    _move_data_into_default_org()

    for table in ("questions", "exams"):
        op.alter_column(table, "organization_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_organization_id", table, "organizations", ["organization_id"], ["id"], ondelete="CASCADE"
        )
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])

    op.drop_column("users", "role")
    op.drop_column("users", "exam_candidate")
    op.drop_column("exams", "target_candidates")


def _move_data_into_default_org() -> None:
    conn = op.get_bind()
    users = conn.execute(sa.text("SELECT id, role, exam_candidate FROM users")).all()
    exams = conn.execute(sa.text("SELECT id, target_candidates FROM exams")).all()
    has_questions = conn.execute(sa.text("SELECT 1 FROM questions LIMIT 1")).first() is not None
    if not (users or exams or has_questions):
        return  # fresh database, nothing to move

    now = datetime.now(timezone.utc)
    org_id = uuid.uuid4()
    conn.execute(
        sa.text("INSERT INTO organizations (id, name, join_code, created_at) VALUES (:id, :name, :code, :now)"),
        {"id": org_id, "name": DEFAULT_ORG_NAME, "code": _join_code(), "now": now},
    )

    group_names = {u.exam_candidate for u in users if u.exam_candidate} | {
        e.target_candidates for e in exams if e.target_candidates
    }
    group_ids = {name: uuid.uuid4() for name in sorted(group_names)}
    for name, group_id in group_ids.items():
        conn.execute(
            sa.text(
                "INSERT INTO groups (id, organization_id, name, join_code, created_at) "
                "VALUES (:id, :org, :name, :code, :now)"
            ),
            {"id": group_id, "org": org_id, "name": name, "code": _join_code(), "now": now},
        )

    for user in users:
        membership_id = uuid.uuid4()
        role = "owner" if user.role == "admin" else "candidate"
        conn.execute(
            sa.text(
                "INSERT INTO memberships (id, user_id, organization_id, role, created_at) "
                "VALUES (:id, :user, :org, :role, :now)"
            ),
            {"id": membership_id, "user": user.id, "org": org_id, "role": role, "now": now},
        )
        if role == "candidate" and user.exam_candidate:
            conn.execute(
                sa.text("INSERT INTO group_members (group_id, membership_id) VALUES (:group, :membership)"),
                {"group": group_ids[user.exam_candidate], "membership": membership_id},
            )

    for exam in exams:
        if exam.target_candidates:
            conn.execute(
                sa.text("INSERT INTO exam_groups (exam_id, group_id) VALUES (:exam, :group)"),
                {"exam": exam.id, "group": group_ids[exam.target_candidates]},
            )

    conn.execute(sa.text("UPDATE questions SET organization_id = :org"), {"org": org_id})
    conn.execute(sa.text("UPDATE exams SET organization_id = :org"), {"org": org_id})


def downgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(), nullable=True))
    op.add_column("users", sa.Column("exam_candidate", sa.String(), nullable=True))
    op.add_column("exams", sa.Column("target_candidates", sa.String(), nullable=True))

    # Best effort: staff anywhere become admins; one group name is kept per student and exam
    op.execute(
        "UPDATE users SET role = CASE WHEN EXISTS ("
        "SELECT 1 FROM memberships m WHERE m.user_id = users.id AND m.role <> 'candidate'"
        ") THEN 'admin' ELSE 'student' END"
    )
    op.execute(
        "UPDATE users SET exam_candidate = (SELECT min(g.name) FROM groups g "
        "JOIN group_members gm ON gm.group_id = g.id JOIN memberships m ON m.id = gm.membership_id "
        "WHERE m.user_id = users.id)"
    )
    op.execute(
        "UPDATE exams SET target_candidates = (SELECT min(g.name) FROM groups g "
        "JOIN exam_groups eg ON eg.group_id = g.id WHERE eg.exam_id = exams.id)"
    )
    op.alter_column("users", "role", nullable=False)

    for table in ("questions", "exams"):
        op.drop_index(f"ix_{table}_organization_id", table_name=table)
        op.drop_constraint(f"fk_{table}_organization_id", table, type_="foreignkey")
        op.drop_column(table, "organization_id")

    for table in ("exam_groups", "group_members", "groups", "memberships", "organizations"):
        op.drop_table(table)
