"""change heel_size to string

Revision ID: 37ba4a2bf04d
Revises: b2c3d4e5f6a1
Create Date: 2026-03-26 23:18:05.662159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37ba4a2bf04d'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "client_orders",
        "heel_size",
        existing_type=sa.Numeric(),
        type_=sa.String(),
        postgresql_using="heel_size::text"
    )


def downgrade() -> None:
    op.alter_column(
        "client_orders",
        "heel_size",
        existing_type=sa.String(),
        type_=sa.Numeric(),
        postgresql_using="heel_size::numeric"
    )