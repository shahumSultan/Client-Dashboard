"""company letterhead

Revision ID: c4f1a2b93e07
Revises: 1b348c7e445b
Create Date: 2026-09-14 11:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f1a2b93e07'
down_revision: Union[str, None] = '1b348c7e445b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'company_letterheads',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('width_px', sa.Integer(), nullable=False),
        sa.Column('height_px', sa.Integer(), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=False),
        sa.Column('retired_at', sa.DateTime(), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sha256'),
    )
    # At most one current letterhead. Partial index on the boolean rather than
    # on `retired_at IS NULL`: Postgres treats NULLs as distinct, so a unique
    # index over them would enforce nothing.
    op.create_index(
        'uq_company_letterhead_current',
        'company_letterheads',
        ['is_current'],
        unique=True,
        postgresql_where=sa.text('is_current'),
    )
    # Nullable, so no server_default is needed - and NULL is load-bearing:
    # every engagement sent before letterheads existed keeps NULL, which is
    # what leaves its agreement_hash byte-identical. See services/engagements.py.
    op.add_column(
        'engagements',
        sa.Column('letterhead_sha256', sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('engagements', 'letterhead_sha256')
    op.drop_index('uq_company_letterhead_current', table_name='company_letterheads')
    op.drop_table('company_letterheads')
