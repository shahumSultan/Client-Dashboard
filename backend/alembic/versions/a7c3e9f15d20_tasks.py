"""tasks, task comments and task activity

Revision ID: a7c3e9f15d20
Revises: f2b7d4e81c39
Create Date: 2026-11-20 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c3e9f15d20'
down_revision: Union[str, None] = 'f2b7d4e81c39'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STATUS = sa.Enum('todo', 'in_progress', 'in_review', 'done', name='taskstatus')
PRIORITY = sa.Enum('low', 'normal', 'high', 'urgent', name='taskpriority')


def upgrade() -> None:
    # notificationtype stores member *names*, unlike the newer enums.
    for name in ('TASK_ASSIGNED', 'TASK_COMMENT', 'TASK_STATUS'):
        op.execute(f"ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS '{name}'")

    op.create_table(
        'tasks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', STATUS, nullable=False, server_default='todo'),
        sa.Column('priority', PRIORITY, nullable=False, server_default='normal'),
        sa.Column('department_id', sa.String(), nullable=True),
        sa.Column('assignee_id', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('project_id', sa.String(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('position', sa.Float(), nullable=False, server_default='0'),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tasks_status_position', 'tasks', ['status', 'position'])
    op.create_index('ix_tasks_assignee_id', 'tasks', ['assignee_id'])
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'])
    op.create_index('ix_tasks_due_date', 'tasks', ['due_date'])

    op.create_table(
        'task_comments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('task_id', sa.String(), nullable=False),
        sa.Column('author_id', sa.String(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_task_comments_task_id', 'task_comments', ['task_id'])

    op.create_table(
        'task_activity',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('task_id', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=True),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_task_activity_task_id', 'task_activity', ['task_id'])
    op.create_index('ix_task_activity_created_at', 'task_activity', ['created_at'])


def downgrade() -> None:
    op.drop_table('task_activity')
    op.drop_table('task_comments')
    op.drop_table('tasks')
    STATUS.drop(op.get_bind(), checkfirst=True)
    PRIORITY.drop(op.get_bind(), checkfirst=True)
    # Postgres can't drop enum values; notifications of the task types are
    # removed so nothing references them, and the values stay unused.
    op.execute(
        "DELETE FROM notifications WHERE type IN ('TASK_ASSIGNED', 'TASK_COMMENT', 'TASK_STATUS')"
    )
