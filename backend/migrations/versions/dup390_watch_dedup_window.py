"""add user_settings.duplicate_watch_window_minutes

Revision ID: dup390
Revises: tvdb1st
Create Date: 2026-09-13

Per-user override for how close together (in minutes) two watches of the same
movie/episode must be to count as one duplicate play rather than two, checked
regardless of which source (webhook, import, manual entry, ...) either one
came from (#390). NULL means "use the built-in minimum only".
"""

from alembic import op
import sqlalchemy as sa

revision = "dup390"
down_revision = "tvdb1st"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("duplicate_watch_window_minutes", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "duplicate_watch_window_minutes")
