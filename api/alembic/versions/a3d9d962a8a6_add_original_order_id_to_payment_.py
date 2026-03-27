"""add original_order_id to payment_summaries

Revision ID: a3d9d962a8a6
Revises: b9622b491668
Create Date: 2026-03-27 03:10:24.311769

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3d9d962a8a6'
down_revision: Union[str, Sequence[str], None] = 'b9622b491668'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add original_order_id to payment_summaries so we can find a summary
    # after its client_order_id has been SET NULL on order completion.
    op.add_column(
        'payment_summaries',
        sa.Column('original_order_id', sa.Integer(), nullable=True)
    )
 
 
def downgrade():
    op.drop_column('payment_summaries', 'original_order_id')
