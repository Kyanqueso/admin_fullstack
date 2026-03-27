"""make payment_summary client_order_id nullable

Revision ID: b9622b491668
Revises: 5cc0b74bd98d
Create Date: 2026-03-27 03:06:53.440981

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9622b491668'
down_revision: Union[str, Sequence[str], None] = '5cc0b74bd98d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.drop_constraint(
        'payment_summaries_client_order_id_fkey',
        'payment_summaries',
        type_='foreignkey'
    )

    op.alter_column(
        'payment_summaries',
        'client_order_id',
        existing_type=sa.Integer(),
        nullable=True
    )

    op.create_foreign_key(
        'payment_summaries_client_order_id_fkey',
        'payment_summaries',
        'client_orders',
        ['client_order_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    op.drop_constraint(
        'payment_summaries_client_order_id_fkey',
        'payment_summaries',
        type_='foreignkey'
    )

    op.alter_column(
        'payment_summaries',
        'client_order_id',
        existing_type=sa.Integer(),
        nullable=False
    )

    op.create_foreign_key(
        'payment_summaries_client_order_id_fkey',
        'payment_summaries',
        'client_orders',
        ['client_order_id'],
        ['id']
    )