"""add plex_pending_pushes table

Revision ID: w8x9y0z1a2b3
Revises: v7w8x9y0z1a2
Create Date: 2026-08-25
"""

from alembic import op
import sqlalchemy as sa


revision = "w8x9y0z1a2b3"
down_revision = "v7w8x9y0z1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plex_pending_pushes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_id", sa.Integer(), sa.ForeignKey("media.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pushed_at", sa.DateTime(), nullable=False),
        # Postgres auto-indexes this unique constraint, covering the
        # (user_id, media_id) lookup the backfill does - no separate index needed.
        sa.UniqueConstraint("user_id", "media_id", name="uq_plex_pending_push_user_media"),
    )


def downgrade() -> None:
    op.drop_table("plex_pending_pushes")
