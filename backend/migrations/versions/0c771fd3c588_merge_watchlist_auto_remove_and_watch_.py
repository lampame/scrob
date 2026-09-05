"""merge watchlist auto-remove and watch-event heads

Revision ID: 0c771fd3c588
Revises: t1u2v3w4x5y6, we355created
Create Date: 2026-09-05 19:02:38.502552

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0c771fd3c588'
down_revision: Union[str, Sequence[str], None] = ('t1u2v3w4x5y6', 'we355created')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
