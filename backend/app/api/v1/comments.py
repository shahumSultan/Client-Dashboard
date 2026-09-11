from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.time import utcnow
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_project_access
from app.models.user import User, UserRole
from app.models.comment import Comment, CommentTargetType
from app.models.milestone import Milestone
from app.models.project import Project, ProjectUpdate
from app.models.file import File
from app.schemas.comment import (
    CommentCreate, ReplyCreate, CommentEdit, CommentResolve, CommentOut, CommentThread,
    InboxThread,
)
from app.services.notifications import create_notification
from app.models.notification import NotificationType

router = APIRouter(prefix="/comments", tags=["Comments"])


_TARGET_MODELS = {
    CommentTargetType.MILESTONE: Milestone,
    CommentTargetType.UPDATE: ProjectUpdate,
    CommentTargetType.FILE: File,
}


async def _resolve_target(
    db: AsyncSession,
    project_id: str,
    target_type: CommentTargetType,
    target_id: str | None,
) -> str:
    """Validate the comment target and return its id.

    A project-level comment targets the project itself. Every other target must
    exist AND belong to this project — otherwise a client could anchor a comment
    to another tenant's milestone.
    """
    if target_type == CommentTargetType.PROJECT:
        return project_id

    if not target_id:
        raise HTTPException(status_code=422, detail="target_id is required for this target type")

    model = _TARGET_MODELS[target_type]
    result = await db.execute(select(model).where(model.id == target_id))
    target = result.scalar_one_or_none()
    if not target or target.project_id != project_id:
        raise HTTPException(status_code=404, detail=f"{target_type.value} not found in this project")
    return target_id


async def _notify_admins(db: AsyncSession, actor: User, comment: Comment, project: Project) -> None:
    result = await db.execute(select(User).where(User.role.in_((UserRole.ADMIN, UserRole.STAFF)), User.is_active.is_(True)))
    for admin in result.scalars().all():
        if admin.id == actor.id:
            continue
        await create_notification(
            db=db,
            user_id=admin.id,
            type=NotificationType.COMMENT_ADDED,
            title=f"New comment on {project.name}",
            body=comment.body[:140],
            link=f"/admin/projects/{project.id}",
        )


async def _load_comment(db: AsyncSession, comment_id: str) -> Comment:
    """Re-read a comment with everything the response models serialise.

    `replies` must be eager-loaded even when the caller only needs a CommentOut:
    CommentThread declares the field, and a lazy load during serialisation
    raises MissingGreenlet on the async session.
    """
    result = await db.execute(
        select(Comment)
        .options(
            selectinload(Comment.author),
            selectinload(Comment.replies).selectinload(Comment.author),
        )
        .where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment


@router.get("/inbox", response_model=list[InboxThread])
async def comment_inbox(
    only_open: bool = Query(True, description="Hide threads already resolved"),
    limit: int = Query(100, ge=1, le=500),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Every client comment thread, newest first — the admin's reply queue.

    Declared before the /project/{project_id} route so "inbox" is never
    swallowed as a project id.
    """
    stmt = (
        select(Comment)
        .options(
            selectinload(Comment.author),
            selectinload(Comment.project),
            selectinload(Comment.replies).selectinload(Comment.author),
        )
        .where(Comment.parent_id.is_(None))
        .order_by(Comment.created_at.desc())
        .limit(limit)
    )
    if only_open:
        stmt = stmt.where(Comment.is_resolved.is_(False))

    result = await db.execute(stmt)
    return result.scalars().unique().all()


@router.get("/project/{project_id}", response_model=list[CommentThread])
async def list_project_comments(
    project_id: str,
    target_type: CommentTargetType | None = Query(None),
    target_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Comment threads for a project, optionally narrowed to one target."""
    await assert_project_access(user, project_id, db)

    stmt = (
        select(Comment)
        .options(
            selectinload(Comment.author),
            selectinload(Comment.replies).selectinload(Comment.author),
        )
        .where(Comment.project_id == project_id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at.desc())
    )
    if target_type is not None:
        stmt = stmt.where(Comment.target_type == target_type)
    if target_id is not None:
        stmt = stmt.where(Comment.target_id == target_id)

    result = await db.execute(stmt)
    return result.scalars().unique().all()


@router.post("/project/{project_id}", response_model=CommentThread, status_code=201)
async def create_comment(
    project_id: str,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Leave a comment or remark. Available to clients and admins alike."""
    project = await assert_project_access(user, project_id, db)
    target_id = await _resolve_target(db, project_id, data.target_type, data.target_id)

    comment = Comment(
        project_id=project_id,
        target_type=data.target_type,
        target_id=target_id,
        author_id=user.id,
        body=data.body.strip(),
    )
    db.add(comment)
    await db.commit()

    if user.role != UserRole.ADMIN:
        await _notify_admins(db, user, comment, project)

    return await _load_comment(db, comment.id)


@router.post("/{comment_id}/replies", response_model=CommentOut, status_code=201)
async def reply_to_comment(
    comment_id: str,
    data: ReplyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reply to a thread. Threading is one level deep — replies target the root."""
    parent = await _load_comment(db, comment_id)
    if parent.parent_id:
        raise HTTPException(status_code=422, detail="Replies cannot be nested")
    project = await assert_project_access(user, parent.project_id, db)

    reply = Comment(
        project_id=parent.project_id,
        target_type=parent.target_type,
        target_id=parent.target_id,
        author_id=user.id,
        parent_id=parent.id,
        body=data.body.strip(),
    )
    db.add(reply)
    await db.commit()

    if parent.author_id != user.id:
        await create_notification(
            db=db,
            user_id=parent.author_id,
            type=NotificationType.COMMENT_REPLY,
            title=f"{user.full_name or 'Enigma-Cube'} replied to your comment",
            body=reply.body[:140],
            link=f"/projects/{project.id}",
        )
    if user.role != UserRole.ADMIN:
        await _notify_admins(db, user, reply, project)

    return await _load_comment(db, reply.id)


@router.patch("/{comment_id}", response_model=CommentOut)
async def edit_comment(
    comment_id: str,
    data: CommentEdit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit your own comment. Admins cannot rewrite someone else's words."""
    comment = await _load_comment(db, comment_id)
    await assert_project_access(user, comment.project_id, db)
    if comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")

    comment.body = data.body.strip()
    comment.edited_at = utcnow()
    await db.commit()
    return await _load_comment(db, comment.id)


@router.patch("/{comment_id}/resolve", response_model=CommentOut)
async def resolve_comment(
    comment_id: str,
    data: CommentResolve,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark a thread handled. Admin-only, root comments only."""
    comment = await _load_comment(db, comment_id)
    if comment.parent_id:
        raise HTTPException(status_code=422, detail="Only root comments can be resolved")

    comment.is_resolved = data.is_resolved
    await db.commit()

    if data.is_resolved and comment.author_id != user.id:
        await create_notification(
            db=db,
            user_id=comment.author_id,
            type=NotificationType.COMMENT_REPLY,
            title="Your comment was marked resolved",
            body=comment.body[:140],
            link=f"/projects/{comment.project_id}",
        )

    return await _load_comment(db, comment.id)


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Authors can delete their own comments; admins can delete any."""
    comment = await _load_comment(db, comment_id)
    await assert_project_access(user, comment.project_id, db)
    if comment.author_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")

    await db.delete(comment)
    await db.commit()
