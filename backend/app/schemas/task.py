from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.task import TaskPriority, TaskStatus


def _blank_to_none(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=20_000)
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.NORMAL
    department_id: Optional[str] = None
    assignee_id: Optional[str] = None
    project_id: Optional[str] = None
    due_date: Optional[date] = None

    @field_validator("title", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("description", "department_id", "assignee_id", "project_id", mode="before")
    @classmethod
    def _optional(cls, v):
        return _blank_to_none(v)


class TaskUpdate(BaseModel):
    """Partial: only the fields sent are changed. Send null to clear one."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=20_000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    department_id: Optional[str] = None
    assignee_id: Optional[str] = None
    project_id: Optional[str] = None
    due_date: Optional[date] = None
    is_archived: Optional[bool] = None

    @field_validator("title", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("description", "department_id", "assignee_id", "project_id", mode="before")
    @classmethod
    def _optional(cls, v):
        return _blank_to_none(v)


class TaskMove(BaseModel):
    status: TaskStatus
    # The card it now sits under in that column; null for the top.
    after_id: Optional[str] = None


class TaskPerson(BaseModel):
    user_id: str
    name: str
    avatar_url: Optional[str] = None
    # False once they've left the team; their name stays on the task.
    is_current: bool = True


class TaskDepartment(BaseModel):
    id: str
    name: str
    colour: str


class TaskProject(BaseModel):
    id: str
    # "Client · Project" - what an employee sees, since they can't open it.
    label: str


class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    department: Optional[TaskDepartment]
    assignee: Optional[TaskPerson]
    creator: Optional[TaskPerson]
    project: Optional[TaskProject]
    due_date: Optional[date]
    completed_at: Optional[datetime]
    position: float
    is_archived: bool
    comment_count: int
    created_at: datetime
    updated_at: datetime
    # What the person asking may do with it, so the UI needn't re-derive rules.
    can_edit: bool
    can_delete: bool


class TaskCommentIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=10_000)

    @field_validator("body", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class TaskCommentOut(BaseModel):
    id: str
    body: str
    author: Optional[TaskPerson]
    created_at: datetime
    can_delete: bool


class TaskActivityOut(BaseModel):
    id: str
    kind: str
    data: Optional[dict]
    actor: Optional[TaskPerson]
    created_at: datetime
