"""company management: profile, bank accounts, team, documents

Revision ID: ab2582870ed7
Revises: c4f1a2b93e07
Create Date: 2026-11-18 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab2582870ed7'
down_revision: Union[str, None] = 'c4f1a2b93e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'company_profile',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('legal_name', sa.String(length=255), nullable=True),
        sa.Column('trading_name', sa.String(length=255), nullable=True),
        sa.Column('registration_number', sa.String(length=100), nullable=True),
        sa.Column('tax_number', sa.String(length=100), nullable=True),
        sa.Column('registered_address', sa.Text(), nullable=True),
        sa.Column('office_address', sa.Text(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('socials', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('updated_by', sa.String(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'company_bank_accounts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('bank_name', sa.String(length=255), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=False),
        sa.Column('account_number', sa.String(length=100), nullable=True),
        sa.Column('iban', sa.String(length=64), nullable=True),
        sa.Column('swift', sa.String(length=32), nullable=True),
        sa.Column('branch', sa.Text(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    # At most one default account (see the model for why it's on the boolean).
    op.create_index(
        'uq_company_bank_default',
        'company_bank_accounts',
        ['is_default'],
        unique=True,
        postgresql_where=sa.text('is_default'),
    )

    op.create_table(
        'company_team_members',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'company_documents',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('expires_on', sa.Date(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=150), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(length=500), nullable=False),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'company_document_versions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('document_id', sa.String(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=150), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(length=500), nullable=False),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['company_documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('storage_key'),
    )
    op.create_index(
        'ix_company_document_versions_document_id',
        'company_document_versions',
        ['document_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_company_document_versions_document_id', table_name='company_document_versions')
    op.drop_table('company_document_versions')
    op.drop_table('company_documents')
    op.drop_table('company_team_members')
    op.drop_index('uq_company_bank_default', table_name='company_bank_accounts')
    op.drop_table('company_bank_accounts')
    op.drop_table('company_profile')
