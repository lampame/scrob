"""Drop series-level watch events (GitHub #358)

A watch event is only ever a movie or an episode. A "watched show" or
"watched season" is a derived state - every one of its episodes watched -
never a watch event in its own right. Older inbound-sync paths (an external
service's show-level "watched" rollup row) could nonetheless create a
completed WatchEvent pointing at a series-type Media. Those rows are junk:
they carry no season/episode, never match a real play, and only ever
surfaced as a stray entry in the unfiltered history feed that then 404'd
trying to open as a movie.

This removes every existing watch event whose media isn't a movie or
episode. The code now rejects them at creation (routers/history.py
mark_as_watched, routers/sync.py _apply_nuvio_watch_history).

Revision ID: we358series
Revises: imgcachefloat
Create Date: 2026-09-03
"""

import sqlalchemy as sa
from alembic import op

revision = "we358series"
down_revision = "imgcachefloat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM watch_events
            WHERE media_id IN (
                SELECT id FROM media
                WHERE media_type NOT IN ('movie', 'episode')
            )
            """
        )
    )


def downgrade() -> None:
    # The deleted rows were bogus - nothing to restore.
    pass
