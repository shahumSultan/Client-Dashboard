import uuid
from datetime import datetime, date
from app.core.time import utcnow
from sqlalchemy import String, DateTime, ForeignKey, Text, Float, Date, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AnalyticsEntry(Base):
    __tablename__ = "analytics_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Core metrics
    leads_processed: Mapped[float | None] = mapped_column(Float)
    conversions: Mapped[float | None] = mapped_column(Float)
    conversion_rate: Mapped[float | None] = mapped_column(Float)
    revenue_attributed: Mapped[float | None] = mapped_column(Float)

    # Flexible extra metrics as JSON
    metrics: Mapped[dict | None] = mapped_column(JSON)  # {"calls_handled": 120, "avg_response_time": 2.3}

    summary: Mapped[str | None] = mapped_column(Text)  # AI-generated or manual summary
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="analytics")
