from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from app.models.comment import CommentTargetType
from app.models.user import UserRole


class CommentAuthor(BaseModel):
    """Trimmed author info so the UI can render an avatar and role badge."""
    id: str
    full_name: Optional[str]
    email: str
    avatar_url: Optional[str]
    role: UserRole

    model_config = {"from_attributes": True}


class _Body(BaseModel):
    """Shared body rule: min_length runs before stripping, so "   " would
    otherwise be stored as an empty comment."""
    body: str = Field(min_length=1, max_length=5000)

    @field_validator("body")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Comment cannot be empty")
        return stripped


class CommentCreate(_Body):
    target_type: CommentTargetType
    # Omitted for a project-level comment - it defaults to the project itself.
    target_id: Optional[str] = None


class ReplyCreate(_Body):
    pass


class CommentEdit(_Body):
    pass


class CommentResolve(BaseModel):
    is_resolved: bool


class CommentOut(BaseModel):
    id: str
    project_id: str
    target_type: CommentTargetType
    target_id: str
    parent_id: Optional[str]
    body: str
    is_resolved: bool
    edited_at: Optional[datetime]
    created_at: datetime
    author: CommentAuthor

    model_config = {"from_attributes": True}


class CommentThread(CommentOut):
    """A root comment with its replies attached, newest thread first."""
    replies: List[CommentOut] = []


class CommentProjectRef(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class InboxThread(CommentThread):
    """A thread in the admin queue, tagged with the project it belongs to."""
    project: CommentProjectRef
