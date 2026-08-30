"""image_cache_limit_gb: integer -> float (allow fractional GB limits)

Revision ID: imgcachefloat
Revises: tvdbpin325
Create Date: 2026-08-29
"""

from alembic import op
import sqlalchemy as sa


revision = "imgcachefloat"
down_revision = "tvdbpin325"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "global_settings",
        "image_cache_limit_gb",
        type_=sa.Float(),
        existing_type=sa.Integer(),
        existing_nullable=True,
        postgresql_using="image_cache_limit_gb::double precision",
    )


def downgrade() -> None:
    op.alter_column(
        "global_settings",
        "image_cache_limit_gb",
        type_=sa.Integer(),
        existing_type=sa.Float(),
        existing_nullable=True,
        postgresql_using="round(image_cache_limit_gb)::integer",
    )
