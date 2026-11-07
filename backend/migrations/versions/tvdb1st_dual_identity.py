"""dual provider identity: media.tvdb_id, media.imdb_id, shows.canonical_source

Revision ID: tvdb1st
Revises: rpdb377
Create Date: 2026-09-13

Step 1 of docs/tvdb-first-class-plan.md.

- media gains a real ``tvdb_id`` column. Episodes that were enriched from
  TheTVDB because TMDB had no counterpart used to store the TVDB episode id
  in ``tmdb_id`` "in disguise", tagged ``tmdb_data.source = "tvdb"``. Those
  rows move their id into ``tvdb_id`` and get ``tmdb_id = NULL`` so a
  TMDB-keyed lookup can never accidentally hit a TVDB id.
- media gains ``imdb_id``, backfilled from ``tmdb_data.external_ids``.
- shows gets ``tvdb_id`` backfilled from ``tmdb_data.external_ids`` where
  TMDB already told us the cross reference and no other show row holds it.
- shows gains ``canonical_source`` ('tmdb' | 'tvdb'): which provider's
  season/episode numbering the show's media rows use. Fixed at creation,
  never renumbered.
"""

from alembic import op
import sqlalchemy as sa

revision = "tvdb1st"
down_revision = "rpdb377"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("media", sa.Column("tvdb_id", sa.Integer(), nullable=True))
    op.add_column("media", sa.Column("imdb_id", sa.String(length=20), nullable=True))
    op.create_index("idx_media_tvdb_type", "media", ["tvdb_id", "media_type"])
    op.create_index("idx_media_imdb", "media", ["imdb_id"])

    op.add_column(
        "shows",
        sa.Column("canonical_source", sa.String(length=10), nullable=False, server_default="tmdb"),
    )

    # 1. Undisguise TVDB-only episodes. enrich_episode_from_tvdb wrote the
    #    TVDB episode id to BOTH tmdb_id and tmdb_data.tvdb_episode_id, so
    #    only rows where the two agree are provably disguised. A row tagged
    #    source=tvdb whose tmdb_id differs (TVDB returned no id, so a real
    #    TMDB id survived) keeps its tmdb_id and just gains the tvdb_id.
    op.execute(
        """
        UPDATE media
        SET tvdb_id = tmdb_id,
            tmdb_id = NULL
        WHERE media_type = 'episode'
          AND tmdb_data->>'source' = 'tvdb'
          AND tmdb_id IS NOT NULL
          AND tmdb_data->>'tvdb_episode_id' ~ '^[0-9]+$'
          AND (tmdb_data->>'tvdb_episode_id')::integer = tmdb_id
        """
    )
    op.execute(
        """
        UPDATE media
        SET tvdb_id = (tmdb_data->>'tvdb_episode_id')::integer
        WHERE media_type = 'episode'
          AND tvdb_id IS NULL
          AND tmdb_data->>'tvdb_episode_id' ~ '^[0-9]+$'
        """
    )

    # 2. IMDb ids TMDB already handed us for movies and series.
    op.execute(
        """
        UPDATE media
        SET imdb_id = tmdb_data->'external_ids'->>'imdb_id'
        WHERE imdb_id IS NULL
          AND tmdb_data->'external_ids'->>'imdb_id' ~ '^tt[0-9]+$'
        """
    )

    # 3. TVDB ids TMDB already handed us for shows. shows.tvdb_id is unique,
    #    so only claim ids that no row holds yet and that exactly one
    #    candidate row wants (TMDB occasionally maps two entries to the same
    #    TVDB series; leave those for a human).
    op.execute(
        """
        WITH candidates AS (
            SELECT id,
                   (tmdb_data->'external_ids'->>'tvdb_id')::integer AS ext_tvdb_id
            FROM shows
            WHERE tvdb_id IS NULL
              AND tmdb_data->'external_ids'->>'tvdb_id' ~ '^[0-9]+$'
        ),
        unique_candidates AS (
            SELECT ext_tvdb_id
            FROM candidates
            GROUP BY ext_tvdb_id
            HAVING COUNT(*) = 1
        )
        UPDATE shows s
        SET tvdb_id = c.ext_tvdb_id
        FROM candidates c
        JOIN unique_candidates u ON u.ext_tvdb_id = c.ext_tvdb_id
        WHERE s.id = c.id
          AND NOT EXISTS (SELECT 1 FROM shows o WHERE o.tvdb_id = c.ext_tvdb_id)
        """
    )

    # 4. Shows that only ever existed on TheTVDB use TVDB numbering.
    op.execute(
        """
        UPDATE shows
        SET canonical_source = 'tvdb'
        WHERE tmdb_id IS NULL AND tvdb_id IS NOT NULL
        """
    )


def downgrade() -> None:
    # Re-disguise so the pre-migration code paths keep working.
    op.execute(
        """
        UPDATE media
        SET tmdb_id = tvdb_id
        WHERE media_type = 'episode'
          AND tmdb_id IS NULL
          AND tvdb_id IS NOT NULL
          AND tmdb_data->>'source' = 'tvdb'
        """
    )
    op.drop_column("shows", "canonical_source")
    op.drop_index("idx_media_imdb", table_name="media")
    op.drop_index("idx_media_tvdb_type", table_name="media")
    op.drop_column("media", "imdb_id")
    op.drop_column("media", "tvdb_id")
