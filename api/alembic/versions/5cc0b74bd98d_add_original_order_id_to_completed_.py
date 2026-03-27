"""add original_order_id to completed_orders

Revision ID: 5cc0b74bd98d
Revises: b223811a449e
Create Date: 2026-03-27 00:16:40.578194

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5cc0b74bd98d'
down_revision: Union[str, Sequence[str], None] = 'b223811a449e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADDED: original_order_id stores the source client_order.id for payment history linking
    op.add_column(
        'completed_orders',
        sa.Column('original_order_id', sa.Integer(), nullable=True)
    )
 
 
def downgrade() -> None:
    op.drop_column('completed_orders', 'original_order_id')