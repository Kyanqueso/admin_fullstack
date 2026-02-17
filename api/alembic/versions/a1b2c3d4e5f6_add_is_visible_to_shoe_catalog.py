"""add is_visible to shoe_catalog

Revision ID: a1b2c3d4e5f6
Revises: 53de116aaf09
Create Date: 2026-02-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '53de116aaf09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'shoe_catalog',
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default=sa.true())
    )


def downgrade() -> None:
    op.drop_column('shoe_catalog', 'is_visible')
