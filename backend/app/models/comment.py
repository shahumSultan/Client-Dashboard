import uuid
from datetime import datetime
from app.core.time import utcnow
from sqlalchemy import String, DateTime, ForeignKey, Enum, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class CommentTargetType(str, enum.Enum):
    """What a comment is attached to.

    PROJECT is the general discussion thread; the others anchor the comment to a
    specific item so feedback sits next to the work it refers to.
    """
    PROJECT = "project"
    MILESTONE = "milestone"
    UPDATE = "update"
    FILE = "file"


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Denormalised from the target so access control and per-project listing are
    # a single indexed lookup instead of a polymorphic join.
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=False)

    target_type: Mapped[CommentTargetType] = mapped_column(
        Enum(CommentTargetType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    # For PROJECT comments this equals project_id, so every row has a target.
    target_id: Mapped[str] = mapped_column(String, nullable=False)

    author_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    # One level of threading: a reply points at a root comment, never at another reply.
    parent_id: Mapped[str | None] = mapped_column(String, ForeignKey("comments.id", ondelete="CASCADE"))

    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)  # root comments only
    edited_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship("Project")
    author: Mapped["User"] = relationship("User")
    replies: Mapped[list["Comment"]] = relationship(
        "Comment",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Comment.created_at",
    )
    parent: Mapped["Comment | None"] = relationship(
        "Comment", back_populates="replies", remote_side=[id]
    )

    __table_args__ = (
        Index("ix_comments_project", "project_id"),
        Index("ix_comments_target", "target_type", "target_id"),
        Index("ix_comments_parent", "parent_id"),
    )
