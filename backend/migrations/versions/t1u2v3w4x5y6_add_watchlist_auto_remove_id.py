"""add watchlist_auto_remove_id to user_settings

Revision ID: t1u2v3w4x5y6
Revises: s0c1k3t001
Create Date: 2026-09-01
"""

from alembic import op
import sqlalchemy as sa


revision = "t1u2v3w4x5y6"
down_revision = "s0c1k3t001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column(
            "watchlist_auto_remove_id",
            sa.Integer(),
            sa.ForeignKey("lists.id", ondelete="SET NULL"),
            nullable=True,
            server_default=None,
        ),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "watchlist_auto_remove_id")
