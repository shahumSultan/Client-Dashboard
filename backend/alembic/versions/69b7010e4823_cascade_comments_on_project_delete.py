"""cascade comments on project delete

Revision ID: 69b7010e4823
Revises: 11d43349dcbe
Create Date: 2026-09-10 04:21:24.119296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69b7010e4823'
down_revision: Union[str, None] = '11d43349dcbe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FK = "comments_project_id_fkey"


def upgrade() -> None:
    # Deleting a project raised a foreign-key violation once it had any
    # comments: the constraint was NO ACTION and comments are not part of the
    # project's ORM cascade. Recreate it as ON DELETE CASCADE.
    op.drop_constraint(FK, "comments", type_="foreignkey")
    op.create_foreign_key(
        FK, "comments", "projects", ["project_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    op.drop_constraint(FK, "comments", type_="foreignkey")
    op.create_foreign_key(FK, "comments", "projects", ["project_id"], ["id"])
