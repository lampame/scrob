"""add socket settings to global_settings

Revision ID: s0c1k3t001
Revises: imgcachefloat
Create Date: 2026-08-30
"""

from alembic import op
import sqlalchemy as sa


revision = "s0c1k3t001"
down_revision = "imgcachefloat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "global_settings",
        sa.Column("socket_mode", sa.String(20), nullable=False, server_default="disabled"),
    )
    op.add_column(
        "global_settings",
        sa.Column("socket_namespace", sa.String(100), nullable=True),
    )
    op.add_column(
        "global_settings",
        sa.Column("socket_join_key", sa.String(100), nullable=True),
    )
    op.add_column(
        "global_settings",
        sa.Column("socket_send_key", sa.String(100), nullable=True),
    )
    op.add_column(
        "global_settings",
        sa.Column("socket_external_url", sa.String(500), nullable=True, server_default="wss://itty.ws/c/"),
    )


def downgrade() -> None:
    op.drop_column("global_settings", "socket_external_url")
    op.drop_column("global_settings", "socket_send_key")
    op.drop_column("global_settings", "socket_join_key")
    op.drop_column("global_settings", "socket_namespace")
    op.drop_column("global_settings", "socket_mode")
