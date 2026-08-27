"""add oauth_device_grants (RFC 8628 device authorization grant, #331)

Revision ID: oauthdevice331
Revises: x9y0z1a2b3c4
Create Date: 2026-08-27
"""

from alembic import op
import sqlalchemy as sa


revision = "oauthdevice331"
down_revision = "x9y0z1a2b3c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "oauth_device_grants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_code_hash", sa.String(length=64), nullable=False),
        sa.Column("user_code", sa.String(length=16), nullable=False),
        sa.Column("client_name", sa.String(length=120), nullable=False),
        sa.Column("scope", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("interval", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("last_polled_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("token_issued_at", sa.DateTime(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=True),
        sa.Column("prev_refresh_token_hash", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_code_hash", name="uq_oauth_device_grants_device_code_hash"),
        sa.UniqueConstraint("user_code", name="uq_oauth_device_grants_user_code"),
    )
    op.create_index("ix_oauth_device_grants_device_code_hash", "oauth_device_grants", ["device_code_hash"])
    op.create_index("ix_oauth_device_grants_user_code", "oauth_device_grants", ["user_code"])
    op.create_index("ix_oauth_device_grants_user_id", "oauth_device_grants", ["user_id"])
    op.create_index("ix_oauth_device_grants_refresh_token_hash", "oauth_device_grants", ["refresh_token_hash"])


def downgrade() -> None:
    op.drop_index("ix_oauth_device_grants_refresh_token_hash", table_name="oauth_device_grants")
    op.drop_index("ix_oauth_device_grants_user_id", table_name="oauth_device_grants")
    op.drop_index("ix_oauth_device_grants_user_code", table_name="oauth_device_grants")
    op.drop_index("ix_oauth_device_grants_device_code_hash", table_name="oauth_device_grants")
    op.drop_table("oauth_device_grants")
