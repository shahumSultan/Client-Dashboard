import uuid
from datetime import datetime, date
from app.core.time import utcnow
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Enum, Text, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    DEVELOPMENT = "development"
    TESTING = "testing"
    REVIEW = "review"
    DELIVERED = "delivered"
    ON_HOLD = "on_hold"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.PLANNING)
    completion_percentage: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date | None] = mapped_column(Date)
    target_date: Mapped[date | None] = mapped_column(Date)
    delivered_date: Mapped[date | None] = mapped_column(Date)
    project_type: Mapped[str | None] = mapped_column(String(100))  # e.g. "ScoreForge", "ContentFlow"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="projects")
    milestones: Mapped[list["Milestone"]] = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    requests: Mapped[list["Request"]] = relationship("Request", back_populates="project", cascade="all, delete-orphan")
    files: Mapped[list["File"]] = relationship("File", back_populates="project", cascade="all, delete-orphan")
    analytics: Mapped[list["AnalyticsEntry"]] = relationship("AnalyticsEntry", back_populates="project", cascade="all, delete-orphan")
    updates: Mapped[list["ProjectUpdate"]] = relationship("ProjectUpdate", back_populates="project", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="updates")
    author: Mapped["User"] = relationship("User")
