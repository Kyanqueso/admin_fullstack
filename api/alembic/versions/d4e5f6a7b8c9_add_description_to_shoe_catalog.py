"""add_description_to_shoe_catalog

Revision ID: d4e5f6a7b8c9
Revises: 748dbec5516c
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = '748dbec5516c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('shoe_catalog', sa.Column('description', sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column('shoe_catalog', 'description')
