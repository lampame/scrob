"""add user_settings.condense_history_by_show

Revision ID: condhist391
Revises: dup390
Create Date: 2026-09-13

Per-user display preference: collapse consecutive same-show episodes within
a date on the History page into one row instead of listing each
individually (#391).
"""

from alembic import op
import sqlalchemy as sa

revision = "condhist391"
down_revision = "dup390"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("condense_history_by_show", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "condense_history_by_show")
