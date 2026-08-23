"""add dropped shows/movies and their provider push flags

Revision ID: v7w8x9y0z1a2
Revises: u6v7w8x9y0z1
Create Date: 2026-08-23
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "v7w8x9y0z1a2"
down_revision = "u6v7w8x9y0z1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_settings", sa.Column("dropped_shows", postgresql.JSONB(), server_default="[]"))
    op.add_column("user_settings", sa.Column("dropped_movies", postgresql.JSONB(), server_default="[]"))
    op.add_column("user_settings", sa.Column("trakt_push_dropped", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("user_settings", sa.Column("mdblist_push_dropped", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("user_settings", sa.Column("trakt_sync_dropped", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("user_settings", sa.Column("mdblist_sync_dropped", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("user_settings", "mdblist_sync_dropped")
    op.drop_column("user_settings", "trakt_sync_dropped")
    op.drop_column("user_settings", "mdblist_push_dropped")
    op.drop_column("user_settings", "trakt_push_dropped")
    op.drop_column("user_settings", "dropped_movies")
    op.drop_column("user_settings", "dropped_shows")
