"""backfill team directory entries for existing team accounts

The Team tab is now where team accounts are managed, and it lists directory
entries. Accounts that got a team role before entries were created
automatically (the founding admins, any former staff) had none, so they
would be missing from it.

Revision ID: f2b7d4e81c39
Revises: e5a91c0d7b42
Create Date: 2026-11-20 13:00:00.000000

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b7d4e81c39'
down_revision: Union[str, None] = 'e5a91c0d7b42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    team = conn.execute(sa.text(
        "SELECT u.id, u.email, u.full_name, u.is_active FROM users u "
        "WHERE u.role IN ('admin', 'employee') "
        "AND NOT EXISTS (SELECT 1 FROM company_team_members t WHERE t.user_id = u.id)"
    )).fetchall()
    for user_id, email, full_name, is_active in team:
        # Claim an unlinked entry with the same email before creating one.
        claimed = conn.execute(sa.text(
            "UPDATE company_team_members SET user_id = :uid, is_active = :active, updated_at = :now "
            "WHERE id = (SELECT id FROM company_team_members "
            "            WHERE user_id IS NULL AND lower(email) = lower(:email) LIMIT 1) "
            "RETURNING id"
        ), {"uid": user_id, "active": is_active, "email": email, "now": now}).fetchone()
        if claimed:
            continue
        conn.execute(sa.text(
            "INSERT INTO company_team_members "
            "(id, name, email, user_id, is_active, sort_order, created_at, updated_at) "
            "VALUES (:id, :name, :email, :uid, :active, 0, :now, :now)"
        ), {
            "id": str(uuid.uuid4()),
            "name": full_name or email.split("@")[0],
            "email": email,
            "uid": user_id,
            "active": is_active,
            "now": now,
        })


def downgrade() -> None:
    # Entries can't be told apart from ones an admin made; leave them.
    pass
