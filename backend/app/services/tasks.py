"""Task rules in one place: who may change what, ordering, history, bells.

Who may do what:
- Admins: everything, including deleting tasks and linking client projects.
- Employees: create tasks; edit and move tasks they created, are assigned
  to, or that sit in one of their departments; comment on any task; never
  delete one or set its client project.
- Clients: nothing - the routes refuse them before any of this runs.
"""
from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.models.company import Department, DepartmentMember
from app.models.notification import Notification, NotificationType
from app.models.organization import Organization
from app.models.project import Project
from app.models.task import Task, TaskActivity, TaskComment, TaskStatus
from app.models.user import User, UserRole, is_team
from app.schemas.task import TaskDepartment, TaskOut, TaskPerson, TaskProject

STATUS_LABELS = {
    TaskStatus.TODO: "To do",
    TaskStatus.IN_PROGRESS: "In progress",
    TaskStatus.IN_REVIEW: "In review",
    TaskStatus.DONE: "Done",
}

# Gap left between cards when a column is renumbered. Midpoint inserts halve
# it each time, so a column needs ~50 inserts in one spot before it renumbers.
POSITION_STEP = 1024.0


# ── Permissions ──────────────────────────────────────────────────────────────

async def department_ids(db: AsyncSession, user: User) -> set[str]:
    rows = await db.execute(
        select(DepartmentMember.department_id).where(DepartmentMember.user_id == user.id)
    )
    return set(rows.scalars())


def can_edit(user: User, task: Task, my_departments: set[str]) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role != UserRole.EMPLOYEE:
        return False
    return (
        task.created_by == user.id
        or task.assignee_id == user.id
        or (task.department_id is not None and task.department_id in my_departments)
    )


def can_delete(user: User) -> bool:
    return user.role == UserRole.ADMIN


async def check_assignee(db: AsyncSession, user_id: str | None) -> User | None:
    if user_id is None:
        return None
    u = await db.get(User, user_id)
    if not u or not u.is_active or not is_team(u):
        raise HTTPException(status_code=422, detail="Tasks can only be assigned to people on the team.")
    return u


async def check_department(db: AsyncSession, dept_id: str | None) -> Department | None:
    if dept_id is None:
        return None
    d = await db.get(Department, dept_id)
    if not d:
        raise HTTPException(status_code=422, detail="That department doesn't exist.")
    return d


async def check_project(db: AsyncSession, user: User, project_id: str | None) -> Project | None:
    if project_id is None:
        return None
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only an admin can link a task to a client project.")
    p = await db.get(Project, project_id)
    if not p or not p.is_active:
        raise HTTPException(status_code=422, detail="That project doesn't exist.")
    return p


# ── Ordering ─────────────────────────────────────────────────────────────────

async def _column(db: AsyncSession, status: TaskStatus, exclude_id: str | None = None) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.status == status, Task.is_archived.is_(False))
        .order_by(Task.position, Task.created_at)
    )
    if exclude_id:
        stmt = stmt.where(Task.id != exclude_id)
    return list((await db.execute(stmt)).scalars())


async def top_position(db: AsyncSession, status: TaskStatus) -> float:
    """New cards go to the top of their column."""
    lowest = await db.scalar(
        select(func.min(Task.position)).where(Task.status == status, Task.is_archived.is_(False))
    )
    return (lowest if lowest is not None else POSITION_STEP) - POSITION_STEP


async def place(db: AsyncSession, task: Task, status: TaskStatus, after_id: str | None) -> None:
    """Put `task` in `status`, directly under `after_id` (or at the top)."""
    column = await _column(db, status, exclude_id=task.id)
    idx = 0
    if after_id:
        ids = [t.id for t in column]
        if after_id not in ids:
            raise HTTPException(status_code=422, detail="That card isn't in this column any more.")
        idx = ids.index(after_id) + 1
    above = column[idx - 1].position if idx > 0 else None
    below = column[idx].position if idx < len(column) else None

    if above is None and below is None:
        pos = 0.0
    elif above is None:
        pos = below - POSITION_STEP
    elif below is None:
        pos = above + POSITION_STEP
    else:
        pos = (above + below) / 2
        if not (above < pos < below):
            # Floats ran out of room between these two: renumber the column
            # with the task in its slot.
            column.insert(idx, task)
            for i, t in enumerate(column):
                t.position = i * POSITION_STEP
            pos = idx * POSITION_STEP
    task.position = pos
    set_status(task, status)


def set_status(task: Task, status: TaskStatus) -> None:
    if status == TaskStatus.DONE and task.status != TaskStatus.DONE:
        task.completed_at = utcnow()
    elif status != TaskStatus.DONE:
        task.completed_at = None
    task.status = status


# ── History and bells ────────────────────────────────────────────────────────

def record(db: AsyncSession, task: Task, actor: User, kind: str, data: dict | None = None) -> None:
    db.add(TaskActivity(task_id=task.id, actor_id=actor.id, kind=kind, data=data))


def notify(
    db: AsyncSession, task: Task, actor: User, type: NotificationType, title: str,
    body: str | None, recipients: set[str | None],
) -> None:
    """In-app bells for everyone involved except whoever made the change."""
    for user_id in recipients - {None, actor.id}:
        db.add(Notification(
            user_id=user_id, type=type, title=title[:255], body=body,
            link=f"/admin/tasks?task={task.id}",
        ))


def display_name(u: User | None) -> str | None:
    return (u.full_name or u.email) if u else None


# ── Output ───────────────────────────────────────────────────────────────────

def _person(u: User | None) -> TaskPerson | None:
    if u is None:
        return None
    return TaskPerson(
        user_id=u.id, name=u.full_name or u.email, avatar_url=u.avatar_url,
        is_current=u.is_active and is_team(u),
    )


async def to_out(db: AsyncSession, user: User, tasks: list[Task]) -> list[TaskOut]:
    """Build the API shape for many tasks with a handful of queries, not N."""
    if not tasks:
        return []
    user_ids = {t.assignee_id for t in tasks} | {t.created_by for t in tasks}
    user_ids.discard(None)
    users = {}
    if user_ids:
        users = {u.id: u for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars()}
    dept_ids = {t.department_id for t in tasks if t.department_id}
    depts = {}
    if dept_ids:
        depts = {d.id: d for d in (await db.execute(select(Department).where(Department.id.in_(dept_ids)))).scalars()}
    project_ids = {t.project_id for t in tasks if t.project_id}
    projects: dict[str, str] = {}
    if project_ids:
        rows = await db.execute(
            select(Project.id, Project.name, Organization.name.label("org"))
            .join(Organization, Organization.id == Project.organization_id)
            .where(Project.id.in_(project_ids))
        )
        projects = {r.id: f"{r.org} · {r.name}" for r in rows}
    counts = dict((await db.execute(
        select(TaskComment.task_id, func.count())
        .where(TaskComment.task_id.in_([t.id for t in tasks]))
        .group_by(TaskComment.task_id)
    )).all())
    mine = await department_ids(db, user)

    out = []
    for t in tasks:
        d = depts.get(t.department_id or "")
        out.append(TaskOut(
            id=t.id, title=t.title, description=t.description,
            status=t.status, priority=t.priority,
            department=TaskDepartment(id=d.id, name=d.name, colour=d.colour) if d else None,
            assignee=_person(users.get(t.assignee_id or "")),
            creator=_person(users.get(t.created_by or "")),
            project=TaskProject(id=t.project_id, label=projects[t.project_id])
            if t.project_id in projects else None,
            due_date=t.due_date, completed_at=t.completed_at, position=t.position,
            is_archived=t.is_archived, comment_count=counts.get(t.id, 0),
            created_at=t.created_at, updated_at=t.updated_at,
            can_edit=can_edit(user, t, mine), can_delete=can_delete(user),
        ))
    return out


async def people(db: AsyncSession, ids: set[str | None]) -> dict[str, TaskPerson]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = await db.execute(select(User).where(User.id.in_(ids)))
    return {u.id: _person(u) for u in rows.scalars()}


def fmt_date(d: date | None) -> str | None:
    return d.isoformat() if d else None
