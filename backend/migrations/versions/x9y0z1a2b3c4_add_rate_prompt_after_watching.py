"""add rate_prompt_movies / rate_prompt_episodes to user_settings

Revision ID: x9y0z1a2b3c4
Revises: w8x9y0z1a2b3
Create Date: 2026-08-27
"""

from alembic import op
import sqlalchemy as sa


revision = "x9y0z1a2b3c4"
down_revision = "w8x9y0z1a2b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("rate_prompt_movies", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "user_settings",
        sa.Column("rate_prompt_episodes", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "rate_prompt_episodes")
    op.drop_column("user_settings", "rate_prompt_movies")
