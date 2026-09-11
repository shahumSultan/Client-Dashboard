"""staff role

Revision ID: 1b348c7e445b
Revises: 46df561b66f6
Create Date: 2026-09-11 13:31:49.173771

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b348c7e445b'
down_revision: Union[str, None] = '46df561b66f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Read-only Enigma-Cube team member. userrole stores enum *values*
    # (users.role uses values_callable), so the label is lower-case.
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'staff'")


def downgrade() -> None:
    # Postgres can't drop an enum label. Demote anyone holding it so the
    # previous code, which doesn't know the role, can still load them.
    op.execute("UPDATE users SET role = 'client_member' WHERE role = 'staff'")
