import uuid
from datetime import datetime
from app.core.time import utcnow
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class File(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=False)
    milestone_id: Mapped[str | None] = mapped_column(String, ForeignKey("milestones.id"))
    uploaded_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(100))   # MIME type
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)  # R2/S3 key
    public_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_deliverable: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="files")
    milestone: Mapped["Milestone"] = relationship(
        "Milestone",
        back_populates="deliverables",
        foreign_keys=[milestone_id],
    )
    uploader: Mapped["User"] = relationship("User")
