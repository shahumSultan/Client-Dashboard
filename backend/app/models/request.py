import uuid
from datetime import datetime
from app.core.time import utcnow
from sqlalchemy import String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class RequestCategory(str, enum.Enum):
    FEATURE = "feature"
    BUG = "bug"
    CHANGE = "change"
    QUESTION = "question"
    OTHER = "other"


class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class RequestPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=False)
    submitted_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[RequestCategory] = mapped_column(Enum(RequestCategory), default=RequestCategory.OTHER)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), default=RequestStatus.PENDING)
    priority: Mapped[RequestPriority] = mapped_column(Enum(RequestPriority), default=RequestPriority.MEDIUM)
    admin_response: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="requests")
    submitter: Mapped["User"] = relationship("User", foreign_keys=[submitted_by])
    assignee: Mapped["User"] = relationship("User", foreign_keys=[assigned_to])
