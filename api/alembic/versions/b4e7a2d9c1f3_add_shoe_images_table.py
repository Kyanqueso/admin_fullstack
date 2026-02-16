"""add shoe_images table and migrate image data

Revision ID: b4e7a2d9c1f3
Revises: 900c590457b1
Create Date: 2026-02-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4e7a2d9c1f3'
down_revision: Union[str, Sequence[str], None] = '900c590457b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create shoe_images table, migrate existing data, drop image_url column."""
    # 1. Create the new shoe_images table
    op.create_table(
        'shoe_images',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('shoe_catalog_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['shoe_catalog_id'], ['shoe_catalog.shoe_catalog_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Migrate existing image_url data from shoe_catalog into shoe_images
    op.execute("""
        INSERT INTO shoe_images (shoe_catalog_id, image_url, display_order)
        SELECT shoe_catalog_id, image_url, 1
        FROM shoe_catalog
        WHERE image_url IS NOT NULL AND image_url != ''
    """)

    # 3. Drop the image_url column from shoe_catalog
    op.drop_column('shoe_catalog', 'image_url')


def downgrade() -> None:
    """Reverse: add image_url column back, migrate data, drop shoe_images table."""
    # 1. Add image_url column back to shoe_catalog
    op.add_column('shoe_catalog', sa.Column('image_url', sa.String(length=500), nullable=True))

    # 2. Migrate the first image back to shoe_catalog
    op.execute("""
        UPDATE shoe_catalog
        SET image_url = si.image_url
        FROM (
            SELECT DISTINCT ON (shoe_catalog_id) shoe_catalog_id, image_url
            FROM shoe_images
            ORDER BY shoe_catalog_id, display_order
        ) si
        WHERE shoe_catalog.shoe_catalog_id = si.shoe_catalog_id
    """)

    # 3. Drop shoe_images table
    op.drop_table('shoe_images')
