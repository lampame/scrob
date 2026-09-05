"""Add watch_events.created_at (GitHub #355)

The webhook duplicate-delivery guard in routers/webhooks.py:_write_watch_event
used watched_at to decide whether a "just written" WatchEvent already covers
this completion, with an explicit fallback for a NULL (unknown-date) watched_at
since NULL >= cutoff is never true in SQL. That fallback had no time bound at
all, so once a title had ANY unknown-dated watch event, every future real
rewatch reported by Jellyfin/Plex/Emby was silently swallowed as a
"duplicate" forever - watched_at can't distinguish "just logged" from
"logged three years ago" when it's NULL. created_at can, since it's set at
insert time regardless of what watched_at holds.

Revision ID: we355created
Revises: we358series
Create Date: 2026-09-05
"""

import sqlalchemy as sa
from alembic import op

revision = "we355created"
down_revision = "we358series"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "watch_events",
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("watch_events", "created_at")
