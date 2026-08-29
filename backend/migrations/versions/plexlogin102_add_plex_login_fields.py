"""add "Login with Plex" fields

Revision ID: plexlogin102
Revises: oauthdevice331
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa


revision = "plexlogin102"
down_revision = "oauthdevice331"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "media_server_connections",
        sa.Column("plex_auth_token", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "media_server_connections",
        sa.Column("plex_account_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "media_server_connections",
        sa.Column("plex_machine_identifier", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "global_settings",
        sa.Column("plex_client_identifier", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("global_settings", "plex_client_identifier")
    op.drop_column("media_server_connections", "plex_machine_identifier")
    op.drop_column("media_server_connections", "plex_account_id")
    op.drop_column("media_server_connections", "plex_auth_token")
