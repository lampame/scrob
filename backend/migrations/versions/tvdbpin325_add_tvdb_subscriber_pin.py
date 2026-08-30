"""add TVDB subscriber PIN fields

Revision ID: tvdbpin325
Revises: plexlogin102
Create Date: 2026-08-29
"""

from alembic import op
import sqlalchemy as sa


revision = "tvdbpin325"
down_revision = "plexlogin102"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("tvdb_subscriber_pin", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "global_settings",
        sa.Column("tvdb_subscriber_pin", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("global_settings", "tvdb_subscriber_pin")
    op.drop_column("user_settings", "tvdb_subscriber_pin")
