import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class NotificationType(str, enum.Enum):
    MILESTONE_COMPLETED = "milestone_completed"
    REQUEST_UPDATED = "request_updated"
    FILE_UPLOADED = "file_uploaded"
    PROJECT_UPDATE = "project_update"
    NEW_MESSAGE = "new_message"
    ONBOARDING_STEP = "onboarding_step"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(500))  # relative URL to navigate to
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="notifications")
