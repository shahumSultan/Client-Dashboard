"""employee role, team invitations, departments

Revision ID: e5a91c0d7b42
Revises: ab2582870ed7
Create Date: 2026-11-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a91c0d7b42'
down_revision: Union[str, None] = 'ab2582870ed7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Staff becomes Employee. A rename, not add-and-migrate: every existing
    # staff account and pending staff invitation follows without a data step.
    op.execute("ALTER TYPE userrole RENAME VALUE 'staff' TO 'employee'")

    # Team invitations have no organization.
    op.alter_column('invitations', 'organization_id', existing_type=sa.String(), nullable=True)
    op.create_check_constraint(
        'ck_invitations_role_matches_scope',
        'invitations',
        "(organization_id IS NULL) = (role IN ('admin', 'employee'))",
    )

    op.create_table(
        'departments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('lead_user_id', sa.String(), nullable=True),
        sa.Column('colour', sa.String(length=20), nullable=False, server_default='slate'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lead_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_table(
        'department_members',
        sa.Column('department_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('department_id', 'user_id'),
    )
    op.create_index('ix_department_members_user_id', 'department_members', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_department_members_user_id', table_name='department_members')
    op.drop_table('department_members')
    op.drop_table('departments')
    op.drop_constraint('ck_invitations_role_matches_scope', 'invitations', type_='check')
    op.execute("DELETE FROM invitations WHERE organization_id IS NULL")
    op.alter_column('invitations', 'organization_id', existing_type=sa.String(), nullable=False)
    op.execute("ALTER TYPE userrole RENAME VALUE 'employee' TO 'staff'")
