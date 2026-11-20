"""Tasks: the team's board. Admins and employees only; clients get a 403.

Every change records a TaskActivity row (the history on each task, and later
the weekly summary) and rings the people involved. Rules live in
services/tasks.py.
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_company
from app.core.time import utcnow
from app.database import get_db
from app.models.notification import NotificationType
from app.models.task import Task, TaskActivity, TaskComment, TaskPriority, TaskStatus
from app.models.user import User, UserRole
from app.schemas.task import (
    TaskActivityOut, TaskCommentIn, TaskCommentOut, TaskCreate, TaskMove, TaskOut, TaskUpdate,
)
from app.services import tasks as rules

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Done cards older than this drop off the board unless asked for; the board
# is for what's moving, and the history stays on each task.
DONE_WINDOW_DAYS = 30


async def _get(db: AsyncSession, task_id: str) -> Task:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


async def _editable(db: AsyncSession, user: User, task_id: str) -> Task:
    task = await _get(db, task_id)
    if not rules.can_edit(user, task, await rules.department_ids(db, user)):
        raise HTTPException(
            status_code=403,
            detail="You can change tasks you created, are assigned to, or that are in your departments.",
        )
    return task


async def _one(db: AsyncSession, user: User, task: Task) -> TaskOut:
    await db.refresh(task)
    return (await rules.to_out(db, user, [task]))[0]


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    department_id: str | None = Query(None),
    assignee: str | None = Query(None, description="A user id, 'me', or 'none'"),
    priority: TaskPriority | None = Query(None),
    status: TaskStatus | None = Query(None),
    project_id: str | None = Query(None),
    q: str | None = Query(None, max_length=100),
    archived: bool = Query(False),
    all_done: bool = Query(False, description="Include Done cards older than 30 days"),
    user: User = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Task).where(Task.is_archived.is_(archived)).order_by(Task.position, Task.created_at)
    if department_id:
        stmt = stmt.where(Task.department_id == department_id)
    if assignee == "me":
        stmt = stmt.where(Task.assignee_id == user.id)
    elif assignee == "none":
        stmt = stmt.where(Task.assignee_id.is_(None))
    elif assignee:
        stmt = stmt.where(Task.assignee_id == assignee)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if status:
        stmt = stmt.where(Task.status == status)
    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Task.title.ilike(like), Task.description.ilike(like)))
    if not all_done and not archived:
        cutoff = utcnow() - timedelta(days=DONE_WINDOW_DAYS)
        stmt = stmt.where(or_(Task.status != TaskStatus.DONE, Task.completed_at >= cutoff))
    tasks = list((await db.execute(stmt)).scalars())
    return await rules.to_out(db, user, tasks)


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    data: TaskCreate, user: User = Depends(require_company), db: AsyncSession = Depends(get_db)
):
    assignee = await rules.check_assignee(db, data.assignee_id)
    await rules.check_department(db, data.department_id)
    await rules.check_project(db, user, data.project_id)

    task = Task(**data.model_dump(), created_by=user.id)
    task.position = await rules.top_position(db, data.status)
    if data.status == TaskStatus.DONE:
        task.completed_at = utcnow()
    db.add(task)
    await db.flush()
    rules.record(db, task, user, "created")
    if assignee:
        rules.record(db, task, user, "assigned", {"to": rules.display_name(assignee)})
        rules.notify(
            db, task, user, NotificationType.TASK_ASSIGNED,
            f"{rules.display_name(user)} assigned you a task", task.title, {assignee.id},
        )
    await db.commit()
    return await _one(db, user, task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, user: User = Depends(require_company), db: AsyncSession = Depends(get_db)):
    return await _one(db, user, await _get(db, task_id))


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    user: User = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    task = await _editable(db, user, task_id)
    sent = data.model_fields_set
    involved = {task.assignee_id, task.created_by}

    if "title" in sent and data.title is None:
        raise HTTPException(status_code=422, detail="A task needs a title.")
    edited = [f for f in ("title", "description") if f in sent and getattr(data, f) != getattr(task, f)]
    for f in edited:
        setattr(task, f, getattr(data, f))
    if edited:
        rules.record(db, task, user, "edited", {"fields": edited})

    if "assignee_id" in sent and data.assignee_id != task.assignee_id:
        new = await rules.check_assignee(db, data.assignee_id)
        old = await db.get(User, task.assignee_id) if task.assignee_id else None
        task.assignee_id = data.assignee_id
        rules.record(db, task, user, "assigned", {
            "from": rules.display_name(old), "to": rules.display_name(new),
        })
        if new:
            rules.notify(
                db, task, user, NotificationType.TASK_ASSIGNED,
                f"{rules.display_name(user)} assigned you a task", task.title, {new.id},
            )

    if "department_id" in sent and data.department_id != task.department_id:
        new_d = await rules.check_department(db, data.department_id)
        old_d = await rules.check_department(db, task.department_id) if task.department_id else None
        task.department_id = data.department_id
        rules.record(db, task, user, "department", {
            "from": old_d.name if old_d else None, "to": new_d.name if new_d else None,
        })

    if "project_id" in sent and data.project_id != task.project_id:
        if user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only an admin can link a task to a client project.")
        await rules.check_project(db, user, data.project_id)
        task.project_id = data.project_id
        rules.record(db, task, user, "project", {"linked": data.project_id is not None})

    if "priority" in sent and data.priority and data.priority != task.priority:
        rules.record(db, task, user, "priority", {"from": task.priority.value, "to": data.priority.value})
        task.priority = data.priority

    if "due_date" in sent and data.due_date != task.due_date:
        rules.record(db, task, user, "due", {
            "from": rules.fmt_date(task.due_date), "to": rules.fmt_date(data.due_date),
        })
        task.due_date = data.due_date

    if "status" in sent and data.status and data.status != task.status:
        old_status = task.status
        await rules.place(db, task, data.status, None)
        _status_changed(db, task, user, old_status, involved)

    if "is_archived" in sent and data.is_archived is not None and data.is_archived != task.is_archived:
        task.is_archived = data.is_archived
        if not data.is_archived:
            task.position = await rules.top_position(db, task.status)
        rules.record(db, task, user, "archived" if data.is_archived else "restored")

    await db.commit()
    return await _one(db, user, task)


def _status_changed(db, task: Task, user: User, old: TaskStatus, involved: set) -> None:
    rules.record(db, task, user, "status", {"from": old.value, "to": task.status.value})
    rules.notify(
        db, task, user, NotificationType.TASK_STATUS,
        f"{rules.display_name(user)} moved a task to {rules.STATUS_LABELS[task.status]}",
        task.title, involved | {task.assignee_id, task.created_by},
    )


@router.post("/{task_id}/move", response_model=TaskOut)
async def move_task(
    task_id: str,
    data: TaskMove,
    user: User = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    """Drag and drop: a column and the card it now sits under."""
    task = await _editable(db, user, task_id)
    old_status = task.status
    await rules.place(db, task, data.status, data.after_id)
    if task.status != old_status:
        _status_changed(db, task, user, old_status, set())
    await db.commit()
    return await _one(db, user, task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, user: User = Depends(require_company), db: AsyncSession = Depends(get_db)):
    if not rules.can_delete(user):
        raise HTTPException(status_code=403, detail="Only an admin can delete a task. Archive it instead.")
    await db.delete(await _get(db, task_id))
    await db.commit()
    return Response(status_code=204)


# ── Comments ─────────────────────────────────────────────────────────────────

def _comment_out(c: TaskComment, people: dict, user: User) -> TaskCommentOut:
    return TaskCommentOut(
        id=c.id, body=c.body, author=people.get(c.author_id or ""), created_at=c.created_at,
        can_delete=user.role == UserRole.ADMIN or c.author_id == user.id,
    )


@router.get("/{task_id}/comments", response_model=list[TaskCommentOut])
async def list_comments(task_id: str, user: User = Depends(require_company), db: AsyncSession = Depends(get_db)):
    await _get(db, task_id)
    rows = list((await db.execute(
        select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at)
    )).scalars())
    people = await rules.people(db, {c.author_id for c in rows})
    return [_comment_out(c, people, user) for c in rows]


@router.post("/{task_id}/comments", response_model=TaskCommentOut, status_code=201)
async def add_comment(
    task_id: str,
    data: TaskCommentIn,
    user: User = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    """Anyone on the team may comment on any task, not only those who can edit it."""
    task = await _get(db, task_id)
    comment = TaskComment(task_id=task.id, author_id=user.id, body=data.body)
    db.add(comment)
    rules.record(db, task, user, "comment", {"excerpt": data.body[:140]})
    rules.notify(
        db, task, user, NotificationType.TASK_COMMENT,
        f"{rules.display_name(user)} commented on a task", f"{task.title}: {data.body[:200]}",
        {task.assignee_id, task.created_by},
    )
    await db.commit()
    await db.refresh(comment)
    return _comment_out(comment, await rules.people(db, {user.id}), user)


@router.delete("/{task_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    task_id: str, comment_id: str, user: User = Depends(require_company), db: AsyncSession = Depends(get_db)
):
    comment = await db.get(TaskComment, comment_id)
    if not comment or comment.task_id != task_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if user.role != UserRole.ADMIN and comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments.")
    await db.delete(comment)
    await db.commit()
    return Response(status_code=204)


# ── History ──────────────────────────────────────────────────────────────────

@router.get("/{task_id}/activity", response_model=list[TaskActivityOut])
async def list_activity(task_id: str, user: User = Depends(require_company), db: AsyncSession = Depends(get_db)):
    await _get(db, task_id)
    rows = list((await db.execute(
        select(TaskActivity).where(TaskActivity.task_id == task_id).order_by(TaskActivity.created_at.desc())
    )).scalars())
    people = await rules.people(db, {a.actor_id for a in rows})
    return [
        TaskActivityOut(id=a.id, kind=a.kind, data=a.data, actor=people.get(a.actor_id or ""), created_at=a.created_at)
        for a in rows
    ]
